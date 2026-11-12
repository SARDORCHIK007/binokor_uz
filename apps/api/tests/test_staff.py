"""Institution staff: invitations, mahalla assistant, employment office, migration agency, foreign employers."""

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


def test_staff_panels_and_invitations() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_flow())


async def _flow() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    admin = await _login("admin")
    mahalla = await _login("mahalla")
    bandlik = await _login("bandlik")
    agency = await _login("agency")
    republic = await _login("republic")
    foreign = await _login("foreign")
    hokimlik = await _login("hokimlik")
    student = await _login("student")
    suffix = str(uuid.uuid4().int)[:6]
    resident_phone = f"+99890{suffix}1"[:13]
    invited_phone = f"+99891{suffix}2"[:13]
    created_vacancy = None
    try:
        # wrong roles are refused
        assert (await student.get("/api/v1/mahalla/overview")).status_code == 403
        assert (await student.get("/api/v1/migration/overview")).status_code == 403
        assert (await mahalla.get("/api/v1/migration/overview")).status_code == 403
        assert (await foreign.get("/api/v1/employment/overview")).status_code == 403
        assert (await student.post("/api/v1/admin/invitations", json={})).status_code in {403, 422}

        # mahalla assistant: sees own mahallas, registers a resident, cannot register twice
        overview = (await mahalla.get("/api/v1/mahalla/overview")).json()
        assert overview["mahallas"] and overview["trades"]
        mahalla_id = overview["mahallas"][0]["id"]
        payload = {
            "mahalla_id": mahalla_id,
            "first_name": "Test",
            "last_name": "Mahalla",
            "birth_date": "2004-05-01",
            "phone": resident_phone,
            "trade_code": overview["trades"][0]["code"],
            "consent_confirmed": True,
        }
        assert (await mahalla.post("/api/v1/mahalla/candidates", json={**payload, "consent_confirmed": False})).status_code == 422
        assert (await mahalla.post("/api/v1/mahalla/candidates", json={**payload, "phone": "123"})).status_code == 422
        added = await mahalla.post("/api/v1/mahalla/candidates", json=payload)
        assert added.status_code == 200 and added.json()["status"] == "SUBMITTED"
        assert (await mahalla.post("/api/v1/mahalla/candidates", json=payload)).status_code == 409
        after = (await mahalla.get("/api/v1/mahalla/overview")).json()
        assert after["kpi"]["applications"] >= 1
        assert any(item["source"] == "MAHALLA" for item in after["candidates"])
        assert "phone" not in str(after).lower()

        # a foreign employer posts a vacancy; the agency sees it and moves it along; the observer only reads
        me = (await foreign.get("/api/v1/vacancies/me")).json()
        assert me["employer"]["verified"] and me["trades"] and "KR" in me["countries"]
        vacancy = await foreign.post(
            "/api/v1/vacancies",
            json={"title": "Test vakansiya", "trade_code": me["trades"][0]["code"], "quantity": 3, "country_code": "KR", "city": "Busan", "address": "Haeundae-gu 1", "salary_from": 1500, "salary_to": 2000, "currency": "USD", "requirements": {"min_level": "MASTER", "min_experience_years": 2}, "benefits": {"housing": True}},
        )
        assert vacancy.status_code == 200
        created_vacancy = vacancy.json()["id"]
        bad = await foreign.post("/api/v1/vacancies", json={"title": "Davlat xato", "trade_code": me["trades"][0]["code"], "quantity": 1, "country_code": "SA", "city": "X", "address": "Y"})
        assert bad.status_code == 404
        no_address = await foreign.post("/api/v1/vacancies", json={"title": "Manzilsiz", "trade_code": me["trades"][0]["code"], "quantity": 1, "country_code": "KR"})
        assert no_address.status_code == 422
        bad_req = await foreign.post("/api/v1/vacancies", json={"title": "Talab xato", "trade_code": me["trades"][0]["code"], "quantity": 1, "country_code": "KR", "city": "X", "address": "Y", "requirements": {"min_level": "GOD"}})
        assert bad_req.status_code == 422
        view = (await agency.get("/api/v1/migration/overview")).json()
        assert view["can_manage"] is True
        assert any(item["id"] == created_vacancy for item in view["vacancies"])
        assert any(item["country"] == "KR" for item in view["by_country"])
        moved = await agency.post(f"/api/v1/migration/vacancies/{created_vacancy}/status", json={"status": "IN_REVIEW"})
        assert moved.status_code == 200
        assert (await agency.post(f"/api/v1/migration/vacancies/{created_vacancy}/status", json={"status": "NOPE"})).status_code == 422
        observer = (await republic.get("/api/v1/migration/overview")).json()
        assert observer["can_manage"] is False and observer["workers"] == []
        assert (await republic.post(f"/api/v1/migration/vacancies/{created_vacancy}/status", json={"status": "CLOSED"})).status_code == 403
        assert (await republic.get("/api/v1/migration/export.csv")).status_code == 200

        # agency refers a free worker to the foreign vacancy; employment office cannot touch foreign requests
        workers = view["workers"]
        if workers:
            referred = await agency.post("/api/v1/panels/refer", json={"request_id": created_vacancy, "worker_user_id": workers[0]["user_id"]})
            assert referred.status_code == 200
            assert (await bandlik.post("/api/v1/panels/refer", json={"request_id": created_vacancy, "worker_user_id": workers[0]["user_id"]})).status_code == 403
        assert (await foreign.post(f"/api/v1/vacancies/{created_vacancy}/close")).status_code == 200

        # employment office dashboard
        jobs = (await bandlik.get("/api/v1/employment/overview")).json()
        assert "free_workers" in jobs["kpi"] and isinstance(jobs["requests"], list)

        # hokimlik (district official) reads reports but cannot manage users
        assert (await hokimlik.get("/api/v1/reports/summary")).status_code == 200
        assert (await hokimlik.get("/api/v1/admin/users")).status_code == 403

        # invitations: admin invites, the person logs in with the code and receives the role
        invite = await admin.post(
            "/api/v1/admin/invitations",
            json={"phone": invited_phone, "full_name": "Taklif Qilingan Ustoz", "role": "mentor"},
        )
        assert invite.status_code == 200
        assert (await admin.post("/api/v1/admin/invitations", json={"phone": invited_phone, "full_name": "Taklif Qilingan Ustoz", "role": "mentor"})).status_code == 422
        assert (await admin.post("/api/v1/admin/invitations", json={"phone": invited_phone, "full_name": "Xato Rol", "role": "superadmin"})).status_code == 422
        assert (await admin.post("/api/v1/admin/invitations", json={"phone": "+998900000009", "full_name": "Mahallasiz Yordamchi", "role": "mahalla_assistant"})).status_code == 422
        bulk = await admin.post(
            "/api/v1/admin/invitations/bulk",
            json={"role": "mentor", "lines": f"{invited_phone}, Takror\n+998911110000, Yangi Ustoz Biri\nxato qator"},
        )
        assert bulk.status_code == 200 and bulk.json()["created"] == 1 and len(bulk.json()["failed"]) == 2
        async with httpx.AsyncClient(base_url=BASE, timeout=30) as person:
            code = (await person.post("/api/v1/auth/otp/request", json={"phone": invited_phone})).json().get("dev_code")
            if code:
                verified = await person.post("/api/v1/auth/otp/verify", json={"phone": invited_phone, "code": code})
                assert verified.status_code == 200
                user = verified.json()["user"]
                assert "mentor" in user["roles"] and "student" not in user["roles"]
                assert user["full_name"] == "Taklif Qilingan Ustoz"
        listing = (await admin.get("/api/v1/admin/invitations")).json()
        assert any(item["phone"] == invited_phone and item["status"] in {"ACCEPTED", "PENDING"} for item in listing)

        # partner staff edit their own organisation's profile, nobody else's
        namdtu = await _login("namdtu")
        mine = (await namdtu.get("/api/v1/partner/profiles")).json()
        assert [item["slug"] for item in mine] == ["namdtu"]
        original = mine[0]
        edit = {"role": {"uz-Latn": "Sinov qisqa tavsif", "ru": "Тестовое описание"}, "about": {"uz-Latn": "Sinov batafsil matn"}, "website": "https://example.org", "email": "info@example.org", "phone": "+998901112233", "address": "Namangan"}
        assert (await namdtu.put("/api/v1/partner/namdtu/profile", json=edit)).status_code == 200
        assert (await namdtu.put("/api/v1/partner/uychi-hokimlik/profile", json=edit)).status_code == 403
        assert (await namdtu.put("/api/v1/partner/namdtu/profile", json={**edit, "website": "javascript:alert(1)"})).status_code == 422
        assert (await namdtu.put("/api/v1/partner/namdtu/profile", json={**edit, "role": {"de": "x"}})).status_code == 422
        assert (await namdtu.put("/api/v1/partner/namdtu/profile", json={**edit, "role": {"ru": "faqat rus"}})).status_code == 422
        assert (await student.put("/api/v1/partner/namdtu/profile", json=edit)).status_code == 403
        assert (await student.get("/api/v1/partner/profiles")).status_code == 403
        async with httpx.AsyncClient(base_url=BASE, timeout=30) as anonymous:
            page = (await anonymous.get("/api/v1/public/partners/namdtu")).json()
            assert page["about"] == "Sinov batafsil matn" and page["contacts"]["website"] == "https://example.org"
        restore = {"role": {k: v for k, v in original["role"].items() if v}, "about": {k: v for k, v in original["about"].items() if v}, "website": original["website"], "email": original["email"], "phone": original["phone"], "address": original["address"]}
        assert (await namdtu.put("/api/v1/partner/namdtu/profile", json=restore)).status_code == 200
        await namdtu.aclose()

        # public partnership request and its review
        async with httpx.AsyncClient(base_url=BASE, timeout=30) as anonymous:
            sent = await anonymous.post(
                "/api/v1/public/partner-requests",
                json={"org_name": f"Test Org {suffix}", "kind": "INTL", "country_code": "DE", "contact_name": "Test Person", "phone": "+4915112345678"},
            )
            assert sent.status_code == 200
            assert (await anonymous.post("/api/v1/public/partner-requests", json={"org_name": "x"})).status_code == 422
        queue = (await admin.get("/api/v1/admin/partner-requests")).json()
        mine = next(item for item in queue if item["org_name"] == f"Test Org {suffix}")
        assert (await admin.post(f"/api/v1/admin/partner-requests/{mine['id']}/decision", json={"status": "REJECTED", "note": "test"})).status_code == 200
        assert (await admin.post(f"/api/v1/admin/partner-requests/{mine['id']}/decision", json={"status": "APPROVED"})).status_code == 409
    finally:
        async with engine.begin() as conn:
            await conn.execute(text("DELETE FROM partner_requests WHERE org_name = :n"), {"n": f"Test Org {suffix}"})
            await conn.execute(text("DELETE FROM invitations WHERE phone IN (:a, '+998911110000')"), {"a": invited_phone})
            if created_vacancy:
                await conn.execute(text("DELETE FROM request_candidates WHERE request_id = :id"), {"id": created_vacancy})
                await conn.execute(text("DELETE FROM demand_requests WHERE id = :id"), {"id": created_vacancy})
            await conn.execute(
                text(
                    "DELETE FROM application_events WHERE application_id IN (SELECT a.id FROM applications a JOIN persons p ON p.id = a.person_id "
                    "JOIN users u ON u.id = p.user_id WHERE u.phone IN (:r, :i))"
                ),
                {"r": resident_phone, "i": invited_phone},
            )
            await conn.execute(
                text("DELETE FROM applications WHERE person_id IN (SELECT p.id FROM persons p JOIN users u ON u.id = p.user_id WHERE u.phone = :r)"),
                {"r": resident_phone},
            )
            await conn.execute(text("DELETE FROM persons WHERE user_id IN (SELECT id FROM users WHERE phone = :r)"), {"r": resident_phone})
            await conn.execute(text("DELETE FROM consents WHERE user_id IN (SELECT id FROM users WHERE phone IN (:r, :i))"), {"r": resident_phone, "i": invited_phone})
            await conn.execute(text("DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE phone IN (:r, :i))"), {"r": resident_phone, "i": invited_phone})
            await conn.execute(text("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE phone IN (:r, :i))"), {"r": resident_phone, "i": invited_phone})
            await conn.execute(text("DELETE FROM otp_codes WHERE phone IN (:r, :i)"), {"r": resident_phone, "i": invited_phone})
            await conn.execute(text("DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE phone IN (:r, :i))"), {"r": resident_phone, "i": invited_phone})
            await conn.execute(text("DELETE FROM users WHERE phone IN (:r, :i)"), {"r": resident_phone, "i": invited_phone})
        for client in (admin, mahalla, bandlik, agency, republic, foreign, hokimlik, student):
            await client.aclose()
        await engine.dispose()


def test_foreign_firm_documents_and_verification() -> None:
    """A foreign employer saves legal data and uploads a document; only the agency may verify the firm."""
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_firm_flow())


async def _firm_flow() -> None:
    foreign = await _login("foreign")
    agency = await _login("agency")
    student = await _login("student")
    doc_id = None
    try:
        legal = {"legal_name": "Seoul Build Co., Ltd.", "registration_no": "110-81-12345", "address": "Seoul, Gangnam-gu", "website": "https://example.kr", "contact_person": "Kim Min-jun", "contact_email": "hr@example.kr", "contact_phone": "+82 2 1234 5678", "description": "Qurilish kompaniyasi"}
        assert (await foreign.put("/api/v1/vacancies/legal", json={**legal, "website": "ftp://x"})).status_code == 422
        assert (await foreign.put("/api/v1/vacancies/legal", json=legal)).status_code == 200
        assert (await student.put("/api/v1/vacancies/legal", json=legal)).status_code == 403
        pdf = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"
        assert (await foreign.post("/api/v1/vacancies/documents?kind=REGISTRATION&filename=reg", content=b"not a document")).status_code == 422
        assert (await foreign.post("/api/v1/vacancies/documents?kind=BAD&filename=reg", content=pdf)).status_code == 422
        up = await foreign.post("/api/v1/vacancies/documents?kind=REGISTRATION&filename=reg", content=pdf)
        assert up.status_code == 200 and up.json()["filename"].endswith(".pdf")
        doc_id = up.json()["id"]
        mine = (await foreign.get("/api/v1/vacancies/me")).json()
        assert mine["employer"]["legal"]["legal_name"] == "Seoul Build Co., Ltd." and any(d["id"] == doc_id for d in mine["documents"])
        assert (await foreign.get(f"/api/v1/vacancies/documents/{doc_id}/file")).content == pdf
        assert (await student.get(f"/api/v1/vacancies/documents/{doc_id}/file")).status_code == 403
        firms = (await agency.get("/api/v1/vacancies/firms")).json()
        firm = next(item for item in firms if item["name"] == "Seoul Build Co.")
        assert firm["legal"]["registration_no"] == "110-81-12345" and firm["documents"]
        assert (await agency.get(f"/api/v1/vacancies/documents/{doc_id}/file")).status_code == 200
        assert (await agency.post(f"/api/v1/vacancies/documents/{doc_id}/check")).status_code == 200
        assert (await foreign.post(f"/api/v1/vacancies/firms/{firm['id']}/verify", json={"verified": False})).status_code == 403
        assert (await agency.post(f"/api/v1/vacancies/firms/{firm['id']}/verify", json={"verified": True})).status_code == 200
        assert (await foreign.delete(f"/api/v1/vacancies/documents/{doc_id}")).status_code == 200
        doc_id = None
        # without a registration document the firm cannot be (re)verified
        assert (await agency.post(f"/api/v1/vacancies/firms/{firm['id']}/verify", json={"verified": True})).status_code == 409
        # restore the demo company so the other tests keep a verified employer
        engine = create_async_engine(os.environ["DATABASE_URL"])
        async with engine.begin() as conn:
            await conn.execute(text("UPDATE employers SET verified_at = now() WHERE id = CAST(:id AS uuid)"), {"id": firm["id"]})
        await engine.dispose()
    finally:
        if doc_id:
            await foreign.delete(f"/api/v1/vacancies/documents/{doc_id}")
        for client in (foreign, agency, student):
            await client.aclose()
