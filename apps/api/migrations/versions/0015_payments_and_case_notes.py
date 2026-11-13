"""Stipend payments for the employment office, and shared case notes and tasks about a person.

Revision ID: 0015
Revises: 0014
Create Date: 2026-11-13

Payments are an internal ledger: who is eligible this month, who is held and why, who was approved and paid.
No bank or card details are stored; the treasury pays from the exported list.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0015"
down_revision: str | Sequence[str] | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE payment_programs (
            id uuid PRIMARY KEY,
            name varchar(120) NOT NULL,
            monthly_amount numeric(14, 2) NOT NULL CHECK (monthly_amount > 0),
            min_attendance smallint NOT NULL DEFAULT 80 CHECK (min_attendance BETWEEN 0 AND 100),
            active boolean NOT NULL DEFAULT true,
            created_by uuid REFERENCES users(id) ON DELETE SET NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE payment_batches (
            id uuid PRIMARY KEY,
            program_id uuid NOT NULL REFERENCES payment_programs(id),
            period char(7) NOT NULL CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
            status varchar(10) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED')),
            note text,
            created_by uuid REFERENCES users(id) ON DELETE SET NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
            approved_at timestamptz,
            paid_by uuid REFERENCES users(id) ON DELETE SET NULL,
            paid_at timestamptz,
            UNIQUE (program_id, period)
        )
        """
    )
    op.execute(
        """
        CREATE TABLE payments (
            id uuid PRIMARY KEY,
            batch_id uuid NOT NULL REFERENCES payment_batches(id) ON DELETE CASCADE,
            person_id uuid NOT NULL REFERENCES persons(id),
            enrollment_id uuid REFERENCES enrollments(id) ON DELETE SET NULL,
            amount numeric(14, 2) NOT NULL DEFAULT 0,
            lessons integer NOT NULL DEFAULT 0,
            present integer NOT NULL DEFAULT 0,
            attendance_pct numeric(5, 1),
            status varchar(10) NOT NULL CHECK (status IN ('ELIGIBLE', 'HELD', 'PAID')),
            hold_reason varchar(20),
            note text,
            UNIQUE (batch_id, person_id)
        )
        """
    )
    op.execute("CREATE INDEX payments_person ON payments (person_id)")
    op.execute(
        """
        CREATE TABLE payment_log (
            id uuid PRIMARY KEY,
            batch_id uuid NOT NULL REFERENCES payment_batches(id) ON DELETE CASCADE,
            payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
            user_id uuid REFERENCES users(id) ON DELETE SET NULL,
            action varchar(24) NOT NULL,
            detail jsonb,
            created_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE case_notes (
            id uuid PRIMARY KEY,
            person_id uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
            author_id uuid REFERENCES users(id) ON DELETE SET NULL,
            team varchar(12) NOT NULL CHECK (team IN ('employment', 'agency', 'mahalla', 'education', 'admin')),
            body text NOT NULL,
            shared boolean NOT NULL DEFAULT true,
            created_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX case_notes_person ON case_notes (person_id, created_at DESC)")
    op.execute(
        """
        CREATE TABLE case_tasks (
            id uuid PRIMARY KEY,
            person_id uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
            team varchar(12) NOT NULL CHECK (team IN ('employment', 'agency', 'mahalla', 'education', 'admin')),
            title varchar(200) NOT NULL,
            due date,
            created_by uuid REFERENCES users(id) ON DELETE SET NULL,
            created_team varchar(12),
            created_at timestamptz NOT NULL DEFAULT now(),
            done_by uuid REFERENCES users(id) ON DELETE SET NULL,
            done_at timestamptz
        )
        """
    )
    op.execute("CREATE INDEX case_tasks_open ON case_tasks (team) WHERE done_at IS NULL")


def downgrade() -> None:
    for table in ("case_tasks", "case_notes", "payment_log", "payments", "payment_batches", "payment_programs"):
        op.execute(f"DROP TABLE IF EXISTS {table}")
