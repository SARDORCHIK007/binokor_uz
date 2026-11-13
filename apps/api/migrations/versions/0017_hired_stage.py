"""Allow the HIRED stage on candidates proposed to local employers.

Revision ID: 0017
Revises: 0016
"""

from alembic import op

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None

OLD = "'SHORTLISTED','DOCS','LANGUAGE','INTERVIEW','OFFER','VISA','DEPARTED','REJECTED'"


def upgrade() -> None:
    op.execute("ALTER TABLE request_candidates DROP CONSTRAINT request_candidates_stage_check")
    op.execute(f"ALTER TABLE request_candidates ADD CONSTRAINT request_candidates_stage_check CHECK (stage IN ({OLD}, 'HIRED'))")


def downgrade() -> None:
    op.execute("UPDATE request_candidates SET stage = 'DEPARTED' WHERE stage = 'HIRED'")
    op.execute("ALTER TABLE request_candidates DROP CONSTRAINT request_candidates_stage_check")
    op.execute(f"ALTER TABLE request_candidates ADD CONSTRAINT request_candidates_stage_check CHECK (stage IN ({OLD}))")
