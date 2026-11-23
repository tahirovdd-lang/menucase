import json
import logging
import os
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

SITE = "https://menu-scene-3d.giftedmodel4.chatgpt.site"
LOGGER = logging.getLogger("menucase")


class TelegramError(Exception):
    def __init__(self, status, retry_after=0):
        self.status = status
        self.retry_after = retry_after


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
        raise TelegramError(result.get("error_code"), result.get("parameters", {}).get("retry_after", 0))
    return result["result"]


def start_reply(message):
    text = message.get("text", "")
    command = text.split(maxsplit=1)[0].split("@", 1)[0] if text.strip() else ""
    if message.get("chat", {}).get("type") != "private" or command != "/start":
        return None
    return {
        "chat_id": message["chat"]["id"],
        "text": "MenuCase — электронное меню для ресторанов. Откройте меню или войдите в кабинет.",
        "reply_markup": {"inline_keyboard": [
            [{"text": "Открыть меню", "url": SITE + "/"}],
            [{"text": "Кабинет ресторана", "url": SITE + "/admin"}],
        ]},
    }


def run():
    token = (os.getenv("BOT_TOKEN") or os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()
    if not token:
        raise SystemExit("Укажите BOT_TOKEN в настройках BotHost.")
    offset = 0
    while True:
        try:
            updates = telegram(token, "getUpdates", {
                "offset": offset, "timeout": 25, "allowed_updates": ["message"],
            })
            for update in updates:
                reply = start_reply(update.get("message", {}))
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
            LOGGER.warning("Telegram API: %s", error.status)
            time.sleep(max(5, error.retry_after))
        except (URLError, TimeoutError, ValueError):
            LOGGER.warning("Временная ошибка соединения с Telegram.")
            time.sleep(5)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
