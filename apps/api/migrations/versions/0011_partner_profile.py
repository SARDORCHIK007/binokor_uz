"""Partner profile: fields an organisation's own staff can edit, with an audit log.

Revision ID: 0011
Revises: 0010
Create Date: 2026-11-12
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0011"
down_revision: str | Sequence[str] | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE partners
            ADD COLUMN about jsonb,
            ADD COLUMN website varchar(200),
            ADD COLUMN contact_email varchar(120),
            ADD COLUMN contact_phone varchar(20),
            ADD COLUMN address varchar(200),
            ADD COLUMN profile_updated_at timestamptz,
            ADD COLUMN profile_updated_by uuid REFERENCES users(id) ON DELETE SET NULL
        """
    )
    op.execute(
        """
        CREATE TABLE partner_profile_log (
            id uuid PRIMARY KEY,
            partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
            user_id uuid REFERENCES users(id) ON DELETE SET NULL,
            changed jsonb NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS partner_profile_log")
    op.execute(
        """
        ALTER TABLE partners
            DROP COLUMN IF EXISTS about, DROP COLUMN IF EXISTS website, DROP COLUMN IF EXISTS contact_email,
            DROP COLUMN IF EXISTS contact_phone, DROP COLUMN IF EXISTS address,
            DROP COLUMN IF EXISTS profile_updated_at, DROP COLUMN IF EXISTS profile_updated_by
        """
    )
