"""Demo accounts for the institution staff roles (created on first demo login, like the employer and producer ones)."""

import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.onboarding import ensure_agency_employer
from app.security import new_id

# demo key -> (phone, full name, role, partner slug or None)
STAFF_DEMOS: dict[str, tuple[str, str, str, str | None]] = {
    "director": ("+998901800001", "Loyiha o'quv direktori", "education_lead", None),
    "namdtu": ("+998901800002", "NamDTU vakili", "university_officer", "namdtu"),
    "hokimlik": ("+998901800003", "Hokimlik vakili", "district_official", "uychi-hokimlik"),
    "bandlik": ("+998901800004", "Bandlik bo'limi xodimi", "employment_officer", "tuman-bandlik"),
    "agency": ("+998901800005", "Migratsiya agentligi xodimi", "agency_officer", "tashqi-mehnat"),
    "republic": ("+998901800006", "Respublika migratsiya nazoratchisi", "migration_observer", None),
    "mahalla": ("+998901800007", "Mahalla hokim yordamchisi", "mahalla_assistant", None),
    "foreign": ("+998901800008", "Xorijiy ish beruvchi vakili", "employer_foreign", None),
}

DEMO_NEXT = {
    "director": "/kabinet",
    "namdtu": "/kabinet/bitiruvchilar",
    "hokimlik": "/kabinet/hisobot",
    "bandlik": "/kabinet/bandlik",
    "agency": "/kabinet/migratsiya",
    "republic": "/kabinet/migratsiya",
    "mahalla": "/kabinet/mahalla",
    "foreign": "/kabinet/vakansiyalar",
}


async def ensure_demo_staff(conn: AsyncConnection, key: str) -> None:
    phone, name, role, partner_slug = STAFF_DEMOS[key]
    user_id = (await conn.execute(text("SELECT id FROM users WHERE phone = :phone"), {"phone": phone})).scalar()
    if user_id is None:
        user_id = new_id()
        await conn.execute(
            text("INSERT INTO users (id, phone, full_name, locale) VALUES (:id, :phone, :name, 'uz-Latn')"),
            {"id": user_id, "phone": phone, "name": name},
        )
    await conn.execute(
        text(
            """
            INSERT INTO user_roles (id, user_id, role)
            SELECT :id, :user_id, CAST(:role AS role_code)
            WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = :user_id AND role = CAST(:role AS role_code))
            """
        ),
        {"id": new_id(), "user_id": user_id, "role": role},
    )
    if partner_slug is not None:
        await conn.execute(
            text(
                """
                INSERT INTO partner_members (partner_id, user_id, title)
                SELECT id, :user_id, :title FROM partners WHERE slug = :slug
                ON CONFLICT DO NOTHING
                """
            ),
            {"user_id": user_id, "slug": partner_slug, "title": name},
        )
    if key == "agency":
        partner = (await conn.execute(text("SELECT id FROM partners WHERE slug = :slug"), {"slug": "tashqi-mehnat"})).scalar()
        if partner is not None:
            await ensure_agency_employer(conn, uuid.UUID(str(user_id)), partner)
    if key == "mahalla":
        await conn.execute(
            text(
                """
                INSERT INTO staff_mahallas (user_id, mahalla_id)
                SELECT :user_id, id FROM (SELECT id FROM mahallas ORDER BY name->>'uz-Latn' LIMIT 2) m
                ON CONFLICT DO NOTHING
                """
            ),
            {"user_id": user_id},
        )
    if key == "foreign":
        await _ensure_foreign(conn, uuid.UUID(str(user_id)))


async def _ensure_foreign(conn: AsyncConnection, user_id: uuid.UUID) -> None:
    employer = (await conn.execute(text("SELECT employer_id FROM employer_members WHERE user_id = :id LIMIT 1"), {"id": user_id})).scalar()
    if employer is None:
        employer = new_id()
        await conn.execute(
            text("INSERT INTO employers (id, kind, name, country_code, verified_at) VALUES (:id, 'FOREIGN', 'Seoul Build Co.', 'KR', now())"),
            {"id": employer},
        )
        await conn.execute(
            text("INSERT INTO employer_members (employer_id, user_id, is_owner) VALUES (:e, :u, true)"),
            {"e": employer, "u": user_id},
        )
    has_vacancy = (await conn.execute(text("SELECT 1 FROM demand_requests WHERE employer_id = :e LIMIT 1"), {"e": employer})).first()
    if has_vacancy is None:
        for trade_code, quantity, low, high in (("plumber", 6, 1800, 2400), ("electrician", 4, 2000, 2600)):
            await conn.execute(
                text(
                    """
                    INSERT INTO demand_requests (id, employer_id, trade_id, quantity, track, status, destination_id, location,
                                                 duration_months, salary_from, salary_to, salary_currency, conditions, title,
                                                 requirements, duties, benefits, schedule, city, address)
                    SELECT :id, :e, t.id, :quantity, 'FOREIGN', 'NEW', d.id, 'KR', 12, :low, :high, 'USD',
                           'Yotoqxona va ovqat kompaniya hisobidan.', t.name->>'uz-Latn' || ' (Seoul loyihasi)',
                           CAST('{"min_level": "MASTER", "min_experience_years": 2, "certificate_required": true, "language": "ko", "language_level": 2}' AS jsonb),
                           'Turar-joy binosida ichki montaj ishlari.', CAST('{"housing": true, "meals": true, "insurance": true, "visa_support": true}' AS jsonb),
                           '6 kun, kuniga 8 soat', 'Seoul', 'Gangnam-gu, Teheran-ro 100'
                    FROM trades t, destinations d WHERE t.code = :trade AND d.country_code = 'KR'
                    """
                ),
                {"id": new_id(), "e": employer, "quantity": quantity, "low": low, "high": high, "trade": trade_code},
            )
