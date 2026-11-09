"""Small Redis fixed-window rate limiter (NFR-SEC rate limits).

Keys are per client IP (taken from nginx's X-Forwarded-For) or per user. If Redis is down
the request is allowed: availability over strictness for this layer, the OTP table keeps its
own per-phone limits in the database.
"""

from fastapi import Request
from fastapi.responses import JSONResponse

from app.security import problem


def client_ip(request: Request) -> str:
    """The address nginx saw. It appends it last to X-Forwarded-For; earlier entries are
    client-supplied and must not be trusted (they would let anyone dodge the limit)."""
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


async def too_many(request: Request, bucket: str, key: str, limit: int, window_seconds: int) -> JSONResponse | None:
    """Return a 429 problem response when `key` used `bucket` more than `limit` times."""
    redis = getattr(request.app.state, "redis", None)
    if redis is None:
        return None
    name = f"rl:{bucket}:{key}"
    try:
        count = int(await redis.incr(name))
        if count == 1:
            await redis.expire(name, window_seconds)
    except Exception:  # noqa: BLE001 - never fail a request because the limiter is down
        return None
    if count > limit:
        minutes = max(1, window_seconds // 60)
        return problem(
            429,
            "RATE_LIMITED",
            "Juda ko'p so'rov",
            f"Biroz kuting va qayta urinib ko'ring ({minutes} daqiqa).",
        )
    return None
