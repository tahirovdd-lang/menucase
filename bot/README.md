# Бот MenuCase

На BotHost укажите Python 3.11, ветку `main` и точку входа `main.py`. Токен Telegram хранится в карточке бота и передаётся как `BOT_TOKEN`. При деплое установите зависимости из `requirements.txt`.

Первая загрузка создаёт ключ подписи в постоянной папке `/app/data` и выводит строку `MENUCASE_PUBLIC_KEY=`. В окружении сайта задайте открытый ключ как `REGISTRATION_BOT_PUBLIC_KEY` и Telegram ID получателя как `TELEGRAM_ADMIN_CHAT_ID`. Закрытый ключ и токен остаются на BotHost. Выполните `/start` в личном чате, чтобы Telegram разрешил боту присылать сообщения.
