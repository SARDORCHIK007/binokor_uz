import json
import uuid

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/producers", tags=["producers"])


class RegisterBody(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    inn: str = Field(min_length=9, max_length=14)


class ProductBody(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    unit: str = "dona"
    price: float = Field(ge=0)
    in_stock: bool = True
    category: str | None = Field(default=None, max_length=40)
    min_order: float | None = Field(default=None, ge=0)


class OrderStatusBody(BaseModel):
    status: str


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


async def _producer_id(conn: AsyncConnection, user_id: uuid.UUID) -> uuid.UUID | None:
    row = await conn.execute(
        text("SELECT producer_id FROM producer_members WHERE user_id = :id LIMIT 1"),
        {"id": user_id},
    )
    found = row.scalar()
    return None if found is None else uuid.UUID(str(found))


@router.post("")
async def register(body: RegisterBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    producer_id = new_id()
    engine = _engine(request)
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                INSERT INTO producers (id, name, inn, address, verified_at)
                VALUES (:id, :name, :inn, 'Uychi tumani', now())
                """
            ),
            {"id": producer_id, "name": body.name, "inn": body.inn},
        )
        await conn.execute(
            text(
                """
                INSERT INTO producer_members (producer_id, user_id)
                VALUES (:producer_id, :user_id)
                """
            ),
            {"producer_id": producer_id, "user_id": user_id},
        )
        await conn.execute(
            text(
                """
                INSERT INTO user_roles (id, user_id, role)
                SELECT :id, :user_id, 'producer'
                WHERE NOT EXISTS (
                  SELECT 1 FROM user_roles WHERE user_id = :user_id AND role = 'producer'
                )
                """
            ),
            {"id": new_id(), "user_id": user_id},
        )
    return JSONResponse({"id": str(producer_id)})


@router.get("/products")
async def list_products(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        producer_id = await _producer_id(conn, user_id)
        if producer_id is None:
            return JSONResponse([])
        rows = await conn.execute(
            text(
                """
                SELECT p.id::text AS id, p.name, p.unit, p.price, p.min_order, p.in_stock, p.is_published,
                       c.code AS category
                FROM products p JOIN product_categories c ON c.id = p.category_id
                WHERE p.producer_id = :id ORDER BY p.name->>'uz-Latn'
                """
            ),
            {"id": producer_id},
        )
    return JSONResponse(
        [
            {
                "id": item["id"],
                "name": item["name"]["uz-Latn"] if isinstance(item["name"], dict) else "",
                "unit": item["unit"],
                "price": None if item["price"] is None else str(item["price"]),
                "in_stock": item["in_stock"],
                "is_published": item["is_published"],
                "category": item["category"],
                "min_order": None if item["min_order"] is None else float(item["min_order"]),
            }
            for item in rows.mappings()
        ]
    )


@router.post("/products")
async def create_product(body: ProductBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.begin() as conn:
        producer_id = await _producer_id(conn, user_id)
        if producer_id is None:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Ishlab chiqaruvchi profili yo'q.")
        category = await conn.execute(
            text(
                """
                SELECT id FROM product_categories
                WHERE code = coalesce(CAST(:code AS text), code)
                ORDER BY sort, code LIMIT 1
                """
            ),
            {"code": body.category},
        )
        category_id = category.scalar()
        if category_id is None:
            return problem(422, "VALIDATION", "Toifa noto'g'ri", "Mavjud toifani tanlang.")
        product_id = new_id()
        await conn.execute(
            text(
                """
                INSERT INTO products (
                  id, producer_id, category_id, name, unit, price, min_order, in_stock, is_published,
                  price_updated_at
                )
                VALUES (
                  :id, :producer_id, :category_id, CAST(:name AS jsonb), :unit, :price, :min_order, :in_stock,
                  true, now()
                )
                """
            ),
            {
                "id": product_id,
                "producer_id": producer_id,
                "category_id": category_id,
                "name": json.dumps({"uz-Latn": body.name}, ensure_ascii=False),
                "unit": body.unit,
                "price": body.price,
                "min_order": body.min_order,
                "in_stock": body.in_stock,
            },
        )
    return JSONResponse({"id": str(product_id)})


@router.patch("/products/{product_id}")
async def update_product(product_id: uuid.UUID, body: ProductBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.begin() as conn:
        before = (
            await conn.execute(
                text("SELECT p.price FROM products p JOIN producer_members m ON m.producer_id = p.producer_id WHERE p.id = :id AND m.user_id = :u"),
                {"id": product_id, "u": user_id},
            )
        ).first()
        updated = await conn.execute(
            text(
                """
                UPDATE products p
                SET name = CAST(:name AS jsonb), unit = :unit, price = :price,
                    in_stock = :in_stock, price_updated_at = now(),
                    min_order = :min_order,
                    category_id = coalesce(
                      (SELECT c.id FROM product_categories c WHERE c.code = CAST(:category AS text)),
                      p.category_id
                    )
                FROM producer_members m
                WHERE p.id = :id AND p.producer_id = m.producer_id AND m.user_id = :user_id
                RETURNING p.id
                """
            ),
            {
                "id": product_id,
                "user_id": user_id,
                "name": json.dumps({"uz-Latn": body.name}, ensure_ascii=False),
                "unit": body.unit,
                "price": body.price,
                "in_stock": body.in_stock,
                "min_order": body.min_order,
                "category": body.category,
            },
        )
        if updated.first() is None:
            return problem(404, "NOT_FOUND", "Topilmadi", "Mahsulot sizniki emas.")
        if body.price is not None and (before is None or before[0] is None or float(before[0]) != float(body.price)):
            await conn.execute(
                text("INSERT INTO product_price_log (id, product_id, price) VALUES (:id, :p, :price)"),
                {"id": new_id(), "p": product_id, "price": body.price},
            )
    return JSONResponse({"saved": True})


@router.delete("/products/{product_id}")
async def delete_product(product_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.begin() as conn:
        removed = await conn.execute(
            text(
                """
                DELETE FROM products p
                USING producer_members m
                WHERE p.id = :id AND p.producer_id = m.producer_id AND m.user_id = :user_id
                  AND NOT EXISTS (SELECT 1 FROM order_requests o WHERE o.product_id = p.id)
                RETURNING p.id
                """
            ),
            {"id": product_id, "user_id": user_id},
        )
        if removed.first() is None:
            return problem(404, "NOT_FOUND", "O'chirilmadi", "Mahsulot yo'q yoki unga buyurtma bog'langan.")
    return JSONResponse({"deleted": True})


@router.get("/categories")
async def categories(request: Request) -> JSONResponse:
    """All product categories, for the producer's add/edit form."""
    async with _engine(request).connect() as conn:
        rows = await conn.execute(text("SELECT code, name FROM product_categories ORDER BY sort, code"))
    return JSONResponse(
        [
            {"code": item["code"], "name": item["name"].get("uz-Latn", "") if isinstance(item["name"], dict) else ""}
            for item in rows.mappings()
        ]
    )


@router.get("/orders")
async def orders(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        rows = await conn.execute(
            text(
                """
                SELECT o.id::text AS id, o.order_no, o.buyer_name, o.buyer_phone, o.buyer_type, o.company_name,
                       o.company_inn, o.delivery, o.address, o.comment, o.quantity, o.status::text AS status,
                       o.created_at, p.name, p.unit, p.price
                FROM order_requests o
                JOIN products p ON p.id = o.product_id
                JOIN producer_members m ON m.producer_id = p.producer_id
                WHERE m.user_id = :id
                ORDER BY o.created_at DESC, o.order_no
                """
            ),
            {"id": user_id},
        )
    return JSONResponse(
        [
            {
                "id": item["id"],
                "order_no": item["order_no"] or item["id"][:8],
                "buyer_name": item["buyer_name"],
                "buyer_phone": item["buyer_phone"],
                "buyer_type": item["buyer_type"],
                "company_name": item["company_name"],
                "company_inn": item["company_inn"],
                "delivery": item["delivery"],
                "address": item["address"],
                "comment": item["comment"],
                "quantity": float(item["quantity"]),
                "unit": item["unit"],
                "price": None if item["price"] is None else float(item["price"]),
                "status": item["status"],
                "created_at": item["created_at"].isoformat(),
                "product": item["name"]["uz-Latn"] if isinstance(item["name"], dict) else "",
            }
            for item in rows.mappings()
        ]
    )


@router.post("/orders/{order_id}/status")
async def order_status(order_id: uuid.UUID, body: OrderStatusBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    if body.status not in {"NEW", "CONTACTED", "DONE", "CANCELLED"}:
        return problem(422, "VALIDATION", "Holat noto'g'ri", "NEW, CONTACTED, DONE yoki CANCELLED.")
    engine = _engine(request)
    async with engine.begin() as conn:
        updated = await conn.execute(
            text(
                """
                UPDATE order_requests o
                SET status = CAST(:status AS order_status),
                    responded_at = CASE WHEN :status <> 'NEW' THEN coalesce(o.responded_at, now()) ELSE o.responded_at END
                FROM products p
                JOIN producer_members m ON m.producer_id = p.producer_id
                WHERE o.id = :id AND o.product_id = p.id AND m.user_id = :user_id
                RETURNING o.id
                """
            ),
            {"id": order_id, "status": body.status, "user_id": user_id},
        )
        if updated.first() is None:
            return problem(404, "NOT_FOUND", "Topilmadi", "Buyurtma sizniki emas.")
    return JSONResponse({"status": body.status})
