"""Lesson diary of a group: the mentor records the topic, homework and a note for each lesson; students see it,
tick off homework, and the mentor sees how many have done it.
"""

import uuid
from datetime import date

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.inapp import notify
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/classroom", tags=["classroom"])

TEACH = {"mentor", "teacher", "admin", "superadmin"}


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
    return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu bo'lim ustozlar va tinglovchilar uchun.")


async def _roles(conn: AsyncConnection, user_id: uuid.UUID) -> set[str]:
    rows = await conn.execute(text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"), {"id": user_id})
    return {str(r["role"]) for r in rows.mappings()}


async def _may_teach(conn: AsyncConnection, user_id: uuid.UUID, group_id: uuid.UUID) -> bool:
    if await _roles(conn, user_id) & {"admin", "superadmin"}:
        return True
    row = await conn.execute(text("SELECT 1 FROM groups WHERE id = :g AND mentor_user_id = :u"), {"g": group_id, "u": user_id})
    return row.first() is not None


@router.get("/mentor")
async def mentor_view(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        roles = await _roles(conn, user_id)
        if not roles & TEACH:
            return _forbidden()
        everyone = bool(roles & {"admin", "superadmin"})
        groups = (
            await conn.execute(
                text(
                    """
                    SELECT g.id::text AS id, g.code, g.schedule,
                           (SELECT count(*) FROM enrollments e WHERE e.group_id = g.id AND e.status = 'ACTIVE') AS students
                    FROM groups g WHERE (:everyone OR g.mentor_user_id = :u) ORDER BY g.code
                    """
                ),
                {"everyone": everyone, "u": user_id},
            )
        ).mappings().all()
        logs = (
            await conn.execute(
                text(
                    """
                    SELECT l.id::text AS id, l.group_id::text AS group_id, l.lesson_date::text AS day, l.topic, l.homework, l.note,
                           (SELECT count(*) FROM homework_done h WHERE h.log_id = l.id) AS done
                    FROM lesson_logs l JOIN groups g ON g.id = l.group_id
                    WHERE (:everyone OR g.mentor_user_id = :u) ORDER BY l.lesson_date DESC LIMIT 60
                    """
                ),
                {"everyone": everyone, "u": user_id},
            )
        ).mappings().all()
    return JSONResponse(
        {
            "groups": [{"id": g["id"], "code": g["code"], "students": int(g["students"]), "days": (g["schedule"] or {}).get("days", []) if isinstance(g["schedule"], dict) else []} for g in groups],
            "logs": [{"id": r["id"], "group_id": r["group_id"], "date": r["day"], "topic": r["topic"], "homework": r["homework"], "note": r["note"], "done": int(r["done"])} for r in logs],
        }
    )


class LogIn(BaseModel):
    group_id: uuid.UUID
    lesson_date: date
    topic: str = Field(min_length=3, max_length=300)
    homework: str | None = Field(default=None, max_length=1000)
    note: str | None = Field(default=None, max_length=1000)
    announce: bool = False


@router.post("/logs")
async def save_log(body: LogIn, request: Request) -> JSONResponse:
    """One entry per group and day: saving again the same day replaces the text."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    if body.lesson_date > date.today():
        return problem(422, "VALIDATION", "Sana noto'g'ri", "Kundalikka faqat o'tgan yoki bugungi darsni yozish mumkin.")
    async with _engine(request).begin() as conn:
        if not await _may_teach(conn, user_id, body.group_id):
            return _forbidden()
        row = await conn.execute(
            text(
                """
                INSERT INTO lesson_logs (id, group_id, lesson_date, topic, homework, note, created_by)
                VALUES (:id, :g, :d, :topic, :hw, :note, :u)
                ON CONFLICT (group_id, lesson_date) DO UPDATE SET topic = EXCLUDED.topic, homework = EXCLUDED.homework, note = EXCLUDED.note
                RETURNING id
                """
            ),
            {"id": new_id(), "g": body.group_id, "d": body.lesson_date, "topic": body.topic.strip(), "hw": (body.homework or "").strip() or None, "note": (body.note or "").strip() or None, "u": user_id},
        )
        log_id = row.scalar_one()
        if body.announce:
            students = await conn.execute(text("SELECT student_user_id FROM enrollments WHERE group_id = :g AND status = 'ACTIVE'"), {"g": body.group_id})
            for student in students.scalars():
                await notify(conn, student, "lesson_log", {"log_id": str(log_id), "date": body.lesson_date.isoformat()})
    return JSONResponse({"id": str(log_id)})


@router.delete("/logs/{log_id}")
async def delete_log(log_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        group = (await conn.execute(text("SELECT group_id FROM lesson_logs WHERE id = :id"), {"id": log_id})).scalar()
        if group is None:
            return problem(404, "NOT_FOUND", "Yozuv topilmadi", "Bunday kundalik yozuvi yo'q.")
        if not await _may_teach(conn, user_id, group):
            return _forbidden()
        await conn.execute(text("DELETE FROM lesson_logs WHERE id = :id"), {"id": log_id})
    return JSONResponse({"status": "deleted"})


@router.get("/student")
async def student_view(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        rows = (
            await conn.execute(
                text(
                    """
                    SELECT l.id::text AS id, g.code, l.lesson_date::text AS day, l.topic, l.homework, l.note, u.full_name AS mentor,
                           EXISTS (SELECT 1 FROM homework_done h WHERE h.log_id = l.id AND h.student_user_id = :u) AS done
                    FROM lesson_logs l
                    JOIN groups g ON g.id = l.group_id
                    LEFT JOIN users u ON u.id = g.mentor_user_id
                    WHERE l.group_id IN (SELECT group_id FROM enrollments WHERE student_user_id = :u AND status = 'ACTIVE')
                    ORDER BY l.lesson_date DESC LIMIT 60
                    """
                ),
                {"u": user_id},
            )
        ).mappings().all()
    items = [{"id": r["id"], "group": r["code"], "date": r["day"], "topic": r["topic"], "homework": r["homework"], "note": r["note"], "mentor": r["mentor"], "done": bool(r["done"])} for r in rows]
    with_homework = [i for i in items if i["homework"]]
    return JSONResponse(
        {
            "logs": items,
            "homework_total": len(with_homework),
            "homework_done": sum(1 for i in with_homework if i["done"]),
        }
    )


class DoneIn(BaseModel):
    done: bool


@router.post("/logs/{log_id}/done")
async def mark_done(log_id: uuid.UUID, body: DoneIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        mine = await conn.execute(
            text(
                """
                SELECT 1 FROM lesson_logs l JOIN enrollments e ON e.group_id = l.group_id
                WHERE l.id = :id AND e.student_user_id = :u AND e.status = 'ACTIVE' AND l.homework IS NOT NULL
                """
            ),
            {"id": log_id, "u": user_id},
        )
        if mine.first() is None:
            return problem(404, "NOT_FOUND", "Vazifa topilmadi", "Bu guruhda bunday uy vazifasi yo'q.")
        if body.done:
            await conn.execute(text("INSERT INTO homework_done (log_id, student_user_id) VALUES (:l, :u) ON CONFLICT DO NOTHING"), {"l": log_id, "u": user_id})
        else:
            await conn.execute(text("DELETE FROM homework_done WHERE log_id = :l AND student_user_id = :u"), {"l": log_id, "u": user_id})
    return JSONResponse({"done": body.done})
