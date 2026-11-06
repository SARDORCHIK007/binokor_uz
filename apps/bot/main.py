import asyncio
import logging
import os

log = logging.getLogger("uychibinokor.bot")


async def main() -> None:
    token = os.environ.get("BOT_TOKEN", "").strip()
    if not token:
        log.info("bot idle: BOT_TOKEN is empty")
        await asyncio.Event().wait()
        return

    from aiogram import Bot, Dispatcher

    bot = Bot(token)
    dispatcher = Dispatcher()
    await dispatcher.start_polling(bot)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
