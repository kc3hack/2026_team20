"""テスト共通フィクスチャ。

認証モック戦略:
- get_current_user と get_optional_user の両方を dependency_overrides で差し替える。
  get_optional_user は内部で独自の HTTPBearer(auto_error=False) を使うため、
  get_current_user だけの差し替えでは JWKS 検証が走ってしまう。
- client: 認証済み（TEST_USER）
- unauthed_client: 認証なし（get_current_user はオーバーライドしない → 401）
- admin_client: 管理者権限ユーザー
- other_user_client: 別ユーザー（403 テスト用）
"""

import uuid
from collections.abc import Generator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.auth import get_current_user, get_optional_user
from app.core.database import Base, get_db
from app.main import app
from app.models import Plot, Section, User
from app.schemas import CurrentUser

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Test DB Engine (SQLite in-memory)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


# SQLite は外部キー制約がデフォルト無効。テストで整合性を担保するために有効化する。
@event.listens_for(TEST_ENGINE, "connect")
def _enable_sqlite_fk(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  定数: テストユーザー
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST_USER_ID = uuid.UUID("00000000-0000-4000-a000-000000000001")
TEST_USER_EMAIL = "test@example.com"

OTHER_USER_ID = uuid.UUID("00000000-0000-4000-a000-000000000002")
OTHER_USER_EMAIL = "other@example.com"

ADMIN_USER_ID = uuid.UUID("00000000-0000-4000-a000-000000000099")
ADMIN_USER_EMAIL = "admin@example.com"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  DB session fixture
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@pytest.fixture()
def db() -> Generator[Session, None, None]:
    """テストごとにテーブルを作成・破棄する SQLite セッション。"""
    Base.metadata.create_all(bind=TEST_ENGINE)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        # TestClient の context manager 終了時に FastAPI lifespan の shutdown が走り、
        # engine.dispose() が呼ばれることがある。その後 session.close() / drop_all を
        # 実行すると "Cannot operate on a closed database" が発生するため、
        # 安全に無視する。テストは in-memory SQLite なのでリソースリークの心配はない。
        try:
            session.close()
        except Exception:
            pass
        try:
            Base.metadata.drop_all(bind=TEST_ENGINE)
        except Exception:
            pass


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  User fixtures
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@pytest.fixture()
def test_user(db: Session) -> User:
    """テスト用メインユーザーを DB に INSERT して返す。"""
    user = User(
        id=TEST_USER_ID,
        email=TEST_USER_EMAIL,
        display_name="Test User",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def other_user(db: Session) -> User:
    """別ユーザーを DB に INSERT して返す（403 テスト用）。"""
    user = User(
        id=OTHER_USER_ID,
        email=OTHER_USER_EMAIL,
        display_name="Other User",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def admin_user(db: Session) -> User:
    """管理者ユーザーを DB に INSERT して返す。"""
    user = User(
        id=ADMIN_USER_ID,
        email=ADMIN_USER_EMAIL,
        display_name="Admin User",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Test data fixtures
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@pytest.fixture()
def test_plot(db: Session, test_user: User) -> Plot:
    """テスト用 Plot を DB に INSERT して返す。"""
    plot = Plot(
        title="Test Plot",
        description="A test plot",
        tags=["test"],
        owner_id=test_user.id,
    )
    db.add(plot)
    db.commit()
    db.refresh(plot)
    return plot


@pytest.fixture()
def test_section(db: Session, test_plot: Plot) -> Section:
    """テスト用 Section を DB に INSERT して返す。"""
    section = Section(
        plot_id=test_plot.id,
        title="Test Section",
        content={"type": "doc", "content": []},
        order_index=0,
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Auth CurrentUser fixtures
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@pytest.fixture()
def current_user() -> CurrentUser:
    return CurrentUser(id=TEST_USER_ID, email=TEST_USER_EMAIL, role="authenticated")


@pytest.fixture()
def other_current_user() -> CurrentUser:
    return CurrentUser(id=OTHER_USER_ID, email=OTHER_USER_EMAIL, role="authenticated")


@pytest.fixture()
def admin_current_user() -> CurrentUser:
    return CurrentUser(id=ADMIN_USER_ID, email=ADMIN_USER_EMAIL, role="admin")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Client ヘルパー
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _create_test_client(
    db: Session,
    authenticated_user: CurrentUser | None = None,
) -> TestClient:
    """TestClient を生成するヘルパー。

    authenticated_user が指定された場合:
        get_current_user → そのユーザーを返す
        get_optional_user → そのユーザーを返す
    authenticated_user が None の場合:
        get_current_user はオーバーライドしない（= HTTPBearer が None を返し 401 になる）
        get_optional_user → None を返す（未認証時はユーザーなし）
    """

    def _override_get_db():
        yield db

    app.dependency_overrides[get_db] = _override_get_db

    if authenticated_user is not None:

        def _override_get_current_user():
            return authenticated_user

        def _override_get_optional_user():
            return authenticated_user

        app.dependency_overrides[get_current_user] = _override_get_current_user
        app.dependency_overrides[get_optional_user] = _override_get_optional_user
    else:
        # 未認証クライアント: get_optional_user は None を返す
        # get_current_user はオーバーライドしない
        #   → HTTPBearer(auto_error=False) が None を返す
        #   → get_current_user 内の if credentials is None で 401 を返す
        def _override_get_optional_user_none():
            return None

        app.dependency_overrides[get_optional_user] = _override_get_optional_user_none

    return TestClient(app)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  FastAPI TestClient fixtures
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@pytest.fixture()
def client(db: Session, current_user: CurrentUser) -> Generator[TestClient, None, None]:
    """認証済みクライアント（TEST_USER として認証）。"""
    with patch("app.core.database.get_engine", return_value=TEST_ENGINE):
        with patch("app.main.get_engine", return_value=TEST_ENGINE):
            c = _create_test_client(db, authenticated_user=current_user)
            with c:
                yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def unauthed_client(db: Session) -> Generator[TestClient, None, None]:
    """未認証クライアント。AuthUser を要求するエンドポイントは 401 を返す。"""
    with patch("app.core.database.get_engine", return_value=TEST_ENGINE):
        with patch("app.main.get_engine", return_value=TEST_ENGINE):
            c = _create_test_client(db, authenticated_user=None)
            with c:
                yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def admin_client(
    db: Session, admin_current_user: CurrentUser
) -> Generator[TestClient, None, None]:
    """管理者権限クライアント。"""
    with patch("app.core.database.get_engine", return_value=TEST_ENGINE):
        with patch("app.main.get_engine", return_value=TEST_ENGINE):
            c = _create_test_client(db, authenticated_user=admin_current_user)
            with c:
                yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def other_user_client(
    db: Session, other_current_user: CurrentUser
) -> Generator[TestClient, None, None]:
    """別ユーザークライアント（403 テスト用）。"""
    with patch("app.core.database.get_engine", return_value=TEST_ENGINE):
        with patch("app.main.get_engine", return_value=TEST_ENGINE):
            c = _create_test_client(db, authenticated_user=other_current_user)
            with c:
                yield c
    app.dependency_overrides.clear()
