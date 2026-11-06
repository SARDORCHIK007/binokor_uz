import os

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection


async def send_telegram(chat_id: int, message: str) -> bool:
    token = os.environ.get("BOT_TOKEN", "").strip()
    if not token or not chat_id:
        return False
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": message},
            )
    except httpx.HTTPError:
        return False
    return response.is_success


async def notify_phone(conn: AsyncConnection, phone: str, message: str) -> bool:
    row = await conn.execute(
        text("SELECT telegram_id FROM users WHERE phone = :phone"),
        {"phone": phone},
    )
    chat_id = row.scalar()
    if chat_id is None:
        return False
    return await send_telegram(int(chat_id), message)
