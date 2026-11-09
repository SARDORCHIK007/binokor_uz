"""In-app notifications (the bell in the top bar)."""

import json
import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.security import new_id


async def notify(conn: AsyncConnection, user_id: uuid.UUID, kind: str, payload: dict[str, object]) -> None:
    await conn.execute(
        text(
            """
            INSERT INTO notifications (id, user_id, kind, channel, payload, status, sent_at)
            VALUES (:id, :user_id, :kind, 'inapp', CAST(:payload AS jsonb), 'SENT', now())
            """
        ),
        {"id": new_id(), "user_id": user_id, "kind": kind, "payload": json.dumps(payload, ensure_ascii=False)},
    )
