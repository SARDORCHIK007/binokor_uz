import os
import re
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import get_settings
from app.notify import notify_phone
from app.rules import PRIVILEGED_ROLES
from app.security import (
    bearer_from_request,
    hash_secret,
    issue_access_token,
    new_id,
    problem,
    read_access_token,
)
from app.totp import backup_codes, code_matches, current_code, new_secret

router = APIRouter(prefix="/api/v1", tags=["auth"])

PHONE = re.compile(r"^\+998[0-9]{9}$")


class OtpRequest(BaseModel):
    phone: str
    channel: str | None = None

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        digits = re.sub(r"\D", "", value)
        if digits.startswith("998") and len(digits) == 12:
            value = f"+{digits}"
        elif len(digits) == 9:
            value = f"+998{digits}"
        if PHONE.fullmatch(value) is None:
            raise ValueError("phone must be a Uzbekistan mobile number")
        return value


class TotpConfirm(OtpRequest):
    code: str


class BotLink(BaseModel):
    phone: str
    telegram_id: int

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        return OtpRequest.normalize_phone(value)


class OtpVerify(OtpRequest):
    code: str

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        digits = re.sub(r"\D", "", value)
        if len(digits) != 6:
            raise ValueError("code must be 6 digits")
        return digits


def _engine(request: Request) -> AsyncEngine:
    engine: AsyncEngine = request.app.state.engine
    return engine


@router.post("/auth/otp/request")
async def request_otp(body: OtpRequest, request: Request) -> JSONResponse:
    engine = _engine(request)
    now = datetime.now(UTC)
    async with engine.begin() as conn:
        recent = await conn.execute(
            text(
                """
                SELECT count(*) FROM otp_codes
                WHERE phone = :phone AND created_at > :since
                """
            ),
            {"phone": body.phone, "since": now - timedelta(minutes=10)},
        )
        if int(recent.scalar_one()) >= 3:
            return problem(
                429,
                "OTP_TOO_MANY",
                "Juda ko'p so'rov",
                "10 daqiqada 3 tadan ko'p kod so'ralmaydi.",
            )
        code = f"{secrets.randbelow(1_000_000):06d}"
        await conn.execute(
            text(
                """
                INSERT INTO otp_codes (id, phone, code_hash, channel, expires_at)
                VALUES (:id, :phone, :code_hash, 'telegram', :expires_at)
                """
            ),
            {
                "id": new_id(),
                "phone": body.phone,
                "code_hash": hash_secret(f"{body.phone}:{code}"),
                "expires_at": now + timedelta(minutes=5),
            },
        )
    sent = False
    async with engine.connect() as conn:
        sent = await notify_phone(conn, body.phone, f"UYCHI BINOKOR kirish kodi: {code}")
    payload: dict[str, object] = {"delivery": "telegram" if sent else "screen", "expires_in": 300}
    if get_settings().app_env == "local":
        payload["dev_code"] = code
    return JSONResponse(payload)


@router.post("/auth/otp/verify")
async def verify_otp(body: OtpVerify, request: Request) -> JSONResponse:
    engine = _engine(request)
    now = datetime.now(UTC)
    async with engine.begin() as conn:
        row = await conn.execute(
            text(
                """
                SELECT id, code_hash, attempts, expires_at
                FROM otp_codes
                WHERE phone = :phone AND used_at IS NULL
                ORDER BY created_at DESC
                LIMIT 1
                """
            ),
            {"phone": body.phone},
        )
        found = row.mappings().first()
        if found is None or found["expires_at"] < now:
            return problem(401, "OTP_EXPIRED", "Kod eskirgan", "Yangi kod so'rang.")
        if int(found["attempts"]) >= 5:
            return problem(429, "OTP_TOO_MANY", "Urinishlar tugadi", "Yangi kod so'rang.")
        if bytes(found["code_hash"]) != hash_secret(f"{body.phone}:{body.code}"):
            await conn.execute(
                text("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = :id"),
                {"id": found["id"]},
            )
            return problem(401, "OTP_INVALID", "Kod noto'g'ri", "Kodni qayta tekshiring.")
        await conn.execute(
            text("UPDATE otp_codes SET used_at = :now WHERE id = :id"),
            {"id": found["id"], "now": now},
        )
        user = await conn.execute(
            text("SELECT id, full_name FROM users WHERE phone = :phone AND deleted_at IS NULL"),
            {"phone": body.phone},
        )
        account = user.mappings().first()
        if account is None:
            user_id = new_id()
            await conn.execute(
                text(
                    """
                    INSERT INTO users (id, phone, full_name, locale, last_login_at)
                    VALUES (:id, :phone, 'Yangi foydalanuvchi', 'uz-Latn', :now)
                    """
                ),
                {"id": user_id, "phone": body.phone, "now": now},
            )
            await conn.execute(
                text(
                    """
                    INSERT INTO user_roles (id, user_id, role)
                    VALUES (:id, :user_id, 'student')
                    """
                ),
                {"id": new_id(), "user_id": user_id},
            )
            full_name = "Yangi foydalanuvchi"
        else:
            user_id = account["id"]
            full_name = str(account["full_name"])
            await conn.execute(
                text("UPDATE users SET last_login_at = :now WHERE id = :id"),
                {"id": user_id, "now": now},
            )
        roles_result = await conn.execute(
            text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"),
            {"id": user_id},
        )
        roles = [str(item["role"]) for item in roles_result.mappings()]
        if set(roles) & PRIVILEGED_ROLES:
            secret_row = await conn.execute(
                text("SELECT totp_secret_enc FROM users WHERE id = :id"),
                {"id": user_id},
            )
            secret = secret_row.scalar()
            enrolled = secret is not None
            if not enrolled:
                secret = new_secret()
                await conn.execute(
                    text("UPDATE users SET totp_secret_enc = :secret WHERE id = :id"),
                    {"id": user_id, "secret": secret},
                )
            pending_secret = bytes(secret)
            pending_user = str(user_id)
            pending_name = full_name
            pending_roles = roles
            fresh = not enrolled
        else:
            pending_secret = None
            refresh = secrets.token_urlsafe(32)
            await conn.execute(
                text(
                    """
                    INSERT INTO sessions (id, user_id, refresh_hash, expires_at)
                    VALUES (:id, :user_id, :refresh_hash, :expires_at)
                    """
                ),
                {
                    "id": new_id(),
                    "user_id": user_id,
                    "refresh_hash": hash_secret(refresh),
                    "expires_at": now + timedelta(days=30),
                },
            )
            subject = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
            issued = issue_access_token(subject, roles)
    if pending_secret is not None:
        redis = request.app.state.redis
        await redis.set(f"otp-ok:{body.phone}", pending_user, ex=300)
        if fresh:
            codes = backup_codes()
            await redis.set(
                f"totp-backup:{pending_user}",
                ",".join(hash_secret(item).hex() for item in codes),
            )
        else:
            codes = []
        body_out: dict[str, object] = {
            "requires_2fa": True,
            "enrolled": not fresh,
            "user": {"id": pending_user, "full_name": pending_name, "roles": pending_roles},
        }
        if fresh:
            body_out["backup_codes"] = codes
        if get_settings().app_env == "local":
            body_out["dev_totp"] = current_code(pending_secret)
        return JSONResponse(body_out)
    response = JSONResponse(
        {
            "access_token": issued,
            "user": {"id": str(user_id), "full_name": full_name, "roles": roles},
            "requires_2fa": False,
        }
    )
    response.set_cookie(
        "ub_access", issued, httponly=True, samesite="lax", max_age=15 * 60, path="/"
    )
    response.set_cookie(
        "ub_refresh",
        refresh,
        httponly=True,
        samesite="lax",
        max_age=30 * 24 * 3600,
        path="/",
    )
    return response


@router.post("/auth/totp")
async def confirm_totp(body: TotpConfirm, request: Request) -> JSONResponse:
    redis = request.app.state.redis
    user_raw = await redis.get(f"otp-ok:{body.phone}")
    if user_raw is None:
        return problem(401, "OTP_EXPIRED", "Sessiya eskirgan", "Kodni qaytadan so'rang.")
    user_id = uuid.UUID(user_raw.decode() if isinstance(user_raw, bytes) else str(user_raw))
    engine = _engine(request)
    now = datetime.now(UTC)
    async with engine.begin() as conn:
        row = await conn.execute(
            text("SELECT full_name, totp_secret_enc FROM users WHERE id = :id"),
            {"id": user_id},
        )
        account = row.mappings().first()
        if account is None or account["totp_secret_enc"] is None:
            return problem(401, "OTP_INVALID", "Kod noto'g'ri", "Authenticator kodini tekshiring.")
        secret = bytes(account["totp_secret_enc"])
        matched = code_matches(secret, body.code)
        if not matched:
            stored = await redis.get(f"totp-backup:{user_id}")
            raw = stored.decode() if isinstance(stored, bytes) else (stored or "")
            hashes = [item for item in str(raw).split(",") if item]
            digest = hash_secret(body.code).hex()
            if digest not in hashes:
                return problem(401, "OTP_INVALID", "Kod noto'g'ri", "Authenticator kodini tekshiring.")
            hashes.remove(digest)
            await redis.set(f"totp-backup:{user_id}", ",".join(hashes))
        roles_result = await conn.execute(
            text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"),
            {"id": user_id},
        )
        roles = [str(item["role"]) for item in roles_result.mappings()]
        refresh = secrets.token_urlsafe(32)
        await conn.execute(
            text(
                """
                INSERT INTO sessions (id, user_id, refresh_hash, expires_at)
                VALUES (:id, :user_id, :refresh_hash, :expires_at)
                """
            ),
            {
                "id": new_id(),
                "user_id": user_id,
                "refresh_hash": hash_secret(refresh),
                "expires_at": now + timedelta(days=30),
            },
        )
        full_name = str(account["full_name"])
    await redis.delete(f"otp-ok:{body.phone}")
    token = issue_access_token(user_id, roles)
    response = JSONResponse(
        {
            "access_token": token,
            "requires_2fa": False,
            "user": {"id": str(user_id), "full_name": full_name, "roles": roles},
        }
    )
    response.set_cookie("ub_access", token, httponly=True, samesite="lax", max_age=15 * 60, path="/")
    response.set_cookie(
        "ub_refresh", refresh, httponly=True, samesite="lax", max_age=30 * 24 * 3600, path="/"
    )
    return response


@router.post("/bot/link")
async def bot_link(body: BotLink, request: Request) -> JSONResponse:
    token = os.environ.get("BOT_TOKEN", "").strip()
    if not token or request.headers.get("x-bot-token") != token:
        return problem(401, "UNAUTHORIZED", "Ruxsat yo'q", "Bot token mos kelmadi.")
    engine = _engine(request)
    async with engine.begin() as conn:
        updated = await conn.execute(
            text("UPDATE users SET telegram_id = :telegram_id WHERE phone = :phone RETURNING id"),
            {"telegram_id": body.telegram_id, "phone": body.phone},
        )
        if updated.first() is None:
            return problem(404, "NOT_FOUND", "Raqam topilmadi", "Avval saytda shu telefon bilan kiring.")
    return JSONResponse({"linked": True})


@router.post("/auth/logout")
async def logout() -> JSONResponse:
    response = JSONResponse({"status": "ok"})
    response.delete_cookie("ub_access", path="/")
    response.delete_cookie("ub_refresh", path="/")
    return response


@router.get("/me")
async def me(request: Request) -> JSONResponse:
    token = bearer_from_request(request)
    if token is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    payload = read_access_token(token)
    if payload is None or "sub" not in payload:
        return problem(401, "UNAUTHORIZED", "Sessiya eskirgan", "Qaytadan kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        user = await conn.execute(
            text(
                """
                SELECT id, full_name, phone
                FROM users
                WHERE id = :id AND deleted_at IS NULL AND is_active
                """
            ),
            {"id": uuid.UUID(str(payload["sub"]))},
        )
        account = user.mappings().first()
        if account is None:
            return problem(401, "UNAUTHORIZED", "Foydalanuvchi topilmadi", "Qaytadan kiring.")
        roles_result = await conn.execute(
            text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"),
            {"id": account["id"]},
        )
        roles = [str(item["role"]) for item in roles_result.mappings()]
    return JSONResponse(
        {
            "id": str(account["id"]),
            "full_name": account["full_name"],
            "phone": account["phone"],
            "roles": roles,
        }
    )
