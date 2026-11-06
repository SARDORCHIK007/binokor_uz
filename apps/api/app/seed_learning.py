from datetime import date, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.seed import uid

MODULES = (
    ("theory", "THEORY", "Nazariya", 1, 40),
    ("workshop", "WORKSHOP", "Ustaxona", 2, 60),
    ("site", "SITE", "Obyekt", 3, 100),
)


def _class_days(today: date, count: int) -> list[date]:
    found: list[date] = []
    cursor = today
    while len(found) < count:
        if cursor.weekday() in (0, 2, 3):
            found.append(cursor)
        cursor -= timedelta(days=1)
    return found


async def seed_learning(conn: AsyncConnection) -> None:
    existing = await conn.execute(text("SELECT count(*) FROM modules"))
    if int(existing.scalar_one()) >= 3:
        return
    course_id = uid("course:plumber-domestic")
    mentor_id = uid("mentor:0")
    for key, kind, title, order, hours in MODULES:
        await conn.execute(
            text(
                """
                INSERT INTO modules (id, course_id, kind, title, ord, hours)
                VALUES (
                  :id, :course_id, CAST(:kind AS module_kind),
                  CAST(:title AS jsonb), :ord, :hours
                )
                ON CONFLICT (course_id, ord) DO NOTHING
                """
            ),
            {
                "id": uid(f"module:{key}"),
                "course_id": course_id,
                "kind": kind,
                "title": '{"uz-Latn": "' + title + '"}',
                "ord": order,
                "hours": hours,
            },
        )
    days = _class_days(date.today(), 4)
    for number in range(1, 11):
        enrollment_id = uid(f"enrollment:{number}")
        for index, day in enumerate(days):
            absent = number == 10 and index < 3
            status = "ABSENT_UNEXCUSED" if absent else "PRESENT"
            hours = 0 if absent else 4
            await conn.execute(
                text(
                    """
                    INSERT INTO attendance (
                      id, enrollment_id, date, status, site_hours, recorded_by
                    )
                    VALUES (
                      :id, :enrollment_id, :day, CAST(:status AS attendance_status),
                      :hours, :mentor_id
                    )
                    ON CONFLICT (enrollment_id, date) DO NOTHING
                    """
                ),
                {
                    "id": uid(f"attendance:{number}:{day.isoformat()}"),
                    "enrollment_id": enrollment_id,
                    "day": day,
                    "status": status,
                    "hours": hours,
                    "mentor_id": mentor_id,
                },
            )
        if number < 10:
            await conn.execute(
                text(
                    """
                    INSERT INTO assessments (
                      id, enrollment_id, module_id, score, passed, comment, assessed_by
                    )
                    VALUES (
                      :id, :enrollment_id, :module_id, 82, true, 'Namoyish ishi', :mentor_id
                    )
                    ON CONFLICT (enrollment_id, module_id) DO NOTHING
                    """
                ),
                {
                    "id": uid(f"assessment:{number}:theory"),
                    "enrollment_id": enrollment_id,
                    "module_id": uid("module:theory"),
                    "mentor_id": mentor_id,
                },
            )
