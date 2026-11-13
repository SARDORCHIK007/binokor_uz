"""Admin accounts (search, roles with safeguards, blocking) and the district plan and instructions."""

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


def test_admin_accounts() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_accounts())


def test_district_plan_and_tasks() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_district())


async def _accounts() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    admin = await _login("admin")
    student = await _login("student")
    victim_id = uuid.uuid4()
    phone = f"+99890{str(uuid.uuid4().int)[:7]}"
    try:
        assert (await student.get("/api/v1/admin/accounts")).status_code == 403
        assert (await student.get("/api/v1/admin/accounts/health")).status_code == 403
        async with engine.begin() as conn:
            await conn.execute(text("INSERT INTO users (id, phone, full_name) VALUES (:i, :p, 'Test Hisob Sinov')"), {"i": victim_id, "p": phone})
            await conn.execute(text("INSERT INTO user_roles (id, user_id, role) VALUES (gen_random_uuid(), :i, 'student')"), {"i": victim_id})

        # search by name; the phone is masked
        found = (await admin.get("/api/v1/admin/accounts?q=Hisob Sinov")).json()
        row = next(item for item in found["items"] if item["id"] == str(victim_id))
        assert phone not in str(found) and "•" in row["phone"] and row["active"] is True
        assert (await admin.get(f"/api/v1/admin/accounts?q={phone[-6:]}")).json()["total"] >= 1

        # roles: only assignable ones, grant and revoke
        assert (await admin.post(f"/api/v1/admin/accounts/{victim_id}/roles", json={"role": "superadmin", "grant": True})).status_code == 422
        assert (await admin.post(f"/api/v1/admin/accounts/{victim_id}/roles", json={"role": "moderator", "grant": True})).status_code == 200
        row = next(item for item in (await admin.get("/api/v1/admin/accounts?q=Hisob Sinov")).json()["items"] if item["id"] == str(victim_id))
        assert "moderator" in row["roles"]
        assert (await admin.post(f"/api/v1/admin/accounts/{victim_id}/roles", json={"role": "moderator", "grant": False})).status_code == 200

        # the signed-in administrator cannot remove their own admin role or block themselves
        me = (await admin.get("/api/v1/me")).json()
        my_id = me.get("id") or me.get("user", {}).get("id")
        assert (await admin.post(f"/api/v1/admin/accounts/{my_id}/roles", json={"role": "admin", "grant": False})).status_code == 409
        assert (await admin.post(f"/api/v1/admin/accounts/{my_id}/active", json={"active": False, "reason": "xato"})).status_code == 409

        # block needs a reason; a blocked account cannot sign in
        assert (await admin.post(f"/api/v1/admin/accounts/{victim_id}/active", json={"active": False})).status_code == 422
        assert (await admin.post(f"/api/v1/admin/accounts/{victim_id}/active", json={"active": False, "reason": "Qoidabuzarlik"})).status_code == 200
        assert (await admin.get("/api/v1/admin/accounts?state=blocked&q=Hisob Sinov")).json()["total"] == 1
        assert (await admin.post(f"/api/v1/admin/accounts/{victim_id}/active", json={"active": True})).status_code == 200
        assert (await admin.post(f"/api/v1/admin/accounts/{victim_id}/sessions/end")).status_code == 200

        health = (await admin.get("/api/v1/admin/accounts/health")).json()
        assert health["stats"]["users"] >= 1 and "db_mb" in health["stats"]

        # everything is in the audit log, with the reason
        log = (await admin.get("/api/v1/moderation/audit?entity=USER&days=1")).json()
        actions = {entry["action"] for entry in log["items"]}
        assert {"ROLE_GRANTED", "ROLE_REVOKED", "USER_BLOCKED", "USER_UNBLOCKED"} <= actions
        assert any(entry["detail"].get("reason") == "Qoidabuzarlik" for entry in log["items"])
    finally:
        async with engine.begin() as conn:
            await conn.execute(text("DELETE FROM audit_log WHERE entity = 'USER' AND entity_id = :i"), {"i": victim_id})
            await conn.execute(text("DELETE FROM users WHERE id = :i"), {"i": victim_id})
        await admin.aclose()
        await student.aclose()
        await engine.dispose()


async def _district() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    hokimlik = await _login("hokimlik")
    bandlik = await _login("bandlik")
    student = await _login("student")
    year = date.today().year + 1  # a year nobody else uses, so cleanup is exact
    title = f"Test topshiriq {uuid.uuid4().hex[:5]}"
    try:
        assert (await student.get("/api/v1/district/plan")).status_code == 403
        assert (await bandlik.put("/api/v1/district/plan", json={"year": year, "targets": {"certified": 10}})).status_code == 403

        # plan against fact
        assert (await hokimlik.put("/api/v1/district/plan", json={"year": year, "targets": {"bogus": 5}})).status_code == 422
        assert (await hokimlik.put("/api/v1/district/plan", json={"year": year, "targets": {"certified": 100, "employed": 40}})).status_code == 200
        plan = (await hokimlik.get(f"/api/v1/district/plan?year={year}")).json()
        certified = next(item for item in plan["items"] if item["metric"] == "certified")
        assert certified["target"] == 100 and certified["pct"] == 0 and certified["actual"] == 0
        assert next(item for item in plan["items"] if item["metric"] == "abroad")["target"] is None

        # instructions to a team
        too_old = (date.today() - timedelta(days=1)).isoformat()
        assert (await hokimlik.post("/api/v1/district/tasks", json={"team": "employment", "title": title, "due": too_old})).status_code == 422
        assert (await bandlik.post("/api/v1/district/tasks", json={"team": "employment", "title": title})).status_code == 403
        created = await hokimlik.post("/api/v1/district/tasks", json={"team": "employment", "title": title, "detail": "Tafsilot", "due": date.today().isoformat()})
        assert created.status_code == 200, created.text
        task_id = created.json()["id"]
        mine = (await bandlik.get("/api/v1/district/tasks/mine")).json()
        assert any(item["id"] == task_id for item in mine)
        assert (await student.get("/api/v1/district/tasks/mine")).status_code == 403
        agency = await _login("agency")
        assert not any(item["id"] == task_id for item in (await agency.get("/api/v1/district/tasks/mine")).json())
        assert (await agency.post(f"/api/v1/district/tasks/{task_id}/done", json={})).status_code == 404
        await agency.aclose()
        assert (await bandlik.post(f"/api/v1/district/tasks/{task_id}/done", json={"note": "Bajarildi"})).status_code == 200
        assert (await bandlik.post(f"/api/v1/district/tasks/{task_id}/done", json={})).status_code == 404
        listed = (await hokimlik.get("/api/v1/district/tasks")).json()
        done = next(item for item in listed if item["id"] == task_id)
        assert done["status"] == "DONE" and done["done_note"] == "Bajarildi"
        assert (await hokimlik.get("/api/v1/moderation/audit")).status_code == 403
        admin = await _login("admin")
        log = (await admin.get("/api/v1/moderation/audit?entity=DISTRICT_TASK&days=1")).json()
        await admin.aclose()
        assert {"TASK_CREATED", "TASK_DONE"} <= {entry["action"] for entry in log["items"]}
    finally:
        async with engine.begin() as conn:
            await conn.execute(text("DELETE FROM district_targets WHERE year = :y"), {"y": year})
            await conn.execute(text("DELETE FROM district_tasks WHERE title = :t"), {"t": title})
            await conn.execute(text("DELETE FROM audit_log WHERE entity IN ('DISTRICT_PLAN', 'DISTRICT_TASK') AND created_at > now() - interval '1 hour'"))
        for client in (hokimlik, bandlik, student):
            await client.aclose()
        await engine.dispose()
