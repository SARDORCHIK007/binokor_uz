"""District plan and instructions: the hokimlik sets yearly targets and sees plan against fact, and gives dated
instructions to the employment office, the migration agency, the mahalla assistants and the training centre,
who answer them from their own panels.
"""

import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.routers.moderation import audit
from app.routers.people import TEAM_OF_ROLE
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/district", tags=["district-plan"])

DISTRICT_ROLES = {"district_official", "admin", "superadmin"}
METRICS = ("applicants", "certified", "employed", "abroad")


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
    return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu bo'lim hokimlik vakillari uchun.")


async def _roles(conn: AsyncConnection, user_id: uuid.UUID) -> set[str]:
    rows = await conn.execute(text("SELECT role::text AS role FROM user_roles WHERE user_id = :u"), {"u": user_id})
    return {str(r["role"]) for r in rows.mappings()}


@router.get("/plan")
async def plan(request: Request, year: int | None = None) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    chosen = year or date.today().year
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & DISTRICT_ROLES:
            return _forbidden()
        actual = (
            await conn.execute(
                text(
                    """
                    SELECT (SELECT count(*) FROM applications WHERE status <> 'DRAFT' AND extract(year FROM created_at) = :y) AS applicants,
                           (SELECT count(*) FROM certificates WHERE status = 'ISSUED' AND extract(year FROM issued_at) = :y) AS certified,
                           (SELECT count(*) FROM placements WHERE extract(year FROM start_date) = :y) AS employed,
                           (SELECT count(*) FROM placements WHERE kind = 'ABROAD' AND extract(year FROM start_date) = :y) AS abroad
                    """
                ),
                {"y": chosen},
            )
        ).mappings().one()
        rows = await conn.execute(text("SELECT metric, target FROM district_targets WHERE year = :y"), {"y": chosen})
        targets = {str(r["metric"]): int(r["target"]) for r in rows.mappings()}
    today = date.today()
    elapsed = 1.0 if chosen < today.year else (0.0 if chosen > today.year else today.timetuple().tm_yday / 366)
    items = []
    for metric in METRICS:
        done = int(actual[metric])
        target = targets.get(metric)
        pct = None if not target else min(round(100 * done / target), 999)
        expected = None if not target else round(target * elapsed)
        items.append({"metric": metric, "target": target, "actual": done, "pct": pct, "expected": expected, "on_track": None if not target else done >= (expected or 0)})
    return JSONResponse({"year": chosen, "items": items, "elapsed_pct": round(100 * elapsed)})


class PlanIn(BaseModel):
    year: int = Field(ge=2024, le=2100)
    targets: dict[str, int]


@router.put("/plan")
async def save_plan(body: PlanIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    if not set(body.targets) <= set(METRICS) or any(value < 0 or value > 10_000_000 for value in body.targets.values()):
        return problem(422, "VALIDATION", "Reja noto'g'ri", "Ko'rsatkich nomi yoki qiymati noto'g'ri.")
    async with _engine(request).begin() as conn:
        roles = await _roles(conn, user_id)
        if not roles & DISTRICT_ROLES:
            return _forbidden()
        for metric, value in body.targets.items():
            await conn.execute(
                text(
                    """
                    INSERT INTO district_targets (year, metric, target, updated_by) VALUES (:y, :m, :t, :u)
                    ON CONFLICT (year, metric) DO UPDATE SET target = EXCLUDED.target, updated_by = EXCLUDED.updated_by, updated_at = now()
                    """
                ),
                {"y": body.year, "m": metric, "t": value, "u": user_id},
            )
        await audit(conn, user_id, roles, "PLAN_SAVED", "DISTRICT_PLAN", None, {"year": body.year, "targets": body.targets})
    return JSONResponse({"status": "saved"})


# ----------------------------------------------------------------- instructions


class TaskIn(BaseModel):
    team: Literal["employment", "agency", "mahalla", "education"]
    title: str = Field(min_length=5, max_length=200)
    detail: str | None = Field(default=None, max_length=1500)
    due: date | None = None


@router.post("/tasks")
async def create_task(body: TaskIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    if body.due is not None and body.due < date.today():
        return problem(422, "VALIDATION", "Muddat noto'g'ri", "Muddat o'tib ketgan bo'lmasin.")
    async with _engine(request).begin() as conn:
        roles = await _roles(conn, user_id)
        if not roles & DISTRICT_ROLES:
            return _forbidden()
        task_id = new_id()
        await conn.execute(
            text("INSERT INTO district_tasks (id, team, title, detail, due, created_by) VALUES (:id, :team, :title, :detail, :due, :u)"),
            {"id": task_id, "team": body.team, "title": body.title.strip(), "detail": (body.detail or "").strip() or None, "due": body.due, "u": user_id},
        )
        await audit(conn, user_id, roles, "TASK_CREATED", "DISTRICT_TASK", task_id, {"team": body.team, "title": body.title.strip()})
    return JSONResponse({"id": str(task_id)})


@router.get("/tasks")
async def list_tasks(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & DISTRICT_ROLES:
            return _forbidden()
        rows = await conn.execute(
            text(
                """
                SELECT t.id::text AS id, t.team, t.title, t.detail, t.due::text AS due, t.status, t.created_at::date::text AS created,
                       t.done_at::date::text AS done_at, t.done_note, u.full_name AS done_by,
                       (t.status = 'OPEN' AND t.due IS NOT NULL AND t.due < current_date) AS overdue
                FROM district_tasks t LEFT JOIN users u ON u.id = t.done_by
                ORDER BY t.status = 'OPEN' DESC, t.due NULLS LAST, t.created_at DESC LIMIT 100
                """
            )
        )
        items = [dict(r) for r in rows.mappings()]
    return JSONResponse(items)


@router.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        roles = await _roles(conn, user_id)
        if not roles & DISTRICT_ROLES:
            return _forbidden()
        done = await conn.execute(text("UPDATE district_tasks SET status = 'CANCELLED' WHERE id = :id AND status = 'OPEN' RETURNING id"), {"id": task_id})
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Topshiriq topilmadi", "Topshiriq yo'q yoki yopilgan.")
        await audit(conn, user_id, roles, "TASK_CANCELLED", "DISTRICT_TASK", task_id, {})
    return JSONResponse({"status": "cancelled"})


@router.get("/tasks/mine")
async def my_tasks(request: Request) -> JSONResponse:
    """Open instructions for the team of the signed-in person (an administrator sees all of them)."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        roles = await _roles(conn, user_id)
        teams = sorted({TEAM_OF_ROLE[r] for r in roles if r in TEAM_OF_ROLE and TEAM_OF_ROLE[r] != "admin"})
        everyone = bool(roles & {"admin", "superadmin"})
        if not teams and not everyone:
            return _forbidden()
        rows = await conn.execute(
            text(
                """
                SELECT id::text AS id, team, title, detail, due::text AS due, (due IS NOT NULL AND due < current_date) AS overdue
                FROM district_tasks WHERE status = 'OPEN' AND (team = ANY(:teams) OR :everyone) ORDER BY due NULLS LAST, created_at LIMIT 50
                """
            ),
            {"teams": teams, "everyone": everyone},
        )
        items = [dict(r) for r in rows.mappings()]
    return JSONResponse(items)


class DoneIn(BaseModel):
    note: str | None = Field(default=None, max_length=500)


@router.post("/tasks/{task_id}/done")
async def finish_task(task_id: uuid.UUID, body: DoneIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        roles = await _roles(conn, user_id)
        teams = sorted({TEAM_OF_ROLE[r] for r in roles if r in TEAM_OF_ROLE and TEAM_OF_ROLE[r] != "admin"})
        everyone = bool(roles & {"admin", "superadmin"})
        done = await conn.execute(
            text(
                "UPDATE district_tasks SET status = 'DONE', done_by = :u, done_at = now(), done_note = NULLIF(:n, '') "
                "WHERE id = :id AND status = 'OPEN' AND (team = ANY(:teams) OR :everyone) RETURNING id"
            ),
            {"u": user_id, "n": (body.note or "").strip(), "id": task_id, "teams": teams, "everyone": everyone},
        )
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Topshiriq topilmadi", "Topshiriq yo'q, yopilgan yoki sizning jamoangiznikiga tegishli emas.")
        await audit(conn, user_id, roles, "TASK_DONE", "DISTRICT_TASK", task_id, {"note": (body.note or "").strip()})
    return JSONResponse({"status": "done"})

