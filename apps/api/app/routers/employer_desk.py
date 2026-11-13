"""Working desk of a local employer: key numbers, the hiring pipeline of every request, current placements,
and the company profile. Candidates move through stages here; hiring creates the placement and tells the worker.
"""

import uuid
from datetime import date
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.inapp import notify
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/employers", tags=["employer-desk"])

STAGES = ("SHORTLISTED", "INTERVIEW", "OFFER", "HIRED", "REJECTED")
PROFILE_FIELDS = ("legal_name", "registration_no", "address", "website", "contact_person", "contact_email", "contact_phone", "description")


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


def _unauth() -> JSONResponse:
    return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")


def _no_company() -> JSONResponse:
    return problem(403, "FORBIDDEN", "Kompaniya yo'q", "Bu bo'lim kompaniya xodimlari uchun.")


async def _employer(conn: AsyncConnection, user_id: uuid.UUID) -> uuid.UUID | None:
    found = (await conn.execute(text("SELECT employer_id FROM employer_members WHERE user_id = :u LIMIT 1"), {"u": user_id})).scalar()
    return None if found is None else uuid.UUID(str(found))


@router.get("/desk")
async def desk(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        employer_id = await _employer(conn, user_id)
        if employer_id is None:
            return _no_company()
        company = (
            await conn.execute(text(f"SELECT name, verified_at IS NOT NULL AS verified, {', '.join(PROFILE_FIELDS)} FROM employers WHERE id = :e"), {"e": employer_id})
        ).mappings().one()
        stats = (
            await conn.execute(
                text(
                    """
                    SELECT count(*) FILTER (WHERE status NOT IN ('CLOSED', 'CANCELLED', 'MATCHED')) AS open_requests,
                           coalesce(sum(quantity) FILTER (WHERE status NOT IN ('CLOSED', 'CANCELLED', 'MATCHED')), 0) AS open_places,
                           round(avg(extract(epoch FROM first_response_at - created_at) / 3600) FILTER (WHERE first_response_at IS NOT NULL)) AS response_hours
                    FROM demand_requests WHERE employer_id = :e AND track <> 'FOREIGN'
                    """
                ),
                {"e": employer_id},
            )
        ).mappings().one()
        rating = (
            await conn.execute(
                text(
                    """
                    SELECT round(avg((score_quality + score_discipline + score_safety + score_communication) / 4.0), 1) AS avg_score, count(*) AS n
                    FROM reviews r JOIN placements p ON p.id = r.placement_id WHERE p.employer_id = :e
                    """
                ),
                {"e": employer_id},
            )
        ).mappings().one()
        rows = (
            await conn.execute(
                text(
                    """
                    SELECT rc.id::text AS id, r.id::text AS request_id, t.name->>'uz-Latn' AS trade, rc.stage, rc.stage_note, rc.stage_at::date::text AS at,
                           rc.worker_user_id IS NOT NULL AS is_worker, coalesce(u.full_name, b.name) AS name, wp.slug
                    FROM request_candidates rc
                    JOIN demand_requests r ON r.id = rc.request_id
                    JOIN trades t ON t.id = r.trade_id
                    LEFT JOIN users u ON u.id = rc.worker_user_id
                    LEFT JOIN worker_profiles wp ON wp.user_id = rc.worker_user_id
                    LEFT JOIN brigades b ON b.id = rc.brigade_id
                    WHERE r.employer_id = :e AND r.track <> 'FOREIGN'
                    ORDER BY rc.stage_at DESC NULLS LAST LIMIT 200
                    """
                ),
                {"e": employer_id},
            )
        ).mappings().all()
        placements = (
            await conn.execute(
                text(
                    """
                    SELECT p.id::text AS id, u.full_name AS name, wp.slug, p.start_date::text AS start, p.end_date::text AS finish, p.monthly_salary::float AS salary,
                           EXISTS (SELECT 1 FROM reviews rv WHERE rv.placement_id = p.id) AS reviewed
                    FROM placements p JOIN users u ON u.id = p.worker_user_id LEFT JOIN worker_profiles wp ON wp.user_id = p.worker_user_id
                    WHERE p.employer_id = :e ORDER BY p.end_date NULLS FIRST, p.start_date DESC LIMIT 100
                    """
                ),
                {"e": employer_id},
            )
        ).mappings().all()
    filled = sum(1 for field in PROFILE_FIELDS if company[field])
    pipeline = [dict(r) for r in rows]
    counts = {stage: sum(1 for item in pipeline if item["stage"] == stage) for stage in STAGES}
    active = [p for p in placements if p["finish"] is None]
    return JSONResponse(
        {
            "company": {"name": company["name"], "verified": bool(company["verified"]), "completeness": round(100 * filled / len(PROFILE_FIELDS))},
            "kpi": {
                "open_requests": int(stats["open_requests"]),
                "open_places": int(stats["open_places"]),
                "in_pipeline": counts["SHORTLISTED"] + counts["INTERVIEW"] + counts["OFFER"],
                "interviews": counts["INTERVIEW"],
                "active_placements": len(active),
                "rating": None if rating["avg_score"] is None else float(rating["avg_score"]),
                "reviews": int(rating["n"]),
                "response_hours": None if stats["response_hours"] is None else int(stats["response_hours"]),
            },
            "stages": list(STAGES),
            "counts": counts,
            "pipeline": pipeline,
            "placements": [dict(p) for p in placements],
        }
    )


class StageIn(BaseModel):
    stage: str
    note: str | None = Field(default=None, max_length=500)
    start_date: date | None = None


@router.post("/candidates/{candidate_id}/stage")
async def move_candidate(candidate_id: uuid.UUID, body: StageIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    if body.stage not in STAGES:
        return problem(422, "VALIDATION", "Bosqich noto'g'ri", "Ro'yxatdagi bosqichni tanlang.")
    async with _engine(request).begin() as conn:
        employer_id = await _employer(conn, user_id)
        if employer_id is None:
            return _no_company()
        row = (
            await conn.execute(
                text(
                    """
                    SELECT rc.request_id, rc.worker_user_id, rc.stage, r.status::text AS request_status
                    FROM request_candidates rc JOIN demand_requests r ON r.id = rc.request_id
                    WHERE rc.id = :id AND r.employer_id = :e AND r.track <> 'FOREIGN'
                    """
                ),
                {"id": candidate_id, "e": employer_id},
            )
        ).mappings().first()
        if row is None:
            return problem(404, "NOT_FOUND", "Nomzod topilmadi", "Bunday nomzod sizning so'rovingizda yo'q.")
        if row["stage"] == "HIRED":
            return problem(409, "ALREADY_HIRED", "Nomzod ishga olingan", "Ishga olingan nomzodning bosqichi o'zgarmaydi.")
        if body.start_date is not None and body.start_date < date.today().replace(year=date.today().year - 1):
            return problem(422, "VALIDATION", "Sana noto'g'ri", "Boshlanish sanasini tekshiring.")
        status = {"HIRED": "HIRED", "REJECTED": "EMPLOYER_REJECTED"}.get(body.stage)
        await conn.execute(
            text("UPDATE request_candidates SET stage = :s, stage_note = :n, stage_at = now(), status = coalesce(CAST(:status AS varchar), status) WHERE id = :id"),
            {"s": body.stage, "n": (body.note or "").strip() or None, "status": status, "id": candidate_id},
        )
        worker = row["worker_user_id"]
        if body.stage == "HIRED" and worker is not None:
            exists = await conn.execute(text("SELECT 1 FROM placements WHERE worker_user_id = :w AND request_id = :r"), {"w": worker, "r": row["request_id"]})
            if exists.first() is None:
                await conn.execute(
                    text("INSERT INTO placements (id, worker_user_id, request_id, employer_id, kind, start_date) VALUES (:id, :w, :r, :e, 'DIRECT', :d)"),
                    {"id": new_id(), "w": worker, "r": row["request_id"], "e": employer_id, "d": body.start_date or date.today()},
                )
        if worker is not None and body.stage in {"INTERVIEW", "OFFER", "HIRED"}:
            await notify(conn, worker, "placement" if body.stage == "HIRED" else "pipeline_stage", {"stage": body.stage, "request_id": str(row["request_id"])})
    return JSONResponse({"stage": body.stage})


class EndIn(BaseModel):
    end_date: date | None = None


@router.post("/placements/{placement_id}/end")
async def end_placement(placement_id: uuid.UUID, body: EndIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        employer_id = await _employer(conn, user_id)
        if employer_id is None:
            return _no_company()
        done = await conn.execute(
            text("UPDATE placements SET end_date = greatest(:d, start_date) WHERE id = :id AND employer_id = :e AND end_date IS NULL RETURNING id"),
            {"d": body.end_date or date.today(), "id": placement_id, "e": employer_id},
        )
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Joylashtirish topilmadi", "Joylashtirish yo'q yoki allaqachon tugagan.")
    return JSONResponse({"status": "ended"})


class ProfileIn(BaseModel):
    legal_name: str | None = Field(default=None, max_length=200)
    registration_no: str | None = Field(default=None, max_length=60)
    address: str | None = Field(default=None, max_length=300)
    website: str | None = Field(default=None, max_length=200)
    contact_person: str | None = Field(default=None, max_length=120)
    contact_email: str | None = Field(default=None, max_length=120)
    contact_phone: str | None = Field(default=None, max_length=25)
    description: str | None = Field(default=None, max_length=3000)


@router.get("/profile")
async def get_profile(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        employer_id = await _employer(conn, user_id)
        if employer_id is None:
            return _no_company()
        row = (await conn.execute(text(f"SELECT name, inn, {', '.join(PROFILE_FIELDS)} FROM employers WHERE id = :e"), {"e": employer_id})).mappings().one()
    return JSONResponse({key: ("" if value is None else value) for key, value in dict(row).items()})


@router.put("/profile")
async def put_profile(body: ProfileIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    values: dict[str, Any] = {key: ((getattr(body, key) or "").strip() or None) for key in PROFILE_FIELDS}
    email = values["contact_email"]
    if email and ("@" not in email or " " in email):
        return problem(422, "VALIDATION", "Elektron pochta noto'g'ri", "Pochta manzilini tekshiring.")
    website = values["website"]
    if website and not website.lower().startswith(("http://", "https://")):
        return problem(422, "VALIDATION", "Sayt manzili noto'g'ri", "Manzil http:// yoki https:// bilan boshlansin.")
    async with _engine(request).begin() as conn:
        employer_id = await _employer(conn, user_id)
        if employer_id is None:
            return _no_company()
        sets = ", ".join(f"{key} = :{key}" for key in PROFILE_FIELDS)
        await conn.execute(text(f"UPDATE employers SET {sets} WHERE id = :e"), {**values, "e": employer_id})
    return JSONResponse({"status": "saved"})
