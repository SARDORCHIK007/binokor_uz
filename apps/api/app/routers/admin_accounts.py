"""Accounts and system state for administrators: search, roles with safeguards, blocking, ending sessions,
and a health page. Phones are shown masked; every change is written to the audit log.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.routers.moderation import audit
from app.routers.settings import mask_phone
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/admin/accounts", tags=["admin-accounts"])

ADMIN_ROLES = {"admin", "superadmin"}
ASSIGNABLE = (
    "admin", "moderator", "content_editor", "mentor", "curator", "student", "cert_officer", "placement_manager",
    "coordinator", "education_lead", "vocab_author",
)
PAGE = 30


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


def _unauth() -> JSONResponse:
    return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")


def _forbidden() -> JSONResponse:
    return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu bo'lim administrator uchun.")


async def _roles(conn: AsyncConnection, user_id: uuid.UUID) -> set[str]:
    rows = await conn.execute(text("SELECT role::text AS role FROM user_roles WHERE user_id = :u"), {"u": user_id})
    return {str(r["role"]) for r in rows.mappings()}


@router.get("")
async def accounts(request: Request, q: str = "", role: str = "", state: str = "", page: int = 1) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & ADMIN_ROLES:
            return _forbidden()
        digits = "".join(ch for ch in q if ch.isdigit())
        rows = await conn.execute(
            text(
                """
                SELECT u.id::text AS id, u.full_name, u.phone, u.is_active, u.last_login_at::text AS last_login, u.created_at::date::text AS created,
                       coalesce((SELECT string_agg(r.role::text, ',' ORDER BY r.role::text) FROM user_roles r WHERE r.user_id = u.id), '') AS roles,
                       (SELECT count(*) FROM sessions s WHERE s.user_id = u.id AND s.revoked_at IS NULL AND s.expires_at > now()) AS sessions,
                       count(*) OVER () AS total
                FROM users u
                WHERE u.deleted_at IS NULL
                  AND (CAST(:q AS text) = '' OR u.full_name ILIKE '%' || :q || '%' OR (CAST(:digits AS text) <> '' AND u.phone LIKE '%' || :digits || '%'))
                  AND (CAST(:role AS text) = '' OR EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role::text = :role))
                  AND (CAST(:state AS text) = '' OR (:state = 'blocked' AND NOT u.is_active) OR (:state = 'active' AND u.is_active))
                ORDER BY u.last_login_at DESC NULLS LAST, u.full_name LIMIT :size OFFSET :off
                """
            ),
            {"q": q.strip(), "digits": digits if len(digits) >= 3 else "", "role": role, "state": state, "size": PAGE, "off": (max(page, 1) - 1) * PAGE},
        )
        data = rows.mappings().all()
    return JSONResponse(
        {
            "total": int(data[0]["total"]) if data else 0,
            "page": max(page, 1),
            "size": PAGE,
            "assignable": list(ASSIGNABLE),
            "items": [
                {
                    "id": r["id"], "name": r["full_name"], "phone": mask_phone(str(r["phone"])), "active": bool(r["is_active"]),
                    "last_login": (r["last_login"] or "")[:16], "created": r["created"], "roles": [x for x in str(r["roles"]).split(",") if x], "sessions": int(r["sessions"]),
                }
                for r in data
            ],
        }
    )


class RoleIn(BaseModel):
    role: str
    grant: bool


@router.post("/{account_id}/roles")
async def change_role(account_id: uuid.UUID, body: RoleIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    if body.role not in ASSIGNABLE:
        return problem(422, "VALIDATION", "Rol noto'g'ri", "Bu rolni shu yerda berib yoki olib bo'lmaydi (tashkilot xodimlari taklifnoma orqali kiradi).")
    async with _engine(request).begin() as conn:
        roles = await _roles(conn, user_id)
        if not roles & ADMIN_ROLES:
            return _forbidden()
        if (await conn.execute(text("SELECT 1 FROM users WHERE id = :id AND deleted_at IS NULL"), {"id": account_id})).first() is None:
            return problem(404, "NOT_FOUND", "Hisob topilmadi", "Bunday foydalanuvchi yo'q.")
        if body.grant:
            await conn.execute(
                text("INSERT INTO user_roles (id, user_id, role, granted_by) SELECT :id, :u, CAST(:r AS role_code), :by WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = :u AND role = CAST(:r AS role_code))"),
                {"id": new_id(), "u": account_id, "r": body.role, "by": user_id},
            )
        else:
            if body.role == "admin":
                if account_id == user_id:
                    return problem(409, "SELF_LOCKOUT", "O'zingizdan olib bo'lmaydi", "O'z administrator rolingizni boshqa administrator olib tashlashi kerak.")
                others = (await conn.execute(text("SELECT count(*) FROM user_roles ur JOIN users u ON u.id = ur.user_id WHERE ur.role = 'admin' AND u.is_active AND ur.user_id <> :id"), {"id": account_id})).scalar_one()
                if int(others) == 0:
                    return problem(409, "LAST_ADMIN", "Oxirgi administrator", "Kamida bitta faol administrator qolishi kerak.")
            await conn.execute(text("DELETE FROM user_roles WHERE user_id = :u AND role = CAST(:r AS role_code)"), {"u": account_id, "r": body.role})
        await audit(conn, user_id, roles, "ROLE_GRANTED" if body.grant else "ROLE_REVOKED", "USER", account_id, {"role": body.role})
    return JSONResponse({"status": "saved"})


class ActiveIn(BaseModel):
    active: bool
    reason: str | None = Field(default=None, max_length=300)


@router.post("/{account_id}/active")
async def set_active(account_id: uuid.UUID, body: ActiveIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    reason = (body.reason or "").strip()
    async with _engine(request).begin() as conn:
        roles = await _roles(conn, user_id)
        if not roles & ADMIN_ROLES:
            return _forbidden()
        if not body.active:
            if account_id == user_id:
                return problem(409, "SELF_LOCKOUT", "O'zingizni to'xtatib bo'lmaydi", "Boshqa administrator buni qilishi kerak.")
            if len(reason) < 3:
                return problem(422, "REASON_REQUIRED", "Sabab kerak", "To'xtatish sababini yozing (kamida 3 belgi).")
        done = await conn.execute(text("UPDATE users SET is_active = :a, updated_at = now() WHERE id = :id AND deleted_at IS NULL RETURNING id"), {"a": body.active, "id": account_id})
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Hisob topilmadi", "Bunday foydalanuvchi yo'q.")
        if not body.active:
            await conn.execute(text("UPDATE sessions SET revoked_at = now() WHERE user_id = :id AND revoked_at IS NULL"), {"id": account_id})
        await audit(conn, user_id, roles, "USER_UNBLOCKED" if body.active else "USER_BLOCKED", "USER", account_id, {"reason": reason} if reason else {})
    return JSONResponse({"active": body.active})


@router.post("/{account_id}/sessions/end")
async def end_sessions(account_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        roles = await _roles(conn, user_id)
        if not roles & ADMIN_ROLES:
            return _forbidden()
        done = await conn.execute(text("UPDATE sessions SET revoked_at = now() WHERE user_id = :id AND revoked_at IS NULL RETURNING id"), {"id": account_id})
        count = len(done.all())
        await audit(conn, user_id, roles, "SESSIONS_ENDED", "USER", account_id, {"count": count})
    return JSONResponse({"ended": count})


@router.get("/health")
async def health(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & ADMIN_ROLES:
            return _forbidden()
        row = (
            await conn.execute(
                text(
                    """
                    SELECT (SELECT count(*) FROM users WHERE deleted_at IS NULL) AS users,
                           (SELECT count(*) FROM users WHERE deleted_at IS NULL AND NOT is_active) AS blocked,
                           (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days') AS new_week,
                           (SELECT count(*) FROM users WHERE last_login_at > now() - interval '24 hours') AS active_day,
                           (SELECT count(*) FROM sessions WHERE revoked_at IS NULL AND expires_at > now()) AS sessions,
                           (SELECT count(*) FROM invitations WHERE status = 'PENDING' AND expires_at > now()) AS invites,
                           (SELECT count(*) FROM employers WHERE verified_at IS NULL) AS firms,
                           (SELECT count(*) FROM portfolio_items WHERE confirmed_by IS NULL AND rejected_at IS NULL) AS portfolio,
                           (SELECT count(*) FROM partner_requests WHERE status = 'NEW') AS partner_requests,
                           (SELECT count(*) FROM certificates WHERE status::text = 'PENDING_APPROVAL') AS certificates,
                           (SELECT count(*) FROM audit_log WHERE created_at > now() - interval '24 hours') AS audit_day,
                           pg_database_size(current_database()) AS db_bytes
                    """
                )
            )
        ).mappings().one()
        roles = await conn.execute(text("SELECT role::text AS role, count(*) AS n FROM user_roles GROUP BY 1 ORDER BY 2 DESC"))
        by_role = [{"role": r["role"], "n": int(r["n"])} for r in roles.mappings()]
    data: dict[str, Any] = {k: int(v) for k, v in dict(row).items()}
    data["db_mb"] = round(data.pop("db_bytes") / 1_048_576)
    return JSONResponse({"stats": data, "by_role": by_role})
