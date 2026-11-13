"""Panels for institution staff: mahalla assistants, the employment office, the migration agency,
the republic migration observer and foreign employers.

Every endpoint checks the caller's role; personal contact data (phones) is never returned.
"""

import csv
import io
import re
import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.doc_i18n import lang_of, pick
from app.inapp import notify
from app.ratelimit import too_many
from app.registration import RegistrationError, register_person
from app.routers.vacancies import VACANCY_SQL, vacancy_json
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1", tags=["panels"])

PHONE_RE = "^\\+998[0-9]{9}$"
FOREIGN_STATUSES = {"IN_REVIEW", "VIA_AGENCY", "SHORTLIST_SENT", "EMPLOYER_APPROVED", "CONTRACTING", "MATCHED", "CLOSED", "CANCELLED"}
OPEN_STATUSES = "('CLOSED', 'CANCELLED', 'MATCHED')"


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


def _lang(request: Request, explicit: str | None) -> str:
    return lang_of(explicit or request.cookies.get("ub_locale"))


def _unauth() -> JSONResponse:
    return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")


def _forbidden(detail: str) -> JSONResponse:
    return problem(403, "FORBIDDEN", "Ruxsat yo'q", detail)


async def _roles(conn: AsyncConnection, user_id: uuid.UUID) -> set[str]:
    rows = await conn.execute(text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"), {"id": user_id})
    return {str(r["role"]) for r in rows.mappings()}


def _num(value: object) -> int:
    return int(str(value or 0))


# ================================================================= mahalla assistant


MAHALLA_ROLES = {"mahalla_assistant", "admin", "superadmin"}


async def _mahalla_ids(conn: AsyncConnection, user_id: uuid.UUID, roles: set[str]) -> list[uuid.UUID]:
    if roles & {"admin", "superadmin"}:
        rows = await conn.execute(text("SELECT id FROM mahallas"))
    else:
        rows = await conn.execute(text("SELECT mahalla_id AS id FROM staff_mahallas WHERE user_id = :id"), {"id": user_id})
    return [uuid.UUID(str(r["id"])) for r in rows.mappings()]


@router.get("/mahalla/overview")
async def mahalla_overview(request: Request, lang: str | None = None) -> JSONResponse:
    code = _lang(request, lang)
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        roles = await _roles(conn, user_id)
        if not roles & MAHALLA_ROLES:
            return _forbidden("Bu bo'lim mahalla hokim yordamchilari uchun.")
        ids = await _mahalla_ids(conn, user_id, roles)
        if not ids:
            return JSONResponse({"mahallas": [], "kpi": {}, "candidates": [], "trades": []})
        names = (await conn.execute(text("SELECT id::text AS id, name FROM mahallas WHERE id = ANY(:ids) ORDER BY name->>'uz-Latn'"), {"ids": ids})).mappings().all()
        kpi = (
            await conn.execute(
                text(
                    """
                    SELECT
                      (SELECT count(*) FROM persons WHERE mahalla_id = ANY(:ids)) AS people,
                      (SELECT count(*) FROM applications a JOIN persons p ON p.id = a.person_id
                        WHERE p.mahalla_id = ANY(:ids) AND a.status <> 'DRAFT') AS applications,
                      (SELECT count(*) FROM applications a JOIN persons p ON p.id = a.person_id
                        WHERE p.mahalla_id = ANY(:ids) AND a.status IN ('SUBMITTED', 'SCREENING', 'VOUCHER_CHECK', 'INTERVIEW', 'TRIAL')) AS waiting,
                      (SELECT count(*) FROM enrollments e JOIN persons p ON p.user_id = e.student_user_id
                        WHERE p.mahalla_id = ANY(:ids) AND e.status = 'ACTIVE') AS studying,
                      (SELECT count(*) FROM certificates c JOIN persons p ON p.id = c.person_id
                        WHERE p.mahalla_id = ANY(:ids) AND c.status = 'ISSUED') AS certified,
                      (SELECT count(*) FROM placements pl JOIN persons p ON p.user_id = pl.worker_user_id
                        WHERE p.mahalla_id = ANY(:ids)) AS employed
                    """
                ),
                {"ids": ids},
            )
        ).mappings().one()
        rows = await conn.execute(
            text(
                """
                SELECT a.id::text AS id, p.id::text AS person_id, p.first_name, p.last_name, t.name AS trade, a.status::text AS status, a.source,
                       a.created_at::date::text AS day, m.name AS mahalla,
                       EXISTS (SELECT 1 FROM enrollments e WHERE e.student_user_id = p.user_id AND e.status = 'ACTIVE') AS studying,
                       EXISTS (SELECT 1 FROM certificates c WHERE c.person_id = p.id AND c.status = 'ISSUED') AS certified
                FROM applications a
                JOIN persons p ON p.id = a.person_id
                LEFT JOIN trades t ON t.id = a.desired_trade_id
                LEFT JOIN mahallas m ON m.id = p.mahalla_id
                WHERE p.mahalla_id = ANY(:ids) AND a.status <> 'DRAFT'
                ORDER BY a.created_at DESC LIMIT 200
                """
            ),
            {"ids": ids},
        )
        candidates = [
            {
                "id": r["id"],
                "person_id": r["person_id"],
                "name": f"{r['last_name']} {r['first_name']}",
                "trade": pick(r["trade"], code),
                "status": r["status"],
                "source": r["source"],
                "date": r["day"],
                "mahalla": pick(r["mahalla"], code),
                "studying": bool(r["studying"]),
                "certified": bool(r["certified"]),
            }
            for r in rows.mappings()
        ]
        trades = await conn.execute(text("SELECT code, name FROM trades WHERE is_active ORDER BY code"))
        trade_list = [{"code": r["code"], "name": pick(r["name"], code)} for r in trades.mappings()]
        per = await conn.execute(
            text(
                """
                SELECT m.id::text AS id, m.name,
                       count(DISTINCT p.id) AS people,
                       count(DISTINCT a.id) FILTER (WHERE a.status <> 'DRAFT') AS applications,
                       count(DISTINCT p.id) FILTER (WHERE EXISTS (SELECT 1 FROM enrollments e WHERE e.student_user_id = p.user_id AND e.status = 'ACTIVE')) AS studying,
                       count(DISTINCT p.id) FILTER (WHERE EXISTS (SELECT 1 FROM certificates c WHERE c.person_id = p.id AND c.status = 'ISSUED')) AS certified,
                       count(DISTINCT p.id) FILTER (WHERE EXISTS (SELECT 1 FROM placements pl WHERE pl.worker_user_id = p.user_id)) AS employed
                FROM mahallas m LEFT JOIN persons p ON p.mahalla_id = m.id LEFT JOIN applications a ON a.person_id = p.id
                WHERE m.id = ANY(:ids) GROUP BY m.id, m.name ORDER BY m.name->>'uz-Latn'
                """
            ),
            {"ids": ids},
        )
        by_mahalla = [
            {"id": r["id"], "name": pick(r["name"], code), **{k: int(r[k]) for k in ("people", "applications", "studying", "certified", "employed")}}
            for r in per.mappings()
        ]
    return JSONResponse(
        {
            "by_mahalla": by_mahalla,
            "mahallas": [{"id": r["id"], "name": pick(r["name"], code)} for r in names],
            "kpi": {key: _num(value) for key, value in kpi.items()},
            "candidates": candidates,
            "trades": trade_list,
        }
    )


@router.get("/mahalla/export.csv", response_model=None)
async def mahalla_export(request: Request) -> Response:
    """The mahalla's list as a CSV: names, trade, stage and date. No phone numbers."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        roles = await _roles(conn, user_id)
        if not roles & MAHALLA_ROLES:
            return _forbidden("Bu bo'lim mahalla hokim yordamchilari uchun.")
        ids = await _mahalla_ids(conn, user_id, roles)
        rows = await conn.execute(
            text(
                """
                SELECT p.last_name, p.first_name, t.name AS trade, a.status::text AS status, a.source, a.created_at::date::text AS day, m.name AS mahalla
                FROM applications a JOIN persons p ON p.id = a.person_id LEFT JOIN trades t ON t.id = a.desired_trade_id LEFT JOIN mahallas m ON m.id = p.mahalla_id
                WHERE p.mahalla_id = ANY(:ids) AND a.status <> 'DRAFT' ORDER BY a.created_at DESC
                """
            ),
            {"ids": ids},
        )
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow(["name", "mahalla", "trade", "status", "source", "date"])
        for r in rows.mappings():
            writer.writerow([f"{r['last_name']} {r['first_name']}", pick(r["mahalla"], "uz-Latn"), pick(r["trade"], "uz-Latn"), r["status"], r["source"], r["day"]])
    return Response(
        content="﻿" + out.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="mahalla.csv"'},
    )


class CandidateIn(BaseModel):
    mahalla_id: uuid.UUID
    first_name: str = Field(min_length=2, max_length=80)
    last_name: str = Field(min_length=2, max_length=80)
    birth_date: date
    phone: str
    trade_code: str
    track: Literal["DOMESTIC", "FOREIGN"] = "DOMESTIC"
    type: Literal["YOUTH", "WORKER_UPSKILL", "UNIVERSITY_GRAD"] = "YOUTH"
    experience_years: float = Field(default=0, ge=0, le=40)
    has_language: bool = False
    consent_confirmed: bool


@router.post("/mahalla/candidates")
async def mahalla_add_candidate(body: CandidateIn, request: Request) -> JSONResponse:
    """The assistant registers a resident who wants to study. The resident later logs in with the same phone and sees the application."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    limited = await too_many(request, "mahalla-add", str(user_id), limit=60, window_seconds=86400)
    if limited is not None:
        return limited
    if not body.consent_confirmed:
        return problem(422, "CONSENT_REQUIRED", "Rozilik kerak", "Shaxsiy ma'lumotlarni qayta ishlashga yozma rozilik olinganini tasdiqlang.")
    phone = body.phone.replace(" ", "")
    if not re.match(PHONE_RE, phone):
        return problem(422, "VALIDATION", "Telefon noto'g'ri", "Telefon +998XXXXXXXXX ko'rinishida bo'lishi kerak.")
    async with _engine(request).begin() as conn:
        roles = await _roles(conn, user_id)
        if not roles & MAHALLA_ROLES:
            return _forbidden("Bu amal mahalla hokim yordamchilari uchun.")
        if body.mahalla_id not in await _mahalla_ids(conn, user_id, roles):
            return _forbidden("Bu mahalla sizga biriktirilmagan.")
        try:
            done = await register_person(
                conn, user_id, first_name=body.first_name, last_name=body.last_name, birth_date=body.birth_date, phone=phone,
                trade_code=body.trade_code, track=body.track, app_type=body.type, experience_years=body.experience_years,
                has_language=body.has_language, mahalla_id=body.mahalla_id, source="MAHALLA",
            )
        except RegistrationError as error:
            return problem(error.status, error.code, error.title, error.detail)
    application_id, matrix = done.application_id, done.matrix
    return JSONResponse({"id": str(application_id), "status": "SUBMITTED", "matrix": matrix})


# ================================================================= employment office + migration agency


EMPLOYMENT_ROLES = {"employment_officer", "admin", "superadmin", "placement_manager"}
AGENCY_ROLES = {"agency_officer", "admin", "superadmin", "placement_manager"}
OBSERVER_ROLES = {"migration_observer", "agency_officer", "admin", "superadmin", "placement_manager"}


async def _free_workers(conn: AsyncConnection, code: str, limit: int = 40) -> list[dict[str, object]]:
    rows = await conn.execute(
        text(
            """
            SELECT wp.slug, u.full_name, u.id::text AS user_id, t.name AS trade, wp.level::text AS level,
                   wp.verified_hours, wp.rating_avg
            FROM worker_profiles wp
            JOIN users u ON u.id = wp.user_id
            LEFT JOIN trades t ON t.id = wp.primary_trade_id
            WHERE wp.availability = 'FREE'
            ORDER BY wp.verified_hours DESC, u.full_name LIMIT :limit
            """
        ),
        {"limit": limit},
    )
    return [
        {
            "slug": r["slug"],
            "name": r["full_name"],
            "user_id": r["user_id"],
            "trade": pick(r["trade"], code),
            "level": r["level"],
            "hours": int(r["verified_hours"] or 0),
            "rating": None if r["rating_avg"] is None else float(r["rating_avg"]),
        }
        for r in rows.mappings()
    ]


@router.get("/employment/overview")
async def employment_overview(request: Request, lang: str | None = None) -> JSONResponse:
    code = _lang(request, lang)
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & EMPLOYMENT_ROLES:
            return _forbidden("Bu bo'lim bandlikka ko'maklashish bo'limi xodimlari uchun.")
        kpi = (
            await conn.execute(
                text(
                    f"""
                    SELECT
                      (SELECT count(*) FROM worker_profiles WHERE availability = 'FREE') AS free_workers,
                      (SELECT count(*) FROM demand_requests WHERE track = 'DOMESTIC' AND status NOT IN {OPEN_STATUSES}) AS open_requests,
                      (SELECT coalesce(sum(quantity), 0) FROM demand_requests WHERE track = 'DOMESTIC' AND status NOT IN {OPEN_STATUSES}) AS open_places,
                      (SELECT count(*) FROM employers WHERE verified_at IS NOT NULL AND kind = 'LOCAL') AS employers,
                      (SELECT count(*) FROM placements) AS placements,
                      (SELECT count(*) FROM certificates WHERE status = 'ISSUED') AS certified
                    """
                )
            )
        ).mappings().one()
        requests = await conn.execute(
            text(
                f"""
                SELECT r.id::text AS id, e.name AS employer, t.name AS trade, r.quantity, r.location, r.status::text AS status,
                       r.created_at::date::text AS created,
                       (SELECT count(*) FROM request_candidates c WHERE c.request_id = r.id) AS candidates
                FROM demand_requests r JOIN employers e ON e.id = r.employer_id JOIN trades t ON t.id = r.trade_id
                WHERE r.track = 'DOMESTIC' AND r.status NOT IN {OPEN_STATUSES}
                ORDER BY r.created_at DESC LIMIT 50
                """
            )
        )
        request_list = [
            {
                "id": r["id"],
                "employer": r["employer"],
                "trade": pick(r["trade"], code),
                "quantity": int(r["quantity"]),
                "location": r["location"],
                "status": r["status"],
                "created": r["created"],
                "candidates": int(r["candidates"]),
            }
            for r in requests.mappings()
        ]
        workers = await _free_workers(conn, code)
        placements = await conn.execute(
            text(
                """
                SELECT u.full_name, e.name AS employer, p.kind::text AS kind, p.start_date::text AS start
                FROM placements p JOIN users u ON u.id = p.worker_user_id JOIN employers e ON e.id = p.employer_id
                ORDER BY p.start_date DESC LIMIT 10
                """
            )
        )
        recent = [{"name": r["full_name"], "employer": r["employer"], "kind": r["kind"], "start": r["start"]} for r in placements.mappings()]
    return JSONResponse({"kpi": {k: _num(v) for k, v in kpi.items()}, "requests": request_list, "workers": workers, "placements": recent})


class ReferIn(BaseModel):
    request_id: uuid.UUID
    worker_user_id: uuid.UUID


@router.post("/panels/refer")
async def refer_worker(body: ReferIn, request: Request) -> JSONResponse:
    """The employment office (domestic requests) or the migration agency (foreign ones) proposes a worker for a vacancy."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        roles = await _roles(conn, user_id)
        row = (await conn.execute(text("SELECT track::text AS track, status::text AS status FROM demand_requests WHERE id = :id"), {"id": body.request_id})).mappings().first()
        if row is None:
            return problem(404, "NOT_FOUND", "So'rov topilmadi", "Bunday vakansiya yo'q.")
        allowed = AGENCY_ROLES if row["track"] == "FOREIGN" else EMPLOYMENT_ROLES
        if not roles & allowed:
            return _forbidden("Bu vakansiyaga nomzod tavsiya qilish huquqingiz yo'q.")
        if row["status"] in {"CLOSED", "CANCELLED", "MATCHED"}:
            return problem(409, "CLOSED", "Vakansiya yopilgan", "Yopilgan vakansiyaga nomzod qo'shib bo'lmaydi.")
        worker = await conn.execute(text("SELECT 1 FROM worker_profiles WHERE user_id = :id"), {"id": body.worker_user_id})
        if worker.first() is None:
            return problem(404, "NOT_FOUND", "Usta topilmadi", "Bu foydalanuvchining usta profili yo'q.")
        duplicate = await conn.execute(
            text("SELECT 1 FROM request_candidates WHERE request_id = :r AND worker_user_id = :w"),
            {"r": body.request_id, "w": body.worker_user_id},
        )
        if duplicate.first() is not None:
            return JSONResponse({"status": "PROPOSED"})
        await conn.execute(
            text("INSERT INTO request_candidates (id, request_id, worker_user_id, status, proposed_by) VALUES (:id, :r, :w, 'PROPOSED', :by)"),
            {"id": new_id(), "r": body.request_id, "w": body.worker_user_id, "by": user_id},
        )
        await notify(conn, body.worker_user_id, "offer", {"request_id": str(body.request_id)})
    return JSONResponse({"status": "PROPOSED"})


@router.get("/migration/overview")
async def migration_overview(request: Request, lang: str | None = None) -> JSONResponse:
    """Foreign vacancies, countries and the pipeline. The republic observer sees the same figures but cannot change anything."""
    code = _lang(request, lang)
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        roles = await _roles(conn, user_id)
        if not roles & OBSERVER_ROLES:
            return _forbidden("Bu bo'lim migratsiya agentligi va respublika nazorat organi uchun.")
        kpi = (
            await conn.execute(
                text(
                    f"""
                    SELECT
                      (SELECT count(*) FROM demand_requests WHERE track = 'FOREIGN') AS vacancies,
                      (SELECT count(*) FROM demand_requests WHERE track = 'FOREIGN' AND status NOT IN {OPEN_STATUSES}) AS open_vacancies,
                      (SELECT coalesce(sum(quantity), 0) FROM demand_requests WHERE track = 'FOREIGN' AND status NOT IN {OPEN_STATUSES}) AS open_places,
                      (SELECT count(*) FROM employers WHERE country_code <> 'UZ') AS foreign_employers,
                      (SELECT count(*) FROM placements WHERE kind = 'ABROAD') AS placed_abroad,
                      (SELECT count(*) FROM brigades) AS brigades
                    """
                )
            )
        ).mappings().one()
        by_country = await conn.execute(
            text(
                f"""
                SELECT coalesce(d.country_code, e.country_code) AS country, count(*) AS vacancies,
                       coalesce(sum(r.quantity) FILTER (WHERE r.status NOT IN {OPEN_STATUSES}), 0) AS places
                FROM demand_requests r JOIN employers e ON e.id = r.employer_id LEFT JOIN destinations d ON d.id = r.destination_id
                WHERE r.track = 'FOREIGN' GROUP BY 1 ORDER BY 2 DESC
                """
            )
        )
        pipeline = await conn.execute(text("SELECT status::text AS status, count(*) AS n FROM demand_requests WHERE track = 'FOREIGN' GROUP BY 1"))
        vacancies = await conn.execute(text(VACANCY_SQL + " WHERE r.track = 'FOREIGN' ORDER BY r.created_at DESC LIMIT 100"))
        vacancy_list = [vacancy_json(r, code) for r in vacancies.mappings()]
        can_manage = bool(roles & AGENCY_ROLES)
        workers = await _free_workers(conn, code, 30) if can_manage else []
    return JSONResponse(
        {
            "can_manage": can_manage,
            "kpi": {k: _num(v) for k, v in kpi.items()},
            "by_country": [{"country": str(r["country"] or "").strip(), "vacancies": int(r["vacancies"]), "places": _num(r["places"])} for r in by_country.mappings()],
            "pipeline": {r["status"]: int(r["n"]) for r in pipeline.mappings()},
            "vacancies": vacancy_list,
            "workers": workers,
        }
    )


class StatusIn(BaseModel):
    status: str


async def _agency_employer(conn: AsyncConnection, user_id: uuid.UUID) -> uuid.UUID | None:
    row = (
        await conn.execute(
            text(
                """
                SELECT e.id FROM employers e LEFT JOIN employer_members m ON m.employer_id = e.id AND m.user_id = :id
                WHERE e.kind = 'AGENCY' ORDER BY (m.user_id IS NOT NULL) DESC, e.name LIMIT 1
                """
            ),
            {"id": user_id},
        )
    ).scalar()
    return None if row is None else uuid.UUID(str(row))


@router.post("/migration/vacancies/{vacancy_id}/status")
async def migration_status(vacancy_id: uuid.UUID, body: StatusIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    if body.status not in FOREIGN_STATUSES:
        return problem(422, "VALIDATION", "Holat noto'g'ri", "Ro'yxatdagi holatni tanlang.")
    async with _engine(request).begin() as conn:
        if not await _roles(conn, user_id) & AGENCY_ROLES:
            return _forbidden("Vakansiya holatini migratsiya agentligi xodimi o'zgartiradi.")
        agency = await _agency_employer(conn, user_id)
        if agency is None and body.status != "CANCELLED":
            return problem(409, "NO_AGENCY", "Agentlik biriktirilmagan", "Avval hisobingizga migratsiya agentligi tashkilotini biriktiring.")
        row = (
            await conn.execute(
                text(
                    """
                    UPDATE demand_requests
                    SET status = CAST(:status AS request_status), agency_id = coalesce(agency_id, :agency),
                        first_response_at = coalesce(first_response_at, now())
                    WHERE id = :id AND track = 'FOREIGN' RETURNING employer_id
                    """
                ),
                {"status": body.status, "agency": agency, "id": vacancy_id},
            )
        ).first()
        if row is None:
            return problem(404, "NOT_FOUND", "Vakansiya topilmadi", "Bunday tashqi vakansiya yo'q.")
        members = await conn.execute(text("SELECT user_id FROM employer_members WHERE employer_id = :e"), {"e": row[0]})
        for (member,) in members.all():
            await notify(conn, member, "vacancy_status", {"vacancy_id": str(vacancy_id), "status": body.status})
    return JSONResponse({"status": body.status})


@router.get("/migration/export.csv", response_model=None)
async def migration_export(request: Request) -> Response:
    """Vacancies by country, no personal data. For the agency and the republic observer."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & OBSERVER_ROLES:
            return _forbidden("Bu hisobot migratsiya agentligi va respublika nazorat organi uchun.")
        rows = await conn.execute(text(VACANCY_SQL + " WHERE r.track = 'FOREIGN' ORDER BY r.created_at DESC"))
        items = [vacancy_json(r, "uz-Latn") for r in rows.mappings()]
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["country", "employer", "trade", "places", "currency", "salary_from", "salary_to", "status", "candidates", "created"])
    for v in items:
        writer.writerow([v["country"], v["employer"], v["trade"], v["quantity"], v["currency"], v["salary_from"], v["salary_to"], v["status"], v["candidates"], v["created"]])
    return Response(
        content="﻿" + out.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="migration-vacancies.csv"'},
    )
