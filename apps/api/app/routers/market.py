"""Uychi building-materials marketplace (FR-MARKET).

Catalog with search, filters, sorting, paging and facet counts; cart checkout for private
buyers and companies. Buyer phone numbers go only to the producer (never to public output).
"""

import secrets
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import get_settings
from app.notify import send_telegram
from app.ratelimit import client_ip, too_many
from app.routers.public import _title
from app.security import new_id, problem

router = APIRouter(prefix="/api/v1/public/market", tags=["market"])

SORTS = {
    "featured": "p.featured DESC, orders DESC, p.name->>'uz-Latn'",
    "popular": "orders DESC, p.featured DESC, p.name->>'uz-Latn'",
    "price_asc": "p.price ASC NULLS LAST, p.name->>'uz-Latn'",
    "price_desc": "p.price DESC NULLS LAST, p.name->>'uz-Latn'",
    "name": "p.name->>'uz-Latn'",
}


def _engine(request: Request) -> AsyncEngine:
    engine: AsyncEngine = request.app.state.engine
    return engine


@router.get("")
async def catalog(
    request: Request,
    q: str = "",
    category: str = "",
    producer: str = "",
    min_price: float | None = None,
    max_price: float | None = None,
    in_stock: bool = False,
    sort: str = "featured",
    limit: int = 12,
    offset: int = 0,
) -> JSONResponse:
    limit = max(1, min(limit, 60))
    offset = max(0, offset)
    order_by = SORTS.get(sort, SORTS["featured"])
    params: dict[str, object] = {
        "like": f"%{q.strip()}%" if q.strip() else None,
        "category": category or None,
        "producer": producer or None,
        "min_price": min_price,
        "max_price": max_price,
        "in_stock": in_stock,
        "limit": limit,
        "offset": offset,
    }
    where = """
        p.is_published
        AND (CAST(:like AS text) IS NULL
             OR EXISTS (SELECT 1 FROM jsonb_each_text(p.name) n WHERE n.value ILIKE CAST(:like AS text)))
        AND (CAST(:category AS text) IS NULL OR c.code = CAST(:category AS text))
        AND (CAST(:producer AS text) IS NULL OR pr.id::text = CAST(:producer AS text))
        AND (CAST(:min_price AS numeric) IS NULL OR p.price >= CAST(:min_price AS numeric))
        AND (CAST(:max_price AS numeric) IS NULL OR p.price <= CAST(:max_price AS numeric))
        AND (NOT CAST(:in_stock AS boolean) OR p.in_stock)
    """
    async with _engine(request).connect() as conn:
        rows = await conn.execute(
            text(
                f"""
                SELECT p.id::text AS id, p.name, p.description, p.unit, p.price, p.min_order,
                       p.in_stock, p.featured,
                       (p.price_updated_at IS NULL OR p.price_updated_at < now() - interval '30 days') AS stale,
                       pr.id::text AS producer_id, pr.name AS producer, pr.verified_at IS NOT NULL AS verified,
                       c.code AS category, c.name AS category_name,
                       (SELECT count(*) FROM order_requests o WHERE o.product_id = p.id) AS orders,
                       count(*) OVER () AS total
                FROM products p
                JOIN producers pr ON pr.id = p.producer_id
                JOIN product_categories c ON c.id = p.category_id
                WHERE {where}
                ORDER BY {order_by}
                LIMIT :limit OFFSET :offset
                """
            ),
            params,
        )
        items = list(rows.mappings())
        facet_params = {key: value for key, value in params.items() if key not in {"limit", "offset"}}
        cats = await conn.execute(
            text(
                f"""
                SELECT c.code, c.name, c.sort, count(p.id) FILTER (WHERE {where.replace("CAST(:category AS text) IS NULL OR c.code = CAST(:category AS text)", "TRUE")}) AS n
                FROM product_categories c
                LEFT JOIN products p ON p.category_id = c.id
                LEFT JOIN producers pr ON pr.id = p.producer_id
                GROUP BY c.code, c.name, c.sort
                HAVING count(p.id) > 0
                ORDER BY c.sort, c.code
                """
            ),
            facet_params,
        )
        producers = await conn.execute(
            text(
                """
                SELECT pr.id::text AS id, pr.name, pr.address, pr.verified_at IS NOT NULL AS verified,
                       count(p.id) AS n
                FROM producers pr
                JOIN products p ON p.producer_id = pr.id AND p.is_published
                GROUP BY pr.id
                ORDER BY n DESC, pr.name
                """
            )
        )
        price = (
            await conn.execute(
                text("SELECT min(price), max(price), count(*) FROM products WHERE is_published")
            )
        ).one()
    total = int(items[0]["total"]) if items else 0
    return JSONResponse(
        {
            "items": [
                {
                    "id": item["id"],
                    "name": _title(item["name"]),
                    "description": _title(item["description"]) if item["description"] else "",
                    "unit": item["unit"],
                    "price": None if item["price"] is None else float(item["price"]),
                    "min_order": None if item["min_order"] is None else float(item["min_order"]),
                    "in_stock": bool(item["in_stock"]),
                    "featured": bool(item["featured"]),
                    "stale": bool(item["stale"]),
                    "orders": int(item["orders"]),
                    "category": item["category"],
                    "category_name": _title(item["category_name"]),
                    "producer": {
                        "id": item["producer_id"],
                        "name": item["producer"],
                        "verified": bool(item["verified"]),
                    },
                }
                for item in items
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
            "facets": {
                "categories": [
                    {"code": row["code"], "name": _title(row["name"]), "count": int(row["n"])}
                    for row in cats.mappings()
                ],
                "producers": [
                    {
                        "id": row["id"],
                        "name": row["name"],
                        "address": row["address"] or "",
                        "verified": bool(row["verified"]),
                        "count": int(row["n"]),
                    }
                    for row in producers.mappings()
                ],
                "price": {
                    "min": None if price[0] is None else float(price[0]),
                    "max": None if price[1] is None else float(price[1]),
                },
            },
            "stats": {"products": int(price[2])},
        }
    )


class CartItem(BaseModel):
    product_id: str
    quantity: float = Field(gt=0, le=100000)


class CheckoutBody(BaseModel):
    items: list[CartItem] = Field(min_length=1, max_length=30)
    buyer_type: Literal["PERSON", "COMPANY"] = "PERSON"
    buyer_name: str = Field(min_length=2, max_length=120)
    buyer_phone: str = Field(pattern=r"^\+998\d{9}$")
    company_name: str | None = Field(default=None, max_length=200)
    company_inn: str | None = Field(default=None, pattern=r"^\d{9}$")
    delivery: Literal["PICKUP", "DELIVERY"] = "PICKUP"
    address: str | None = Field(default=None, max_length=300)
    comment: str = Field(default="", max_length=1000)

    @model_validator(mode="after")
    def company_and_address(self) -> "CheckoutBody":
        if self.buyer_type == "COMPANY" and not (self.company_name and self.company_inn):
            raise ValueError("Tashkilot nomi va STIR kerak")
        if self.delivery == "DELIVERY" and not (self.address and self.address.strip()):
            raise ValueError("Yetkazib berish manzili kerak")
        return self


@router.post("/orders")
async def checkout(body: CheckoutBody, request: Request) -> JSONResponse:
    limited = await too_many(request, "market-order-ip", client_ip(request), limit=10, window_seconds=3600)
    if limited is not None:
        return limited
    if get_settings().app_env != "local":
        return problem(400, "CAPTCHA_REQUIRED", "Tekshiruv kerak", "Buyurtma uchun captcha yoqilmagan.")
    order_no = f"UB-M-{datetime.now(UTC):%y%m%d}-{secrets.randbelow(10_000):04d}"
    ids = [item.product_id for item in body.items]
    async with _engine(request).begin() as conn:
        found = await conn.execute(
            text(
                """
                SELECT p.id::text AS id, p.name, p.unit, p.price, p.min_order, p.in_stock, p.producer_id
                FROM products p
                WHERE p.is_published AND p.id::text = ANY(:ids)
                """
            ),
            {"ids": ids},
        )
        products = {row["id"]: row for row in found.mappings()}
        missing = [pid for pid in ids if pid not in products]
        if missing:
            return problem(422, "VALIDATION", "Mahsulot topilmadi", "Savatdagi ba'zi mahsulotlar endi sotuvda yo'q.")
        total = 0.0
        lines: dict[object, list[str]] = {}
        for item in body.items:
            product = products[item.product_id]
            if not product["in_stock"]:
                return problem(422, "OUT_OF_STOCK", "Omborda yo'q", f"{_title(product['name'])} hozir omborda yo'q.")
            if product["min_order"] is not None and item.quantity < float(product["min_order"]):
                return problem(
                    422,
                    "MIN_ORDER",
                    "Minimal buyurtma",
                    f"{_title(product['name'])}: kamida {float(product['min_order']):g} {product['unit']}.",
                )
            if product["price"] is not None:
                total += float(product["price"]) * item.quantity
            await conn.execute(
                text(
                    """
                    INSERT INTO order_requests (
                      id, product_id, buyer_name, buyer_phone, quantity, comment, order_no,
                      buyer_type, company_name, company_inn, delivery, address
                    )
                    VALUES (
                      :id, CAST(:product_id AS uuid), :buyer_name, :buyer_phone, :quantity, :comment, :order_no,
                      :buyer_type, :company_name, :company_inn, :delivery, :address
                    )
                    """
                ),
                {
                    "id": new_id(),
                    "product_id": item.product_id,
                    "buyer_name": body.buyer_name.strip(),
                    "buyer_phone": body.buyer_phone,
                    "quantity": item.quantity,
                    "comment": body.comment.strip(),
                    "order_no": order_no,
                    "buyer_type": body.buyer_type,
                    "company_name": body.company_name if body.buyer_type == "COMPANY" else None,
                    "company_inn": body.company_inn if body.buyer_type == "COMPANY" else None,
                    "delivery": body.delivery,
                    "address": (body.address or "").strip() or None,
                },
            )
            lines.setdefault(product["producer_id"], []).append(
                f"• {_title(product['name'])}: {item.quantity:g} {product['unit']}"
            )
        chats = await conn.execute(
            text(
                """
                SELECT m.producer_id, u.telegram_id
                FROM producer_members m JOIN users u ON u.id = m.user_id
                WHERE m.producer_id = ANY(:producers) AND u.telegram_id IS NOT NULL
                """
            ),
            {"producers": list(lines)},
        )
        targets = [(row["producer_id"], int(row["telegram_id"])) for row in chats.mappings()]
    who = body.company_name if body.buyer_type == "COMPANY" else body.buyer_name
    way = "yetkazib berish" if body.delivery == "DELIVERY" else "olib ketish"
    for producer_id, chat_id in targets:
        await send_telegram(
            chat_id,
            f"Yangi buyurtma {order_no}\n{who}, {body.buyer_phone}\n{way}\n" + "\n".join(lines[producer_id]),
        )
    return JSONResponse(
        {"order_no": order_no, "items": len(body.items), "estimated_total": round(total), "status": "NEW"}
    )
