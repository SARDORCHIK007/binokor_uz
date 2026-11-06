import uuid

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.security import bearer_from_request, problem, read_access_token

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


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


async def _allowed(conn: AsyncConnection, user_id: uuid.UUID) -> bool:
    rows = await conn.execute(
        text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"),
        {"id": user_id},
    )
    roles = {str(item["role"]) for item in rows.mappings()}
    return bool(roles.intersection({"admin", "placement_manager"}))


@router.get("/board")
async def board(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        if not await _allowed(conn, user_id):
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu doska joylashtirish uchun.")
        employers = await conn.execute(
            text("SELECT id::text AS id, name, kind::text AS kind, inn FROM employers ORDER BY name")
        )
        requests = await conn.execute(
            text(
                """
                SELECT r.id::text AS id, e.name AS employer, r.quantity, r.status::text AS status, r.as_brigade
                FROM demand_requests r
                JOIN employers e ON e.id = r.employer_id
                ORDER BY r.created_at
                """
            )
        )
        brigades = await conn.execute(
            text(
                """
                SELECT b.id::text AS id, b.name, b.status::text AS status,
                       count(m.worker_user_id) FILTER (WHERE m.left_at IS NULL) AS members
                FROM brigades b
                LEFT JOIN brigade_members m ON m.brigade_id = b.id
                GROUP BY b.id
                ORDER BY b.name
                """
            )
        )
        placements = await conn.execute(
            text(
                """
                SELECT p.id::text AS id, u.full_name, e.name AS employer, p.kind::text AS kind
                FROM placements p
                JOIN users u ON u.id = p.worker_user_id
                JOIN employers e ON e.id = p.employer_id
                ORDER BY u.full_name
                """
            )
        )
    return JSONResponse(
        {
            "employers": [dict(item) for item in employers.mappings()],
            "requests": [dict(item) for item in requests.mappings()],
            "brigades": [
                {**dict(item), "members": int(item["members"])} for item in brigades.mappings()
            ],
            "placements": [dict(item) for item in placements.mappings()],
        }
    )
