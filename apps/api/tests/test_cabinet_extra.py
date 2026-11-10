"""Cabinet features: offers answered by the worker, notifications, shortlist, progress, reports."""

import asyncio
import os

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


def test_cabinet_extra_flow() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_flow())


async def _flow() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    employer = await _login("employer")
    worker = await _login("worker")
    producer = await _login("producer")
    admin = await _login("admin")
    mentor = await _login("mentor")
    student = await _login("student")
    request_id = None
    try:
        # anonymous and wrong-role calls are refused
        async with httpx.AsyncClient(base_url=BASE, timeout=30) as anonymous:
            assert (await anonymous.get("/api/v1/me/offers")).status_code == 401
            assert (await anonymous.get("/api/v1/reports/export.csv")).status_code == 401
        assert (await student.get("/api/v1/employers/shortlist")).status_code == 403
        assert (await student.get("/api/v1/reports/mahallas")).status_code == 403
        assert (await student.get("/api/v1/mentor/students")).status_code == 403

        # employer proposes a job to the worker; worker is notified and accepts
        mine = (await worker.get("/api/v1/me/worker")).json()
        assert mine["slug"] and mine["level"]
        found = (await worker.get("/api/v1/me/offers")).json()
        assert found == []
        created = await employer.post("/api/v1/employers/requests", json={"trade_code": "plumber", "quantity": 1, "track": "DOMESTIC"})
        assert created.status_code == 200, created.text
        request_id = created.json()["id"]
        async with engine.connect() as conn:
            worker_id = (await conn.execute(text("SELECT user_id FROM worker_profiles WHERE slug = :s"), {"s": mine["slug"]})).scalar_one()
        assert (await employer.post(f"/api/v1/employers/requests/{request_id}/candidates", json={"worker_user_id": str(worker_id)})).status_code == 200
        offers = (await worker.get("/api/v1/me/offers")).json()
        assert len(offers) == 1 and offers[0]["status"] == "PROPOSED"
        bell = (await worker.get("/api/v1/me/notifications")).json()
        assert bell["unread"] >= 1 and bell["items"][0]["kind"] == "offer"
        assert (await worker.post("/api/v1/me/notifications/read")).status_code == 200
        assert (await worker.get("/api/v1/me/notifications")).json()["unread"] == 0
        answer = await worker.post(f"/api/v1/me/offers/{offers[0]['id']}/respond", json={"accept": True})
        assert answer.json()["status"] == "WORKER_ACCEPTED"
        assert (await worker.post(f"/api/v1/me/offers/{offers[0]['id']}/respond", json={"accept": False})).status_code == 409
        assert (await employer.get("/api/v1/me/notifications")).json()["items"][0]["kind"] == "offer_answer"

        # worker settings: only known visibility keys change, phone is never an option
        assert (await worker.patch("/api/v1/me/worker", json={"availability": "BUSY", "visibility": {"phone": True, "photo": True}})).status_code == 200
        after = (await worker.get("/api/v1/me/worker")).json()
        assert after["availability"] == "BUSY" and after["visibility"]["photo"] is True and "phone" not in after["visibility"]
        await worker.patch("/api/v1/me/worker", json={"availability": "FREE", "visibility": {"photo": False}})

        # shortlist
        assert (await employer.put(f"/api/v1/employers/shortlist/{mine['slug']}")).status_code == 200
        listed = (await employer.get("/api/v1/employers/shortlist")).json()
        assert [x["slug"] for x in listed] == [mine["slug"]] and "phone" not in str(listed)
        assert (await employer.delete(f"/api/v1/employers/shortlist/{mine['slug']}")).status_code == 200
        assert (await employer.get("/api/v1/employers/shortlist")).json() == []

        # progress, mentor, producer, reports
        progress = (await student.get("/api/v1/me/progress")).json()
        assert progress["enrolled"] is True and "schedule" in progress
        assert isinstance((await mentor.get("/api/v1/mentor/students")).json(), list)
        schedule = (await student.get("/api/v1/me/schedule?days=14")).json()
        assert schedule["groups"] and all(x["weekday"] in {"Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"} for x in schedule["lessons"])
        posted = (await employer.get("/api/v1/employers/postings?lang=ru")).json()
        mine_posting = next(x for x in posted if x["id"] == request_id)
        assert mine_posting["trade"] == "Сантехник" and mine_posting["counts"].get("WORKER_ACCEPTED") == 1
        assert (await student.get("/api/v1/employers/postings")).status_code == 403
        stats = (await producer.get("/api/v1/producers/stats")).json()
        assert stats["products"] >= 0 and "months" in stats
        assert isinstance((await admin.get("/api/v1/reports/mahallas")).json(), list)
        csv = await admin.get("/api/v1/reports/export.csv")
        assert csv.status_code == 200 and "mahalla,people" in csv.text and "+998" not in csv.text
    finally:
        if request_id is not None:
            async with engine.begin() as conn:
                await conn.execute(text("DELETE FROM request_candidates WHERE request_id = :r"), {"r": request_id})
                await conn.execute(text("DELETE FROM demand_requests WHERE id = :r"), {"r": request_id})
                await conn.execute(text("DELETE FROM notifications WHERE channel = 'inapp' AND payload->>'request_id' = :r"), {"r": request_id})
        for client in (employer, worker, producer, admin, mentor, student):
            await client.aclose()
        await engine.dispose()
