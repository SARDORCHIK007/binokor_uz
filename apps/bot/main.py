import asyncio
import logging
import os

log = logging.getLogger("uychibinokor.bot")
API_URL = os.environ.get("API_INTERNAL_URL", "http://api:8000")


async def main() -> None:
    token = os.environ.get("BOT_TOKEN", "").strip()
    if not token:
        log.info("bot idle: BOT_TOKEN is empty")
        await asyncio.Event().wait()
        return

    import httpx
    from aiogram import Bot, Dispatcher, F
    from aiogram.filters import CommandStart
    from aiogram.types import KeyboardButton, Message, ReplyKeyboardMarkup

    bot = Bot(token)
    dispatcher = Dispatcher()
    keyboard = ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="Telefonni yuborish", request_contact=True)]],
        resize_keyboard=True,
    )

    @dispatcher.message(CommandStart())
    async def start(message: Message) -> None:
        await message.answer(
            "UYCHI BINOKOR. Kirish kodini olish uchun telefon raqamingizni yuboring.",
            reply_markup=keyboard,
        )

    @dispatcher.message(F.contact)
    async def contact(message: Message) -> None:
        if message.contact is None or message.from_user is None:
            return
        phone = message.contact.phone_number
        if not phone.startswith("+"):
            phone = f"+{phone}"
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.post(
                f"{API_URL}/api/v1/bot/link",
                headers={"X-Bot-Token": token},
                json={"phone": phone, "telegram_id": message.from_user.id},
            )
        if response.is_success:
            await message.answer("Raqam bog'landi. Saytda kod so'rang.")
        else:
            await message.answer("Raqam topilmadi. Avval saytda shu telefon bilan kiring.")

    await dispatcher.start_polling(bot)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
