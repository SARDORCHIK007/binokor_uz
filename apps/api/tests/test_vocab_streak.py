"""FR-VOCAB-STREAK: daily streaks, weekly activity and group ranking."""

import asyncio
import os
from datetime import date, timedelta

import httpx
import pytest
from app.routers.vocab import streaks

TODAY = date(2026, 11, 9)


def d(offset: int) -> date:
    return TODAY - timedelta(days=offset)


def test_streak_counts_consecutive_days_ending_today() -> None:
    assert streaks({d(0), d(1), d(2), d(5)}, TODAY) == (3, 3)


def test_streak_survives_until_today_is_done() -> None:
    # Yesterday and before, nothing yet today: the streak is still alive.
    assert streaks({d(1), d(2)}, TODAY) == (2, 2)


def test_streak_breaks_after_a_missed_day() -> None:
    current, best = streaks({d(2), d(3), d(4), d(5)}, TODAY)
    assert current == 0 and best == 4


def test_empty_history() -> None:
    assert streaks(set(), TODAY) == (0, 0)


def test_answer_updates_today_and_board_hides_surnames() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_flow())


async def _flow() -> None:
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=20) as client:
        login = await client.post("/api/v1/auth/demo", json={"role": "student"})
        if login.status_code != 200:
            pytest.skip("demo kirish o'chirilgan")
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        before = (await client.get("/api/v1/vocab/streak", headers=headers)).json()
        words = (await client.get("/api/v1/vocab/today", headers=headers)).json()["new"]
        if not words:
            pytest.skip("bugun so'z yo'q")
        saved = await client.post(
            "/api/v1/vocab/answers", headers=headers, json={"word_id": words[0]["id"], "correct": True}
        )
        assert saved.status_code == 200
        after = (await client.get("/api/v1/vocab/streak", headers=headers)).json()
        assert after["today"] == before["today"] + 1
        assert after["current"] >= 1
        assert len(after["week"]) == 7
        board = (await client.get("/api/v1/vocab/leaderboard", headers=headers)).json()
        assert any(row["me"] for row in board)
        assert all(" " not in row["name"] for row in board)  # first names only
