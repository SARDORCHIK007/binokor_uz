"""Invitations: how institution staff get into the platform.

An administrator invites a person by phone number and role. When that person logs in with the same
phone number (one-time code), the pending invitation is applied: the role is granted and, depending on the
role, the person is linked to a partner organisation, a mahalla or a foreign employer company.
"""

import uuid
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.inapp import notify
from app.security import new_id

# role -> what the invitation must carry
INVITABLE_ROLES: dict[str, set[str]] = {
    "mentor": set(),
    "curator": set(),
    "education_lead": set(),  # project study director
    "university_officer": set(),  # NamDTU office: graduates and certificate signing
    "cert_officer": set(),
    "placement_manager": set(),
    "district_official": set(),  # hokimlik
    "employment_officer": set(),  # district employment assistance office
    "agency_officer": set(),  # external labour migration agency
    "migration_observer": set(),  # republic migration body: read-only
    "mahalla_assistant": {"mahalla_id"},
    "employer_foreign": {"org_name", "country_code"},
}

# roles whose holders belong to a partner organisation
PARTNER_ROLES = {"education_lead", "university_officer", "district_official", "employment_officer", "agency_officer", "migration_observer"}

PLACEHOLDER_NAME = "Yangi foydalanuvchi"


async def pending_invites(conn: AsyncConnection, phone: str) -> list[dict[str, Any]]:
    rows = await conn.execute(
        text(
            """
            SELECT id, full_name, role::text AS role, partner_id, mahalla_id, org_name, country_code, title, created_by
            FROM invitations
            WHERE phone = :phone AND status = 'PENDING' AND expires_at > now()
            ORDER BY created_at
            """
        ),
        {"phone": phone},
    )
    return [dict(row) for row in rows.mappings()]


async def ensure_agency_employer(conn: AsyncConnection, user_id: uuid.UUID, partner_id: object) -> None:
    """Foreign vacancies may only move past NEW through an agency, so agency staff are linked to an AGENCY employer record."""
    name = (await conn.execute(text("SELECT name->>'uz-Latn' FROM partners WHERE id = :id"), {"id": partner_id})).scalar()
    if not name:
        return
    employer = (await conn.execute(text("SELECT id FROM employers WHERE kind = 'AGENCY' AND name = :name"), {"name": name})).scalar()
    if employer is None:
        employer = new_id()
        await conn.execute(
            text("INSERT INTO employers (id, kind, name, country_code, verified_at) VALUES (:id, 'AGENCY', :name, 'UZ', now())"),
            {"id": employer, "name": name},
        )
    await conn.execute(
        text("INSERT INTO employer_members (employer_id, user_id, is_owner) VALUES (:e, :u, false) ON CONFLICT DO NOTHING"),
        {"e": employer, "u": user_id},
    )


async def apply_invites(conn: AsyncConnection, user_id: uuid.UUID, phone: str) -> list[str]:
    """Grant everything the pending invitations for this phone promise. Returns the roles granted."""
    granted: list[str] = []
    for invite in await pending_invites(conn, phone):
        role = str(invite["role"])
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
        if invite["partner_id"] is not None:
            await conn.execute(
                text(
                    """
                    INSERT INTO partner_members (partner_id, user_id, title) VALUES (:partner, :user_id, :title)
                    ON CONFLICT DO NOTHING
                    """
                ),
                {"partner": invite["partner_id"], "user_id": user_id, "title": invite["title"]},
            )
        if role == "agency_officer" and invite["partner_id"] is not None:
            await ensure_agency_employer(conn, user_id, invite["partner_id"])
        if invite["mahalla_id"] is not None:
            await conn.execute(
                text("INSERT INTO staff_mahallas (user_id, mahalla_id) VALUES (:user_id, :mahalla) ON CONFLICT DO NOTHING"),
                {"user_id": user_id, "mahalla": invite["mahalla_id"]},
            )
        if role == "employer_foreign" and invite["org_name"] and invite["country_code"]:
            employer_id = new_id()
            await conn.execute(
                text(
                    """
                    INSERT INTO employers (id, kind, name, country_code, verified_at, verified_by)
                    VALUES (:id, 'FOREIGN', :name, :country, now(), :by)
                    """
                ),
                {"id": employer_id, "name": invite["org_name"], "country": invite["country_code"], "by": invite["created_by"]},
            )
            await conn.execute(
                text("INSERT INTO employer_members (employer_id, user_id, is_owner) VALUES (:employer, :user_id, true)"),
                {"employer": employer_id, "user_id": user_id},
            )
        await conn.execute(
            text("UPDATE users SET full_name = :name WHERE id = :id AND full_name = :placeholder"),
            {"name": invite["full_name"], "id": user_id, "placeholder": PLACEHOLDER_NAME},
        )
        await conn.execute(
            text("UPDATE invitations SET status = 'ACCEPTED', accepted_user = :user_id, accepted_at = now() WHERE id = :id"),
            {"user_id": user_id, "id": invite["id"]},
        )
        if invite["created_by"] is not None:
            await notify(conn, invite["created_by"], "invite_accepted", {"name": invite["full_name"], "role": role})
        granted.append(role)
    return granted
