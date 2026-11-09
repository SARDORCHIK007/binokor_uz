"""Baseline schema (FR-OPS-01).

The database was first built by hand from docs/04_DATA_MODEL.sql, so there was no Alembic
history. This revision replays that schema on an empty database. On the existing dev
database run ``alembic stamp 0001`` once instead of ``upgrade``.

Revision ID: 0001
Revises:
Create Date: 2026-11-09
"""

from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SQL = Path(__file__).with_name("0001_baseline.sql")


def upgrade() -> None:
    connection = op.get_bind()
    connection.exec_driver_sql(SQL.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP SCHEMA public CASCADE")
    op.execute("CREATE SCHEMA public")
    op.execute("GRANT ALL ON SCHEMA public TO public")
    # Alembic removes its own row after this function returns; keep the table it expects.
    op.execute("CREATE TABLE public.alembic_version (version_num varchar(32) PRIMARY KEY)")
    op.execute(f"INSERT INTO public.alembic_version VALUES ('{revision}')")
