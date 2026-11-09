"""Student / worker passport (FR-PASSPORT).

Issued automatically once a person is enrolled (accepted to study). The owner downloads a card (PNG or
printable PDF) built on the card template; its QR opens a public check page that shows only a first
name, trade, group and status (BR-17: no phone, no personal documents).
"""

import os
import uuid
from datetime import date

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.doc_i18n import lang_of, pick
from app.passport_card import PassportData, card_pdf, fingerprint_of, render_card
from app.security import bearer_from_request, problem, read_access_token
from app.signing import sign_payload

router = APIRouter(prefix="/api/v1", tags=["passport"])

def _engine(request: Request) -> AsyncEngine:
    engine: AsyncEngine = request.app.state.engine
    return engine


def _user_id(request: Request) -> uuid.UUID | None:
    token = bearer_from_request(request)
    payload = read_access_token(token) if token else None
    if payload is None or "sub" not in payload:
        return None
    return uuid.UUID(str(payload["sub"]))


def _base(request: Request) -> str:
    return str(
        request.headers.get("x-public-origin") or os.environ.get("PUBLIC_BASE_URL") or "https://uychibinokor.uz"
    ).rstrip("/")


def passport_number(enrollment_id: uuid.UUID, enrolled: date) -> str:
    return f"UB-P-{enrolled.year}-{enrollment_id.int % 1_000_000:06d}"


def _lang(request: Request, explicit: str | None) -> str:
    """?lang=... wins, then the site's locale cookie, then Uzbek (Latin)."""
    return lang_of(explicit or request.cookies.get("ub_locale"))


_SELECT = """
    SELECT e.id, e.status::text AS status, e.enrolled_at, e.completed_at,
           g.code AS group_code, t.name AS trade_name, u.full_name
    FROM enrollments e
    JOIN groups g ON g.id = e.group_id
    JOIN courses c ON c.id = g.course_id
    JOIN trades t ON t.id = c.trade_id
    JOIN users u ON u.id = e.student_user_id
"""


async def _mine(conn: AsyncConnection, user_id: uuid.UUID) -> dict[str, object] | None:
    row = (
        await conn.execute(
            text(_SELECT + " WHERE e.student_user_id = :id ORDER BY e.enrolled_at DESC LIMIT 1"), {"id": user_id}
        )
    ).mappings().first()
    return None if row is None else dict(row)


def _data(row: dict[str, object], base: str, lang: str) -> PassportData:
    enrollment = uuid.UUID(str(row["id"]))
    enrolled = row["enrolled_at"]
    assert isinstance(enrolled, date)
    number = passport_number(enrollment, enrolled)
    _, signature = sign_payload({"passport": number, "enrollment": str(enrollment)})
    return PassportData(
        number=number,
        name=str(row["full_name"]),
        trade=pick(row["trade_name"], lang),
        group_code=str(row["group_code"]),
        status_code=str(row["status"]),
        enrolled_on=enrolled.isoformat(),
        fingerprint=fingerprint_of(signature),
        verify_url=f"{base}/pasport/{enrollment}",
    )


@router.get("/me/passport")
async def my_passport(request: Request, lang: str | None = None) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    async with _engine(request).connect() as conn:
        row = await _mine(conn, user_id)
    if row is None:
        return JSONResponse({"enrolled": False})
    code = _lang(request, lang)
    data = _data(row, _base(request), code)
    return JSONResponse(
        {
            "enrolled": True,
            "lang": code,
            "id": str(row["id"]),
            "number": data.number,
            "name": data.name,
            "trade": data.trade,
            "group": str(row["group_code"]),
            "status": str(row["status"]),
            "enrolled_at": str(row["enrolled_at"]),
            "fingerprint": data.fingerprint,
            "verify_url": data.verify_url,
        }
    )


@router.get("/me/passport/card.{ext}", response_model=None)
async def my_card(ext: str, request: Request, lang: str | None = None) -> Response | JSONResponse:
    if ext not in {"png", "pdf"}:
        return problem(404, "NOT_FOUND", "Topilmadi", "Format png yoki pdf.")
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    async with _engine(request).connect() as conn:
        row = await _mine(conn, user_id)
    if row is None:
        return problem(404, "NOT_FOUND", "Pasport yo'q", "Pasport o'qishga qabul qilingandan keyin beriladi.")
    code = _lang(request, lang)
    png = render_card(_data(row, _base(request), code), lang=code)
    if ext == "png":
        return Response(png, media_type="image/png", headers={"Cache-Control": "private, max-age=300"})
    return Response(
        card_pdf(png), media_type="application/pdf", headers={"Content-Disposition": 'inline; filename="pasport.pdf"'}
    )


@router.get("/public/passport/{enrollment_id}")
async def public_passport(
    enrollment_id: uuid.UUID, request: Request, lang: str | None = None
) -> JSONResponse:
    """What the QR opens: first name + last initial, trade, group, status. Nothing else."""
    async with _engine(request).connect() as conn:
        row = (
            await conn.execute(text(_SELECT + " WHERE e.id = :id"), {"id": enrollment_id})
        ).mappings().first()
    if row is None:
        return JSONResponse({"valid": False})
    parts = str(row["full_name"]).split()
    display = parts[0] + (f" {parts[-1][0]}." if len(parts) > 1 else "")
    data = _data(dict(row), _base(request), _lang(request, lang))
    return JSONResponse(
        {
            "valid": str(row["status"]) in {"ACTIVE", "COMPLETED"},
            "number": data.number,
            "name": display,
            "trade": data.trade,
            "group": str(row["group_code"]),
            "status": str(row["status"]),
            "enrolled_at": str(row["enrolled_at"]),
            "fingerprint": data.fingerprint,
        }
    )
