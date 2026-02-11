"""
Pytest configuration and fixtures
"""
import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from main import app
from models.user import User
from models.role import Role
from passlib.hash import bcrypt

# Use test database
TEST_DATABASE_URL = "sqlite:///./test.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function")
def db():
    """Create test database tables"""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def client():
    """Test client"""
    return TestClient(app)

@pytest.fixture
def test_role(db):
    """Create a test role"""
    session = TestingSessionLocal()
    role = Role(role_name="Test Role", permissions={"leads": True, "submissions": True})
    session.add(role)
    session.commit()
    session.refresh(role)
    role_id = role.id
    session.close()
    yield role_id

@pytest.fixture
def test_user(db, test_role):
    """Create a test user"""
    session = TestingSessionLocal()
    user = User(
        name="Test User",
        email="test@example.com",
        hashed_password=bcrypt.hash("testpass123"),
        role_id=test_role
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    user_email = user.email
    session.close()
    yield user_email

@pytest.fixture
def auth_token(client, test_user):
    """Get authentication token"""
    response = client.post(
        "/auth/login",
        data={"username": "test@example.com", "password": "testpass123"}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    return None




