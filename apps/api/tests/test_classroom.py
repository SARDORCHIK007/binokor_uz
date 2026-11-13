"""Lesson diary: teachers write, learners of the group read and tick off homework, outsiders are refused."""

import asyncio
import os
from datetime import date, timedelta

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


def test_lesson_diary() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_flow())


async def _flow() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    admin = await _login("admin")
    student = await _login("student")
    employer = await _login("employer")
    day = (date.today() - timedelta(days=400)).isoformat()
    group_id = ""
    try:
        me = (await student.get("/api/v1/me")).json()
        async with engine.connect() as conn:
            row = (
                await conn.execute(
                    text("SELECT group_id FROM enrollments WHERE student_user_id = CAST(:u AS uuid) AND status = 'ACTIVE' LIMIT 1"),
                    {"u": me.get("id") or me.get("user", {}).get("id")},
                )
            ).first()
        if row is None:
            pytest.skip("demo tinglovchi guruhda emas")
        group_id = str(row[0])

        # roles
        assert (await employer.get("/api/v1/classroom/mentor")).status_code == 403
        assert (await student.get("/api/v1/classroom/mentor")).status_code == 403
        body = {"group_id": group_id, "lesson_date": day, "topic": "Test mavzu", "homework": "Test vazifa", "announce": False}
        assert (await student.post("/api/v1/classroom/logs", json=body)).status_code == 403
        assert (await admin.post("/api/v1/classroom/logs", json={**body, "topic": "x"})).status_code == 422
        future = (date.today() + timedelta(days=3)).isoformat()
        assert (await admin.post("/api/v1/classroom/logs", json={**body, "lesson_date": future})).status_code == 422

        # write, and writing the same day again replaces the entry
        first = await admin.post("/api/v1/classroom/logs", json=body)
        assert first.status_code == 200, first.text
        second = await admin.post("/api/v1/classroom/logs", json={**body, "topic": "Test mavzu 2"})
        assert second.json()["id"] == first.json()["id"]
        log_id = first.json()["id"]

        # the learner sees it and ticks the homework
        view = (await student.get("/api/v1/classroom/student")).json()
        mine = next(item for item in view["logs"] if item["id"] == log_id)
        assert mine["topic"] == "Test mavzu 2" and mine["done"] is False
        assert (await student.post(f"/api/v1/classroom/logs/{log_id}/done", json={"done": True})).status_code == 200
        view = (await student.get("/api/v1/classroom/student")).json()
        assert next(item for item in view["logs"] if item["id"] == log_id)["done"] is True
        assert view["homework_done"] >= 1
        teacher = (await admin.get("/api/v1/classroom/mentor")).json()
        assert next(item for item in teacher["logs"] if item["id"] == log_id)["done"] == 1

        # an outsider cannot tick it
        assert (await employer.post(f"/api/v1/classroom/logs/{log_id}/done", json={"done": True})).status_code == 404

        assert (await student.delete(f"/api/v1/classroom/logs/{log_id}")).status_code == 403
        assert (await admin.delete(f"/api/v1/classroom/logs/{log_id}")).status_code == 200
        assert (await admin.delete(f"/api/v1/classroom/logs/{log_id}")).status_code == 404
    finally:
        async with engine.begin() as conn:
            if group_id:
                await conn.execute(text("DELETE FROM lesson_logs WHERE topic LIKE 'Test mavzu%' AND group_id = CAST(:g AS uuid)"), {"g": group_id})
        for client in (admin, student, employer):
            await client.aclose()
        await engine.dispose()
