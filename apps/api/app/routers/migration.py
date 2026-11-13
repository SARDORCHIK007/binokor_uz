"""Migration agency workbench: the pool of candidates (graduates and workers), a vacancy desk with a fit check against the
employer's requirements, and the abroad pipeline stage of every candidate (documents, language, interview, offer, visa, departure).
"""

import uuid
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.doc_i18n import lang_of, pick
from app.inapp import notify
from app.routers.vacancies import VACANCY_SQL, vacancy_json
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/migration", tags=["migration"])

AGENCY_ROLES = {"agency_officer", "admin", "superadmin", "placement_manager"}
STAGES = ("SHORTLISTED", "DOCS", "LANGUAGE", "INTERVIEW", "OFFER", "VISA", "DEPARTED", "REJECTED")
# request_candidates.status is varchar(16), so the 17-letter EMPLOYER_* values of its own CHECK can never be stored; only HIRED is mirrored.
STAGE_STATUS = {"DEPARTED": "HIRED"}
LEVEL_ORDER = {"APPRENTICE": 0, "ASSISTANT": 1, "MASTER": 2, "FOREMAN": 3}


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


def _forbidden() -> JSONResponse:
    return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu bo'lim migratsiya agentligi xodimlari uchun.")


async def _is_agency(conn: AsyncConnection, user_id: uuid.UUID) -> bool:
    rows = await conn.execute(text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"), {"id": user_id})
    return bool({str(r["role"]) for r in rows.mappings()} & AGENCY_ROLES)


POOL_SQL = """
    SELECT wp.user_id::text AS user_id, p.id::text AS person_id, wp.slug, u.full_name, t.code AS trade_code, t.name AS trade, wp.level::text AS level,
           wp.verified_hours, wp.rating_avg, wp.availability::text AS availability, m.name AS mahalla,
           EXISTS (SELECT 1 FROM certificates c WHERE c.person_id = p.id AND c.status = 'ISSUED') AS certified,
           coalesce((SELECT max(a.trade_experience_years) FROM applications a WHERE a.person_id = p.id), 0) AS experience,
           (SELECT coalesce(jsonb_object_agg(pl.lang_code, pl.level), '{}'::jsonb) FROM person_languages pl WHERE pl.person_id = p.id) AS langs,
           (SELECT count(*) FROM request_candidates rc WHERE rc.worker_user_id = wp.user_id AND rc.stage <> 'REJECTED') AS proposed
    FROM worker_profiles wp
    JOIN users u ON u.id = wp.user_id
    LEFT JOIN persons p ON p.user_id = wp.user_id
    LEFT JOIN trades t ON t.id = wp.primary_trade_id
    LEFT JOIN mahallas m ON m.id = wp.mahalla_id
"""


def fit_checks(requirements: dict[str, Any], person: dict[str, Any]) -> list[dict[str, object]]:
    """Which of the employer's requirements this candidate meets."""
    checks: list[dict[str, object]] = []
    level = requirements.get("min_level")
    if level:
        checks.append({"key": "level", "ok": LEVEL_ORDER.get(str(person["level"]), 0) >= LEVEL_ORDER.get(str(level), 0)})
    years = requirements.get("min_experience_years")
    if years:
        checks.append({"key": "experience", "ok": float(person["experience"]) >= float(years)})
    if requirements.get("certificate_required"):
        checks.append({"key": "certificate", "ok": bool(person["certified"])})
    language = requirements.get("language")
    if language:
        have = int((person["langs"] or {}).get(str(language), 0))
        checks.append({"key": "language", "ok": have >= int(requirements.get("language_level") or 1)})
    return checks


def person_json(r: Any, code: str, requirements: dict[str, Any] | None = None) -> dict[str, object]:
    row: dict[str, Any] = dict(r)
    checks = fit_checks(requirements or {}, row)
    return {
        "user_id": row["user_id"],
        "person_id": row["person_id"],
        "slug": row["slug"],
        "name": row["full_name"],
        "trade": pick(row["trade"], code),
        "trade_code": row["trade_code"],
        "level": row["level"],
        "hours": int(row["verified_hours"] or 0),
        "rating": None if row["rating_avg"] is None else float(row["rating_avg"]),
        "availability": row["availability"],
        "mahalla": pick(row["mahalla"], code),
        "certified": bool(row["certified"]),
        "experience": float(row["experience"]),
        "languages": row["langs"] or {},
        "proposed": int(row["proposed"]),
        "checks": checks,
        "fit": None if not checks else round(100 * sum(1 for c in checks if c["ok"]) / len(checks)),
    }


@router.get("/pool")
async def pool(
    request: Request,
    lang: str | None = None,
    trade: str | None = None,
    certified: bool = False,
    language: str | None = None,
    min_language: int = 0,
    free_only: bool = True,
    q: str | None = None,
    vacancy: uuid.UUID | None = None,
) -> JSONResponse:
    code = lang_of(lang or request.cookies.get("ub_locale"))
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _is_agency(conn, user_id):
            return _forbidden()
        requirements: dict[str, Any] = {}
        if vacancy is not None:
            req = (await conn.execute(text("SELECT requirements FROM demand_requests WHERE id = :id"), {"id": vacancy})).scalar()
            requirements = req or {}
        where = ["TRUE"]
        params: dict[str, object] = {}
        if trade:
            where.append("t.code = :trade")
            params["trade"] = trade
        if certified:
            where.append("EXISTS (SELECT 1 FROM certificates c WHERE c.person_id = p.id AND c.status = 'ISSUED')")
        if language and min_language > 0:
            where.append("EXISTS (SELECT 1 FROM person_languages pl WHERE pl.person_id = p.id AND pl.lang_code = :language AND pl.level >= :minlang)")
            params["language"] = language
            params["minlang"] = min_language
        if free_only:
            where.append("wp.availability = 'FREE'")
        if q:
            where.append("lower(u.full_name) LIKE :q")
            params["q"] = f"%{q.strip().lower()}%"
        rows = await conn.execute(text(POOL_SQL + " WHERE " + " AND ".join(where) + " ORDER BY wp.verified_hours DESC, u.full_name LIMIT 150"), params)
        people = [person_json(r, code, requirements) for r in rows.mappings()]
        trades = await conn.execute(text("SELECT code, name FROM trades WHERE is_active ORDER BY code"))
        langs = await conn.execute(text("SELECT DISTINCT lang_code FROM destinations WHERE lang_code IS NOT NULL ORDER BY 1"))
    if vacancy is not None:
        people.sort(key=lambda p: (-(int(str(p["fit"])) if p["fit"] is not None else -1), not bool(p["certified"]), -int(str(p["hours"]))))
    return JSONResponse(
        {
            "people": people,
            "trades": [{"code": r["code"], "name": pick(r["name"], code)} for r in trades.mappings()],
            "languages": [str(r[0]) for r in langs.all()],
        }
    )


@router.get("/vacancies/{vacancy_id}")
async def vacancy_desk(vacancy_id: uuid.UUID, request: Request, lang: str | None = None) -> JSONResponse:
    code = lang_of(lang or request.cookies.get("ub_locale"))
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _is_agency(conn, user_id):
            return _forbidden()
        row = (await conn.execute(text(VACANCY_SQL + " WHERE r.id = :id AND r.track = 'FOREIGN'"), {"id": vacancy_id})).mappings().first()
        if row is None:
            return problem(404, "NOT_FOUND", "Vakansiya topilmadi", "Bunday tashqi vakansiya yo'q.")
        vacancy = vacancy_json(row, code)
        employer = (
            await conn.execute(
                text(
                    """
                    SELECT e.id::text AS id, e.name, e.country_code, e.verified_at IS NOT NULL AS verified, e.legal_name, e.registration_no,
                           e.address, e.website, e.contact_person, e.contact_email, e.contact_phone
                    FROM employers e JOIN demand_requests r ON r.employer_id = e.id WHERE r.id = :id
                    """
                ),
                {"id": vacancy_id},
            )
        ).mappings().one()
        cands = await conn.execute(
            text(
                """
                SELECT rc.id::text AS cid, rc.status, rc.stage, rc.stage_note, rc.stage_at::text AS stage_at, p0.*
                FROM request_candidates rc
                JOIN LATERAL (""" + POOL_SQL + """ WHERE wp.user_id = rc.worker_user_id) p0 ON TRUE
                WHERE rc.request_id = :id ORDER BY rc.stage = 'REJECTED', rc.stage_at NULLS LAST
                """
            ),
            {"id": vacancy_id},
        )
        requirements = vacancy["requirements"]
        candidates = []
        for r in cands.mappings():
            person = person_json(r, code, requirements if isinstance(requirements, dict) else {})
            candidates.append({**person, "id": r["cid"], "status": r["status"], "stage": r["stage"], "note": r["stage_note"], "stage_at": r["stage_at"]})
    return JSONResponse(
        {
            "vacancy": vacancy,
            "firm": {
                "id": employer["id"],
                "name": employer["name"],
                "country": str(employer["country_code"]).strip(),
                "verified": bool(employer["verified"]),
                **{k: str(employer[k] or "") for k in ("legal_name", "registration_no", "address", "website", "contact_person", "contact_email", "contact_phone")},
            },
            "candidates": candidates,
            "stages": list(STAGES),
        }
    )


class StageIn(BaseModel):
    stage: str
    note: str | None = Field(default=None, max_length=500)


@router.post("/candidates/{candidate_id}/stage")
async def set_stage(candidate_id: uuid.UUID, body: StageIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    if body.stage not in STAGES:
        return problem(422, "VALIDATION", "Bosqich noto'g'ri", "Ro'yxatdagi bosqichni tanlang.")
    async with _engine(request).begin() as conn:
        if not await _is_agency(conn, user_id):
            return _forbidden()
        row = (
            await conn.execute(
                text(
                    """
                    SELECT rc.request_id, rc.worker_user_id, r.employer_id, e.verified_at IS NOT NULL AS verified
                    FROM request_candidates rc JOIN demand_requests r ON r.id = rc.request_id JOIN employers e ON e.id = r.employer_id
                    WHERE rc.id = :id AND r.track = 'FOREIGN' AND rc.worker_user_id IS NOT NULL
                    """
                ),
                {"id": candidate_id},
            )
        ).mappings().first()
        if row is None:
            return problem(404, "NOT_FOUND", "Nomzod topilmadi", "Bunday nomzod yo'q.")
        if body.stage in {"OFFER", "VISA", "DEPARTED"} and not row["verified"]:
            return problem(409, "FIRM_NOT_VERIFIED", "Firma tasdiqlanmagan", "Taklif, viza va jo'natish uchun firma avval tasdiqlanishi kerak.")
        await conn.execute(
            text(
                """
                UPDATE request_candidates
                SET stage = :stage, stage_note = :note, stage_at = now(), proposed_by = coalesce(proposed_by, :by),
                    status = coalesce(CAST(:status AS varchar), status)
                WHERE id = :id
                """
            ),
            {"stage": body.stage, "note": (body.note or "").strip() or None, "by": user_id, "status": STAGE_STATUS.get(body.stage), "id": candidate_id},
        )
        if body.stage == "DEPARTED":
            exists = await conn.execute(
                text("SELECT 1 FROM placements WHERE worker_user_id = :w AND request_id = :r"), {"w": row["worker_user_id"], "r": row["request_id"]}
            )
            if exists.first() is None:
                await conn.execute(
                    text(
                        "INSERT INTO placements (id, worker_user_id, request_id, employer_id, kind, start_date) "
                        "VALUES (:id, :w, :r, :e, 'ABROAD', CURRENT_DATE)"
                    ),
                    {"id": new_id(), "w": row["worker_user_id"], "r": row["request_id"], "e": row["employer_id"]},
                )
        if body.stage in {"INTERVIEW", "OFFER", "VISA", "DEPARTED"}:
            await notify(conn, row["worker_user_id"], "abroad_stage", {"stage": body.stage, "request_id": str(row["request_id"])})
    return JSONResponse({"stage": body.stage})


@router.delete("/candidates/{candidate_id}")
async def drop_candidate(candidate_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        if not await _is_agency(conn, user_id):
            return _forbidden()
        done = await conn.execute(
            text(
                "DELETE FROM request_candidates rc USING demand_requests r WHERE rc.id = :id AND r.id = rc.request_id AND r.track = 'FOREIGN' "
                "AND rc.stage IN ('SHORTLISTED', 'REJECTED') RETURNING rc.id"
            ),
            {"id": candidate_id},
        )
        if done.first() is None:
            return problem(409, "CANNOT_REMOVE", "Olib tashlab bo'lmadi", "Faqat boshlang'ich bosqichdagi nomzodni olib tashlash mumkin.")
    return JSONResponse({"status": "removed"})
