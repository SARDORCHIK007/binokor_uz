import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.core.config import get_settings
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/learning", tags=["learning"])

AttendanceStatus = Literal["PRESENT", "LATE", "ABSENT_EXCUSED", "ABSENT_UNEXCUSED"]


class Mark(BaseModel):
    enrollment_id: uuid.UUID
    status: AttendanceStatus
    site_hours: float = Field(default=0, ge=0, le=12)


class AttendanceBody(BaseModel):
    date: date
    default_status: AttendanceStatus = "PRESENT"
    default_site_hours: float = Field(default=4, ge=0, le=12)
    exceptions: list[Mark] = Field(default_factory=list)


class AssessmentBody(BaseModel):
    enrollment_id: uuid.UUID
    module_id: uuid.UUID
    score: int = Field(ge=0, le=100)
    passed: bool
    comment: str = ""
    evidence_file_id: uuid.UUID | None = None


class EvidenceBody(BaseModel):
    content_type: str
    data_base64: str = Field(max_length=8_000_000)


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


async def _roles(conn: AsyncConnection, user_id: uuid.UUID) -> set[str]:
    rows = await conn.execute(
        text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"),
        {"id": user_id},
    )
    return {str(item["role"]) for item in rows.mappings()}


async def _can_mark(conn: AsyncConnection, user_id: uuid.UUID, group_id: uuid.UUID) -> bool:
    roles = await _roles(conn, user_id)
    if "admin" in roles:
        return True
    row = await conn.execute(
        text("SELECT 1 FROM groups WHERE id = :group_id AND mentor_user_id = :user_id"),
        {"group_id": group_id, "user_id": user_id},
    )
    return row.first() is not None


@router.get("/my-groups")
async def my_groups(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        roles = await _roles(conn, user_id)
        if "admin" in roles:
            result = await conn.execute(
                text(
                    """
                    SELECT id::text AS id, code
                    FROM groups
                    ORDER BY code
                    """
                )
            )
        elif "mentor" in roles:
            result = await conn.execute(
                text(
                    """
                    SELECT id::text AS id, code
                    FROM groups
                    WHERE mentor_user_id = :id
                    ORDER BY code
                    """
                ),
                {"id": user_id},
            )
        else:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Davomat varaqasi ustoz uchun.")
    return JSONResponse([{"id": item["id"], "code": item["code"]} for item in result.mappings()])


@router.get("/groups/{group_id}/attendance")
async def attendance_sheet(group_id: uuid.UUID, request: Request, day: date | None = None) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    chosen = day or date.today()
    engine = _engine(request)
    async with engine.connect() as conn:
        if not await _can_mark(conn, user_id, group_id):
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu guruh sizga biriktirilmagan.")
        rows = await conn.execute(
            text(
                """
                SELECT e.id::text AS enrollment_id, u.full_name,
                       a.status::text AS status, a.site_hours
                FROM enrollments e
                JOIN users u ON u.id = e.student_user_id
                LEFT JOIN attendance a ON a.enrollment_id = e.id AND a.date = :day
                WHERE e.group_id = :group_id AND e.status = 'ACTIVE'
                ORDER BY u.full_name
                """
            ),
            {"group_id": group_id, "day": chosen},
        )
    return JSONResponse(
        {
            "date": chosen.isoformat(),
            "rows": [
                {
                    "enrollment_id": item["enrollment_id"],
                    "name": item["full_name"],
                    "status": item["status"],
                    "site_hours": None if item["site_hours"] is None else float(item["site_hours"]),
                }
                for item in rows.mappings()
            ],
        }
    )


@router.post("/groups/{group_id}/attendance")
async def save_attendance(group_id: uuid.UUID, body: AttendanceBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    header = request.headers.get("idempotency-key")
    if header is None:
        return problem(400, "IDEMPOTENCY_KEY", "Kalit yo'q", "Idempotency-Key sarlavhasi kerak.")
    engine = _engine(request)
    async with engine.begin() as conn:
        if not await _can_mark(conn, user_id, group_id):
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu guruh sizga biriktirilmagan.")
        enrolled = await conn.execute(
            text(
                """
                SELECT id FROM enrollments
                WHERE group_id = :group_id AND status = 'ACTIVE'
                """
            ),
            {"group_id": group_id},
        )
        allowed = {item["id"] for item in enrolled.mappings()}
        overlay = {mark.enrollment_id: mark for mark in body.exceptions}
        saved = 0
        for enrollment_id in allowed:
            mark = overlay.get(enrollment_id)
            status = mark.status if mark else body.default_status
            hours = mark.site_hours if mark else body.default_site_hours
            row_key = uuid.uuid5(uuid.UUID(header), str(enrollment_id)) if _is_uuid(header) else new_id()
            await conn.execute(
                text(
                    """
                    INSERT INTO attendance (
                      id, enrollment_id, date, status, site_hours, recorded_by, idempotency_key
                    )
                    VALUES (
                      :id, :enrollment_id, :day, CAST(:status AS attendance_status),
                      :hours, :user_id, :idempotency_key
                    )
                    ON CONFLICT (enrollment_id, date) DO UPDATE SET
                      status = EXCLUDED.status,
                      site_hours = EXCLUDED.site_hours,
                      recorded_by = EXCLUDED.recorded_by
                    """
                ),
                {
                    "id": new_id(),
                    "enrollment_id": enrollment_id,
                    "day": body.date,
                    "status": status,
                    "hours": hours,
                    "user_id": user_id,
                    "idempotency_key": row_key,
                },
            )
            saved += 1
    return JSONResponse({"saved": saved, "conflicts": []})


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
    except ValueError:
        return False
    return True


@router.get("/groups/{group_id}/grades")
async def grades(group_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        if not await _can_mark(conn, user_id, group_id):
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu guruh sizga biriktirilmagan.")
        modules = await conn.execute(
            text(
                """
                SELECT m.id::text AS id, m.title, m.rubric
                FROM modules m
                JOIN groups g ON g.course_id = m.course_id
                WHERE g.id = :group_id
                ORDER BY m.ord
                """
            ),
            {"group_id": group_id},
        )
        rows = await conn.execute(
            text(
                """
                SELECT e.id::text AS enrollment_id, u.full_name,
                       a.module_id::text AS module_id, a.score, a.passed, a.comment,
                       coalesce(array_length(a.evidence_file_ids, 1), 0) AS evidence_count
                FROM enrollments e
                JOIN users u ON u.id = e.student_user_id
                LEFT JOIN assessments a ON a.enrollment_id = e.id
                WHERE e.group_id = :group_id AND e.status = 'ACTIVE'
                ORDER BY u.full_name
                """
            ),
            {"group_id": group_id},
        )
    packed: dict[str, dict[str, object]] = {}
    for item in rows.mappings():
        entry = packed.setdefault(
            str(item["enrollment_id"]),
            {"enrollment_id": item["enrollment_id"], "name": item["full_name"], "scores": {}},
        )
        scores = entry["scores"]
        if item["module_id"] is not None and isinstance(scores, dict):
            scores[str(item["module_id"])] = {
                "score": item["score"],
                "passed": item["passed"],
                "comment": item["comment"] or "",
                "evidence_count": int(item["evidence_count"]),
            }
    return JSONResponse(
        {
            "modules": [
                {"id": item["id"], "title": _label(item["title"]), "rubric": item["rubric"] or {"criteria": []}}
                for item in modules.mappings()
            ],
            "rows": list(packed.values()),
        }
    )


@router.post("/assessments")
async def save_assessment(body: AssessmentBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.begin() as conn:
        group = await conn.execute(
            text("SELECT group_id FROM enrollments WHERE id = :id"),
            {"id": body.enrollment_id},
        )
        found = group.mappings().first()
        if found is None or not await _can_mark(conn, user_id, found["group_id"]):
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu tinglovchi sizning guruhingizda emas.")
        await conn.execute(
            text(
                """
                INSERT INTO assessments (
                  id, enrollment_id, module_id, score, passed, comment, assessed_by, evidence_file_ids
                )
                VALUES (
                  :id, :enrollment_id, :module_id, :score, :passed, :comment, :user_id,
                  CASE WHEN CAST(:file_id AS text) IS NULL THEN '{}'::uuid[]
                       ELSE ARRAY[CAST(:file_id AS uuid)] END
                )
                ON CONFLICT (enrollment_id, module_id) DO UPDATE SET
                  score = EXCLUDED.score,
                  passed = EXCLUDED.passed,
                  comment = EXCLUDED.comment,
                  assessed_by = EXCLUDED.assessed_by,
                  assessed_at = now(),
                  evidence_file_ids = CASE
                    WHEN CAST(:file_id AS text) IS NULL THEN assessments.evidence_file_ids
                    ELSE EXCLUDED.evidence_file_ids
                  END
                """
            ),
            {
                "id": new_id(),
                "enrollment_id": body.enrollment_id,
                "module_id": body.module_id,
                "score": body.score,
                "passed": body.passed,
                "comment": body.comment,
                "user_id": user_id,
                "file_id": None if body.evidence_file_id is None else str(body.evidence_file_id),
            },
        )
    return JSONResponse({"saved": True})


@router.post("/evidence")
async def upload_evidence(body: EvidenceBody, request: Request) -> JSONResponse:
    import base64
    import hashlib
    from pathlib import Path

    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    if body.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        return problem(422, "VALIDATION", "Rasm turi noto'g'ri", "JPEG, PNG yoki WebP yuboring.")
    try:
        raw = base64.b64decode(body.data_base64, validate=True)
    except ValueError:
        return problem(422, "VALIDATION", "Rasm o'qilmadi", "Fayl buzilgan.")
    if len(raw) > 5_000_000:
        return problem(422, "VALIDATION", "Rasm katta", "5 MB dan kichik rasm yuboring.")
    file_id = new_id()
    folder = Path(get_settings().evidence_dir)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / f"{file_id}.bin").write_bytes(raw)
    engine = _engine(request)
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                INSERT INTO files (id, bucket, key, mime, size_bytes, sha256, scan_status, owner_id)
                VALUES (
                  :id, 'private', :key, :mime, :size, decode(:sha, 'hex'), 'CLEAN', :owner_id
                )
                """
            ),
            {
                "id": file_id,
                "key": f"evidence/{file_id}",
                "mime": body.content_type,
                "size": len(raw),
                "sha": hashlib.sha256(raw).hexdigest(),
                "owner_id": user_id,
            },
        )
    return JSONResponse({"id": str(file_id)})


@router.get("/mine")
async def mine(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        attendance = await conn.execute(
            text(
                """
                SELECT a.date::text AS date, a.status::text AS status, a.site_hours
                FROM attendance a
                JOIN enrollments e ON e.id = a.enrollment_id
                WHERE e.student_user_id = :id
                ORDER BY a.date DESC
                LIMIT 30
                """
            ),
            {"id": user_id},
        )
        grades_rows = await conn.execute(
            text(
                """
                SELECT m.title, a.score, a.passed
                FROM assessments a
                JOIN enrollments e ON e.id = a.enrollment_id
                JOIN modules m ON m.id = a.module_id
                WHERE e.student_user_id = :id
                ORDER BY m.ord
                """
            ),
            {"id": user_id},
        )
    return JSONResponse(
        {
            "attendance": [
                {
                    "date": item["date"],
                    "status": item["status"],
                    "site_hours": float(item["site_hours"]),
                }
                for item in attendance.mappings()
            ],
            "grades": [
                {"module": _label(item["title"]), "score": item["score"], "passed": item["passed"]}
                for item in grades_rows.mappings()
            ],
        }
    )
