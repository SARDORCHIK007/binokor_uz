import json
import uuid
from datetime import date

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.notify import send_telegram
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1", tags=["applications"])


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


class ApplicationIn(BaseModel):
    type: str
    trade_code: str
    track: str
    experience_years: float = Field(ge=0, le=40)
    has_language: bool
    first_name: str = Field(min_length=2, max_length=80)
    last_name: str = Field(min_length=2, max_length=80)
    birth_date: date
    consent_personal: bool
    consent_telegram: bool


def _matrix(experience: float, has_language: bool) -> str:
    from app.rules import matrix_class

    return matrix_class(experience, has_language)


@router.post("/applications")
async def create_application(body: ApplicationIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    if body.type not in {"YOUTH", "WORKER_UPSKILL", "UNIVERSITY_GRAD"}:
        return problem(422, "VALIDATION", "Tur noto'g'ri", "Ariza turini tanlang.")
    if body.track not in {"DOMESTIC", "FOREIGN"}:
        return problem(422, "VALIDATION", "Trek noto'g'ri", "Ichki yoki tashqi trekni tanlang.")
    if not body.consent_personal or not body.consent_telegram:
        return problem(422, "CONSENT_REQUIRED", "Rozilik kerak", "Ikki rozilikni ham belgilang.")
    matrix = _matrix(body.experience_years, body.has_language)
    engine = _engine(request)
    async with engine.begin() as conn:
        trade = await conn.execute(
            text("SELECT id FROM trades WHERE code = :code"),
            {"code": body.trade_code},
        )
        trade_row = trade.first()
        if trade_row is None:
            return problem(404, "NOT_FOUND", "Kasb topilmadi", "Kasbni qayta tanlang.")
        person_id = new_id()
        application_id = new_id()
        await conn.execute(
            text(
                """
                INSERT INTO persons (id, user_id, last_name, first_name, birth_date)
                VALUES (:id, :user_id, :last_name, :first_name, :birth_date)
                ON CONFLICT (user_id) DO UPDATE
                SET last_name = EXCLUDED.last_name, first_name = EXCLUDED.first_name
                RETURNING id
                """
            ),
            {
                "id": person_id,
                "user_id": user_id,
                "last_name": body.last_name,
                "first_name": body.first_name,
                "birth_date": body.birth_date,
            },
        )
        saved = await conn.execute(
            text("SELECT id FROM persons WHERE user_id = :user_id"),
            {"user_id": user_id},
        )
        person_id = saved.scalar_one()
        await conn.execute(
            text(
                """
                INSERT INTO consents (id, user_id, kind, version, granted)
                VALUES (:id, :user_id, 'pd_processing', '2026-11', true),
                       (:id2, :user_id, 'telegram_notify', '2026-11', true)
                """
            ),
            {"id": new_id(), "id2": new_id(), "user_id": user_id},
        )
        await conn.execute(
            text(
                """
                INSERT INTO applications (
                  id, person_id, type, source, desired_trade_id, desired_track,
                  trade_experience_years, matrix_suggested, status, created_by
                )
                VALUES (
                  :id, :person_id, CAST(:type AS application_type), 'ONLINE', :trade_id,
                  CAST(:track AS track_code), :experience, CAST(:matrix AS matrix_class),
                  'SUBMITTED', :user_id
                )
                """
            ),
            {
                "id": application_id,
                "person_id": person_id,
                "type": body.type,
                "trade_id": trade_row[0],
                "track": body.track,
                "experience": body.experience_years,
                "matrix": matrix,
                "user_id": user_id,
            },
        )
        await conn.execute(
            text(
                """
                INSERT INTO application_events (application_id, to_status, actor_id, note)
                VALUES (:id, 'SUBMITTED', :user_id, 'online submit')
                """
            ),
            {"id": application_id, "user_id": user_id},
        )
    return JSONResponse({"id": str(application_id), "status": "SUBMITTED", "matrix": matrix})


@router.get("/applications/mine")
async def mine(request: Request) -> JSONResponse:
    """FR-APP-STATUS: the applicant's applications with their status history."""
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT a.id::text AS id, a.status::text AS status, a.matrix_suggested::text AS matrix,
                       a.desired_track::text AS track, a.rejection_reason, a.created_at,
                       t.name AS trade_name, t.code AS trade_code
                FROM applications a
                JOIN persons p ON p.id = a.person_id
                JOIN trades t ON t.id = a.desired_trade_id
                WHERE p.user_id = :user_id
                ORDER BY a.created_at DESC
                """
            ),
            {"user_id": user_id},
        )
        apps = list(result.mappings())
        events: dict[str, list[dict[str, str]]] = {}
        if apps:
            rows = await conn.execute(
                text(
                    """
                    SELECT application_id::text AS app_id, to_status::text AS status, created_at
                    FROM application_events
                    WHERE application_id = ANY(CAST(:ids AS uuid[]))
                    ORDER BY created_at, id
                    """
                ),
                {"ids": [item["id"] for item in apps]},
            )
            for row in rows.mappings():
                events.setdefault(row["app_id"], []).append(
                    {"status": row["status"], "at": row["created_at"].isoformat()}
                )
    return JSONResponse(
        [
            {
                "id": item["id"],
                "status": item["status"],
                "matrix": item["matrix"],
                "track": item["track"],
                "trade": item["trade_name"]["uz-Latn"] if isinstance(item["trade_name"], dict) else "",
                "trade_code": item["trade_code"],
                "created_at": item["created_at"].isoformat(),
                "rejection_reason": item["rejection_reason"] if item["status"] == "REJECTED" else None,
                "events": events.get(item["id"])
                or [{"status": "SUBMITTED", "at": item["created_at"].isoformat()}],
            }
            for item in apps
        ]
    )


STATUS_MESSAGE = {
    "SCREENING": "Arizangiz ko'rib chiqilmoqda.",
    "ACCEPTED": "Tabriklaymiz! Arizangiz qabul qilindi. Guruhga yozilish haqida xabar beramiz.",
    "WAITLIST": "Arizangiz navbatga qo'yildi. Joy bo'shashi bilan xabar beramiz.",
    "REJECTED": "Arizangiz bo'yicha qaror: rad etildi. Sabab kabinetingizda ko'rsatilgan.",
}


async def _notify_applicant(conn: AsyncConnection, application_id: uuid.UUID, status: str) -> None:
    """Tell the applicant about a decision: in-app row always, Telegram when linked (FR-NOTIF)."""
    row = (
        await conn.execute(
            text(
                """
                SELECT u.id AS user_id, u.telegram_id
                FROM applications a
                JOIN persons p ON p.id = a.person_id
                JOIN users u ON u.id = p.user_id
                WHERE a.id = :id
                """
            ),
            {"id": application_id},
        )
    ).mappings().first()
    if row is None:
        return
    message = STATUS_MESSAGE.get(status, "Arizangiz holati o'zgardi.")
    payload = json.dumps({"application_id": str(application_id), "status": status, "text": message})
    sent = False
    if row["telegram_id"] is not None:
        sent = await send_telegram(int(row["telegram_id"]), f"UYCHI BINOKOR: {message}")
    await conn.execute(
        text(
            """
            INSERT INTO notifications (id, user_id, kind, channel, payload, status, attempts, sent_at)
            VALUES (:id, :user_id, 'application_status', 'telegram', CAST(:payload AS jsonb),
                    :status, :attempts, CASE WHEN :sent THEN now() END)
            """
        ),
        {
            "id": new_id(),
            "user_id": row["user_id"],
            "payload": payload,
            "status": "SENT" if sent else "SKIPPED",
            "attempts": 1 if row["telegram_id"] is not None else 0,
            "sent": sent,
        },
    )


class DecisionIn(BaseModel):
    status: str
    reason: str | None = None


@router.get("/admin/applications")
async def admin_list(request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        role = await conn.execute(
            text("SELECT 1 FROM user_roles WHERE user_id = :id AND role = 'admin'"),
            {"id": user_id},
        )
        if role.first() is None:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu ro'yxat admin uchun.")
        result = await conn.execute(
            text(
                """
                SELECT a.id::text AS id, a.status::text AS status, a.matrix_suggested::text AS matrix,
                       a.type::text AS type, p.first_name, p.last_name, t.name AS trade_name
                FROM applications a
                JOIN persons p ON p.id = a.person_id
                JOIN trades t ON t.id = a.desired_trade_id
                ORDER BY a.created_at DESC
                """
            )
        )
    return JSONResponse(
        [
            {
                "id": item["id"],
                "status": item["status"],
                "matrix": item["matrix"],
                "type": item["type"],
                "name": f"{item['last_name']} {item['first_name']}",
                "trade": item["trade_name"]["uz-Latn"] if isinstance(item["trade_name"], dict) else "",
            }
            for item in result.mappings()
        ]
    )


@router.post("/admin/applications/{application_id}/decision")
async def decide(application_id: uuid.UUID, body: DecisionIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    if body.status not in {"ACCEPTED", "REJECTED", "SCREENING", "WAITLIST"}:
        return problem(422, "VALIDATION", "Holat noto'g'ri", "Qaror holatini tanlang.")
    if body.status == "REJECTED" and not (body.reason and body.reason.strip()):
        return problem(422, "VALIDATION", "Sabab kerak", "Rad etish sababini yozing.")
    engine = _engine(request)
    async with engine.begin() as conn:
        role = await conn.execute(
            text("SELECT 1 FROM user_roles WHERE user_id = :id AND role = 'admin'"),
            {"id": user_id},
        )
        if role.first() is None:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Qaror admin uchun.")
        current = await conn.execute(
            text("SELECT status::text AS status FROM applications WHERE id = :id"),
            {"id": application_id},
        )
        row = current.mappings().first()
        if row is None:
            return problem(404, "NOT_FOUND", "Ariza topilmadi", "Bu ariza yo'q.")
        await conn.execute(
            text(
                """
                UPDATE applications
                SET status = CAST(:status AS application_status),
                    rejection_reason = :reason,
                    updated_at = now()
                WHERE id = :id
                """
            ),
            {
                "id": application_id,
                "status": body.status,
                "reason": body.reason if body.status == "REJECTED" else None,
            },
        )
        await conn.execute(
            text(
                """
                INSERT INTO application_events (application_id, from_status, to_status, actor_id, note)
                VALUES (:id, CAST(:from_status AS application_status), CAST(:status AS application_status),
                        :actor, :note)
                """
            ),
            {
                "id": application_id,
                "from_status": row["status"],
                "status": body.status,
                "actor": user_id,
                "note": body.reason,
            },
        )
        await _notify_applicant(conn, application_id, body.status)
    return JSONResponse({"id": str(application_id), "status": body.status})
