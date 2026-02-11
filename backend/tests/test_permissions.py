"""
Unit tests for role-based permissions
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from main import app
from models.user import User
from models.role import Role
from passlib.hash import bcrypt

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def admin_role(db_session):
    db = TestingSessionLocal()
    role = Role(role_name="Admin", permissions={"all": True})
    db.add(role)
    db.commit()
    db.refresh(role)
    yield role
    db.close()

@pytest.fixture
def sales_role(db_session):
    db = TestingSessionLocal()
    role = Role(role_name="Sales", permissions={"leads": True, "submissions": True})
    db.add(role)
    db.commit()
    db.refresh(role)
    yield role
    db.close()

@pytest.fixture
def readonly_role(db_session):
    db = TestingSessionLocal()
    role = Role(role_name="ReadOnly", permissions={"view": True})
    db.add(role)
    db.commit()
    db.refresh(role)
    yield role
    db.close()

@pytest.fixture
def admin_user(db_session, admin_role):
    db = TestingSessionLocal()
    user = User(
        name="Admin",
        email="admin@test.com",
        hashed_password=bcrypt.hash("admin123"),
        role_id=admin_role.id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    yield user
    db.close()

@pytest.fixture
def sales_user(db_session, sales_role):
    db = TestingSessionLocal()
    user = User(
        name="Sales User",
        email="sales@test.com",
        hashed_password=bcrypt.hash("sales123"),
        role_id=sales_role.id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    yield user
    db.close()

@pytest.fixture
def readonly_user(db_session, readonly_role):
    db = TestingSessionLocal()
    user = User(
        name="ReadOnly User",
        email="readonly@test.com",
        hashed_password=bcrypt.hash("readonly123"),
        role_id=readonly_role.id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    yield user
    db.close()

def test_admin_can_access_all(client, admin_user):
    """Test admin can access all endpoints"""
    login_response = client.post(
        "/auth/login",
        data={"username": "admin@test.com", "password": "admin123"}
    )
    token = login_response.json()["access_token"]
    
    # Admin should be able to access leads
    response = client.get(
        "/leads",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200

def test_sales_can_access_leads(client, sales_user):
    """Test sales user can access leads"""
    login_response = client.post(
        "/auth/login",
        data={"username": "sales@test.com", "password": "sales123"}
    )
    token = login_response.json()["access_token"]
    
    response = client.get(
        "/leads",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200

def test_readonly_can_view_leads(client, readonly_user):
    """Test readonly user can view leads"""
    login_response = client.post(
        "/auth/login",
        data={"username": "readonly@test.com", "password": "readonly123"}
    )
    token = login_response.json()["access_token"]
    
    # Readonly should be able to view
    response = client.get(
        "/leads",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200

def test_readonly_cannot_create_lead(client, readonly_user):
    """Test readonly user cannot create leads"""
    login_response = client.post(
        "/auth/login",
        data={"username": "readonly@test.com", "password": "readonly123"}
    )
    token = login_response.json()["access_token"]
    
    lead_data = {
        "name": "Test Lead",
        "email": "lead@test.com",
        "company": "Test Company",
        "source": "Website"
    }
    response = client.post(
        "/leads",
        json=lead_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    # Should be 403 Forbidden
    assert response.status_code == 403

