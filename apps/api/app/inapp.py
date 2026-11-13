"""In-app notifications (the bell in the top bar)."""

import json
import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.security import new_id

# Notification groups a person can switch off in their settings.
GROUP_OF_KIND = {
    "offer": "offers",
    "offer_answer": "offers",
    "placement": "offers",
    "abroad_stage": "offers",
    "vacancy_new": "vacancies",
    "vacancy_status": "vacancies",
    "firm_verified": "vacancies",
}


async def notify(conn: AsyncConnection, user_id: uuid.UUID, kind: str, payload: dict[str, object]) -> None:
    group = GROUP_OF_KIND.get(kind, "system")
    switched_off = await conn.execute(text("SELECT prefs -> 'notify' ->> :group FROM users WHERE id = :id"), {"group": group, "id": user_id})
    if switched_off.scalar() == "false":
        return
    await conn.execute(
        text(
            """
            INSERT INTO notifications (id, user_id, kind, channel, payload, status, sent_at)
            VALUES (:id, :user_id, :kind, 'inapp', CAST(:payload AS jsonb), 'SENT', now())
            """
        ),
        {"id": new_id(), "user_id": user_id, "kind": kind, "payload": json.dumps(payload, ensure_ascii=False)},
    )
