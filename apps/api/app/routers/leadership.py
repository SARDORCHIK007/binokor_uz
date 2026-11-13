"""What the institution director has to look at: lessons held without a diary entry, learners falling behind,
groups outside the 8-10 range, the weekly attendance trend, and documents waiting for a decision.
"""

import csv
import io
import uuid
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.security import bearer_from_request, problem, read_access_token

router = APIRouter(prefix="/api/v1/leadership", tags=["leadership"])

LEAD_ROLES = {"education_lead", "admin", "superadmin", "district_official"}
RISK_BELOW = 80


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
    return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu bo'lim muassasa rahbariyati uchun.")


async def _allowed(conn: AsyncConnection, user_id: uuid.UUID) -> bool:
    rows = await conn.execute(text("SELECT role::text AS role FROM user_roles WHERE user_id = :u"), {"u": user_id})
    return bool({str(r["role"]) for r in rows.mappings()} & LEAD_ROLES)


async def _collect(conn: AsyncConnection) -> dict[str, Any]:
    diary = (
        await conn.execute(
            text(
                """
                SELECT g.code, u.full_name AS mentor,
                       count(DISTINCT a.date) AS held,
                       count(DISTINCT a.date) FILTER (WHERE NOT EXISTS (SELECT 1 FROM lesson_logs l WHERE l.group_id = g.id AND l.lesson_date = a.date)) AS missing
                FROM groups g
                JOIN users u ON u.id = g.mentor_user_id
                JOIN enrollments e ON e.group_id = g.id
                JOIN attendance a ON a.enrollment_id = e.id AND a.date >= current_date - 14
                GROUP BY g.id, g.code, u.full_name ORDER BY missing DESC, g.code
                """
            )
        )
    ).mappings().all()
    at_risk = (
        await conn.execute(
            text(
                f"""
                SELECT us.full_name AS name, g.code, m.full_name AS mentor,
                       round(100.0 * count(*) FILTER (WHERE a.status IN ('PRESENT', 'LATE')) / count(*)) AS pct, count(*) AS lessons
                FROM enrollments e
                JOIN users us ON us.id = e.student_user_id
                JOIN groups g ON g.id = e.group_id
                JOIN users m ON m.id = g.mentor_user_id
                JOIN attendance a ON a.enrollment_id = e.id
                WHERE e.status = 'ACTIVE'
                GROUP BY e.id, us.full_name, g.code, m.full_name
                HAVING 100.0 * count(*) FILTER (WHERE a.status IN ('PRESENT', 'LATE')) / count(*) < {RISK_BELOW}
                ORDER BY pct, us.full_name LIMIT 50
                """
            )
        )
    ).mappings().all()
    sizes = (
        await conn.execute(
            text(
                """
                SELECT g.code, g.max_students, count(e.id) FILTER (WHERE e.status = 'ACTIVE') AS active
                FROM groups g LEFT JOIN enrollments e ON e.group_id = g.id GROUP BY g.id, g.code, g.max_students ORDER BY g.code
                """
            )
        )
    ).mappings().all()
    trend = (
        await conn.execute(
            text(
                """
                SELECT to_char(date_trunc('week', a.date), 'MM-DD') AS week,
                       round(100.0 * count(*) FILTER (WHERE a.status IN ('PRESENT', 'LATE')) / count(*)) AS pct
                FROM attendance a WHERE a.date >= current_date - 28 GROUP BY date_trunc('week', a.date) ORDER BY date_trunc('week', a.date)
                """
            )
        )
    ).mappings().all()
    homework = (
        await conn.execute(
            text(
                """
                SELECT g.code,
                       (SELECT count(*) FROM lesson_logs l WHERE l.group_id = g.id AND l.homework IS NOT NULL) AS tasks,
                       (SELECT count(*) FROM homework_done h JOIN lesson_logs l ON l.id = h.log_id WHERE l.group_id = g.id) AS done,
                       (SELECT count(*) FROM enrollments e WHERE e.group_id = g.id AND e.status = 'ACTIVE') AS students
                FROM groups g ORDER BY g.code
                """
            )
        )
    ).mappings().all()
    waiting = (await conn.execute(text("SELECT count(*) FROM certificates WHERE status::text = 'PENDING_APPROVAL'"))).scalar_one()
    group_sizes = [
        {"code": r["code"], "active": int(r["active"]), "max": int(r["max_students"]), "state": "under" if r["active"] < 8 else ("over" if r["active"] > r["max_students"] else "ok")}
        for r in sizes
    ]
    return {
        "diary": [{"group": r["code"], "mentor": r["mentor"], "held": int(r["held"]), "missing": int(r["missing"])} for r in diary],
        "at_risk": [{"name": r["name"], "group": r["code"], "mentor": r["mentor"], "pct": int(r["pct"]), "lessons": int(r["lessons"])} for r in at_risk],
        "group_sizes": [g for g in group_sizes if g["state"] != "ok"],
        "groups_total": len(group_sizes),
        "trend": [{"week": r["week"], "pct": int(r["pct"])} for r in trend],
        "homework": [{"group": r["code"], "tasks": int(r["tasks"]), "done": int(r["done"]), "students": int(r["students"])} for r in homework],
        "certificates_waiting": int(waiting),
        "risk_below": RISK_BELOW,
    }


@router.get("/alerts")
async def alerts(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _allowed(conn, user_id):
            return _forbidden()
        data = await _collect(conn)
    return JSONResponse(data)


@router.get("/at-risk.csv", response_model=None)
async def at_risk_csv(request: Request) -> Response:
    """Learners below the attendance line: names, groups and mentors only, no contact details."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _allowed(conn, user_id):
            return _forbidden()
        data = await _collect(conn)
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["name", "group", "mentor", "attendance_pct", "lessons"])
    for r in data["at_risk"]:
        writer.writerow([r["name"], r["group"], r["mentor"], r["pct"], r["lessons"]])
    return Response(
        content="﻿" + out.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="at-risk.csv"'},
    )
