"""Stipend ledger of the employment office, and the shared person card with notes and tasks."""

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


def test_payment_ledger_and_person_card() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_flow())


async def _flow() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    bandlik = await _login("bandlik")
    admin = await _login("admin")
    student = await _login("student")
    mentor = await _login("mentor")
    program_name = f"Test dasturi {uuid.uuid4().hex[:6]}"
    program_id = ""
    try:
        # only the employment office and admins see money; everybody else is refused
        for outsider in (student, mentor):
            assert (await outsider.get("/api/v1/payments/overview")).status_code == 403
            assert (await outsider.post("/api/v1/payments/programs", json={"name": program_name, "monthly_amount": 1000})).status_code == 403

        # program and batch
        assert (await bandlik.post("/api/v1/payments/programs", json={"name": "x", "monthly_amount": 1000})).status_code == 422
        assert (await bandlik.post("/api/v1/payments/programs", json={"name": program_name, "monthly_amount": 500000, "min_attendance": 80})).status_code == 200
        overview = (await bandlik.get("/api/v1/payments/overview")).json()
        program_id = next(p["id"] for p in overview["programs"] if p["name"] == program_name)
        assert (await bandlik.post("/api/v1/payments/batches", json={"program_id": program_id, "period": "2026-13"})).status_code == 422
        made = await bandlik.post("/api/v1/payments/batches", json={"program_id": program_id, "period": "2026-11"})
        assert made.status_code == 200, made.text
        batch_id = made.json()["id"]
        assert (await bandlik.post("/api/v1/payments/batches", json={"program_id": program_id, "period": "2026-11"})).status_code == 409

        # make sure the batch has one payable line, whatever the demo attendance looks like
        async with engine.begin() as conn:
            person = (await conn.execute(text("SELECT id FROM persons WHERE user_id IS NOT NULL LIMIT 1"))).scalar_one()
            await conn.execute(text("DELETE FROM payments WHERE batch_id = :b"), {"b": batch_id})
            await conn.execute(
                text("INSERT INTO payments (id, batch_id, person_id, amount, lessons, present, attendance_pct, status) VALUES (gen_random_uuid(), :b, :p, 500000, 20, 18, 90, 'ELIGIBLE')"),
                {"b": batch_id, "p": person},
            )

        detail = (await bandlik.get(f"/api/v1/payments/batches/{batch_id}")).json()
        assert "phone" not in str(detail).lower()

        # four eyes: whoever prepared the batch cannot approve it
        assert (await bandlik.post(f"/api/v1/payments/batches/{batch_id}/approve")).status_code == 409
        assert (await bandlik.post(f"/api/v1/payments/batches/{batch_id}/paid")).status_code == 409  # not approved yet
        assert (await admin.post(f"/api/v1/payments/batches/{batch_id}/approve")).status_code == 200
        exported = await admin.get(f"/api/v1/payments/batches/{batch_id}/export.csv")
        assert exported.status_code == 200
        header = exported.text.lstrip("﻿").splitlines()[0].lower()
        assert "name" in header and "amount" in header
        assert not any(word in header for word in ("phone", "card", "iban", "account", "pinfl"))
        assert (await bandlik.post(f"/api/v1/payments/batches/{batch_id}/paid")).status_code == 200
        assert (await bandlik.post(f"/api/v1/payments/batches/{batch_id}/cancel")).status_code == 409  # already paid

        # person card: sections by role, notes and tasks between teams
        assert (await student.get(f"/api/v1/people/{person}")).status_code == 403
        card = await bandlik.get(f"/api/v1/people/{person}")
        assert card.status_code == 200
        body = card.json()
        assert "phone" not in str(body).lower()
        assert (await mentor.get(f"/api/v1/people/{person}")).status_code in {200, 403}
        note = await bandlik.post(f"/api/v1/people/{person}/notes", json={"body": "Hujjatlari tekshirildi", "shared": True})
        assert note.status_code == 200
        assert (await bandlik.post(f"/api/v1/people/{person}/notes", json={"body": "x"})).status_code == 422
        assert any(n["text"] == "Hujjatlari tekshirildi" for n in (await bandlik.get(f"/api/v1/people/{person}")).json()["notes"])
        agency = await _login("agency")
        assert (await agency.post(f"/api/v1/people/{person}/tasks", json={"team": "employment", "title": "Test vazifa"})).status_code == 200
        mine = (await bandlik.get("/api/v1/people/tasks/mine")).json()
        task = next(t for t in mine if t["title"] == "Test vazifa")
        assert task["person_id"] == str(person)
        assert (await student.get("/api/v1/people/tasks/mine")).status_code == 403
        assert (await bandlik.post(f"/api/v1/people/tasks/{task['id']}/done")).status_code == 200
        assert (await bandlik.post(f"/api/v1/people/tasks/{task['id']}/done")).status_code == 404
        await agency.aclose()
    finally:
        async with engine.begin() as conn:
            if program_id:
                await conn.execute(text("DELETE FROM payment_batches WHERE program_id = :p"), {"p": program_id})
                await conn.execute(text("DELETE FROM payment_programs WHERE id = :p"), {"p": program_id})
            await conn.execute(text("DELETE FROM case_tasks WHERE title = 'Test vazifa'"))
            await conn.execute(text("DELETE FROM case_notes WHERE body = 'Hujjatlari tekshirildi'"))
        for client in (bandlik, admin, student, mentor):
            await client.aclose()
        await engine.dispose()
