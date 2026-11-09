import uuid

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.security import bearer_from_request, new_id, problem, read_access_token

router = APIRouter(prefix="/api/v1/admin", tags=["admin-education"])


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


async def _require_admin(request: Request) -> uuid.UUID | JSONResponse:
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
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu bo'lim admin uchun.")
    return user_id


def _label(value: object) -> str:
    if isinstance(value, dict):
        return str(value.get("uz-Latn") or "")
    return ""


@router.get("/courses")
async def courses(request: Request) -> JSONResponse:
    gate = await _require_admin(request)
    if isinstance(gate, JSONResponse):
        return gate
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT c.id::text AS id, c.title, c.track::text AS track,
                       c.start_date, c.end_date, t.name AS trade_name
                FROM courses c JOIN trades t ON t.id = c.trade_id
                ORDER BY c.start_date
                """
            )
        )
    return JSONResponse(
        [
            {
                "id": item["id"],
                "title": _label(item["title"]),
                "trade": _label(item["trade_name"]),
                "track": item["track"],
                "start_date": item["start_date"].isoformat(),
                "end_date": item["end_date"].isoformat(),
            }
            for item in result.mappings()
        ]
    )


@router.get("/groups")
async def groups(request: Request) -> JSONResponse:
    """Admin sees every group; a mentor sees only their own."""
    user_id = _user_id(request)
    if user_id is None:
        return problem(401, "UNAUTHORIZED", "Kirish talab qilinadi", "Avval tizimga kiring.")
    engine = _engine(request)
    async with engine.connect() as conn:
        roles = {
            str(row["role"])
            for row in (
                await conn.execute(
                    text("SELECT role::text AS role FROM user_roles WHERE user_id = :id"), {"id": user_id}
                )
            ).mappings()
        }
        if not roles & {"admin", "mentor"}:
            return problem(403, "FORBIDDEN", "Ruxsat yo'q", "Bu bo'lim ustoz yoki admin uchun.")
        only_mine = "admin" not in roles
        result = await conn.execute(
            text(
                """
                SELECT g.id::text AS id, g.code, g.max_students, u.full_name AS mentor,
                       count(e.id) FILTER (WHERE e.status IN ('ACTIVE','SUSPENDED')) AS students
                FROM groups g
                JOIN users u ON u.id = g.mentor_user_id
                LEFT JOIN enrollments e ON e.group_id = g.id
                WHERE (NOT CAST(:only_mine AS boolean) OR g.mentor_user_id = :id)
                GROUP BY g.id, u.full_name
                ORDER BY g.code
                """
            ),
            {"only_mine": only_mine, "id": user_id},
        )
    return JSONResponse(
        [
            {
                "id": item["id"],
                "code": item["code"],
                "mentor": item["mentor"],
                "students": int(item["students"]),
                "max_students": int(item["max_students"]),
            }
            for item in result.mappings()
        ]
    )


class GroupIn(BaseModel):
    course_id: uuid.UUID
    mentor_user_id: uuid.UUID
    code: str = Field(min_length=3, max_length=30)
    max_students: int = Field(default=10, ge=1, le=10)


@router.post("/groups")
async def create_group(body: GroupIn, request: Request) -> JSONResponse:
    gate = await _require_admin(request)
    if isinstance(gate, JSONResponse):
        return gate
    engine = _engine(request)
    try:
        async with engine.begin() as conn:
            await conn.execute(
                text(
                    """
                    INSERT INTO groups (id, course_id, code, mentor_user_id, max_students, schedule)
                    VALUES (:id, :course_id, :code, :mentor_user_id, :max_students, CAST(:schedule AS jsonb))
                    """
                ),
                {
                    "id": new_id(),
                    "course_id": body.course_id,
                    "code": body.code,
                    "mentor_user_id": body.mentor_user_id,
                    "max_students": body.max_students,
                    "schedule": '{"days":["Du","Ch","Ju"],"time":"09:00-13:00"}',
                },
            )
    except Exception as exc:  # noqa: BLE001
        message = str(exc)
        if "MENTOR_FULL" in message or "GROUP_FULL" in message:
            return problem(409, "MENTOR_FULL", "Ustoz to'lgan", "Bir ustozga ko'pi bilan 10 tinglovchi.")
        return problem(409, "GROUP_FULL", "Guruh yozilmadi", "Kod band yoki cheklov buzildi.")
    return JSONResponse({"status": "created"})


@router.get("/users")
async def users(request: Request) -> JSONResponse:
    gate = await _require_admin(request)
    if isinstance(gate, JSONResponse):
        return gate
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT u.id::text AS id, u.full_name, u.phone,
                       coalesce(string_agg(r.role::text, ','), '') AS roles
                FROM users u
                LEFT JOIN user_roles r ON r.user_id = u.id
                WHERE u.deleted_at IS NULL
                GROUP BY u.id
                ORDER BY u.full_name
                LIMIT 100
                """
            )
        )
    return JSONResponse(
        [
            {
                "id": item["id"],
                "full_name": item["full_name"],
                "roles": [role for role in str(item["roles"]).split(",") if role],
            }
            for item in result.mappings()
        ]
    )


class RoleIn(BaseModel):
    role: str


@router.post("/users/{user_id}/roles")
async def grant_role(user_id: uuid.UUID, body: RoleIn, request: Request) -> JSONResponse:
    gate = await _require_admin(request)
    if isinstance(gate, JSONResponse):
        return gate
    allowed = {"mentor", "student", "admin", "curator", "coordinator"}
    if body.role not in allowed:
        return problem(422, "VALIDATION", "Rol noto'g'ri", "Bu rolni berib bo'lmaydi.")
    engine = _engine(request)
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                INSERT INTO user_roles (id, user_id, role)
                SELECT :id, :user_id, CAST(:role AS role_code)
                WHERE NOT EXISTS (
                  SELECT 1 FROM user_roles
                  WHERE user_id = :user_id AND role = CAST(:role AS role_code)
                )
                """
            ),
            {"id": new_id(), "user_id": user_id, "role": body.role},
        )
    return JSONResponse({"status": "ok"})


@router.get("/orders")
async def orders(request: Request) -> JSONResponse:
    gate = await _require_admin(request)
    if isinstance(gate, JSONResponse):
        return gate
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT o.id::text AS id, o.buyer_name, o.quantity, o.status::text AS status,
                       p.name AS product_name
                FROM order_requests o
                JOIN products p ON p.id = o.product_id
                ORDER BY o.created_at DESC
                LIMIT 50
                """
            )
        )
    return JSONResponse(
        [
            {
                "id": item["id"],
                "buyer_name": item["buyer_name"],
                "quantity": float(item["quantity"]),
                "status": item["status"],
                "product": item["product_name"]["uz-Latn"] if isinstance(item["product_name"], dict) else "",
            }
            for item in result.mappings()
        ]
    )


class OrderStatusIn(BaseModel):
    status: str


@router.post("/orders/{order_id}/status")
async def order_status(order_id: uuid.UUID, body: OrderStatusIn, request: Request) -> JSONResponse:
    gate = await _require_admin(request)
    if isinstance(gate, JSONResponse):
        return gate
    if body.status not in {"NEW", "CONTACTED", "DONE", "CANCELLED"}:
        return problem(422, "VALIDATION", "Holat noto'g'ri", "NEW, CONTACTED, DONE yoki CANCELLED.")
    engine = _engine(request)
    async with engine.begin() as conn:
        updated = await conn.execute(
            text(
                """
                UPDATE order_requests
                SET status = CAST(:status AS order_status)
                WHERE id = :id
                RETURNING id
                """
            ),
            {"id": order_id, "status": body.status},
        )
        if updated.first() is None:
            return problem(404, "NOT_FOUND", "Topilmadi", "Buyurtma yo'q.")
    return JSONResponse({"status": body.status})


@router.get("/employers")
async def employers(request: Request) -> JSONResponse:
    gate = await _require_admin(request)
    if isinstance(gate, JSONResponse):
        return gate
    engine = _engine(request)
    async with engine.connect() as conn:
        rows = await conn.execute(
            text(
                """
                SELECT id::text AS id, name, inn, verified_at IS NOT NULL AS verified
                FROM employers ORDER BY name
                """
            )
        )
    return JSONResponse([dict(item) for item in rows.mappings()])


@router.post("/employers/{employer_id}/verify")
async def verify_employer(employer_id: uuid.UUID, request: Request) -> JSONResponse:
    gate = await _require_admin(request)
    if isinstance(gate, JSONResponse):
        return gate
    engine = _engine(request)
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                UPDATE employers SET verified_at = now(), verified_by = :user_id WHERE id = :id
                """
            ),
            {"id": employer_id, "user_id": gate},
        )
    return JSONResponse({"verified": True})
