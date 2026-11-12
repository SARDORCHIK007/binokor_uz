import json
import uuid
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.cert_pdf import CertificateData, Signer, make_signer, render
from app.doc_i18n import lang_of, pick, t
from app.security import bearer_from_request, problem, read_access_token
from app.signing import signature_matches

router = APIRouter(tags=["certificates"])


class SignBody(BaseModel):
    partner: str  # slug of the organisation the caller signs for


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


async def signers_for(conn: AsyncConnection, number: str, lang: str = "uz-Latn") -> list[Signer]:
    """Expected signers: project leader (GOV) first, then partners with a SIGNED agreement.

    A signer's signature stays empty until that signer has signed the certificate.
    """
    rows = await conn.execute(
        text(
            """
            SELECT coalesce(p.slug, lower(regexp_replace(p.name->>'uz-Latn', '[^a-zA-Z0-9]+', '-', 'g'))) AS slug,
                   p.name AS name, p.kind::text AS kind, coalesce(cs.signature, '') AS signature
            FROM partners p
            LEFT JOIN certificates c ON c.number = :number
            LEFT JOIN certificate_signatures cs ON cs.certificate_id = c.id AND cs.partner_slug = p.slug
            WHERE p.status = 'SIGNED'
            ORDER BY (p.kind = 'GOV') DESC, p.sort_order, p.name->>'uz-Latn'
            LIMIT 3
            """
        ),
        {"number": number},
    )
    return [
        Signer(
            slug=str(row["slug"]),
            name=pick(row["name"], lang),
            role=t(lang, str(row["kind"]) if str(row["kind"]) in {"GOV", "EDU", "AGENCY"} else "PARTNER"),
            signature=str(row["signature"]),
        )
        for row in rows.mappings()
    ]


# which cabinet roles may sign for which kind of organisation
SIGN_ROLES = {
    "GOV": {"superadmin", "admin", "district_official"},
    "EDU": {"education_lead"},
    "AGENCY": {"cert_officer", "partner_viewer", "agency_officer"},
}


async def signable_slugs(conn: AsyncConnection, user_id: uuid.UUID) -> set[str]:
    roles = await _roles(conn, user_id)
    rows = await conn.execute(text("SELECT slug, kind::text AS kind FROM partners WHERE status = 'SIGNED' AND slug IS NOT NULL"))
    return {str(r["slug"]) for r in rows.mappings() if roles & SIGN_ROLES.get(str(r["kind"]), set())}


@router.get("/api/v1/certificates/signing")
async def signing_queue(request: Request) -> JSONResponse:
    """Issued certificates with who signed and who still has to; `mine` = what the caller may sign."""
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    async with _engine(request).connect() as conn:
        mine = await signable_slugs(conn, user_id)
        if not mine:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Imzolash huquqi faqat rahbar va hamkor tashkilot vakillarida.")
        rows = (
            await conn.execute(
                text(
                    """
                    SELECT c.number, p.first_name, p.last_name, t.name AS trade_name
                    FROM certificates c
                    JOIN persons p ON p.id = c.person_id
                    JOIN trades t ON t.id = c.trade_id
                    WHERE c.status = 'ISSUED' AND c.number IS NOT NULL
                    ORDER BY c.issued_at DESC NULLS LAST
                    LIMIT 100
                    """
                )
            )
        ).mappings().all()
        items = []
        for row in rows:
            signers = await signers_for(conn, str(row["number"]))
            items.append(
                {
                    "number": row["number"],
                    "holder": f"{row['last_name']} {row['first_name']}",
                    "trade": _label(row["trade_name"]),
                    "signers": [{"slug": x.slug, "name": x.name, "signed": bool(x.signature)} for x in signers],
                    "can_sign": any(x.slug in mine and not x.signature for x in signers),
                }
            )
    return JSONResponse({"mine": sorted(mine), "items": items})


@router.post("/api/v1/certificates/{number}/sign")
async def sign_certificate(number: str, body: SignBody, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    async with _engine(request).begin() as conn:
        mine = await signable_slugs(conn, user_id)
        if not mine:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Imzolash huquqi faqat rahbar va hamkor tashkilot vakillarida.")
        found = (
            await conn.execute(text("SELECT id FROM certificates WHERE number = :n AND status = 'ISSUED'"), {"n": number})
        ).mappings().first()
        if found is None:
            return problem(404, "NOT_FOUND", "Topilmadi", "Berilgan sertifikat yo'q.")
        if body.partner not in mine:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu tashkilot nomidan imzolash huquqingiz yo'q.")
        signed: list[str] = []
        for signer in await signers_for(conn, number):
            if signer.slug == body.partner and not signer.signature:
                made = make_signer(number, signer.slug, signer.name, "PARTNER")
                await conn.execute(
                    text(
                        """
                        INSERT INTO certificate_signatures (certificate_id, partner_slug, signed_by, signature)
                        VALUES (:cid, :slug, :uid, :sig) ON CONFLICT DO NOTHING
                        """
                    ),
                    {"cid": found["id"], "slug": signer.slug, "uid": user_id, "sig": made.signature},
                )
                signed.append(signer.slug)
    if not signed:
        return problem(409, "ALREADY_SIGNED", "Allaqachon imzolangan", "Bu sertifikatni siz allaqachon imzolagansiz.")
    return JSONResponse({"number": number, "signed": signed})


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
    async with engine.connect() as conn:
        signer_rows = await signers_for(conn, str(item["number"]))
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
            "signers": [
                {
                    "slug": signer.slug,
                    "name": signer.name,
                    "role": signer.role,
                    "signed": bool(signer.signature),
                    "fingerprint": signer.fingerprint,
                }
                for signer in signer_rows
            ],
            "checked_at": datetime.now(UTC).isoformat(),
        }
    )


@router.get("/api/v1/public/verify/{number}/pdf")
async def verify_pdf(number: str, request: Request, lang: str | None = None) -> Response:
    """FR-CERT-PDF: printable certificate with QR to the public verify page."""
    code = lang_of(lang or request.cookies.get("ub_locale"))
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
        signers = await signers_for(conn, str(item["number"]), code) if item is not None else []
    if item is None:
        return problem(404, "NOT_FOUND", "Topilmadi", "Berilgan sertifikat yo'q.")
    base = str(request.headers.get("x-public-origin") or "https://uychibinokor.uz").rstrip("/")
    data = CertificateData(
        number=str(item["number"]),
        holder=f"{item['first_name']} {item['last_name']}",
        trade=pick(item["trade_name"], code),
        level=str(item["level"]),
        issuer=str(item["issuer"]),
        issued_at=None if item["issued_at"] is None else item["issued_at"].date(),
        signature=bytes(item["signature"] or b""),
        verify_url=f"{base}/verify/{item['number']}",
        signers=tuple(signers),
        lang=code,
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
