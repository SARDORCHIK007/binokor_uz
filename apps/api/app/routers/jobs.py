import uuid
from typing import Literal

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.security import bearer_from_request, new_id, problem, read_access_token

RequestStatus = Literal[
    "NEW",
    "IN_REVIEW",
    "VIA_AGENCY",
    "SHORTLIST_SENT",
    "EMPLOYER_APPROVED",
    "CONTRACTING",
    "MATCHED",
    "CLOSED",
    "CANCELLED",
]


class TransitionBody(BaseModel):
    status: RequestStatus


class ReviewBody(BaseModel):
    quality: int = Field(ge=1, le=5)
    discipline: int = Field(ge=1, le=5)
    safety: int = Field(ge=1, le=5)
    communication: int = Field(ge=1, le=5)
    comment: str = ""

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
                SELECT p.id::text AS id, u.full_name, e.name AS employer, p.kind::text AS kind,
                       r.score_quality, r.score_discipline, r.score_safety, r.score_communication
                FROM placements p
                JOIN users u ON u.id = p.worker_user_id
                JOIN employers e ON e.id = p.employer_id
                LEFT JOIN reviews r ON r.placement_id = p.id
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
            "placements": [
                {
                    "id": item["id"],
                    "full_name": item["full_name"],
                    "employer": item["employer"],
                    "kind": item["kind"],
                    "review": None
                    if item["score_quality"] is None
                    else {
                        "quality": int(item["score_quality"]),
                        "discipline": int(item["score_discipline"]),
                        "safety": int(item["score_safety"]),
                        "communication": int(item["score_communication"]),
                    },
                }
                for item in placements.mappings()
            ],
        }
    )


@router.post("/requests/{request_id}/transition")
async def transition(request_id: uuid.UUID, body: TransitionBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.begin() as conn:
        if not await _allowed(conn, user_id):
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "So'rov holatini menejer o'zgartiradi.")
        updated = await conn.execute(
            text(
                """
                UPDATE demand_requests
                SET status = CAST(:status AS request_status),
                    first_response_at = coalesce(first_response_at, now())
                WHERE id = :id
                RETURNING id
                """
            ),
            {"id": request_id, "status": body.status},
        )
        if updated.first() is None:
            return problem(404, "NOT_FOUND", "Topilmadi", "So'rov yo'q.")
    return JSONResponse({"status": body.status})


@router.post("/placements/{placement_id}/review")
async def review(placement_id: uuid.UUID, body: ReviewBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.begin() as conn:
        if not await _allowed(conn, user_id):
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bahoni menejer yozadi.")
        await conn.execute(
            text(
                """
                INSERT INTO reviews (
                  id, placement_id, score_quality, score_discipline, score_safety,
                  score_communication, comment, author_id
                )
                VALUES (
                  :id, :placement_id, :quality, :discipline, :safety, :communication, :comment, :user_id
                )
                ON CONFLICT (placement_id) DO UPDATE SET
                  score_quality = EXCLUDED.score_quality,
                  score_discipline = EXCLUDED.score_discipline,
                  score_safety = EXCLUDED.score_safety,
                  score_communication = EXCLUDED.score_communication,
                  comment = EXCLUDED.comment,
                  author_id = EXCLUDED.author_id
                """
            ),
            {
                "id": new_id(),
                "placement_id": placement_id,
                "quality": body.quality,
                "discipline": body.discipline,
                "safety": body.safety,
                "communication": body.communication,
                "comment": body.comment,
                "user_id": user_id,
            },
        )
    return JSONResponse({"saved": True})
