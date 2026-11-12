"""Monitoring: anonymous teacher survey, teacher rating, leadership dashboard."""

import asyncio
import os

import httpx
import pytest
from app.routers.monitoring import CRITERIA, WEIGHTS, composite, current_round
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

BASE = "http://127.0.0.1:8000"


def test_composite_reweights_missing_parts() -> None:
    assert sum(WEIGHTS.values()) == 100
    assert composite(None, None, None, None)["score"] is None
    only_results = composite(None, 80.0, None, None)
    assert only_results["score"] == 80
    full = composite(5.0, 100.0, 100.0, 100.0)
    assert full["score"] == 100
    low = composite(1.0, 0.0, 0.0, 0.0)
    assert low["score"] == 0
    # survey on a 1-5 scale becomes 0-100
    assert composite(3.0, None, None, None)["parts"]["survey"] == 50


def test_round_label() -> None:
    from datetime import UTC, datetime

    assert current_round(datetime(2026, 3, 1, tzinfo=UTC)) == "2026-H1"
    assert current_round(datetime(2026, 9, 1, tzinfo=UTC)) == "2026-H2"


async def _login(role: str) -> httpx.AsyncClient:
    client = httpx.AsyncClient(base_url=BASE, timeout=30)
    response = await client.post("/api/v1/auth/demo", json={"role": role})
    if response.status_code != 200:
        await client.aclose()
        pytest.skip("demo kirish o'chirilgan")
    return client


def test_survey_flow() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_flow())


async def _flow() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    director = await _login("director")
    student = await _login("student")
    mentor = await _login("mentor")
    worker_only = await _login("employer")
    try:
        assert (await worker_only.get("/api/v1/monitoring/overview")).status_code == 403
        assert (await student.get("/api/v1/monitoring/overview")).status_code == 403
        assert (await student.get("/api/v1/me/teacher-rating")).status_code == 403

        survey = (await student.get("/api/v1/me/teacher-survey")).json()
        assert survey["criteria"] == list(CRITERIA)
        assert survey["teachers"], "demo student must have a teacher"
        group_id = survey["teachers"][0]["group_id"]
        good = {key: 4 for key in CRITERIA}
        assert (await student.post("/api/v1/me/teacher-survey", json={"group_id": group_id, "scores": {"expertise": 5}})).status_code == 422
        assert (await student.post("/api/v1/me/teacher-survey", json={"group_id": group_id, "scores": {**good, "respect": 9}})).status_code == 422
        saved = await student.post("/api/v1/me/teacher-survey", json={"group_id": group_id, "scores": good, "comment": "Yaxshi tushuntiradi"})
        assert saved.status_code == 200
        assert (await student.post("/api/v1/me/teacher-survey", json={"group_id": group_id, "scores": good})).status_code == 409

        overview = (await director.get("/api/v1/monitoring/overview")).json()
        assert overview["kpi"]["survey_answers"] >= 1
        rated = [item for item in overview["teachers"] if item["survey"] is not None]
        assert rated and rated[0]["survey"] == 4.0
        detail = (await director.get(f"/api/v1/monitoring/teachers/{rated[0]['id']}")).json()
        assert any(item["text"] == "Yaxshi tushuntiradi" for item in detail["comments"])
        assert detail["criteria"]["expertise"] == 4.0
        raw = str(detail) + str(overview)
        async with engine.connect() as conn:
            student_id = str((await conn.execute(text("SELECT id FROM users WHERE phone = '+998901300002'"))).scalar_one())
        assert student_id not in raw, "a survey answer must never reveal the student"

        mine = (await mentor.get("/api/v1/me/teacher-rating")).json()
        assert mine["score"] is not None or mine["responses"] >= 0
        students = (await director.get("/api/v1/monitoring/students")).json()
        assert students and "rank" in students[0]
    finally:
        async with engine.begin() as conn:
            await conn.execute(text("DELETE FROM teacher_surveys WHERE comment = 'Yaxshi tushuntiradi' OR student_user_id IN (SELECT id FROM users WHERE phone = '+998901300002')"))
        for client in (director, student, mentor, worker_only):
            await client.aclose()
        await engine.dispose()
