"""Moderation: one queue for everything that waits for a human decision, a news editor, and the audit log.

The moderator sees names and titles only, never phones or documents' contents. Every decision and every content
change is written to the audit log with who did it and why.
"""

import json
import re
import uuid
from typing import Any, Literal

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.doc_i18n import lang_of, pick
from app.inapp import notify
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/moderation", tags=["moderation"])

QUEUE_ROLES = {"moderator", "admin", "superadmin"}
CONTENT_ROLES = {"moderator", "content_editor", "admin", "superadmin"}
LANGS = ("uz-Latn", "uz-Cyrl", "ru", "en")
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
KINDS = ("PORTFOLIO", "FIRM", "FIRM_DOC", "PARTNER", "NEWS")


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
    return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu bo'lim moderatorlar uchun.")


async def _roles(conn: AsyncConnection, user_id: uuid.UUID) -> set[str]:
    rows = await conn.execute(text("SELECT role::text AS role FROM user_roles WHERE user_id = :u"), {"u": user_id})
    return {str(r["role"]) for r in rows.mappings()}


async def audit(conn: AsyncConnection, user_id: uuid.UUID, roles: set[str], action: str, entity: str, entity_id: uuid.UUID | None, diff: dict[str, Any]) -> None:
    role = next((r for r in ("superadmin", "admin", "moderator", "content_editor") if r in roles), None)
    await conn.execute(
        text(
            "INSERT INTO audit_log (actor_id, actor_role, action, entity, entity_id, diff) "
            "VALUES (:a, CAST(:r AS role_code), :action, :entity, :eid, CAST(:diff AS jsonb))"
        ),
        {"a": user_id, "r": role, "action": action, "entity": entity, "eid": entity_id, "diff": json.dumps(diff, ensure_ascii=False, default=str)},
    )


@router.get("/queue")
async def queue(request: Request, kind: str | None = None, lang: str | None = None) -> JSONResponse:
    code = lang_of(lang or request.cookies.get("ub_locale"))
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    items: list[dict[str, Any]] = []
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & QUEUE_ROLES:
            return _forbidden()
        rows = await conn.execute(
            text(
                """
                SELECT pi.id::text AS id, pi.title, pi.created_at::text AS created, u.full_name AS who, coalesce(array_length(pi.file_ids, 1), 0) AS photos
                FROM portfolio_items pi JOIN users u ON u.id = pi.worker_user_id
                WHERE pi.confirmed_by IS NULL AND pi.rejected_at IS NULL ORDER BY pi.created_at LIMIT 100
                """
            )
        )
        items += [{"kind": "PORTFOLIO", "id": r["id"], "title": pick(r["title"], code), "who": r["who"], "created": r["created"][:16], "extra": str(r["photos"])} for r in rows.mappings()]
        rows = await conn.execute(text("SELECT id::text AS id, name, inn, kind::text AS kind FROM employers WHERE verified_at IS NULL ORDER BY name LIMIT 100"))
        items += [{"kind": "FIRM", "id": r["id"], "title": r["name"], "who": r["kind"], "created": "", "extra": r["inn"] or ""} for r in rows.mappings()]
        rows = await conn.execute(
            text(
                """
                SELECT d.id::text AS id, d.kind, d.filename, d.created_at::text AS created, e.name
                FROM employer_documents d JOIN employers e ON e.id = d.employer_id WHERE d.checked_at IS NULL ORDER BY d.created_at LIMIT 100
                """
            )
        )
        items += [{"kind": "FIRM_DOC", "id": r["id"], "title": f"{r['name']} · {r['kind']}", "who": r["filename"], "created": r["created"][:16], "extra": ""} for r in rows.mappings()]
        rows = await conn.execute(text("SELECT id::text AS id, org_name, kind, country_code, created_at::text AS created FROM partner_requests WHERE status = 'NEW' ORDER BY created_at LIMIT 100"))
        items += [{"kind": "PARTNER", "id": r["id"], "title": r["org_name"], "who": r["kind"], "created": r["created"][:16], "extra": (r["country_code"] or "").strip()} for r in rows.mappings()]
        rows = await conn.execute(text("SELECT id::text AS id, slug, title, coalesce(published_at, now())::text AS created FROM news WHERE status = 'DRAFT' ORDER BY slug LIMIT 100"))
        items += [{"kind": "NEWS", "id": r["id"], "title": pick(r["title"], code) or r["slug"], "who": r["slug"], "created": "", "extra": ""} for r in rows.mappings()]
    counts = {k: sum(1 for i in items if i["kind"] == k) for k in KINDS}
    shown = [i for i in items if not kind or i["kind"] == kind]
    return JSONResponse({"counts": counts, "total": len(items), "items": shown})


class DecisionIn(BaseModel):
    kind: Literal["PORTFOLIO", "FIRM", "FIRM_DOC"]
    id: uuid.UUID
    decision: Literal["approve", "reject"]
    reason: str | None = Field(default=None, max_length=300)


@router.post("/decide")
async def decide(body: DecisionIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    reason = (body.reason or "").strip()
    async with _engine(request).begin() as conn:
        roles = await _roles(conn, user_id)
        if not roles & QUEUE_ROLES:
            return _forbidden()
        if body.decision == "reject" and len(reason) < 3:
            return problem(422, "REASON_REQUIRED", "Sabab kerak", "Rad etish sababini yozing (kamida 3 belgi).")
        if body.decision == "reject" and body.kind != "PORTFOLIO":
            return problem(422, "NOT_SUPPORTED", "Rad etib bo'lmaydi", "Firma va hujjatlarni bu yerda faqat tasdiqlash mumkin.")
        if body.kind == "PORTFOLIO":
            row = (await conn.execute(text("SELECT worker_user_id, confirmed_by, rejected_at FROM portfolio_items WHERE id = :id"), {"id": body.id})).mappings().first()
            if row is None:
                return problem(404, "NOT_FOUND", "Topilmadi", "Bunday ish yo'q.")
            if row["confirmed_by"] is not None or row["rejected_at"] is not None:
                return problem(409, "ALREADY_DECIDED", "Qaror qabul qilingan", "Bu ish bo'yicha qaror allaqachon bor.")
            if body.decision == "approve":
                await conn.execute(text("UPDATE portfolio_items SET confirmed_by = :u WHERE id = :id"), {"u": user_id, "id": body.id})
            else:
                await conn.execute(text("UPDATE portfolio_items SET rejected_at = now(), rejected_by = :u, rejected_reason = :r WHERE id = :id"), {"u": user_id, "r": reason, "id": body.id})
            await notify(conn, row["worker_user_id"], "portfolio_review", {"approved": body.decision == "approve", "item_id": str(body.id)})
        elif body.kind == "FIRM":
            done = await conn.execute(text("UPDATE employers SET verified_at = now(), verified_by = :u WHERE id = :id AND verified_at IS NULL RETURNING id"), {"u": user_id, "id": body.id})
            if done.first() is None:
                return problem(409, "ALREADY_DECIDED", "Qaror qabul qilingan", "Firma topilmadi yoki allaqachon tasdiqlangan.")
        else:
            done = await conn.execute(text("UPDATE employer_documents SET checked_by = :u, checked_at = now() WHERE id = :id AND checked_at IS NULL RETURNING id"), {"u": user_id, "id": body.id})
            if done.first() is None:
                return problem(409, "ALREADY_DECIDED", "Qaror qabul qilingan", "Hujjat topilmadi yoki allaqachon tekshirilgan.")
        await audit(conn, user_id, roles, f"{body.kind}_{body.decision.upper()}", body.kind, body.id, {"reason": reason} if reason else {})
    return JSONResponse({"status": body.decision})


# ----------------------------------------------------------------- audit log


@router.get("/audit")
async def audit_log(request: Request, entity: str | None = None, days: int = 30, page: int = 1) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    size = 40
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & QUEUE_ROLES:
            return _forbidden()
        rows = await conn.execute(
            text(
                """
                SELECT a.id, a.action, a.entity, a.entity_id::text AS entity_id, a.diff, a.created_at::text AS at, a.actor_role::text AS role, u.full_name AS who,
                       count(*) OVER () AS total
                FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
                WHERE a.created_at >= now() - make_interval(days => :days) AND (CAST(:entity AS text) IS NULL OR a.entity = :entity)
                ORDER BY a.created_at DESC, a.id DESC LIMIT :size OFFSET :off
                """
            ),
            {"days": max(1, min(days, 365)), "entity": entity or None, "size": size, "off": (max(page, 1) - 1) * size},
        )
        data = rows.mappings().all()
        entities = [r[0] for r in (await conn.execute(text("SELECT DISTINCT entity FROM audit_log ORDER BY 1"))).all()]
    return JSONResponse(
        {
            "total": int(data[0]["total"]) if data else 0,
            "page": max(page, 1),
            "size": size,
            "entities": entities,
            "items": [{"id": r["id"], "action": r["action"], "entity": r["entity"], "entity_id": r["entity_id"], "detail": r["diff"] or {}, "at": r["at"][:19], "role": r["role"], "who": r["who"]} for r in data],
        }
    )


# ----------------------------------------------------------------- news editor


@router.get("/news")
async def news_list(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & CONTENT_ROLES:
            return _forbidden()
        rows = await conn.execute(text("SELECT id::text AS id, slug, title, body, status, published_at::text AS published FROM news ORDER BY coalesce(published_at, now()) DESC, slug"))
        items = [{"id": r["id"], "slug": r["slug"], "title": r["title"], "body": r["body"], "status": r["status"], "published": (r["published"] or "")[:10]} for r in rows.mappings()]
    return JSONResponse(items)


class NewsIn(BaseModel):
    slug: str = Field(min_length=3, max_length=120)
    title: dict[str, str]
    body: dict[str, str]


def _clean(value: dict[str, str]) -> dict[str, str]:
    return {lang: value[lang].strip() for lang in LANGS if lang in value and value[lang].strip()}


def _check(body: NewsIn) -> tuple[dict[str, str], dict[str, str]] | JSONResponse:
    title, text_body = _clean(body.title), _clean(body.body)
    if not SLUG.match(body.slug):
        return problem(422, "VALIDATION", "Manzil noto'g'ri", "Manzil faqat kichik lotin harf, raqam va chiziqchadan iborat bo'lsin.")
    if "uz-Latn" not in title or len(title["uz-Latn"]) < 5 or "uz-Latn" not in text_body or len(text_body["uz-Latn"]) < 20:
        return problem(422, "VALIDATION", "Matn to'liq emas", "O'zbekcha (lotin) sarlavha kamida 5, matn kamida 20 belgi bo'lsin.")
    return title, text_body


@router.post("/news")
async def news_create(body: NewsIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    checked = _check(body)
    if isinstance(checked, JSONResponse):
        return checked
    title, text_body = checked
    async with _engine(request).begin() as conn:
        roles = await _roles(conn, user_id)
        if not roles & CONTENT_ROLES:
            return _forbidden()
        if (await conn.execute(text("SELECT 1 FROM news WHERE slug = :s"), {"s": body.slug})).first() is not None:
            return problem(409, "DUPLICATE", "Manzil band", "Bu manzilli yangilik bor.")
        news_id = new_id()
        await conn.execute(
            text("INSERT INTO news (id, slug, title, body, status, author_id) VALUES (:id, :slug, CAST(:t AS jsonb), CAST(:b AS jsonb), 'DRAFT', :u)"),
            {"id": news_id, "slug": body.slug, "t": json.dumps(title, ensure_ascii=False), "b": json.dumps(text_body, ensure_ascii=False), "u": user_id},
        )
        await audit(conn, user_id, roles, "NEWS_CREATED", "NEWS", news_id, {"slug": body.slug})
    return JSONResponse({"id": str(news_id)})


@router.put("/news/{news_id}")
async def news_update(news_id: uuid.UUID, body: NewsIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    checked = _check(body)
    if isinstance(checked, JSONResponse):
        return checked
    title, text_body = checked
    async with _engine(request).begin() as conn:
        roles = await _roles(conn, user_id)
        if not roles & CONTENT_ROLES:
            return _forbidden()
        clash = await conn.execute(text("SELECT 1 FROM news WHERE slug = :s AND id <> :id"), {"s": body.slug, "id": news_id})
        if clash.first() is not None:
            return problem(409, "DUPLICATE", "Manzil band", "Bu manzilli yangilik bor.")
        done = await conn.execute(
            text("UPDATE news SET slug = :slug, title = CAST(:t AS jsonb), body = CAST(:b AS jsonb) WHERE id = :id RETURNING id"),
            {"slug": body.slug, "t": json.dumps(title, ensure_ascii=False), "b": json.dumps(text_body, ensure_ascii=False), "id": news_id},
        )
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Topilmadi", "Bunday yangilik yo'q.")
        await audit(conn, user_id, roles, "NEWS_EDITED", "NEWS", news_id, {"slug": body.slug})
    return JSONResponse({"status": "saved"})


class PublishIn(BaseModel):
    publish: bool


@router.post("/news/{news_id}/publish")
async def news_publish(news_id: uuid.UUID, body: PublishIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        roles = await _roles(conn, user_id)
        if not roles & CONTENT_ROLES:
            return _forbidden()
        done = await conn.execute(
            text(
                "UPDATE news SET status = CASE WHEN :p THEN 'PUBLISHED' ELSE 'DRAFT' END, published_at = CASE WHEN :p THEN coalesce(published_at, now()) ELSE published_at END "
                "WHERE id = :id RETURNING id"
            ),
            {"p": body.publish, "id": news_id},
        )
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Topilmadi", "Bunday yangilik yo'q.")
        await audit(conn, user_id, roles, "NEWS_PUBLISHED" if body.publish else "NEWS_UNPUBLISHED", "NEWS", news_id, {})
    return JSONResponse({"status": "PUBLISHED" if body.publish else "DRAFT"})


@router.delete("/news/{news_id}")
async def news_delete(news_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        roles = await _roles(conn, user_id)
        if not roles & CONTENT_ROLES:
            return _forbidden()
        row = (await conn.execute(text("DELETE FROM news WHERE id = :id AND status = 'DRAFT' RETURNING slug"), {"id": news_id})).first()
        if row is None:
            return problem(409, "CANNOT_DELETE", "O'chirib bo'lmadi", "Faqat qoralamani o'chirish mumkin; e'lon qilinganini avval qoralamaga qaytaring.")
        await audit(conn, user_id, roles, "NEWS_DELETED", "NEWS", news_id, {"slug": row[0]})
    return JSONResponse({"status": "deleted"})

