import uuid

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.security import bearer_from_request, problem, read_access_token

router = APIRouter(prefix="/api/v1/curator", tags=["curator"])


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


@router.get("/group")
async def group(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        owned = await conn.execute(
            text("SELECT 1 FROM user_roles WHERE user_id = :id AND role = 'curator'"),
            {"id": user_id},
        )
        if owned.first() is None:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Kurator kabineti uchun.")
        rows = await conn.execute(
            text(
                """
                SELECT u.full_name,
                       count(p.word_id) FILTER (WHERE p.box = 5) AS learned,
                       max(p.last_answer_at) AS last_answer_at
                FROM curator_members m
                JOIN curator_groups g ON g.id = m.curator_group_id
                JOIN users u ON u.id = m.student_user_id
                LEFT JOIN vocab_progress p ON p.user_id = u.id
                WHERE g.curator_user_id = :id
                GROUP BY u.id
                ORDER BY learned DESC, u.full_name
                """
            ),
            {"id": user_id},
        )
    return JSONResponse(
        [
            {
                "name": item["full_name"],
                "learned": int(item["learned"]),
                "total": 1000,
                "last_answer_at": None if item["last_answer_at"] is None else item["last_answer_at"].isoformat(),
            }
            for item in rows.mappings()
        ]
    )
