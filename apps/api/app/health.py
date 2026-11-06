"""GET /health checks. See docs/05_API.md section 3.0."""

from collections.abc import Mapping
from typing import Literal

import httpx
import structlog
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

log = structlog.get_logger()

CheckValue = Literal["ok", "error"]
Overall = Literal["ok", "degraded"]


def overall(checks: Mapping[str, str]) -> tuple[Overall, int]:
    if checks and all(value == "ok" for value in checks.values()):
        return "ok", 200
    return "degraded", 503


async def probe_db(engine: AsyncEngine) -> CheckValue:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001
        log.warning("health_check_failed", check="db", error_type=type(exc).__name__)
        return "error"
    return "ok"


async def probe_redis(client: Redis) -> CheckValue:
    try:
        pong = await client.ping()
    except Exception as exc:  # noqa: BLE001
        log.warning("health_check_failed", check="redis", error_type=type(exc).__name__)
        return "error"
    if pong is True:
        return "ok"
    return "error"


async def probe_minio(endpoint: str) -> CheckValue:
    url = endpoint.rstrip("/") + "/minio/health/live"
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(url)
    except Exception as exc:  # noqa: BLE001
        log.warning("health_check_failed", check="minio", error_type=type(exc).__name__)
        return "error"
    if response.status_code == 200:
        return "ok"
    log.warning("health_check_failed", check="minio", status_code=response.status_code)
    return "error"
