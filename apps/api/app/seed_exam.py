import json

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.seed import uid

QUESTIONS: tuple[tuple[str, tuple[str, str, str, str], int], ...] = (
    ("Sovuq suv quvuri odatda qaysi rangda belgilanadi?", ("Ko'k", "Qizil", "Sariq", "Yashil"), 0),
    ("Sifon nima uchun qo'yiladi?", ("Hidni to'sish", "Bosimni oshirish", "Suvni isitish", "Hisoblagich"), 0),
    ("Quvur rezbasi qanday zichlanadi?", ("Lenta yoki paklya", "Bo'yoq", "Qog'oz", "Skotch"), 0),
    ("Kanalizatsiya nishabi nima uchun kerak?", ("Oqim o'z oqishi bilan ketsin", "Suv isinsin", "Shovqin kamaysin", "Hisob osonlashsin"), 0),
    ("Ventil yopilganda suv qayerga o'tmaydi?", ("Keyingi nuqtaga", "Hisoblagichga", "Bakka", "Tomga"), 0),
    ("Payvandlangan chok soviguncha nima qilinmaydi?", ("Bosim berilmaydi", "Belgilab qo'yilmaydi", "O'lchab bo'lmaydi", "Rasmga olinmaydi"), 0),
    ("Kran kartriji almashtirilsa nima tiklanadi?", ("Ochib-yopish", "Quvur diametri", "Devor qalinligi", "Hisob raqami"), 0),
    ("Suv hisoblagichdan oldin nima turadi", ("Ventil", "Sifon", "Unitaz", "Dush"), 0),
    ("Ichki kanalizatsiya quvuri odatda qanday material?", ("Plastik", "Shisha", "Karton", "Mato"), 0),
    ("Bosim sinovidan oldin tizim nima bo'lishi kerak?", ("Yopiq va to'la", "Ochiq", "Bo'sh va issiq", "Bo'yalgan"), 0),
    ("Qaysi asbob gorizontalni tekshiradi?", ("Sath", "Ombor", "Arra", "Molga"), 0),
    ("Issiq suv quvuri sovuqdan qanday ajratiladi?", ("Rang va joylashuv", "Hid", "Tovush", "Narx"), 0),
    ("Qistirma eskirsa kran nima qiladi?", ("Tomchilaydi", "Qiziydi", "Uzayadi", "Yengillashadi"), 0),
    ("Tirsak necha graduslik burilish beradi?", ("90", "10", "180", "5"), 0),
    ("Qaysi ish balandlikda kaska talab qiladi?", ("Narvonda", "Stol yonida", "Hujjatda", "Omborda o'tirib"), 0),
    ("Quvur kesishdan oldin nima o'lchanadi?", ("Uzunlik", "Rang", "Narx", "Ism"), 0),
    ("Filtr nima ushlab qoladi?", ("Zang va qum", "Issiqlik", "Yorug'lik", "Havo"), 0),
    ("Qaysi holatda ventil yopiladi?", ("Ta'mirdan oldin", "Har kuni tushda", "Hisob to'lganda", "Yomg'irda"), 0),
    ("Rezina qistirma qayerga qo'yiladi?", ("Ulanish oralig'iga", "Devor ichiga", "Hisoblagich oynasiga", "Polga"), 0),
    ("Kanalizatsiya tiqilsa birinchi nima qaraladi?", ("Sifon", "Tom", "Eshik", "Oyna"), 0),
    ("Montaj chizmasida diametr qanday yoziladi?", ("Millimetrda", "Soatda", "Kilogrammda", "So'mda"), 0),
    ("Yangi ulanishdan keyin nima tekshiriladi?", ("Sizish", "Rang uyg'unligi", "Musiqa", "Hidi yo'qligi"), 0),
    ("Qaysi vosita rezba ochadi?", ("Plashka", "Cho'tka", "Lineyka", "Vedro"), 0),
    ("Suv urishining oldi qanday olinadi?", ("Sekin yopish", "Tez urish", "Quvurni egish", "Bo'yoq"), 0),
    ("Quyidagidan qaysi biri himoya vositasi?", ("Qo'lqop", "Qalam", "Daftar", "Choy"), 0),
    ("Bakdan chiqish quvuri pastga qarab nima beradi?", ("Bosim", "Yorug'lik", "Shovqin", "Rang"), 0),
    ("Ikki quvur ulansa chok qanday bo'lishi kerak?", ("Teng va zich", "Bo'sh", "Yelimli qog'oz", "Ochiq"), 0),
    ("Qaysi belgida ish to'xtatiladi?", ("Sizish kuchayganda", "Tushlikda", "Telefon jiringlasa", "Mijoz kelsa"), 0),
    ("Qisqa quvur bo'lagi nima deyiladi?", ("Patron", "Daftar", "Oyna", "Gilam"), 0),
    ("Ish tugagach asbob qayerga qo'yiladi?", ("O'z joyiga", "Yo'lga", "Tomga", "Kanalizatsiyaga"), 0),
)


TRADE_CODES = (
    "plumber",
    "electrician",
    "bricklayer",
    "tiler",
    "welder",
    "plasterer",
    "roofer",
    "carpenter",
    "painter",
    "concrete",
    "rebar",
    "drafting",
)


async def _ensure_bank(conn: AsyncConnection) -> None:
    prompts = (
        "Ishni boshlashdan oldin nima tekshiriladi?",
        "Himoya vositasi qaysi?",
        "O'lchov qanday birlikda?",
        "Nuqson topsangiz nima qilasiz?",
        "Asbob ishlatib bo'lgach qayerga qo'yiladi?",
    )
    options = ("Xavfsizlikni", "Shoshilishni", "Radiyoni", "Choy ichishni")
    for code in TRADE_CODES:
        count = await conn.execute(
            text("SELECT count(*) FROM question_bank WHERE trade_id = :id"),
            {"id": uid(f"trade:{code}")},
        )
        have = int(count.scalar_one())
        for index in range(have, 40):
            body = f"{code}: {prompts[index % len(prompts)]} #{index + 1}"
            await conn.execute(
                text(
                    """
                    INSERT INTO question_bank (id, trade_id, body, options, correct)
                    VALUES (
                      :id, :trade_id, CAST(:body AS jsonb), CAST(:options AS jsonb), 0
                    )
                    ON CONFLICT (id) DO NOTHING
                    """
                ),
                {
                    "id": uid(f"question:{code}:{index}"),
                    "trade_id": uid(f"trade:{code}"),
                    "body": json.dumps({"uz-Latn": body}, ensure_ascii=False),
                    "options": json.dumps(list(options), ensure_ascii=False),
                },
            )


async def seed_exam(conn: AsyncConnection) -> None:
    await _ensure_bank(conn)
    existing = await conn.execute(text("SELECT count(*) FROM question_bank"))
    if int(existing.scalar_one()) < 30:
        trade_id = uid("trade:plumber")
        for index, (body, options, correct) in enumerate(QUESTIONS):
            await conn.execute(
                text(
                    """
                    INSERT INTO question_bank (id, trade_id, body, options, correct, difficulty)
                    VALUES (
                      :id, :trade_id, CAST(:body AS jsonb), CAST(:options AS jsonb), :correct, 2
                    )
                    ON CONFLICT (id) DO NOTHING
                    """
                ),
                {
                    "id": uid(f"question:{index}"),
                    "trade_id": trade_id,
                    "body": json.dumps({"uz-Latn": body}, ensure_ascii=False),
                    "options": json.dumps(list(options), ensure_ascii=False),
                    "correct": correct,
                },
            )
    role = await conn.execute(
        text(
            """
            INSERT INTO user_roles (id, user_id, role)
            SELECT :id, u.id, 'curator'
            FROM users u
            WHERE u.phone = '+998901000002'
              AND NOT EXISTS (
                SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'curator'
              )
            RETURNING id
            """
        ),
        {"id": uid("role:curator-akmal")},
    )
    if role.first() is None:
        already = await conn.execute(text("SELECT count(*) FROM curator_groups"))
        if int(already.scalar_one()) >= 1:
            return
    await conn.execute(
        text(
            """
            INSERT INTO curator_groups (id, curator_user_id, lang_code, max_members)
            SELECT :id, u.id, 'de', 10
            FROM users u WHERE u.phone = '+998901000002'
            ON CONFLICT (id) DO NOTHING
            """
        ),
        {"id": uid("curator-group:1")},
    )
    for number in range(1, 9):
        await conn.execute(
            text(
                """
                INSERT INTO curator_members (curator_group_id, student_user_id)
                SELECT :group_id, u.id
                FROM users u WHERE u.phone = :phone
                ON CONFLICT DO NOTHING
                """
            ),
            {"group_id": uid("curator-group:1"), "phone": f"+9989013{number:05d}"},
        )
        words = await conn.execute(
            text(
                """
                SELECT id FROM vocab_words
                WHERE lang_code = 'de' AND status = 'PUBLISHED'
                ORDER BY rank
                LIMIT :limit
                """
            ),
            {"limit": 20 + number * 5},
        )
        for word in words.mappings():
            await conn.execute(
                text(
                    """
                    INSERT INTO vocab_progress (
                      user_id, word_id, box, next_review_at, correct_count, last_answer_at
                    )
                    SELECT u.id, :word_id, 5, now() + interval '16 days', 5, now()
                    FROM users u WHERE u.phone = :phone
                    ON CONFLICT (user_id, word_id) DO NOTHING
                    """
                ),
                {"word_id": word["id"], "phone": f"+9989013{number:05d}"},
            )
