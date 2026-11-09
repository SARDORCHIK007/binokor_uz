import asyncio
import base64
import os
import uuid

import httpx
import pytest
from app.notify import send_telegram
from app.security import issue_access_token
from app.totp import code_matches, current_code, new_secret
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

PNG = base64.b64encode(
    base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
).decode()


def _url() -> str:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        pytest.skip("DATABASE_URL yo'q")
    return url


def test_totp_code_matches_current_window() -> None:
    secret = new_secret()
    assert code_matches(secret, current_code(secret))


def test_telegram_without_token_does_not_send(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("BOT_TOKEN", raising=False)
    assert asyncio.run(send_telegram(1, "kod")) is False


def test_question_bank_has_40_per_trade() -> None:
    asyncio.run(_bank())


async def _bank() -> None:
    engine = create_async_engine(_url())
    async with engine.connect() as conn:
        rows = await conn.execute(
            text(
                """
                SELECT t.code, count(q.id)
                FROM trades t
                LEFT JOIN question_bank q ON q.trade_id = t.id
                GROUP BY t.code
                """
            )
        )
        counts = {code: int(count) for code, count in rows}
    await engine.dispose()
    assert counts
    assert min(counts.values()) >= 40


def test_exam_returns_30_questions_and_deadline() -> None:
    asyncio.run(_exam())


async def _exam() -> None:
    engine = create_async_engine(_url())
    async with engine.connect() as conn:
        row = await conn.execute(
            text(
                """
                SELECT u.id
                FROM users u
                JOIN enrollments e ON e.student_user_id = u.id AND e.status = 'ACTIVE'
                LEFT JOIN final_exams f ON f.enrollment_id = e.id
                WHERE f.id IS NULL
                LIMIT 1
                """
            )
        )
        user_id = row.scalar()
    await engine.dispose()
    if user_id is None:
        pytest.skip("ochiq imtihon uchun tinglovchi qolmadi")
    token = issue_access_token(user_id, ["student"])
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=20) as client:
        response = await client.get(
            "/api/v1/learning/exam",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["state"] == "open"
    assert len(body["questions"]) == 30
    assert body["minutes"] == 20
    assert body["deadline"]


def test_practical_grade_saves_score_comment_and_evidence() -> None:
    asyncio.run(_grade())


async def _grade() -> None:
    engine = create_async_engine(_url())
    async with engine.connect() as conn:
        row = await conn.execute(
            text(
                """
                SELECT g.mentor_user_id, e.id AS enrollment_id, m.id AS module_id
                FROM groups g
                JOIN enrollments e ON e.group_id = g.id AND e.status = 'ACTIVE'
                JOIN modules m ON m.course_id = g.course_id
                LIMIT 1
                """
            )
        )
        found = row.mappings().one()
    await engine.dispose()
    token = issue_access_token(found["mentor_user_id"], ["mentor"])
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=20) as client:
        evidence = await client.post(
            "/api/v1/learning/evidence",
            headers=headers,
            json={"content_type": "image/png", "data_base64": PNG},
        )
        assert evidence.status_code == 200
        saved = await client.post(
            "/api/v1/learning/assessments",
            headers=headers,
            json={
                "enrollment_id": str(found["enrollment_id"]),
                "module_id": str(found["module_id"]),
                "score": 75,
                "passed": True,
                "comment": "rubrika",
                "evidence_file_id": evidence.json()["id"],
            },
        )
    assert saved.status_code == 200
    assert saved.json()["saved"] is True


def test_employer_flow_hides_phone() -> None:
    asyncio.run(_employer())


async def _employer() -> None:
    engine = create_async_engine(_url())
    user_id = uuid.uuid4()
    phone = "+998901777001"
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM otp_codes WHERE phone = :phone"), {"phone": phone})
        await conn.execute(
            text(
                """
                INSERT INTO users (id, phone, full_name, locale)
                VALUES (:id, :phone, 'Test ish beruvchi', 'uz-Latn')
                """
            ),
            {"id": user_id, "phone": phone},
        )
    token = issue_access_token(user_id, ["student"])
    headers = {"Authorization": f"Bearer {token}"}
    employer_id = None
    try:
        async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=20) as client:
            registered = await client.post(
                "/api/v1/employers",
                headers=headers,
                json={"name": "Test STIR", "inn": "309990001"},
            )
            assert registered.status_code == 200
            employer_id = registered.json()["id"]
            blocked = await client.post(
                "/api/v1/employers/requests",
                headers=headers,
                json={"trade_code": "plumber", "quantity": 1, "track": "DOMESTIC"},
            )
            assert blocked.status_code == 403
            admin = await conn_admin()
            verified = await client.post(
                f"/api/v1/admin/employers/{employer_id}/verify",
                headers={"Authorization": f"Bearer {admin}"},
            )
            assert verified.status_code == 200
            opened = await client.post(
                "/api/v1/employers/requests",
                headers=headers,
                json={"trade_code": "plumber", "quantity": 1, "track": "DOMESTIC"},
            )
            assert opened.status_code == 200
            found = await client.get(
                "/api/v1/employers/workers",
                headers=headers,
                params={"trade": "plumber"},
            )
            assert found.status_code == 200
            assert "+998" not in found.text
            worker_id = found.json()[0]["user_id"]
            shortlist = await client.post(
                f"/api/v1/employers/requests/{opened.json()['id']}/candidates",
                headers=headers,
                json={"worker_user_id": worker_id},
            )
            assert shortlist.status_code == 200
            mine = await client.get("/api/v1/employers/me", headers=headers)
            assert mine.status_code == 200
            assert mine.json()["requests"][0]["status"]
            assert "+998" not in mine.text
            placement_id = uuid.uuid4()
            async with engine.begin() as conn:
                await conn.execute(
                    text(
                        """
                        INSERT INTO placements (id, worker_user_id, employer_id, kind, start_date)
                        VALUES (:id, :worker_id, :employer_id, 'DIRECT', CURRENT_DATE)
                        """
                    ),
                    {"id": placement_id, "worker_id": worker_id, "employer_id": employer_id},
                )
            rated = await client.post(
                f"/api/v1/employers/placements/{placement_id}/review",
                headers=headers,
                json={"quality": 5, "discipline": 4, "safety": 5, "communication": 4, "comment": "yaxshi"},
            )
            assert rated.status_code == 200
    finally:
        async with engine.begin() as conn:
            if employer_id is not None:
                await conn.execute(
                    text("DELETE FROM reviews WHERE placement_id IN (SELECT id FROM placements WHERE employer_id = :id)"),
                    {"id": employer_id},
                )
                await conn.execute(text("DELETE FROM placements WHERE employer_id = :id"), {"id": employer_id})
                await conn.execute(
                    text(
                        """
                        DELETE FROM request_candidates
                        WHERE request_id IN (SELECT id FROM demand_requests WHERE employer_id = :id)
                        """
                    ),
                    {"id": employer_id},
                )
                await conn.execute(text("DELETE FROM demand_requests WHERE employer_id = :id"), {"id": employer_id})
            await conn.execute(text("DELETE FROM employer_members WHERE user_id = :id"), {"id": user_id})
            if employer_id is not None:
                await conn.execute(text("DELETE FROM employers WHERE id = :id"), {"id": employer_id})
            await conn.execute(text("DELETE FROM user_roles WHERE user_id = :id"), {"id": user_id})
            await conn.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
        await engine.dispose()


async def conn_admin() -> str:
    engine = create_async_engine(_url())
    async with engine.connect() as conn:
        row = await conn.execute(text("SELECT id FROM users WHERE phone = '+998901000001'"))
        admin_id = row.scalar_one()
    await engine.dispose()
    return issue_access_token(admin_id, ["admin"])


def test_producer_product_crud() -> None:
    asyncio.run(_producer())


async def _producer() -> None:
    engine = create_async_engine(_url())
    user_id = uuid.uuid4()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                INSERT INTO users (id, phone, full_name, locale)
                VALUES (:id, '+998901777002', 'Test ishlab chiqaruvchi', 'uz-Latn')
                """
            ),
            {"id": user_id},
        )
    token = issue_access_token(user_id, ["student"])
    headers = {"Authorization": f"Bearer {token}"}
    producer_id = None
    try:
        async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=20) as client:
            registered = await client.post(
                "/api/v1/producers",
                headers=headers,
                json={"name": "Test zavod", "inn": "409990001"},
            )
            assert registered.status_code == 200
            producer_id = registered.json()["id"]
            created = await client.post(
                "/api/v1/producers/products",
                headers=headers,
                json={"name": "Test g'isht", "unit": "dona", "price": 1000, "in_stock": True},
            )
            assert created.status_code == 200
            product_id = created.json()["id"]
            updated = await client.patch(
                f"/api/v1/producers/products/{product_id}",
                headers=headers,
                json={"name": "Test g'isht 2", "unit": "dona", "price": 1200, "in_stock": True},
            )
            assert updated.status_code == 200
            listed = await client.get("/api/v1/producers/products", headers=headers)
            assert listed.status_code == 200
            assert any(item["id"] == product_id for item in listed.json())
            orders = await client.get("/api/v1/producers/orders", headers=headers)
            assert orders.status_code == 200
            removed = await client.delete(f"/api/v1/producers/products/{product_id}", headers=headers)
            assert removed.status_code == 200
    finally:
        async with engine.begin() as conn:
            await conn.execute(text("DELETE FROM products WHERE producer_id = :id"), {"id": producer_id})
            await conn.execute(text("DELETE FROM producer_members WHERE user_id = :id"), {"id": user_id})
            await conn.execute(text("DELETE FROM producers WHERE id = :id"), {"id": producer_id})
            await conn.execute(text("DELETE FROM user_roles WHERE user_id = :id"), {"id": user_id})
            await conn.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
        await engine.dispose()


def test_admin_otp_requires_totp() -> None:
    asyncio.run(_totp_gate())


async def _totp_gate() -> None:
    phone = "+998901000001"
    engine = create_async_engine(_url())
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM otp_codes WHERE phone = :phone"), {"phone": phone})
    await engine.dispose()
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=20) as client:
        requested = await client.post("/api/v1/auth/otp/request", json={"phone": phone})
        assert requested.status_code == 200
        code = requested.json().get("dev_code")
        assert code
        verified = await client.post("/api/v1/auth/otp/verify", json={"phone": phone, "code": code})
    assert verified.status_code == 200
    body = verified.json()
    assert body["requires_2fa"] is True
    assert "ub_access" not in verified.headers.get("set-cookie", "")
