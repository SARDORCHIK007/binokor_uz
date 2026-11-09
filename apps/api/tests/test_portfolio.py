"""FR-PORTFOLIO: upload, privacy until confirmed, confirm, public profile, delete."""

import asyncio
import base64
import os

import httpx
import pytest

BASE = "http://127.0.0.1:8000"
PNG = base64.b64encode(
    base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
).decode()


def _db() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")


async def _token(client: httpx.AsyncClient, role: str) -> dict[str, str]:
    response = await client.post("/api/v1/auth/demo", json={"role": role})
    if response.status_code != 200:
        pytest.skip("demo kirish o'chirilgan")
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_portfolio_flow() -> None:
    _db()
    asyncio.run(_flow())


async def _anon(path: str) -> int:
    """Fresh client without the demo-login cookies."""
    async with httpx.AsyncClient(base_url=BASE, timeout=20) as client:
        return (await client.get(path)).status_code


async def _flow() -> None:
    async with httpx.AsyncClient(base_url=BASE, timeout=20) as client:
        worker = await _token(client, "worker")
        admin = await _token(client, "admin")
        bad = await client.post(
            "/api/v1/me/portfolio",
            headers=worker,
            json={"title": "Test ish", "content_type": "application/pdf", "data_base64": PNG},
        )
        assert bad.status_code == 422
        created = await client.post(
            "/api/v1/me/portfolio",
            headers=worker,
            json={"title": "Test ish", "content_type": "image/png", "data_base64": PNG},
        )
        assert created.status_code == 200, created.text
        item_id = created.json()["id"]
        mine = (await client.get("/api/v1/me/portfolio", headers=worker)).json()
        item = next(row for row in mine["items"] if row["id"] == item_id)
        image = item["image"]
        assert item["confirmed"] is False
        assert await _anon(image) == 404  # BR-20: private until confirmed
        async with httpx.AsyncClient(base_url=BASE, timeout=20) as owner:
            assert (await owner.get(image, headers=worker)).status_code == 200
        profile = (await client.get(f"/api/v1/public/workers/{mine['slug']}")).json()
        assert all(row["id"] != item_id for row in profile["portfolio"])

        forbidden = await client.post(f"/api/v1/admin/portfolio/{item_id}/confirm", headers=worker)
        assert forbidden.status_code == 403
        confirmed = await client.post(f"/api/v1/admin/portfolio/{item_id}/confirm", headers=admin)
        assert confirmed.status_code == 200
        assert await _anon(image) == 200
        profile = (await client.get(f"/api/v1/public/workers/{mine['slug']}")).json()
        assert any(row["id"] == item_id for row in profile["portfolio"])
        assert profile["reviews"]["count"] >= 0

        removed = await client.delete(f"/api/v1/me/portfolio/{item_id}", headers=worker)
        assert removed.status_code == 200
        assert await _anon(image) == 404
