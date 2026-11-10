import asyncio
import json
import os
import uuid
from collections.abc import Mapping
from typing import Any

import httpx
import pytest
from app.rules import (
    brigade_ready,
    cert_blockers,
    course_duration_ok,
    curator_below_minimum,
    foreign_can_advance,
    language_module_allowed,
    leitner_days,
    matrix_class,
    public_stats,
    redact,
    request_status,
    sanitize_for_model,
    show_logo,
)
from app.security import issue_access_token
from app.signing import sign_payload, signature_matches
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncConnection, create_async_engine


def test_matrix_classification() -> None:
    assert matrix_class(0, False) == "C"
    assert matrix_class(0.1, False) == "A"
    assert matrix_class(0, True) == "B"
    assert matrix_class(2, True) == "D"
    assert matrix_class(1, False) == "A"


def test_domestic_no_language() -> None:
    assert language_module_allowed("DOMESTIC", "LANGUAGE") is False
    assert language_module_allowed("DOMESTIC", "THEORY") is True
    assert language_module_allowed("FOREIGN", "LANGUAGE") is True


def test_course_duration_bounds() -> None:
    assert course_duration_ok("DOMESTIC", 79) is False
    assert course_duration_ok("DOMESTIC", 80) is True
    assert course_duration_ok("DOMESTIC", 190) is True
    assert course_duration_ok("DOMESTIC", 191) is False
    assert course_duration_ok("FOREIGN", 169) is False
    assert course_duration_ok("FOREIGN", 170) is True
    assert course_duration_ok("FOREIGN", 380) is True
    assert course_duration_ok("FOREIGN", 381) is False


def test_cert_eligibility() -> None:
    ok = dict(attendance=0.8, modules_passed=True, theory=60, practice=70, site_hours=100, site_norm=100)
    assert cert_blockers(**ok) == []
    assert "attendance" in cert_blockers(**{**ok, "attendance": 0.79})
    assert "modules" in cert_blockers(**{**ok, "modules_passed": False})
    assert "theory" in cert_blockers(**{**ok, "theory": 59})
    assert "practice" in cert_blockers(**{**ok, "practice": None})
    assert "site_hours" in cert_blockers(**{**ok, "site_hours": 99})


def test_logo_rule() -> None:
    assert show_logo("SIGNED", True) is True
    assert show_logo("SIGNED", False) is False
    assert show_logo("NEGOTIATING", True) is False
    assert show_logo("PLANNED", False) is False


def test_foreign_request_via_agency() -> None:
    assert request_status("FOREIGN", None) == "NEW"
    assert request_status("FOREIGN", uuid.uuid4()) == "VIA_AGENCY"
    assert request_status("DOMESTIC", None) == "NEW"
    assert foreign_can_advance("FOREIGN", "IN_REVIEW", None) is False
    assert foreign_can_advance("FOREIGN", "VIA_AGENCY", uuid.uuid4()) is True


def test_brigade_readiness() -> None:
    member = {"certified": True, "vocab_ratio": 0.8, "medical": True}
    assert brigade_ready([member] * 8) is True
    assert brigade_ready([member] * 7) is False
    weak = {"certified": True, "vocab_ratio": 0.79, "medical": True}
    assert brigade_ready([weak] * 8) is False
    assert brigade_ready([{**member, "medical": False}] * 8) is False


def test_leitner_intervals() -> None:
    assert [leitner_days(box) for box in range(1, 6)] == [1, 2, 4, 8, 16]


def test_curator_group_8_10() -> None:
    assert curator_below_minimum(7) is True
    assert curator_below_minimum(8) is False


def test_public_stats_from_db() -> None:
    assert public_stats({"listeners": 0, "certified": 0, "employed": 0, "sites": 0}) == {}
    assert public_stats({"listeners": 3, "certified": 0}) == {"listeners": 3}


def test_no_pd_in_logs() -> None:
    cleaned = redact("phone +998901112233 pinfl 12345678901234")
    assert "+998901112233" not in cleaned
    assert "12345678901234" not in cleaned


def test_ai_no_pd_egress() -> None:
    outgoing = sanitize_for_model(
        {"name": "Ali", "phone": "+998901112233", "pinfl": "12345678901234", "note": "trade only"}
    )
    blob = json.dumps(outgoing)
    assert "Ali" not in blob
    assert "+998" not in blob
    assert "12345678901234" not in blob
    assert outgoing["note"] == "trade only"


def test_cert_signature_tamper() -> None:
    payload = {"number": "UB-2026-000001", "holder": "Test"}
    _, signature = sign_payload(payload)
    assert signature_matches(payload, signature) is True
    changed = {**payload, "holder": "Boshqa"}
    assert signature_matches(changed, signature) is False


def _database_url() -> str:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        pytest.skip("DATABASE_URL yo'q")
    return url


def test_group_capacity_10() -> None:
    asyncio.run(_group_capacity())


async def _fill_group(conn: AsyncConnection, found: Mapping[str, Any]) -> None:
    """Fill the group to its limit inside the open transaction (rolled back by the test)."""
    for filler in range(max(0, int(found["max_students"]) - int(found["active"]))):
        filler_id = uuid.uuid4()
        await conn.execute(
            text("INSERT INTO users (id, phone, full_name, locale) VALUES (:id, :phone, 'Guruh fill', 'uz-Latn')"),
            {"id": filler_id, "phone": f"+99890199600{filler}"},
        )
        await conn.execute(
            text("INSERT INTO enrollments (id, group_id, student_user_id, status) VALUES (:id, :g, :u, 'ACTIVE')"),
            {"id": uuid.uuid4(), "g": found["id"], "u": filler_id},
        )


async def _group_capacity() -> None:
    engine = create_async_engine(_database_url())
    try:
        async with engine.connect() as conn:
            transaction = await conn.begin()
            group = await conn.execute(
                text(
                    """
                    SELECT g.id, g.mentor_user_id, g.max_students,
                           (SELECT count(*) FROM enrollments e WHERE e.group_id = g.id AND e.status = 'ACTIVE') AS active
                    FROM groups g ORDER BY 4 DESC LIMIT 1
                    """
                )
            )
            found = group.mappings().first()
            assert found is not None
            await _fill_group(conn, found)
            mentor_id = found["mentor_user_id"]
            user_id = uuid.uuid4()
            await conn.execute(
                text(
                    """
                    INSERT INTO users (id, phone, full_name, locale)
                    VALUES (:id, '+998901999001', 'Test Tinglovchi', 'uz-Latn')
                    """
                ),
                {"id": user_id},
            )
            with pytest.raises(DBAPIError, match="GROUP_FULL"):
                await conn.execute(
                    text(
                        """
                        INSERT INTO enrollments (id, group_id, student_user_id, status)
                        VALUES (:id, :group_id, :student_id, 'ACTIVE')
                        """
                    ),
                    {"id": uuid.uuid4(), "group_id": found["id"], "student_id": user_id},
                )
            await transaction.rollback()
            transaction = await conn.begin()
            try:
                await _fill_group(conn, found)
                course = await conn.execute(text("SELECT id FROM courses LIMIT 1"))
                course_id = course.scalar()
                extra_group = uuid.uuid4()
                await conn.execute(
                    text(
                        """
                        INSERT INTO groups (id, course_id, code, mentor_user_id, max_students, schedule)
                        VALUES (:id, :course_id, 'TEST-MENTOR-FULL', :mentor, 10, '{}'::jsonb)
                        """
                    ),
                    {"id": extra_group, "course_id": course_id, "mentor": mentor_id},
                )
                user_two = uuid.uuid4()
                await conn.execute(
                    text(
                        """
                        INSERT INTO users (id, phone, full_name, locale)
                        VALUES (:id, '+998901999002', 'Test Ikkinchi', 'uz-Latn')
                        """
                    ),
                    {"id": user_two},
                )
                with pytest.raises(DBAPIError, match="MENTOR_FULL"):
                    await conn.execute(
                        text(
                            """
                            INSERT INTO enrollments (id, group_id, student_user_id, status)
                            VALUES (:id, :group_id, :student_id, 'ACTIVE')
                            """
                        ),
                        {"id": uuid.uuid4(), "group_id": extra_group, "student_id": user_two},
                    )
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()


def test_curator_capacity_blocks_eleventh() -> None:
    asyncio.run(_curator_capacity())


async def _curator_capacity() -> None:
    engine = create_async_engine(_database_url())
    try:
        async with engine.connect() as conn:
            transaction = await conn.begin()
            try:
                group = await conn.execute(text("SELECT id FROM curator_groups LIMIT 1"))
                group_id = group.scalar()
                assert group_id is not None
                have = (
                    await conn.execute(text("SELECT count(*) FROM curator_members WHERE curator_group_id = :g"), {"g": group_id})
                ).scalar_one()
                for filler in range(max(0, 8 - int(have))):  # the group starts with 8 students, whatever the demo data holds
                    filler_id = uuid.uuid4()
                    await conn.execute(
                        text("INSERT INTO users (id, phone, full_name, locale) VALUES (:id, :phone, 'Kurator fill', 'uz-Latn')"),
                        {"id": filler_id, "phone": f"+99890199700{filler}"},
                    )
                    await conn.execute(
                        text("INSERT INTO curator_members (curator_group_id, student_user_id) VALUES (:g, :u)"),
                        {"g": group_id, "u": filler_id},
                    )
                for index in range(3):
                    user_id = uuid.uuid4()
                    await conn.execute(
                        text(
                            """
                            INSERT INTO users (id, phone, full_name, locale)
                            VALUES (:id, :phone, 'Kurator test', 'uz-Latn')
                            """
                        ),
                        {"id": user_id, "phone": f"+99890199800{index}"},
                    )
                    statement = text(
                        """
                        INSERT INTO curator_members (curator_group_id, student_user_id)
                        VALUES (:group_id, :user_id)
                        """
                    )
                    if index < 2:
                        await conn.execute(statement, {"group_id": group_id, "user_id": user_id})
                    else:
                        with pytest.raises(DBAPIError, match="CURATOR_GROUP_FULL"):
                            await conn.execute(statement, {"group_id": group_id, "user_id": user_id})
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()


def test_domestic_language_module_rejected() -> None:
    asyncio.run(_domestic_language())


async def _domestic_language() -> None:
    engine = create_async_engine(_database_url())
    try:
        async with engine.connect() as conn:
            transaction = await conn.begin()
            try:
                course = await conn.execute(text("SELECT id FROM courses WHERE track = 'DOMESTIC' LIMIT 1"))
                course_id = course.scalar()
                assert course_id is not None
                with pytest.raises(DBAPIError, match="DOMESTIC_NO_LANGUAGE"):
                    await conn.execute(
                        text(
                            """
                            INSERT INTO modules (id, course_id, kind, title, ord, hours)
                            VALUES (:id, :course_id, 'LANGUAGE', '{"uz-Latn":"Til"}'::jsonb, 99, 10)
                            """
                        ),
                        {"id": uuid.uuid4(), "course_id": course_id},
                    )
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()


def test_course_duration_check() -> None:
    asyncio.run(_duration_check())


async def _duration_check() -> None:
    engine = create_async_engine(_database_url())
    try:
        async with engine.connect() as conn:
            transaction = await conn.begin()
            try:
                trade = await conn.execute(text("SELECT id FROM trades LIMIT 1"))
                trade_id = trade.scalar()
                with pytest.raises(DBAPIError):
                    await conn.execute(
                        text(
                            """
                            INSERT INTO courses (
                              id, trade_id, track, title, start_date, end_date,
                              hours_theory, hours_workshop, hours_site, hours_language
                            )
                            VALUES (
                              :id, :trade_id, 'DOMESTIC', '{"uz-Latn":"Qisqa"}'::jsonb,
                              DATE '2026-01-01', DATE '2026-01-20', 10, 10, 10, 0
                            )
                            """
                        ),
                        {"id": uuid.uuid4(), "trade_id": trade_id},
                    )
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()


def test_cert_two_distinct_approvers() -> None:
    asyncio.run(_two_approvers())


async def _two_approvers() -> None:
    engine = create_async_engine(_database_url())
    try:
        async with engine.connect() as conn:
            transaction = await conn.begin()
            try:
                row = await conn.execute(
                    text(
                        """
                        SELECT certificate_id, approver_id, role::text AS role
                        FROM certificate_approvals LIMIT 1
                        """
                    )
                )
                found = row.mappings().first()
                assert found is not None
                with pytest.raises(DBAPIError):
                    await conn.execute(
                        text(
                            """
                            INSERT INTO certificate_approvals (certificate_id, approver_id, role, decision)
                            VALUES (:certificate_id, :approver_id, CAST(:role AS role_code), 'APPROVE')
                            """
                        ),
                        {
                            "certificate_id": found["certificate_id"],
                            "approver_id": found["approver_id"],
                            "role": found["role"],
                        },
                    )
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()


def test_foreign_status_check() -> None:
    asyncio.run(_foreign_check())


async def _foreign_check() -> None:
    engine = create_async_engine(_database_url())
    try:
        async with engine.connect() as conn:
            transaction = await conn.begin()
            try:
                employer = await conn.execute(text("SELECT id FROM employers LIMIT 1"))
                trade = await conn.execute(text("SELECT id FROM trades LIMIT 1"))
                with pytest.raises(DBAPIError):
                    await conn.execute(
                        text(
                            """
                            INSERT INTO demand_requests (id, employer_id, trade_id, quantity, track, status)
                            VALUES (:id, :employer_id, :trade_id, 1, 'FOREIGN', 'IN_REVIEW')
                            """
                        ),
                        {
                            "id": uuid.uuid4(),
                            "employer_id": employer.scalar(),
                            "trade_id": trade.scalar(),
                        },
                    )
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()


def test_employer_never_sees_phone() -> None:
    asyncio.run(_phones())


async def _phones() -> None:
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=10) as client:
        workers = await client.get("/api/v1/public/workers")
        home = await client.get("/api/v1/public/home")
    assert workers.status_code == 200
    assert "+998" not in workers.text
    assert "+998" not in home.text


def test_cert_revoked_visible_immediately() -> None:
    asyncio.run(_revoked())


async def _revoked() -> None:
    engine = create_async_engine(_database_url())
    number = "UB-2026-000001"
    try:
        async with engine.begin() as conn:
            before = await conn.execute(
                text("SELECT status::text AS status, revoke_reason FROM certificates WHERE number = :number"),
                {"number": number},
            )
            original = before.mappings().one()
            await conn.execute(
                text(
                    """
                    UPDATE certificates
                    SET status = 'REVOKED', revoke_reason = 'test'
                    WHERE number = :number
                    """
                ),
                {"number": number},
            )
        async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=10) as client:
            response = await client.get(f"/api/v1/public/verify/{number}")
        assert response.status_code == 200
        assert response.json()["result"] == "REVOKED"
    finally:
        async with engine.begin() as conn:
            await conn.execute(
                text(
                    """
                    UPDATE certificates
                    SET status = CAST(:status AS cert_status), revoke_reason = :reason
                    WHERE number = :number
                    """
                ),
                {"number": number, "status": original["status"], "reason": original["revoke_reason"]},
            )
        await engine.dispose()


def test_offline_idempotency() -> None:
    asyncio.run(_idempotent())


async def _idempotent() -> None:
    engine = create_async_engine(_database_url())
    async with engine.connect() as conn:
        row = await conn.execute(
            text(
                """
                SELECT e.id AS enrollment_id, g.mentor_user_id
                FROM enrollments e
                JOIN groups g ON g.id = e.group_id
                WHERE e.status = 'ACTIVE'
                LIMIT 1
                """
            )
        )
        found = row.mappings().one()
    token = issue_access_token(found["mentor_user_id"], ["mentor"])
    payload = {
        "date": "2099-01-01",
        "default_status": "PRESENT",
        "default_site_hours": 1,
        "exceptions": [{"enrollment_id": str(found["enrollment_id"]), "status": "PRESENT", "site_hours": 1}],
    }
    headers = {"Authorization": f"Bearer {token}", "Idempotency-Key": str(uuid.uuid4())}
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=10) as client:
        for _ in range(3):
            response = await client.post(
                f"/api/v1/learning/groups/{await _group_of(engine, found['enrollment_id'])}/attendance",
                json=payload,
                headers=headers,
            )
            assert response.status_code == 200
    async with engine.begin() as conn:
        count = await conn.execute(
            text(
                """
                SELECT count(*) FROM attendance
                WHERE enrollment_id = :id AND date = DATE '2099-01-01'
                """
            ),
            {"id": found["enrollment_id"]},
        )
        assert int(count.scalar_one()) == 1
        await conn.execute(
            text(
                """
                DELETE FROM attendance
                WHERE date = DATE '2099-01-01'
                  AND enrollment_id IN (
                    SELECT id FROM enrollments WHERE group_id = (
                      SELECT group_id FROM enrollments WHERE id = :id
                    )
                  )
                """
            ),
            {"id": found["enrollment_id"]},
        )
    await engine.dispose()


async def _group_of(engine: object, enrollment_id: uuid.UUID) -> str:
    from sqlalchemy.ext.asyncio import AsyncEngine

    assert isinstance(engine, AsyncEngine)
    async with engine.connect() as conn:
        row = await conn.execute(
            text("SELECT group_id::text FROM enrollments WHERE id = :id"),
            {"id": enrollment_id},
        )
    return str(row.scalar_one())


def test_live_stats_match_database() -> None:
    asyncio.run(_live_stats())


async def _live_stats() -> None:
    engine = create_async_engine(_database_url())
    async with engine.connect() as conn:
        count = await conn.execute(text("SELECT count(*) FROM enrollments WHERE status = 'ACTIVE'"))
        listeners = int(count.scalar_one())
    await engine.dispose()
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=10) as client:
        home = await client.get("/api/v1/public/home")
    assert home.status_code == 200
    assert home.json()["stats"].get("listeners") == listeners
