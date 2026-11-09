"""Daily vocabulary activity for streaks and weekly charts (FR-VOCAB-STREAK).

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-09
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002"
down_revision: str | Sequence[str] | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE vocab_days (
            user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            day date NOT NULL,
            answers integer NOT NULL DEFAULT 0 CHECK (answers >= 0),
            correct integer NOT NULL DEFAULT 0 CHECK (correct >= 0),
            PRIMARY KEY (user_id, day)
        )
        """
    )
    # Backfill one row per user and day from the last answers we already know about.
    op.execute(
        """
        INSERT INTO vocab_days (user_id, day, answers, correct)
        SELECT user_id, (last_answer_at AT TIME ZONE 'Asia/Tashkent')::date, count(*), 0
        FROM vocab_progress
        WHERE last_answer_at IS NOT NULL
        GROUP BY 1, 2
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE vocab_days")
