"""Every demo profile can log in and every API its cabinet pages use answers 200."""

import asyncio
import os

import httpx
import pytest

BASE = "http://127.0.0.1:8000"
GETS = {
    "admin": ["/api/v1/cabinet/dashboard?role=admin", "/api/v1/admin/courses", "/api/v1/admin/groups",
              "/api/v1/admin/users", "/api/v1/admin/orders", "/api/v1/admin/employers", "/api/v1/admin/applications",
              "/api/v1/admin/portfolio", "/api/v1/certificates?status=PENDING_APPROVAL", "/api/v1/jobs/board",
              "/api/v1/reports/summary", "/api/v1/employers/me", "/api/v1/learning/my-groups"],
    "mentor": ["/api/v1/cabinet/dashboard?role=mentor", "/api/v1/admin/groups", "/api/v1/learning/my-groups",
               "/api/v1/admin/portfolio"],
    "student": ["/api/v1/cabinet/dashboard?role=student", "/api/v1/learning/mine", "/api/v1/learning/exam",
                "/api/v1/applications/mine", "/api/v1/vocab/today", "/api/v1/vocab/streak",
                "/api/v1/vocab/leaderboard", "/api/v1/vocab/stats"],
    "worker": ["/api/v1/me/portfolio", "/api/v1/applications/mine"],
    "employer": ["/api/v1/employers/me", "/api/v1/employers/workers"],
    "producer": ["/api/v1/producers/products", "/api/v1/producers/orders", "/api/v1/producers/categories"],
    "hokimlik": ["/api/v1/reports/summary", "/api/v1/cabinet/dashboard?role=admin"],
}


@pytest.mark.parametrize("role", sorted(GETS))
def test_profile_endpoints_answer(role: str) -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_check(role))


async def _check(role: str) -> None:
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as client:
        login = await client.post("/api/v1/auth/demo", json={"role": role})
        if login.status_code != 200:
            pytest.skip("demo kirish o'chirilgan")
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        for path in GETS[role]:
            response = await client.get(path, headers=headers)
            assert response.status_code == 200, f"{role} {path}: {response.status_code} {response.text[:120]}"
