"""Producer desk: stock, price history, order notes and response time, company profile, access control."""

import asyncio
import os

import httpx
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

BASE = "http://127.0.0.1:8000"


async def _login(role: str) -> httpx.AsyncClient:
    client = httpx.AsyncClient(base_url=BASE, timeout=30)
    response = await client.post("/api/v1/auth/demo", json={"role": role})
    if response.status_code != 200:
        await client.aclose()
        pytest.skip("demo kirish o'chirilgan")
    return client


def test_producer_desk() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_flow())


async def _flow() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    producer = await _login("producer")
    student = await _login("student")
    order_id = ""
    try:
        assert (await student.get("/api/v1/producers/desk")).status_code == 403
        assert (await student.get("/api/v1/producers/profile")).status_code == 403
        desk = await producer.get("/api/v1/producers/desk")
        assert desk.status_code == 200
        assert "buyer_phone" not in desk.text

        # profile
        assert (await producer.put("/api/v1/producers/profile", json={"website": "ftp://x"})).status_code == 422
        assert (await producer.put("/api/v1/producers/profile", json={"phone": "901234567"})).status_code == 422
        assert (await producer.put("/api/v1/producers/profile", json={"work_hours": "Du-Sha 8:00-18:00", "description": "Test ishlab chiqaruvchi"})).status_code == 200
        assert (await producer.get("/api/v1/producers/profile")).json()["work_hours"] == "Du-Sha 8:00-18:00"

        products = (await producer.get("/api/v1/producers/products")).json()
        if not products:
            pytest.skip("demo ishlab chiqaruvchida mahsulot yo'q")
        product = products[0]
        pid = product["id"]

        # stock: zero marks out of stock, positive restores it; others cannot touch it
        assert (await student.post(f"/api/v1/producers/products/{pid}/stock", json={"stock_qty": 5})).status_code == 403
        assert (await producer.post(f"/api/v1/producers/products/{pid}/stock", json={"stock_qty": -1})).status_code == 422
        assert (await producer.post(f"/api/v1/producers/products/{pid}/stock", json={"stock_qty": 3, "low_stock_at": 5})).status_code == 200
        row = next(p for p in (await producer.get("/api/v1/producers/desk")).json()["products"] if p["id"] == pid)
        assert row["low"] is True and row["in_stock"] is True
        assert (await producer.post(f"/api/v1/producers/products/{pid}/stock", json={"stock_qty": 0})).status_code == 200
        row = next(p for p in (await producer.get("/api/v1/producers/desk")).json()["products"] if p["id"] == pid)
        assert row["in_stock"] is False

        # price history is written when the price changes
        async with engine.begin() as conn:
            await conn.execute(text("DELETE FROM product_price_log WHERE product_id = CAST(:p AS uuid)"), {"p": pid})
        new_price = float(product["price"] or 1000) + 7
        patch = await producer.patch(
            f"/api/v1/producers/products/{pid}",
            json={"name": product["name"]["uz-Latn"] if isinstance(product["name"], dict) else product["name"], "unit": product["unit"], "price": new_price, "in_stock": True, "min_order": product.get("min_order"), "category": product.get("category")},
        )
        if patch.status_code == 200:
            history = (await producer.get(f"/api/v1/producers/products/{pid}/prices")).json()
            assert history and history[0]["price"] == new_price

        # an order: note and response time
        async with engine.begin() as conn:
            order_id = str((await conn.execute(text("SELECT gen_random_uuid()"))).scalar())
            await conn.execute(
                text("INSERT INTO order_requests (id, product_id, buyer_name, buyer_phone, quantity) VALUES (:o, CAST(:p AS uuid), 'Test xaridor', '+998901112233', 2)"),
                {"o": order_id, "p": pid},
            )
        desk = (await producer.get("/api/v1/producers/desk")).json()
        assert any(o["id"] == order_id for o in desk["orders"]) and desk["kpi"]["new_orders"] >= 1
        assert (await student.post(f"/api/v1/producers/orders/{order_id}/note", json={"note": "x"})).status_code == 403
        assert (await producer.post(f"/api/v1/producers/orders/{order_id}/note", json={"note": "Ertaga yetkazamiz"})).status_code == 200
        assert (await producer.post(f"/api/v1/producers/orders/{order_id}/status", json={"status": "CONTACTED"})).status_code == 200
        async with engine.connect() as conn:
            responded = (await conn.execute(text("SELECT responded_at FROM order_requests WHERE id = CAST(:o AS uuid)"), {"o": order_id})).scalar()
        assert responded is not None
        desk = (await producer.get("/api/v1/producers/desk")).json()
        assert next(o for o in desk["orders"] if o["id"] == order_id)["note"] == "Ertaga yetkazamiz"
    finally:
        async with engine.begin() as conn:
            if order_id:
                await conn.execute(text("DELETE FROM order_requests WHERE id = CAST(:o AS uuid)"), {"o": order_id})
            await conn.execute(text("UPDATE producers SET work_hours = NULL, description = NULL WHERE work_hours = 'Du-Sha 8:00-18:00'"))
            await conn.execute(text("UPDATE products SET stock_qty = NULL, low_stock_at = NULL, in_stock = true WHERE low_stock_at = 5 OR stock_qty = 0"))
        await producer.aclose()
        await student.aclose()
        await engine.dispose()
