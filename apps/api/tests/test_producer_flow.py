"""Producer profile end to end: add product in a chosen category, receive a cart order, handle it."""

import asyncio
import os

import httpx
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

BASE = "http://127.0.0.1:8000"


def test_producer_receives_and_handles_marketplace_order() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_flow())


async def _flow() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    async with httpx.AsyncClient(base_url=BASE, timeout=20) as client:
        login = await client.post("/api/v1/auth/demo", json={"role": "producer"})
        if login.status_code != 200:
            pytest.skip("demo kirish o'chirilgan")
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        cats = (await client.get("/api/v1/producers/categories")).json()
        assert {"cement", "bricks", "electrical"} <= {row["code"] for row in cats}

        created = await client.post(
            "/api/v1/producers/products",
            headers=headers,
            json={"name": "TEST Sement", "category": "cement", "unit": "qop", "price": 50000, "min_order": 5},
        )
        assert created.status_code == 200, created.text
        product_id = created.json()["id"]
        try:
            mine = {row["id"]: row for row in (await client.get("/api/v1/producers/products", headers=headers)).json()}
            assert mine[product_id]["category"] == "cement"  # not "first alphabetically"
            assert mine[product_id]["min_order"] == 5

            patched = await client.patch(
                f"/api/v1/producers/products/{product_id}",
                headers=headers,
                json={"name": "TEST Sement", "category": "bricks", "unit": "qop", "price": 55000, "min_order": 5},
            )
            assert patched.status_code == 200
            assert (await client.get("/api/v1/producers/products", headers=headers)).json()
            market = (await client.get("/api/v1/public/market", params={"q": "TEST Sement"})).json()
            assert market["items"][0]["category"] == "bricks" and market["items"][0]["price"] == 55000

            order = await client.post(
                "/api/v1/public/market/orders",
                json={
                    "items": [{"product_id": product_id, "quantity": 6}],
                    "buyer_type": "COMPANY",
                    "buyer_name": "TEST Buyer",
                    "buyer_phone": "+998900000002",
                    "company_name": "TEST MChJ",
                    "company_inn": "123456789",
                    "delivery": "DELIVERY",
                    "address": "Uychi",
                },
            )
            if order.status_code == 400:
                pytest.skip("captcha talab qilinadi (APP_ENV != local)")
            assert order.status_code == 200, order.text
            order_no = order.json()["order_no"]

            received = [row for row in (await client.get("/api/v1/producers/orders", headers=headers)).json() if row["order_no"] == order_no]
            assert len(received) == 1
            row = received[0]
            assert row["buyer_phone"] == "+998900000002"  # the producer sees the phone (BR-17: only them)
            assert row["company_name"] == "TEST MChJ" and row["delivery"] == "DELIVERY"
            status = await client.post(f"/api/v1/producers/orders/{row['id']}/status", headers=headers, json={"status": "DONE"})
            assert status.status_code == 200

            blocked = await client.delete(f"/api/v1/producers/products/{product_id}", headers=headers)
            assert blocked.status_code == 404  # has an order, cannot be deleted
        finally:
            async with engine.begin() as conn:
                await conn.execute(text("DELETE FROM order_requests WHERE buyer_name = 'TEST Buyer'"))
            await client.delete(f"/api/v1/producers/products/{product_id}", headers=headers)
    await engine.dispose()
