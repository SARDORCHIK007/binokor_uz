"""FR-PASSPORT and signed certificate: card on the template, public check page, signer QRs, persistent key."""

import asyncio
import os

import httpx
import pytest
from app.cert_pdf import CertificateData, make_signer, render
from app.passport_card import PassportData, card_pdf, render_card
from app.routers.passport import passport_number
from app.signing import KEY_PATH, sign_payload, signature_matches
from PIL import Image

BASE = "http://127.0.0.1:8000"


def _data() -> PassportData:
    return PassportData(
        number="UB-P-2026-000123",
        name="Азиз Каримов",  # Cyrillic must render too
        trade="Santexnik",
        group_code="SANT-2026-01",
        status_code="ACTIVE",
        enrolled_on="2026-11-06",
        fingerprint="A1B2 C3D4 E5F6 0718",
        verify_url="https://uychibinokor.uz/pasport/x",
    )


def test_card_is_template_sized_png_and_pdf() -> None:
    import io  # noqa: PLC0415

    png = render_card(_data())
    image = Image.open(io.BytesIO(png))
    assert image.size == (1536, 1024)
    assert image.mode == "RGBA"
    assert card_pdf(png).startswith(b"%PDF")


@pytest.mark.parametrize("lang", ["uz-Latn", "uz-Cyrl", "ru", "en"])
def test_card_and_certificate_render_in_every_language(lang: str) -> None:
    import io  # noqa: PLC0415

    png = render_card(_data(), lang=lang)
    assert Image.open(io.BytesIO(png)).size == (1536, 1024)
    signer = make_signer("UB-2026-999999", "uychi-hokimlik", "Hokimlik", "GOV", lang)
    pdf = render(
        CertificateData(
            number="UB-2026-999999", holder="Азиз Каримов", trade="Santexnik", level="MASTER",
            issuer="UB_NAMDTU", issued_at=None, signature=b"" * 64,
            verify_url="https://uychibinokor.uz/verify/UB-2026-999999", signers=(signer,), lang=lang,
        )
    )
    assert pdf.startswith(b"%PDF")


def test_languages_differ() -> None:
    from app.doc_i18n import lang_of, t  # noqa: PLC0415

    assert len({t(code, "cert_title") for code in ("uz-Latn", "uz-Cyrl", "ru", "en")}) == 4
    assert lang_of("de") == "en" and lang_of("tg") == "uz-Latn" and lang_of("ru-RU") == "ru" and lang_of(None) == "uz-Latn"
    assert make_signer("N", "s", "x", "GOV", "en").role == "Project leader"


def test_passport_number_is_stable() -> None:
    import uuid  # noqa: PLC0415
    from datetime import date  # noqa: PLC0415

    enrollment = uuid.UUID("3024aee0-d63d-5654-b607-ad2bd0b0cd93")
    assert passport_number(enrollment, date(2026, 11, 6)) == passport_number(enrollment, date(2026, 12, 1)).replace(
        "2026", "2026"
    )
    assert passport_number(enrollment, date(2026, 11, 6)).startswith("UB-P-2026-")


def test_signer_signatures_are_deterministic_and_verifiable() -> None:
    first = make_signer("UB-2026-000001", "namdtu", "NamDTU", "EDU")
    again = make_signer("UB-2026-000001", "namdtu", "NamDTU", "EDU")
    other = make_signer("UB-2026-000001", "uychi-hokimlik", "Hokimlik", "GOV")
    assert first.signature == again.signature != other.signature
    assert signature_matches({"certificate": "UB-2026-000001", "signer": "namdtu"}, bytes.fromhex(first.signature))
    assert not signature_matches({"certificate": "UB-2026-000002", "signer": "namdtu"}, bytes.fromhex(first.signature))
    assert other.role == "Loyiha rahbari"


def test_certificate_pdf_with_signers() -> None:
    signers = (make_signer("UB-2026-999999", "uychi-hokimlik", "Uychi tumani hokimligi", "GOV"),)
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
            signers=signers,
        )
    )
    assert pdf.startswith(b"%PDF") and len(pdf) > 100_000  # template image embedded


def test_signing_key_is_not_in_tmp() -> None:
    """A key in /tmp is lost when the container is re-created and breaks every issued certificate."""
    sign_payload({"probe": 1})
    assert not str(KEY_PATH).startswith("/tmp")
    assert KEY_PATH.exists()


def test_passport_endpoints() -> None:
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_flow())


async def _flow() -> None:
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as client:
        login = await client.post("/api/v1/auth/demo", json={"role": "student"})
        if login.status_code != 200:
            pytest.skip("demo kirish o'chirilgan")
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        mine = (await client.get("/api/v1/me/passport", headers=headers)).json()
        assert mine["enrolled"] is True and mine["number"].startswith("UB-P-")
        png = await client.get("/api/v1/me/passport/card.png", headers=headers)
        assert png.status_code == 200 and png.headers["content-type"] == "image/png"
        import io as _io  # noqa: PLC0415

        from PIL import Image as _Image  # noqa: PLC0415

        buf = _io.BytesIO()
        _Image.new("RGB", (900, 1200), (200, 40, 40)).save(buf, "PNG")
        up = await client.put("/api/v1/me/passport/photo", content=buf.getvalue(), headers=headers)
        assert up.status_code == 200
        assert (await client.put("/api/v1/me/passport/photo", content=b"not an image", headers=headers)).status_code == 422
        assert (await client.get("/api/v1/me/passport", headers=headers)).json()["has_photo"] is True
        with_photo = await client.get("/api/v1/me/passport/card.png", headers=headers)
        assert with_photo.status_code == 200 and with_photo.content != png.content
        assert (await client.delete("/api/v1/me/passport/photo", headers=headers)).status_code == 200
        pdf = await client.get("/api/v1/me/passport/card.pdf", headers=headers)
        assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")
        async with httpx.AsyncClient(base_url=BASE, timeout=30) as anonymous:  # no login cookie
            assert (await anonymous.get("/api/v1/me/passport/card.png")).status_code == 401

        public = (await client.get(f"/api/v1/public/passport/{mine['id']}")).json()
        assert public["valid"] is True
        assert public["name"].endswith(".") or " " not in public["name"]  # first name + initial only
        assert "+998" not in str(public)  # BR-17
        assert (await client.get("/api/v1/public/passport/00000000-0000-0000-0000-000000000000")).json()["valid"] is False

        verify = (await client.get("/api/v1/public/verify/UB-2026-000001")).json()
        assert verify["result"] == "VALID" and len(verify["signers"]) >= 1


def test_signature_qr_appears_only_after_signing() -> None:
    """Leader and partners sign one by one; an unsigned slot has no QR and says it is awaiting."""
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL yo'q")
    asyncio.run(_signing_flow())


async def _signing_flow() -> None:
    from sqlalchemy import text  # noqa: PLC0415
    from sqlalchemy.ext.asyncio import create_async_engine  # noqa: PLC0415

    engine = create_async_engine(os.environ["DATABASE_URL"])
    async with engine.begin() as conn:
        number = (await conn.execute(text("SELECT number FROM certificates WHERE status = 'ISSUED' ORDER BY number LIMIT 1"))).scalar_one()
        await conn.execute(text("DELETE FROM certificate_signatures WHERE certificate_id = (SELECT id FROM certificates WHERE number = :n)"), {"n": number})
    try:
        async with httpx.AsyncClient(base_url=BASE, timeout=30) as anonymous:
            before = (await anonymous.get(f"/api/v1/public/verify/{number}")).json()
            assert before["signers"] and not any(x["signed"] for x in before["signers"])
            assert (await anonymous.post(f"/api/v1/certificates/{number}/sign", json={"partner": "namdtu"})).status_code == 401
        async with httpx.AsyncClient(base_url=BASE, timeout=30) as student:
            await student.post("/api/v1/auth/demo", json={"role": "student"})
            assert (await student.post(f"/api/v1/certificates/{number}/sign", json={"partner": "namdtu"})).status_code == 403
        async with httpx.AsyncClient(base_url=BASE, timeout=30) as admin:
            assert (await admin.post("/api/v1/auth/demo", json={"role": "hokimlik"})).status_code == 200
            done = await admin.post(f"/api/v1/certificates/{number}/sign", json={"partner": "uychi-hokimlik"})
            assert done.status_code == 200 and done.json()["signed"] == ["uychi-hokimlik"]
            assert (await admin.post(f"/api/v1/certificates/{number}/sign", json={"partner": "uychi-hokimlik"})).status_code == 409
            queue = (await admin.get("/api/v1/certificates/signing")).json()
            assert "uychi-hokimlik" in queue["mine"]
        async with httpx.AsyncClient(base_url=BASE, timeout=30) as anonymous:
            after = (await anonymous.get(f"/api/v1/public/verify/{number}")).json()
            flags = {x["slug"]: x["signed"] for x in after["signers"]}
            assert flags["uychi-hokimlik"] is True and flags.get("namdtu") is False
    finally:
        async with engine.begin() as conn:
            await conn.execute(text("DELETE FROM certificate_signatures WHERE certificate_id = (SELECT id FROM certificates WHERE number = :n)"), {"n": number})
        await engine.dispose()
