"""Producer desk: company details, stock quantities, order notes and response time.

Revision ID: 0018
Revises: 0017
"""

from alembic import op

revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE producers ADD COLUMN description text, ADD COLUMN website varchar(200), ADD COLUMN contact_person varchar(120), ADD COLUMN work_hours varchar(80), ADD COLUMN delivery_regions varchar(300)")
    op.execute("ALTER TABLE products ADD COLUMN stock_qty numeric(14,2), ADD COLUMN low_stock_at numeric(14,2)")
    op.execute("ALTER TABLE order_requests ADD COLUMN producer_note text, ADD COLUMN responded_at timestamptz")
    op.execute("CREATE TABLE product_price_log (id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE, price numeric(14,2) NOT NULL, changed_at timestamptz NOT NULL DEFAULT now())")
    op.execute("CREATE INDEX product_price_log_idx ON product_price_log (product_id, changed_at DESC)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS product_price_log")
    op.execute("ALTER TABLE order_requests DROP COLUMN producer_note, DROP COLUMN responded_at")
    op.execute("ALTER TABLE products DROP COLUMN stock_qty, DROP COLUMN low_stock_at")
    op.execute("ALTER TABLE producers DROP COLUMN description, DROP COLUMN website, DROP COLUMN contact_person, DROP COLUMN work_hours, DROP COLUMN delivery_regions")
