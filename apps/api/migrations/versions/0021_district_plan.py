"""District plan (yearly targets) and instructions the district administration gives to the teams.

Revision ID: 0021
Revises: 0020
"""

from alembic import op

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE district_targets (
            year smallint NOT NULL,
            metric varchar(30) NOT NULL,
            target integer NOT NULL CHECK (target >= 0),
            updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
            updated_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY (year, metric)
        )
        """
    )
    op.execute(
        """
        CREATE TABLE district_tasks (
            id uuid PRIMARY KEY,
            team varchar(12) NOT NULL CHECK (team IN ('employment', 'agency', 'mahalla', 'education')),
            title varchar(200) NOT NULL,
            detail text,
            due date,
            status varchar(10) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DONE', 'CANCELLED')),
            created_by uuid REFERENCES users(id) ON DELETE SET NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            done_by uuid REFERENCES users(id) ON DELETE SET NULL,
            done_at timestamptz,
            done_note text
        )
        """
    )
    op.execute("CREATE INDEX district_tasks_team_idx ON district_tasks (team, status, due)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS district_tasks")
    op.execute("DROP TABLE IF EXISTS district_targets")
