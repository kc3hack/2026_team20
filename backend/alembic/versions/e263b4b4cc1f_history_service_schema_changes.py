"""create all tables in final schema state

Revision ID: e263b4b4cc1f
Revises:
Create Date: 2026-02-19

This is the initial migration that creates all tables from scratch.
The models already define the final schema (plot-level snapshots, version columns,
rollback_logs), so we create everything directly in the target state.

Originally this migration was written as ALTER-based changes to cold_snapshots,
but since the DB has never been migrated, we create all tables fresh instead.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e263b4b4cc1f"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create all tables in the final schema state."""

    # ----------------------------------------------------------------
    # 1. users
    # ----------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_users_display_name", "users", ["display_name"])

    # ----------------------------------------------------------------
    # 2. plots (with version column for optimistic locking)
    #    version starts at 0 ("no rollbacks yet")
    # ----------------------------------------------------------------
    op.create_table(
        "plots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.String(2000), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("is_paused", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("pause_reason", sa.Text(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("thumbnail_url", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_plots_owner_id", "plots", ["owner_id"])

    # ----------------------------------------------------------------
    # 3. sections
    # ----------------------------------------------------------------
    op.create_table(
        "sections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "plot_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.JSON(), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["plot_id"],
            ["plots.id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_sections_plot_id", "sections", ["plot_id"])

    # ----------------------------------------------------------------
    # 4. hot_operations
    # ----------------------------------------------------------------
    op.create_table(
        "hot_operations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "section_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("operation_type", sa.String(20), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["section_id"],
            ["sections.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_hot_operations_section_id", "hot_operations", ["section_id"])
    op.create_index("ix_hot_operations_user_id", "hot_operations", ["user_id"])

    # ----------------------------------------------------------------
    # 5. cold_snapshots (final state: plot_id FK, not section_id)
    # ----------------------------------------------------------------
    op.create_table(
        "cold_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "plot_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("content", sa.JSON(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["plot_id"],
            ["plots.id"],
            name="cold_snapshots_plot_id_fkey",
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_cold_snapshots_plot_id", "cold_snapshots", ["plot_id"])

    # ----------------------------------------------------------------
    # 6. rollback_logs (audit log for rollback operations)
    #    snapshot_id uses SET NULL so logs survive snapshot pruning.
    # ----------------------------------------------------------------
    op.create_table(
        "rollback_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "plot_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "snapshot_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("snapshot_version", sa.Integer(), nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["plot_id"],
            ["plots.id"],
            name="rollback_logs_plot_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["snapshot_id"],
            ["cold_snapshots.id"],
            name="rollback_logs_snapshot_id_fkey",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="rollback_logs_user_id_fkey",
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_rollback_logs_plot_id", "rollback_logs", ["plot_id"])

    # ----------------------------------------------------------------
    # 7. stars
    # ----------------------------------------------------------------
    op.create_table(
        "stars",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "plot_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["plot_id"],
            ["plots.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("plot_id", "user_id", name="uq_star_plot_user"),
    )
    op.create_index("ix_stars_plot_id", "stars", ["plot_id"])
    op.create_index("ix_stars_user_id", "stars", ["user_id"])

    # ----------------------------------------------------------------
    # 8. forks
    # ----------------------------------------------------------------
    op.create_table(
        "forks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "source_plot_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "new_plot_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["source_plot_id"],
            ["plots.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["new_plot_id"],
            ["plots.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_forks_source_plot_id", "forks", ["source_plot_id"])
    op.create_index("ix_forks_user_id", "forks", ["user_id"])

    # ----------------------------------------------------------------
    # 9. threads
    # ----------------------------------------------------------------
    op.create_table(
        "threads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "plot_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "section_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["plot_id"],
            ["plots.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["section_id"],
            ["sections.id"],
            ondelete="SET NULL",
        ),
    )
    op.create_index("ix_threads_plot_id", "threads", ["plot_id"])

    # ----------------------------------------------------------------
    # 10. comments
    # ----------------------------------------------------------------
    op.create_table(
        "comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "thread_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("content", sa.String(5000), nullable=False),
        sa.Column(
            "parent_comment_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["thread_id"],
            ["threads.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["parent_comment_id"],
            ["comments.id"],
            ondelete="SET NULL",
        ),
    )
    op.create_index("ix_comments_thread_id", "comments", ["thread_id"])

    # ----------------------------------------------------------------
    # 11. plot_bans
    # ----------------------------------------------------------------
    op.create_table(
        "plot_bans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "plot_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["plot_id"],
            ["plots.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("plot_id", "user_id", name="uq_plotban_plot_user"),
    )
    op.create_index("ix_plot_bans_plot_id", "plot_bans", ["plot_id"])
    op.create_index("ix_plot_bans_user_id", "plot_bans", ["user_id"])


def downgrade() -> None:
    """Drop all tables in reverse dependency order."""
    op.drop_table("plot_bans")
    op.drop_table("comments")
    op.drop_table("threads")
    op.drop_table("forks")
    op.drop_table("stars")
    op.drop_table("rollback_logs")
    op.drop_table("cold_snapshots")
    op.drop_table("hot_operations")
    op.drop_table("sections")
    op.drop_table("plots")
    op.drop_table("users")
