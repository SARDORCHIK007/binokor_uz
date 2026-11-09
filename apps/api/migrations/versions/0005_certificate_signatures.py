"""Certificate signatures: the leader and partner organisations sign one by one (FR-CERT-PDF).

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-09
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0005"
down_revision: str | Sequence[str] | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE certificate_signatures (
            certificate_id uuid NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
            partner_slug varchar(40) NOT NULL,
            signed_by uuid NOT NULL REFERENCES users(id),
            signed_at timestamptz NOT NULL DEFAULT now(),
            signature varchar(128) NOT NULL,
            PRIMARY KEY (certificate_id, partner_slug)
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS certificate_signatures")
