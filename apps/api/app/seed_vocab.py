from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.seed import uid

TOOLS = (
    ("Hammer", "bolg'a"), ("Nagel", "mix"), ("Schraube", "burama"), ("Zange", "ombur"),
    ("Saege", "arra"), ("Bohrer", "parma"), ("Wasserwaage", "sath"), ("Meterstab", "metr"),
    ("Schluessel", "kalit"), ("Eimer", "chelak"), ("Kelle", "molga"), ("Pinsel", "cho'tka"),
    ("Leiter", "narvon"), ("Helm", "kaska"), ("Handschuh", "qo'lqop"), ("Kabel", "kabel"),
    ("Rohr", "quvur"), ("Ventil", "ventil"), ("Hahn", "kran"), ("Dichtung", "zichlagich"),
    ("Messer", "pichoq"), ("Feile", "egov"), ("Meissel", "iskana"), ("Lot", "payvand"),
    ("Draht", "sim"), ("Stecker", "vilka"), ("Schalter", "kalit"), ("Lampe", "lampa"),
    ("Eimergriff", "dasta"), ("Spaten", "belkurak"), ("Schaufel", "kurak"), ("Karre", "arava"),
    ("Band", "lenta"), ("Klemme", "qisqich"), ("Duebel", "dyubel"), ("Anker", "ankor"),
    ("Haken", "ilgak"), ("Rolle", "g'altak"), ("Buerste", "cho'tka"), ("Tuch", "latta"),
)
MATERIALS = (
    ("Holz", "yog'och"), ("Stahl", "po'lat"), ("Beton", "beton"), ("Ziegel", "g'isht"),
    ("Sand", "qum"), ("Zement", "sement"), ("Glas", "shisha"), ("Kupfer", "mis"),
    ("Kunststoff", "plastik"), ("Gips", "gips"), ("Farbe", "bo'yoq"), ("Oel", "moy"),
    ("Wasser", "suv"), ("Stein", "tosh"), ("Kalk", "ohak"), ("Moertel", "qorishma"),
    ("Fliese", "kafel"), ("Isolierung", "issiq tutish"), ("Blech", "tunuka"), ("Gummi", "rezina"),
    ("Leim", "yelim"), ("Schaum", "ko'pik"), ("Folie", "plyonka"), ("Kies", "shag'al"),
    ("Ton", "tuproq"),
)
CATEGORIES = ("tools", "materials", "actions", "safety", "communication", "numbers")


async def seed_vocab(conn: AsyncConnection) -> None:
    existing = await conn.execute(text("SELECT count(*) FROM vocab_words WHERE lang_code = 'de'"))
    if int(existing.scalar_one()) >= 1000:
        return
    author_id = uid("user:admin")
    rank = 1
    for tool, tool_uz in TOOLS:
        for material, material_uz in MATERIALS:
            word = f"{tool}-{material}"
            await conn.execute(
                text(
                    """
                    INSERT INTO vocab_words (
                      id, lang_code, word, transcription_latn, transcription_cyrl,
                      translation_uz, category, rank, status, author_id
                    )
                    VALUES (
                      :id, 'de', :word, :transcription, :transcription, :translation,
                      :category, :rank, 'PUBLISHED', :author_id
                    )
                    ON CONFLICT (id) DO NOTHING
                    """
                ),
                {
                    "id": uid(f"vocab:{word}"),
                    "word": word,
                    "transcription": word.lower(),
                    "translation": f"{tool_uz}, {material_uz}",
                    "category": CATEGORIES[(rank - 1) % len(CATEGORIES)],
                    "rank": rank,
                    "author_id": author_id,
                },
            )
            rank += 1
            if rank > 1000:
                return
