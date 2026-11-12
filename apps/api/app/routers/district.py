"""District administration (hokimlik) dashboard: one read-only picture of the whole project in the district.
Counts only; no names or phone numbers.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.doc_i18n import lang_of, pick
from app.security import bearer_from_request, problem, read_access_token

router = APIRouter(prefix="/api/v1/district", tags=["district"])

DISTRICT_ROLES = {"district_official", "admin", "superadmin"}
LEADER_SLUG = "uychi-hokimlik"


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


def _num(value: object) -> int:
    return int(round(float(str(value or 0))))


@router.get("/overview")
async def overview(request: Request, lang: str | None = None) -> JSONResponse:
    code = lang_of(lang or request.cookies.get("ub_locale"))
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    async with _engine(request).connect() as conn:
        roles = {str(r["role"]) for r in (await conn.execute(text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"), {"id": user_id})).mappings()}
        if not roles & DISTRICT_ROLES:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu bo'lim hokimlik vakillari uchun.")
        kpi = (
            await conn.execute(
                text(
                    """
                    SELECT
                      (SELECT count(*) FROM applications WHERE status <> 'DRAFT') AS applicants,
                      (SELECT count(*) FROM applications WHERE status IN ('ACCEPTED', 'ENROLLED')) AS accepted,
                      (SELECT count(*) FROM enrollments WHERE status = 'ACTIVE') AS studying,
                      (SELECT count(*) FROM certificates WHERE status = 'ISSUED') AS certified,
                      (SELECT count(*) FROM placements) AS employed,
                      (SELECT count(*) FROM placements WHERE kind = 'ABROAD') AS abroad,
                      (SELECT count(*) FROM demand_requests WHERE track = 'DOMESTIC' AND status NOT IN ('CLOSED', 'CANCELLED', 'MATCHED')) AS open_local,
                      (SELECT count(*) FROM demand_requests WHERE track = 'FOREIGN' AND status NOT IN ('CLOSED', 'CANCELLED', 'MATCHED')) AS open_foreign,
                      (SELECT count(*) FROM mahallas) AS mahallas,
                      (SELECT count(*) FROM groups) AS groups,
                      (SELECT count(DISTINCT mentor_user_id) FROM groups) AS teachers,
                      (SELECT 100.0 * count(*) FILTER (WHERE status IN ('PRESENT', 'LATE')) / nullif(count(*), 0) FROM attendance) AS attendance,
                      (SELECT avg(score) FROM assessments) AS score,
                      (SELECT 100.0 * count(*) FILTER (WHERE passed) / nullif(count(*), 0) FROM assessments) AS pass_rate
                    """
                )
            )
        ).mappings().one()
        per = await conn.execute(
            text(
                """
                SELECT m.name,
                       count(DISTINCT p.id) AS people,
                       count(DISTINCT p.id) FILTER (WHERE EXISTS (SELECT 1 FROM enrollments e WHERE e.student_user_id = p.user_id AND e.status = 'ACTIVE')) AS studying,
                       count(DISTINCT p.id) FILTER (WHERE EXISTS (SELECT 1 FROM certificates c WHERE c.person_id = p.id AND c.status = 'ISSUED')) AS certified,
                       count(DISTINCT p.id) FILTER (WHERE EXISTS (SELECT 1 FROM placements pl WHERE pl.worker_user_id = p.user_id)) AS employed
                FROM mahallas m LEFT JOIN persons p ON p.mahalla_id = m.id
                GROUP BY m.id, m.name ORDER BY people DESC, m.name->>'uz-Latn'
                """
            )
        )
        mahallas: list[dict[str, Any]] = [{"name": pick(r["name"], code), **{k: int(r[k]) for k in ("people", "studying", "certified", "employed")}} for r in per.mappings()]
        months = await conn.execute(
            text(
                """
                WITH m AS (SELECT to_char(d, 'YYYY-MM') AS month FROM generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') d)
                SELECT m.month,
                       (SELECT count(*) FROM applications a WHERE a.status <> 'DRAFT' AND to_char(a.created_at, 'YYYY-MM') = m.month) AS applications,
                       (SELECT count(*) FROM certificates c WHERE c.status = 'ISSUED' AND to_char(c.issued_at, 'YYYY-MM') = m.month) AS certificates
                FROM m ORDER BY m.month
                """
            )
        )
        monthly = [{"month": r["month"], "applications": int(r["applications"]), "certificates": int(r["certificates"])} for r in months.mappings()]
        objects = await conn.execute(text("SELECT name, status::text AS status, progress_pct FROM construction_objects WHERE is_public ORDER BY progress_pct DESC"))
        object_rows = [{"name": pick(r["name"], code), "status": r["status"], "progress": int(r["progress_pct"])} for r in objects.mappings()]
        partners = await conn.execute(text("SELECT name, kind::text AS kind, status::text AS status, slug FROM partners ORDER BY sort_order, name->>'uz-Latn'"))
        partner_rows = [{"name": pick(r["name"], code), "kind": r["kind"], "status": r["status"], "slug": r["slug"]} for r in partners.mappings()]
        at_risk = (
            await conn.execute(
                text(
                    """
                    SELECT count(*) FROM (
                      SELECT e.id FROM enrollments e JOIN attendance a ON a.enrollment_id = e.id WHERE e.status = 'ACTIVE'
                      GROUP BY e.id HAVING 100.0 * count(*) FILTER (WHERE a.status IN ('PRESENT', 'LATE')) / count(*) < 80
                    ) x
                    """
                )
            )
        ).scalar_one()
        no_candidates = (
            await conn.execute(
                text(
                    """
                    SELECT count(*) FROM demand_requests r
                    WHERE r.status NOT IN ('CLOSED', 'CANCELLED', 'MATCHED') AND r.created_at < now() - interval '7 days'
                      AND NOT EXISTS (SELECT 1 FROM request_candidates c WHERE c.request_id = r.id)
                    """
                )
            )
        ).scalar_one()
        awaiting = (
            await conn.execute(
                text(
                    """
                    SELECT count(*) FROM certificates c WHERE c.status = 'ISSUED'
                      AND NOT EXISTS (SELECT 1 FROM certificate_signatures s WHERE s.certificate_id = c.id AND s.partner_slug = :slug)
                    """
                ),
                {"slug": LEADER_SLUG},
            )
        ).scalar_one()
    applicants = int(kpi["applicants"])
    return JSONResponse(
        {
            "kpi": {
                **{k: int(kpi[k]) for k in ("applicants", "accepted", "studying", "certified", "employed", "abroad", "open_local", "open_foreign", "mahallas", "groups", "teachers")},
                "attendance": None if kpi["attendance"] is None else _num(kpi["attendance"]),
                "score": None if kpi["score"] is None else _num(kpi["score"]),
                "pass_rate": None if kpi["pass_rate"] is None else _num(kpi["pass_rate"]),
            },
            "funnel": [
                {"key": "applicants", "value": applicants},
                {"key": "accepted", "value": int(kpi["accepted"])},
                {"key": "studying", "value": int(kpi["studying"])},
                {"key": "certified", "value": int(kpi["certified"])},
                {"key": "employed", "value": int(kpi["employed"])},
            ],
            "mahallas": mahallas,
            "covered": sum(1 for m in mahallas if m["people"] > 0),
            "monthly": monthly,
            "objects": object_rows,
            "partners": partner_rows,
            "alerts": {
                "uncovered_mahallas": sum(1 for m in mahallas if m["people"] == 0),
                "at_risk": int(at_risk),
                "vacancies_without_candidates": int(no_candidates),
                "partners_pending": sum(1 for p in partner_rows if p["status"] != "SIGNED"),
                "awaiting_signature": int(awaiting),
            },
        }
    )
