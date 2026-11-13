"""Cabinet features for every profile: worker offers and profile, notifications, shortlist,
mentor and student progress, producer statistics, mahalla report (BR-17: no phones anywhere)."""

import csv
import io
import json
import uuid
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.doc_i18n import lang_of, pick
from app.inapp import notify
from app.security import bearer_from_request, problem, read_access_token

router = APIRouter(prefix="/api/v1", tags=["cabinet"])

VISIBILITY_KEYS = {"photo", "ratings", "full_name", "languages", "portfolio"}
REPORT_ROLES = {"admin", "superadmin", "partner_viewer", "education_lead", "district_official"}


class OfferAnswer(BaseModel):
    accept: bool


class WorkerSettings(BaseModel):
    availability: Literal["FREE", "BUSY", "INACTIVE"] | None = None
    visibility: dict[str, bool] | None = None


def _engine(request: Request) -> AsyncEngine:
    engine: AsyncEngine = request.app.state.engine
    return engine


def _user_id(request: Request) -> uuid.UUID | None:
    token = bearer_from_request(request)
    payload = read_access_token(token) if token else None
    if payload is None or "sub" not in payload:
        return None
    return uuid.UUID(str(payload["sub"]))


def _lang(request: Request, explicit: str | None) -> str:
    """?lang=... wins, then the locale cookie, then Uzbek (Latin)."""
    return lang_of(explicit or request.cookies.get("ub_locale"))


def _unauth() -> JSONResponse:
    return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")


def _forbidden(detail: str) -> JSONResponse:
    return problem(403, "FORBIDDEN", "Ruxsat yo'q", detail)


async def _roles(conn: AsyncConnection, user_id: uuid.UUID) -> set[str]:
    rows = await conn.execute(text("SELECT role::text FROM user_roles WHERE user_id = :id"), {"id": user_id})
    return {str(r[0]) for r in rows}


# ---------------------------------------------------------------- worker


@router.get("/me/worker")
async def my_worker(request: Request, lang: str | None = None) -> JSONResponse:
    code = _lang(request, lang)
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        row = (
            await conn.execute(
                text(
                    """
                    SELECT wp.slug, wp.level::text AS level, wp.availability::text AS availability, wp.verified_hours,
                           wp.rating_avg, wp.rating_count, wp.visibility, wp.person_id, t.name AS trade_name
                    FROM worker_profiles wp LEFT JOIN trades t ON t.id = wp.primary_trade_id
                    WHERE wp.user_id = :id
                    """
                ),
                {"id": user_id},
            )
        ).mappings().first()
        if row is None:
            return problem(404, "NOT_FOUND", "Profil yo'q", "Usta profili topilmadi.")
        certs = (
            await conn.execute(
                text(
                    """
                    SELECT c.number, c.level, c.issued_at, t.name AS trade_name,
                           (SELECT count(*) FROM certificate_signatures s WHERE s.certificate_id = c.id) AS signed,
                           (SELECT count(*) FROM partners p WHERE p.status = 'SIGNED') AS expected
                    FROM certificates c JOIN trades t ON t.id = c.trade_id
                    WHERE c.person_id = :pid AND c.status = 'ISSUED' ORDER BY c.issued_at DESC
                    """
                ),
                {"pid": row["person_id"]},
            )
        ).mappings().all()
        jobs = (
            await conn.execute(
                text(
                    """
                    SELECT e.name AS employer, p.start_date, p.end_date, p.monthly_salary
                    FROM placements p JOIN employers e ON e.id = p.employer_id
                    WHERE p.worker_user_id = :id ORDER BY p.start_date DESC
                    """
                ),
                {"id": user_id},
            )
        ).mappings().all()
    return JSONResponse(
        {
            "slug": row["slug"],
            "level": row["level"],
            "availability": row["availability"],
            "hours": row["verified_hours"],
            "rating": None if row["rating_avg"] is None else float(row["rating_avg"]),
            "rating_count": row["rating_count"],
            "visibility": row["visibility"],
            "trade": pick(row["trade_name"], code),
            "certificates": [
                {
                    "number": c["number"],
                    "level": c["level"],
                    "trade": pick(c["trade_name"], code),
                    "issued_at": None if c["issued_at"] is None else c["issued_at"].date().isoformat(),
                    "signed": int(c["signed"]),
                    "expected": int(c["expected"]),
                }
                for c in certs
            ],
            "placements": [
                {
                    "employer": j["employer"],
                    "start_date": str(j["start_date"]),
                    "end_date": None if j["end_date"] is None else str(j["end_date"]),
                    "salary": None if j["monthly_salary"] is None else float(j["monthly_salary"]),
                }
                for j in jobs
            ],
        }
    )


@router.patch("/me/worker")
async def update_worker(body: WorkerSettings, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        row = (await conn.execute(text("SELECT visibility FROM worker_profiles WHERE user_id = :id"), {"id": user_id})).first()
        if row is None:
            return problem(404, "NOT_FOUND", "Profil yo'q", "Usta profili topilmadi.")
        visibility = dict(row[0] or {})
        for key, value in (body.visibility or {}).items():
            if key in VISIBILITY_KEYS:
                visibility[key] = value
        await conn.execute(
            text(
                """
                UPDATE worker_profiles
                SET availability = coalesce(CAST(:availability AS availability), availability),
                    visibility = CAST(:visibility AS jsonb), updated_at = now()
                WHERE user_id = :id
                """
            ),
            {"id": user_id, "availability": body.availability, "visibility": json.dumps(visibility)},
        )
    return JSONResponse({"ok": True})


@router.get("/me/offers")
async def my_offers(request: Request, lang: str | None = None) -> JSONResponse:
    code = _lang(request, lang)
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        rows = (
            await conn.execute(
                text(
                    """
                    SELECT rc.id::text AS id, rc.status, r.location, r.start_date, r.duration_months,
                           r.salary_from, r.salary_to, r.conditions, t.name AS trade_name, e.name AS employer
                    FROM request_candidates rc
                    JOIN demand_requests r ON r.id = rc.request_id
                    JOIN trades t ON t.id = r.trade_id
                    JOIN employers e ON e.id = r.employer_id
                    WHERE rc.worker_user_id = :id ORDER BY r.created_at DESC
                    """
                ),
                {"id": user_id},
            )
        ).mappings().all()
    return JSONResponse(
        [
            {
                "id": r["id"],
                "status": r["status"],
                "employer": r["employer"],
                "trade": pick(r["trade_name"], code),
                "location": r["location"],
                "start_date": None if r["start_date"] is None else str(r["start_date"]),
                "duration_months": r["duration_months"],
                "salary_from": None if r["salary_from"] is None else float(r["salary_from"]),
                "salary_to": None if r["salary_to"] is None else float(r["salary_to"]),
                "conditions": r["conditions"],
            }
            for r in rows
        ]
    )


@router.post("/me/offers/{offer_id}/respond")
async def respond_offer(offer_id: uuid.UUID, body: OfferAnswer, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    status = "WORKER_ACCEPTED" if body.accept else "WORKER_DECLINED"
    async with _engine(request).begin() as conn:
        row = (
            await conn.execute(
                text(
                    """
                    UPDATE request_candidates SET status = :status
                    WHERE id = :id AND worker_user_id = :uid AND status = 'PROPOSED'
                    RETURNING request_id
                    """
                ),
                {"id": offer_id, "uid": user_id, "status": status},
            )
        ).first()
        if row is None:
            return problem(409, "NOT_PENDING", "Javob berib bo'lmaydi", "Taklif topilmadi yoki allaqachon javob berilgan.")
        members = await conn.execute(
            text(
                "SELECT m.user_id FROM employer_members m JOIN demand_requests r ON r.employer_id = m.employer_id WHERE r.id = :rid"
            ),
            {"rid": row[0]},
        )
        for (member,) in members.all():
            await notify(conn, member, "offer_answer", {"request_id": str(row[0]), "accepted": body.accept})
    return JSONResponse({"status": status})


# ---------------------------------------------------------------- notifications


@router.get("/me/notifications")
async def my_notifications(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        rows = (
            await conn.execute(
                text(
                    """
                    SELECT id::text AS id, kind, payload, read_at, created_at FROM notifications
                    WHERE user_id = :id AND channel = 'inapp' ORDER BY created_at DESC LIMIT 50
                    """
                ),
                {"id": user_id},
            )
        ).mappings().all()
    return JSONResponse(
        {
            "unread": sum(1 for r in rows if r["read_at"] is None),
            "items": [
                {
                    "id": r["id"],
                    "kind": r["kind"],
                    "payload": r["payload"],
                    "read": r["read_at"] is not None,
                    "created_at": r["created_at"].isoformat(),
                }
                for r in rows
            ],
        }
    )


@router.post("/me/notifications/read")
async def read_notifications(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        await conn.execute(
            text("UPDATE notifications SET read_at = now() WHERE user_id = :id AND channel = 'inapp' AND read_at IS NULL"),
            {"id": user_id},
        )
    return JSONResponse({"ok": True})


# ---------------------------------------------------------------- employer shortlist


async def _employer(conn: AsyncConnection, user_id: uuid.UUID) -> uuid.UUID | None:
    found = (await conn.execute(text("SELECT employer_id FROM employer_members WHERE user_id = :id LIMIT 1"), {"id": user_id})).scalar()
    return None if found is None else uuid.UUID(str(found))


@router.get("/employers/shortlist")
async def shortlist(request: Request, lang: str | None = None) -> JSONResponse:
    code = _lang(request, lang)
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        employer = await _employer(conn, user_id)
        if employer is None:
            return _forbidden("Bu bo'lim ish beruvchilar uchun.")
        rows = (
            await conn.execute(
                text(
                    """
                    SELECT wp.slug, p.first_name, p.last_name, wp.level::text AS level, wp.availability::text AS availability,
                           wp.rating_avg, wp.verified_hours, t.name AS trade_name
                    FROM employer_shortlist s
                    JOIN worker_profiles wp ON wp.user_id = s.worker_user_id
                    JOIN persons p ON p.id = wp.person_id
                    LEFT JOIN trades t ON t.id = wp.primary_trade_id
                    WHERE s.employer_id = :e ORDER BY s.created_at DESC
                    """
                ),
                {"e": employer},
            )
        ).mappings().all()
    return JSONResponse(
        [
            {
                "slug": r["slug"],
                "name": f"{r['first_name']} {r['last_name'][:1]}.",
                "level": r["level"],
                "availability": r["availability"],
                "rating": None if r["rating_avg"] is None else float(r["rating_avg"]),
                "hours": r["verified_hours"],
                "trade": pick(r["trade_name"], code),
            }
            for r in rows
        ]
    )


@router.put("/employers/shortlist/{slug}")
async def shortlist_add(slug: str, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        employer = await _employer(conn, user_id)
        if employer is None:
            return _forbidden("Bu bo'lim ish beruvchilar uchun.")
        found = (await conn.execute(text("SELECT user_id FROM worker_profiles WHERE slug = :s"), {"s": slug})).scalar()
        if found is None:
            return problem(404, "NOT_FOUND", "Usta topilmadi", "Bunday usta yo'q.")
        await conn.execute(
            text("INSERT INTO employer_shortlist (employer_id, worker_user_id) VALUES (:e, :w) ON CONFLICT DO NOTHING"),
            {"e": employer, "w": found},
        )
    return JSONResponse({"ok": True})


@router.delete("/employers/shortlist/{slug}")
async def shortlist_remove(slug: str, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        employer = await _employer(conn, user_id)
        if employer is None:
            return _forbidden("Bu bo'lim ish beruvchilar uchun.")
        await conn.execute(
            text(
                "DELETE FROM employer_shortlist WHERE employer_id = :e"
                " AND worker_user_id = (SELECT user_id FROM worker_profiles WHERE slug = :s)"
            ),
            {"e": employer, "s": slug},
        )
    return JSONResponse({"ok": True})


# ---------------------------------------------------------------- mentor and student


@router.get("/mentor/students")
async def mentor_students(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        roles = await _roles(conn, user_id)
        if not roles & {"mentor", "teacher", "admin", "superadmin"}:
            return _forbidden("Bu bo'lim ustozlar uchun.")
        everyone = bool(roles & {"admin", "superadmin"})
        rows = (
            await conn.execute(
                text(
                    """
                    SELECT e.id::text AS id, u.full_name, g.code,
                           (SELECT round(100.0 * count(*) FILTER (WHERE a.status IN ('PRESENT','LATE')) / NULLIF(count(*), 0))
                              FROM attendance a WHERE a.enrollment_id = e.id) AS attendance,
                           (SELECT count(*) FROM attendance a WHERE a.enrollment_id = e.id) AS lessons,
                           (SELECT round(avg(s.score)) FROM assessments s WHERE s.enrollment_id = e.id) AS average,
                           (SELECT max(a.date) FROM attendance a WHERE a.enrollment_id = e.id) AS last_lesson,
                           (SELECT count(*) FROM lesson_logs l WHERE l.group_id = g.id AND l.homework IS NOT NULL) AS hw_total,
                           (SELECT count(*) FROM homework_done h JOIN lesson_logs l ON l.id = h.log_id
                              WHERE l.group_id = g.id AND h.student_user_id = e.student_user_id) AS hw_done
                    FROM enrollments e
                    JOIN groups g ON g.id = e.group_id
                    JOIN users u ON u.id = e.student_user_id
                    WHERE e.status = 'ACTIVE' AND (:everyone OR g.mentor_user_id = :uid)
                    ORDER BY g.code, u.full_name
                    """
                ),
                {"uid": user_id, "everyone": everyone},
            )
        ).mappings().all()
    items = []
    for r in rows:
        attendance = None if r["attendance"] is None else int(r["attendance"])
        items.append(
            {
                "id": r["id"],
                "name": r["full_name"],
                "group": r["code"],
                "attendance": attendance,
                "lessons": int(r["lessons"]),
                "average": None if r["average"] is None else int(r["average"]),
                "last_lesson": None if r["last_lesson"] is None else str(r["last_lesson"]),
                "homework": None if not r["hw_total"] else int(round(100 * r["hw_done"] / r["hw_total"])),
                "at_risk": attendance is not None and attendance < 80,
            }
        )
    return JSONResponse(items)


@router.get("/me/progress")
async def my_progress(request: Request, lang: str | None = None) -> JSONResponse:
    code = _lang(request, lang)
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        e = (
            await conn.execute(
                text(
                    """
                    SELECT e.id, e.enrolled_at, g.code, g.schedule, c.id AS course_id
                    FROM enrollments e JOIN groups g ON g.id = e.group_id JOIN courses c ON c.id = g.course_id
                    WHERE e.student_user_id = :id AND e.status IN ('ACTIVE','COMPLETED') ORDER BY e.enrolled_at DESC LIMIT 1
                    """
                ),
                {"id": user_id},
            )
        ).mappings().first()
        if e is None:
            return JSONResponse({"enrolled": False})
        att = (
            await conn.execute(
                text(
                    """
                    SELECT count(*) AS total, count(*) FILTER (WHERE status IN ('PRESENT','LATE')) AS present,
                           coalesce(sum(site_hours), 0) AS hours
                    FROM attendance WHERE enrollment_id = :id
                    """
                ),
                {"id": e["id"]},
            )
        ).mappings().one()
        grades = (
            await conn.execute(
                text(
                    """
                    SELECT count(*) AS graded, count(*) FILTER (WHERE passed) AS passed, round(avg(score)) AS average,
                           (SELECT count(*) FROM modules m WHERE m.course_id = :cid) AS modules
                    FROM assessments WHERE enrollment_id = :id
                    """
                ),
                {"id": e["id"], "cid": e["course_id"]},
            )
        ).mappings().one()
        vocab = (await conn.execute(text("SELECT count(*) FROM vocab_days WHERE user_id = :id"), {"id": user_id})).scalar_one()
        path = (
            await conn.execute(
                text(
                    """
                    SELECT coalesce(m.title ->> :code, m.title ->> 'uz-Latn') AS title, a.score, a.passed
                    FROM modules m
                    LEFT JOIN assessments a ON a.module_id = m.id AND a.enrollment_id = :eid
                    WHERE m.course_id = :cid ORDER BY m.ord
                    """
                ),
                {"code": code, "eid": e["id"], "cid": e["course_id"]},
            )
        ).mappings().all()
    schedule = e["schedule"] if isinstance(e["schedule"], dict) else {}
    return JSONResponse(
        {
            "enrolled": True,
            "group": e["code"],
            "since": str(e["enrolled_at"]),
            "schedule": {"days": schedule.get("days", []), "time": schedule.get("time", "")},
            "lessons": int(att["total"]),
            "present": int(att["present"]),
            "attendance": None if att["total"] == 0 else round(100 * int(att["present"]) / int(att["total"])),
            "site_hours": float(att["hours"]),
            "graded": int(grades["graded"]),
            "passed": int(grades["passed"]),
            "modules": int(grades["modules"]),
            "average": None if grades["average"] is None else int(grades["average"]),
            "vocab_days": int(vocab),
            "path": [
                {
                    "title": str(item["title"] or ""),
                    "state": "pending" if item["score"] is None else ("passed" if item["passed"] else "failed"),
                    "score": item["score"],
                }
                for item in path
            ],
        }
    )


# ---------------------------------------------------------------- producer


@router.get("/producers/stats")
async def producer_stats(request: Request, lang: str | None = None) -> JSONResponse:
    code = _lang(request, lang)
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        pid = (await conn.execute(text("SELECT producer_id FROM producer_members WHERE user_id = :id LIMIT 1"), {"id": user_id})).scalar()
        if pid is None:
            return _forbidden("Bu bo'lim ishlab chiqaruvchilar uchun.")
        by_status = (
            await conn.execute(
                text(
                    """
                    SELECT o.status::text AS status, count(*) AS n FROM order_requests o
                    JOIN products p ON p.id = o.product_id WHERE p.producer_id = :pid GROUP BY 1
                    """
                ),
                {"pid": pid},
            )
        ).mappings().all()
        months = (
            await conn.execute(
                text(
                    """
                    SELECT to_char(date_trunc('month', o.created_at), 'YYYY-MM') AS month, count(*) AS orders,
                           coalesce(sum(o.quantity * coalesce(p.price, 0)), 0) AS total
                    FROM order_requests o JOIN products p ON p.id = o.product_id
                    WHERE p.producer_id = :pid AND o.status <> 'CANCELLED'
                    GROUP BY 1 ORDER BY 1 DESC LIMIT 6
                    """
                ),
                {"pid": pid},
            )
        ).mappings().all()
        top = (
            await conn.execute(
                text(
                    """
                    SELECT p.name, count(*) AS orders, sum(o.quantity) AS quantity, p.unit
                    FROM order_requests o JOIN products p ON p.id = o.product_id
                    WHERE p.producer_id = :pid AND o.status <> 'CANCELLED'
                    GROUP BY p.id ORDER BY orders DESC LIMIT 5
                    """
                ),
                {"pid": pid},
            )
        ).mappings().all()
        stock = (
            await conn.execute(
                text("SELECT count(*) AS total, count(*) FILTER (WHERE NOT in_stock) AS out FROM products WHERE producer_id = :pid"),
                {"pid": pid},
            )
        ).mappings().one()
    return JSONResponse(
        {
            "by_status": {r["status"]: int(r["n"]) for r in by_status},
            "months": [{"month": r["month"], "orders": int(r["orders"]), "total": float(r["total"])} for r in months],
            "top": [
                {"name": pick(r["name"], code), "orders": int(r["orders"]), "quantity": float(r["quantity"]), "unit": r["unit"]}
                for r in top
            ],
            "products": int(stock["total"]),
            "out_of_stock": int(stock["out"]),
        }
    )


# ---------------------------------------------------------------- mahalla report


async def _mahalla_rows(conn: AsyncConnection, code: str = "uz-Latn") -> list[dict[str, object]]:
    rows = (
        await conn.execute(
            text(
                """
                SELECT m.name,
                       (SELECT count(*) FROM persons p WHERE p.mahalla_id = m.id) AS people,
                       (SELECT count(*) FROM persons p JOIN enrollments e ON e.student_user_id = p.user_id
                         WHERE p.mahalla_id = m.id AND e.status = 'ACTIVE') AS studying,
                       (SELECT count(*) FROM persons p JOIN certificates c ON c.person_id = p.id
                         WHERE p.mahalla_id = m.id AND c.status = 'ISSUED') AS certified,
                       (SELECT count(*) FROM worker_profiles w WHERE w.mahalla_id = m.id) AS workers
                FROM mahallas m
                """
            )
        )
    ).mappings().all()
    items = [
        {
            "mahalla": pick(r["name"], code),
            "people": int(r["people"]),
            "studying": int(r["studying"]),
            "certified": int(r["certified"]),
            "workers": int(r["workers"]),
        }
        for r in rows
    ]
    items.sort(key=lambda item: (-int(str(item["people"])), str(item["mahalla"])))
    return items


@router.get("/reports/mahallas")
async def mahalla_report(request: Request, lang: str | None = None) -> JSONResponse:
    code = _lang(request, lang)
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & REPORT_ROLES:
            return _forbidden("Hisobot hokimlik va admin uchun.")
        rows = await _mahalla_rows(conn, code)
    return JSONResponse(rows)


@router.get("/reports/export.csv", response_model=None)
async def export_csv(request: Request) -> Response:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & REPORT_ROLES:
            return _forbidden("Hisobot hokimlik va admin uchun.")
        rows = await _mahalla_rows(conn)
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["mahalla", "people", "studying", "certified", "workers"])
    for r in rows:
        writer.writerow([r["mahalla"], r["people"], r["studying"], r["certified"], r["workers"]])
    return Response(
        "﻿" + out.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="uychi-binokor-{date.today().isoformat()}.csv"'},
    )


# ---------------------------------------------------------------- schedule and postings

WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"]


@router.get("/me/schedule")
async def my_schedule(request: Request, days: int = 14) -> JSONResponse:
    """Upcoming lessons of the caller's groups (student: own group, mentor: groups they teach)."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    horizon = max(1, min(days, 60))
    async with _engine(request).connect() as conn:
        rows = (
            await conn.execute(
                text(
                    """
                    SELECT DISTINCT g.code, g.schedule FROM groups g
                    WHERE g.mentor_user_id = :uid
                       OR g.id IN (SELECT group_id FROM enrollments WHERE student_user_id = :uid AND status = 'ACTIVE')
                    """
                ),
                {"uid": user_id},
            )
        ).mappings().all()
    today = date.today()
    lessons = []
    for offset in range(horizon):
        day = today + timedelta(days=offset)
        for row in rows:
            schedule = row["schedule"] if isinstance(row["schedule"], dict) else {}
            if WEEKDAYS[day.weekday()] in schedule.get("days", []):
                lessons.append(
                    {"date": day.isoformat(), "weekday": WEEKDAYS[day.weekday()], "time": schedule.get("time", ""), "group": row["code"]}
                )
    return JSONResponse({"groups": [str(r["code"]) for r in rows], "lessons": lessons})


@router.get("/employers/postings")
async def postings(request: Request, lang: str | None = None) -> JSONResponse:
    code = _lang(request, lang)
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        employer = await _employer(conn, user_id)
        if employer is None:
            return _forbidden("Bu bo'lim ish beruvchilar uchun.")
        rows = (
            await conn.execute(
                text(
                    """
                    SELECT r.id::text AS id, r.quantity, r.status::text AS status, r.location, r.created_at, t.name AS trade_name,
                           coalesce(jsonb_object_agg(c.status, c.n) FILTER (WHERE c.status IS NOT NULL), '{}'::jsonb) AS counts
                    FROM demand_requests r
                    JOIN trades t ON t.id = r.trade_id
                    LEFT JOIN (SELECT request_id, status, count(*) AS n FROM request_candidates GROUP BY 1, 2) c ON c.request_id = r.id
                    WHERE r.employer_id = :e
                    GROUP BY r.id, t.name ORDER BY r.created_at DESC
                    """
                ),
                {"e": employer},
            )
        ).mappings().all()
    return JSONResponse(
        [
            {
                "id": r["id"],
                "trade": pick(r["trade_name"], code),
                "quantity": r["quantity"],
                "status": r["status"],
                "location": r["location"],
                "created_at": r["created_at"].date().isoformat(),
                "counts": r["counts"],
            }
            for r in rows
        ]
    )
