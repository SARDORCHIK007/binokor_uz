"""University office: graduates who might want to work abroad and are invited to study in Uychi Binokor.

The office keeps a list (typed in or pasted), follows each person through contacted / interested / applied, and can turn
a lead into a real application.
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

from app.doc_i18n import current_lang, pick
from app.registration import RegistrationError, register_person
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/graduates", tags=["graduates"])

UNIVERSITY_ROLES = {"university_officer", "admin", "superadmin"}
STATUSES = ("NEW", "CONTACTED", "INTERESTED", "APPLIED", "DECLINED")
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
    return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu bo'lim universitet vakillari uchun.")


async def _partner(conn: AsyncConnection, user_id: uuid.UUID) -> tuple[uuid.UUID, str] | None:
    """The education partner this person works for; an administrator works with the first education partner."""
    roles = {str(r["role"]) for r in (await conn.execute(text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"), {"id": user_id})).mappings()}
    if not roles & UNIVERSITY_ROLES:
        return None
    row = (
        await conn.execute(
            text(
                """
                SELECT p.id, p.name->>'uz-Latn' AS name FROM partners p
                LEFT JOIN partner_members m ON m.partner_id = p.id AND m.user_id = :id
                WHERE p.kind = 'EDU' ORDER BY (m.user_id IS NOT NULL) DESC, p.sort_order LIMIT 1
                """
            ),
            {"id": user_id},
        )
    ).mappings().first()
    return None if row is None else (uuid.UUID(str(row["id"])), str(row["name"]))


@router.get("")
async def overview(request: Request, status: str | None = None) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        partner = await _partner(conn, user_id)
        if partner is None:
            return _forbidden()
        pid, name = partner
        counts = {s: 0 for s in STATUSES}
        for r in (await conn.execute(text("SELECT status, count(*) AS n FROM graduate_leads WHERE partner_id = :p GROUP BY 1"), {"p": pid})).mappings():
            counts[str(r["status"])] = int(r["n"])
        abroad = (await conn.execute(text("SELECT count(*) FROM graduate_leads WHERE partner_id = :p AND abroad_interest"), {"p": pid})).scalar_one()
        in_project = (
            await conn.execute(
                text(
                    """
                    SELECT count(DISTINCT p.id) AS people,
                           count(DISTINCT p.id) FILTER (WHERE EXISTS (SELECT 1 FROM enrollments e WHERE e.student_user_id = p.user_id AND e.status = 'ACTIVE')) AS studying,
                           count(DISTINCT p.id) FILTER (WHERE EXISTS (SELECT 1 FROM certificates c WHERE c.person_id = p.id AND c.status = 'ISSUED')) AS certified
                    FROM persons p WHERE p.university = :name
                    """
                ),
                {"name": name},
            )
        ).mappings().one()
        rows = await conn.execute(
            text(
                """
                SELECT id::text AS id, full_name, specialty, graduation_year, abroad_interest, status, note, created_at::date::text AS created,
                       follow_up::text AS follow_up, last_contact::text AS last_contact, (follow_up IS NOT NULL AND follow_up <= current_date AND status NOT IN ('APPLIED', 'DECLINED')) AS due
                FROM graduate_leads WHERE partner_id = :p AND (CAST(:status AS text) IS NULL OR status = :status)
                ORDER BY created_at DESC LIMIT 400
                """
            ),
            {"p": pid, "status": status if status in STATUSES else None},
        )
        leads = [dict(r) for r in rows.mappings()]
        trades = await conn.execute(text("SELECT code, name FROM trades WHERE is_active ORDER BY code"))
        trade_code = current_lang()
        trade_list = [{"code": r["code"], "name": pick(r["name"], trade_code)} for r in trades.mappings()]
    return JSONResponse(
        {
            "university": name,
            "counts": counts,
            "total": sum(counts.values()),
            "abroad": int(abroad),
            "in_project": {k: int(v) for k, v in in_project.items()},
            "leads": leads,
            "trades": trade_list,
        }
    )


class LeadIn(BaseModel):
    full_name: str = Field(min_length=3, max_length=160)
    phone: str
    specialty: str | None = Field(default=None, max_length=160)
    graduation_year: int | None = Field(default=None, ge=1990, le=2100)
    abroad_interest: bool = True
    note: str | None = Field(default=None, max_length=500)


async def _insert_lead(conn: AsyncConnection, partner_id: uuid.UUID, user_id: uuid.UUID, body: LeadIn) -> str | None:
    phone = body.phone.replace(" ", "")
    if not PHONE.match(phone):
        return "Telefon +998XXXXXXXXX ko'rinishida bo'lishi kerak."
    exists = await conn.execute(text("SELECT 1 FROM graduate_leads WHERE partner_id = :p AND phone = :phone"), {"p": partner_id, "phone": phone})
    if exists.first() is not None:
        return "Bu telefon raqami ro'yxatda bor."
    await conn.execute(
        text(
            """
            INSERT INTO graduate_leads (id, partner_id, full_name, phone, specialty, graduation_year, abroad_interest, note, created_by)
            VALUES (:id, :p, :name, :phone, :spec, :year, :abroad, :note, :by)
            """
        ),
        {"id": new_id(), "p": partner_id, "name": body.full_name.strip(), "phone": phone, "spec": (body.specialty or "").strip() or None, "year": body.graduation_year, "abroad": body.abroad_interest, "note": (body.note or "").strip() or None, "by": user_id},
    )
    return None


@router.post("")
async def add_lead(body: LeadIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        partner = await _partner(conn, user_id)
        if partner is None:
            return _forbidden()
        error = await _insert_lead(conn, partner[0], user_id, body)
    if error:
        return problem(422, "VALIDATION", "Qo'shilmadi", error)
    return JSONResponse({"status": "NEW"})


class BulkIn(BaseModel):
    lines: str = Field(max_length=40000)
    abroad_interest: bool = True


@router.post("/bulk")
async def add_bulk(body: BulkIn, request: Request) -> JSONResponse:
    """One graduate per line: `+998901234567, Familiya Ism, Mutaxassislik, 2025`."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    lines = [line.strip() for line in body.lines.splitlines() if line.strip()]
    if not lines or len(lines) > 500:
        return problem(422, "VALIDATION", "Ro'yxat noto'g'ri", "1 dan 500 gacha qator kiriting.")
    created = 0
    failed: list[dict[str, str]] = []
    async with _engine(request).begin() as conn:
        partner = await _partner(conn, user_id)
        if partner is None:
            return _forbidden()
        for line in lines:
            parts = [part.strip() for part in re.split(r"[;,\t]", line)]
            if len(parts) < 2 or len(parts[1]) < 3:
                failed.append({"line": line, "error": "Telefon va ism kerak."})
                continue
            year = int(parts[3]) if len(parts) > 3 and parts[3].isdigit() else None
            try:
                lead = LeadIn(full_name=parts[1], phone=parts[0], specialty=parts[2] if len(parts) > 2 else None, graduation_year=year, abroad_interest=body.abroad_interest)
            except ValueError:
                failed.append({"line": line, "error": "Qator noto'g'ri."})
                continue
            error = await _insert_lead(conn, partner[0], user_id, lead)
            if error:
                failed.append({"line": line, "error": error})
            else:
                created += 1
    return JSONResponse({"created": created, "failed": failed})


class StatusIn(BaseModel):
    status: Literal["NEW", "CONTACTED", "INTERESTED", "APPLIED", "DECLINED"]
    note: str | None = Field(default=None, max_length=500)


@router.post("/{lead_id}/status")
async def set_status(lead_id: uuid.UUID, body: StatusIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        partner = await _partner(conn, user_id)
        if partner is None:
            return _forbidden()
        done = await conn.execute(
            text("UPDATE graduate_leads SET status = :s, note = coalesce(:note, note), updated_at = now() WHERE id = :id AND partner_id = :p RETURNING id"),
            {"s": body.status, "note": (body.note or "").strip() or None, "id": lead_id, "p": partner[0]},
        )
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Topilmadi", "Bunday bitiruvchi yo'q.")
    return JSONResponse({"status": body.status})


class ConvertIn(BaseModel):
    trade_code: str
    birth_date: date
    track: Literal["DOMESTIC", "FOREIGN"] = "FOREIGN"
    experience_years: float = Field(default=0, ge=0, le=40)
    has_language: bool = False
    consent_confirmed: bool


@router.post("/{lead_id}/convert")
async def convert(lead_id: uuid.UUID, body: ConvertIn, request: Request) -> JSONResponse:
    """Turn a lead into an application (type UNIVERSITY_GRAD) once the graduate agrees."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    if not body.consent_confirmed:
        return problem(422, "CONSENT_REQUIRED", "Rozilik kerak", "Shaxsiy ma'lumotlarni qayta ishlashga yozma rozilik olinganini tasdiqlang.")
    async with _engine(request).begin() as conn:
        partner = await _partner(conn, user_id)
        if partner is None:
            return _forbidden()
        lead = (
            await conn.execute(
                text("SELECT full_name, phone, graduation_year, application_id FROM graduate_leads WHERE id = :id AND partner_id = :p"),
                {"id": lead_id, "p": partner[0]},
            )
        ).mappings().first()
        if lead is None:
            return problem(404, "NOT_FOUND", "Topilmadi", "Bunday bitiruvchi yo'q.")
        if lead["application_id"] is not None:
            return problem(409, "DUPLICATE", "Ariza bor", "Bu bitiruvchi uchun ariza allaqachon yaratilgan.")
        pieces = str(lead["full_name"]).split()
        last = pieces[0]
        first = " ".join(pieces[1:]) or pieces[0]
        try:
            done = await register_person(
                conn, user_id, first_name=first, last_name=last, birth_date=body.birth_date, phone=str(lead["phone"]),
                trade_code=body.trade_code, track=body.track, app_type="UNIVERSITY_GRAD", experience_years=body.experience_years,
                has_language=body.has_language, mahalla_id=None, source="IMPORT", university=partner[1], graduation_year=lead["graduation_year"],
            )
        except RegistrationError as error:
            return problem(error.status, error.code, error.title, error.detail)
        await conn.execute(
            text("UPDATE graduate_leads SET status = 'APPLIED', application_id = :a, updated_at = now() WHERE id = :id"),
            {"a": done.application_id, "id": lead_id},
        )
    return JSONResponse({"application_id": str(done.application_id), "matrix": done.matrix})


@router.delete("/{lead_id}")
async def delete_lead(lead_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        partner = await _partner(conn, user_id)
        if partner is None:
            return _forbidden()
        done = await conn.execute(
            text("DELETE FROM graduate_leads WHERE id = :id AND partner_id = :p AND application_id IS NULL RETURNING id"), {"id": lead_id, "p": partner[0]}
        )
        if done.first() is None:
            return problem(409, "CANNOT_DELETE", "O'chirib bo'lmadi", "Arizasi yaratilgan bitiruvchini o'chirib bo'lmaydi.")
    return JSONResponse({"status": "deleted"})


class FollowIn(BaseModel):
    follow_up: date | None = None
    contacted: bool = False


@router.post("/{lead_id}/follow-up")
async def follow_up(lead_id: uuid.UUID, body: FollowIn, request: Request) -> JSONResponse:
    """Set the next day to call a graduate, and optionally record that they were contacted today."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    if body.follow_up is not None and body.follow_up < date.today():
        return problem(422, "VALIDATION", "Sana noto'g'ri", "Keyingi bog'lanish sanasi o'tib ketgan bo'lmasin.")
    async with _engine(request).begin() as conn:
        partner = await _partner(conn, user_id)
        if partner is None:
            return _forbidden()
        done = await conn.execute(
            text(
                """
                UPDATE graduate_leads SET follow_up = :d, last_contact = CASE WHEN :c THEN current_date ELSE last_contact END,
                       status = CASE WHEN :c AND status = 'NEW' THEN 'CONTACTED' ELSE status END, updated_at = now()
                WHERE id = :id AND partner_id = :p RETURNING id
                """
            ),
            {"d": body.follow_up, "c": body.contacted, "id": lead_id, "p": partner[0]},
        )
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Topilmadi", "Bunday bitiruvchi yo'q.")
    return JSONResponse({"status": "saved"})


@router.get("/outcomes")
async def outcomes(request: Request) -> JSONResponse:
    """How the university's graduates fare in the project: from the call list to a certificate and a job."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        partner = await _partner(conn, user_id)
        if partner is None:
            return _forbidden()
        pid, name = partner
        leads = (
            await conn.execute(
                text(
                    """
                    SELECT coalesce(graduation_year::text, '—') AS year, count(*) AS leads,
                           count(*) FILTER (WHERE status IN ('INTERESTED', 'APPLIED')) AS interested,
                           count(*) FILTER (WHERE status = 'APPLIED') AS applied,
                           count(*) FILTER (WHERE follow_up IS NOT NULL AND follow_up <= current_date AND status NOT IN ('APPLIED', 'DECLINED')) AS due
                    FROM graduate_leads WHERE partner_id = :p GROUP BY 1 ORDER BY 1 DESC
                    """
                ),
                {"p": pid},
            )
        ).mappings().all()
        people = (
            await conn.execute(
                text(
                    """
                    SELECT coalesce(p.graduation_year::text, '—') AS year, count(*) AS people,
                           count(*) FILTER (WHERE EXISTS (SELECT 1 FROM enrollments e WHERE e.student_user_id = p.user_id AND e.status IN ('ACTIVE', 'COMPLETED'))) AS studying,
                           count(*) FILTER (WHERE EXISTS (SELECT 1 FROM certificates c WHERE c.person_id = p.id AND c.status = 'ISSUED')) AS certified,
                           count(*) FILTER (WHERE EXISTS (SELECT 1 FROM placements pl WHERE pl.worker_user_id = p.user_id)) AS employed,
                           count(*) FILTER (WHERE EXISTS (SELECT 1 FROM placements pl WHERE pl.worker_user_id = p.user_id AND pl.kind = 'ABROAD')) AS abroad
                    FROM persons p WHERE p.university = :n GROUP BY 1 ORDER BY 1 DESC
                    """
                ),
                {"n": name},
            )
        ).mappings().all()
    years = sorted({str(r["year"]) for r in leads} | {str(r["year"]) for r in people}, reverse=True)
    by_leads = {str(r["year"]): r for r in leads}
    by_people = {str(r["year"]): r for r in people}
    rows: list[dict[str, str | int]] = []
    for year in years:
        a = by_leads.get(year)
        b = by_people.get(year)
        rows.append(
            {
                "year": year,
                "leads": int(a["leads"]) if a else 0,
                "interested": int(a["interested"]) if a else 0,
                "applied": int(a["applied"]) if a else 0,
                "due": int(a["due"]) if a else 0,
                "people": int(b["people"]) if b else 0,
                "studying": int(b["studying"]) if b else 0,
                "certified": int(b["certified"]) if b else 0,
                "employed": int(b["employed"]) if b else 0,
                "abroad": int(b["abroad"]) if b else 0,
            }
        )
    totals = {key: sum(int(str(r[key])) for r in rows) for key in ("leads", "interested", "applied", "due", "people", "studying", "certified", "employed", "abroad")}
    return JSONResponse({"university": name, "years": rows, "totals": totals})


@router.get("/export.csv", response_model=None)
async def export_csv(request: Request) -> Response:
    """The call list without phone numbers: for reports to the rector's office."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        partner = await _partner(conn, user_id)
        if partner is None:
            return _forbidden()
        rows = await conn.execute(
            text("SELECT full_name, specialty, graduation_year, abroad_interest, status, last_contact::text AS last_contact, follow_up::text AS follow_up FROM graduate_leads WHERE partner_id = :p ORDER BY created_at DESC"),
            {"p": partner[0]},
        )
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow(["name", "specialty", "graduation_year", "abroad_interest", "status", "last_contact", "follow_up"])
        for r in rows.mappings():
            writer.writerow([r["full_name"], r["specialty"] or "", r["graduation_year"] or "", r["abroad_interest"], r["status"], r["last_contact"] or "", r["follow_up"] or ""])
    return Response(
        content="﻿" + out.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="graduates.csv"'},
    )
