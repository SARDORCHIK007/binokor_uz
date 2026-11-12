from contextvars import ContextVar

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import get_settings
from app.notify import send_telegram
from app.ratelimit import client_ip, too_many
from app.routers.portfolio import public_portfolio, reviews_summary
from app.rules import public_stats
from app.security import new_id, problem

router = APIRouter(prefix="/api/v1/public", tags=["public"])


def _engine(request: Request) -> AsyncEngine:
    engine: AsyncEngine = request.app.state.engine
    return engine


_LOCALE: ContextVar[str] = ContextVar("ub_locale", default="uz-Latn")


def set_public_locale(value: str) -> None:
    if value in {"uz-Latn", "uz-Cyrl", "ru", "en", "de", "ar"}:
        _LOCALE.set(value)


def _title(value: object) -> str:
    if isinstance(value, dict):
        locale = _LOCALE.get()
        text_value = value.get(locale) or value.get("uz-Latn")
        return str(text_value) if text_value else ""
    return ""


@router.get("/home")
async def home(request: Request) -> JSONResponse:
    engine = _engine(request)
    async with engine.connect() as conn:
        stats = await conn.execute(
            text(
                """
                SELECT
                  (SELECT count(*) FROM applications WHERE status <> 'DRAFT') AS applicants,
                  (SELECT count(*) FROM enrollments WHERE status = 'ACTIVE') AS listeners,
                  (SELECT count(*) FROM certificates WHERE status = 'ISSUED') AS certified,
                  (SELECT count(*) FROM placements) AS employed,
                  (SELECT count(*) FROM employers WHERE country_code <> 'UZ') AS foreign_employers
                """
            )
        )
        row = stats.mappings().one()
        trades = await conn.execute(
            text(
                """
                SELECT t.code, t.name, t.domestic_months, t.foreign_lang_months,
                       (SELECT count(*) FROM groups g
                        JOIN courses c ON c.id = g.course_id
                        WHERE c.trade_id = t.id) AS group_count
                FROM trades t WHERE t.is_active ORDER BY t.code
                """
            )
        )
        destinations = await conn.execute(
            text("SELECT country_code, name, lang_code, notes FROM destinations WHERE is_active")
        )
        partners = await conn.execute(
            text(
                """
                SELECT name, status::text AS status, logo_permission, kind::text AS kind, slug,
                       role_description, signed_at::text AS signed_at
                FROM partners ORDER BY sort_order, name->>'uz-Latn'
                """
            )
        )
    return JSONResponse(
        {
            "stats": public_stats(
                {
                    key: int(row[key])
                    for key in ("applicants", "listeners", "certified", "employed", "foreign_employers")
                }
            ),
            "trades": [
                {
                    "code": item["code"],
                    "name": _title(item["name"]),
                    "domestic_months": item["domestic_months"],
                    "foreign_lang_months": item["foreign_lang_months"],
                    "group_count": int(item["group_count"]),
                }
                for item in trades.mappings()
            ],
            "destinations": [
                {
                    "code": item["country_code"].strip(),
                    "name": _title(item["name"]),
                    "language": item["lang_code"],
                    "notes": _title(item["notes"]),
                }
                for item in destinations.mappings()
            ],
            "partners": [
                {
                    "name": _title(item["name"]),
                    "status": item["status"],
                    "show_logo": bool(item["logo_permission"]) and item["status"] == "SIGNED",
                    "kind": item["kind"],
                    "slug": item["slug"],
                    "role": _title(item["role_description"]) if item["role_description"] else "",
                    "signed_at": item["signed_at"],
                }
                for item in partners.mappings()
            ],
        }
    )


# What each organisation does on the platform. Known partners are matched by slug, others fall back to their kind.
PARTNER_FUNCTIONS = {
    "uychi-hokimlik": "coordination",
    "namdtu": "education",
    "tuman-bandlik": "employment",
    "tashqi-mehnat": "abroad",
    "mahalliy-ishlab-chiqaruvchi": "materials",
}
KIND_FUNCTIONS = {
    "GOV": "coordination",
    "EDU": "education",
    "AGENCY": "abroad",
    "PRODUCER": "materials",
    "EMPLOYER": "employment",
    "INTL": "abroad",
}

_PARTNER_METRICS = {
    "coordination": {
        "mahallas": "SELECT count(*) FROM mahallas",
        "objects": "SELECT count(*) FROM construction_objects WHERE is_public",
        "applicants": "SELECT count(*) FROM applications WHERE status <> 'DRAFT'",
        "listeners": "SELECT count(*) FROM enrollments WHERE status = 'ACTIVE'",
    },
    "education": {
        "trades": "SELECT count(*) FROM trades WHERE is_active",
        "groups": "SELECT count(*) FROM groups",
        "listeners": "SELECT count(*) FROM enrollments WHERE status = 'ACTIVE'",
        "certified": "SELECT count(*) FROM certificates WHERE status = 'ISSUED'",
    },
    "employment": {
        "workers": "SELECT count(*) FROM worker_profiles",
        "requests": "SELECT count(*) FROM demand_requests",
        "employers": "SELECT count(*) FROM employers WHERE verified_at IS NOT NULL",
        "employed": "SELECT count(*) FROM placements",
    },
    "abroad": {
        "foreign_employers": "SELECT count(*) FROM employers WHERE country_code <> 'UZ'",
        "abroad": "SELECT count(*) FROM placements WHERE kind = 'ABROAD'",
        "brigades": "SELECT count(*) FROM brigades",
    },
    "materials": {
        "producers": "SELECT count(*) FROM producers",
        "products": "SELECT count(*) FROM products WHERE is_published",
        "categories": "SELECT count(*) FROM product_categories",
    },
}


@router.get("/partners/{slug}")
async def partner_profile(slug: str, request: Request) -> JSONResponse:
    """One organisation's public page: who they are, what they do here and live figures from the database."""
    async with _engine(request).connect() as conn:
        row = (
            await conn.execute(
                text(
                    """
                    SELECT name, kind::text AS kind, status::text AS status, logo_permission, slug,
                           role_description, signed_at::text AS signed_at, country_code
                    FROM partners WHERE slug = :slug
                    """
                ),
                {"slug": slug},
            )
        ).mappings().first()
        if row is None:
            return problem(404, "NOT_FOUND", "Hamkor topilmadi", "Bunday hamkor tashkilot ro'yxatda yo'q.")
        function = PARTNER_FUNCTIONS.get(slug) or KIND_FUNCTIONS.get(str(row["kind"]), "coordination")
        metrics: dict[str, int] = {}
        for key, query in _PARTNER_METRICS.get(function, {}).items():
            metrics[key] = int((await conn.execute(text(query))).scalar_one())
        signed = int(
            (
                await conn.execute(
                    text("SELECT count(*) FROM certificate_signatures WHERE partner_slug = :slug"), {"slug": slug}
                )
            ).scalar_one()
        )
        recent = (
            await conn.execute(
                text(
                    """
                    SELECT c.number, cs.signed_at::date::text AS day
                    FROM certificate_signatures cs JOIN certificates c ON c.id = cs.certificate_id
                    WHERE cs.partner_slug = :slug AND c.number IS NOT NULL
                    ORDER BY cs.signed_at DESC LIMIT 5
                    """
                ),
                {"slug": slug},
            )
        ).mappings().all()
        destinations = []
        if function == "abroad":
            rows = await conn.execute(text("SELECT country_code, name, lang_code FROM destinations WHERE is_active ORDER BY country_code"))
            destinations = [
                {"code": str(d["country_code"]).strip(), "name": _title(d["name"]), "language": d["lang_code"]}
                for d in rows.mappings()
            ]
    return JSONResponse(
        {
            "slug": row["slug"],
            "name": _title(row["name"]),
            "kind": row["kind"],
            "status": row["status"],
            "role": _title(row["role_description"]) if row["role_description"] else "",
            "signed_at": row["signed_at"],
            "show_logo": bool(row["logo_permission"]) and row["status"] == "SIGNED",
            "function": function,
            "signs": row["status"] == "SIGNED",
            "metrics": metrics,
            "signed_certificates": signed,
            "recent_signed": [{"number": r["number"], "date": r["day"]} for r in recent],
            "destinations": destinations,
        }
    )


@router.get("/trades/{code}")
async def trade(code: str, request: Request) -> JSONResponse:
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT code, name, domestic_months, foreign_lang_months
                FROM trades WHERE code = :code AND is_active
                """
            ),
            {"code": code},
        )
        item = result.mappings().first()
    if item is None:
        return problem(404, "NOT_FOUND", "Kasb topilmadi", "Bu kasb ro'yxatda yo'q.")
    return JSONResponse(
        {
            "code": item["code"],
            "name": _title(item["name"]),
            "domestic_months": item["domestic_months"],
            "foreign_lang_months": item["foreign_lang_months"],
        }
    )


@router.get("/workers")
async def workers(request: Request, trade: str | None = None, q: str | None = None) -> JSONResponse:
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT wp.slug,
                       CASE
                         WHEN coalesce((wp.visibility->>'full_name')::boolean, false) THEN u.full_name
                         ELSE split_part(btrim(u.full_name), ' ', 1)
                       END AS name,
                       t.code AS trade_code,
                       t.name AS trade_name,
                       wp.level::text AS level,
                       wp.availability::text AS availability,
                       wp.rating_avg,
                       wp.verified_hours
                FROM worker_profiles wp
                JOIN users u ON u.id = wp.user_id
                LEFT JOIN trades t ON t.id = wp.primary_trade_id
                WHERE (CAST(:trade AS text) IS NULL OR t.code = CAST(:trade AS text))
                  AND (CAST(:q AS text) IS NULL OR u.full_name ILIKE CAST(:like AS text))
                ORDER BY u.full_name
                """
            ),
            {"trade": trade or None, "q": q or None, "like": f"%{q}%" if q else None},
        )
    return JSONResponse(
        [
            {
                "slug": item["slug"],
                "name": item["name"],
                "trade": _title(item["trade_name"]),
                "trade_code": item["trade_code"],
                "level": item["level"],
                "availability": item["availability"],
                "rating": None if item["rating_avg"] is None else float(item["rating_avg"]),
                "hours": item["verified_hours"],
            }
            for item in result.mappings()
        ]
    )


@router.get("/worker-trades")
async def worker_trades(request: Request) -> JSONResponse:
    """Trades with the number of craftsmen in each; the catalogue opens by trade, never by name."""
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT t.code, t.name, t.domestic_months,
                       (SELECT count(*) FROM worker_profiles wp WHERE wp.primary_trade_id = t.id) AS workers
                FROM trades t ORDER BY t.code
                """
            )
        )
    return JSONResponse(
        [
            {
                "code": item["code"],
                "name": _title(item["name"]),
                "domestic_months": item["domestic_months"],
                "workers": int(item["workers"]),
            }
            for item in result.mappings()
        ]
    )


@router.get("/workers/{slug}")
async def worker(slug: str, request: Request) -> JSONResponse:
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT wp.slug, wp.user_id,
                       coalesce((wp.visibility->>'portfolio')::boolean, true) AS show_portfolio,
                       coalesce((wp.visibility->>'ratings')::boolean, true) AS show_ratings,
                       CASE
                         WHEN coalesce((wp.visibility->>'full_name')::boolean, false)
                           THEN u.full_name
                         ELSE split_part(btrim(u.full_name), ' ', 1)
                       END AS name,
                       t.name AS trade_name,
                       wp.level::text AS level,
                       wp.availability::text AS availability,
                       wp.rating_avg,
                       wp.verified_hours,
                       (
                         SELECT c.number
                         FROM certificates c
                         JOIN persons p ON p.id = c.person_id
                         WHERE p.user_id = wp.user_id AND c.status = 'ISSUED'
                         ORDER BY c.issued_at DESC NULLS LAST
                         LIMIT 1
                       ) AS certificate_number
                FROM worker_profiles wp
                JOIN users u ON u.id = wp.user_id
                LEFT JOIN trades t ON t.id = wp.primary_trade_id
                WHERE wp.slug = :slug
                """
            ),
            {"slug": slug},
        )
        item = result.mappings().first()
        if item is not None:
            portfolio = await public_portfolio(conn, item["user_id"]) if item["show_portfolio"] else []
            reviews = await reviews_summary(conn, item["user_id"]) if item["show_ratings"] else None
    if item is None:
        return problem(404, "NOT_FOUND", "Usta topilmadi", "Bu profil yo'q.")
    return JSONResponse(
        {
            "slug": item["slug"],
            "name": item["name"],
            "trade": _title(item["trade_name"]),
            "level": item["level"],
            "availability": item["availability"],
            "rating": None if item["rating_avg"] is None else float(item["rating_avg"]),
            "hours": item["verified_hours"],
            "certificate_number": item["certificate_number"],
            "portfolio": portfolio,
            "reviews": reviews,
        }
    )


@router.get("/objects")
async def objects(request: Request, status: str | None = None) -> JSONResponse:
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT id::text AS id, name, address, status::text AS status, progress_pct,
                       ST_Y(geom) AS lat, ST_X(geom) AS lon
                FROM construction_objects
                WHERE is_public
                  AND (CAST(:status AS text) IS NULL OR status::text = CAST(:status AS text))
                ORDER BY name->>'uz-Latn'
                """
            ),
            {"status": status or None},
        )
    return JSONResponse(
        [
            {
                "id": item["id"],
                "name": _title(item["name"]),
                "address": item["address"],
                "status": item["status"],
                "progress": item["progress_pct"],
                "lat": float(item["lat"]),
                "lon": float(item["lon"]),
            }
            for item in result.mappings()
        ]
    )


@router.get("/products")
async def products(request: Request, category: str | None = None) -> JSONResponse:
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT p.id::text AS id, p.name, p.unit, p.price, p.in_stock, pr.name AS producer,
                       c.code AS category, c.name AS category_name,
                       (p.price_updated_at IS NULL OR p.price_updated_at < now() - interval '30 days') AS stale
                FROM products p
                JOIN producers pr ON pr.id = p.producer_id
                JOIN product_categories c ON c.id = p.category_id
                WHERE p.is_published
                  AND (CAST(:category AS text) IS NULL OR c.code = CAST(:category AS text))
                ORDER BY p.name->>'uz-Latn'
                """
            ),
            {"category": category or None},
        )
    return JSONResponse(
        [
            {
                "id": item["id"],
                "name": _title(item["name"]),
                "unit": item["unit"],
                "price": None if item["price"] is None else str(item["price"]),
                "in_stock": item["in_stock"],
                "producer": item["producer"],
                "category": item["category"],
                "category_name": _title(item["category_name"]),
                "stale": bool(item["stale"]),
            }
            for item in result.mappings()
        ]
    )


@router.get("/news")
async def news(request: Request) -> JSONResponse:
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT slug, title, published_at
                FROM news WHERE status = 'PUBLISHED'
                ORDER BY published_at DESC
                """
            )
        )
    return JSONResponse(
        [
            {
                "slug": item["slug"],
                "title": _title(item["title"]),
                "published_at": item["published_at"].date().isoformat(),
            }
            for item in result.mappings()
        ]
    )


@router.get("/news/{slug}")
async def news_item(slug: str, request: Request) -> JSONResponse:
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT slug, title, body, published_at
                FROM news WHERE slug = :slug AND status = 'PUBLISHED'
                """
            ),
            {"slug": slug},
        )
        item = result.mappings().first()
    if item is None:
        return problem(404, "NOT_FOUND", "Yangilik topilmadi", "Bu yangilik yo'q.")
    return JSONResponse(
        {
            "slug": item["slug"],
            "title": _title(item["title"]),
            "body": _title(item["body"]),
            "published_at": item["published_at"].date().isoformat(),
        }
    )


@router.get("/pages/{slug}")
async def cms_page(slug: str, request: Request) -> JSONResponse:
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT slug, title, body FROM cms_pages
                WHERE slug = :slug AND status = 'PUBLISHED'
                """
            ),
            {"slug": slug},
        )
        item = result.mappings().first()
    if item is None:
        return problem(404, "NOT_FOUND", "Sahifa topilmadi", "Bu sahifa yo'q.")
    return JSONResponse({"slug": item["slug"], "title": _title(item["title"]), "body": _title(item["body"])})


@router.get("/search")
async def search(request: Request, q: str = "") -> JSONResponse:
    """Live search over public data (FR-SEARCH). Workers match only on their *visible* name."""
    query = q.strip()
    if len(query) < 2:
        return JSONResponse([])
    engine = _engine(request)
    like = f"%{query}%"
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                WITH visible_workers AS (
                    SELECT wp.slug,
                           CASE
                             WHEN coalesce((wp.visibility->>'full_name')::boolean, false) THEN u.full_name
                             ELSE split_part(btrim(u.full_name), ' ', 1)
                           END AS name,
                           t.name AS trade_name
                    FROM worker_profiles wp
                    JOIN users u ON u.id = wp.user_id
                    LEFT JOIN trades t ON t.id = wp.primary_trade_id
                )
                SELECT * FROM (
                    SELECT 1 AS rank, 'trade' AS kind, t.code AS ref,
                           t.name AS title_json, NULL::text AS title, NULL::jsonb AS sub_json
                    FROM trades t
                    WHERE EXISTS (SELECT 1 FROM jsonb_each_text(t.name) n WHERE n.value ILIKE :like)
                       OR t.code ILIKE :like
                    UNION ALL
                    SELECT 2, 'worker', w.slug, NULL, w.name, w.trade_name
                    FROM visible_workers w
                    WHERE w.name ILIKE :like
                       OR EXISTS (SELECT 1 FROM jsonb_each_text(w.trade_name) n WHERE n.value ILIKE :like)
                    UNION ALL
                    SELECT 3, 'product', p.id::text, p.name, NULL, NULL
                    FROM products p
                    WHERE p.is_published
                      AND EXISTS (SELECT 1 FROM jsonb_each_text(p.name) n WHERE n.value ILIKE :like)
                    UNION ALL
                    SELECT 4, 'object', o.id::text, o.name, NULL, NULL
                    FROM construction_objects o
                    WHERE o.is_public
                      AND (EXISTS (SELECT 1 FROM jsonb_each_text(o.name) n WHERE n.value ILIKE :like)
                           OR o.address ILIKE :like)
                ) hits
                ORDER BY rank
                LIMIT 30
                """
            ),
            {"like": like},
        )
        rows = list(result.mappings())
    hrefs = {
        "trade": "/kasblar/{ref}",
        "worker": "/ustalar/{ref}",
        "product": "/materiallar",
        "object": "/obyektlar",
    }
    hits = []
    for item in rows:
        title = item["title"] if item["title"] is not None else _title(item["title_json"])
        hits.append(
            {
                "kind": item["kind"],
                "ref": item["ref"],
                "title": title,
                "subtitle": _title(item["sub_json"]) if item["sub_json"] is not None else "",
                "href": hrefs[item["kind"]].format(ref=item["ref"]),
            }
        )
    return JSONResponse(hits)


@router.get("/brigades")
async def brigades(request: Request) -> JSONResponse:
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT b.id::text AS id, b.name, b.status::text AS status, t.name AS trade_name,
                       count(m.worker_user_id) FILTER (WHERE m.left_at IS NULL) AS members
                FROM brigades b
                JOIN trades t ON t.id = b.trade_id
                LEFT JOIN brigade_members m ON m.brigade_id = b.id
                WHERE b.status = 'READY'
                GROUP BY b.id, t.name
                ORDER BY b.name
                """
            )
        )
    return JSONResponse(
        [
            {
                "id": item["id"],
                "name": item["name"],
                "trade": _title(item["trade_name"]),
                "status": item["status"],
                "members": int(item["members"]),
            }
            for item in result.mappings()
        ]
    )


class OrderBody(BaseModel):
    product_id: str
    buyer_name: str = Field(min_length=2, max_length=120)
    buyer_phone: str = Field(pattern=r"^\+998\d{9}$")
    quantity: float = Field(gt=0, le=100000)
    comment: str = ""


@router.post("/order-requests")
async def create_order(body: OrderBody, request: Request) -> JSONResponse:
    limited = await too_many(request, "order-ip", client_ip(request), limit=10, window_seconds=3600)
    if limited is not None:
        return limited
    if get_settings().app_env != "local":
        return problem(400, "CAPTCHA_REQUIRED", "Tekshiruv kerak", "Buyurtma uchun captcha yoqilmagan.")
    engine = _engine(request)
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                INSERT INTO order_requests (id, product_id, buyer_name, buyer_phone, quantity, comment)
                VALUES (:id, CAST(:product_id AS uuid), :buyer_name, :buyer_phone, :quantity, :comment)
                """
            ),
            {
                "id": new_id(),
                "product_id": body.product_id,
                "buyer_name": body.buyer_name,
                "buyer_phone": body.buyer_phone,
                "quantity": body.quantity,
                "comment": body.comment,
            },
        )
        chat = await conn.execute(
            text(
                """
                SELECT u.telegram_id
                FROM products p
                JOIN producer_members m ON m.producer_id = p.producer_id
                JOIN users u ON u.id = m.user_id
                WHERE p.id = CAST(:product_id AS uuid) AND u.telegram_id IS NOT NULL
                LIMIT 1
                """
            ),
            {"product_id": body.product_id},
        )
        chat_id = chat.scalar()
    if chat_id is not None:
        await send_telegram(int(chat_id), f"Yangi material buyurtmasi: {body.buyer_name}, {body.quantity}")
    return JSONResponse({"status": "NEW"})
