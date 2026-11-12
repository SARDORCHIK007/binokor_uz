import re
import uuid
from typing import Literal

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.onboarding import INVITABLE_ROLES
from app.ratelimit import client_ip, too_many
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(tags=["onboarding"])

PHONE = re.compile(r"^\+998[0-9]{9}$")
INVITE_DAYS = 30
PARTNER_KINDS = {"GOV", "EDU", "INTL", "EMPLOYER", "AGENCY", "PRODUCER"}


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


async def _admin(request: Request) -> uuid.UUID | JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    async with _engine(request).connect() as conn:
        found = await conn.execute(
            text("SELECT 1 FROM user_roles WHERE user_id = :id AND role IN ('admin', 'superadmin')"),
            {"id": user_id},
        )
        if found.first() is None:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Taklifnoma yuborish faqat administrator uchun.")
    return user_id


def _label(value: object) -> str:
    if isinstance(value, dict):
        return str(value.get("uz-Latn") or "")
    return ""


class InviteIn(BaseModel):
    phone: str
    full_name: str = Field(min_length=3, max_length=120)
    role: str
    partner_slug: str | None = None
    mahalla_id: uuid.UUID | None = None
    org_name: str | None = Field(default=None, max_length=200)
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    title: str | None = Field(default=None, max_length=120)


class BulkInviteIn(BaseModel):
    role: str
    partner_slug: str | None = None
    mahalla_id: uuid.UUID | None = None
    lines: str = Field(max_length=20000)


async def _create_invite(conn: AsyncConnection, body: InviteIn, created_by: uuid.UUID) -> tuple[str | None, str | None]:
    """Returns (invitation id, error message)."""
    if not PHONE.match(body.phone):
        return None, "Telefon +998XXXXXXXXX ko'rinishida bo'lishi kerak."
    needs = INVITABLE_ROLES.get(body.role)
    if needs is None:
        return None, "Bu rolga taklifnoma yuborib bo'lmaydi."
    partner_id = None
    if body.partner_slug:
        partner = await conn.execute(text("SELECT id FROM partners WHERE slug = :slug"), {"slug": body.partner_slug})
        partner_id = partner.scalar()
        if partner_id is None:
            return None, "Hamkor tashkilot topilmadi."
    fields = {"mahalla_id": body.mahalla_id, "org_name": (body.org_name or "").strip(), "country_code": body.country_code}
    for field in needs:
        if not fields[field]:
            return None, "Bu rol uchun kerakli maydon to'ldirilmagan."
    if body.mahalla_id is not None:
        exists = await conn.execute(text("SELECT 1 FROM mahallas WHERE id = :id"), {"id": body.mahalla_id})
        if exists.first() is None:
            return None, "Mahalla topilmadi."
    duplicate = await conn.execute(
        text(
            "SELECT 1 FROM invitations WHERE phone = :phone AND role = CAST(:role AS role_code) "
            "AND status = 'PENDING' AND expires_at > now()"
        ),
        {"phone": body.phone, "role": body.role},
    )
    if duplicate.first() is not None:
        return None, "Bu raqamga shu rol uchun taklifnoma allaqachon yuborilgan."
    invite_id = new_id()
    await conn.execute(
        text(
            """
            INSERT INTO invitations (id, phone, full_name, role, partner_id, mahalla_id, org_name, country_code, title,
                                     created_by, expires_at)
            VALUES (:id, :phone, :name, CAST(:role AS role_code), :partner, :mahalla, :org, :country, :title,
                    :by, now() + make_interval(days => :days))
            """
        ),
        {
            "id": invite_id,
            "phone": body.phone,
            "name": body.full_name.strip(),
            "role": body.role,
            "partner": partner_id,
            "mahalla": body.mahalla_id,
            "org": fields["org_name"] or None,
            "country": body.country_code.upper() if body.country_code else None,
            "title": (body.title or "").strip() or None,
            "by": created_by,
            "days": INVITE_DAYS,
        },
    )
    return str(invite_id), None


@router.get("/api/v1/admin/invitations")
async def list_invitations(request: Request) -> JSONResponse:
    gate = await _admin(request)
    if isinstance(gate, JSONResponse):
        return gate
    async with _engine(request).connect() as conn:
        rows = await conn.execute(
            text(
                """
                SELECT i.id::text AS id, i.phone, i.full_name, i.role::text AS role, i.status,
                       i.created_at::date::text AS created, i.expires_at::date::text AS expires,
                       p.name AS partner, m.name AS mahalla, i.org_name, i.country_code,
                       (i.status = 'PENDING' AND i.expires_at <= now()) AS expired
                FROM invitations i
                LEFT JOIN partners p ON p.id = i.partner_id
                LEFT JOIN mahallas m ON m.id = i.mahalla_id
                ORDER BY i.created_at DESC LIMIT 300
                """
            )
        )
        items = [
            {
                "id": r["id"],
                "phone": r["phone"],
                "full_name": r["full_name"],
                "role": r["role"],
                "status": "EXPIRED" if r["expired"] else r["status"],
                "created": r["created"],
                "expires": r["expires"],
                "partner": _label(r["partner"]),
                "mahalla": _label(r["mahalla"]),
                "org_name": r["org_name"],
                "country_code": (r["country_code"] or "").strip(),
            }
            for r in rows.mappings()
        ]
    return JSONResponse(items)


@router.post("/api/v1/admin/invitations")
async def create_invitation(body: InviteIn, request: Request) -> JSONResponse:
    gate = await _admin(request)
    if isinstance(gate, JSONResponse):
        return gate
    async with _engine(request).begin() as conn:
        invite_id, error = await _create_invite(conn, body, gate)
    if error is not None:
        return problem(422, "VALIDATION", "Taklifnoma yuborilmadi", error)
    return JSONResponse({"id": invite_id, "status": "PENDING"})


@router.post("/api/v1/admin/invitations/bulk")
async def bulk_invitations(body: BulkInviteIn, request: Request) -> JSONResponse:
    """One person per line: `+998901234567, Familiya Ism`. Used for dozens of teachers at once."""
    gate = await _admin(request)
    if isinstance(gate, JSONResponse):
        return gate
    created = 0
    failed: list[dict[str, str]] = []
    lines = [line.strip() for line in body.lines.splitlines() if line.strip()]
    if not lines or len(lines) > 200:
        return problem(422, "VALIDATION", "Ro'yxat noto'g'ri", "1 dan 200 gacha qator kiriting.")
    async with _engine(request).begin() as conn:
        for line in lines:
            parts = [part.strip() for part in re.split(r"[;,\t]", line, maxsplit=1)]
            if len(parts) != 2:
                failed.append({"line": line, "error": "Telefon va ism vergul bilan ajratilishi kerak."})
                continue
            item = InviteIn.model_construct(
                phone=parts[0].replace(" ", ""),
                full_name=parts[1],
                role=body.role,
                partner_slug=body.partner_slug,
                mahalla_id=body.mahalla_id,
                org_name=None,
                country_code=None,
                title=None,
            )
            if len(item.full_name) < 3:
                failed.append({"line": line, "error": "Ism juda qisqa."})
                continue
            invite_id, error = await _create_invite(conn, item, gate)
            if error is not None:
                failed.append({"line": line, "error": error})
            else:
                created += 1
    return JSONResponse({"created": created, "failed": failed})


@router.delete("/api/v1/admin/invitations/{invitation_id}")
async def revoke_invitation(invitation_id: uuid.UUID, request: Request) -> JSONResponse:
    gate = await _admin(request)
    if isinstance(gate, JSONResponse):
        return gate
    async with _engine(request).begin() as conn:
        done = await conn.execute(
            text("UPDATE invitations SET status = 'REVOKED' WHERE id = :id AND status = 'PENDING' RETURNING id"),
            {"id": invitation_id},
        )
        if done.first() is None:
            return problem(409, "NOT_PENDING", "Bekor qilib bo'lmadi", "Taklifnoma kutilmayapti.")
    return JSONResponse({"status": "REVOKED"})


@router.get("/api/v1/admin/onboarding-options")
async def options(request: Request) -> JSONResponse:
    gate = await _admin(request)
    if isinstance(gate, JSONResponse):
        return gate
    async with _engine(request).connect() as conn:
        mahallas = await conn.execute(text("SELECT id::text AS id, name FROM mahallas ORDER BY name->>'uz-Latn'"))
        partners = await conn.execute(
            text("SELECT slug, name, kind::text AS kind FROM partners WHERE slug IS NOT NULL ORDER BY sort_order, name->>'uz-Latn'")
        )
        countries = await conn.execute(text("SELECT country_code FROM destinations WHERE is_active ORDER BY country_code"))
        return JSONResponse(
            {
                "roles": {role: sorted(needs) for role, needs in INVITABLE_ROLES.items()},
                "mahallas": [{"id": r["id"], "name": _label(r["name"])} for r in mahallas.mappings()],
                "partners": [{"slug": r["slug"], "name": _label(r["name"]), "kind": r["kind"]} for r in partners.mappings()],
                "countries": [str(r[0]).strip() for r in countries.all()],
            }
        )


# ---------------------------------------------------------------- "become a partner" requests


class PartnerRequestIn(BaseModel):
    org_name: str = Field(min_length=2, max_length=200)
    kind: Literal["GOV", "EDU", "INTL", "EMPLOYER", "AGENCY", "PRODUCER"]
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    contact_name: str = Field(min_length=3, max_length=120)
    phone: str = Field(min_length=7, max_length=20)
    email: str | None = Field(default=None, max_length=120)
    message: str | None = Field(default=None, max_length=2000)


@router.post("/api/v1/public/partner-requests")
async def submit_partner_request(body: PartnerRequestIn, request: Request) -> JSONResponse:
    limited = await too_many(request, "partner-request", client_ip(request), limit=5, window_seconds=3600)
    if limited is not None:
        return limited
    phone = body.phone.replace(" ", "")
    if not phone.startswith("+") or not phone[1:].isdigit():
        return problem(422, "VALIDATION", "Telefon noto'g'ri", "Telefonni xalqaro formatda kiriting, masalan +998901234567.")
    async with _engine(request).begin() as conn:
        await conn.execute(
            text(
                """
                INSERT INTO partner_requests (id, org_name, kind, country_code, contact_name, phone, email, message)
                VALUES (:id, :org, :kind, :country, :contact, :phone, :email, :message)
                """
            ),
            {
                "id": new_id(),
                "org": body.org_name.strip(),
                "kind": body.kind,
                "country": body.country_code.upper() if body.country_code else None,
                "contact": body.contact_name.strip(),
                "phone": phone[:13],
                "email": (body.email or "").strip() or None,
                "message": (body.message or "").strip() or None,
            },
        )
    return JSONResponse({"status": "NEW"})


@router.get("/api/v1/admin/partner-requests")
async def list_partner_requests(request: Request) -> JSONResponse:
    gate = await _admin(request)
    if isinstance(gate, JSONResponse):
        return gate
    async with _engine(request).connect() as conn:
        rows = await conn.execute(
            text(
                """
                SELECT id::text AS id, org_name, kind, country_code, contact_name, phone, email, message,
                       status, created_at::date::text AS created, decision_note
                FROM partner_requests ORDER BY (status = 'NEW') DESC, created_at DESC LIMIT 200
                """
            )
        )
        items = [{**dict(r), "country_code": (r["country_code"] or "").strip()} for r in rows.mappings()]
    return JSONResponse(items)


class PartnerDecision(BaseModel):
    status: Literal["APPROVED", "REJECTED"]
    note: str | None = Field(default=None, max_length=500)


@router.post("/api/v1/admin/partner-requests/{request_id}/decision")
async def decide_partner_request(request_id: uuid.UUID, body: PartnerDecision, request: Request) -> JSONResponse:
    gate = await _admin(request)
    if isinstance(gate, JSONResponse):
        return gate
    async with _engine(request).begin() as conn:
        done = await conn.execute(
            text(
                """
                UPDATE partner_requests SET status = :status, decided_by = :by, decided_at = now(), decision_note = :note
                WHERE id = :id AND status = 'NEW' RETURNING id
                """
            ),
            {"status": body.status, "by": gate, "note": (body.note or "").strip() or None, "id": request_id},
        )
        if done.first() is None:
            return problem(409, "ALREADY_DECIDED", "Qaror qabul qilingan", "Bu so'rov ko'rib chiqilgan.")
    return JSONResponse({"status": body.status})
