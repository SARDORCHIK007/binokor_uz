import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.security import bearer_from_request, problem, read_access_token

router = APIRouter(prefix="/api/v1/vocab", tags=["vocab"])


class AnswerBody(BaseModel):
    word_id: uuid.UUID
    correct: bool


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


@router.get("/today")
async def today(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        total = await conn.execute(
            text("SELECT count(*) FROM vocab_words WHERE lang_code = 'de' AND status = 'PUBLISHED'")
        )
        learned = await conn.execute(
            text("SELECT count(*) FROM vocab_progress WHERE user_id = :id AND box >= 3"),
            {"id": user_id},
        )
        rows = await conn.execute(
            text(
                """
                SELECT w.id::text AS id, w.word, w.translation_uz, w.category
                FROM vocab_words w
                LEFT JOIN vocab_progress p ON p.word_id = w.id AND p.user_id = :id
                WHERE w.lang_code = 'de' AND w.status = 'PUBLISHED'
                  AND (p.user_id IS NULL OR p.next_review_at <= now())
                ORDER BY w.rank
                LIMIT 20
                """
            ),
            {"id": user_id},
        )
    return JSONResponse(
        {
            "new": [
                {
                    "id": item["id"],
                    "word": item["word"],
                    "translation": item["translation_uz"],
                    "category": item["category"],
                }
                for item in rows.mappings()
            ],
            "learned": int(learned.scalar_one()),
            "total": int(total.scalar_one()),
        }
    )


@router.post("/answers")
async def answers(body: AnswerBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    box = 2 if body.correct else 1
    engine = _engine(request)
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                INSERT INTO vocab_progress (user_id, word_id, box, next_review_at, correct_count, wrong_count, last_answer_at)
                VALUES (
                  :user_id, :word_id, :box, now() + interval '1 day',
                  CASE WHEN :correct THEN 1 ELSE 0 END,
                  CASE WHEN :correct THEN 0 ELSE 1 END,
                  now()
                )
                ON CONFLICT (user_id, word_id) DO UPDATE SET
                  box = LEAST(5, GREATEST(1, vocab_progress.box + CASE WHEN :correct THEN 1 ELSE -1 END)),
                  next_review_at = now() + (
                    power(
                      2,
                      LEAST(5, GREATEST(1, vocab_progress.box + CASE WHEN :correct THEN 1 ELSE -1 END)) - 1
                    )::int * interval '1 day'
                  ),
                  correct_count = vocab_progress.correct_count + CASE WHEN :correct THEN 1 ELSE 0 END,
                  wrong_count = vocab_progress.wrong_count + CASE WHEN :correct THEN 0 ELSE 1 END,
                  last_answer_at = now()
                """
            ),
            {"user_id": user_id, "word_id": body.word_id, "box": box, "correct": body.correct},
        )
        await conn.execute(
            text(
                """
                INSERT INTO vocab_days (user_id, day, answers, correct)
                VALUES (:user_id, (now() AT TIME ZONE 'Asia/Tashkent')::date, 1, CASE WHEN :correct THEN 1 ELSE 0 END)
                ON CONFLICT (user_id, day) DO UPDATE SET
                  answers = vocab_days.answers + 1,
                  correct = vocab_days.correct + EXCLUDED.correct
                """
            ),
            {"user_id": user_id, "correct": body.correct},
        )
    return JSONResponse({"saved": True})


@router.get("/stats")
async def stats(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        rows = await conn.execute(
            text(
                """
                SELECT w.category, count(*) AS total,
                       count(p.word_id) FILTER (WHERE p.box >= 3) AS learned
                FROM vocab_words w
                LEFT JOIN vocab_progress p ON p.word_id = w.id AND p.user_id = :id
                WHERE w.lang_code = 'de' AND w.status = 'PUBLISHED'
                GROUP BY w.category
                ORDER BY w.category
                """
            ),
            {"id": user_id},
        )
    return JSONResponse(
        [
            {"category": item["category"], "total": int(item["total"]), "learned": int(item["learned"])}
            for item in rows.mappings()
        ]
    )


DAILY_GOAL = 20


def streaks(days: set[date], today: date) -> tuple[int, int]:
    """Current streak (ending today, or yesterday if today is not done yet) and best streak."""
    current = 0
    cursor = today if today in days else today - timedelta(days=1)
    while cursor in days:
        current += 1
        cursor -= timedelta(days=1)
    best = 0
    run = 0
    previous: date | None = None
    for day in sorted(days):
        run = run + 1 if previous is not None and day - previous == timedelta(days=1) else 1
        best = max(best, run)
        previous = day
    return current, best


@router.get("/streak")
async def streak(request: Request) -> JSONResponse:
    """FR-VOCAB-STREAK: daily goal, current and best streak, last 7 days."""
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    async with _engine(request).connect() as conn:
        today = (await conn.execute(text("SELECT (now() AT TIME ZONE 'Asia/Tashkent')::date"))).scalar_one()
        rows = await conn.execute(
            text("SELECT day, answers, correct FROM vocab_days WHERE user_id = :id AND answers > 0"),
            {"id": user_id},
        )
        by_day = {item["day"]: (int(item["answers"]), int(item["correct"])) for item in rows.mappings()}
    current, best = streaks(set(by_day), today)
    week = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        answered, correct = by_day.get(day, (0, 0))
        week.append({"day": day.isoformat(), "answers": answered, "correct": correct})
    done_today = by_day.get(today, (0, 0))[0]
    return JSONResponse(
        {
            "current": current,
            "best": best,
            "goal": DAILY_GOAL,
            "today": done_today,
            "goal_met": done_today >= DAILY_GOAL,
            "week": week,
        }
    )


@router.get("/leaderboard")
async def leaderboard(request: Request) -> JSONResponse:
    """Weekly ranking inside the learner's own groups; first names only (privacy)."""
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    async with _engine(request).connect() as conn:
        rows = await conn.execute(
            text(
                """
                WITH mates AS (
                    SELECT DISTINCT e2.student_user_id AS user_id
                    FROM enrollments e1
                    JOIN enrollments e2 ON e2.group_id = e1.group_id
                    WHERE e1.student_user_id = :id
                    UNION SELECT CAST(:id AS uuid)
                )
                SELECT m.user_id = :id AS me,
                       split_part(btrim(u.full_name), ' ', 1) AS name,
                       coalesce(sum(d.correct), 0) AS score,
                       (SELECT count(*) FROM vocab_progress vp WHERE vp.user_id = m.user_id AND vp.box >= 3)
                         AS learned
                FROM mates m
                JOIN users u ON u.id = m.user_id
                LEFT JOIN vocab_days d ON d.user_id = m.user_id
                  AND d.day > (now() AT TIME ZONE 'Asia/Tashkent')::date - 7
                GROUP BY m.user_id, u.full_name
                ORDER BY score DESC, learned DESC, name
                LIMIT 20
                """
            ),
            {"id": user_id},
        )
        board = [
            {
                "rank": index + 1,
                "name": item["name"],
                "score": int(item["score"]),
                "learned": int(item["learned"]),
                "me": bool(item["me"]),
            }
            for index, item in enumerate(rows.mappings())
        ]
    return JSONResponse(board)
