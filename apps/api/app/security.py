import hashlib
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import get_settings


def new_id() -> uuid.UUID:
    return uuid.uuid4()


def hash_secret(value: str) -> bytes:
    return hashlib.sha256(value.encode()).digest()


def issue_access_token(user_id: uuid.UUID, roles: list[str]) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "roles": roles,
        "exp": now + timedelta(minutes=15),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    return token if isinstance(token, str) else token.decode()


def read_access_token(token: str) -> dict[str, Any] | None:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    if not isinstance(payload, dict):
        return None
    return payload


def bearer_from_request(request: Request) -> str | None:
    header = request.headers.get("authorization")
    if header and header.lower().startswith("bearer "):
        return header[7:].strip()
    cookie = request.cookies.get("ub_access")
    return cookie or None


def problem(status: int, code: str, title: str, detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={
            "type": f"https://uychibinokor.uz/errors/{code.lower().replace('_', '-')}",
            "title": title,
            "status": status,
            "code": code,
            "detail": detail,
        },
    )
