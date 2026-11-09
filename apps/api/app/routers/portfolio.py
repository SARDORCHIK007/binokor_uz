"""Worker portfolio and public reviews (FR-PORTFOLIO).

Workers upload photos of their own work. Photos stay private until a mentor, curator or
admin confirms them (BR-20: only real, checked photos are public). Public profiles show
confirmed items and employer review averages, respecting worker_profiles.visibility.
"""

import base64
import hashlib
import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.core.config import get_settings
from app.ratelimit import too_many
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1", tags=["portfolio"])

IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_BYTES = 5_000_000
CONFIRMERS = {"admin", "mentor", "curator", "education_lead"}


class PortfolioIn(BaseModel):
    title: str = Field(min_length=3, max_length=120)
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


def _media_dir() -> Path:
    return Path(get_settings().evidence_dir).parent / "portfolio"


async def _roles(conn: AsyncConnection, user_id: uuid.UUID) -> set[str]:
    rows = await conn.execute(
        text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"), {"id": user_id}
    )
    return {str(item["role"]) for item in rows.mappings()}


def _item(row: dict[str, object]) -> dict[str, object]:
    title = row["title"]
    files = row["file_ids"]
    first = files[0] if isinstance(files, list) and files else None
    created = row["created_at"]
    return {
        "id": str(row["id"]),
        "title": title.get("uz-Latn", "") if isinstance(title, dict) else "",
        "image": f"/api/v1/public/media/{first}" if first else None,
        "confirmed": row["confirmed_by"] is not None,
        "created_at": created.isoformat() if hasattr(created, "isoformat") else str(created),
    }


async def reviews_summary(conn: AsyncConnection, worker_user_id: object) -> dict[str, object]:
    """Average scores per criterion and the latest comments for one worker."""
    agg = (
        await conn.execute(
            text(
                """
                SELECT count(*) AS n,
                       avg(r.score_quality) AS quality, avg(r.score_discipline) AS discipline,
                       avg(r.score_safety) AS safety, avg(r.score_communication) AS communication
                FROM reviews r JOIN placements p ON p.id = r.placement_id
                WHERE p.worker_user_id = :id
                """
            ),
            {"id": worker_user_id},
        )
    ).mappings().one()
    latest = await conn.execute(
        text(
            """
            SELECT r.comment, r.created_at, e.name AS employer,
                   (r.score_quality + r.score_discipline + r.score_safety + r.score_communication) / 4.0 AS score
            FROM reviews r
            JOIN placements p ON p.id = r.placement_id
            JOIN employers e ON e.id = p.employer_id
            WHERE p.worker_user_id = :id
            ORDER BY r.created_at DESC
            LIMIT 5
            """
        ),
        {"id": worker_user_id},
    )

    def num(value: object) -> float | None:
        return None if value is None else round(float(str(value)), 1)

    return {
        "count": int(agg["n"]),
        "criteria": {key: num(agg[key]) for key in ("quality", "discipline", "safety", "communication")},
        "latest": [
            {
                "comment": item["comment"] or "",
                "date": item["created_at"].date().isoformat(),
                "employer": item["employer"] if isinstance(item["employer"], str) else "",
                "score": num(item["score"]),
            }
            for item in latest.mappings()
        ],
    }


async def public_portfolio(conn: AsyncConnection, worker_user_id: object) -> list[dict[str, object]]:
    rows = await conn.execute(
        text(
            """
            SELECT id, title, file_ids, confirmed_by, created_at
            FROM portfolio_items
            WHERE worker_user_id = :id AND confirmed_by IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 12
            """
        ),
        {"id": worker_user_id},
    )
    return [_item(dict(item)) for item in rows.mappings()]


@router.get("/me/portfolio")
async def my_portfolio(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    async with _engine(request).connect() as conn:
        profile = (
            await conn.execute(text("SELECT slug FROM worker_profiles WHERE user_id = :id"), {"id": user_id})
        ).scalar()
        if profile is None:
            return problem(403, "FORBIDDEN", "Usta profili yo'q", "Portfolio usta profili uchun.")
        rows = await conn.execute(
            text(
                """
                SELECT id, title, file_ids, confirmed_by, created_at
                FROM portfolio_items WHERE worker_user_id = :id ORDER BY created_at DESC
                """
            ),
            {"id": user_id},
        )
        items = [_item(dict(item)) for item in rows.mappings()]
        reviews = await reviews_summary(conn, user_id)
    return JSONResponse({"slug": profile, "items": items, "reviews": reviews})


@router.post("/me/portfolio")
async def add_portfolio(body: PortfolioIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    limited = await too_many(request, "portfolio", str(user_id), limit=30, window_seconds=86400)
    if limited is not None:
        return limited
    if body.content_type not in IMAGE_TYPES:
        return problem(422, "VALIDATION", "Rasm turi noto'g'ri", "JPG, PNG yoki WebP yuklang.")
    try:
        raw = base64.b64decode(body.data_base64, validate=True)
    except ValueError:
        return problem(422, "VALIDATION", "Rasm o'qilmadi", "Fayl buzilgan.")
    if len(raw) > MAX_BYTES:
        return problem(422, "VALIDATION", "Rasm katta", "5 MB dan kichik rasm yuboring.")
    async with _engine(request).begin() as conn:
        exists = (
            await conn.execute(text("SELECT 1 FROM worker_profiles WHERE user_id = :id"), {"id": user_id})
        ).first()
        if exists is None:
            return problem(403, "FORBIDDEN", "Usta profili yo'q", "Portfolio usta profili uchun.")
        file_id = new_id()
        folder = _media_dir()
        folder.mkdir(parents=True, exist_ok=True)
        key = f"{file_id}{IMAGE_TYPES[body.content_type]}"
        (folder / key).write_bytes(raw)
        await conn.execute(
            text(
                """
                INSERT INTO files (id, bucket, key, mime, size_bytes, sha256, scan_status, owner_id)
                VALUES (:id, 'private', :key, :mime, :size, decode(:sha, 'hex'), 'CLEAN', :owner)
                """
            ),
            {
                "id": file_id,
                "key": f"portfolio/{key}",
                "mime": body.content_type,
                "size": len(raw),
                "sha": hashlib.sha256(raw).hexdigest(),
                "owner": user_id,
            },
        )
        item_id = new_id()
        await conn.execute(
            text(
                """
                INSERT INTO portfolio_items (id, worker_user_id, title, file_ids)
                VALUES (:id, :worker, CAST(:title AS jsonb), ARRAY[CAST(:file AS uuid)])
                """
            ),
            {
                "id": item_id,
                "worker": user_id,
                "title": json.dumps({"uz-Latn": body.title.strip()}),
                "file": str(file_id),
            },
        )
    return JSONResponse({"id": str(item_id), "confirmed": False})


@router.delete("/me/portfolio/{item_id}")
async def delete_portfolio(item_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    async with _engine(request).begin() as conn:
        deleted = await conn.execute(
            text("DELETE FROM portfolio_items WHERE id = :id AND worker_user_id = :user RETURNING file_ids"),
            {"id": item_id, "user": user_id},
        )
        file_ids = deleted.scalar()
        if file_ids is None:
            return problem(404, "NOT_FOUND", "Topilmadi", "Bu ish sizga tegishli emas.")
        keys = await conn.execute(
            text("DELETE FROM files WHERE id = ANY(:ids) RETURNING key"), {"ids": list(file_ids)}
        )
        for key in keys.scalars():
            (_media_dir() / str(key).removeprefix("portfolio/")).unlink(missing_ok=True)
    return JSONResponse({"deleted": True})


@router.get("/admin/portfolio")
async def pending_portfolio(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    async with _engine(request).connect() as conn:
        if not (await _roles(conn, user_id)) & CONFIRMERS:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Tasdiqlash ustoz yoki admin uchun.")
        rows = await conn.execute(
            text(
                """
                SELECT pi.id, pi.title, pi.file_ids, pi.confirmed_by, pi.created_at,
                       u.full_name AS worker, wp.slug
                FROM portfolio_items pi
                JOIN users u ON u.id = pi.worker_user_id
                JOIN worker_profiles wp ON wp.user_id = pi.worker_user_id
                WHERE pi.confirmed_by IS NULL
                ORDER BY pi.created_at
                """
            )
        )
        items = [
            {**_item(dict(item)), "worker": item["worker"], "slug": item["slug"]} for item in rows.mappings()
        ]
    return JSONResponse(items)


@router.post("/admin/portfolio/{item_id}/confirm")
async def confirm_portfolio(item_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    async with _engine(request).begin() as conn:
        if not (await _roles(conn, user_id)) & CONFIRMERS:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Tasdiqlash ustoz yoki admin uchun.")
        done = await conn.execute(
            text("UPDATE portfolio_items SET confirmed_by = :user WHERE id = :id RETURNING id"),
            {"user": user_id, "id": item_id},
        )
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Topilmadi", "Bu ish yo'q.")
    return JSONResponse({"confirmed": True})


@router.get("/public/media/{file_id}", response_model=None)
async def portfolio_media(file_id: uuid.UUID, request: Request) -> FileResponse | JSONResponse:
    """Serve a portfolio photo only when it is confirmed and the worker shows the portfolio."""
    user_id = _user_id(request)
    async with _engine(request).connect() as conn:
        row = (
            await conn.execute(
                text(
                    """
                    SELECT f.key, f.mime, pi.confirmed_by, pi.worker_user_id,
                           coalesce((wp.visibility->>'portfolio')::boolean, true) AS visible
                    FROM files f
                    JOIN portfolio_items pi ON f.id = ANY(pi.file_ids)
                    JOIN worker_profiles wp ON wp.user_id = pi.worker_user_id
                    WHERE f.id = :id
                    LIMIT 1
                    """
                ),
                {"id": file_id},
            )
        ).mappings().first()
        if row is None:
            return problem(404, "NOT_FOUND", "Rasm topilmadi", "Bu rasm yo'q.")
        public = row["confirmed_by"] is not None and row["visible"]
        allowed = public or (user_id is not None and user_id == row["worker_user_id"])
        if not allowed and user_id is not None:
            allowed = bool((await _roles(conn, user_id)) & CONFIRMERS)
    if not allowed:
        return problem(404, "NOT_FOUND", "Rasm topilmadi", "Bu rasm yo'q.")
    path = _media_dir() / str(row["key"]).removeprefix("portfolio/")
    if not path.is_file():
        return problem(404, "NOT_FOUND", "Rasm topilmadi", "Fayl saqlanmagan.")
    return FileResponse(path, media_type=str(row["mime"]), headers={"Cache-Control": "private, max-age=3600"})
