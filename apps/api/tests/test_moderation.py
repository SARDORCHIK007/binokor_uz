"""Moderation: one queue, decisions with reasons, the news editor, and the audit trail."""

import asyncio
import os
import uuid

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


def test_moderation_queue_news_and_audit() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_flow())


async def _flow() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    moderator = await _login("moderator")
    student = await _login("student")
    employer = await _login("employer")
    slug = f"test-yangilik-{uuid.uuid4().hex[:6]}"
    item_id = ""
    news_id = ""
    try:
        # access
        for outsider in (student, employer):
            assert (await outsider.get("/api/v1/moderation/queue")).status_code == 403
            assert (await outsider.get("/api/v1/moderation/audit")).status_code == 403
            assert (await outsider.get("/api/v1/moderation/news")).status_code == 403
        queue = await moderator.get("/api/v1/moderation/queue")
        assert queue.status_code == 200
        assert {"PORTFOLIO", "FIRM", "FIRM_DOC", "PARTNER", "NEWS"} <= set(queue.json()["counts"])
        assert "phone" not in queue.text.lower()

        # a pending portfolio item: reject needs a reason, then the decision is final
        async with engine.begin() as conn:
            worker = (await conn.execute(text("SELECT user_id FROM worker_profiles LIMIT 1"))).scalar()
            item_id = str((await conn.execute(text("SELECT gen_random_uuid()"))).scalar())
            await conn.execute(
                text("INSERT INTO portfolio_items (id, worker_user_id, title, file_ids) VALUES (CAST(:i AS uuid), :w, CAST(:t AS jsonb), '{}')"),
                {"i": item_id, "w": worker, "t": '{"uz-Latn": "Test ish"}'},
            )
        queue = (await moderator.get("/api/v1/moderation/queue?kind=PORTFOLIO")).json()
        assert any(i["id"] == item_id for i in queue["items"])
        decision = {"kind": "PORTFOLIO", "id": item_id, "decision": "reject"}
        assert (await student.post("/api/v1/moderation/decide", json=decision)).status_code == 403
        assert (await moderator.post("/api/v1/moderation/decide", json=decision)).status_code == 422
        assert (await moderator.post("/api/v1/moderation/decide", json={**decision, "reason": "Rasm xira"})).status_code == 200
        assert (await moderator.post("/api/v1/moderation/decide", json={**decision, "reason": "Yana"})).status_code == 409
        assert (await moderator.post("/api/v1/moderation/decide", json={"kind": "FIRM", "id": item_id, "decision": "reject", "reason": "Sabab"})).status_code == 422
        queue = (await moderator.get("/api/v1/moderation/queue?kind=PORTFOLIO")).json()
        assert not any(i["id"] == item_id for i in queue["items"])

        # news editor: validation, draft, publish, public visibility, unpublish, delete
        bad = {"slug": "Yomon Manzil", "title": {"uz-Latn": "Sarlavha"}, "body": {"uz-Latn": "Matn matn matn matn matn"}}
        assert (await moderator.post("/api/v1/moderation/news", json=bad)).status_code == 422
        good = {"slug": slug, "title": {"uz-Latn": "Test yangilik sarlavhasi", "ru": "Тестовая новость"}, "body": {"uz-Latn": "Bu test yangilik matni, kamida yigirma belgi."}}
        created = await moderator.post("/api/v1/moderation/news", json=good)
        assert created.status_code == 200, created.text
        news_id = created.json()["id"]
        assert (await moderator.post("/api/v1/moderation/news", json=good)).status_code == 409
        assert (await httpx.AsyncClient(base_url=BASE).get(f"/api/v1/public/news/{slug}")).status_code == 404
        assert (await moderator.put(f"/api/v1/moderation/news/{news_id}", json={**good, "title": {"uz-Latn": "Yangi sarlavha matni"}})).status_code == 200
        assert (await moderator.post(f"/api/v1/moderation/news/{news_id}/publish", json={"publish": True})).status_code == 200
        async with httpx.AsyncClient(base_url=BASE) as anon:
            assert (await anon.get(f"/api/v1/public/news/{slug}")).status_code == 200
        assert (await moderator.delete(f"/api/v1/moderation/news/{news_id}")).status_code == 409
        assert (await moderator.post(f"/api/v1/moderation/news/{news_id}/publish", json={"publish": False})).status_code == 200
        async with httpx.AsyncClient(base_url=BASE) as anon:
            assert (await anon.get(f"/api/v1/public/news/{slug}")).status_code == 404
        assert (await moderator.delete(f"/api/v1/moderation/news/{news_id}")).status_code == 200
        news_id = ""

        # everything above is in the audit log, with the reason
        log = (await moderator.get("/api/v1/moderation/audit?days=1")).json()
        actions = {entry["action"] for entry in log["items"]}
        assert {"PORTFOLIO_REJECT", "NEWS_CREATED", "NEWS_EDITED", "NEWS_PUBLISHED", "NEWS_UNPUBLISHED", "NEWS_DELETED"} <= actions
        rejected = next(entry for entry in log["items"] if entry["action"] == "PORTFOLIO_REJECT" and entry["entity_id"] == item_id)
        assert rejected["detail"]["reason"] == "Rasm xira" and rejected["role"] == "moderator"
        only = (await moderator.get("/api/v1/moderation/audit?entity=NEWS&days=1")).json()
        assert only["items"] and all(entry["entity"] == "NEWS" for entry in only["items"])
    finally:
        async with engine.begin() as conn:
            if item_id:
                await conn.execute(text("DELETE FROM portfolio_items WHERE id = CAST(:i AS uuid)"), {"i": item_id})
            await conn.execute(text("DELETE FROM news WHERE slug = :s"), {"s": slug})
        for client in (moderator, student, employer):
            await client.aclose()
        await engine.dispose()
