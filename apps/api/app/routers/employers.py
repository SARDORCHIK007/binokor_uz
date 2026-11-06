import json
import uuid

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/employers", tags=["employers"])


class RegisterBody(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    inn: str = Field(min_length=9, max_length=14)


class RequestBody(BaseModel):
    trade_code: str
    quantity: int = Field(ge=1, le=500)
    track: str = "DOMESTIC"
    as_brigade: bool = False
    agency_id: uuid.UUID | None = None


class CandidateBody(BaseModel):
    worker_user_id: uuid.UUID


class ReviewBody(BaseModel):
    quality: int = Field(ge=1, le=5)
    discipline: int = Field(ge=1, le=5)
    safety: int = Field(ge=1, le=5)
    communication: int = Field(ge=1, le=5)
    comment: str = ""


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


def _label(value: object) -> str:
    if isinstance(value, dict):
        return str(value.get("uz-Latn") or "")
    return ""


async def _employer_id(conn: AsyncConnection, user_id: uuid.UUID) -> uuid.UUID | None:
    row = await conn.execute(
        text(
            """
            SELECT employer_id FROM employer_members WHERE user_id = :id LIMIT 1
            """
        ),
        {"id": user_id},
    )
    found = row.scalar()
    return None if found is None else uuid.UUID(str(found))


@router.post("")
async def register(body: RegisterBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    employer_id = new_id()
    engine = _engine(request)
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                INSERT INTO employers (id, kind, name, country_code, inn)
                VALUES (:id, 'LOCAL', :name, 'UZ', :inn)
                """
            ),
            {"id": employer_id, "name": body.name, "inn": body.inn},
        )
        await conn.execute(
            text(
                """
                INSERT INTO employer_members (employer_id, user_id, is_owner)
                VALUES (:employer_id, :user_id, true)
                """
            ),
            {"employer_id": employer_id, "user_id": user_id},
        )
        await conn.execute(
            text(
                """
                INSERT INTO user_roles (id, user_id, role)
                SELECT :id, :user_id, 'employer_local'
                WHERE NOT EXISTS (
                  SELECT 1 FROM user_roles
                  WHERE user_id = :user_id AND role = 'employer_local'
                )
                """
            ),
            {"id": new_id(), "user_id": user_id},
        )
    return JSONResponse({"id": str(employer_id), "verified": False})


@router.get("/me")
async def mine(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        employer_id = await _employer_id(conn, user_id)
        if employer_id is None:
            return JSONResponse({"employer": None, "requests": []})
        employer = await conn.execute(
            text(
                """
                SELECT id::text AS id, name, inn, verified_at IS NOT NULL AS verified
                FROM employers WHERE id = :id
                """
            ),
            {"id": employer_id},
        )
        requests = await conn.execute(
            text(
                """
                SELECT id::text AS id, quantity, status::text AS status, track::text AS track
                FROM demand_requests WHERE employer_id = :id ORDER BY created_at DESC
                """
            ),
            {"id": employer_id},
        )
        placements = await conn.execute(
            text(
                """
                SELECT p.id::text AS id, u.full_name
                FROM placements p
                JOIN users u ON u.id = p.worker_user_id
                WHERE p.employer_id = :id
                ORDER BY p.start_date DESC
                """
            ),
            {"id": employer_id},
        )
    item = employer.mappings().one()
    return JSONResponse(
        {
            "employer": {
                "id": item["id"],
                "name": item["name"],
                "inn": item["inn"],
                "verified": bool(item["verified"]),
            },
            "requests": [dict(row) for row in requests.mappings()],
            "placements": [
                {"id": row["id"], "name": row["full_name"]} for row in placements.mappings()
            ],
        }
    )


@router.get("/workers")
async def workers(request: Request, q: str = "") -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        if await _employer_id(conn, user_id) is None:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Avval kompaniyani ro'yxatdan o'tkazing.")
        rows = await conn.execute(
            text(
                """
                SELECT u.id::text AS user_id, wp.slug,
                       CASE
                         WHEN coalesce((wp.visibility->>'full_name')::boolean, false) THEN u.full_name
                         ELSE split_part(btrim(u.full_name), ' ', 1)
                       END AS name,
                       t.name AS trade_name, wp.level::text AS level,
                       wp.availability::text AS availability, wp.rating_avg
                FROM worker_profiles wp
                JOIN users u ON u.id = wp.user_id
                LEFT JOIN trades t ON t.id = wp.primary_trade_id
                WHERE CAST(:q AS text) = '' OR u.full_name ILIKE :like
                ORDER BY u.full_name
                LIMIT 30
                """
            ),
            {"q": q, "like": f"%{q}%"},
        )
    payload = [
        {
            "user_id": item["user_id"],
            "slug": item["slug"],
            "name": item["name"],
            "trade": _label(item["trade_name"]),
            "level": item["level"],
            "availability": item["availability"],
            "rating": None if item["rating_avg"] is None else float(item["rating_avg"]),
        }
        for item in rows.mappings()
    ]
    encoded = json.dumps(payload)
    if "+998" in encoded:
        return problem(500, "PHONE_LEAK", "Xatolik", "Javobda telefon chiqib qoldi.")
    return JSONResponse(payload)


@router.post("/requests")
async def create_request(body: RequestBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.begin() as conn:
        employer = await conn.execute(
            text(
                """
                SELECT e.id, e.verified_at
                FROM employers e
                JOIN employer_members m ON m.employer_id = e.id
                WHERE m.user_id = :id
                """
            ),
            {"id": user_id},
        )
        found = employer.mappings().first()
        if found is None:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Kompaniya yo'q.")
        if found["verified_at"] is None:
            return problem(403, "NOT_VERIFIED", "Tekshiruv kutilmoqda", "Admin tasdig'idan keyin so'rov yuboriladi.")
        trade = await conn.execute(
            text("SELECT id FROM trades WHERE code = :code"),
            {"code": body.trade_code},
        )
        trade_id = trade.scalar()
        if trade_id is None:
            return problem(404, "NOT_FOUND", "Kasb yo'q", "Kasb kodi noto'g'ri.")
        status = "NEW"
        if body.track == "FOREIGN" and body.agency_id is not None:
            status = "VIA_AGENCY"
        if body.track == "FOREIGN" and body.agency_id is None:
            status = "NEW"
        request_id = new_id()
        await conn.execute(
            text(
                """
                INSERT INTO demand_requests (
                  id, employer_id, trade_id, quantity, as_brigade, track, status, agency_id, location
                )
                VALUES (
                  :id, :employer_id, :trade_id, :quantity, :as_brigade,
                  CAST(:track AS track_code), CAST(:status AS request_status), :agency_id, 'Uychi'
                )
                """
            ),
            {
                "id": request_id,
                "employer_id": found["id"],
                "trade_id": trade_id,
                "quantity": body.quantity,
                "as_brigade": body.as_brigade,
                "track": body.track,
                "status": status,
                "agency_id": body.agency_id,
            },
        )
    return JSONResponse({"id": str(request_id), "status": status})


@router.post("/requests/{request_id}/candidates")
async def add_candidate(request_id: uuid.UUID, body: CandidateBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.begin() as conn:
        owned = await conn.execute(
            text(
                """
                SELECT 1
                FROM demand_requests r
                JOIN employer_members m ON m.employer_id = r.employer_id
                WHERE r.id = :request_id AND m.user_id = :user_id
                """
            ),
            {"request_id": request_id, "user_id": user_id},
        )
        if owned.first() is None:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu so'rov sizniki emas.")
        await conn.execute(
            text(
                """
                INSERT INTO request_candidates (id, request_id, worker_user_id, status)
                VALUES (:id, :request_id, :worker_user_id, 'PROPOSED')
                """
            ),
            {"id": new_id(), "request_id": request_id, "worker_user_id": body.worker_user_id},
        )
    return JSONResponse({"status": "PROPOSED"})


@router.post("/placements/{placement_id}/review")
async def review(placement_id: uuid.UUID, body: ReviewBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.begin() as conn:
        owned = await conn.execute(
            text(
                """
                SELECT 1
                FROM placements p
                JOIN employer_members m ON m.employer_id = p.employer_id
                WHERE p.id = :placement_id AND m.user_id = :user_id
                """
            ),
            {"placement_id": placement_id, "user_id": user_id},
        )
        if owned.first() is None:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu joylashtirish sizning kompaniyangizniki emas.")
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
                  comment = EXCLUDED.comment
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
