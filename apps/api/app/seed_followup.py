import json

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.seed import uid


async def seed_followup(conn: AsyncConnection) -> None:
    category_id = uid("category:plumbing")
    await conn.execute(
        text(
            """
            INSERT INTO product_categories (id, code, name)
            VALUES (:id, 'plumbing', CAST(:name AS jsonb))
            ON CONFLICT (code) DO NOTHING
            """
        ),
        {"id": category_id, "name": json.dumps({"uz-Latn": "Sement va g'isht"}, ensure_ascii=False)},
    )
    await conn.execute(
        text(
            """
            UPDATE product_categories
            SET name = CAST(:name AS jsonb)
            WHERE code = 'plumbing'
            """
        ),
        {"name": json.dumps({"uz-Latn": "Sement va g'isht"}, ensure_ascii=False)},
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
                SET category_id = :category_id,
                    price_updated_at = now() - interval '40 days'
                WHERE id = :id
                """
            ),
            {"category_id": category_id, "id": uid(f"product:{index}")},
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
