import json
import uuid
from datetime import date

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.doc_i18n import current_lang, pick
from app.inapp import notify
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
    location: str = Field(default="Uychi", max_length=200)
    start_date: date | None = None
    duration_months: int | None = Field(default=None, ge=1, le=60)
    salary_from: float | None = Field(default=None, ge=0)
    salary_to: float | None = Field(default=None, ge=0)
    conditions: str | None = Field(default=None, max_length=2000)


class CandidateBody(BaseModel):
    worker_user_id: uuid.UUID | None = None
    brigade_id: uuid.UUID | None = None


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
    return pick(value, current_lang())


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
                SELECT r.id::text AS id, r.quantity, r.status::text AS status, r.track::text AS track,
                       r.as_brigade, r.location, r.start_date::text AS start_date, r.duration_months,
                       r.salary_from::float AS salary_from, r.salary_to::float AS salary_to,
                       r.conditions, r.created_at::date::text AS created_at,
                       t.code AS trade_code, t.name AS trade_name,
                       (SELECT count(*) FROM request_candidates c WHERE c.request_id = r.id) AS candidates
                FROM demand_requests r JOIN trades t ON t.id = r.trade_id
                WHERE r.employer_id = :id ORDER BY r.created_at DESC
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
            "requests": [{**{k: v for k, v in row.items() if k != "trade_name"}, "trade": pick(row["trade_name"], current_lang())} for row in requests.mappings()],
            "placements": [
                {"id": row["id"], "name": row["full_name"]} for row in placements.mappings()
            ],
        }
    )


@router.get("/workers")
async def workers(request: Request, q: str = "", trade: str = "") -> JSONResponse:
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
                WHERE (CAST(:q AS text) = '' OR u.full_name ILIKE :like)
                  AND (CAST(:trade AS text) = '' OR t.code = :trade)
                ORDER BY u.full_name
                LIMIT 30
                """
            ),
            {"q": q, "like": f"%{q}%", "trade": trade},
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
        if body.salary_from is not None and body.salary_to is not None and body.salary_from > body.salary_to:
            return problem(422, "VALIDATION", "Maosh oralig'i noto'g'ri", "Boshlang'ich maosh yuqori chegaradan katta.")
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
                  id, employer_id, trade_id, quantity, as_brigade, track, status, agency_id, location,
                  start_date, duration_months, salary_from, salary_to, salary_currency, conditions
                )
                VALUES (
                  :id, :employer_id, :trade_id, :quantity, :as_brigade,
                  CAST(:track AS track_code), CAST(:status AS request_status), :agency_id, :location,
                  :start_date, :duration_months, :salary_from, :salary_to, :currency, :conditions
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
                "location": body.location.strip() or "Uychi",
                "start_date": body.start_date,
                "duration_months": body.duration_months,
                "salary_from": body.salary_from,
                "salary_to": body.salary_to,
                "currency": None if body.salary_from is None and body.salary_to is None else "UZS",
                "conditions": (body.conditions or "").strip() or None,
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
        if (body.worker_user_id is None) == (body.brigade_id is None):
            return problem(422, "VALIDATION", "Nomzod noto'g'ri", "Usta yoki brigadani tanlang.")
        duplicate = await conn.execute(
            text(
                """
                SELECT 1 FROM request_candidates
                WHERE request_id = :request_id
                  AND (worker_user_id = :worker OR brigade_id = :brigade)
                """
            ),
            {"request_id": request_id, "worker": body.worker_user_id, "brigade": body.brigade_id},
        )
        if duplicate.first() is not None:
            return JSONResponse({"status": "PROPOSED"})
        await conn.execute(
            text(
                """
                INSERT INTO request_candidates (id, request_id, worker_user_id, brigade_id, status)
                VALUES (:id, :request_id, :worker_user_id, :brigade_id, 'PROPOSED')
                """
            ),
            {
                "id": new_id(),
                "request_id": request_id,
                "worker_user_id": body.worker_user_id,
                "brigade_id": body.brigade_id,
            },
        )
        if body.worker_user_id is not None:
            await notify(conn, body.worker_user_id, "offer", {"request_id": str(request_id)})
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


async def _owned_request(
    conn: AsyncConnection, request_id: uuid.UUID, user_id: uuid.UUID
) -> dict[str, object] | None:
    row = await conn.execute(
        text(
            """
            SELECT r.id, r.trade_id, r.quantity, r.as_brigade
            FROM demand_requests r
            JOIN employer_members m ON m.employer_id = r.employer_id
            WHERE r.id = :request_id AND m.user_id = :user_id
            """
        ),
        {"request_id": request_id, "user_id": user_id},
    )
    found = row.mappings().first()
    return None if found is None else dict(found)


def match_score(rating: float | None, hours: int, certified: bool, free: bool) -> tuple[float, list[str]]:
    """Explainable rule-based ranking (FR-MATCH): every point has a stated reason."""
    reasons: list[str] = []
    score = 0.0
    if certified:
        score += 0.35
        reasons.append("certified")
    if free:
        score += 0.25
        reasons.append("available")
    if rating is not None:
        score += 0.25 * min(rating, 5.0) / 5.0
        if rating >= 4.5:
            reasons.append("top_rated")
    score += 0.15 * min(hours, 1000) / 1000
    if hours >= 500:
        reasons.append("experienced")
    return round(score, 3), reasons


@router.get("/requests/{request_id}/matches")
async def matches(request_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    async with _engine(request).connect() as conn:
        found = await _owned_request(conn, request_id, user_id)
        if found is None:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu so'rov sizniki emas.")
        brigades = await conn.execute(
            text(
                """
                SELECT b.id::text AS id, b.name,
                       count(m.worker_user_id) FILTER (WHERE m.left_at IS NULL) AS members,
                       avg(wp.rating_avg)::float AS rating
                FROM brigades b
                LEFT JOIN brigade_members m ON m.brigade_id = b.id
                LEFT JOIN worker_profiles wp ON wp.user_id = m.worker_user_id AND m.left_at IS NULL
                WHERE b.trade_id = :trade AND b.status = 'READY'
                  AND NOT EXISTS (
                    SELECT 1 FROM request_candidates c WHERE c.request_id = :request AND c.brigade_id = b.id
                  )
                GROUP BY b.id
                ORDER BY members DESC, rating DESC NULLS LAST
                LIMIT 5
                """
            ),
            {"trade": found["trade_id"], "request": request_id},
        )
        workers = await conn.execute(
            text(
                """
                SELECT u.id::text AS user_id, wp.slug,
                       CASE
                         WHEN coalesce((wp.visibility->>'full_name')::boolean, false) THEN u.full_name
                         ELSE split_part(btrim(u.full_name), ' ', 1)
                       END AS name,
                       wp.level::text AS level, wp.availability::text AS availability,
                       wp.rating_avg::float AS rating, wp.verified_hours AS hours,
                       EXISTS (
                         SELECT 1 FROM certificates c JOIN persons p ON p.id = c.person_id
                         WHERE p.user_id = wp.user_id AND c.status = 'ISSUED'
                       ) AS certified
                FROM worker_profiles wp
                JOIN users u ON u.id = wp.user_id
                WHERE wp.primary_trade_id = :trade
                  AND wp.availability IN ('FREE', 'BUSY')
                  AND NOT EXISTS (
                    SELECT 1 FROM request_candidates c
                    WHERE c.request_id = :request AND c.worker_user_id = wp.user_id
                  )
                """
            ),
            {"trade": found["trade_id"], "request": request_id},
        )
        ranked: list[dict[str, object]] = []
        for item in workers.mappings():
            score, reasons = match_score(
                item["rating"], int(item["hours"] or 0), bool(item["certified"]), item["availability"] == "FREE"
            )
            ranked.append(
                {
                    "user_id": item["user_id"],
                    "slug": item["slug"],
                    "name": item["name"],
                    "level": item["level"],
                    "availability": item["availability"],
                    "rating": item["rating"],
                    "hours": item["hours"],
                    "score": score,
                    "reasons": reasons,
                }
            )
        ranked.sort(key=lambda row: float(str(row["score"])), reverse=True)
        brigade_rows = [
            {
                "id": item["id"],
                "name": item["name"],
                "members": int(item["members"]),
                "rating": None if item["rating"] is None else round(float(item["rating"]), 1),
                "fits": int(item["members"]) >= int(str(found["quantity"])),
            }
            for item in brigades.mappings()
        ]
    payload = {"brigades": brigade_rows, "workers": ranked[:10], "as_brigade": bool(found["as_brigade"])}
    if "+998" in json.dumps(payload):
        return problem(500, "PHONE_LEAK", "Xatolik", "Javobda telefon chiqib qoldi.")
    return JSONResponse(payload)


@router.get("/requests/{request_id}/candidates")
async def candidates(request_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    async with _engine(request).connect() as conn:
        if await _owned_request(conn, request_id, user_id) is None:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu so'rov sizniki emas.")
        rows = await conn.execute(
            text(
                """
                SELECT c.id::text AS id, c.status,
                       CASE WHEN c.brigade_id IS NOT NULL THEN 'brigade' ELSE 'worker' END AS kind,
                       coalesce(
                         b.name,
                         CASE
                           WHEN coalesce((wp.visibility->>'full_name')::boolean, false) THEN u.full_name
                           ELSE split_part(btrim(u.full_name), ' ', 1)
                         END
                       ) AS name,
                       wp.slug
                FROM request_candidates c
                LEFT JOIN brigades b ON b.id = c.brigade_id
                LEFT JOIN users u ON u.id = c.worker_user_id
                LEFT JOIN worker_profiles wp ON wp.user_id = c.worker_user_id
                WHERE c.request_id = :id
                ORDER BY kind, name
                """
            ),
            {"id": request_id},
        )
        payload = [dict(item) for item in rows.mappings()]
    return JSONResponse(payload)
