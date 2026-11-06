from urllib.parse import urlparse

from arq.connections import RedisSettings

from app.core.config import get_settings


async def ping(ctx: dict[str, object]) -> str:
    del ctx
    return "ok"


def redis_settings() -> RedisSettings:
    parsed = urlparse(get_settings().redis_url)
    database = int((parsed.path or "/0").lstrip("/") or "0")
    return RedisSettings(
        host=parsed.hostname or "redis",
        port=parsed.port or 6379,
        database=database,
        password=parsed.password,
    )


class WorkerSettings:
    functions = [ping]
    redis_settings = redis_settings()
