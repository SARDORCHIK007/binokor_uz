import json

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.seed import uid

RUBRIC = json.dumps(
    {
        "criteria": [
            {"label": "Xavfsizlik", "points": 25},
            {"label": "Sifat", "points": 25},
            {"label": "Asbob", "points": 25},
            {"label": "Yakun", "points": 25},
        ]
    },
    ensure_ascii=False,
)


TRADE_TITLES = {
    "plumber": {"ru": "Сантехник", "en": "Plumber", "uz-Cyrl": "Сантехник"},
    "electrician": {"ru": "Электрик", "en": "Electrician", "uz-Cyrl": "Электрик"},
    "bricklayer": {"ru": "Каменщик", "en": "Bricklayer", "uz-Cyrl": "Ғишт терувчи"},
    "tiler": {"ru": "Плиточник", "en": "Tiler", "uz-Cyrl": "Плиткачи"},
    "welder": {"ru": "Сварщик", "en": "Welder", "uz-Cyrl": "Пайвандчи"},
    "plasterer": {"ru": "Штукатур", "en": "Plasterer", "uz-Cyrl": "Сувоқчи"},
    "roofer": {"ru": "Кровельщик", "en": "Roofer", "uz-Cyrl": "Том ёпувчи"},
    "carpenter": {"ru": "Плотник", "en": "Carpenter", "uz-Cyrl": "Дурадгор"},
    "painter": {"ru": "Маляр", "en": "Painter", "uz-Cyrl": "Бўёқчи"},
    "concrete": {"ru": "Бетонщик", "en": "Concrete worker", "uz-Cyrl": "Бетончи"},
    "rebar": {"ru": "Арматурщик", "en": "Rebar worker", "uz-Cyrl": "Арматурачи"},
    "drafting": {"ru": "Чертёжник", "en": "Drafter", "uz-Cyrl": "Чизмачи"},
}


async def seed_followup(conn: AsyncConnection) -> None:
    await conn.execute(
        text(
            """
            CREATE OR REPLACE FUNCTION enforce_no_language_on_domestic() RETURNS trigger
            LANGUAGE plpgsql AS $$
            BEGIN
              IF NEW.kind = 'LANGUAGE' AND EXISTS (
                SELECT 1 FROM courses WHERE id = NEW.course_id AND track = 'DOMESTIC'
              ) THEN
                RAISE EXCEPTION 'DOMESTIC_NO_LANGUAGE' USING ERRCODE = 'P0001';
              END IF;
              RETURN NEW;
            END $$
            """
        )
    )
    await conn.execute(text("DROP TRIGGER IF EXISTS trg_domestic_language ON modules"))
    await conn.execute(
        text(
            """
            CREATE TRIGGER trg_domestic_language
            BEFORE INSERT OR UPDATE OF kind, course_id ON modules
            FOR EACH ROW EXECUTE FUNCTION enforce_no_language_on_domestic()
            """
        )
    )
    from app.signing import KEY_ID, sign_payload

    issued = await conn.execute(
        text("SELECT id, payload FROM certificates WHERE status = 'ISSUED' AND payload IS NOT NULL")
    )
    for item in issued.mappings():
        payload = item["payload"]
        if not isinstance(payload, dict):
            continue
        digest, signature = sign_payload(payload)
        await conn.execute(
            text(
                """
                UPDATE certificates
                SET payload_hash = :digest, signature = :signature, key_id = :key_id
                WHERE id = :id
                """
            ),
            {"id": item["id"], "digest": digest, "signature": signature, "key_id": KEY_ID},
        )
    for code, titles in TRADE_TITLES.items():
        await conn.execute(
            text("UPDATE trades SET name = name || CAST(:titles AS jsonb) WHERE code = :code"),
            {"code": code, "titles": json.dumps(titles, ensure_ascii=False)},
        )
    destinations = {
        "DE": {"en": "Germany", "ru": "Германия", "uz-Cyrl": "Германия"},
        "JP": {"en": "Japan", "ru": "Япония", "uz-Cyrl": "Япония"},
        "KR": {"en": "Korea", "ru": "Корея", "uz-Cyrl": "Корея"},
        "SA": {"en": "Saudi Arabia", "ru": "Саудовская Аравия", "uz-Cyrl": "Саудия Арабистони"},
        "AE": {"en": "UAE", "ru": "ОАЭ", "uz-Cyrl": "БАА"},
        "TR": {"en": "Turkey", "ru": "Турция", "uz-Cyrl": "Туркия"},
    }
    for code, titles in destinations.items():
        await conn.execute(
            text(
                "UPDATE destinations SET name = name || CAST(:titles AS jsonb) WHERE country_code = :code"
            ),
            {"code": code, "titles": json.dumps(titles, ensure_ascii=False)},
        )
    await conn.execute(
        text("UPDATE modules SET rubric = CAST(:rubric AS jsonb) WHERE rubric IS NULL"),
        {"rubric": RUBRIC},
    )
    await conn.execute(
        text(
            """
            UPDATE products
            SET price_updated_at = now()
            WHERE price_updated_at IS NULL
            """
        )
    )
    for index in range(8):
        await conn.execute(
            text(
                """
                UPDATE products
                SET price_updated_at = now() - interval '40 days'
                WHERE id = :id
                """
            ),
            {"id": uid(f"product:{index}")},
        )
    await conn.execute(
        text(
            """
            UPDATE construction_objects
            SET status = 'COMPLETED'
            WHERE id = :id
            """
        ),
        {"id": uid("object:9")},
    )
    await conn.execute(
        text(
            """
            INSERT INTO reviews (
              id, placement_id, score_quality, score_discipline, score_safety,
              score_communication, comment, author_id
            )
            SELECT :id, :placement_id, 5, 4, 5, 4, 'Ish sifati yaxshi', u.id
            FROM users u
            WHERE u.phone = '+998901000001'
            ON CONFLICT (placement_id) DO NOTHING
            """
        ),
        {"id": uid("review:0"), "placement_id": uid("placement:0")},
    )
