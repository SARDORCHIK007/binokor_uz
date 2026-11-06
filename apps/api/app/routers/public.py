from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.security import problem

router = APIRouter(prefix="/api/v1/public", tags=["public"])


def _engine(request: Request) -> AsyncEngine:
    engine: AsyncEngine = request.app.state.engine
    return engine


def _title(value: object) -> str:
    if isinstance(value, dict):
        text_value = value.get("uz-Latn")
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
                  (SELECT count(*) FROM enrollments WHERE status = 'ACTIVE') AS listeners,
                  (SELECT count(*) FROM certificates WHERE status = 'ISSUED') AS certified,
                  (SELECT count(*) FROM placements) AS employed,
                  (SELECT count(*) FROM construction_objects WHERE is_public) AS sites
                """
            )
        )
        row = stats.mappings().one()
        trades = await conn.execute(
            text(
                """
                SELECT code, name, domestic_months, foreign_lang_months
                FROM trades WHERE is_active ORDER BY code
                """
            )
        )
        destinations = await conn.execute(
            text("SELECT country_code, name, lang_code, notes FROM destinations WHERE is_active")
        )
        partners = await conn.execute(
            text(
                """
                SELECT name, status::text AS status, logo_permission
                FROM partners ORDER BY sort_order, name->>'uz-Latn'
                """
            )
        )
    return JSONResponse(
        {
            "stats": {key: int(row[key]) for key in ("listeners", "certified", "employed", "sites")},
            "trades": [
                {
                    "code": item["code"],
                    "name": _title(item["name"]),
                    "domestic_months": item["domestic_months"],
                    "foreign_lang_months": item["foreign_lang_months"],
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
                }
                for item in partners.mappings()
            ],
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
async def workers(request: Request) -> JSONResponse:
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
                       t.name AS trade_name,
                       wp.level::text AS level,
                       wp.availability::text AS availability,
                       wp.rating_avg,
                       wp.verified_hours
                FROM worker_profiles wp
                JOIN users u ON u.id = wp.user_id
                LEFT JOIN trades t ON t.id = wp.primary_trade_id
                ORDER BY u.full_name
                """
            )
        )
    return JSONResponse(
        [
            {
                "slug": item["slug"],
                "name": item["name"],
                "trade": _title(item["trade_name"]),
                "level": item["level"],
                "availability": item["availability"],
                "rating": None if item["rating_avg"] is None else float(item["rating_avg"]),
                "hours": item["verified_hours"],
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
                SELECT wp.slug,
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
        }
    )


@router.get("/objects")
async def objects(request: Request) -> JSONResponse:
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT id::text AS id, name, address, status::text AS status, progress_pct,
                       ST_Y(geom) AS lat, ST_X(geom) AS lon
                FROM construction_objects
                WHERE is_public
                ORDER BY name->>'uz-Latn'
                """
            )
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
async def products(request: Request) -> JSONResponse:
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT p.id::text AS id, p.name, p.unit, p.price, p.in_stock, pr.name AS producer
                FROM products p
                JOIN producers pr ON pr.id = p.producer_id
                WHERE p.is_published
                ORDER BY p.name->>'uz-Latn'
                """
            )
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
    query = q.strip()
    if len(query) < 2:
        return JSONResponse([])
    engine = _engine(request)
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT kind, ref, title
                FROM search_index
                WHERE title ILIKE :like
                ORDER BY title
                LIMIT 20
                """
            ),
            {"like": f"%{query}%"},
        )
    return JSONResponse(
        [{"kind": item["kind"], "ref": item["ref"], "title": item["title"]} for item in result.mappings()]
    )
