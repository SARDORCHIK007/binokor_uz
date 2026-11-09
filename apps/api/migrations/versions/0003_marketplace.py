"""Materials marketplace: real categories, featured flag, multi-item orders (FR-MARKET).

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-09
"""

import json
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | Sequence[str] | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# code, sort, uz-Latn, uz-Cyrl, ru, en
CATEGORIES = [
    ("cement", 1, "Sement va quruq aralashmalar", "Цемент ва қуруқ аралашмалар", "Цемент и сухие смеси", "Cement and dry mixes"),
    ("bricks", 2, "G'isht va bloklar", "Ғишт ва блоклар", "Кирпич и блоки", "Bricks and blocks"),
    ("aggregates", 3, "Qum va shag'al", "Қум ва шағал", "Песок и щебень", "Sand and gravel"),
    ("concrete", 4, "Beton va temir-beton", "Бетон ва темир-бетон", "Бетон и ЖБИ", "Concrete and precast"),
    ("metal", 5, "Armatura va metall", "Арматура ва металл", "Арматура и металл", "Rebar and metal"),
    ("wood", 6, "Yog'och va fanera", "Ёғоч ва фанера", "Дерево и фанера", "Timber and plywood"),
    ("roofing", 7, "Tom va gidroizolyatsiya", "Том ва гидроизоляция", "Кровля и гидроизоляция", "Roofing and waterproofing"),
    ("insulation", 8, "Issiqlik izolyatsiyasi", "Иссиқлик изоляцияси", "Теплоизоляция", "Insulation"),
    ("finishing", 9, "Pardozlash", "Пардозлаш", "Отделка", "Finishing"),
    ("flooring", 10, "Pol va plitka", "Пол ва плитка", "Пол и плитка", "Floors and tiles"),
    ("doors", 11, "Eshik va deraza", "Эшик ва дераза", "Двери и окна", "Doors and windows"),
    ("plumbing", 12, "Santexnika", "Сантехника", "Сантехника", "Plumbing"),
    ("electrical", 13, "Elektr", "Электр", "Электрика", "Electrical"),
    ("fasteners", 14, "Mahkamlagichlar", "Маҳкамлагичлар", "Крепёж", "Fasteners"),
]


def upgrade() -> None:
    op.execute("ALTER TABLE product_categories ADD COLUMN sort smallint NOT NULL DEFAULT 100")
    op.execute("ALTER TABLE products ADD COLUMN featured boolean NOT NULL DEFAULT false")
    op.execute(
        """
        ALTER TABLE order_requests
          ADD COLUMN order_no varchar(20),
          ADD COLUMN buyer_type varchar(10) NOT NULL DEFAULT 'PERSON'
            CHECK (buyer_type IN ('PERSON', 'COMPANY')),
          ADD COLUMN company_name varchar(200),
          ADD COLUMN company_inn varchar(14),
          ADD COLUMN delivery varchar(10) NOT NULL DEFAULT 'PICKUP'
            CHECK (delivery IN ('PICKUP', 'DELIVERY')),
          ADD COLUMN address varchar(300)
        """
    )
    op.execute("CREATE INDEX order_requests_order_no_idx ON order_requests (order_no)")
    conn = op.get_bind()
    for code, sort, uz, cyrl, ru, en in CATEGORIES:
        name = json.dumps({"uz-Latn": uz, "uz-Cyrl": cyrl, "ru": ru, "en": en}, ensure_ascii=False)
        conn.execute(
            sa.text(
                """
                INSERT INTO product_categories (id, code, name, sort)
                VALUES (gen_random_uuid(), :code, CAST(:name AS jsonb), :sort)
                ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, sort = EXCLUDED.sort
                """
            ),
            {"code": code, "name": name, "sort": sort},
        )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS order_requests_order_no_idx")
    op.execute(
        """
        ALTER TABLE order_requests
          DROP COLUMN address, DROP COLUMN delivery, DROP COLUMN company_inn,
          DROP COLUMN company_name, DROP COLUMN buyer_type, DROP COLUMN order_no
        """
    )
    op.execute("ALTER TABLE products DROP COLUMN featured")
    op.execute("ALTER TABLE product_categories DROP COLUMN sort")
