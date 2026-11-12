"""Staff onboarding: new roles, organisation members, invitations, partnership requests.

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-12

* five new roles: mahalla_assistant, employment_officer, agency_officer, migration_observer, district_official
* partner_members links a person to the partner organisation they work for
* staff_mahallas links a mahalla assistant to the mahalla(s) they look after
* invitations: an administrator invites a person by phone; the role is granted on their first login
* partner_requests: public "become a partner" requests that an administrator reviews
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0010"
down_revision: str | Sequence[str] | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NEW_ROLES = ("mahalla_assistant", "employment_officer", "agency_officer", "migration_observer", "district_official")


def upgrade() -> None:
    with op.get_context().autocommit_block():
        for role in NEW_ROLES:
            op.execute(f"ALTER TYPE role_code ADD VALUE IF NOT EXISTS '{role}'")
    op.execute(
        """
        CREATE TABLE partner_members (
            partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
            user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title varchar(120),
            created_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY (partner_id, user_id)
        )
        """
    )
    op.execute(
        """
        CREATE TABLE staff_mahallas (
            user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            mahalla_id uuid NOT NULL REFERENCES mahallas(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, mahalla_id)
        )
        """
    )
    op.execute(
        """
        CREATE TABLE invitations (
            id uuid PRIMARY KEY,
            phone varchar(13) NOT NULL,
            full_name varchar(120) NOT NULL,
            role role_code NOT NULL,
            partner_id uuid REFERENCES partners(id) ON DELETE SET NULL,
            mahalla_id uuid REFERENCES mahallas(id) ON DELETE SET NULL,
            org_name varchar(200),
            country_code char(2),
            title varchar(120),
            status varchar(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REVOKED')),
            created_by uuid REFERENCES users(id) ON DELETE SET NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            expires_at timestamptz NOT NULL,
            accepted_user uuid REFERENCES users(id) ON DELETE SET NULL,
            accepted_at timestamptz
        )
        """
    )
    op.execute("CREATE INDEX invitations_phone_pending ON invitations (phone) WHERE status = 'PENDING'")
    op.execute(
        """
        CREATE TABLE partner_requests (
            id uuid PRIMARY KEY,
            org_name varchar(200) NOT NULL,
            kind varchar(20) NOT NULL,
            country_code char(2),
            contact_name varchar(120) NOT NULL,
            phone varchar(13) NOT NULL,
            email varchar(120),
            message text,
            status varchar(10) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'APPROVED', 'REJECTED')),
            created_at timestamptz NOT NULL DEFAULT now(),
            decided_by uuid REFERENCES users(id) ON DELETE SET NULL,
            decided_at timestamptz,
            decision_note text
        )
        """
    )


def downgrade() -> None:
    # Enum values cannot be removed in PostgreSQL; the unused values stay in role_code.
    op.execute("DROP TABLE IF EXISTS partner_requests")
    op.execute("DROP TABLE IF EXISTS invitations")
    op.execute("DROP TABLE IF EXISTS staff_mahallas")
    op.execute("DROP TABLE IF EXISTS partner_members")
