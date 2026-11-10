"""Course duration: 6-12 months, or about 3 months for an accelerated course.

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-10

Every course now lasts 6 to 12 months (170-380 days). Only an accelerated course, meant
for people who already have both a trade and a language, may be about 3 months (80-100 days).
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0008"
down_revision: str | Sequence[str] | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE courses ADD COLUMN accelerated boolean NOT NULL DEFAULT false")
    op.execute("ALTER TABLE courses DROP CONSTRAINT courses_check1")
    # Existing short courses are lengthened to the new 6-month minimum before the rule is enforced.
    op.execute("UPDATE courses SET end_date = start_date + 180 WHERE (end_date - start_date) < 170")
    op.execute(
        """
        ALTER TABLE courses ADD CONSTRAINT courses_duration_check CHECK (
          (NOT accelerated AND (end_date - start_date) BETWEEN 170 AND 380)
          OR (accelerated AND (end_date - start_date) BETWEEN 80 AND 100)
        )
        """
    )
    op.execute("UPDATE trades SET domestic_months = 6 WHERE domestic_months < 6")


def downgrade() -> None:
    op.execute("ALTER TABLE courses DROP CONSTRAINT courses_duration_check")
    op.execute("UPDATE courses SET end_date = start_date + 100 WHERE accelerated AND (end_date - start_date) < 80")
    op.execute("UPDATE courses SET end_date = start_date + 190 WHERE track = 'DOMESTIC' AND (end_date - start_date) > 190")
    op.execute(
        """
        ALTER TABLE courses ADD CONSTRAINT courses_check1 CHECK (
          (track = 'DOMESTIC' AND (end_date - start_date) BETWEEN 80 AND 190)
          OR (track = 'FOREIGN' AND (end_date - start_date) BETWEEN 170 AND 380)
        )
        """
    )
    op.execute("ALTER TABLE courses DROP COLUMN accelerated")
