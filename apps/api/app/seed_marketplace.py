"""Demo marketplace data: put the demo products in the right category, unit and producer.

Runs after the other seeds on every start (idempotent). Real products are managed by
producers in their cabinet; this only touches the deterministic demo products.
"""

import json

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.seed import uid

# Demo-only indicative prices (UZS) and minimum order; real prices come from producers.
DEMO_PRICE: dict[str, tuple[int, float | None]] = {
    "Sement M400": (52000, 10), "Sement M500": (58000, 10), "Kley": (45000, None),
    "Shpaklyovka": (38000, None), "Gips": (42000, None), "G'isht": (1150000, 1),
    "Gazoblok": (720000, 1), "Qum": (120000, 5), "Shag'al": (140000, 5),
    "Beton M200": (780000, 3), "Beton M300": (850000, 3), "Quduq halqasi": (450000, None),
    "Lyuk": (380000, None), "Armatura 12 mm": (9800000, 0.5), "Armatura 16 mm": (9600000, 0.5),
    "Taxta": (3200000, None), "Fanera": (185000, None), "Tom yopish": (68000, 20),
    "Ruberoid": (95000, None), "Gidroizolyatsiya": (210000, None), "Issiqlik izolyatsiya": (240000, None),
    "Bo'yoq": (320000, None), "Kraska fasad": (410000, None), "Gruntovka": (160000, None),
    "Kafel": (95000, 5), "Plitka": (110000, 5), "Laminat": (125000, 10), "Linoleum": (85000, 10),
    "Eshik": (1450000, None), "Deraza profili": (64000, None), "Truba PPR": (14000, 10),
    "Sifon": (48000, None), "Ventilyatsiya": (65000, None), "Kabel": (9500, 50),
    "Avtomat": (55000, None), "Rozetka": (28000, None), "Viklyuchatel": (26000, None),
    "Svetilnik": (120000, None), "Mix": (26000, 5), "Shurup": (34000, 5),
}

# demo product name -> (category code, unit, featured, made by "Uychi g'isht")
PRODUCTS: dict[str, tuple[str, str, bool, bool]] = {
    "Sement M400": ("cement", "qop", True, False),
    "Sement M500": ("cement", "qop", True, False),
    "Kley": ("cement", "qop", False, False),
    "Shpaklyovka": ("finishing", "qop", False, False),
    "Gips": ("finishing", "qop", False, False),
    "G'isht": ("bricks", "1000 dona", True, True),
    "Gazoblok": ("bricks", "m³", True, True),
    "Qum": ("aggregates", "m³", True, False),
    "Shag'al": ("aggregates", "m³", False, False),
    "Beton M200": ("concrete", "m³", True, False),
    "Beton M300": ("concrete", "m³", False, False),
    "Quduq halqasi": ("concrete", "dona", False, False),
    "Lyuk": ("concrete", "dona", False, False),
    "Armatura 12 mm": ("metal", "tonna", True, False),
    "Armatura 16 mm": ("metal", "tonna", False, False),
    "Taxta": ("wood", "m³", False, False),
    "Fanera": ("wood", "list", False, False),
    "Tom yopish": ("roofing", "m²", False, False),
    "Ruberoid": ("roofing", "rulon", False, False),
    "Gidroizolyatsiya": ("roofing", "rulon", False, False),
    "Issiqlik izolyatsiya": ("insulation", "rulon", False, False),
    "Bo'yoq": ("finishing", "chelak", False, False),
    "Kraska fasad": ("finishing", "chelak", False, False),
    "Gruntovka": ("finishing", "chelak", False, False),
    "Kafel": ("flooring", "m²", False, False),
    "Plitka": ("flooring", "m²", False, False),
    "Laminat": ("flooring", "m²", False, False),
    "Linoleum": ("flooring", "m²", False, False),
    "Eshik": ("doors", "dona", False, False),
    "Deraza profili": ("doors", "metr", False, False),
    "Truba PPR": ("plumbing", "metr", False, False),
    "Sifon": ("plumbing", "dona", False, False),
    "Ventilyatsiya": ("plumbing", "dona", False, False),
    "Kabel": ("electrical", "metr", False, False),
    "Avtomat": ("electrical", "dona", False, False),
    "Rozetka": ("electrical", "dona", False, False),
    "Viklyuchatel": ("electrical", "dona", False, False),
    "Svetilnik": ("electrical", "dona", False, False),
    "Mix": ("fasteners", "kg", False, False),
    "Shurup": ("fasteners", "kg", False, False),
}


async def seed_marketplace(conn: AsyncConnection) -> None:
    has_column = (
        await conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'products' AND column_name = 'featured'
                """
            )
        )
    ).first()
    if has_column is None:  # migration 0003 not applied yet
        return
    brick_producer = (
        await conn.execute(text("SELECT id FROM producers WHERE inn = '409770011' LIMIT 1"))
    ).scalar()
    for name, (category, unit, featured, bricks) in PRODUCTS.items():
        await conn.execute(
            text(
                """
                UPDATE products p
                SET category_id = c.id,
                    unit = :unit,
                    featured = :featured,
                    price = coalesce(CAST(:price AS numeric), p.price),
                    min_order = CAST(:min_order AS numeric),
                    producer_id = CASE WHEN :bricks AND CAST(:brick_producer AS uuid) IS NOT NULL
                                       THEN CAST(:brick_producer AS uuid) ELSE p.producer_id END
                FROM product_categories c
                WHERE c.code = :category
                  AND p.name->>'uz-Latn' = :name
                  AND p.id IN (SELECT unnest(CAST(:ids AS uuid[])))
                """
            ),
            {
                "price": DEMO_PRICE.get(name, (None, None))[0],
                "min_order": DEMO_PRICE.get(name, (None, None))[1],
                "unit": unit,
                "featured": featured,
                "bricks": bricks,
                "brick_producer": None if brick_producer is None else str(brick_producer),
                "category": category,
                "name": name,
                "ids": [str(uid(f"product:{index}")) for index in range(60)],
            },
        )
    # Demo prices are current, except two kept stale to show the "confirm the price" hint.
    await conn.execute(
        text(
            """
            UPDATE products SET price_updated_at = now()
            WHERE id IN (SELECT unnest(CAST(:ids AS uuid[])))
            """
        ),
        {"ids": [str(uid(f"product:{index}")) for index in range(2, 60)]},
    )
    # Old demo category "general" is no longer used once everything is mapped.
    await conn.execute(
        text(
            """
            DELETE FROM product_categories c
            WHERE c.code = 'general'
              AND NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = c.id)
            """
        )
    )


# partner name (uz-Latn) -> (slug, role in four languages)
PARTNER_INFO: dict[str, tuple[str, dict[str, str]]] = {
    "Uychi tumani hokimligi": ("uychi-hokimlik", {
        "uz-Latn": "Loyiha egasi va koordinatori. Mahalla ro'yxatlarini yuritadi, o'quv markazi va obyektlarni ta'minlaydi.",
        "uz-Cyrl": "Лойиҳа эгаси ва координатори. Маҳалла рўйхатларини юритади, ўқув маркази ва объектларни таъминлайди.",
        "ru": "Владелец и координатор проекта. Ведёт списки махалли, обеспечивает учебный центр и объекты.",
        "en": "Project owner and coordinator. Keeps neighbourhood lists and provides the training centre and sites.",
    }),
    "NamDTU": ("namdtu", {
        "uz-Latn": "Namangan davlat texnika universiteti. O'quv dasturi va malaka sertifikatini birgalikda beradi.",
        "uz-Cyrl": "Наманган давлат техника университети. Ўқув дастури ва малака сертификатини биргаликда беради.",
        "ru": "Наманганский государственный технический университет. Совместно выдаёт учебную программу и сертификат.",
        "en": "Namangan State Technical University. Co-issues the curriculum and the qualification certificate.",
    }),
    "Tuman bandlikka ko'maklashish bo'limi": ("tuman-bandlik", {
        "uz-Latn": "Ish izlovchilarni ro'yxatga oladi va bitiruvchilarni ishga joylashtirishga ko'maklashadi.",
        "uz-Cyrl": "Иш изловчиларни рўйхатга олади ва битирувчиларни ишга жойлаштиришга кўмаклашади.",
        "ru": "Регистрирует соискателей и содействует трудоустройству выпускников.",
        "en": "Registers job seekers and helps graduates find work.",
    }),
    "Tashqi mehnat migratsiyasi agentligi": ("tashqi-mehnat", {
        "uz-Latn": "Xorijga ishga yuborish faqat shu agentlik va uning litsenziyali hamkorlari orqali amalga oshiriladi.",
        "uz-Cyrl": "Хорижга ишга юбориш фақат шу агентлик ва унинг лицензияли ҳамкорлари орқали амалга оширилади.",
        "ru": "Направление на работу за рубеж осуществляется только через это агентство и его лицензированных партнёров.",
        "en": "Placement abroad goes only through this agency and its licensed partners.",
    }),
    "Mahalliy ishlab chiqaruvchi": ("mahalliy-ishlab-chiqaruvchi", {
        "uz-Latn": "Uychi tumanida qurilish materiallari ishlab chiqaradi va materiallar bozorida sotadi.",
        "uz-Cyrl": "Уйчи туманида қурилиш материаллари ишлаб чиқаради ва материаллар бозорида сотади.",
        "ru": "Производит стройматериалы в Уйчинском районе и продаёт их на рынке материалов.",
        "en": "Makes building materials in Uychi district and sells them on the materials market.",
    }),
}


async def seed_partner_info(conn: AsyncConnection) -> None:
    has_slug = (
        await conn.execute(
            text("SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'slug'")
        )
    ).first()
    if has_slug is None:  # migration 0004 not applied yet
        return
    for name, (slug, role) in PARTNER_INFO.items():
        await conn.execute(
            text(
                """
                UPDATE partners
                SET slug = :slug, role_description = CAST(:role AS jsonb)
                WHERE name->>'uz-Latn' = :name
                """
            ),
            {"slug": slug, "role": json.dumps(role, ensure_ascii=False), "name": name},
        )
