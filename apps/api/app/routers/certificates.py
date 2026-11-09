import json
import uuid
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.cert_pdf import CertificateData, render
from app.security import bearer_from_request, problem, read_access_token
from app.signing import signature_matches

router = APIRouter(tags=["certificates"])


class DecisionBody(BaseModel):
    decision: Literal["APPROVE", "REJECT"]
    comment: str = ""


def _engine(request: Request) -> AsyncEngine:
    engine: AsyncEngine = request.app.state.engine
    return engine


def _user_id(request: Request) -> uuid.UUID | None:
    token = bearer_from_request(request)
    if token is None:
        return None
    payload = read_access_token(token)
    if payload is None or "sub" not in payload:
        return None
    return uuid.UUID(str(payload["sub"]))


async def _roles(conn: AsyncConnection, user_id: uuid.UUID) -> set[str]:
    rows = await conn.execute(
        text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"),
        {"id": user_id},
    )
    return {str(item["role"]) for item in rows.mappings()}


@router.get("/api/v1/certificates")
async def queue(request: Request, status: str = "PENDING_APPROVAL") -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        roles = await _roles(conn, user_id)
        if not roles.intersection({"admin", "education_lead", "cert_officer"}):
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Sertifikat navbati uchun ruxsat yo'q.")
        rows = await conn.execute(
            text(
                """
                SELECT c.id::text AS id, c.number, c.status::text AS status,
                       p.first_name, p.last_name, t.name AS trade_name,
                       (SELECT count(*) FROM certificate_approvals a
                         WHERE a.certificate_id = c.id AND a.decision = 'APPROVE') AS approvals,
                       (
                         SELECT round(100.0 * count(*) FILTER (WHERE a2.status IN ('PRESENT','LATE'))
                                      / NULLIF(count(*), 0))
                         FROM attendance a2 WHERE a2.enrollment_id = c.enrollment_id
                       ) AS attendance_pct,
                       (SELECT f.theory_score FROM final_exams f WHERE f.enrollment_id = c.enrollment_id) AS theory_score,
                       (SELECT f.practice_score FROM final_exams f WHERE f.enrollment_id = c.enrollment_id) AS practice_score
                FROM certificates c
                JOIN persons p ON p.id = c.person_id
                JOIN trades t ON t.id = c.trade_id
                WHERE c.status::text = :status
                ORDER BY c.created_at
                LIMIT 50
                """
            ),
            {"status": status},
        )
    return JSONResponse(
        [
            {
                "id": item["id"],
                "number": item["number"],
                "status": item["status"],
                "holder": f"{item['last_name']} {item['first_name']}",
                "trade": _label(item["trade_name"]),
                "approvals": int(item["approvals"]),
                "attendance_pct": None if item["attendance_pct"] is None else int(item["attendance_pct"]),
                "theory_score": item["theory_score"],
                "practice_score": item["practice_score"],
            }
            for item in rows.mappings()
        ]
    )


def _label(value: object) -> str:
    if isinstance(value, dict):
        return str(value.get("uz-Latn") or "")
    return ""


@router.post("/api/v1/certificates/{certificate_id}/decisions")
async def decide(certificate_id: uuid.UUID, body: DecisionBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.begin() as conn:
        roles = await _roles(conn, user_id)
        approver_role = "education_lead" if "education_lead" in roles else "cert_officer" if "cert_officer" in roles else None
        if approver_role is None:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Tasdiqlash uchun o'quv rahbari yoki sertifikat xodimi kerak.")
        found = await conn.execute(
            text(
                """
                SELECT c.status::text AS status, p.first_name, p.last_name, t.name AS trade_name
                FROM certificates c
                JOIN persons p ON p.id = c.person_id
                JOIN trades t ON t.id = c.trade_id
                WHERE c.id = :id
                """
            ),
            {"id": certificate_id},
        )
        item = found.mappings().first()
        if item is None:
            return problem(404, "NOT_FOUND", "Topilmadi", "Sertifikat yo'q.")
        if item["status"] not in {"DRAFT", "PENDING_APPROVAL"}:
            return problem(409, "NOT_PENDING", "Navbatda emas", "Bu sertifikat allaqachon yopilgan.")
        await conn.execute(
            text(
                """
                INSERT INTO certificate_approvals (certificate_id, approver_id, role, decision, comment)
                VALUES (:certificate_id, :approver_id, CAST(:role AS role_code), :decision, :comment)
                """
            ),
            {
                "certificate_id": certificate_id,
                "approver_id": user_id,
                "role": approver_role,
                "decision": body.decision,
                "comment": body.comment,
            },
        )
        if body.decision == "REJECT":
            await conn.execute(
                text("UPDATE certificates SET status = 'REJECTED' WHERE id = :id"),
                {"id": certificate_id},
            )
            return JSONResponse({"status": "REJECTED"})
        count = await conn.execute(
            text(
                """
                SELECT count(DISTINCT approver_id) AS total
                FROM certificate_approvals
                WHERE certificate_id = :id AND decision = 'APPROVE'
                """
            ),
            {"id": certificate_id},
        )
        approvals = int(count.scalar_one())
        if approvals < 2:
            await conn.execute(
                text("UPDATE certificates SET status = 'PENDING_APPROVAL' WHERE id = :id"),
                {"id": certificate_id},
            )
            return JSONResponse({"status": "PENDING_APPROVAL", "approvals": approvals})
        serial = await conn.execute(text("SELECT nextval('cert_seq_2026')"))
        number = f"UB-{datetime.now(UTC).year}-{int(serial.scalar_one()):06d}"
        payload = {
            "holder": f"{item['last_name']} {item['first_name']}",
            "issuer": "UB_NAMDTU",
            "level": "ASSISTANT",
            "number": number,
            "trade": _label(item["trade_name"]),
        }
        from app.signing import sign_payload

        digest, signature = sign_payload(payload)
        await conn.execute(
            text(
                """
                UPDATE certificates
                SET status = 'ISSUED', number = :number, issued_at = now(),
                    payload = CAST(:payload AS jsonb),
                    payload_hash = decode(:digest, 'hex'),
                    signature = decode(:signature, 'hex'),
                    key_id = 'local-2026'
                WHERE id = :id
                """
            ),
            {
                "id": certificate_id,
                "number": number,
                "payload": json.dumps(payload, ensure_ascii=False),
                "digest": digest.hex(),
                "signature": signature.hex(),
            },
        )
    return JSONResponse({"status": "ISSUED", "number": number})


@router.get("/api/v1/public/verify/{number}")
async def verify(number: str, request: Request) -> JSONResponse:
    engine = _engine(request)
    async with engine.begin() as conn:
        row = await conn.execute(
            text(
                """
                SELECT c.number, c.status::text AS status, c.issuer::text AS issuer,
                       c.level, c.issued_at, c.payload, c.signature, c.revoked_at,
                       p.first_name, p.last_name
                FROM certificates c
                JOIN persons p ON p.id = c.person_id
                WHERE c.number = :number
                """
            ),
            {"number": number},
        )
        item = row.mappings().first()
        await conn.execute(
            text(
                """
                INSERT INTO verification_logs (number_queried, result)
                VALUES (:number, :result)
                """
            ),
            {"number": number, "result": "NOT_FOUND" if item is None else item["status"]},
        )
    if item is None:
        return JSONResponse({"result": "NOT_FOUND", "signature_valid": False})
    if item["status"] == "REVOKED":
        return JSONResponse({"result": "REVOKED", "signature_valid": False, "revoked_at": str(item["revoked_at"])})
    payload = item["payload"] if isinstance(item["payload"], dict) else {}
    signature = item["signature"]
    raw = bytes(signature) if signature is not None else b""
    valid = bool(payload) and signature_matches(payload, raw)
    result = "VALID" if item["status"] == "ISSUED" and valid else "TAMPERED"
    return JSONResponse(
        {
            "result": result,
            "signature_valid": valid,
            "certificate": {
                "number": item["number"],
                "issuer": item["issuer"],
                "trade": payload.get("trade") if isinstance(payload, dict) else None,
                "level": item["level"],
                "issued_at": None if item["issued_at"] is None else item["issued_at"].isoformat(),
            },
            "holder": {"display_name": f"{item['first_name']} {item['last_name']}"},
            "checked_at": datetime.now(UTC).isoformat(),
        }
    )


@router.get("/api/v1/public/verify/{number}/pdf")
async def verify_pdf(number: str, request: Request) -> Response:
    """FR-CERT-PDF: printable certificate with QR to the public verify page."""
    engine = _engine(request)
    async with engine.connect() as conn:
        row = await conn.execute(
            text(
                """
                SELECT c.number, c.level, c.issuer::text AS issuer, c.issued_at, c.signature,
                       p.first_name, p.last_name, t.name AS trade_name
                FROM certificates c
                JOIN persons p ON p.id = c.person_id
                JOIN trades t ON t.id = c.trade_id
                WHERE c.number = :number AND c.status = 'ISSUED'
                """
            ),
            {"number": number},
        )
        item = row.mappings().first()
    if item is None:
        return problem(404, "NOT_FOUND", "Topilmadi", "Berilgan sertifikat yo'q.")
    base = str(request.headers.get("x-public-origin") or "https://uychibinokor.uz").rstrip("/")
    data = CertificateData(
        number=str(item["number"]),
        holder=f"{item['first_name']} {item['last_name']}",
        trade=_label(item["trade_name"]),
        level=str(item["level"]),
        issuer=str(item["issuer"]),
        issued_at=None if item["issued_at"] is None else item["issued_at"].date(),
        signature=bytes(item["signature"] or b""),
        verify_url=f"{base}/verify/{item['number']}",
    )
    return Response(
        content=render(data),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="sertifikat-{item["number"]}.pdf"'},
    )


@router.get("/api/v1/public/keys")
async def keys() -> JSONResponse:
    from app.signing import KEY_ID, public_key_b64

    return JSONResponse(
        {
            "keys": [
                {
                    "kid": KEY_ID,
                    "alg": "Ed25519",
                    "use": "cert",
                    "x": public_key_b64(),
                }
            ]
        }
    )
