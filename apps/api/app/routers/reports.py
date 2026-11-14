import uuid

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.doc_i18n import current_lang, pick
from app.security import bearer_from_request, problem, read_access_token

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


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


def _label(value: object, lang: str = "uz-Latn") -> str:
    return pick(value, lang)


async def _allowed(conn: AsyncConnection, user_id: uuid.UUID) -> bool:
    rows = await conn.execute(
        text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"),
        {"id": user_id},
    )
    roles = {str(item["role"]) for item in rows.mappings()}
    return bool(roles.intersection({"admin", "partner_viewer", "education_lead", "district_official"}))


@router.get("/summary")
async def summary(request: Request) -> JSONResponse:
    code = current_lang()
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        if not await _allowed(conn, user_id):
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Hisobot hokimlik va admin uchun.")
        totals = await conn.execute(
            text(
                """
                SELECT
                  (SELECT count(*) FROM applications WHERE status <> 'DRAFT') AS applications,
                  (SELECT count(*) FROM enrollments WHERE status = 'ACTIVE') AS enrolled,
                  (SELECT count(*) FROM certificates WHERE status = 'ISSUED') AS certified,
                  (SELECT count(*) FROM placements) AS employed
                """
            )
        )
        by_trade = await conn.execute(
            text(
                """
                SELECT t.name,
                       count(DISTINCT e.id) FILTER (WHERE e.status = 'ACTIVE') AS enrolled,
                       count(DISTINCT c.id) FILTER (WHERE c.status = 'ISSUED') AS certified
                FROM trades t
                LEFT JOIN courses k ON k.trade_id = t.id
                LEFT JOIN groups g ON g.course_id = k.id
                LEFT JOIN enrollments e ON e.group_id = g.id
                LEFT JOIN certificates c ON c.trade_id = t.id
                GROUP BY t.id
                ORDER BY t.name->>'uz-Latn'
                """
            )
        )
    row = totals.mappings().one()
    return JSONResponse(
        {
            "kpi": {
                "applications": int(row["applications"]),
                "enrolled": int(row["enrolled"]),
                "certified": int(row["certified"]),
                "employed": int(row["employed"]),
            },
            "trades": [
                {
                    "trade": _label(item["name"], code),
                    "enrolled": int(item["enrolled"]),
                    "certified": int(item["certified"]),
                }
                for item in by_trade.mappings()
            ],
        }
    )
