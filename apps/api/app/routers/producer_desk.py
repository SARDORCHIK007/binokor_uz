"""Working desk of a producer: what needs an answer today, stock levels, stale prices, repeat buyers, company details.
The producer sees only their own orders and products.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.doc_i18n import lang_of, pick
from app.security import bearer_from_request, problem, read_access_token

router = APIRouter(prefix="/api/v1/producers", tags=["producer-desk"])

PROFILE_FIELDS = ("address", "phone", "description", "website", "contact_person", "work_hours", "delivery_regions")
STALE_DAYS = 60


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


def _no_company() -> JSONResponse:
    return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu bo'lim ishlab chiqaruvchilar uchun.")


async def _producer(conn: AsyncConnection, user_id: uuid.UUID) -> uuid.UUID | None:
    found = (await conn.execute(text("SELECT producer_id FROM producer_members WHERE user_id = :u LIMIT 1"), {"u": user_id})).scalar()
    return None if found is None else uuid.UUID(str(found))


@router.get("/desk")
async def desk(request: Request, lang: str | None = None) -> JSONResponse:
    code = lang_of(lang or request.cookies.get("ub_locale"))
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        pid = await _producer(conn, user_id)
        if pid is None:
            return _no_company()
        producer = (await conn.execute(text(f"SELECT name, verified_at IS NOT NULL AS verified, {', '.join(PROFILE_FIELDS)} FROM producers WHERE id = :p"), {"p": pid})).mappings().one()
        stats = (
            await conn.execute(
                text(
                    """
                    SELECT count(*) FILTER (WHERE o.status = 'NEW') AS new_orders,
                           count(*) FILTER (WHERE o.status = 'NEW' AND o.created_at < now() - interval '24 hours') AS late,
                           count(*) FILTER (WHERE o.status = 'CONTACTED') AS in_progress,
                           count(*) FILTER (WHERE o.status = 'DONE' AND date_trunc('month', o.created_at) = date_trunc('month', now())) AS done_month,
                           coalesce(sum(o.quantity * coalesce(p.price, 0)) FILTER (WHERE o.status = 'DONE' AND date_trunc('month', o.created_at) = date_trunc('month', now())), 0) AS revenue_month,
                           round(avg(extract(epoch FROM o.responded_at - o.created_at) / 3600) FILTER (WHERE o.responded_at IS NOT NULL)) AS response_hours
                    FROM order_requests o JOIN products p ON p.id = o.product_id WHERE p.producer_id = :p
                    """
                ),
                {"p": pid},
            )
        ).mappings().one()
        urgent = (
            await conn.execute(
                text(
                    """
                    SELECT o.id::text AS id, o.order_no, o.buyer_name, o.buyer_type, o.company_name, o.quantity, p.unit, p.name, o.created_at::text AS created,
                           o.producer_note, o.status::text AS status, (o.created_at < now() - interval '24 hours') AS late
                    FROM order_requests o JOIN products p ON p.id = o.product_id
                    WHERE p.producer_id = :p AND o.status IN ('NEW', 'CONTACTED') ORDER BY o.status = 'NEW' DESC, o.created_at LIMIT 30
                    """
                ),
                {"p": pid},
            )
        ).mappings().all()
        stock = (
            await conn.execute(
                text(
                    f"""
                    SELECT p.id::text AS id, p.name, p.unit, p.stock_qty::float AS stock_qty, p.low_stock_at::float AS low_at, p.in_stock, p.price::float AS price,
                           coalesce(p.price_updated_at, now())::date::text AS price_day,
                           (p.price IS NOT NULL AND coalesce(p.price_updated_at, now()) < now() - interval '{STALE_DAYS} days') AS stale
                    FROM products p WHERE p.producer_id = :p ORDER BY p.in_stock, p.stock_qty NULLS LAST LIMIT 100
                    """
                ),
                {"p": pid},
            )
        ).mappings().all()
        buyers = (
            await conn.execute(
                text(
                    """
                    SELECT coalesce(nullif(o.company_name, ''), o.buyer_name) AS buyer, count(*) AS orders, coalesce(sum(o.quantity * coalesce(p.price, 0)), 0) AS total
                    FROM order_requests o JOIN products p ON p.id = o.product_id
                    WHERE p.producer_id = :p AND o.status <> 'CANCELLED' GROUP BY 1 HAVING count(*) > 1 ORDER BY orders DESC, total DESC LIMIT 5
                    """
                ),
                {"p": pid},
            )
        ).mappings().all()
    filled = sum(1 for field in PROFILE_FIELDS if producer[field])
    items = [
        {
            "id": r["id"], "order_no": r["order_no"] or r["id"][:8], "buyer": r["company_name"] or r["buyer_name"], "company": r["buyer_type"] != "PERSON",
            "quantity": float(r["quantity"]), "unit": r["unit"], "product": pick(r["name"], code), "created": r["created"][:16],
            "note": r["producer_note"], "status": r["status"], "late": bool(r["late"]),
        }
        for r in urgent
    ]
    products = [
        {
            "id": r["id"], "name": pick(r["name"], code), "unit": r["unit"], "stock_qty": r["stock_qty"], "low_at": r["low_at"], "in_stock": bool(r["in_stock"]),
            "price": r["price"], "price_day": r["price_day"], "stale": bool(r["stale"]),
            "low": r["stock_qty"] is not None and r["low_at"] is not None and r["stock_qty"] <= r["low_at"],
        }
        for r in stock
    ]
    return JSONResponse(
        {
            "company": {"name": producer["name"], "verified": bool(producer["verified"]), "completeness": round(100 * filled / len(PROFILE_FIELDS))},
            "kpi": {
                "new_orders": int(stats["new_orders"]), "late": int(stats["late"]), "in_progress": int(stats["in_progress"]), "done_month": int(stats["done_month"]),
                "revenue_month": float(stats["revenue_month"]), "response_hours": None if stats["response_hours"] is None else int(stats["response_hours"]),
                "out_of_stock": sum(1 for p in products if not p["in_stock"]), "low_stock": sum(1 for p in products if p["low"]), "stale_prices": sum(1 for p in products if p["stale"]),
            },
            "orders": items,
            "products": products,
            "buyers": [{"name": r["buyer"], "orders": int(r["orders"]), "total": float(r["total"])} for r in buyers],
            "stale_days": STALE_DAYS,
        }
    )


class StockIn(BaseModel):
    stock_qty: float | None = Field(default=None, ge=0, le=1_000_000_000)
    low_stock_at: float | None = Field(default=None, ge=0, le=1_000_000_000)


@router.post("/products/{product_id}/stock")
async def set_stock(product_id: uuid.UUID, body: StockIn, request: Request) -> JSONResponse:
    """Stock quantity of a product; a quantity of zero marks it out of stock, a positive one puts it back."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        pid = await _producer(conn, user_id)
        if pid is None:
            return _no_company()
        done = await conn.execute(
            text(
                """
                UPDATE products SET stock_qty = :q, low_stock_at = :low,
                       in_stock = CASE WHEN CAST(:q AS numeric) IS NULL THEN in_stock ELSE CAST(:q AS numeric) > 0 END
                WHERE id = :id AND producer_id = :p RETURNING id
                """
            ),
            {"q": body.stock_qty, "low": body.low_stock_at, "id": product_id, "p": pid},
        )
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Topilmadi", "Mahsulot sizniki emas.")
    return JSONResponse({"saved": True})


class NoteIn(BaseModel):
    note: str = Field(max_length=500)


@router.post("/orders/{order_id}/note")
async def order_note(order_id: uuid.UUID, body: NoteIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        pid = await _producer(conn, user_id)
        if pid is None:
            return _no_company()
        done = await conn.execute(
            text(
                """
                UPDATE order_requests o SET producer_note = NULLIF(:n, '') FROM products p
                WHERE o.id = :id AND o.product_id = p.id AND p.producer_id = :p RETURNING o.id
                """
            ),
            {"n": body.note.strip(), "id": order_id, "p": pid},
        )
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Topilmadi", "Buyurtma sizniki emas.")
    return JSONResponse({"saved": True})


@router.get("/products/{product_id}/prices")
async def price_history(product_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        pid = await _producer(conn, user_id)
        if pid is None:
            return _no_company()
        rows = await conn.execute(
            text(
                """
                SELECT l.price::float AS price, l.changed_at::date::text AS day FROM product_price_log l JOIN products p ON p.id = l.product_id
                WHERE l.product_id = :id AND p.producer_id = :p ORDER BY l.changed_at DESC LIMIT 24
                """
            ),
            {"id": product_id, "p": pid},
        )
        history = [dict(r) for r in rows.mappings()]
    return JSONResponse(history)


class ProfileIn(BaseModel):
    address: str | None = Field(default=None, max_length=300)
    phone: str | None = Field(default=None, max_length=13)
    description: str | None = Field(default=None, max_length=3000)
    website: str | None = Field(default=None, max_length=200)
    contact_person: str | None = Field(default=None, max_length=120)
    work_hours: str | None = Field(default=None, max_length=80)
    delivery_regions: str | None = Field(default=None, max_length=300)


@router.get("/profile")
async def get_profile(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        pid = await _producer(conn, user_id)
        if pid is None:
            return _no_company()
        row = (await conn.execute(text(f"SELECT name, inn, {', '.join(PROFILE_FIELDS)} FROM producers WHERE id = :p"), {"p": pid})).mappings().one()
    return JSONResponse({key: ("" if value is None else value) for key, value in dict(row).items()})


@router.put("/profile")
async def put_profile(body: ProfileIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    values: dict[str, Any] = {key: ((getattr(body, key) or "").strip() or None) for key in PROFILE_FIELDS}
    if values["website"] and not str(values["website"]).lower().startswith(("http://", "https://")):
        return problem(422, "VALIDATION", "Sayt manzili noto'g'ri", "Manzil http:// yoki https:// bilan boshlansin.")
    if values["phone"] and not str(values["phone"]).startswith("+998"):
        return problem(422, "VALIDATION", "Telefon noto'g'ri", "Telefon +998 bilan boshlansin.")
    async with _engine(request).begin() as conn:
        pid = await _producer(conn, user_id)
        if pid is None:
            return _no_company()
        sets = ", ".join(f"{key} = :{key}" for key in PROFILE_FIELDS)
        await conn.execute(text(f"UPDATE producers SET {sets} WHERE id = :p"), {**values, "p": pid})
    return JSONResponse({"status": "saved"})
