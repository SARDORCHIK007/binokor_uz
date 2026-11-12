"""Register a person who wants to study on behalf of someone else (mahalla assistant, employment office, university office).

A user account is created for the phone number (or reused) so the person can later sign in and see their own application.
"""

import uuid
from dataclasses import dataclass
from datetime import date

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.rules import matrix_class
from app.security import new_id


class RegistrationError(Exception):
    def __init__(self, status: int, code: str, title: str, detail: str) -> None:
        super().__init__(detail)
        self.status = status
        self.code = code
        self.title = title
        self.detail = detail


@dataclass
class Registration:
    application_id: uuid.UUID
    matrix: str


async def register_person(
    conn: AsyncConnection,
    actor_id: uuid.UUID,
    *,
    first_name: str,
    last_name: str,
    birth_date: date,
    phone: str,
    trade_code: str,
    track: str,
    app_type: str,
    experience_years: float,
    has_language: bool,
    mahalla_id: uuid.UUID | None,
    source: str,
    university: str | None = None,
    graduation_year: int | None = None,
) -> Registration:
    trade = (await conn.execute(text("SELECT id FROM trades WHERE code = :code AND is_active"), {"code": trade_code})).scalar()
    if trade is None:
        raise RegistrationError(404, "NOT_FOUND", "Kasb topilmadi", "Kasbni qayta tanlang.")
    resident = (await conn.execute(text("SELECT id FROM users WHERE phone = :phone AND deleted_at IS NULL"), {"phone": phone})).scalar()
    if resident is None:
        resident = new_id()
        await conn.execute(
            text("INSERT INTO users (id, phone, full_name, locale) VALUES (:id, :phone, :name, 'uz-Latn')"),
            {"id": resident, "phone": phone, "name": f"{last_name.strip()} {first_name.strip()}"},
        )
        await conn.execute(text("INSERT INTO user_roles (id, user_id, role) VALUES (:id, :user_id, 'student')"), {"id": new_id(), "user_id": resident})
    person = (await conn.execute(text("SELECT id, mahalla_id FROM persons WHERE user_id = :id"), {"id": resident})).mappings().first()
    if person is None:
        person_id = new_id()
        await conn.execute(
            text(
                """
                INSERT INTO persons (id, user_id, last_name, first_name, birth_date, mahalla_id, university, graduation_year, education_level)
                VALUES (:id, :user_id, :last, :first, :birth, :mahalla, :university, :year, :level)
                """
            ),
            {
                "id": person_id,
                "user_id": resident,
                "last": last_name.strip(),
                "first": first_name.strip(),
                "birth": birth_date,
                "mahalla": mahalla_id,
                "university": university,
                "year": graduation_year,
                "level": "HIGHER" if university else None,
            },
        )
    else:
        person_id = person["id"]
        if person["mahalla_id"] is None and mahalla_id is not None:
            await conn.execute(text("UPDATE persons SET mahalla_id = :m WHERE id = :id"), {"m": mahalla_id, "id": person_id})
    active = await conn.execute(
        text("SELECT 1 FROM applications WHERE person_id = :id AND status NOT IN ('DRAFT', 'REJECTED', 'WITHDRAWN')"), {"id": person_id}
    )
    if active.first() is not None:
        raise RegistrationError(409, "DUPLICATE", "Ariza bor", "Bu odam uchun faol ariza allaqachon mavjud.")
    matrix = matrix_class(experience_years, has_language)
    application_id = new_id()
    await conn.execute(
        text(
            """
            INSERT INTO consents (id, user_id, kind, version, granted)
            VALUES (:a, :user_id, 'pd_processing', '2026-11', true), (:b, :user_id, 'telegram_notify', '2026-11', true)
            """
        ),
        {"a": new_id(), "b": new_id(), "user_id": resident},
    )
    await conn.execute(
        text(
            """
            INSERT INTO applications (id, person_id, type, source, desired_trade_id, desired_track,
                                      trade_experience_years, matrix_suggested, status, created_by)
            VALUES (:id, :person, CAST(:type AS application_type), :source, :trade, CAST(:track AS track_code),
                    :experience, CAST(:matrix AS matrix_class), 'SUBMITTED', :by)
            """
        ),
        {"id": application_id, "person": person_id, "type": app_type, "source": source, "trade": trade, "track": track, "experience": experience_years, "matrix": matrix, "by": actor_id},
    )
    await conn.execute(
        text("INSERT INTO application_events (application_id, to_status, actor_id, note) VALUES (:id, 'SUBMITTED', :by, :note)"),
        {"id": application_id, "by": actor_id, "note": f"{source.lower()} submit"},
    )
    return Registration(application_id=uuid.UUID(str(application_id)), matrix=matrix)
