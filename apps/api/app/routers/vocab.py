import uuid

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
