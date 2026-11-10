import json
from datetime import date, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.seed import uid

FIRST_NAMES = (
    "Aziz", "Bobur", "Davron", "Jasur", "Sardor", "Bekzod", "Otabek", "Sherzod",
    "Ulugbek", "Jamshid",
)
LAST_NAMES = ("Karimov", "Tursunov", "Sobirov", "Aliyev", "Mirzayev", "Yusupov", "Rahimov", "Qodirov")


def _name(value: str) -> str:
    return json.dumps({"uz-Latn": value}, ensure_ascii=False)


async def seed_education(conn: AsyncConnection) -> None:
    existing = await conn.execute(text("SELECT count(*) FROM groups"))
    if int(existing.scalar_one()) >= 8:
        return
    trade_id = uid("trade:plumber")
    course_id = uid("course:plumber-domestic")
    start = date(2026, 9, 1)
    end = start + timedelta(days=180)
    await conn.execute(
        text(
            """
            INSERT INTO courses (
              id, trade_id, track, title, start_date, end_date,
              hours_theory, hours_workshop, hours_site, hours_language, demand_basis
            )
            VALUES (
              :id, :trade_id, 'DOMESTIC', CAST(:title AS jsonb), :start_date, :end_date,
              40, 60, 100, 0, 'Ichki buyurtmalar'
            )
            ON CONFLICT (id) DO NOTHING
            """
        ),
        {
            "id": course_id,
            "trade_id": trade_id,
            "title": _name("Santexnik, ichki trek"),
            "start_date": start,
            "end_date": end,
        },
    )
    schedule = json.dumps({"days": ["Du", "Ch", "Ju"], "time": "09:00-13:00"})
    for mentor_index in range(8):
        phone = f"+9989012{mentor_index + 1:05d}"
        user_id = uid(f"mentor:{mentor_index}")
        await conn.execute(
            text(
                """
                INSERT INTO users (id, phone, full_name)
                VALUES (:id, :phone, :full_name)
                ON CONFLICT (phone) DO NOTHING
                """
            ),
            {"id": user_id, "phone": phone, "full_name": f"Ustoz {mentor_index + 1} Yusupov"},
        )
        await conn.execute(
            text(
                """
                INSERT INTO user_roles (id, user_id, role)
                SELECT :id, u.id, 'mentor'
                FROM users u
                WHERE u.phone = :phone
                  AND NOT EXISTS (
                    SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'mentor'
                  )
                """
            ),
            {"id": uid(f"mentor-role:{mentor_index}"), "phone": phone},
        )
        group_id = uid(f"group:{mentor_index}")
        await conn.execute(
            text(
                """
                INSERT INTO groups (id, course_id, code, mentor_user_id, max_students, schedule)
                SELECT :id, :course_id, :code, u.id, 10, CAST(:schedule AS jsonb)
                FROM users u WHERE u.phone = :phone
                ON CONFLICT (code) DO NOTHING
                """
            ),
            {
                "id": group_id,
                "course_id": course_id,
                "code": f"SANT-2026-{mentor_index + 1:02d}",
                "phone": phone,
                "schedule": schedule,
            },
        )
        for seat in range(10):
            number = mentor_index * 10 + seat + 1
            student_phone = f"+9989013{number:05d}"
            student_id = uid(f"student:{number}")
            first = FIRST_NAMES[number % len(FIRST_NAMES)]
            last = LAST_NAMES[number % len(LAST_NAMES)]
            await conn.execute(
                text(
                    """
                    INSERT INTO users (id, phone, full_name)
                    VALUES (:id, :phone, :full_name)
                    ON CONFLICT (phone) DO NOTHING
                    """
                ),
                {"id": student_id, "phone": student_phone, "full_name": f"{first} {last}"},
            )
            await conn.execute(
                text(
                    """
                    INSERT INTO user_roles (id, user_id, role)
                    SELECT :id, u.id, 'student'
                    FROM users u
                    WHERE u.phone = :phone
                      AND NOT EXISTS (
                        SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'student'
                      )
                    """
                ),
                {"id": uid(f"student-role:{number}"), "phone": student_phone},
            )
            await conn.execute(
                text(
                    """
                    INSERT INTO enrollments (id, group_id, student_user_id, status)
                    SELECT :id, g.id, u.id, 'ACTIVE'
                    FROM groups g, users u
                    WHERE g.code = :code AND u.phone = :phone
                    ON CONFLICT (group_id, student_user_id) DO NOTHING
                    """
                ),
                {
                    "id": uid(f"enrollment:{number}"),
                    "code": f"SANT-2026-{mentor_index + 1:02d}",
                    "phone": student_phone,
                },
            )
