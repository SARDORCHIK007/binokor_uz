"""Employment office: a registry of everyone who studies or works within the project, intake of job seekers and partners,
and direct placements. Phone numbers are never returned.
"""

import csv
import io
import re
import uuid
from datetime import date
from typing import Any, Literal

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.doc_i18n import current_lang, pick
from app.inapp import notify
from app.ratelimit import too_many
from app.registration import RegistrationError, register_person
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/employment", tags=["employment"])

EMPLOYMENT_ROLES = {"employment_officer", "admin", "superadmin", "placement_manager"}
STAGES = ("APPLIED", "ACCEPTED", "STUDYING", "CERTIFIED", "FREE", "WORKING", "CLOSED")
PHONE = re.compile(r"^\+998[0-9]{9}$")


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
    return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu bo'lim bandlikka ko'maklashish bo'limi xodimlari uchun.")


async def _allowed(conn: AsyncConnection, user_id: uuid.UUID) -> bool:
    rows = await conn.execute(text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"), {"id": user_id})
    return bool({str(r["role"]) for r in rows.mappings()} & EMPLOYMENT_ROLES)


PEOPLE_SQL = """
    SELECT p.id::text AS id, p.last_name, p.first_name, p.user_id::text AS user_id, m.name AS mahalla,
           a.status::text AS app_status, a.source, a.created_at::date::text AS applied, t.name AS trade, t.code AS trade_code,
           en.code AS group_code, en.status AS enroll_status,
           EXISTS (SELECT 1 FROM certificates c WHERE c.person_id = p.id AND c.status = 'ISSUED') AS certified,
           EXISTS (SELECT 1 FROM placements pl WHERE pl.worker_user_id = p.user_id) AS employed,
           wp.availability::text AS availability, wp.slug, coalesce(wp.verified_hours, 0) AS hours
    FROM persons p
    LEFT JOIN LATERAL (SELECT * FROM applications x WHERE x.person_id = p.id AND x.status <> 'DRAFT' ORDER BY x.created_at DESC LIMIT 1) a ON TRUE
    LEFT JOIN trades t ON t.id = coalesce(a.desired_trade_id, (SELECT primary_trade_id FROM worker_profiles w WHERE w.user_id = p.user_id))
    LEFT JOIN mahallas m ON m.id = p.mahalla_id
    LEFT JOIN LATERAL (
        SELECT e.status::text AS status, g.code FROM enrollments e JOIN groups g ON g.id = e.group_id
        WHERE e.student_user_id = p.user_id ORDER BY e.enrolled_at DESC LIMIT 1
    ) en ON TRUE
    LEFT JOIN worker_profiles wp ON wp.user_id = p.user_id
    WHERE a.id IS NOT NULL OR wp.user_id IS NOT NULL
"""


def stage_of(row: dict[str, Any]) -> str:
    if row["employed"] or row["availability"] == "BUSY":
        return "WORKING"
    if row["availability"] == "FREE":
        return "FREE"
    if row["certified"]:
        return "CERTIFIED"
    if row["enroll_status"] == "ACTIVE":
        return "STUDYING"
    if row["app_status"] in {"ACCEPTED", "ENROLLED"}:
        return "ACCEPTED"
    if row["app_status"] in {"REJECTED", "WITHDRAWN"}:
        return "CLOSED"
    return "APPLIED"


async def registry(conn: AsyncConnection, code: str) -> list[dict[str, object]]:
    rows = await conn.execute(text(PEOPLE_SQL + " ORDER BY a.created_at DESC NULLS LAST, p.last_name LIMIT 600"))
    items = []
    for r in rows.mappings():
        row = dict(r)
        items.append(
            {
                "id": row["id"],
                "user_id": row["user_id"],
                "name": f"{row['last_name']} {row['first_name']}",
                "trade": pick(row["trade"], code),
                "trade_code": row["trade_code"],
                "mahalla": pick(row["mahalla"], code),
                "group": row["group_code"],
                "source": row["source"],
                "applied": row["applied"],
                "certified": bool(row["certified"]),
                "hours": int(row["hours"]),
                "slug": row["slug"],
                "stage": stage_of(row),
            }
        )
    return items


@router.get("/people")
async def people(request: Request, lang: str | None = None, stage: str | None = None, trade: str | None = None, q: str | None = None) -> JSONResponse:
    code = current_lang()
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _allowed(conn, user_id):
            return _forbidden()
        items = await registry(conn, code)
        trades = await conn.execute(text("SELECT code, name FROM trades WHERE is_active ORDER BY code"))
        trade_list = [{"code": r["code"], "name": pick(r["name"], code)} for r in trades.mappings()]
    counts = {name: sum(1 for item in items if item["stage"] == name) for name in STAGES}
    shown = [
        item
        for item in items
        if (not stage or item["stage"] == stage)
        and (not trade or item["trade_code"] == trade)
        and (not q or q.strip().lower() in str(item["name"]).lower())
    ]
    return JSONResponse({"counts": counts, "total": len(items), "people": shown[:300], "trades": trade_list})


@router.get("/people.csv", response_model=None)
async def people_csv(request: Request) -> Response:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _allowed(conn, user_id):
            return _forbidden()
        items = await registry(conn, "uz-Latn")
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["name", "stage", "trade", "group", "mahalla", "hours", "certified", "applied", "source"])
    for item in items:
        writer.writerow([item["name"], item["stage"], item["trade"], item["group"] or "", item["mahalla"], item["hours"], item["certified"], item["applied"] or "", item["source"] or ""])
    return Response(
        content="﻿" + out.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="uychi-binokor-reestr.csv"'},
    )


class SeekerIn(BaseModel):
    first_name: str = Field(min_length=2, max_length=80)
    last_name: str = Field(min_length=2, max_length=80)
    birth_date: date
    phone: str
    trade_code: str
    track: Literal["DOMESTIC", "FOREIGN"] = "DOMESTIC"
    type: Literal["YOUTH", "WORKER_UPSKILL", "UNIVERSITY_GRAD"] = "WORKER_UPSKILL"
    experience_years: float = Field(default=0, ge=0, le=40)
    has_language: bool = False
    mahalla_id: uuid.UUID | None = None
    consent_confirmed: bool


@router.post("/seekers")
async def add_seeker(body: SeekerIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    limited = await too_many(request, "employment-add", str(user_id), limit=100, window_seconds=86400)
    if limited is not None:
        return limited
    if not body.consent_confirmed:
        return problem(422, "CONSENT_REQUIRED", "Rozilik kerak", "Shaxsiy ma'lumotlarni qayta ishlashga yozma rozilik olinganini tasdiqlang.")
    phone = body.phone.replace(" ", "")
    if not PHONE.match(phone):
        return problem(422, "VALIDATION", "Telefon noto'g'ri", "Telefon +998XXXXXXXXX ko'rinishida bo'lishi kerak.")
    async with _engine(request).begin() as conn:
        if not await _allowed(conn, user_id):
            return _forbidden()
        try:
            done = await register_person(
                conn, user_id, first_name=body.first_name, last_name=body.last_name, birth_date=body.birth_date, phone=phone,
                trade_code=body.trade_code, track=body.track, app_type=body.type, experience_years=body.experience_years,
                has_language=body.has_language, mahalla_id=body.mahalla_id, source="IMPORT",
            )
        except RegistrationError as error:
            return problem(error.status, error.code, error.title, error.detail)
    return JSONResponse({"id": str(done.application_id), "status": "SUBMITTED", "matrix": done.matrix})


class PartnerAdd(BaseModel):
    org_name: str = Field(min_length=2, max_length=200)
    kind: Literal["GOV", "EDU", "INTL", "EMPLOYER", "AGENCY", "PRODUCER"]
    country_code: str | None = Field(default="UZ", min_length=2, max_length=2)
    contact_name: str = Field(min_length=3, max_length=120)
    phone: str = Field(min_length=7, max_length=20)
    email: str | None = Field(default=None, max_length=120)
    message: str | None = Field(default=None, max_length=2000)


@router.post("/partners")
async def add_partner(body: PartnerAdd, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    phone = body.phone.replace(" ", "")
    if not phone.startswith("+") or not phone[1:].isdigit():
        return problem(422, "VALIDATION", "Telefon noto'g'ri", "Telefonni xalqaro formatda kiriting.")
    async with _engine(request).begin() as conn:
        if not await _allowed(conn, user_id):
            return _forbidden()
        request_id = new_id()
        await conn.execute(
            text(
                """
                INSERT INTO partner_requests (id, org_name, kind, country_code, contact_name, phone, email, message, submitted_by)
                VALUES (:id, :org, :kind, :country, :contact, :phone, :email, :message, :by)
                """
            ),
            {"id": request_id, "org": body.org_name.strip(), "kind": body.kind, "country": (body.country_code or "UZ").upper(), "contact": body.contact_name.strip(), "phone": phone[:13], "email": (body.email or "").strip() or None, "message": (body.message or "").strip() or None, "by": user_id},
        )
        admins = await conn.execute(text("SELECT DISTINCT user_id FROM user_roles WHERE role IN ('admin', 'superadmin')"))
        for (admin,) in admins.all():
            await notify(conn, admin, "partner_request", {"org": body.org_name.strip()})
    return JSONResponse({"id": str(request_id), "status": "NEW"})


@router.get("/partners")
async def my_partner_requests(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _allowed(conn, user_id):
            return _forbidden()
        rows = await conn.execute(
            text("SELECT id::text AS id, org_name, kind, status, created_at::date::text AS created FROM partner_requests WHERE submitted_by = :id ORDER BY created_at DESC LIMIT 50"),
            {"id": user_id},
        )
        return JSONResponse([dict(r) for r in rows.mappings()])


@router.get("/options")
async def options(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _allowed(conn, user_id):
            return _forbidden()
        employers = await conn.execute(text("SELECT id::text AS id, name FROM employers WHERE kind = 'LOCAL' AND verified_at IS NOT NULL ORDER BY name"))
        mahallas = await conn.execute(text("SELECT id::text AS id, name FROM mahallas ORDER BY name->>'uz-Latn'"))
        trades = await conn.execute(text("SELECT code, name FROM trades WHERE is_active ORDER BY code"))
        return JSONResponse(
            {
                "employers": [dict(r) for r in employers.mappings()],
                "mahallas": [{"id": r["id"], "name": pick(r["name"], current_lang())} for r in mahallas.mappings()],
                "trades": [{"code": r["code"], "name": pick(r["name"], current_lang())} for r in trades.mappings()],
            }
        )


class PlacementIn(BaseModel):
    worker_user_id: uuid.UUID
    employer_id: uuid.UUID
    start_date: date
    monthly_salary: float | None = Field(default=None, ge=0)


@router.post("/placements")
async def place_worker(body: PlacementIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        if not await _allowed(conn, user_id):
            return _forbidden()
        worker = await conn.execute(text("SELECT 1 FROM worker_profiles WHERE user_id = :id"), {"id": body.worker_user_id})
        if worker.first() is None:
            return problem(404, "NOT_FOUND", "Usta topilmadi", "Bu foydalanuvchining usta profili yo'q.")
        employer = await conn.execute(text("SELECT 1 FROM employers WHERE id = :id AND kind = 'LOCAL' AND verified_at IS NOT NULL"), {"id": body.employer_id})
        if employer.first() is None:
            return problem(404, "NOT_FOUND", "Ish beruvchi topilmadi", "Tasdiqlangan mahalliy ish beruvchini tanlang.")
        busy = await conn.execute(text("SELECT 1 FROM placements WHERE worker_user_id = :w AND (end_date IS NULL OR end_date >= CURRENT_DATE)"), {"w": body.worker_user_id})
        if busy.first() is not None:
            return problem(409, "ALREADY_PLACED", "Usta band", "Bu usta hozir ishga joylashtirilgan.")
        await conn.execute(
            text(
                "INSERT INTO placements (id, worker_user_id, employer_id, kind, start_date, monthly_salary) VALUES (:id, :w, :e, 'DIRECT', :start, :salary)"
            ),
            {"id": new_id(), "w": body.worker_user_id, "e": body.employer_id, "start": body.start_date, "salary": body.monthly_salary},
        )
        await conn.execute(text("UPDATE worker_profiles SET availability = 'BUSY' WHERE user_id = :w"), {"w": body.worker_user_id})
        await notify(conn, body.worker_user_id, "placement", {"employer_id": str(body.employer_id)})
    return JSONResponse({"status": "placed"})
