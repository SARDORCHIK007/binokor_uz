"""Account settings, notification switches and the personal data export."""

import asyncio
import os

import httpx
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

BASE = "http://127.0.0.1:8000"


def test_settings_flow() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_flow())


async def _flow() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as anonymous:
        assert (await anonymous.get("/api/v1/me/settings")).status_code == 401
        assert (await anonymous.get("/api/v1/me/export")).status_code == 401
    worker = httpx.AsyncClient(base_url=BASE, timeout=30)
    if (await worker.post("/api/v1/auth/demo", json={"role": "worker"})).status_code != 200:
        pytest.skip("demo kirish o'chirilgan")
    original = (await worker.get("/api/v1/me/settings")).json()
    try:
        assert original["phone"].count("•") >= 5 and "+998901300021" not in str(original)
        assert set(original["notify"]) == {"offers", "vacancies", "system"}
        bad = {"full_name": original["full_name"], "locale": "xx", "notify": {}}
        assert (await worker.put("/api/v1/me/settings", json=bad)).status_code == 422
        assert (await worker.put("/api/v1/me/settings", json={"full_name": original["full_name"], "email": "not-an-email"})).status_code == 422
        saved = await worker.put(
            "/api/v1/me/settings",
            json={"full_name": original["full_name"], "email": "usta@example.uz", "locale": "ru", "notify": {"offers": False, "vacancies": True, "system": True}},
        )
        assert saved.status_code == 200
        now = (await worker.get("/api/v1/me/settings")).json()
        assert now["email"] == "usta@example.uz" and now["locale"] == "ru" and now["notify"]["offers"] is False
        # a switched-off group is not delivered
        async with engine.begin() as conn:
            uid = (await conn.execute(text("SELECT id FROM users WHERE phone = '+998901300021'"))).scalar_one()
            before = (await conn.execute(text("SELECT count(*) FROM notifications WHERE user_id = :u"), {"u": uid})).scalar_one()
        from app.inapp import notify

        async with engine.begin() as conn:
            await notify(conn, uid, "offer", {"x": 1})
            await notify(conn, uid, "vacancy_new", {"x": 1})
        async with engine.begin() as conn:
            after = (await conn.execute(text("SELECT count(*) FROM notifications WHERE user_id = :u"), {"u": uid})).scalar_one()
            await conn.execute(text("DELETE FROM notifications WHERE user_id = :u AND payload = CAST('{\"x\": 1}' AS jsonb)"), {"u": uid})
        assert int(after) - int(before) == 1
        export = await worker.get("/api/v1/me/export")
        assert export.status_code == 200 and "attachment" in export.headers["content-disposition"]
        body = export.json()
        assert body["user"] and "pinfl" not in export.text.lower()
    finally:
        await worker.put(
            "/api/v1/me/settings",
            json={"full_name": original["full_name"], "email": "", "locale": original["locale"], "notify": {"offers": True, "vacancies": True, "system": True}},
        )
        await worker.aclose()
        await engine.dispose()
