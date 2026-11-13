"""Moderation: the moderator role, rejected portfolio items and indexes for the audit log.

Revision ID: 0020
Revises: 0019
"""

from alembic import op

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE role_code ADD VALUE IF NOT EXISTS 'moderator'")
    op.execute("ALTER TABLE portfolio_items ADD COLUMN rejected_at timestamptz, ADD COLUMN rejected_by uuid, ADD COLUMN rejected_reason text")
    op.execute("CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log (entity, created_at DESC)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS audit_log_entity_idx")
    op.execute("DROP INDEX IF EXISTS audit_log_created_idx")
    op.execute("ALTER TABLE portfolio_items DROP COLUMN rejected_at, DROP COLUMN rejected_by, DROP COLUMN rejected_reason")
