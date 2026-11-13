import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.core.config import get_settings
from app.health import overall, probe_db, probe_minio, probe_redis
from app.routers.admin_edu import router as admin_edu_router
from app.routers.applications import router as applications_router
from app.routers.auth import router as auth_router
from app.routers.cabinet import router as cabinet_router
from app.routers.cabinet_extra import router as cabinet_extra_router
from app.routers.certificates import router as certificates_router
from app.routers.classroom import router as classroom_router
from app.routers.curator import router as curator_router
from app.routers.district import router as district_router
from app.routers.employers import router as employers_router
from app.routers.employment import router as employment_router
from app.routers.exams import router as exams_router
from app.routers.graduates import router as graduates_router
from app.routers.jobs import router as jobs_router
from app.routers.learning import router as learning_router
from app.routers.market import router as market_router
from app.routers.migration import router as migration_router
from app.routers.monitoring import router as monitoring_router
from app.routers.onboarding import router as onboarding_router
from app.routers.panels import router as panels_router
from app.routers.partner_profile import router as partner_profile_router
from app.routers.passport import router as passport_router
from app.routers.payments import router as payments_router
from app.routers.people import router as people_router
from app.routers.portfolio import router as portfolio_router
from app.routers.producers import router as producers_router
from app.routers.public import router as public_router
from app.routers.public import set_public_locale
from app.routers.reports import router as reports_router
from app.routers.settings import router as settings_router
from app.routers.vacancies import router as vacancies_router
from app.routers.vocab import router as vocab_router
from app.seed import seed_login_users
from app.seed_certificates import seed_certificates
from app.seed_education import seed_education
from app.seed_exam import seed_exam
from app.seed_followup import seed_followup
from app.seed_learning import seed_learning
from app.seed_market import seed_market
from app.seed_marketplace import seed_marketplace, seed_partner_info
from app.seed_portal import seed_portal
from app.seed_vocab import seed_vocab
from app.seed_workers import seed_workers

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    redis = Redis.from_url(settings.redis_url)
    app.state.engine = engine
    app.state.redis = redis
    app.state.minio_endpoint = settings.minio_endpoint
    if settings.app_env == "production" and not settings.demo_mode:
        log.warning("demo_seed_skipped", reason="production without DEMO_MODE")
    elif not settings.demo_data and await _has_users(engine):
        log.info("demo_seed_skipped", reason="DEMO_DATA=false and the database already has users")
    else:
        await _seed(engine)
    try:
        yield
    finally:
        await redis.aclose()
        await engine.dispose()


async def _has_users(engine: AsyncEngine) -> bool:
    async with engine.connect() as conn:
        return bool((await conn.execute(text("SELECT EXISTS (SELECT 1 FROM users)"))).scalar())


async def _seed(engine: AsyncEngine) -> None:
    """Demo and reference data for local, CI and demo installs (never real users)."""
    async with engine.begin() as conn:
        await seed_login_users(conn)
        await seed_portal(conn)
        await seed_education(conn)
        await seed_learning(conn)
        await seed_certificates(conn)
        await seed_workers(conn)
        await seed_vocab(conn)
        await seed_market(conn)
        await seed_exam(conn)
        await seed_followup(conn)
        await seed_marketplace(conn)
        await seed_partner_info(conn)


app = FastAPI(title="UYCHI BINOKOR API", lifespan=lifespan)
app.include_router(auth_router)
app.include_router(applications_router)
app.include_router(admin_edu_router)
app.include_router(cabinet_router)
app.include_router(learning_router)
app.include_router(exams_router)
app.include_router(curator_router)
app.include_router(certificates_router)
app.include_router(public_router)
app.include_router(portfolio_router)
app.include_router(passport_router)
app.include_router(market_router)
app.include_router(reports_router)
app.include_router(vocab_router)
app.include_router(jobs_router)
app.include_router(employers_router)
app.include_router(producers_router)
app.include_router(cabinet_extra_router)
app.include_router(onboarding_router)
app.include_router(monitoring_router)
app.include_router(partner_profile_router)
app.include_router(panels_router)
app.include_router(payments_router)
app.include_router(people_router)
app.include_router(classroom_router)
app.include_router(settings_router)
app.include_router(district_router)
app.include_router(graduates_router)
app.include_router(employment_router)
app.include_router(migration_router)
app.include_router(vacancies_router)


@app.middleware("http")
async def request_id(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    incoming = request.headers.get("x-request-id")
    request_id_value = incoming if incoming else uuid.uuid4().hex
    set_public_locale(request.headers.get("x-locale", "uz-Latn"))
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
