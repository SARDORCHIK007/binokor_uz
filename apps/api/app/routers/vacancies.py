"""Vacancies for local and foreign employers: legal profile, documents, and full job postings
(what the job is, what is required, what is offered, exactly where). The migration agency checks foreign firms.
"""

import json
import re
import uuid
from datetime import date
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.doc_i18n import lang_of, pick
from app.inapp import notify
from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/vacancies", tags=["vacancies"])

CURRENCIES = {"USD", "EUR", "KRW", "JPY", "RUB", "UZS"}
LEVELS = {"APPRENTICE", "ASSISTANT", "MASTER", "FOREMAN"}
BENEFITS = ("housing", "meals", "transport", "insurance", "visa_support", "flight")
DOC_KINDS = {"REGISTRATION", "LICENSE", "POWER_OF_ATTORNEY", "CONTRACT", "OTHER"}
MAX_DOC = 5 * 1024 * 1024
AGENCY_ROLES = {"agency_officer", "admin", "superadmin", "placement_manager"}


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


def _unauth() -> JSONResponse:
    return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")


def _forbidden(detail: str) -> JSONResponse:
    return problem(403, "FORBIDDEN", "Ruxsat yo'q", detail)


async def _roles(conn: AsyncConnection, user_id: uuid.UUID) -> set[str]:
    rows = await conn.execute(text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"), {"id": user_id})
    return {str(r["role"]) for r in rows.mappings()}


async def _employer(conn: AsyncConnection, user_id: uuid.UUID) -> dict[str, Any] | None:
    row = (
        await conn.execute(
            text(
                """
                SELECT e.id, e.kind::text AS kind, e.name, e.country_code, e.inn, e.verified_at IS NOT NULL AS verified,
                       e.legal_name, e.registration_no, e.address, e.website, e.contact_person, e.contact_email,
                       e.contact_phone, e.description, e.license_ref
                FROM employers e JOIN employer_members m ON m.employer_id = e.id
                WHERE m.user_id = :id AND e.kind IN ('LOCAL', 'FOREIGN') LIMIT 1
                """
            ),
            {"id": user_id},
        )
    ).mappings().first()
    return None if row is None else dict(row)


def _legal(row: dict[str, Any]) -> dict[str, str]:
    keys = ("legal_name", "registration_no", "address", "website", "contact_person", "contact_email", "contact_phone", "description", "license_ref", "inn")
    return {key: str(row.get(key) or "") for key in keys}


VACANCY_SQL = """
    SELECT r.id::text AS id, r.title, e.name AS employer, coalesce(d.country_code, e.country_code) AS country, t.name AS trade,
           r.quantity, r.salary_from, r.salary_to, r.salary_currency, r.start_date::text AS start, r.duration_months,
           r.status::text AS status, r.created_at::date::text AS created, r.conditions, r.duties, r.requirements, r.benefits,
           r.schedule, r.deadline::text AS deadline, r.city, r.address, r.map_url, r.as_brigade,
           (SELECT count(*) FROM request_candidates c WHERE c.request_id = r.id) AS candidates
    FROM demand_requests r
    JOIN employers e ON e.id = r.employer_id
    JOIN trades t ON t.id = r.trade_id
    LEFT JOIN destinations d ON d.id = r.destination_id
"""


def vacancy_json(row: Any, code: str) -> dict[str, object]:
    r: dict[str, Any] = dict(row)
    return {
        "id": r["id"],
        "title": r["title"] or "",
        "employer": r["employer"],
        "country": str(r["country"] or "").strip(),
        "trade": pick(r["trade"], code),
        "quantity": int(r["quantity"]),
        "salary_from": None if r["salary_from"] is None else float(r["salary_from"]),
        "salary_to": None if r["salary_to"] is None else float(r["salary_to"]),
        "currency": r["salary_currency"],
        "start": r["start"],
        "months": r["duration_months"],
        "status": r["status"],
        "created": r["created"],
        "conditions": r["conditions"],
        "duties": r["duties"] or "",
        "requirements": r["requirements"] or {},
        "benefits": r["benefits"] or {},
        "schedule": r["schedule"] or "",
        "deadline": r["deadline"],
        "city": r["city"] or "",
        "address": r["address"] or "",
        "map_url": r["map_url"] or "",
        "as_brigade": bool(r["as_brigade"]),
        "candidates": int(r["candidates"]),
    }


@router.get("/me")
async def my_page(request: Request, lang: str | None = None) -> JSONResponse:
    code = lang_of(lang or request.cookies.get("ub_locale"))
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        employer = await _employer(conn, user_id)
        if employer is None:
            return _forbidden("Bu bo'lim ish beruvchilar uchun.")
        rows = await conn.execute(text(VACANCY_SQL + " WHERE r.employer_id = :e ORDER BY r.created_at DESC"), {"e": employer["id"]})
        vacancies = [vacancy_json(r, code) for r in rows.mappings()]
        trades = await conn.execute(text("SELECT code, name FROM trades WHERE is_active ORDER BY code"))
        countries = await conn.execute(text("SELECT country_code FROM destinations WHERE is_active ORDER BY country_code"))
        docs = await conn.execute(
            text("SELECT id::text AS id, kind, filename, size_bytes, created_at::date::text AS day, checked_at IS NOT NULL AS checked FROM employer_documents WHERE employer_id = :e ORDER BY created_at DESC"),
            {"e": employer["id"]},
        )
        documents = [dict(r) for r in docs.mappings()]
    return JSONResponse(
        {
            "employer": {
                "name": employer["name"],
                "kind": employer["kind"],
                "country": str(employer["country_code"]).strip(),
                "verified": bool(employer["verified"]),
                "legal": _legal(employer),
            },
            "vacancies": vacancies,
            "documents": documents,
            "trades": [{"code": r["code"], "name": pick(r["name"], code)} for r in trades.mappings()],
            "countries": [str(r[0]).strip() for r in countries.all()],
            "currencies": sorted(CURRENCIES),
            "levels": sorted(LEVELS),
            "benefits": list(BENEFITS),
        }
    )


class LegalIn(BaseModel):
    legal_name: str = Field(default="", max_length=200)
    registration_no: str = Field(default="", max_length=60)
    inn: str = Field(default="", max_length=20)
    license_ref: str = Field(default="", max_length=80)
    address: str = Field(default="", max_length=300)
    website: str = Field(default="", max_length=200)
    contact_person: str = Field(default="", max_length=120)
    contact_email: str = Field(default="", max_length=120)
    contact_phone: str = Field(default="", max_length=25)
    description: str = Field(default="", max_length=2000)


@router.put("/legal")
async def save_legal(body: LegalIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    if body.website and not re.match(r"^https?://\S+$", body.website):
        return problem(422, "VALIDATION", "Sayt manzili noto'g'ri", "Manzil http:// yoki https:// bilan boshlanishi kerak.")
    if body.contact_email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", body.contact_email):
        return problem(422, "VALIDATION", "Elektron pochta noto'g'ri", "Pochtani tekshiring.")
    if body.contact_phone and not re.match(r"^\+[0-9 ()-]{7,24}$", body.contact_phone):
        return problem(422, "VALIDATION", "Telefon noto'g'ri", "Telefonni xalqaro formatda kiriting.")
    async with _engine(request).begin() as conn:
        employer = await _employer(conn, user_id)
        if employer is None:
            return _forbidden("Bu amal ish beruvchilar uchun.")
        if employer["kind"] == "LOCAL" and not (body.inn.strip() or employer["inn"]):
            return problem(422, "VALIDATION", "STIR kerak", "Mahalliy kompaniya uchun STIR kiritilishi shart.")
        await conn.execute(
            text(
                """
                UPDATE employers SET legal_name = :legal, registration_no = :reg, license_ref = :license, address = :address,
                       website = :website, contact_person = :person, contact_email = :email, contact_phone = :phone,
                       description = :description, inn = coalesce(nullif(:inn, ''), inn)
                WHERE id = :id
                """
            ),
            {
                "legal": body.legal_name.strip() or None,
                "reg": body.registration_no.strip() or None,
                "license": body.license_ref.strip() or None,
                "address": body.address.strip() or None,
                "website": body.website.strip() or None,
                "person": body.contact_person.strip() or None,
                "email": body.contact_email.strip() or None,
                "phone": body.contact_phone.strip() or None,
                "description": body.description.strip() or None,
                "inn": body.inn.strip(),
                "id": employer["id"],
            },
        )
    return JSONResponse({"status": "saved"})


class VacancyIn(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    trade_code: str
    quantity: int = Field(ge=1, le=500)
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    city: str = Field(default="", max_length=120)
    address: str = Field(default="", max_length=300)
    map_url: str = Field(default="", max_length=300)
    start_date: date | None = None
    deadline: date | None = None
    duration_months: int | None = Field(default=None, ge=1, le=60)
    schedule: str = Field(default="", max_length=120)
    salary_from: float | None = Field(default=None, ge=0)
    salary_to: float | None = Field(default=None, ge=0)
    currency: str = "UZS"
    as_brigade: bool = False
    duties: str = Field(default="", max_length=3000)
    conditions: str = Field(default="", max_length=2000)
    requirements: dict[str, Any] = Field(default_factory=dict)
    benefits: dict[str, bool] = Field(default_factory=dict)


def _clean_requirements(raw: dict[str, Any]) -> dict[str, Any] | None:
    out: dict[str, Any] = {}
    level = raw.get("min_level")
    if level:
        if level not in LEVELS:
            return None
        out["min_level"] = level
    years = raw.get("min_experience_years")
    if years not in (None, ""):
        try:
            value = float(years)
        except (TypeError, ValueError):
            return None
        if not 0 <= value <= 40:
            return None
        out["min_experience_years"] = value
    if raw.get("certificate_required"):
        out["certificate_required"] = True
    language = str(raw.get("language") or "").strip()[:5]
    if language:
        out["language"] = language
        try:
            level_value = int(raw.get("language_level") or 0)
        except (TypeError, ValueError):
            return None
        if not 0 <= level_value <= 6:
            return None
        out["language_level"] = level_value
    notes = str(raw.get("notes") or "").strip()
    if len(notes) > 800:
        return None
    if notes:
        out["notes"] = notes
    return out


@router.post("")
async def post_vacancy(body: VacancyIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    if body.currency not in CURRENCIES:
        return problem(422, "VALIDATION", "Valyuta noto'g'ri", "Ro'yxatdagi valyutani tanlang.")
    if body.salary_from is not None and body.salary_to is not None and body.salary_from > body.salary_to:
        return problem(422, "VALIDATION", "Maosh oralig'i noto'g'ri", "Boshlang'ich maosh yuqori chegaradan katta.")
    if body.start_date and body.deadline and body.deadline > body.start_date:
        return problem(422, "VALIDATION", "Sanalar noto'g'ri", "Ariza qabul qilish muddati ishga kirish sanasidan oldin bo'lishi kerak.")
    if body.map_url and not re.match(r"^https?://\S+$", body.map_url):
        return problem(422, "VALIDATION", "Xarita havolasi noto'g'ri", "Havola http:// yoki https:// bilan boshlanishi kerak.")
    requirements = _clean_requirements(body.requirements)
    if requirements is None:
        return problem(422, "VALIDATION", "Talablar noto'g'ri", "Daraja, tajriba yoki til darajasini tekshiring.")
    benefits = {key: bool(value) for key, value in body.benefits.items() if key in BENEFITS and value}
    async with _engine(request).begin() as conn:
        employer = await _employer(conn, user_id)
        if employer is None:
            return _forbidden("Bu amal ish beruvchilar uchun.")
        if not employer["verified"]:
            return problem(403, "NOT_VERIFIED", "Tekshiruv kutilmoqda", "Kompaniya tasdiqlangandan keyin vakansiya joylanadi.")
        foreign = employer["kind"] == "FOREIGN"
        destination = None
        if foreign:
            if not body.country_code:
                return problem(422, "VALIDATION", "Davlat kerak", "Davlatni tanlang.")
            destination = (await conn.execute(text("SELECT id FROM destinations WHERE country_code = :c AND is_active"), {"c": body.country_code.upper()})).scalar()
            if destination is None:
                return problem(404, "NOT_FOUND", "Davlat ro'yxatda yo'q", "Hamkor davlatni tanlang.")
            if not (body.address.strip() and body.city.strip()):
                return problem(422, "VALIDATION", "Manzil kerak", "Ish joyining shahri va aniq manzilini kiriting.")
        trade = (await conn.execute(text("SELECT id FROM trades WHERE code = :c AND is_active"), {"c": body.trade_code})).scalar()
        if trade is None:
            return problem(404, "NOT_FOUND", "Kasb topilmadi", "Kasbni qayta tanlang.")
        has_pay = body.salary_from is not None or body.salary_to is not None
        vacancy_id = new_id()
        await conn.execute(
            text(
                """
                INSERT INTO demand_requests (id, employer_id, trade_id, quantity, as_brigade, track, status, destination_id, location,
                    start_date, duration_months, salary_from, salary_to, salary_currency, conditions, title, requirements, duties,
                    benefits, schedule, deadline, city, address, map_url)
                VALUES (:id, :employer, :trade, :quantity, :brigade, CAST(:track AS track_code), 'NEW', :destination, :location,
                    :start, :months, :sfrom, :sto, :currency, :conditions, :title, CAST(:requirements AS jsonb), :duties,
                    CAST(:benefits AS jsonb), :schedule, :deadline, :city, :address, :map)
                """
            ),
            {
                "id": vacancy_id,
                "employer": employer["id"],
                "trade": trade,
                "quantity": body.quantity,
                "brigade": body.as_brigade,
                "track": "FOREIGN" if foreign else "DOMESTIC",
                "destination": destination,
                "location": (body.country_code or "UZ").upper() if foreign else (body.city.strip() or "Uychi"),
                "start": body.start_date,
                "months": body.duration_months,
                "sfrom": body.salary_from,
                "sto": body.salary_to,
                "currency": body.currency if has_pay else None,
                "conditions": body.conditions.strip() or None,
                "title": body.title.strip(),
                "requirements": json.dumps(requirements, ensure_ascii=False),
                "duties": body.duties.strip() or None,
                "benefits": json.dumps(benefits),
                "schedule": body.schedule.strip() or None,
                "deadline": body.deadline,
                "city": body.city.strip() or None,
                "address": body.address.strip() or None,
                "map": body.map_url.strip() or None,
            },
        )
        watchers = await conn.execute(
            text("SELECT DISTINCT user_id FROM user_roles WHERE role = :role"),
            {"role": "agency_officer" if foreign else "employment_officer"},
        )
        for (watcher,) in watchers.all():
            await notify(conn, watcher, "vacancy_new", {"vacancy_id": str(vacancy_id), "employer": str(employer["name"])})
    return JSONResponse({"id": str(vacancy_id), "status": "NEW"})


@router.post("/{vacancy_id}/close")
async def close_vacancy(vacancy_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        employer = await _employer(conn, user_id)
        if employer is None:
            return _forbidden("Bu amal ish beruvchilar uchun.")
        done = await conn.execute(
            text("UPDATE demand_requests SET status = 'CLOSED' WHERE id = :id AND employer_id = :e AND status <> 'CLOSED' RETURNING id"),
            {"id": vacancy_id, "e": employer["id"]},
        )
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Vakansiya topilmadi", "Vakansiya yo'q yoki allaqachon yopilgan.")
    return JSONResponse({"status": "CLOSED"})


# ---------------------------------------------------------------- documents


def _sniff(raw: bytes) -> tuple[str, str] | None:
    """Accept only PDF, JPEG and PNG, judged by the file's own bytes rather than its name."""
    if raw.startswith(b"%PDF-"):
        return "application/pdf", "pdf"
    if raw.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", "jpg"
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", "png"
    return None


@router.post("/documents")
async def upload_document(request: Request, kind: str = "OTHER", filename: str = "document") -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    if kind not in DOC_KINDS:
        return problem(422, "VALIDATION", "Hujjat turi noto'g'ri", "Ro'yxatdagi turni tanlang.")
    raw = await request.body()
    if not raw or len(raw) > MAX_DOC:
        return problem(413, "DOC_SIZE", "Fayl hajmi mos emas", "Fayl 5 MB dan oshmasligi kerak.")
    sniffed = _sniff(raw)
    if sniffed is None:
        return problem(422, "DOC_TYPE", "Fayl turi mos emas", "PDF, JPG yoki PNG yuklang.")
    mime, ext = sniffed
    safe = re.sub(r"[^A-Za-z0-9._ -]", "_", filename)[:80] or "document"
    if not safe.lower().endswith(f".{ext}"):
        safe = f"{safe}.{ext}"
    async with _engine(request).begin() as conn:
        employer = await _employer(conn, user_id)
        if employer is None:
            return _forbidden("Bu amal ish beruvchilar uchun.")
        count = (await conn.execute(text("SELECT count(*) FROM employer_documents WHERE employer_id = :e"), {"e": employer["id"]})).scalar_one()
        if int(count) >= 20:
            return problem(409, "DOC_LIMIT", "Hujjatlar ko'p", "20 tadan ortiq hujjat yuklab bo'lmaydi.")
        doc_id = new_id()
        await conn.execute(
            text(
                """
                INSERT INTO employer_documents (id, employer_id, kind, filename, mime, size_bytes, content, uploaded_by)
                VALUES (:id, :e, :kind, :name, :mime, :size, :content, :by)
                """
            ),
            {"id": doc_id, "e": employer["id"], "kind": kind, "name": safe, "mime": mime, "size": len(raw), "content": raw, "by": user_id},
        )
    return JSONResponse({"id": str(doc_id), "filename": safe})


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        employer = await _employer(conn, user_id)
        if employer is None:
            return _forbidden("Bu amal ish beruvchilar uchun.")
        done = await conn.execute(
            text("DELETE FROM employer_documents WHERE id = :id AND employer_id = :e RETURNING id"), {"id": doc_id, "e": employer["id"]}
        )
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Hujjat topilmadi", "Hujjat yo'q.")
    return JSONResponse({"status": "deleted"})


@router.get("/documents/{doc_id}/file", response_model=None)
async def download_document(doc_id: uuid.UUID, request: Request) -> Response:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        row = (
            await conn.execute(text("SELECT employer_id, filename, mime, content FROM employer_documents WHERE id = :id"), {"id": doc_id})
        ).mappings().first()
        if row is None:
            return problem(404, "NOT_FOUND", "Hujjat topilmadi", "Hujjat yo'q.")
        mine = await _employer(conn, user_id)
        allowed = (mine is not None and mine["id"] == row["employer_id"]) or bool(await _roles(conn, user_id) & AGENCY_ROLES)
        if not allowed:
            return _forbidden("Bu hujjatni ko'rish huquqingiz yo'q.")
    return Response(
        content=bytes(row["content"]),
        media_type=row["mime"],
        headers={"Content-Disposition": f'inline; filename="{row["filename"]}"', "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store"},
    )


# ---------------------------------------------------------------- agency: foreign firms


@router.get("/firms")
async def firms(request: Request) -> JSONResponse:
    """Foreign firms with their legal data and documents, for the migration agency."""
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).connect() as conn:
        if not await _roles(conn, user_id) & (AGENCY_ROLES | {"migration_observer"}):
            return _forbidden("Bu bo'lim migratsiya agentligi uchun.")
        rows = await conn.execute(
            text(
                """
                SELECT e.id::text AS id, e.name, e.country_code, e.verified_at IS NOT NULL AS verified, e.legal_name, e.registration_no,
                       e.address, e.website, e.contact_person, e.contact_email, e.contact_phone, e.description,
                       (SELECT count(*) FROM demand_requests r WHERE r.employer_id = e.id) AS vacancies,
                       (SELECT coalesce(sum(r.quantity), 0) FROM demand_requests r WHERE r.employer_id = e.id AND r.status NOT IN ('CLOSED', 'CANCELLED', 'MATCHED')) AS places
                FROM employers e WHERE e.kind = 'FOREIGN' ORDER BY e.name
                """
            )
        )
        items = []
        for r in rows.mappings():
            docs = await conn.execute(
                text("SELECT id::text AS id, kind, filename, size_bytes, checked_at IS NOT NULL AS checked FROM employer_documents WHERE employer_id = :e ORDER BY created_at"),
                {"e": r["id"]},
            )
            items.append(
                {
                    "id": r["id"],
                    "name": r["name"],
                    "country": str(r["country_code"]).strip(),
                    "verified": bool(r["verified"]),
                    "vacancies": int(r["vacancies"]),
                    "places": int(r["places"]),
                    "legal": {k: str(r[k] or "") for k in ("legal_name", "registration_no", "address", "website", "contact_person", "contact_email", "contact_phone", "description")},
                    "documents": [dict(d) for d in docs.mappings()],
                }
            )
    return JSONResponse(items)


class VerifyIn(BaseModel):
    verified: bool


@router.post("/firms/{employer_id}/verify")
async def verify_firm(employer_id: uuid.UUID, body: VerifyIn, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        if not await _roles(conn, user_id) & AGENCY_ROLES:
            return _forbidden("Firmani tasdiqlash migratsiya agentligi xodimiga tegishli.")
        if body.verified:
            checked = (
                await conn.execute(
                    text("SELECT count(*) FILTER (WHERE kind = 'REGISTRATION') AS reg, count(*) FILTER (WHERE checked_at IS NULL) AS unchecked FROM employer_documents WHERE employer_id = :e"),
                    {"e": employer_id},
                )
            ).mappings().one()
            if int(checked["reg"]) == 0:
                return problem(409, "NO_REGISTRATION", "Hujjat yetarli emas", "Tasdiqlashdan oldin ro'yxatdan o'tganlik guvohnomasi yuklangan bo'lishi kerak.")
        done = await conn.execute(
            text("UPDATE employers SET verified_at = CASE WHEN :v THEN coalesce(verified_at, now()) ELSE NULL END, verified_by = :by WHERE id = :id AND kind = 'FOREIGN' RETURNING id"),
            {"v": body.verified, "by": user_id, "id": employer_id},
        )
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Firma topilmadi", "Bunday xorijiy firma yo'q.")
        members = await conn.execute(text("SELECT user_id FROM employer_members WHERE employer_id = :e"), {"e": employer_id})
        for (member,) in members.all():
            await notify(conn, member, "firm_verified", {"verified": body.verified})
    return JSONResponse({"verified": body.verified})


@router.post("/documents/{doc_id}/check")
async def check_document(doc_id: uuid.UUID, request: Request) -> JSONResponse:
    user_id = _user_id(request)
    if user_id is None:
        return _unauth()
    async with _engine(request).begin() as conn:
        if not await _roles(conn, user_id) & AGENCY_ROLES:
            return _forbidden("Hujjatni tekshirish migratsiya agentligi xodimiga tegishli.")
        done = await conn.execute(
            text("UPDATE employer_documents SET checked_by = :by, checked_at = now() WHERE id = :id RETURNING id"), {"by": user_id, "id": doc_id}
        )
        if done.first() is None:
            return problem(404, "NOT_FOUND", "Hujjat topilmadi", "Hujjat yo'q.")
    return JSONResponse({"checked": True})
