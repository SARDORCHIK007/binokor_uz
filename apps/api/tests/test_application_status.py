"""FR-APP-STATUS: applicant sees status history; decisions notify the applicant."""

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


async def _token(client: httpx.AsyncClient, role: str) -> str:
    response = await client.post("/api/v1/auth/demo", json={"role": role})
    if response.status_code != 200:
        pytest.skip("demo kirish o'chirilgan")
    return str(response.json()["access_token"])


def test_status_history_and_notification() -> None:
    asyncio.run(_flow())


async def _flow() -> None:
    engine = create_async_engine(_url())
    async with httpx.AsyncClient(base_url=BASE, timeout=20) as client:
        student = {"Authorization": f"Bearer {await _token(client, 'student')}"}
        admin = {"Authorization": f"Bearer {await _token(client, 'admin')}"}
        created = await client.post(
            "/api/v1/applications",
            headers=student,
            json={
                "type": "YOUTH",
                "trade_code": "tiler",
                "track": "DOMESTIC",
                "experience_years": 0,
                "has_language": False,
                "first_name": "Test",
                "last_name": "Arizachi",
                "birth_date": "2004-01-01",
                "consent_personal": True,
                "consent_telegram": True,
            },
        )
        assert created.status_code == 200, created.text
        app_id = created.json()["id"]
        decided = await client.post(
            f"/api/v1/admin/applications/{app_id}/decision", headers=admin, json={"status": "SCREENING"}
        )
        assert decided.status_code == 200
        mine = await client.get("/api/v1/applications/mine", headers=student)
    assert mine.status_code == 200
    app = next(item for item in mine.json() if item["id"] == app_id)
    assert app["status"] == "SCREENING"
    assert [event["status"] for event in app["events"]][-1] == "SCREENING"
    assert app["rejection_reason"] is None

    async with engine.begin() as conn:
        note = (
            await conn.execute(
                text(
                    """
                    SELECT status FROM notifications
                    WHERE kind = 'application_status' AND payload->>'application_id' = :id
                    """
                ),
                {"id": app_id},
            )
        ).scalar()
        # leave the demo data as we found it
        await conn.execute(
            text("DELETE FROM notifications WHERE payload->>'application_id' = :id"), {"id": app_id}
        )
        await conn.execute(text("DELETE FROM application_events WHERE application_id = CAST(:id AS uuid)"), {"id": app_id})
        await conn.execute(text("DELETE FROM applications WHERE id = CAST(:id AS uuid)"), {"id": app_id})
        await conn.execute(
            text("DELETE FROM persons WHERE first_name = 'Test' AND last_name = 'Arizachi' AND id NOT IN (SELECT person_id FROM applications WHERE person_id IS NOT NULL)")
        )
    await engine.dispose()
    assert note in {"SENT", "SKIPPED"}


def test_mine_requires_login() -> None:
    _url()

    async def call() -> int:
        async with httpx.AsyncClient(base_url=BASE, timeout=20) as client:
            return (await client.get("/api/v1/applications/mine")).status_code

    assert asyncio.run(call()) == 401
