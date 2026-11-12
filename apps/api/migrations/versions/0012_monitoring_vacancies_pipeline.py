"""Monitoring (teacher surveys), rich vacancies, employer legal data and documents, abroad pipeline, graduate leads.

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-12
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0012"
down_revision: str | Sequence[str] | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE role_code ADD VALUE IF NOT EXISTS 'university_officer'")

    # Anonymous end-of-term student survey of teachers (HEMIS-style). The API never returns the student.
    op.execute(
        """
        CREATE TABLE teacher_surveys (
            id uuid PRIMARY KEY,
            group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            mentor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            student_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            round varchar(10) NOT NULL,
            scores jsonb NOT NULL,
            comment text,
            created_at timestamptz NOT NULL DEFAULT now(),
            UNIQUE (student_user_id, mentor_user_id, round)
        )
        """
    )
    op.execute("CREATE INDEX teacher_surveys_mentor ON teacher_surveys (mentor_user_id, round)")

    # Vacancies: what the employer asks for and offers.
    op.execute(
        """
        ALTER TABLE demand_requests
            ADD COLUMN title varchar(160),
            ADD COLUMN requirements jsonb,
            ADD COLUMN duties text,
            ADD COLUMN benefits jsonb,
            ADD COLUMN schedule varchar(120),
            ADD COLUMN deadline date,
            ADD COLUMN city varchar(120),
            ADD COLUMN address varchar(300),
            ADD COLUMN map_url varchar(300)
        """
    )

    # Employer legal data and documents.
    op.execute(
        """
        ALTER TABLE employers
            ADD COLUMN legal_name varchar(200),
            ADD COLUMN registration_no varchar(60),
            ADD COLUMN address varchar(300),
            ADD COLUMN website varchar(200),
            ADD COLUMN contact_person varchar(120),
            ADD COLUMN contact_email varchar(120),
            ADD COLUMN contact_phone varchar(25),
            ADD COLUMN description text
        """
    )
    op.execute(
        """
        CREATE TABLE employer_documents (
            id uuid PRIMARY KEY,
            employer_id uuid NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
            kind varchar(20) NOT NULL CHECK (kind IN ('REGISTRATION', 'LICENSE', 'POWER_OF_ATTORNEY', 'CONTRACT', 'OTHER')),
            filename varchar(200) NOT NULL,
            mime varchar(40) NOT NULL,
            size_bytes integer NOT NULL,
            content bytea NOT NULL,
            uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            checked_by uuid REFERENCES users(id) ON DELETE SET NULL,
            checked_at timestamptz
        )
        """
    )
    op.execute("CREATE INDEX employer_documents_employer ON employer_documents (employer_id)")

    # Abroad pipeline stage per candidate.
    op.execute(
        """
        ALTER TABLE request_candidates
            ADD COLUMN stage varchar(16) NOT NULL DEFAULT 'SHORTLISTED'
                CHECK (stage IN ('SHORTLISTED', 'DOCS', 'LANGUAGE', 'INTERVIEW', 'OFFER', 'VISA', 'DEPARTED', 'REJECTED')),
            ADD COLUMN stage_note text,
            ADD COLUMN stage_at timestamptz,
            ADD COLUMN proposed_by uuid REFERENCES users(id) ON DELETE SET NULL
        """
    )

    # University graduates the university office wants to bring into the project.
    op.execute(
        """
        CREATE TABLE graduate_leads (
            id uuid PRIMARY KEY,
            partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
            full_name varchar(160) NOT NULL,
            phone varchar(13) NOT NULL CHECK (phone ~ '^\\+998[0-9]{9}$'),
            specialty varchar(160),
            graduation_year smallint,
            abroad_interest boolean NOT NULL DEFAULT true,
            status varchar(12) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'INTERESTED', 'APPLIED', 'DECLINED')),
            note text,
            application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
            created_by uuid REFERENCES users(id) ON DELETE SET NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            UNIQUE (partner_id, phone)
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS graduate_leads")
    op.execute("ALTER TABLE request_candidates DROP COLUMN IF EXISTS stage, DROP COLUMN IF EXISTS stage_note, DROP COLUMN IF EXISTS stage_at, DROP COLUMN IF EXISTS proposed_by")
    op.execute("DROP TABLE IF EXISTS employer_documents")
    op.execute(
        "ALTER TABLE employers DROP COLUMN IF EXISTS legal_name, DROP COLUMN IF EXISTS registration_no, DROP COLUMN IF EXISTS address, "
        "DROP COLUMN IF EXISTS website, DROP COLUMN IF EXISTS contact_person, DROP COLUMN IF EXISTS contact_email, "
        "DROP COLUMN IF EXISTS contact_phone, DROP COLUMN IF EXISTS description"
    )
    op.execute(
        "ALTER TABLE demand_requests DROP COLUMN IF EXISTS title, DROP COLUMN IF EXISTS requirements, DROP COLUMN IF EXISTS duties, "
        "DROP COLUMN IF EXISTS benefits, DROP COLUMN IF EXISTS schedule, DROP COLUMN IF EXISTS deadline, DROP COLUMN IF EXISTS city, "
        "DROP COLUMN IF EXISTS address, DROP COLUMN IF EXISTS map_url"
    )
    op.execute("DROP TABLE IF EXISTS teacher_surveys")
