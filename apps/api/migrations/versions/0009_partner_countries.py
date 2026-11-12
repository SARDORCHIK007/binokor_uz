"""Partner countries: Korea, Japan, Germany, Russia, Italy.

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-12

Russia and Italy are added as destinations. Saudi Arabia, the UAE and Turkey are switched off
(is_active = false, nothing is deleted) because the project now lists five partner countries.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0009"
down_revision: str | Sequence[str] | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NOTE = "Jamoa agentlik orqali ketadi. 1000 so'z til imtihonining o'rnini bosmaydi."


def upgrade() -> None:
    for code, name, lang in (("RU", "Rossiya", "ru"), ("IT", "Italiya", "it")):
        op.execute(
            f"""
            INSERT INTO destinations (id, country_code, name, lang_code, notes)
            SELECT gen_random_uuid(), '{code}', '{{"uz-Latn": "{name}"}}'::jsonb, '{lang}',
                   '{{"uz-Latn": "{NOTE}"}}'::jsonb
            WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE country_code = '{code}')
            """
        )
    op.execute("UPDATE destinations SET is_active = true WHERE country_code IN ('KR', 'JP', 'DE', 'RU', 'IT')")
    op.execute("UPDATE destinations SET is_active = false WHERE country_code IN ('SA', 'AE', 'TR')")


def downgrade() -> None:
    op.execute("UPDATE destinations SET is_active = true WHERE country_code IN ('SA', 'AE', 'TR')")
    op.execute("UPDATE destinations SET is_active = false WHERE country_code IN ('RU', 'IT')")
