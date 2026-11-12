"""Who submitted a partnership request (employment office adds partners on behalf of organisations).

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-12
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0013"
down_revision: str | Sequence[str] | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE partner_requests ADD COLUMN submitted_by uuid REFERENCES users(id) ON DELETE SET NULL")


def downgrade() -> None:
    op.execute("ALTER TABLE partner_requests DROP COLUMN IF EXISTS submitted_by")
