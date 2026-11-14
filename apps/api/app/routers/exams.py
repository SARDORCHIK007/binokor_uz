import uuid

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.doc_i18n import current_lang, pick
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/learning", tags=["exams"])


class Answer(BaseModel):
    question_id: uuid.UUID
    choice: int = Field(ge=0, le=3)


class ExamBody(BaseModel):
    answers: list[Answer]


class PracticeBody(BaseModel):
    enrollment_id: uuid.UUID
    practice_score: int = Field(ge=0, le=100)


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


def _text(value: object) -> str:
    return pick(value, current_lang()) if isinstance(value, dict) else str(value or "")


@router.get("/exam")
async def exam(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        enrollment = await conn.execute(
            text(
                """
                SELECT e.id, g.mentor_user_id, c.trade_id
                FROM enrollments e
                JOIN groups g ON g.id = e.group_id
                JOIN courses c ON c.id = g.course_id
                WHERE e.student_user_id = :id AND e.status = 'ACTIVE'
                LIMIT 1
                """
            ),
            {"id": user_id},
        )
        found = enrollment.mappings().first()
        if found is None:
            return JSONResponse({"state": "empty"})
        taken = await conn.execute(
            text(
                """
                SELECT theory_score, practice_score
                FROM final_exams WHERE enrollment_id = :id
                """
            ),
            {"id": found["id"]},
        )
        result = taken.mappings().first()
        if result is not None:
            return JSONResponse(
                {
                    "state": "done",
                    "theory_score": result["theory_score"],
                    "practice_score": result["practice_score"],
                }
            )
        rows = await conn.execute(
            text(
                """
                SELECT id::text AS id, body, options
                FROM question_bank
                WHERE trade_id = :trade_id AND is_active
                ORDER BY random()
                LIMIT 30
                """
            ),
            {"trade_id": found["trade_id"]},
        )
        questions = [
            {"id": item["id"], "body": _text(item["body"]), "options": item["options"]}
            for item in rows.mappings()
        ]
        enrollment_id = found["id"]
    from datetime import UTC, datetime, timedelta

    deadline = datetime.now(UTC) + timedelta(minutes=20)
    redis = request.app.state.redis
    await redis.set(f"exam:{enrollment_id}", deadline.isoformat(), ex=20 * 60)
    return JSONResponse(
        {
            "state": "open",
            "deadline": deadline.isoformat(),
            "minutes": 20,
            "questions": questions,
        }
    )


@router.post("/exam")
async def submit_exam(body: ExamBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    if not body.answers:
        return problem(400, "EMPTY_EXAM", "Javob yo'q", "Kamida bitta javob kerak.")
    engine = _engine(request)
    async with engine.begin() as conn:
        enrollment = await conn.execute(
            text(
                """
                SELECT e.id, g.mentor_user_id
                FROM enrollments e
                JOIN groups g ON g.id = e.group_id
                WHERE e.student_user_id = :id AND e.status = 'ACTIVE'
                LIMIT 1
                """
            ),
            {"id": user_id},
        )
        found = enrollment.mappings().first()
        if found is None:
            return problem(404, "NO_ENROLLMENT", "Guruh yo'q", "Faol o'qish topilmadi.")
        redis = request.app.state.redis
        deadline_raw = await redis.get(f"exam:{found['id']}")
        if deadline_raw is None:
            return problem(409, "EXAM_EXPIRED", "Vaqt tugagan", "Testni qaytadan boshlang. 20 daqiqa beriladi.")
        from datetime import UTC, datetime

        deadline_text = deadline_raw.decode() if isinstance(deadline_raw, bytes) else str(deadline_raw)
        if datetime.now(UTC) > datetime.fromisoformat(deadline_text):
            return problem(409, "EXAM_EXPIRED", "Vaqt tugagan", "20 daqiqa ichida topshirilmadi.")
        if len(body.answers) < 30:
            return problem(422, "EXAM_SHORT", "Savol yetarli emas", "30 ta savolning hammasi kerak.")
        correct = 0
        for answer in body.answers:
            row = await conn.execute(
                text("SELECT correct FROM question_bank WHERE id = :id"),
                {"id": answer.question_id},
            )
            key = row.scalar()
            if key is not None and int(key) == answer.choice:
                correct += 1
        theory = round(correct * 100 / len(body.answers))
        await conn.execute(
            text(
                """
                INSERT INTO final_exams (
                  id, enrollment_id, theory_score, question_ids, answers, examiner_ids, held_at
                )
                VALUES (
                  :id, :enrollment_id, :theory, CAST(:questions AS text[])::uuid[], CAST(:answers AS jsonb),
                  ARRAY[CAST(:mentor AS uuid)], now()
                )
                ON CONFLICT (enrollment_id) DO NOTHING
                """
            ),
            {
                "id": new_id(),
                "enrollment_id": found["id"],
                "theory": theory,
                "questions": [str(item.question_id) for item in body.answers],
                "answers": json_answers(body),
                "mentor": found["mentor_user_id"],
            },
        )
    return JSONResponse({"theory_score": theory})


def json_answers(body: ExamBody) -> str:
    import json

    return json.dumps(
        [{"question_id": str(item.question_id), "choice": item.choice} for item in body.answers]
    )


@router.post("/practice")
async def practice(body: PracticeBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.begin() as conn:
        allowed = await conn.execute(
            text(
                """
                SELECT 1
                FROM enrollments e
                JOIN groups g ON g.id = e.group_id
                WHERE e.id = :enrollment_id
                  AND (g.mentor_user_id = :user_id OR EXISTS (
                    SELECT 1 FROM user_roles r WHERE r.user_id = :user_id AND r.role = 'admin'
                  ))
                """
            ),
            {"enrollment_id": body.enrollment_id, "user_id": user_id},
        )
        if allowed.first() is None:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Amaliy baho shu guruh ustozi uchun.")
        updated = await conn.execute(
            text(
                """
                UPDATE final_exams
                SET practice_score = :score
                WHERE enrollment_id = :enrollment_id
                RETURNING theory_score
                """
            ),
            {"score": body.practice_score, "enrollment_id": body.enrollment_id},
        )
        if updated.first() is None:
            return problem(409, "NO_THEORY", "Nazariya yo'q", "Avval tinglovchi nazariy testdan o'tadi.")
    return JSONResponse({"practice_score": body.practice_score})
