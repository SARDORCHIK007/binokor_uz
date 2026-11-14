"""The person card: one place where the teams that work with a learner see the same picture, each according to its role,
and leave notes and hand-off tasks for one another (mahalla -> employment -> migration agency -> training centre).

Phone numbers are never returned. Payments are visible to the employment office only.
"""

import uuid
from datetime import date
from typing import Any, Literal

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.doc_i18n import current_lang, pick
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/people", tags=["people"])

TEAM_OF_ROLE = {
    "employment_officer": "employment",
    "agency_officer": "agency",
    "mahalla_assistant": "mahalla",
    "education_lead": "education",
    "admin": "admin",
    "superadmin": "admin",
}
TEAMS = ("employment", "agency", "mahalla", "education", "admin")


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
    return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu shaxs kartasini ko'rish huquqingiz yo'q.")


async def _teams(conn: AsyncConnection, user_id: uuid.UUID) -> set[str]:
    rows = await conn.execute(text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"), {"id": user_id})
    return {TEAM_OF_ROLE[str(r["role"])] for r in rows.mappings() if str(r["role"]) in TEAM_OF_ROLE}


async def _may_see(conn: AsyncConnection, user_id: uuid.UUID, teams: set[str], person_id: uuid.UUID) -> bool:
    if not teams:
        return False
    if teams != {"mahalla"}:
        return True
    row = await conn.execute(
        text("SELECT 1 FROM persons p JOIN staff_mahallas s ON s.mahalla_id = p.mahalla_id WHERE p.id = :p AND s.user_id = :u"),
        {"p": person_id, "u": user_id},
    )
    return row.first() is not None


@router.get("/tasks/mine")
async def my_tasks(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        teams = await _teams(conn, user_id)
        if not teams:
            return _forbidden()
        rows = await conn.execute(
            text(
                """
                SELECT t.id::text AS id, t.title, t.due::text AS due, t.team, t.created_team, p.id::text AS person_id, p.last_name, p.first_name,
                       (t.due IS NOT NULL AND t.due < CURRENT_DATE) AS overdue
                FROM case_tasks t JOIN persons p ON p.id = t.person_id
                WHERE t.done_at IS NULL AND (t.team = ANY(:teams) OR 'admin' = ANY(:teams))
                ORDER BY t.due NULLS LAST, t.created_at LIMIT 100
                """
            ),
            {"teams": sorted(teams)},
        )
        items = [{"id": r["id"], "title": r["title"], "due": r["due"], "team": r["team"], "from": r["created_team"], "person_id": r["person_id"], "person": f"{r['last_name']} {r['first_name']}", "overdue": bool(r["overdue"])} for r in rows.mappings()]
    return JSONResponse(items)


@router.post("/tasks/{task_id}/done")
async def finish_task(task_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        teams = await _teams(conn, user_id)
        done = await conn.execute(
            text("UPDATE case_tasks SET done_at = now(), done_by = :u WHERE id = :id AND done_at IS NULL AND (team = ANY(:teams) OR 'admin' = ANY(:teams)) RETURNING id"),
            {"u": user_id, "id": task_id, "teams": sorted(teams)},
        )
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Vazifa topilmadi", "Vazifa yo'q, bajarilgan yoki sizning jamoangizniki emas.")
    return JSONResponse({"status": "done"})


@router.get("/{person_id}")
async def card(person_id: uuid.UUID, request: Request, lang: str | None = None) -> JSONResponse:
    code = current_lang()
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        teams = await _teams(conn, user_id)
        if not await _may_see(conn, user_id, teams, person_id):
            return _forbidden()
        admin = "admin" in teams
        person = (
            await conn.execute(
                text(
                    """
                    SELECT p.id::text AS id, p.user_id, p.last_name, p.first_name, p.birth_date::text AS birth, p.university, p.graduation_year, m.name AS mahalla
                    FROM persons p LEFT JOIN mahallas m ON m.id = p.mahalla_id WHERE p.id = :id
                    """
                ),
                {"id": person_id},
            )
        ).mappings().first()
        if person is None:
            return problem(404, "NOT_FOUND", "Shaxs topilmadi", "Bunday shaxs yo'q.")
        apps = await conn.execute(
            text(
                """
                SELECT a.id::text AS id, a.status::text AS status, a.source, a.type::text AS type, a.desired_track::text AS track, a.created_at::date::text AS created,
                       a.matrix_suggested::text AS matrix, t.name AS trade
                FROM applications a LEFT JOIN trades t ON t.id = a.desired_trade_id WHERE a.person_id = :id AND a.status <> 'DRAFT' ORDER BY a.created_at DESC
                """
            ),
            {"id": person_id},
        )
        card_data: dict[str, Any] = {
            "person": {
                "id": person["id"],
                "name": f"{person['last_name']} {person['first_name']}",
                "birth": person["birth"],
                "mahalla": pick(person["mahalla"], code),
                "university": person["university"],
                "graduation_year": person["graduation_year"],
            },
            "applications": [{**{k: r[k] for k in ("id", "status", "source", "type", "track", "created", "matrix")}, "trade": pick(r["trade"], code)} for r in apps.mappings()],
            "teams": sorted(teams),
        }
        uid = person["user_id"]
        sections = ["basic"]
        if uid is not None and teams & {"employment", "education", "admin"}:
            sections.append("education")
            enr = (
                await conn.execute(
                    text(
                        """
                        SELECT e.id, e.status::text AS status, e.enrolled_at::text AS since, g.code, mu.full_name AS mentor
                        FROM enrollments e JOIN groups g ON g.id = e.group_id JOIN users mu ON mu.id = g.mentor_user_id
                        WHERE e.student_user_id = :u ORDER BY e.enrolled_at DESC LIMIT 1
                        """
                    ),
                    {"u": uid},
                )
            ).mappings().first()
            education: dict[str, Any] = {"enrollment": None}
            if enr is not None:
                att = (await conn.execute(text("SELECT count(*) AS n, count(*) FILTER (WHERE status IN ('PRESENT', 'LATE')) AS p, coalesce(sum(site_hours), 0) AS h FROM attendance WHERE enrollment_id = :e"), {"e": enr["id"]})).mappings().one()
                grades = (await conn.execute(text("SELECT count(*) AS n, count(*) FILTER (WHERE passed) AS p, avg(score) AS s FROM assessments WHERE enrollment_id = :e"), {"e": enr["id"]})).mappings().one()
                education = {
                    "enrollment": {"group": enr["code"], "mentor": enr["mentor"], "status": enr["status"], "since": enr["since"]},
                    "lessons": int(att["n"]),
                    "attendance": None if att["n"] == 0 else round(100 * int(att["p"]) / int(att["n"])),
                    "site_hours": float(att["h"]),
                    "graded": int(grades["n"]),
                    "passed": int(grades["p"]),
                    "score": None if grades["s"] is None else round(float(grades["s"])),
                }
            certs = await conn.execute(text("SELECT number, status::text AS status, issued_at::date::text AS issued FROM certificates WHERE person_id = :p AND number IS NOT NULL ORDER BY issued_at DESC"), {"p": person_id})
            education["certificates"] = [dict(r) for r in certs.mappings()]
            card_data["education"] = education
        if uid is not None and teams & {"employment", "agency", "admin"}:
            sections.append("work")
            wp = (await conn.execute(text("SELECT slug, level::text AS level, availability::text AS availability, verified_hours, rating_avg FROM worker_profiles WHERE user_id = :u"), {"u": uid})).mappings().first()
            placements = await conn.execute(
                text("SELECT e.name, pl.kind::text AS kind, pl.start_date::text AS start, pl.end_date::text AS finish FROM placements pl JOIN employers e ON e.id = pl.employer_id WHERE pl.worker_user_id = :u ORDER BY pl.start_date DESC"),
                {"u": uid},
            )
            langs = await conn.execute(text("SELECT lang_code, level FROM person_languages WHERE person_id = :p ORDER BY lang_code"), {"p": person_id})
            cands = await conn.execute(
                text(
                    """
                    SELECT r.id::text AS vacancy_id, r.title AS own_title, t.name AS trade_name, r.track::text AS track, coalesce(d.country_code, e.country_code) AS country,
                           e.name AS employer, c.stage, c.status, c.stage_note
                    FROM request_candidates c JOIN demand_requests r ON r.id = c.request_id JOIN employers e ON e.id = r.employer_id
                    JOIN trades t ON t.id = r.trade_id LEFT JOIN destinations d ON d.id = r.destination_id WHERE c.worker_user_id = :u ORDER BY r.created_at DESC
                    """
                ),
                {"u": uid},
            )
            card_data["work"] = {
                "profile": None if wp is None else {"slug": wp["slug"], "level": wp["level"], "availability": wp["availability"], "hours": int(wp["verified_hours"] or 0), "rating": None if wp["rating_avg"] is None else float(wp["rating_avg"])},
                "placements": [dict(r) for r in placements.mappings()],
                "languages": [{"code": str(r["lang_code"]), "level": int(r["level"])} for r in langs.mappings()],
                "candidacies": [{**{k: v for k, v in dict(r).items() if k not in ("own_title", "trade_name")}, "title": r["own_title"] or pick(r["trade_name"], code), "country": str(r["country"] or "").strip()} for r in cands.mappings()],
            }
        if teams & {"employment", "admin"}:
            sections.append("payments")
            pays = await conn.execute(
                text("SELECT b.period, pay.amount, pay.status, pay.hold_reason FROM payments pay JOIN payment_batches b ON b.id = pay.batch_id WHERE pay.person_id = :p AND b.status <> 'CANCELLED' ORDER BY b.period DESC LIMIT 24"),
                {"p": person_id},
            )
            card_data["payments"] = [{"period": r["period"], "amount": float(r["amount"]), "status": r["status"], "reason": r["hold_reason"]} for r in pays.mappings()]
        notes = await conn.execute(
            text(
                """
                SELECT n.id::text AS id, n.team, n.body, n.shared, n.created_at::text AS at, u.full_name
                FROM case_notes n LEFT JOIN users u ON u.id = n.author_id
                WHERE n.person_id = :p AND (n.shared OR n.team = ANY(:teams) OR :admin) ORDER BY n.created_at DESC LIMIT 100
                """
            ),
            {"p": person_id, "teams": sorted(teams), "admin": admin},
        )
        tasks = await conn.execute(
            text(
                """
                SELECT t.id::text AS id, t.team, t.title, t.due::text AS due, t.created_team, t.done_at IS NOT NULL AS done, t.created_at::text AS at
                FROM case_tasks t WHERE t.person_id = :p AND (t.team = ANY(:teams) OR t.created_team = ANY(:teams) OR :admin)
                ORDER BY t.done_at IS NOT NULL, t.due NULLS LAST, t.created_at DESC LIMIT 60
                """
            ),
            {"p": person_id, "teams": sorted(teams), "admin": admin},
        )
        card_data["notes"] = [{"id": r["id"], "team": r["team"], "text": r["body"], "shared": bool(r["shared"]), "at": r["at"][:16], "by": r["full_name"]} for r in notes.mappings()]
        card_data["tasks"] = [{"id": r["id"], "team": r["team"], "title": r["title"], "due": r["due"], "from": r["created_team"], "done": bool(r["done"])} for r in tasks.mappings()]
        card_data["sections"] = sections
    return JSONResponse(card_data)


class NoteIn(BaseModel):
    body: str = Field(min_length=2, max_length=2000)
    shared: bool = True


@router.post("/{person_id}/notes")
async def add_note(person_id: uuid.UUID, body: NoteIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        teams = await _teams(conn, user_id)
        if not await _may_see(conn, user_id, teams, person_id):
            return _forbidden()
        team = next((t for t in TEAMS if t in teams), "admin")
        await conn.execute(
            text("INSERT INTO case_notes (id, person_id, author_id, team, body, shared) VALUES (:id, :p, :u, :t, :b, :s)"),
            {"id": new_id(), "p": person_id, "u": user_id, "t": team, "b": body.body.strip(), "s": body.shared},
        )
    return JSONResponse({"status": "saved"})


class TaskIn(BaseModel):
    team: Literal["employment", "agency", "mahalla", "education", "admin"]
    title: str = Field(min_length=3, max_length=200)
    due: date | None = None


@router.post("/{person_id}/tasks")
async def add_task(person_id: uuid.UUID, body: TaskIn, request: Request) -> JSONResponse:
    """Hand a job to another team about this person (for example employment asks the agency to check documents)."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        teams = await _teams(conn, user_id)
        if not await _may_see(conn, user_id, teams, person_id):
            return _forbidden()
        mine = next((t for t in TEAMS if t in teams), "admin")
        await conn.execute(
            text("INSERT INTO case_tasks (id, person_id, team, title, due, created_by, created_team) VALUES (:id, :p, :t, :title, :due, :u, :mine)"),
            {"id": new_id(), "p": person_id, "t": body.team, "title": body.title.strip(), "due": body.due, "u": user_id, "mine": mine},
        )
    return JSONResponse({"status": "created"})
