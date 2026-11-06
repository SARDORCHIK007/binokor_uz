import json
from datetime import date

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.seed import uid


async def seed_market(conn: AsyncConnection) -> None:
    existing = await conn.execute(text("SELECT count(*) FROM employers"))
    if int(existing.scalar_one()) >= 10:
        return
    trade_id = uid("trade:plumber")
    employer_ids: list[str] = []
    for index in range(10):
        employer_id = uid(f"employer:{index}")
        employer_ids.append(str(employer_id))
        await conn.execute(
            text(
                """
                INSERT INTO employers (id, kind, name, country_code, inn, verified_at)
                VALUES (:id, 'LOCAL', :name, 'UZ', :inn, now())
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {"id": employer_id, "name": f"Uychi qurilish {index + 1}", "inn": f"30000000{index + 1}"},
        )
    for index in range(3):
        await conn.execute(
            text(
                """
                INSERT INTO demand_requests (
                  id, employer_id, trade_id, quantity, as_brigade, track, location, status
                )
                VALUES (
                  :id, :employer_id, :trade_id, :quantity, :as_brigade, 'DOMESTIC', 'Uychi tumani', 'NEW'
                )
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {
                "id": uid(f"request:{index}"),
                "employer_id": uid(f"employer:{index}"),
                "trade_id": trade_id,
                "quantity": 4 + index,
                "as_brigade": index == 0,
            },
        )
    brigade_id = uid("brigade:1")
    leader_phone = "+998901300021"
    await conn.execute(
        text(
            """
            INSERT INTO brigades (id, name, trade_id, leader_user_id, status, readiness, created_at)
            SELECT :id, 'Santexnik brigada 1', :trade_id, u.id, 'FORMING', CAST(:readiness AS jsonb), now()
            FROM users u WHERE u.phone = :phone
            ON CONFLICT (id) DO NOTHING
            """
        ),
        {
            "id": brigade_id,
            "trade_id": trade_id,
            "phone": leader_phone,
            "readiness": json.dumps({"certificates": True, "size": 8}),
        },
    )
    for number in range(21, 29):
        await conn.execute(
            text(
                """
                INSERT INTO brigade_members (brigade_id, worker_user_id)
                SELECT :brigade_id, u.id
                FROM users u WHERE u.phone = :phone
                ON CONFLICT DO NOTHING
                """
            ),
            {"brigade_id": brigade_id, "phone": f"+9989013{number:05d}"},
        )
    await conn.execute(
        text("UPDATE brigades SET status = 'READY' WHERE id = :id AND status = 'FORMING'"),
        {"id": brigade_id},
    )
    for index in range(5):
        number = 21 + index
        await conn.execute(
            text(
                """
                INSERT INTO placements (
                  id, worker_user_id, employer_id, kind, start_date, monthly_salary, currency
                )
                SELECT :id, u.id, :employer_id, 'DIRECT', :start_date, 4500000, 'UZS'
                FROM users u WHERE u.phone = :phone
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {
                "id": uid(f"placement:{index}"),
                "employer_id": uid(f"employer:{index}"),
                "start_date": date(2026, 11, 1),
                "phone": f"+9989013{number:05d}",
            },
        )
