import json

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.seed import uid


async def seed_workers(conn: AsyncConnection) -> None:
    existing = await conn.execute(text("SELECT count(*) FROM worker_profiles WHERE slug LIKE 'bitiruvchi-%'"))
    if int(existing.scalar_one()) >= 20:
        return
    visibility = json.dumps(
        {"photo": False, "full_name": True, "portfolio": True, "ratings": True, "languages": True}
    )
    trade_id = uid("trade:plumber")
    for number in range(21, 41):
        phone = f"+9989013{number:05d}"
        slug = f"bitiruvchi-{number - 20:02d}"
        await conn.execute(
            text(
                """
                INSERT INTO user_roles (id, user_id, role)
                SELECT :id, u.id, 'worker'
                FROM users u
                WHERE u.phone = :phone
                  AND NOT EXISTS (
                    SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'worker'
                  )
                """
            ),
            {"id": uid(f"worker-role:{number}"), "phone": phone},
        )
        await conn.execute(
            text(
                """
                INSERT INTO worker_profiles (
                  user_id, person_id, slug, primary_trade_id, level, availability,
                  verified_hours, rating_avg, rating_count, visibility
                )
                SELECT u.id, :person_id, :slug, :trade_id, 'ASSISTANT', 'FREE',
                       820, 4.7, 2, CAST(:visibility AS jsonb)
                FROM users u
                WHERE u.phone = :phone
                ON CONFLICT (user_id) DO NOTHING
                """
            ),
            {
                "person_id": uid(f"person:{number}"),
                "slug": slug,
                "trade_id": trade_id,
                "visibility": visibility,
                "phone": phone,
            },
        )
