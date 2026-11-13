"""Graduate leads: next follow-up date and last contact.

Revision ID: 0019
Revises: 0018
"""

from alembic import op

revision = "0019"
down_revision = "0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE graduate_leads ADD COLUMN follow_up date, ADD COLUMN last_contact date")
    op.execute("CREATE INDEX graduate_leads_follow_idx ON graduate_leads (partner_id, follow_up) WHERE follow_up IS NOT NULL")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS graduate_leads_follow_idx")
    op.execute("ALTER TABLE graduate_leads DROP COLUMN follow_up, DROP COLUMN last_contact")
