"""A partner organisation's own staff edit its public profile (short role, long description, contacts).

Name, kind, status and logo stay with the administrator: the agreement and the logo permission (BR-15) are not theirs to change.
"""

import json
import re
import uuid

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/partner", tags=["partner-profile"])

LOCALES = ("uz-Latn", "uz-Cyrl", "ru", "en")
ROLE_MAX = 300
ABOUT_MAX = 2000
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE = re.compile(r"^\+[0-9]{7,15}$")


def _engine(request: Request) -> AsyncEngine:
    engine: AsyncEngine = request.app.state.engine
    return engine


def _user_id(request: Request) -> uuid.UUID | None:
    token = bearer_from_request(request)
    if token is None:
        return None
    payload = read_access_token(token)
    if payload is None or "sub" not in payload:
        return None
    return uuid.UUID(str(payload["sub"]))


async def _editable(conn: AsyncConnection, user_id: uuid.UUID) -> list[dict[str, object]]:
    """Partners this person may edit: their own organisations; an administrator may edit all."""
    admin = (
        await conn.execute(text("SELECT 1 FROM user_roles WHERE user_id = :id AND role IN ('admin', 'superadmin')"), {"id": user_id})
    ).first()
    where = "" if admin else "JOIN partner_members m ON m.partner_id = p.id AND m.user_id = :id"
    rows = await conn.execute(
        text(
            f"""
            SELECT p.id::text AS id, p.slug, p.name, p.kind::text AS kind, p.status::text AS status, p.role_description, p.about,
                   p.website, p.contact_email, p.contact_phone, p.address, p.profile_updated_at::text AS updated
            FROM partners p {where}
            WHERE p.slug IS NOT NULL
            ORDER BY p.sort_order, p.name->>'uz-Latn'
            """
        ),
        {"id": user_id},
    )
    items = []
    for r in rows.mappings():
        items.append(
            {
                "slug": r["slug"],
                "name": (r["name"] or {}).get("uz-Latn", "") if isinstance(r["name"], dict) else "",
                "kind": r["kind"],
                "status": r["status"],
                "role": {code: str((r["role_description"] or {}).get(code, "")) for code in LOCALES},
                "about": {code: str((r["about"] or {}).get(code, "")) for code in LOCALES},
                "website": r["website"] or "",
                "email": r["contact_email"] or "",
                "phone": r["contact_phone"] or "",
                "address": r["address"] or "",
                "updated": r["updated"],
            }
        )
    return items


@router.get("/profiles")
async def my_profiles(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    async with _engine(request).connect() as conn:
        items = await _editable(conn, user_id)
    if not items:
        return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Siz hech bir hamkor tashkilotga biriktirilmagansiz.")
    return JSONResponse(items)


class ProfileIn(BaseModel):
    role: dict[str, str] = Field(default_factory=dict)
    about: dict[str, str] = Field(default_factory=dict)
    website: str | None = Field(default=None, max_length=200)
    email: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=200)


def _clean_texts(value: dict[str, str], limit: int) -> dict[str, str] | None:
    """Keep only known languages, trimmed and non-empty. None means a value was too long or had an unknown language."""
    out: dict[str, str] = {}
    for code, raw in value.items():
        if code not in LOCALES:
            return None
        cleaned = raw.strip()
        if len(cleaned) > limit:
            return None
        if cleaned:
            out[code] = cleaned
    return out


@router.put("/{slug}/profile")
async def update_profile(slug: str, body: ProfileIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    role = _clean_texts(body.role, ROLE_MAX)
    about = _clean_texts(body.about, ABOUT_MAX)
    if role is None or about is None:
        return problem(422, "VALIDATION", "Matn noto'g'ri", f"Qisqa tavsif {ROLE_MAX}, batafsil matn {ABOUT_MAX} belgidan oshmasligi kerak.")
    if "uz-Latn" not in role:
        return problem(422, "VALIDATION", "Qisqa tavsif kerak", "Kamida o'zbekcha (lotin) qisqa tavsifni kiriting.")
    website = (body.website or "").strip()
    if website and not re.match(r"^https?://[^\s]+$", website):
        return problem(422, "VALIDATION", "Sayt manzili noto'g'ri", "Manzil http:// yoki https:// bilan boshlanishi kerak.")
    email = (body.email or "").strip()
    if email and not EMAIL.match(email):
        return problem(422, "VALIDATION", "Elektron pochta noto'g'ri", "Pochta manzilini tekshiring.")
    phone = (body.phone or "").replace(" ", "")
    if phone and not PHONE.match(phone):
        return problem(422, "VALIDATION", "Telefon noto'g'ri", "Telefonni xalqaro formatda kiriting, masalan +998901234567.")
    async with _engine(request).begin() as conn:
        allowed = {str(item["slug"]) for item in await _editable(conn, user_id)}
        if slug not in allowed:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu tashkilot profilini tahrirlash huquqingiz yo'q.")
        partner_id = (await conn.execute(text("SELECT id FROM partners WHERE slug = :slug"), {"slug": slug})).scalar_one()
        await conn.execute(
            text(
                """
                UPDATE partners
                SET role_description = CAST(:role AS jsonb), about = CAST(:about AS jsonb), website = :website,
                    contact_email = :email, contact_phone = :phone, address = :address,
                    profile_updated_at = now(), profile_updated_by = :by
                WHERE id = :id
                """
            ),
            {
                "role": json.dumps(role, ensure_ascii=False),
                "about": json.dumps(about, ensure_ascii=False) if about else None,
                "website": website or None,
                "email": email or None,
                "phone": phone or None,
                "address": (body.address or "").strip() or None,
                "by": user_id,
                "id": partner_id,
            },
        )
        await conn.execute(
            text("INSERT INTO partner_profile_log (id, partner_id, user_id, changed) VALUES (:id, :partner, :user, CAST(:changed AS jsonb))"),
            {
                "id": new_id(),
                "partner": partner_id,
                "user": user_id,
                "changed": json.dumps({"role": role, "about": about, "website": website, "email": email, "phone": phone}, ensure_ascii=False),
            },
        )
    return JSONResponse({"status": "saved"})
