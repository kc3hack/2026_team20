"""ユーザーサービス - プロフィール更新ロジック。

endpoint 層から呼び出され、DB 操作 + Supabase Auth metadata 更新を担当する。
失敗時は ValueError を raise し、endpoint 側で HTTPException に変換する。

Supabase Auth の metadata 更新に失敗した場合、DB 変更をロールバックして
データの一貫性を保つ。
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.supabase import get_supabase_client
from app.models import User


def update_user_profile(
    db: Session,
    user_id: str,
    avatar_url: str | None,
) -> User:
    """ユーザープロフィールを更新する。

    DB の users.avatar_url と Supabase Auth の user_metadata.avatar_url を
    同時に更新する。Supabase 側の更新に失敗した場合は DB をロールバックし、
    ValueError を raise する。

    Args:
        db: SQLAlchemy セッション
        user_id: 更新対象のユーザー ID（UUID 文字列）
        avatar_url: 新しいアバター URL（None で削除）

    Returns:
        更新後の User オブジェクト

    Raises:
        ValueError: ユーザーが見つからない場合、または Supabase 更新に失敗した場合
    """
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if not user:
        raise ValueError("User not found")

    # DB の avatar_url を更新
    user.avatar_url = avatar_url
    db.flush()  # DB 変更を確定前に書き込み（commit はまだしない）

    # Supabase Auth の user_metadata を更新
    try:
        supabase = get_supabase_client()
        supabase.auth.admin.update_user_by_id(
            user_id,
            {"user_metadata": {"avatar_url": avatar_url}},
        )
    except Exception as e:
        # Supabase 更新失敗時は DB をロールバックして一貫性を保つ
        db.rollback()
        raise ValueError(f"Failed to update Supabase Auth metadata: {e}") from e

    db.commit()
    db.refresh(user)
    return user
