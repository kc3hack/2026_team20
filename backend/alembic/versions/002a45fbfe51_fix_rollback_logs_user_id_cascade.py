"""fix rollback_logs.user_id cascade to set null

Revision ID: 002a45fbfe51
Revises: e263b4b4cc1f
Create Date: 2026-02-20

The original migration created rollback_logs.user_id with ondelete="CASCADE",
but the model specifies ondelete="SET NULL".  CASCADE deletes audit logs when a
user is removed, violating audit-trail integrity.  This migration corrects the
foreign key constraint to SET NULL so rollback records are preserved.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002a45fbfe51"
down_revision: str | Sequence[str] | None = "e263b4b4cc1f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Change rollback_logs.user_id FK from CASCADE to SET NULL."""
    op.drop_constraint(
        "rollback_logs_user_id_fkey",
        "rollback_logs",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "rollback_logs_user_id_fkey",
        "rollback_logs",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Revert rollback_logs.user_id FK back to CASCADE."""
    op.drop_constraint(
        "rollback_logs_user_id_fkey",
        "rollback_logs",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "rollback_logs_user_id_fkey",
        "rollback_logs",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
