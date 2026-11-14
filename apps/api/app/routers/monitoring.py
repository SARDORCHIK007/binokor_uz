"""Monitoring and assessment, modelled on what HEMIS offers a university: an anonymous end-of-term student survey of
teachers, a transparent teacher rating, a student rating ledger and a leadership dashboard.

Teacher rating (0-100) = survey 40% + students' results 25% + students' attendance 20% + journal activity 15%.
A component with no data is left out and the others are re-weighted. The student behind a survey answer is never returned.
"""

import json
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.doc_i18n import current_lang, pick
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1", tags=["monitoring"])

CRITERIA = ("expertise", "explanation", "practice", "punctuality", "respect", "support")
WEIGHTS = {"survey": 40, "results": 25, "attendance": 20, "journal": 15}
MONITOR_ROLES = {"education_lead", "admin", "superadmin", "district_official"}


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


def _forbidden(detail: str) -> JSONResponse:
    return problem(403, "FORBIDDEN", "Ruxsat yo'q", detail)


def current_round(today: datetime | None = None) -> str:
    now = today or datetime.now(UTC)
    return f"{now.year}-H{1 if now.month <= 6 else 2}"


async def _roles(conn: AsyncConnection, user_id: uuid.UUID) -> set[str]:
    rows = await conn.execute(text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"), {"id": user_id})
    return {str(r["role"]) for r in rows.mappings()}


def composite(survey5: float | None, results: float | None, attendance: float | None, journal: float | None) -> dict[str, object]:
    """Blend the available components into one 0-100 score; also return each component on a 0-100 scale."""
    parts: dict[str, float | None] = {
        "survey": None if survey5 is None else max(0.0, min(100.0, (survey5 - 1) / 4 * 100)),
        "results": results,
        "attendance": attendance,
        "journal": journal,
    }
    used = {key: value for key, value in parts.items() if value is not None}
    total_weight = sum(WEIGHTS[key] for key in used)
    score = None if total_weight == 0 else round(sum(value * WEIGHTS[key] for key, value in used.items()) / total_weight)
    return {"score": score, "parts": {key: None if value is None else round(value) for key, value in parts.items()}}


async def teacher_rows(conn: AsyncConnection, only: uuid.UUID | None = None) -> list[dict[str, object]]:
    mentors = await conn.execute(
        text(
            """
            SELECT g.mentor_user_id AS id, u.full_name, count(DISTINCT g.id) AS groups,
                   count(DISTINCT e.id) FILTER (WHERE e.status = 'ACTIVE') AS students,
                   coalesce(sum(jsonb_array_length(g.schedule -> 'days')), 0) AS weekly
            FROM groups g
            JOIN users u ON u.id = g.mentor_user_id
            LEFT JOIN enrollments e ON e.group_id = g.id
            WHERE (CAST(:only AS uuid) IS NULL OR g.mentor_user_id = :only)
            GROUP BY g.mentor_user_id, u.full_name
            """
        ),
        {"only": only},
    )
    base = {str(r["id"]): dict(r) for r in mentors.mappings()}
    survey = await conn.execute(
        text(
            """
            SELECT mentor_user_id AS id, count(*) AS responses, avg(a.v) AS avg5
            FROM teacher_surveys s, LATERAL (SELECT avg(value::numeric) AS v FROM jsonb_each_text(s.scores)) a
            GROUP BY 1
            """
        )
    )
    survey_by = {str(r["id"]): r for r in survey.mappings()}
    results = await conn.execute(
        text(
            """
            SELECT g.mentor_user_id AS id, avg(a.score) AS avg_score
            FROM assessments a JOIN enrollments e ON e.id = a.enrollment_id JOIN groups g ON g.id = e.group_id
            GROUP BY 1
            """
        )
    )
    results_by = {str(r["id"]): r for r in results.mappings()}
    attendance = await conn.execute(
        text(
            """
            SELECT g.mentor_user_id AS id, count(*) AS total, count(*) FILTER (WHERE a.status IN ('PRESENT', 'LATE')) AS present
            FROM attendance a JOIN enrollments e ON e.id = a.enrollment_id JOIN groups g ON g.id = e.group_id
            GROUP BY 1
            """
        )
    )
    attendance_by = {str(r["id"]): r for r in attendance.mappings()}
    journal = await conn.execute(
        text(
            """
            SELECT g.mentor_user_id AS id, count(DISTINCT (e.group_id, a.date)) AS sessions
            FROM attendance a JOIN enrollments e ON e.id = a.enrollment_id JOIN groups g ON g.id = e.group_id
            WHERE a.date >= CURRENT_DATE - 30
            GROUP BY 1
            """
        )
    )
    journal_by = {str(r["id"]): r for r in journal.mappings()}
    items: list[dict[str, object]] = []
    for key, row in base.items():
        s = survey_by.get(key)
        res = results_by.get(key)
        att = attendance_by.get(key)
        jr = journal_by.get(key)
        att_pct = None if att is None or int(att["total"]) == 0 else 100 * int(att["present"]) / int(att["total"])
        expected = int(str(row["weekly"])) * 4
        has_students = int(str(row["students"])) > 0
        journal_pct = None if expected == 0 or not has_students else min(100.0, 100 * int(jr["sessions"] if jr else 0) / expected)
        blended = composite(
            None if s is None else float(s["avg5"]),
            None if res is None or res["avg_score"] is None else float(res["avg_score"]),
            att_pct,
            journal_pct,
        )
        items.append(
            {
                "id": key,
                "name": row["full_name"],
                "groups": int(str(row["groups"])),
                "students": int(str(row["students"])),
                "responses": 0 if s is None else int(s["responses"]),
                "survey": None if s is None else round(float(s["avg5"]), 2),
                "score": blended["score"],
                "parts": blended["parts"],
            }
        )
    items.sort(key=lambda item: (item["score"] is None, -(int(str(item["score"])) if item["score"] is not None else 0), str(item["name"])))
    return items


# ----------------------------------------------------------------- student survey


@router.get("/me/teacher-survey")
async def my_survey(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    round_id = current_round()
    async with _engine(request).connect() as conn:
        rows = await conn.execute(
            text(
                """
                SELECT g.id::text AS group_id, g.code, u.full_name AS teacher,
                       EXISTS (SELECT 1 FROM teacher_surveys s WHERE s.student_user_id = :id AND s.mentor_user_id = g.mentor_user_id
                               AND s.round = :round) AS done
                FROM enrollments e JOIN groups g ON g.id = e.group_id JOIN users u ON u.id = g.mentor_user_id
                WHERE e.student_user_id = :id AND e.status IN ('ACTIVE', 'COMPLETED')
                """
            ),
            {"id": user_id, "round": round_id},
        )
        teachers = [{"group_id": r["group_id"], "group": r["code"], "teacher": r["teacher"], "done": bool(r["done"])} for r in rows.mappings()]
    return JSONResponse({"round": round_id, "criteria": list(CRITERIA), "teachers": teachers})


class SurveyIn(BaseModel):
    group_id: uuid.UUID
    scores: dict[str, int]
    comment: str | None = Field(default=None, max_length=1500)


@router.post("/me/teacher-survey")
async def submit_survey(body: SurveyIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    if set(body.scores) != set(CRITERIA) or any(not 1 <= value <= 5 for value in body.scores.values()):
        return problem(422, "VALIDATION", "Baholar noto'g'ri", "Hamma mezonni 1 dan 5 gacha baholang.")
    round_id = current_round()
    async with _engine(request).begin() as conn:
        row = (
            await conn.execute(
                text(
                    """
                    SELECT g.mentor_user_id FROM enrollments e JOIN groups g ON g.id = e.group_id
                    WHERE e.student_user_id = :id AND g.id = :group AND e.status IN ('ACTIVE', 'COMPLETED')
                    """
                ),
                {"id": user_id, "group": body.group_id},
            )
        ).first()
        if row is None:
            return _forbidden("Siz bu guruhda o'qimaysiz.")
        exists = await conn.execute(
            text("SELECT 1 FROM teacher_surveys WHERE student_user_id = :id AND mentor_user_id = :m AND round = :r"),
            {"id": user_id, "m": row[0], "r": round_id},
        )
        if exists.first() is not None:
            return problem(409, "ALREADY_DONE", "Baholab bo'lgansiz", "Bu davr uchun ustozni allaqachon baholagansiz.")
        await conn.execute(
            text(
                """
                INSERT INTO teacher_surveys (id, group_id, mentor_user_id, student_user_id, round, scores, comment)
                VALUES (:id, :group, :mentor, :student, :round, CAST(:scores AS jsonb), :comment)
                """
            ),
            {
                "id": new_id(),
                "group": body.group_id,
                "mentor": row[0],
                "student": user_id,
                "round": round_id,
                "scores": json.dumps(body.scores),
                "comment": (body.comment or "").strip() or None,
            },
        )
    return JSONResponse({"status": "saved"})


# ----------------------------------------------------------------- teacher detail


async def teacher_detail(conn: AsyncConnection, mentor_id: uuid.UUID, code: str) -> dict[str, object] | None:
    rows = await teacher_rows(conn, mentor_id)
    if not rows:
        return None
    head = rows[0]
    criteria = await conn.execute(
        text(
            """
            SELECT c.key, avg(c.value::numeric) AS avg5
            FROM teacher_surveys s, LATERAL jsonb_each_text(s.scores) AS c(key, value)
            WHERE s.mentor_user_id = :m GROUP BY c.key
            """
        ),
        {"m": mentor_id},
    )
    crit = {r["key"]: round(float(r["avg5"]), 2) for r in criteria.mappings()}
    trend = await conn.execute(
        text(
            """
            SELECT s.round, count(*) AS n, avg(a.v) AS avg5
            FROM teacher_surveys s, LATERAL (SELECT avg(value::numeric) AS v FROM jsonb_each_text(s.scores)) a
            WHERE s.mentor_user_id = :m GROUP BY s.round ORDER BY s.round
            """
        ),
        {"m": mentor_id},
    )
    comments = await conn.execute(
        text("SELECT round, comment FROM teacher_surveys WHERE mentor_user_id = :m AND comment IS NOT NULL ORDER BY created_at DESC LIMIT 50"),
        {"m": mentor_id},
    )
    groups = await conn.execute(
        text(
            """
            SELECT g.code, c.title, count(DISTINCT e.id) FILTER (WHERE e.status = 'ACTIVE') AS students,
                   (SELECT 100.0 * count(*) FILTER (WHERE a.status IN ('PRESENT', 'LATE')) / nullif(count(*), 0)
                    FROM attendance a JOIN enrollments e2 ON e2.id = a.enrollment_id WHERE e2.group_id = g.id) AS attendance,
                   (SELECT avg(s.score) FROM assessments s JOIN enrollments e3 ON e3.id = s.enrollment_id WHERE e3.group_id = g.id) AS score
            FROM groups g JOIN courses c ON c.id = g.course_id LEFT JOIN enrollments e ON e.group_id = g.id
            WHERE g.mentor_user_id = :m GROUP BY g.id, g.code, c.title
            """
        ),
        {"m": mentor_id},
    )
    return {
        **head,
        "criteria": {key: crit.get(key) for key in CRITERIA},
        "trend": [{"round": r["round"], "responses": int(r["n"]), "avg": round(float(r["avg5"]), 2)} for r in trend.mappings()],
        "comments": [{"round": r["round"], "text": r["comment"]} for r in comments.mappings()],
        "group_list": [
            {
                "code": r["code"],
                "course": pick(r["title"], code),
                "students": int(r["students"]),
                "attendance": None if r["attendance"] is None else round(float(r["attendance"])),
                "score": None if r["score"] is None else round(float(r["score"])),
            }
            for r in groups.mappings()
        ],
        "weights": WEIGHTS,
        "round": current_round(),
    }


@router.get("/me/teacher-rating")
async def my_rating(request: Request, lang: str | None = None) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        detail = await teacher_detail(conn, user_id, current_lang())
    if detail is None:
        return _forbidden("Bu bo'lim ustozlar uchun.")
    return JSONResponse(detail)


# ----------------------------------------------------------------- leadership dashboard


@router.get("/monitoring/overview")
async def overview(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & MONITOR_ROLES:
            return _forbidden("Bu bo'lim muassasa rahbariyati uchun.")
        kpi = (
            await conn.execute(
                text(
                    """
                    SELECT
                      (SELECT count(*) FROM enrollments WHERE status = 'ACTIVE') AS students,
                      (SELECT count(DISTINCT mentor_user_id) FROM groups) AS teachers,
                      (SELECT count(*) FROM groups) AS groups,
                      (SELECT 100.0 * count(*) FILTER (WHERE status IN ('PRESENT', 'LATE')) / nullif(count(*), 0) FROM attendance) AS attendance,
                      (SELECT avg(score) FROM assessments) AS score,
                      (SELECT 100.0 * count(*) FILTER (WHERE passed) / nullif(count(*), 0) FROM assessments) AS pass_rate,
                      (SELECT count(*) FROM teacher_surveys WHERE round = :round) AS survey_answers,
                      (SELECT count(*) FROM enrollments e WHERE e.status = 'ACTIVE') AS expected
                    """
                ),
                {"round": current_round()},
            )
        ).mappings().one()
        teachers = await teacher_rows(conn)
        at_risk = (
            await conn.execute(
                text(
                    """
                    SELECT count(*) FROM (
                      SELECT e.id FROM enrollments e JOIN attendance a ON a.enrollment_id = e.id WHERE e.status = 'ACTIVE'
                      GROUP BY e.id HAVING 100.0 * count(*) FILTER (WHERE a.status IN ('PRESENT', 'LATE')) / count(*) < 80
                    ) x
                    """
                )
            )
        ).scalar_one()
    def num(value: object) -> int | None:
        return None if value is None else round(float(str(value)))

    return JSONResponse(
        {
            "kpi": {
                "students": int(kpi["students"]),
                "teachers": int(kpi["teachers"]),
                "groups": int(kpi["groups"]),
                "attendance": num(kpi["attendance"]),
                "score": num(kpi["score"]),
                "pass_rate": num(kpi["pass_rate"]),
                "at_risk": int(at_risk),
                "survey_answers": int(kpi["survey_answers"]),
                "survey_expected": int(kpi["expected"]),
            },
            "round": current_round(),
            "weights": WEIGHTS,
            "teachers": teachers,
        }
    )


@router.get("/monitoring/teachers/{mentor_id}")
async def teacher_page(mentor_id: uuid.UUID, request: Request, lang: str | None = None) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & MONITOR_ROLES:
            return _forbidden("Bu bo'lim muassasa rahbariyati uchun.")
        detail = await teacher_detail(conn, mentor_id, current_lang())
    if detail is None:
        return problem(404, "NOT_FOUND", "Ustoz topilmadi", "Bunday ustoz yo'q.")
    return JSONResponse(detail)


@router.get("/monitoring/students")
async def student_ratings(request: Request, lang: str | None = None) -> JSONResponse:
    code = current_lang()
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & MONITOR_ROLES:
            return _forbidden("Bu bo'lim muassasa rahbariyati uchun.")
        rows = await conn.execute(
            text(
                """
                SELECT e.id::text AS id, u.full_name, g.code AS group_code, mu.full_name AS teacher, t.name AS trade,
                       (SELECT 100.0 * count(*) FILTER (WHERE a.status IN ('PRESENT', 'LATE')) / nullif(count(*), 0)
                        FROM attendance a WHERE a.enrollment_id = e.id) AS attendance,
                       (SELECT avg(s.score) FROM assessments s WHERE s.enrollment_id = e.id) AS score,
                       (SELECT count(*) FROM assessments s WHERE s.enrollment_id = e.id AND s.passed) AS passed,
                       (SELECT coalesce(sum(a.site_hours), 0) FROM attendance a WHERE a.enrollment_id = e.id) AS hours
                FROM enrollments e
                JOIN users u ON u.id = e.student_user_id
                JOIN groups g ON g.id = e.group_id
                JOIN users mu ON mu.id = g.mentor_user_id
                JOIN courses c ON c.id = g.course_id
                JOIN trades t ON t.id = c.trade_id
                WHERE e.status = 'ACTIVE'
                ORDER BY g.code, u.full_name LIMIT 400
                """
            )
        )
        items = [
            {
                "id": r["id"],
                "name": r["full_name"],
                "group": r["group_code"],
                "teacher": r["teacher"],
                "trade": pick(r["trade"], code),
                "attendance": None if r["attendance"] is None else round(float(r["attendance"])),
                "score": None if r["score"] is None else round(float(r["score"])),
                "passed": int(r["passed"]),
                "hours": float(r["hours"]),
            }
            for r in rows.mappings()
        ]
    by_group: dict[str, list[dict[str, object]]] = {}
    for item in items:
        by_group.setdefault(str(item["group"]), []).append(item)
    for members in by_group.values():
        ranked = sorted(members, key=lambda m: -(int(str(m["score"])) if m["score"] is not None else -1))
        for place, member in enumerate(ranked, start=1):
            member["rank"] = place if member["score"] is not None else None
        for member in members:
            member["risk"] = member["attendance"] is not None and int(str(member["attendance"])) < 80
    return JSONResponse(items)
