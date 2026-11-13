"""Local employer desk: pipeline stages, hiring creates a placement, company profile, access control."""

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


def test_employer_desk() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_flow())


async def _flow() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    employer = await _login("employer")
    student = await _login("student")
    candidate_id = ""
    request_id = ""
    try:
        assert (await student.get("/api/v1/employers/desk")).status_code == 403
        assert (await student.get("/api/v1/employers/profile")).status_code == 403
        assert (await employer.get("/api/v1/employers/desk")).status_code == 200

        # profile: validation and save
        assert (await employer.put("/api/v1/employers/profile", json={"contact_email": "yomon"})).status_code == 422
        assert (await employer.put("/api/v1/employers/profile", json={"website": "ftp://x"})).status_code == 422
        saved = await employer.put("/api/v1/employers/profile", json={"address": "Uychi, Test ko'chasi 1", "description": "Qurilish kompaniyasi"})
        assert saved.status_code == 200
        profile = (await employer.get("/api/v1/employers/profile")).json()
        assert profile["address"] == "Uychi, Test ko'chasi 1"
        assert (await employer.get("/api/v1/employers/desk")).json()["company"]["completeness"] > 0

        # a candidate on one of the employer's local requests
        async with engine.begin() as conn:
            employer_id = (
                await conn.execute(text("SELECT employer_id FROM employer_members m JOIN users u ON u.id = m.user_id JOIN user_roles r ON r.user_id = u.id WHERE r.role = 'employer_local' LIMIT 1"))
            ).scalar()
            trade = (await conn.execute(text("SELECT id FROM trades LIMIT 1"))).scalar()
            worker = (await conn.execute(text("SELECT user_id FROM worker_profiles LIMIT 1"))).scalar()
            request_id = str((await conn.execute(text("SELECT gen_random_uuid()"))).scalar())
            await conn.execute(
                text("INSERT INTO demand_requests (id, employer_id, trade_id, quantity, track, status) VALUES (:r, :e, :t, 1, 'DOMESTIC', 'NEW')"),
                {"r": request_id, "e": employer_id, "t": trade},
            )
            candidate_id = str((await conn.execute(text("SELECT gen_random_uuid()"))).scalar())
            await conn.execute(
                text("INSERT INTO request_candidates (id, request_id, worker_user_id) VALUES (:c, :r, :w)"),
                {"c": candidate_id, "r": request_id, "w": worker},
            )
        desk = (await employer.get("/api/v1/employers/desk")).json()
        assert any(item["id"] == candidate_id for item in desk["pipeline"])

        assert (await employer.post(f"/api/v1/employers/candidates/{candidate_id}/stage", json={"stage": "BOGUS"})).status_code == 422
        assert (await student.post(f"/api/v1/employers/candidates/{candidate_id}/stage", json={"stage": "INTERVIEW"})).status_code == 403
        assert (await employer.post(f"/api/v1/employers/candidates/{candidate_id}/stage", json={"stage": "INTERVIEW", "note": "Dushanba 10:00"})).status_code == 200
        hired = await employer.post(f"/api/v1/employers/candidates/{candidate_id}/stage", json={"stage": "HIRED"})
        assert hired.status_code == 200, hired.text
        assert (await employer.post(f"/api/v1/employers/candidates/{candidate_id}/stage", json={"stage": "REJECTED"})).status_code == 409
        desk = (await employer.get("/api/v1/employers/desk")).json()
        placement = next(p for p in desk["placements"] if p["finish"] is None and p["start"])
        assert (await employer.post(f"/api/v1/employers/placements/{placement['id']}/end", json={})).status_code == 200
        assert (await employer.post(f"/api/v1/employers/placements/{placement['id']}/end", json={})).status_code == 404
    finally:
        async with engine.begin() as conn:
            if request_id:
                await conn.execute(text("DELETE FROM placements WHERE request_id = CAST(:r AS uuid)"), {"r": request_id})
                await conn.execute(text("DELETE FROM demand_requests WHERE id = CAST(:r AS uuid)"), {"r": request_id})
            await conn.execute(text("UPDATE employers SET address = NULL, description = NULL WHERE address = 'Uychi, Test ko''chasi 1'"))
        await employer.aclose()
        await student.aclose()
        await engine.dispose()
