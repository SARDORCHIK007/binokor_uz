"""FR-CERT-PDF: printable certificate with QR."""

import asyncio
import os

import httpx
import pytest
from app.cert_pdf import CertificateData, fingerprint, render

BASE = "http://127.0.0.1:8000"


def test_render_produces_pdf_with_cyrillic_and_qr() -> None:
    pdf = render(
        CertificateData(
            number="UB-2026-999999",
            holder="Азиз Каримов",
            trade="Santexnik",
            level="MASTER",
            issuer="UB_NAMDTU",
            issued_at=None,
            signature=b"\x01" * 64,
            verify_url="https://uychibinokor.uz/verify/UB-2026-999999",
        )
    )
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 10_000  # embedded font + QR image


def test_fingerprint_is_stable_and_short() -> None:
    assert fingerprint(b"abc") == fingerprint(b"abc")
    assert len(fingerprint(b"abc").replace(" ", "")) == 16


def test_pdf_endpoint() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")

    async def call() -> tuple[int, str, int]:
        async with httpx.AsyncClient(base_url=BASE, timeout=20) as client:
            ok = await client.get("/api/v1/public/verify/UB-2026-000001/pdf")
            missing = await client.get("/api/v1/public/verify/UB-0000-000000/pdf")
        return ok.status_code, ok.headers.get("content-type", ""), missing.status_code

    status, kind, missing = asyncio.run(call())
    assert status == 200 and kind.startswith("application/pdf")
    assert missing == 404
