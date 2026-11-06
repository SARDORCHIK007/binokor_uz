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
                SELECT id::text AS id, name, unit, price, in_stock, is_published
                FROM products WHERE producer_id = :id ORDER BY name->>'uz-Latn'
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
        category = await conn.execute(text("SELECT id FROM product_categories ORDER BY code LIMIT 1"))
        category_id = category.scalar()
        product_id = new_id()
        await conn.execute(
            text(
                """
                INSERT INTO products (
                  id, producer_id, category_id, name, unit, price, in_stock, is_published, price_updated_at
                )
                VALUES (
                  :id, :producer_id, :category_id, CAST(:name AS jsonb), :unit, :price, :in_stock, true, now()
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
        updated = await conn.execute(
            text(
                """
                UPDATE products p
                SET name = CAST(:name AS jsonb), unit = :unit, price = :price,
                    in_stock = :in_stock, price_updated_at = now()
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
            },
        )
        if updated.first() is None:
            return problem(404, "NOT_FOUND", "Topilmadi", "Mahsulot sizniki emas.")
    return JSONResponse({"saved": True})


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
                SELECT o.id::text AS id, o.buyer_name, o.quantity, o.status::text AS status, p.name
                FROM order_requests o
                JOIN products p ON p.id = o.product_id
                JOIN producer_members m ON m.producer_id = p.producer_id
                WHERE m.user_id = :id
                ORDER BY o.created_at DESC
                """
            ),
            {"id": user_id},
        )
    return JSONResponse(
        [
            {
                "id": item["id"],
                "buyer_name": item["buyer_name"],
                "quantity": float(item["quantity"]),
                "status": item["status"],
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
                SET status = CAST(:status AS order_status)
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
