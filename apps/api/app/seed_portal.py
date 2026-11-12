import json
from datetime import date

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.seed import uid

TRADES: tuple[tuple[str, str], ...] = (
    ("plumber", "Santexnik"),
    ("electrician", "Elektrik"),
    ("bricklayer", "G'isht teruvchi"),
    ("tiler", "Plitkachi"),
    ("welder", "Payvandchi"),
    ("plasterer", "Suvoqchi"),
    ("roofer", "Tom yopuvchi"),
    ("carpenter", "Duradgor"),
    ("painter", "Bo'yoqchi"),
    ("concrete", "Betonchi"),
    ("rebar", "Armaturachi"),
    ("drafting", "Chizmachi"),
)

SETTLEMENTS = (
    "Uychi",
    "Onhayot",
    "Birlashgan",
    "Fayziobod",
    "Churtuk",
    "Axsi",
    "Jiydakapa",
    "Kichik toshloq",
    "Mashad",
    "Soku",
    "Boyogon",
    "Gayrat",
    "Ziyokor",
)

LANGUAGES = (
    ("de", "Nemis tili", False),
    ("en", "Ingliz tili", False),
    ("ar", "Arab tili", True),
    ("ja", "Yapon tili", False),
    ("ko", "Koreys tili", False),
    ("tr", "Turk tili", False),
    ("ru", "Rus tili", False),
    ("it", "Italyan tili", False),
)

DESTINATIONS = (
    ("KR", "Koreya", "ko"),
    ("JP", "Yaponiya", "ja"),
    ("DE", "Germaniya", "de"),
    ("RU", "Rossiya", "ru"),
    ("IT", "Italiya", "it"),
)

PARTNERS = (
    ("namdtu", "NamDTU", "EDU", "SIGNED", date(2026, 3, 1)),
    ("hokimlik", "Uychi tumani hokimligi", "GOV", "SIGNED", date(2026, 2, 1)),
    ("bandlik", "Tuman bandlikka ko'maklashish bo'limi", "GOV", "PLANNED", None),
    ("agency", "Tashqi mehnat migratsiyasi agentligi", "AGENCY", "NEGOTIATING", None),
    ("producer", "Mahalliy ishlab chiqaruvchi", "PRODUCER", "PLANNED", None),
)

MATERIALS = (
    "Sement M400",
    "Sement M500",
    "G'isht",
    "Gazoblok",
    "Qum",
    "Shag'al",
    "Armatura 12 mm",
    "Armatura 16 mm",
    "Taxta",
    "Fanera",
    "Bo'yoq",
    "Shpaklyovka",
    "Gips",
    "Plitka",
    "Kafel",
    "Truba PPR",
    "Kabel",
    "Avtomat",
    "Mix",
    "Shurup",
    "Tom yopish",
    "Ruberoid",
    "Issiqlik izolyatsiya",
    "Deraza profili",
    "Eshik",
    "Laminat",
    "Linoleum",
    "Kraska fasad",
    "Gruntovka",
    "Kley",
    "Gidroizolyatsiya",
    "Beton M200",
    "Beton M300",
    "Quduq halqasi",
    "Lyuk",
    "Ventilyatsiya",
    "Svetilnik",
    "Rozetka",
    "Viklyuchatel",
    "Sifon",
)


def _name(value: str) -> str:
    return json.dumps({"uz-Latn": value}, ensure_ascii=False)


async def seed_portal(conn: AsyncConnection) -> None:
    existing = await conn.execute(text("SELECT count(*) FROM trades"))
    if int(existing.scalar_one()) >= len(TRADES):
        return

    for index, settlement in enumerate(SETTLEMENTS):
        for number in range(1, 5):
            if index * 4 + number > 53:
                break
            label = f"{settlement} {number}-MFY"
            await conn.execute(
                text(
                    """
                    INSERT INTO mahallas (id, name, district)
                    VALUES (:id, CAST(:name AS jsonb), 'Uychi')
                    """
                ),
                {"id": uid(f"mahalla:{label}"), "name": _name(label)},
            )
        if index * 4 >= 53:
            break
    await conn.execute(
        text(
            """
            INSERT INTO mahallas (id, name, district)
            VALUES (:id, CAST(:name AS jsonb), 'Uychi')
            """
        ),
        {"id": uid("mahalla:Navoiy MFY"), "name": _name("Navoiy MFY")},
    )

    for code, title, rtl in LANGUAGES:
        await conn.execute(
            text(
                """
                INSERT INTO languages (code, name, rtl)
                VALUES (:code, CAST(:name AS jsonb), :rtl)
                ON CONFLICT (code) DO NOTHING
                """
            ),
            {"code": code, "name": _name(title), "rtl": rtl},
        )

    for code, title in TRADES:
        await conn.execute(
            text(
                """
                INSERT INTO trades (id, code, name, domestic_months, foreign_lang_months)
                VALUES (:id, :code, CAST(:name AS jsonb), 6, 3)
                ON CONFLICT (code) DO NOTHING
                """
            ),
            {"id": uid(f"trade:{code}"), "code": code, "name": _name(title)},
        )

    for country, title, lang in DESTINATIONS:
        await conn.execute(
            text(
                """
                INSERT INTO destinations (id, country_code, name, lang_code, notes)
                VALUES (:id, :country, CAST(:name AS jsonb), :lang, CAST(:notes AS jsonb))
                """
            ),
            {
                "id": uid(f"dest:{country}"),
                "country": country,
                "name": _name(title),
                "lang": lang,
                "notes": _name("Jamoa agentlik orqali ketadi. 1000 so'z til imtihonining o'rnini bosmaydi."),
            },
        )

    for key, title, kind, status, signed_at in PARTNERS:
        await conn.execute(
            text(
                """
                INSERT INTO partners (id, name, kind, status, signed_at, logo_permission, sort_order)
                VALUES (:id, CAST(:name AS jsonb), CAST(:kind AS partner_kind),
                        CAST(:status AS partner_status), :signed_at, false, :sort_order)
                """
            ),
            {
                "id": uid(f"partner:{key}"),
                "name": _name(title),
                "kind": kind,
                "status": status,
                "signed_at": signed_at,
                "sort_order": 10,
            },
        )

    for index in range(12):
        trade_code = TRADES[index % len(TRADES)][0]
        phone = f"+99890110{index:04d}"
        user_id = uid(f"worker-user:{index}")
        person_id = uid(f"worker-person:{index}")
        full_name = f"Usta {index + 1} Karimov"
        await conn.execute(
            text(
                """
                INSERT INTO users (id, phone, full_name)
                VALUES (:id, :phone, :full_name)
                ON CONFLICT (phone) DO NOTHING
                """
            ),
            {"id": user_id, "phone": phone, "full_name": full_name},
        )
        await conn.execute(
            text(
                """
                INSERT INTO persons (id, user_id, last_name, first_name, birth_date)
                VALUES (:id, :user_id, 'Karimov', :first_name, DATE '1995-01-15')
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {"id": person_id, "user_id": user_id, "first_name": f"Usta{index + 1}"},
        )
        await conn.execute(
            text(
                """
                INSERT INTO worker_profiles (
                  user_id, person_id, slug, primary_trade_id, level, availability,
                  verified_hours, rating_avg, rating_count, visibility
                )
                VALUES (
                  :user_id, :person_id, :slug, :trade_id, 'MASTER', 'FREE',
                  800, 4.6, 3, CAST(:visibility AS jsonb)
                )
                ON CONFLICT (user_id) DO NOTHING
                """
            ),
            {
                "user_id": user_id,
                "person_id": person_id,
                "slug": f"usta-{index + 1}",
                "trade_id": uid(f"trade:{trade_code}"),
                "visibility": json.dumps(
                    {
                        "photo": False,
                        "full_name": True,
                        "portfolio": True,
                        "ratings": True,
                        "languages": True,
                    }
                ),
            },
        )

    for index in range(10):
        title = f"Obyekt {index + 1}"
        await conn.execute(
            text(
                """
                INSERT INTO construction_objects (id, name, address, geom, status, progress_pct, is_public)
                VALUES (
                  :id, CAST(:name AS jsonb), :address,
                  ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                  'IN_PROGRESS', :progress, true
                )
                """
            ),
            {
                "id": uid(f"object:{index}"),
                "name": _name(title),
                "address": f"Uychi tumani, {SETTLEMENTS[index % len(SETTLEMENTS)]}",
                "lon": 71.85 + index * 0.01,
                "lat": 41.02 + (index % 3) * 0.01,
                "progress": 20 + index * 7,
            },
        )

    producer_id = uid("producer:demo")
    category_id = uid("category:general")
    await conn.execute(
        text(
            """
            INSERT INTO producers (id, name, inn, address)
            VALUES (:id, 'Uychi qurilish materiallari', '200000001', 'Uychi tumani')
            """
        ),
        {"id": producer_id},
    )
    await conn.execute(
        text(
            """
            INSERT INTO product_categories (id, code, name)
            VALUES (:id, 'general', CAST(:name AS jsonb))
            """
        ),
        {"id": category_id, "name": _name("Qurilish materiallari")},
    )
    for index, title in enumerate(MATERIALS):
        await conn.execute(
            text(
                """
                INSERT INTO products (
                  id, producer_id, category_id, name, unit, price, in_stock, is_published
                )
                VALUES (
                  :id, :producer_id, :category_id, CAST(:name AS jsonb), 'dona', :price, true, true
                )
                """
            ),
            {
                "id": uid(f"product:{index}"),
                "producer_id": producer_id,
                "category_id": category_id,
                "name": _name(title),
                "price": 25000 + index * 1500,
            },
        )

    for slug, title, body in (
        ("loyiha", "Loyiha", "Uychida kasb o'rgatamiz. Ichki bozor va xorijiy yo'l agentlik orqali ochiladi."),
        ("aloqa", "Aloqa", "Uychi tumani, Amir Temur ko'chasi 62-uy."),
    ):
        await conn.execute(
            text(
                """
                INSERT INTO cms_pages (id, slug, title, body, status, published_at)
                VALUES (:id, :slug, CAST(:title AS jsonb), CAST(:body AS jsonb), 'PUBLISHED', now())
                """
            ),
            {"id": uid(f"page:{slug}"), "slug": slug, "title": _name(title), "body": _name(body)},
        )

    for index, title in enumerate(
        (
            "Yangi guruh qabuli boshlandi",
            "Ustaxona jihozlari keldi",
            "Hamkorlik bo'yicha uchrashuv",
            "Obyektda amaliyot kuni",
        )
    ):
        slug = f"yangilik-{index + 1}"
        await conn.execute(
            text(
                """
                INSERT INTO news (id, slug, title, body, status, published_at)
                VALUES (:id, :slug, CAST(:title AS jsonb), CAST(:body AS jsonb), 'PUBLISHED', now())
                """
            ),
            {
                "id": uid(f"news:{slug}"),
                "slug": slug,
                "title": _name(title),
                "body": _name("Bu namoyish yangiligi. Matn mahalliy bazadan olinadi."),
            },
        )

    await conn.execute(text("REFRESH MATERIALIZED VIEW search_index"))
