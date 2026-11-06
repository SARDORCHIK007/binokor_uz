import uuid

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.security import bearer_from_request, problem, read_access_token

router = APIRouter(prefix="/api/v1/cabinet", tags=["cabinet"])


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


def _label(value: object) -> str:
    if isinstance(value, dict):
        return str(value.get("uz-Latn") or "")
    return ""


@router.get("/dashboard")
async def dashboard(request: Request, role: str = "student") -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        roles = await conn.execute(
            text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"),
            {"id": user_id},
        )
        owned = [str(item["role"]) for item in roles.mappings()]
        if role not in owned:
            return problem(403, "FORBIDDEN", "Rol yo'q", "Bu rol sizga biriktirilmagan.")
        if role == "admin":
            return JSONResponse({"role": role, "admin": await _admin(conn)})
        if role == "mentor":
            return JSONResponse({"role": role, "mentor": await _mentor(conn, user_id)})
        return JSONResponse({"role": role, "student": await _student(conn, user_id)})


async def _admin(conn: AsyncConnection) -> dict[str, object]:
    counts = await conn.execute(
        text(
            """
            SELECT
              (SELECT count(*) FROM applications WHERE status <> 'DRAFT') AS applications,
              (SELECT count(*) FROM enrollments WHERE status = 'ACTIVE') AS enrolled,
              (SELECT count(*) FROM certificates WHERE status = 'ISSUED') AS certified,
              (SELECT count(*) FROM placements) AS employed
            """
        )
    )
    row = counts.mappings().one()
    funnel_rows = await conn.execute(
        text(
            """
            SELECT status::text AS status, count(*) AS total
            FROM applications
            WHERE status <> 'DRAFT'
            GROUP BY status
            """
        )
    )
    funnel = {item["status"]: int(item["total"]) for item in funnel_rows.mappings()}
    queue = await conn.execute(
        text(
            """
            SELECT c.id::text AS id, c.status::text AS status, t.name AS trade_name
            FROM certificates c
            JOIN trades t ON t.id = c.trade_id
            WHERE c.status IN ('DRAFT', 'PENDING_APPROVAL')
            ORDER BY c.created_at
            LIMIT 20
            """
        )
    )
    alerts = await conn.execute(
        text(
            """
            SELECT u.full_name, count(*) AS days
            FROM attendance a
            JOIN enrollments e ON e.id = a.enrollment_id
            JOIN users u ON u.id = e.student_user_id
            WHERE a.status IN ('ABSENT_EXCUSED', 'ABSENT_UNEXCUSED')
              AND a.date >= current_date - 3
            GROUP BY u.full_name
            HAVING count(*) >= 3
            """
        )
    )
    return {
        "kpi": {key: int(row[key]) for key in ("applications", "enrolled", "certified", "employed")},
        "funnel": [
            {"key": "applied", "value": sum(funnel.values())},
            {"key": "accepted", "value": funnel.get("ACCEPTED", 0)},
            {"key": "studying", "value": int(row["enrolled"])},
            {"key": "certified", "value": int(row["certified"])},
            {"key": "placed", "value": int(row["employed"])},
        ],
        "queue": [
            {"id": item["id"], "status": item["status"], "trade": _label(item["trade_name"])}
            for item in queue.mappings()
        ],
        "alerts": [
            {"name": item["full_name"], "days": int(item["days"])} for item in alerts.mappings()
        ],
    }


async def _mentor(conn: AsyncConnection, user_id: uuid.UUID) -> dict[str, object]:
    groups = await conn.execute(
        text(
            """
            SELECT g.id::text AS id, g.code, g.max_students,
                   count(e.id) FILTER (WHERE e.status = 'ACTIVE') AS students
            FROM groups g
            LEFT JOIN enrollments e ON e.group_id = g.id
            WHERE g.mentor_user_id = :id
            GROUP BY g.id
            ORDER BY g.code
            """
        ),
        {"id": user_id},
    )
    risk = await conn.execute(
        text(
            """
            SELECT u.full_name, count(*) AS missed
            FROM attendance a
            JOIN enrollments e ON e.id = a.enrollment_id
            JOIN groups g ON g.id = e.group_id
            JOIN users u ON u.id = e.student_user_id
            WHERE g.mentor_user_id = :id
              AND a.status IN ('ABSENT_EXCUSED', 'ABSENT_UNEXCUSED')
              AND a.date >= current_date - 7
            GROUP BY u.full_name
            ORDER BY missed DESC
            LIMIT 10
            """
        ),
        {"id": user_id},
    )
    return {
        "groups": [
            {
                "id": item["id"],
                "code": item["code"],
                "students": int(item["students"]),
                "max_students": int(item["max_students"]),
            }
            for item in groups.mappings()
        ],
        "at_risk": [
            {"name": item["full_name"], "missed": int(item["missed"])} for item in risk.mappings()
        ],
    }


async def _student(conn: AsyncConnection, user_id: uuid.UUID) -> dict[str, object]:
    row = await conn.execute(
        text(
            """
            SELECT e.id AS enrollment_id, c.id AS course_id, c.title, g.code, g.schedule,
                   count(a.id) FILTER (WHERE a.status IN ('PRESENT','LATE')) AS present_days,
                   count(a.id) AS marked_days
            FROM enrollments e
            JOIN groups g ON g.id = e.group_id
            JOIN courses c ON c.id = g.course_id
            LEFT JOIN attendance a ON a.enrollment_id = e.id
            WHERE e.student_user_id = :id AND e.status = 'ACTIVE'
            GROUP BY e.id, c.id, c.title, g.code, g.schedule
            LIMIT 1
            """
        ),
        {"id": user_id},
    )
    item = row.mappings().first()
    if item is None:
        return {"enrollment": None, "attendance_pct": None, "remaining": []}
    marked = int(item["marked_days"])
    present = int(item["present_days"])
    percent = None if marked == 0 else round(present * 100 / marked)
    open_modules = await conn.execute(
        text(
            """
            SELECT count(*) FROM modules m
            WHERE m.course_id = :course_id
              AND NOT EXISTS (
                SELECT 1 FROM assessments a
                WHERE a.enrollment_id = :enrollment_id AND a.module_id = m.id AND a.passed
              )
            """
        ),
        {"course_id": item["course_id"], "enrollment_id": item["enrollment_id"]},
    )
    exam = await conn.execute(
        text("SELECT 1 FROM final_exams WHERE enrollment_id = :enrollment_id"),
        {"enrollment_id": item["enrollment_id"]},
    )
    remaining: list[str] = []
    if percent is None or percent < 80:
        remaining.append("attendance")
    if int(open_modules.scalar_one()) > 0:
        remaining.append("modules")
    if exam.first() is None:
        remaining.append("exam")
    return {
        "enrollment": {
            "course": _label(item["title"]),
            "group": item["code"],
            "schedule": item["schedule"],
        },
        "attendance_pct": percent,
        "remaining": remaining,
    }
