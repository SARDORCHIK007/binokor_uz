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
from app.routers.certificates import router as certificates_router
from app.routers.jobs import router as jobs_router
from app.routers.learning import router as learning_router
from app.routers.public import router as public_router
from app.routers.vocab import router as vocab_router
from app.seed import seed_login_users
from app.seed_certificates import seed_certificates
from app.seed_education import seed_education
from app.seed_learning import seed_learning
from app.seed_market import seed_market
from app.seed_portal import seed_portal
from app.seed_vocab import seed_vocab
from app.seed_workers import seed_workers


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
        await seed_learning(conn)
        await seed_certificates(conn)
        await seed_workers(conn)
        await seed_vocab(conn)
        await seed_market(conn)
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
app.include_router(learning_router)
app.include_router(certificates_router)
app.include_router(public_router)
app.include_router(vocab_router)
app.include_router(jobs_router)


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
