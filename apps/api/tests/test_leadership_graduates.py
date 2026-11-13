"""Director alerts and the university's follow-ups and outcomes."""

import asyncio
import os
import uuid
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


def test_leadership_and_graduate_follow_ups() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_flow())


async def _flow() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    director = await _login("director")
    student = await _login("student")
    univ = await _login("namdtu")
    name = f"Test Bitiruvchi {uuid.uuid4().hex[:5]}"
    phone = f"+99890{str(uuid.uuid4().int)[:7]}"
    try:
        # director alerts
        assert (await student.get("/api/v1/leadership/alerts")).status_code == 403
        assert (await student.get("/api/v1/leadership/at-risk.csv")).status_code == 403
        alerts = await director.get("/api/v1/leadership/alerts")
        assert alerts.status_code == 200
        body = alerts.json()
        assert {"diary", "at_risk", "group_sizes", "trend", "homework", "certificates_waiting"} <= set(body)
        assert "phone" not in alerts.text.lower()
        csv = await director.get("/api/v1/leadership/at-risk.csv")
        assert csv.status_code == 200
        assert csv.text.lstrip("﻿").splitlines()[0] == "name,group,mentor,attendance_pct,lessons"

        # university: follow-up
        assert (await student.get("/api/v1/graduates/outcomes")).status_code == 403
        assert (await univ.post("/api/v1/graduates", json={"full_name": name, "phone": phone, "specialty": "Qurilish", "graduation_year": 2025})).status_code == 200
        leads = (await univ.get("/api/v1/graduates")).json()["leads"]
        lead = next(item for item in leads if item["full_name"] == name)
        past = (date.today() - timedelta(days=1)).isoformat()
        assert (await univ.post(f"/api/v1/graduates/{lead['id']}/follow-up", json={"follow_up": past})).status_code == 422
        soon = date.today().isoformat()
        assert (await univ.post(f"/api/v1/graduates/{lead['id']}/follow-up", json={"follow_up": soon, "contacted": True})).status_code == 200
        lead = next(item for item in (await univ.get("/api/v1/graduates")).json()["leads"] if item["full_name"] == name)
        assert lead["follow_up"] == soon and lead["due"] is True and lead["status"] == "CONTACTED" and lead["last_contact"] == soon

        outcomes = (await univ.get("/api/v1/graduates/outcomes")).json()
        year = next(item for item in outcomes["years"] if item["year"] == "2025")
        assert year["leads"] >= 1 and year["due"] >= 1
        assert outcomes["totals"]["leads"] >= 1

        export = await univ.get("/api/v1/graduates/export.csv")
        assert export.status_code == 200
        assert name in export.text and phone not in export.text
    finally:
        async with engine.begin() as conn:
            await conn.execute(text("DELETE FROM graduate_leads WHERE full_name = :n"), {"n": name})
        for client in (director, student, univ):
            await client.aclose()
        await engine.dispose()
