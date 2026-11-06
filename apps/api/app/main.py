import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.core.config import get_settings
from app.health import overall, probe_db, probe_minio, probe_redis
from app.routers.admin_edu import router as admin_edu_router
from app.routers.applications import router as applications_router
from app.routers.auth import router as auth_router
from app.routers.cabinet import router as cabinet_router
from app.routers.public import router as public_router
from app.seed import seed_login_users
from app.seed_education import seed_education
from app.seed_portal import seed_portal


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    redis = Redis.from_url(settings.redis_url)
    app.state.engine = engine
    app.state.redis = redis
    app.state.minio_endpoint = settings.minio_endpoint
    async with engine.begin() as conn:
        await seed_login_users(conn)
        await seed_portal(conn)
        await seed_education(conn)
    try:
        yield
    finally:
        await redis.aclose()
        await engine.dispose()


app = FastAPI(title="UYCHI BINOKOR API", lifespan=lifespan)
app.include_router(auth_router)
app.include_router(applications_router)
app.include_router(admin_edu_router)
app.include_router(cabinet_router)
app.include_router(public_router)


@app.middleware("http")
async def request_id(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    incoming = request.headers.get("x-request-id")
    request_id_value = incoming if incoming else uuid.uuid4().hex
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id_value
    return response


@app.get("/health")
async def health(request: Request) -> JSONResponse:
    engine: AsyncEngine = request.app.state.engine
    redis: Redis = request.app.state.redis
    endpoint: str = request.app.state.minio_endpoint
    checks = {
        "db": await probe_db(engine),
        "redis": await probe_redis(redis),
        "minio": await probe_minio(endpoint),
    }
    status, code = overall(checks)
    return JSONResponse(status_code=code, content={"status": status, "checks": checks})
