import json
from datetime import date, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.seed import uid
from app.seed_education import FIRST_NAMES, LAST_NAMES
from app.signing import sign_payload

TRADE = "Santexnik"


def _class_days(today: date, count: int) -> list[date]:
    found: list[date] = []
    cursor = today - timedelta(days=1)
    while len(found) < count:
        if cursor.weekday() in (0, 2, 3):
            found.append(cursor)
        cursor -= timedelta(days=1)
    return found


async def seed_certificates(conn: AsyncConnection) -> None:
    existing = await conn.execute(text("SELECT count(*) FROM certificates WHERE status = 'ISSUED'"))
    if int(existing.scalar_one()) >= 20:
        return
    admin_id = uid("user:admin")
    officer_id = uid("mentor:1")
    await conn.execute(
        text(
            """
            INSERT INTO user_roles (id, user_id, role)
            SELECT :id, u.id, 'education_lead'
            FROM users u
            WHERE u.phone = '+998901000001'
              AND NOT EXISTS (
                SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'education_lead'
              )
            """
        ),
        {"id": uid("role:education-lead")},
    )
    await conn.execute(
        text(
            """
            INSERT INTO user_roles (id, user_id, role)
            SELECT :id, u.id, 'cert_officer'
            FROM users u
            WHERE u.phone = '+998901200002'
              AND NOT EXISTS (
                SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'cert_officer'
              )
            """
        ),
        {"id": uid("role:cert-officer")},
    )
    days = _class_days(date.today(), 10)
    trade_id = uid("trade:plumber")
    for number in range(21, 41):
        await _prepare_graduate(conn, number, days)
        first = FIRST_NAMES[number % len(FIRST_NAMES)]
        last = LAST_NAMES[number % len(LAST_NAMES)]
        serial = number - 20
        cert_number = f"UB-2026-{serial:06d}"
        payload = {
            "holder": f"{first} {last}",
            "issuer": "UB_NAMDTU",
            "level": "ASSISTANT",
            "number": cert_number,
            "trade": TRADE,
        }
        digest, signature = sign_payload(payload)
        await conn.execute(
            text(
                """
                INSERT INTO certificates (
                  id, number, person_id, enrollment_id, trade_id, issuer, level, status,
                  issued_at, payload, payload_hash, signature, key_id
                )
                VALUES (
                  :id, :number, :person_id, :enrollment_id, :trade_id, 'UB_NAMDTU', 'ASSISTANT',
                  'ISSUED', now(), CAST(:payload AS jsonb), decode(:digest, 'hex'),
                  decode(:signature, 'hex'), 'local-2026'
                )
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {
                "id": uid(f"cert:{number}"),
                "number": cert_number,
                "person_id": uid(f"person:{number}"),
                "enrollment_id": uid(f"enrollment:{number}"),
                "trade_id": trade_id,
                "payload": json.dumps(payload, ensure_ascii=False),
                "digest": digest.hex(),
                "signature": signature.hex(),
            },
        )
        for approver, role in (
            (admin_id, "education_lead"),
            (officer_id, "cert_officer"),
        ):
            await conn.execute(
                text(
                    """
                    INSERT INTO certificate_approvals (certificate_id, approver_id, role, decision, comment)
                    VALUES (:certificate_id, :approver_id, CAST(:role AS role_code), 'APPROVE', 'Namuna')
                    ON CONFLICT DO NOTHING
                    """
                ),
                {
                    "certificate_id": uid(f"cert:{number}"),
                    "approver_id": approver,
                    "role": role,
                },
            )
    for number in (41, 42):
        await _prepare_graduate(conn, number, days)
        await conn.execute(
            text(
                """
                INSERT INTO certificates (
                  id, person_id, enrollment_id, trade_id, issuer, level, status
                )
                VALUES (
                  :id, :person_id, :enrollment_id, :trade_id, 'UB_NAMDTU', 'ASSISTANT', 'PENDING_APPROVAL'
                )
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {
                "id": uid(f"cert:{number}"),
                "person_id": uid(f"person:{number}"),
                "enrollment_id": uid(f"enrollment:{number}"),
                "trade_id": trade_id,
            },
        )
    await conn.execute(text("SELECT setval('cert_seq_2026', 20, true)"))


async def _prepare_graduate(conn: AsyncConnection, number: int, days: list[date]) -> None:
    first = FIRST_NAMES[number % len(FIRST_NAMES)]
    last = LAST_NAMES[number % len(LAST_NAMES)]
    phone = f"+9989013{number:05d}"
    mentor_id = uid(f"mentor:{(number - 1) // 10}")
    await conn.execute(
        text(
            """
            INSERT INTO persons (id, user_id, last_name, first_name, birth_date)
            SELECT :id, u.id, :last_name, :first_name, :birth_date
            FROM users u
            WHERE u.phone = :phone
            ON CONFLICT (id) DO NOTHING
            """
        ),
        {
            "id": uid(f"person:{number}"),
            "last_name": last,
            "first_name": first,
            "birth_date": date(2000, 1, 1) + timedelta(days=number),
            "phone": phone,
        },
    )
    enrollment_id = uid(f"enrollment:{number}")
    for day in days:
        await conn.execute(
            text(
                """
                INSERT INTO attendance (id, enrollment_id, date, status, site_hours, recorded_by)
                VALUES (
                  :id, :enrollment_id, :day, 'PRESENT', 12, :mentor_id
                )
                ON CONFLICT (enrollment_id, date) DO NOTHING
                """
            ),
            {
                "id": uid(f"attendance:{number}:{day.isoformat()}"),
                "enrollment_id": enrollment_id,
                "day": day,
                "mentor_id": mentor_id,
            },
        )
    for key in ("theory", "workshop", "site"):
        await conn.execute(
            text(
                """
                INSERT INTO assessments (id, enrollment_id, module_id, score, passed, assessed_by)
                VALUES (:id, :enrollment_id, :module_id, 86, true, :mentor_id)
                ON CONFLICT (enrollment_id, module_id) DO NOTHING
                """
            ),
            {
                "id": uid(f"assessment:{number}:{key}"),
                "enrollment_id": enrollment_id,
                "module_id": uid(f"module:{key}"),
                "mentor_id": mentor_id,
            },
        )
    await conn.execute(
        text(
            """
            INSERT INTO final_exams (
              id, enrollment_id, theory_score, practice_score, examiner_ids, held_at
            )
            VALUES (
              :id, :enrollment_id, 78, 84, ARRAY[:mentor_id]::uuid[], now()
            )
            ON CONFLICT (enrollment_id) DO NOTHING
            """
        ),
        {"id": uid(f"exam:{number}"), "enrollment_id": enrollment_id, "mentor_id": mentor_id},
    )
