"""Account settings for every profile: name, e-mail, language, which notification groups to receive, signed-in devices,
Telegram and two-step status, consents, and a personal data export. The phone number is always shown masked.
"""

import json
import re
import uuid
from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.security import bearer_from_request, hash_secret, problem, read_access_token

router = APIRouter(prefix="/api/v1/me", tags=["settings"])

LOCALES = {"uz-Latn", "uz-Cyrl", "ru", "en"}
GROUPS = ("offers", "vacancies", "system")
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


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


def mask_phone(phone: str) -> str:
    return f"{phone[:7]}•••••{phone[-2:]}" if len(phone) >= 10 else "•••••"


def _notify_prefs(raw: Any) -> dict[str, bool]:
    stored = (raw or {}).get("notify", {}) if isinstance(raw, dict) else {}
    return {group: bool(stored.get(group, True)) for group in GROUPS}


@router.get("/settings")
async def get_settings(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        user = (
            await conn.execute(
                text(
                    """
                    SELECT full_name, phone, email::text AS email, locale, prefs, telegram_id IS NOT NULL AS telegram, totp_secret_enc IS NOT NULL AS two_factor,
                           created_at::date::text AS created, last_login_at::text AS last_login
                    FROM users WHERE id = :id AND deleted_at IS NULL
                    """
                ),
                {"id": user_id},
            )
        ).mappings().first()
        if user is None:
            return _unauth()
        roles = await conn.execute(text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"), {"id": user_id})
        consents = await conn.execute(
            text(
                """
                SELECT DISTINCT ON (kind) kind, version, granted, granted_at::date::text AS day
                FROM consents WHERE user_id = :id ORDER BY kind, granted_at DESC
                """
            ),
            {"id": user_id},
        )
        unread = (await conn.execute(text("SELECT count(*) FROM notifications WHERE user_id = :id AND read_at IS NULL"), {"id": user_id})).scalar_one()
        role_list = [str(r["role"]) for r in roles.mappings()]
    return JSONResponse(
        {
            "full_name": user["full_name"],
            "phone": mask_phone(str(user["phone"])),
            "email": user["email"] or "",
            "locale": user["locale"],
            "notify": _notify_prefs(user["prefs"]),
            "telegram_linked": bool(user["telegram"]),
            "two_factor": bool(user["two_factor"]),
            "roles": role_list,
            "created": user["created"],
            "last_login": None if user["last_login"] is None else str(user["last_login"])[:16],
            "consents": [{"kind": r["kind"], "version": r["version"], "granted": bool(r["granted"]), "day": r["day"]} for r in consents.mappings()],
            "unread": int(unread),
        }
    )


class SettingsIn(BaseModel):
    full_name: str = Field(min_length=3, max_length=200)
    email: str | None = Field(default=None, max_length=120)
    locale: str | None = None
    notify: dict[str, bool] | None = None


@router.put("/settings")
async def put_settings(body: SettingsIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    if body.locale is not None and body.locale not in LOCALES:
        return problem(422, "VALIDATION", "Til noto'g'ri", "Ro'yxatdagi tilni tanlang.")
    email = (body.email or "").strip()
    if email and not EMAIL.match(email):
        return problem(422, "VALIDATION", "Elektron pochta noto'g'ri", "Pochta manzilini tekshiring.")
    if body.notify is not None and not set(body.notify) <= set(GROUPS):
        return problem(422, "VALIDATION", "Xabarnoma guruhi noto'g'ri", "Faqat ro'yxatdagi guruhlarni o'zgartirish mumkin.")
    async with _engine(request).begin() as conn:
        current = (await conn.execute(text("SELECT prefs, locale FROM users WHERE id = :id AND deleted_at IS NULL"), {"id": user_id})).mappings().first()
        if current is None:
            return _unauth()
        prefs = dict(current["prefs"] or {})
        merged = _notify_prefs(prefs)
        if body.notify:
            merged.update(body.notify)
        prefs["notify"] = merged
        try:
            await conn.execute(
                text("UPDATE users SET full_name = :name, email = NULLIF(:email, ''), locale = :locale, prefs = CAST(:prefs AS jsonb), updated_at = now() WHERE id = :id"),
                {"name": body.full_name.strip(), "email": email, "locale": body.locale or current["locale"], "prefs": json.dumps(prefs), "id": user_id},
            )
        except Exception:  # noqa: BLE001 - a unique e-mail clash surfaces here
            return problem(409, "EMAIL_TAKEN", "Pochta band", "Bu elektron pochta boshqa hisobda ishlatilgan.")
    return JSONResponse({"status": "saved"})


# ----------------------------------------------------------------- devices


async def _current_session_id(conn: AsyncConnection, user_id: uuid.UUID, request: Request) -> uuid.UUID | None:
    refresh = request.cookies.get("ub_refresh")
    if not refresh:
        return None
    row = (await conn.execute(text("SELECT id FROM sessions WHERE user_id = :u AND refresh_hash = :h AND revoked_at IS NULL"), {"u": user_id, "h": hash_secret(refresh)})).first()
    return None if row is None else uuid.UUID(str(row[0]))


@router.get("/sessions")
async def sessions(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        current = await _current_session_id(conn, user_id, request)
        rows = await conn.execute(
            text("SELECT id, user_agent, created_at::text AS created, expires_at::text AS expires FROM sessions WHERE user_id = :u AND revoked_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 20"),
            {"u": user_id},
        )
        items = [{"id": str(r["id"]), "agent": (r["user_agent"] or "")[:120], "created": r["created"][:16], "expires": r["expires"][:10], "current": r["id"] == current} for r in rows.mappings()]
    return JSONResponse(items)


@router.delete("/sessions/{session_id}")
async def end_session(session_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        done = await conn.execute(text("UPDATE sessions SET revoked_at = now() WHERE id = :id AND user_id = :u AND revoked_at IS NULL RETURNING id"), {"id": session_id, "u": user_id})
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Sessiya topilmadi", "Bunday sessiya yo'q yoki allaqachon tugagan.")
    return JSONResponse({"status": "ended"})


@router.post("/sessions/revoke-others")
async def end_other_sessions(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        current = await _current_session_id(conn, user_id, request)
        done = await conn.execute(
            text("UPDATE sessions SET revoked_at = now() WHERE user_id = :u AND revoked_at IS NULL AND (CAST(:c AS uuid) IS NULL OR id <> :c) RETURNING id"),
            {"u": user_id, "c": current},
        )
        count = len(done.all())
    return JSONResponse({"ended": count})


# ----------------------------------------------------------------- personal data export


def _plain(value: Any) -> Any:
    if isinstance(value, (datetime, date, uuid.UUID)):
        return str(value)
    if isinstance(value, (bytes, memoryview)):
        return None
    return value


@router.get("/export", response_model=None)
async def export_data(request: Request) -> Response:
    """Everything the platform keeps about the person, as JSON. Identity numbers and documents are never included."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        async def rows(sql: str) -> list[dict[str, Any]]:
            result = await conn.execute(text(sql), {"u": user_id})
            return [{k: _plain(v) for k, v in dict(r).items()} for r in result.mappings()]

        user = await rows("SELECT id, full_name, email::text AS email, locale, created_at, last_login_at FROM users WHERE id = :u")
        if not user:
            return _unauth()
        data = {
            "exported_at": datetime.now().isoformat(timespec="seconds"),
            "user": user[0],
            "roles": await rows("SELECT role::text AS role FROM user_roles WHERE user_id = :u"),
            "person": await rows("SELECT last_name, first_name, birth_date, university, graduation_year, education_level FROM persons WHERE user_id = :u"),
            "applications": await rows("SELECT a.status::text AS status, a.type::text AS type, a.source, a.created_at FROM applications a JOIN persons p ON p.id = a.person_id WHERE p.user_id = :u ORDER BY a.created_at"),
            "enrollments": await rows("SELECT e.status::text AS status, e.enrolled_at, e.completed_at, g.code AS group_code FROM enrollments e JOIN groups g ON g.id = e.group_id WHERE e.student_user_id = :u"),
            "attendance": await rows("SELECT a.date, a.status::text AS status, a.site_hours FROM attendance a JOIN enrollments e ON e.id = a.enrollment_id WHERE e.student_user_id = :u ORDER BY a.date"),
            "grades": await rows("SELECT m.title->>'uz-Latn' AS module, s.score, s.passed, s.assessed_at FROM assessments s JOIN enrollments e ON e.id = s.enrollment_id JOIN modules m ON m.id = s.module_id WHERE e.student_user_id = :u"),
            "certificates": await rows("SELECT c.number, c.status::text AS status, c.issued_at FROM certificates c JOIN persons p ON p.id = c.person_id WHERE p.user_id = :u AND c.number IS NOT NULL"),
            "consents": await rows("SELECT kind, version, granted, granted_at FROM consents WHERE user_id = :u ORDER BY granted_at"),
            "notifications": await rows("SELECT kind, status, created_at, read_at FROM notifications WHERE user_id = :u ORDER BY created_at DESC LIMIT 500"),
        }
    return Response(
        content=json.dumps(data, ensure_ascii=False, indent=2, default=str),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="mening-malumotlarim.json"', "Cache-Control": "private, no-store"},
    )
