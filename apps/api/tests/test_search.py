"""FR-SEARCH: live public search over trades, workers, products and objects."""

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


async def _search(q: str) -> list[dict[str, str]]:
    async with httpx.AsyncClient(base_url=BASE, timeout=20) as client:
        response = await client.get("/api/v1/public/search", params={"q": q})
    assert response.status_code == 200
    return list(response.json())


def test_search_short_query_returns_nothing() -> None:
    _url()
    assert asyncio.run(_search("a")) == []


def test_search_finds_trade_with_link() -> None:
    _url()
    hits = asyncio.run(_search("Santexnik"))
    trades = [hit for hit in hits if hit["kind"] == "trade"]
    assert trades and trades[0]["href"] == "/kasblar/plumber"


def test_search_finds_worker_by_visible_first_name() -> None:
    asyncio.run(_worker_by_first_name())


async def _worker_by_first_name() -> None:
    engine = create_async_engine(_url())
    async with engine.connect() as conn:
        row = (
            await conn.execute(
                text(
                    """
                    SELECT wp.slug, split_part(btrim(u.full_name), ' ', 1) AS first
                    FROM worker_profiles wp JOIN users u ON u.id = wp.user_id
                    ORDER BY u.full_name LIMIT 1
                    """
                )
            )
        ).mappings().one()
    await engine.dispose()
    hits = await _search(row["first"])
    assert any(hit["kind"] == "worker" and hit["href"] == f"/ustalar/{row['slug']}" for hit in hits)


def test_search_does_not_leak_hidden_surname() -> None:
    """BR-17: a hidden surname must not be discoverable through search."""
    asyncio.run(_hidden_surname())


async def _hidden_surname() -> None:
    engine = create_async_engine(_url())
    async with engine.connect() as conn:
        row = (
            await conn.execute(
                text(
                    """
                    SELECT wp.slug, split_part(btrim(u.full_name), ' ', 2) AS surname
                    FROM worker_profiles wp JOIN users u ON u.id = wp.user_id
                    WHERE NOT coalesce((wp.visibility->>'full_name')::boolean, false)
                      AND split_part(btrim(u.full_name), ' ', 2) <> ''
                    LIMIT 1
                    """
                )
            )
        ).mappings().first()
    await engine.dispose()
    if row is None:
        pytest.skip("yashirin familiyali usta yo'q")
    hits = await _search(row["surname"])
    assert not any(hit["kind"] == "worker" and hit["ref"] == row["slug"] for hit in hits)
