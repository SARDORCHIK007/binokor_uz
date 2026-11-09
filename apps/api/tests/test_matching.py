"""FR-MATCH: explainable candidate ranking for employer requests."""

import asyncio
import os

import httpx
import pytest
from app.routers.employers import match_score

BASE = "http://127.0.0.1:8000"


def test_match_score_rewards_certified_free_rated_workers() -> None:
    best, reasons = match_score(rating=4.8, hours=900, certified=True, free=True)
    weak, weak_reasons = match_score(rating=None, hours=0, certified=False, free=False)
    assert best > 0.9
    assert set(reasons) == {"certified", "available", "top_rated", "experienced"}
    assert weak == 0.0 and weak_reasons == []


def test_match_score_is_bounded() -> None:
    score, _ = match_score(rating=99, hours=99_999, certified=True, free=True)
    assert score <= 1.0


def test_request_matches_and_candidates() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_flow())


async def _flow() -> None:
    async with httpx.AsyncClient(base_url=BASE, timeout=20) as client:
        login = await client.post("/api/v1/auth/demo", json={"role": "employer"})
        if login.status_code != 200:
            pytest.skip("demo kirish o'chirilgan")
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        bad = await client.post(
            "/api/v1/employers/requests",
            headers=headers,
            json={"trade_code": "plumber", "quantity": 2, "salary_from": 9, "salary_to": 1},
        )
        assert bad.status_code == 422
        created = await client.post(
            "/api/v1/employers/requests",
            headers=headers,
            json={"trade_code": "plumber", "quantity": 2, "duration_months": 3, "conditions": "Test"},
        )
        assert created.status_code == 200, created.text
        request_id = created.json()["id"]
        found = await client.get(f"/api/v1/employers/requests/{request_id}/matches", headers=headers)
        assert found.status_code == 200
        body = found.json()
        assert "+998" not in found.text  # BR-17
        scores = [row["score"] for row in body["workers"]]
        assert scores == sorted(scores, reverse=True)
        if body["workers"]:
            first = body["workers"][0]["user_id"]
            ok = await client.post(
                f"/api/v1/employers/requests/{request_id}/candidates",
                headers=headers,
                json={"worker_user_id": first},
            )
            assert ok.status_code == 200
            again = await client.get(f"/api/v1/employers/requests/{request_id}/matches", headers=headers)
            assert all(row["user_id"] != first for row in again.json()["workers"])
            listed = await client.get(f"/api/v1/employers/requests/{request_id}/candidates", headers=headers)
            assert any(row["kind"] == "worker" for row in listed.json())
        neither = await client.post(
            f"/api/v1/employers/requests/{request_id}/candidates", headers=headers, json={}
        )
        assert neither.status_code == 422
