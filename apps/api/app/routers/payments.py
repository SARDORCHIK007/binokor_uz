"""Stipend payments (employment office): an internal ledger for learners who live in the home district.

Flow: a program sets the monthly amount and the minimum attendance (80% by default, BR-09) -> a monthly batch is calculated
from the attendance journal -> people who do not qualify are HELD with a reason -> a second person approves -> the batch is
marked paid after the treasury has paid. Bank or card details are never stored; the treasury pays from the exported list.
Nothing here is shown on public pages or to learners.
"""

import csv
import io
import json
import re
import uuid
from datetime import date
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.doc_i18n import lang_of, pick
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])

PAY_ROLES = {"employment_officer", "admin", "superadmin"}
HOME_DISTRICT = "Uychi"
PERIOD = re.compile(r"^[0-9]{4}-(0[1-9]|1[0-2])$")
HOLD_REASONS = {"NO_MAHALLA", "OTHER_DISTRICT", "NO_LESSONS", "LOW_ATTENDANCE", "MANUAL"}


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


async def _roles(conn: AsyncConnection, user_id: uuid.UUID) -> set[str]:
    rows = await conn.execute(text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"), {"id": user_id})
    return {str(r["role"]) for r in rows.mappings()}


async def _log(conn: AsyncConnection, batch_id: uuid.UUID, user_id: uuid.UUID, action: str, detail: dict[str, Any] | None = None, payment_id: uuid.UUID | None = None) -> None:
    await conn.execute(
        text("INSERT INTO payment_log (id, batch_id, payment_id, user_id, action, detail) VALUES (:id, :b, :p, :u, :a, CAST(:d AS jsonb))"),
        {"id": new_id(), "b": batch_id, "p": payment_id, "u": user_id, "a": action, "d": json.dumps(detail or {}, ensure_ascii=False, default=str)},
    )


def _month_bounds(period: str) -> tuple[date, date]:
    year, month = int(period[:4]), int(period[5:7])
    first = date(year, month, 1)
    last = date(year + (month == 12), (month % 12) + 1, 1)
    return first, last  # [first, last)


async def _calculate(conn: AsyncConnection, batch_id: uuid.UUID, program: dict[str, Any], period: str) -> dict[str, int]:
    """(Re)build the payment lines of a batch from enrolments and the attendance journal."""
    first, last = _month_bounds(period)
    await conn.execute(text("DELETE FROM payments WHERE batch_id = :b"), {"b": batch_id})
    rows = await conn.execute(
        text(
            """
            SELECT e.id AS enrollment_id, p.id AS person_id, p.mahalla_id, m.district,
                   count(a.id) AS lessons, count(a.id) FILTER (WHERE a.status IN ('PRESENT', 'LATE')) AS present
            FROM enrollments e
            JOIN persons p ON p.user_id = e.student_user_id
            LEFT JOIN mahallas m ON m.id = p.mahalla_id
            LEFT JOIN attendance a ON a.enrollment_id = e.id AND a.date >= :first AND a.date < :last
            WHERE e.status IN ('ACTIVE', 'COMPLETED') AND e.enrolled_at < :last AND (e.completed_at IS NULL OR e.completed_at >= :first)
            GROUP BY e.id, p.id, p.mahalla_id, m.district
            """
        ),
        {"first": first, "last": last},
    )
    counts = {"ELIGIBLE": 0, "HELD": 0}
    for r in rows.mappings():
        lessons, present = int(r["lessons"]), int(r["present"])
        pct = None if lessons == 0 else round(100.0 * present / lessons, 1)
        reason = None
        if r["mahalla_id"] is None:
            reason = "NO_MAHALLA"
        elif str(r["district"]) != HOME_DISTRICT:
            reason = "OTHER_DISTRICT"
        elif lessons == 0:
            reason = "NO_LESSONS"
        elif pct is not None and pct < int(program["min_attendance"]):
            reason = "LOW_ATTENDANCE"
        status = "HELD" if reason else "ELIGIBLE"
        counts[status] += 1
        await conn.execute(
            text(
                """
                INSERT INTO payments (id, batch_id, person_id, enrollment_id, amount, lessons, present, attendance_pct, status, hold_reason)
                VALUES (:id, :b, :p, :e, :amount, :lessons, :present, :pct, :status, :reason)
                """
            ),
            {"id": new_id(), "b": batch_id, "p": r["person_id"], "e": r["enrollment_id"], "amount": 0 if reason else program["monthly_amount"], "lessons": lessons, "present": present, "pct": pct, "status": status, "reason": reason},
        )
    return counts


# ----------------------------------------------------------------- programs


@router.get("/overview")
async def overview(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & PAY_ROLES:
            return _forbidden()
        programs = await conn.execute(text("SELECT id::text AS id, name, monthly_amount, min_attendance, active FROM payment_programs ORDER BY active DESC, created_at DESC"))
        program_list = [{"id": r["id"], "name": r["name"], "monthly_amount": float(r["monthly_amount"]), "min_attendance": int(r["min_attendance"]), "active": bool(r["active"])} for r in programs.mappings()]
        batches = await conn.execute(
            text(
                """
                SELECT b.id::text AS id, b.period, b.status, pr.name AS program, b.created_at::date::text AS created,
                       count(p.id) FILTER (WHERE p.status IN ('ELIGIBLE', 'PAID')) AS payees, count(p.id) FILTER (WHERE p.status = 'HELD') AS held,
                       coalesce(sum(p.amount) FILTER (WHERE p.status IN ('ELIGIBLE', 'PAID')), 0) AS total
                FROM payment_batches b JOIN payment_programs pr ON pr.id = b.program_id LEFT JOIN payments p ON p.batch_id = b.id
                GROUP BY b.id, pr.name ORDER BY b.period DESC, b.created_at DESC LIMIT 60
                """
            )
        )
        batch_list = [{"id": r["id"], "period": r["period"], "status": r["status"], "program": r["program"], "created": r["created"], "payees": int(r["payees"]), "held": int(r["held"]), "total": float(r["total"])} for r in batches.mappings()]
        year = str(date.today().year)
        stats = (
            await conn.execute(
                text(
                    """
                    SELECT coalesce(sum(p.amount) FILTER (WHERE b.status = 'PAID' AND p.status = 'PAID'), 0) AS paid_year,
                           count(DISTINCT p.person_id) FILTER (WHERE b.status = 'PAID' AND p.status = 'PAID') AS people_paid,
                           coalesce(sum(p.amount) FILTER (WHERE b.status IN ('DRAFT', 'APPROVED') AND p.status = 'ELIGIBLE'), 0) AS pending,
                           count(p.id) FILTER (WHERE b.status IN ('DRAFT', 'APPROVED') AND p.status = 'HELD') AS held_open
                    FROM payment_batches b LEFT JOIN payments p ON p.batch_id = b.id WHERE left(b.period, 4) = :year
                    """
                ),
                {"year": year},
            )
        ).mappings().one()
    return JSONResponse(
        {
            "programs": program_list,
            "batches": batch_list,
            "stats": {"paid_year": float(stats["paid_year"]), "people_paid": int(stats["people_paid"]), "pending": float(stats["pending"]), "held_open": int(stats["held_open"])},
            "home_district": HOME_DISTRICT,
        }
    )


class ProgramIn(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    monthly_amount: float = Field(gt=0, le=1_000_000_000)
    min_attendance: int = Field(default=80, ge=0, le=100)


@router.post("/programs")
async def create_program(body: ProgramIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        if not await _roles(conn, user_id) & PAY_ROLES:
            return _forbidden()
        await conn.execute(
            text("INSERT INTO payment_programs (id, name, monthly_amount, min_attendance, created_by) VALUES (:id, :n, :a, :m, :u)"),
            {"id": new_id(), "n": body.name.strip(), "a": body.monthly_amount, "m": body.min_attendance, "u": user_id},
        )
    return JSONResponse({"status": "created"})


class ProgramPatch(BaseModel):
    active: bool | None = None
    monthly_amount: float | None = Field(default=None, gt=0, le=1_000_000_000)
    min_attendance: int | None = Field(default=None, ge=0, le=100)


@router.post("/programs/{program_id}")
async def update_program(program_id: uuid.UUID, body: ProgramPatch, request: Request) -> JSONResponse:
    """Changing the amount or the attendance rule affects only batches calculated afterwards."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        if not await _roles(conn, user_id) & PAY_ROLES:
            return _forbidden()
        done = await conn.execute(
            text(
                "UPDATE payment_programs SET active = coalesce(:active, active), monthly_amount = coalesce(:amount, monthly_amount), "
                "min_attendance = coalesce(:min, min_attendance) WHERE id = :id RETURNING id"
            ),
            {"active": body.active, "amount": body.monthly_amount, "min": body.min_attendance, "id": program_id},
        )
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Dastur topilmadi", "Bunday to'lov dasturi yo'q.")
    return JSONResponse({"status": "updated"})


# ----------------------------------------------------------------- batches


class BatchIn(BaseModel):
    program_id: uuid.UUID
    period: str
    note: str | None = Field(default=None, max_length=500)


@router.post("/batches")
async def create_batch(body: BatchIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    if not PERIOD.match(body.period):
        return problem(422, "VALIDATION", "Davr noto'g'ri", "Davrni YYYY-OO ko'rinishida tanlang.")
    async with _engine(request).begin() as conn:
        if not await _roles(conn, user_id) & PAY_ROLES:
            return _forbidden()
        program = (await conn.execute(text("SELECT monthly_amount, min_attendance, active FROM payment_programs WHERE id = :id"), {"id": body.program_id})).mappings().first()
        if program is None or not program["active"]:
            return problem(404, "NOT_FOUND", "Dastur topilmadi", "Faol to'lov dasturini tanlang.")
        exists = await conn.execute(text("SELECT 1 FROM payment_batches WHERE program_id = :p AND period = :period"), {"p": body.program_id, "period": body.period})
        if exists.first() is not None:
            return problem(409, "DUPLICATE", "Reestr bor", "Bu dastur uchun shu davr reestri allaqachon yaratilgan.")
        batch_id = new_id()
        await conn.execute(
            text("INSERT INTO payment_batches (id, program_id, period, note, created_by) VALUES (:id, :p, :period, :note, :u)"),
            {"id": batch_id, "p": body.program_id, "period": body.period, "note": (body.note or "").strip() or None, "u": user_id},
        )
        counts = await _calculate(conn, batch_id, dict(program), body.period)
        await _log(conn, batch_id, user_id, "CREATED", counts)
    return JSONResponse({"id": str(batch_id), **counts})


async def _batch(conn: AsyncConnection, batch_id: uuid.UUID) -> dict[str, Any] | None:
    row = (
        await conn.execute(
            text(
                """
                SELECT b.id, b.period, b.status, b.note, b.created_by, b.approved_by, b.program_id, pr.name AS program, pr.monthly_amount, pr.min_attendance,
                       b.created_at::date::text AS created, b.approved_at::date::text AS approved, b.paid_at::date::text AS paid
                FROM payment_batches b JOIN payment_programs pr ON pr.id = b.program_id WHERE b.id = :id
                """
            ),
            {"id": batch_id},
        )
    ).mappings().first()
    return None if row is None else dict(row)


@router.get("/batches/{batch_id}")
async def batch_detail(batch_id: uuid.UUID, request: Request, lang: str | None = None) -> JSONResponse:
    code = lang_of(lang or request.cookies.get("ub_locale"))
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & PAY_ROLES:
            return _forbidden()
        batch = await _batch(conn, batch_id)
        if batch is None:
            return problem(404, "NOT_FOUND", "Reestr topilmadi", "Bunday reestr yo'q.")
        rows = await conn.execute(
            text(
                """
                SELECT pay.id::text AS id, pay.person_id::text AS person_id, pe.last_name, pe.first_name, m.name AS mahalla, g.code AS group_code,
                       pay.amount, pay.lessons, pay.present, pay.attendance_pct, pay.status, pay.hold_reason, pay.note
                FROM payments pay
                JOIN persons pe ON pe.id = pay.person_id
                LEFT JOIN mahallas m ON m.id = pe.mahalla_id
                LEFT JOIN enrollments e ON e.id = pay.enrollment_id
                LEFT JOIN groups g ON g.id = e.group_id
                WHERE pay.batch_id = :b ORDER BY pay.status DESC, pe.last_name, pe.first_name
                """
            ),
            {"b": batch_id},
        )
        lines = [
            {
                "id": r["id"],
                "person_id": r["person_id"],
                "name": f"{r['last_name']} {r['first_name']}",
                "mahalla": pick(r["mahalla"], code),
                "group": r["group_code"],
                "amount": float(r["amount"]),
                "lessons": int(r["lessons"]),
                "present": int(r["present"]),
                "attendance": None if r["attendance_pct"] is None else float(r["attendance_pct"]),
                "status": r["status"],
                "reason": r["hold_reason"],
                "note": r["note"],
            }
            for r in rows.mappings()
        ]
        log = await conn.execute(
            text(
                "SELECT l.action, l.detail, l.created_at::text AS at, u.full_name FROM payment_log l LEFT JOIN users u ON u.id = l.user_id WHERE l.batch_id = :b ORDER BY l.created_at DESC LIMIT 60"
            ),
            {"b": batch_id},
        )
        history = [{"action": r["action"], "detail": r["detail"] or {}, "at": r["at"][:16], "by": r["full_name"]} for r in log.mappings()]
        roles = await _roles(conn, user_id)
    payees = [line for line in lines if line["status"] in {"ELIGIBLE", "PAID"}]
    return JSONResponse(
        {
            "batch": {
                "id": str(batch["id"]),
                "period": batch["period"],
                "status": batch["status"],
                "note": batch["note"],
                "program": batch["program"],
                "monthly_amount": float(batch["monthly_amount"]),
                "min_attendance": int(batch["min_attendance"]),
                "created": batch["created"],
                "approved": batch["approved"],
                "paid": batch["paid"],
                "created_by_me": batch["created_by"] == user_id,
                "can_approve": batch["created_by"] != user_id or "superadmin" in roles,
            },
            "totals": {"payees": len(payees), "held": len(lines) - len(payees), "amount": sum(line["amount"] for line in payees)},
            "lines": lines,
            "history": history,
        }
    )


async def _editable(conn: AsyncConnection, batch_id: uuid.UUID, user_id: uuid.UUID, statuses: set[str]) -> tuple[dict[str, Any] | None, JSONResponse | None]:
    if not await _roles(conn, user_id) & PAY_ROLES:
        return None, _forbidden()
    batch = await _batch(conn, batch_id)
    if batch is None:
        return None, problem(404, "NOT_FOUND", "Reestr topilmadi", "Bunday reestr yo'q.")
    if batch["status"] not in statuses:
        return None, problem(409, "BAD_STATE", "Holat mos emas", "Reestr bu amal uchun kerakli holatda emas.")
    return batch, None


@router.post("/batches/{batch_id}/recalculate")
async def recalculate(batch_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        batch, error = await _editable(conn, batch_id, user_id, {"DRAFT"})
        if error is not None or batch is None:
            return error or _forbidden()
        counts = await _calculate(conn, batch_id, {"monthly_amount": batch["monthly_amount"], "min_attendance": batch["min_attendance"]}, str(batch["period"]))
        await _log(conn, batch_id, user_id, "RECALCULATED", counts)
    return JSONResponse(counts)


class LineNote(BaseModel):
    note: str = Field(min_length=3, max_length=300)


@router.post("/lines/{payment_id}/hold")
async def hold_line(payment_id: uuid.UUID, body: LineNote, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        row = (await conn.execute(text("SELECT batch_id FROM payments WHERE id = :id"), {"id": payment_id})).first()
        if row is None:
            return problem(404, "NOT_FOUND", "Qator topilmadi", "Bunday to'lov qatori yo'q.")
        batch, error = await _editable(conn, uuid.UUID(str(row[0])), user_id, {"DRAFT", "APPROVED"})
        if error is not None or batch is None:
            return error or _forbidden()
        await conn.execute(text("UPDATE payments SET status = 'HELD', hold_reason = 'MANUAL', amount = 0, note = :n WHERE id = :id AND status = 'ELIGIBLE'"), {"n": body.note.strip(), "id": payment_id})
        await _log(conn, batch["id"], user_id, "HELD", {"note": body.note.strip()}, payment_id)
        if batch["status"] == "APPROVED":
            await conn.execute(text("UPDATE payment_batches SET status = 'DRAFT', approved_by = NULL, approved_at = NULL WHERE id = :id"), {"id": batch["id"]})
            await _log(conn, batch["id"], user_id, "REOPENED", {})
    return JSONResponse({"status": "HELD"})


@router.post("/lines/{payment_id}/release")
async def release_line(payment_id: uuid.UUID, body: LineNote, request: Request) -> JSONResponse:
    """A person held by the rules can be released by an officer, but only with a written reason, and the batch must be approved again."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        row = (await conn.execute(text("SELECT batch_id FROM payments WHERE id = :id"), {"id": payment_id})).first()
        if row is None:
            return problem(404, "NOT_FOUND", "Qator topilmadi", "Bunday to'lov qatori yo'q.")
        batch, error = await _editable(conn, uuid.UUID(str(row[0])), user_id, {"DRAFT", "APPROVED"})
        if error is not None or batch is None:
            return error or _forbidden()
        await conn.execute(
            text("UPDATE payments SET status = 'ELIGIBLE', hold_reason = NULL, amount = :amount, note = :n WHERE id = :id AND status = 'HELD'"),
            {"amount": batch["monthly_amount"], "n": body.note.strip(), "id": payment_id},
        )
        await _log(conn, batch["id"], user_id, "RELEASED", {"note": body.note.strip()}, payment_id)
        if batch["status"] == "APPROVED":
            await conn.execute(text("UPDATE payment_batches SET status = 'DRAFT', approved_by = NULL, approved_at = NULL WHERE id = :id"), {"id": batch["id"]})
            await _log(conn, batch["id"], user_id, "REOPENED", {})
    return JSONResponse({"status": "ELIGIBLE"})


@router.post("/batches/{batch_id}/approve")
async def approve(batch_id: uuid.UUID, request: Request) -> JSONResponse:
    """Four eyes: the person who prepared the batch cannot approve it (a superadmin may)."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        batch, error = await _editable(conn, batch_id, user_id, {"DRAFT"})
        if error is not None or batch is None:
            return error or _forbidden()
        if batch["created_by"] == user_id and "superadmin" not in await _roles(conn, user_id):
            return problem(409, "SAME_USER", "Boshqa xodim tasdiqlashi kerak", "Reestrni tayyorlagan xodim uni o'zi tasdiqlay olmaydi.")
        has_lines = (await conn.execute(text("SELECT count(*) FROM payments WHERE batch_id = :b AND status = 'ELIGIBLE'"), {"b": batch_id})).scalar_one()
        if int(has_lines) == 0:
            return problem(409, "EMPTY", "To'lanadigan odam yo'q", "Tasdiqlash uchun kamida bitta to'lanadigan qator kerak.")
        await conn.execute(text("UPDATE payment_batches SET status = 'APPROVED', approved_by = :u, approved_at = now() WHERE id = :id"), {"u": user_id, "id": batch_id})
        await _log(conn, batch_id, user_id, "APPROVED", {})
    return JSONResponse({"status": "APPROVED"})


@router.post("/batches/{batch_id}/paid")
async def mark_paid(batch_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        batch, error = await _editable(conn, batch_id, user_id, {"APPROVED"})
        if error is not None or batch is None:
            return error or _forbidden()
        await conn.execute(text("UPDATE payments SET status = 'PAID' WHERE batch_id = :b AND status = 'ELIGIBLE'"), {"b": batch_id})
        await conn.execute(text("UPDATE payment_batches SET status = 'PAID', paid_by = :u, paid_at = now() WHERE id = :id"), {"u": user_id, "id": batch_id})
        await _log(conn, batch_id, user_id, "PAID", {})
    return JSONResponse({"status": "PAID"})


@router.post("/batches/{batch_id}/cancel")
async def cancel(batch_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        batch, error = await _editable(conn, batch_id, user_id, {"DRAFT", "APPROVED"})
        if error is not None or batch is None:
            return error or _forbidden()
        await conn.execute(text("UPDATE payment_batches SET status = 'CANCELLED' WHERE id = :id"), {"id": batch_id})
        await _log(conn, batch_id, user_id, "CANCELLED", {})
    return JSONResponse({"status": "CANCELLED"})


@router.get("/batches/{batch_id}/export.csv", response_model=None)
async def export_batch(batch_id: uuid.UUID, request: Request) -> Response:
    """The payee list for the treasury: names, amounts and attendance. No bank or card details are kept here."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        if not await _roles(conn, user_id) & PAY_ROLES:
            return _forbidden()
        batch = await _batch(conn, batch_id)
        if batch is None:
            return problem(404, "NOT_FOUND", "Reestr topilmadi", "Bunday reestr yo'q.")
        rows = await conn.execute(
            text(
                """
                SELECT pe.last_name, pe.first_name, m.name AS mahalla, g.code AS group_code, pay.amount, pay.lessons, pay.present, pay.attendance_pct, pay.status
                FROM payments pay JOIN persons pe ON pe.id = pay.person_id LEFT JOIN mahallas m ON m.id = pe.mahalla_id
                LEFT JOIN enrollments e ON e.id = pay.enrollment_id LEFT JOIN groups g ON g.id = e.group_id
                WHERE pay.batch_id = :b AND pay.status IN ('ELIGIBLE', 'PAID') ORDER BY pe.last_name, pe.first_name
                """
            ),
            {"b": batch_id},
        )
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow(["name", "mahalla", "group", "period", "amount", "lessons", "present", "attendance_pct", "status"])
        for r in rows.mappings():
            writer.writerow([f"{r['last_name']} {r['first_name']}", pick(r["mahalla"], "uz-Latn"), r["group_code"], batch["period"], float(r["amount"]), r["lessons"], r["present"], r["attendance_pct"], r["status"]])
        await _log(conn, batch_id, user_id, "EXPORTED", {})
    return Response(
        content="﻿" + out.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="stipend-{batch["period"]}.csv"'},
    )
