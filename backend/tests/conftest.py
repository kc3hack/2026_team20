import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.auth import get_current_user
from app.core.database import Base, get_db
from app.main import app
from app.models import Plot, Section, User
from app.schemas import CurrentUser

TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  DB session fixture
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@pytest.fixture()
def db() -> Session:
    Base.metadata.create_all(bind=TEST_ENGINE)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=TEST_ENGINE)


TEST_USER_ID = uuid.UUID("00000000-0000-4000-a000-000000000001")
TEST_USER_EMAIL = "test@example.com"


@pytest.fixture()
def test_user(db: Session) -> User:
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
def test_plot(db: Session, test_user: User) -> Plot:
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
#  Auth fixtures
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@pytest.fixture()
def current_user() -> CurrentUser:
    return CurrentUser(id=TEST_USER_ID, email=TEST_USER_EMAIL, role="authenticated")


@pytest.fixture()
def auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer test-token"}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  FastAPI TestClient
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@pytest.fixture()
def client(db: Session, current_user: CurrentUser) -> TestClient:
    def _override_get_db():
        yield db

    def _override_get_current_user():
        return current_user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_get_current_user

    # Patch get_engine to return the test engine so the lifespan
    # shutdown (engine.dispose / cache_clear) doesn't crash without DATABASE_URL.
    with patch("app.core.database.get_engine", return_value=TEST_ENGINE):
        with patch("app.main.get_engine", return_value=TEST_ENGINE):
            with TestClient(app) as c:
                yield c

    app.dependency_overrides.clear()
