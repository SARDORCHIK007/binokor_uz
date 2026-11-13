"""Lesson diary: what was taught, homework, and who has done it.

Revision ID: 0016
Revises: 0015
"""

from alembic import op

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE lesson_logs (
            id uuid PRIMARY KEY,
            group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            lesson_date date NOT NULL,
            topic text NOT NULL,
            homework text,
            note text,
            created_by uuid NOT NULL REFERENCES users(id),
            created_at timestamptz NOT NULL DEFAULT now(),
            UNIQUE (group_id, lesson_date)
        )
        """
    )
    op.execute("CREATE INDEX lesson_logs_group_idx ON lesson_logs (group_id, lesson_date DESC)")
    op.execute(
        """
        CREATE TABLE homework_done (
            log_id uuid NOT NULL REFERENCES lesson_logs(id) ON DELETE CASCADE,
            student_user_id uuid NOT NULL REFERENCES users(id),
            done_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY (log_id, student_user_id)
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS homework_done")
    op.execute("DROP TABLE IF EXISTS lesson_logs")
