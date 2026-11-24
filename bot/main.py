import json
import logging
import os
import re
import time
from base64 import b64encode
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import Thread
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey


LOGGER = logging.getLogger("menucase")
REGISTRATION_API = "https://menu-scene-3d.giftedmodel4.chatgpt.site/api/registration-bot"


class TelegramError(Exception):
    def __init__(self, status, retry_after=0, description=''):
        self.status = status
        self.retry_after = retry_after
        self.description = description


def telegram(token, method, payload):
    request = Request(
        f"https://api.telegram.org/bot{token}/{method}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urlopen(request, timeout=40) as response:
            result = json.load(response)
    except HTTPError as error:
        with error:
            result = json.load(error)
    if not result.get("ok"):
        raise TelegramError(
            result.get("error_code"), result.get("parameters", {}).get("retry_after", 0),
            str(result.get("description", "")),
        )
    return result["result"]


def start_reply(message):
    text = message.get("text", "")
    command = text.split(maxsplit=1)[0].split("@", 1)[0] if text.strip() else ""
    if message.get("chat", {}).get("type") != "private" or command != "/start":
        return None
    return {
        "chat_id": message["chat"]["id"],
        "text": "MenuCase — служебный бот для уведомлений о новых ресторанах.",
    }


def registration_key():
    directory = Path(os.getenv("MENUCASE_DATA_DIR", "/app/data"))
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / "menucase-registration.key"
    try:
        return Ed25519PrivateKey.from_private_bytes(path.read_bytes())
    except FileNotFoundError:
        key = Ed25519PrivateKey.generate()
        with NamedTemporaryFile(dir=directory, delete=False) as temporary:
            temp_path = Path(temporary.name)
            try:
                temporary.write(key.private_bytes_raw())
                temporary.flush()
                os.fsync(temporary.fileno())
                try:
                    os.link(temp_path, path)
                except FileExistsError:
                    return Ed25519PrivateKey.from_private_bytes(path.read_bytes())
            finally:
                temp_path.unlink()
        return key


def registration_request(key, payload):
    timestamp = str(int(time.time()))
    body = json.dumps(payload, separators=(",", ":")).encode()
    signed = b"MenuCase registration v1\n" + timestamp.encode() + b"\n" + body
    signature = b64encode(key.sign(signed)).decode()
    request = Request(
        REGISTRATION_API,
        data=body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "MenuCase-Bot/1.0",
            "Accept": "application/json",
            "X-MenuCase-Time": timestamp,
            "X-MenuCase-Signature": signature,
        },
    )
    with urlopen(request, timeout=15) as response:
        return json.load(response)


def notify_registrations(token, key):
    cursor = None
    pending_ack = None
    last_error = None
    while True:
        try:
            if pending_ack:
                try:
                    registration_request(key, pending_ack)
                except HTTPError as error:
                    if error.code != 409:
                        raise
                pending_ack = None
            result = registration_request(key, {"action": "poll", "cursor": cursor})
            cursor = result["cursor"]
            notice = result["notice"]
            last_error = None
            if not notice:
                if cursor is None:
                    time.sleep(20)
                continue
            status = "sent"
            try:
                telegram(token, "sendMessage", {
                    "chat_id": notice["chatId"],
                    "text": notice["text"],
                })
            except TelegramError as error:
                LOGGER.warning("Telegram отклонил уведомление: %s", error.status)
                status = "failed"
            pending_ack = {
                "action": "ack", "slug": notice["slug"],
                "lease": notice["lease"], "status": status,
            }
        except (URLError, TimeoutError, ValueError) as error:
            cursor = None
            label = getattr(error, "code", type(error).__name__)
            if label != last_error:
                LOGGER.warning("Регистрации MenuCase: подключение временно недоступно (%s)", label)
                last_error = label
            time.sleep(20)


def login_reply(message, key):
    chat = message.get("chat", {})
    sender = message.get("from", {})
    text = message.get("text", "")
    match = re.fullmatch(r"/start(?:@[A-Za-z0-9_]+)? mc_([a-f0-9]{32})", text)
    if chat.get("type") != "private" or not match or chat.get("id") != sender.get("id"):
        return start_reply(message)
    try:
        result = registration_request(key, {
            "action": "login", "id": match.group(1), "telegramId": str(sender["id"]),
        })
        reply = f"Код входа в MenuCase: {result['code']}\nВведите его на сайте. Никому не пересылайте код."
    except HTTPError as error:
        if error.code in {409, 410}:
            reply = "Запрос уже использован или истёк. Получите новый код на сайте."
        else:
            reply = "Вход через Telegram временно недоступен. Попробуйте позже."
    except (URLError, TimeoutError, ValueError):
        reply = "Сайт временно недоступен. Попробуйте ещё раз."
    return {"chat_id": chat["id"], "text": reply}


def run():
    token = (os.getenv("BOT_TOKEN") or os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()
    if not token:
        raise SystemExit("Укажите BOT_TOKEN в настройках BotHost.")
    key = registration_key()
    public_key = b64encode(key.public_key().public_bytes_raw()).decode()
    LOGGER.info("MENUCASE_PUBLIC_KEY=%s", public_key)
    try:
        username = telegram(token, "getMe", {}).get("username")
        if username:
            LOGGER.info("MENUCASE_TELEGRAM_BOT_USERNAME=%s", username)
    except (TelegramError, URLError, TimeoutError, ValueError):
        LOGGER.warning("Не удалось получить имя бота от Telegram.")
    Thread(target=notify_registrations, args=(token, key), daemon=True).start()
    offset = 0
    while True:
        try:
            updates = telegram(token, "getUpdates", {
                "offset": offset, "timeout": 25, "allowed_updates": ["message"],
            })
            for update in updates:
                reply = login_reply(update.get("message", {}), key)
                if reply:
                    try:
                        telegram(token, "sendMessage", reply)
                    except TelegramError as error:
                        if error.status not in {400, 403}:
                            raise
                        LOGGER.warning("Telegram отклонил ответ: %s", error.status)
                offset = update["update_id"] + 1
        except TelegramError as error:
            if error.status in {401, 404}:
                raise SystemExit("Telegram отклонил токен бота.") from None
            if error.status == 409:
                reason = error.description.lower()
                if "webhook" in reason:
                    LOGGER.warning("Telegram 409: активен webhook, поэтому getUpdates недоступен.")
                elif "other getupdates" in reason:
                    LOGGER.warning("Telegram 409: другой процесс уже вызывает getUpdates для этого бота.")
                else:
                    LOGGER.warning("Telegram 409: конфликт при получении обновлений.")
                time.sleep(max(30, error.retry_after))
            else:
                LOGGER.warning("Telegram API: %s", error.status)
                time.sleep(max(5, error.retry_after))
        except (URLError, TimeoutError, ValueError):
            LOGGER.warning("Временная ошибка соединения с Telegram.")
            time.sleep(5)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
