"""FR-MARKET: Uychi materials catalog and cart checkout."""

import asyncio
import os

import httpx
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

BASE = "http://127.0.0.1:8000"


def _url() -> str:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        pytest.skip("DATABASE_URL yo'q")
    return url


async def _get(path: str, **params: object) -> dict:  # type: ignore[type-arg]
    async with httpx.AsyncClient(base_url=BASE, timeout=20) as client:
        response = await client.get(path, params=params)
    assert response.status_code == 200, response.text
    return dict(response.json())


def test_catalog_paging_facets_and_sorting() -> None:
    _url()
    first = asyncio.run(_get("/api/v1/public/market", limit=5))
    assert len(first["items"]) <= 5
    assert first["total"] >= len(first["items"])
    assert first["facets"]["categories"] and first["facets"]["producers"]
    cheap = asyncio.run(_get("/api/v1/public/market", sort="price_asc", limit=10))["items"]
    prices = [item["price"] for item in cheap if item["price"] is not None]
    assert prices == sorted(prices)


def test_catalog_filters_by_category_and_price() -> None:
    _url()
    category = asyncio.run(_get("/api/v1/public/market"))["facets"]["categories"][0]["code"]
    only = asyncio.run(_get("/api/v1/public/market", category=category, limit=60))
    assert only["items"] and all(item["category"] == category for item in only["items"])
    ranged = asyncio.run(_get("/api/v1/public/market", min_price=50000, max_price=200000, limit=60))
    assert all(50000 <= item["price"] <= 200000 for item in ranged["items"])
    none = asyncio.run(_get("/api/v1/public/market", q="zzz-yoq-material"))
    assert none["total"] == 0 and none["items"] == []


def test_catalog_hides_buyer_and_producer_phones() -> None:
    _url()
    body = asyncio.run(_get("/api/v1/public/market", limit=60))
    assert "+998" not in str(body)  # BR-17


def test_checkout_company_delivery_and_validation() -> None:
    asyncio.run(_checkout())


async def _checkout() -> None:
    engine = create_async_engine(_url())
    async with httpx.AsyncClient(base_url=BASE, timeout=20) as client:
        items = (await client.get("/api/v1/public/market", params={"limit": 60, "in_stock": True})).json()["items"]
        pick = [item for item in items if item["price"] is not None][:2]
        assert len(pick) == 2
        lines = [{"product_id": item["id"], "quantity": item["min_order"] or 1} for item in pick]
        base = {"buyer_name": "TEST market", "buyer_phone": "+998900000001", "items": lines}

        no_inn = await client.post("/api/v1/public/market/orders", json={**base, "buyer_type": "COMPANY"})
        assert no_inn.status_code == 422
        no_address = await client.post("/api/v1/public/market/orders", json={**base, "delivery": "DELIVERY"})
        assert no_address.status_code == 422
        too_few = [{"product_id": item["id"], "quantity": 0.01} for item in pick if item["min_order"]]
        if too_few:
            low = await client.post("/api/v1/public/market/orders", json={**base, "items": too_few})
            assert low.status_code == 422

        ok = await client.post(
            "/api/v1/public/market/orders",
            json={
                **base,
                "buyer_type": "COMPANY",
                "company_name": "TEST MChJ",
                "company_inn": "123456789",
                "delivery": "DELIVERY",
                "address": "Uychi tumani",
            },
        )
        if ok.status_code == 400:
            pytest.skip("captcha talab qilinadi (APP_ENV != local)")
        assert ok.status_code == 200, ok.text
        order_no = ok.json()["order_no"]
        expected = sum((item["price"] or 0) * line["quantity"] for item, line in zip(pick, lines, strict=True))
        assert ok.json()["estimated_total"] == round(expected)

    async with engine.begin() as conn:
        rows = (
            await conn.execute(
                text("SELECT buyer_type, company_inn, delivery FROM order_requests WHERE order_no = :no"),
                {"no": order_no},
            )
        ).all()
        await conn.execute(text("DELETE FROM order_requests WHERE buyer_name = 'TEST market'"))
    await engine.dispose()
    assert len(rows) == 2
    assert all(row == ("COMPANY", "123456789", "DELIVERY") for row in rows)
