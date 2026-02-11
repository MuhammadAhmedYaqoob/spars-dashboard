"""
Unit tests for leads endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from main import app
from models.user import User
from models.role import Role
from models.lead import Lead
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
def admin_user(db_session, admin_role):
    db = TestingSessionLocal()
    user = User(
        name="Admin User",
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
def auth_token(client, admin_user):
    response = client.post(
        "/auth/login",
        data={"username": "admin@test.com", "password": "admin123"}
    )
    return response.json()["access_token"]

def test_get_leads(client, auth_token):
    """Test getting all leads"""
    response = client.get(
        "/leads",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_lead(client, auth_token):
    """Test creating a lead"""
    lead_data = {
        "name": "Test Lead",
        "email": "lead@test.com",
        "company": "Test Company",
        "source": "Website",
        "status": "New",
        "assigned": "Unassigned"
    }
    response = client.post(
        "/leads",
        json=lead_data,
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Lead"
    assert data["email"] == "lead@test.com"

def test_get_lead_by_id(client, auth_token, admin_user):
    """Test getting a specific lead"""
    # Create a lead first
    db = TestingSessionLocal()
    lead = Lead(
        name="Test Lead",
        email="lead@test.com",
        company="Test Company",
        source="Website",
        status="New",
        assigned="Unassigned"
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    lead_id = lead.id
    db.close()
    
    # Get the lead
    response = client.get(
        f"/leads/{lead_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    assert response.json()["id"] == lead_id

def test_get_lead_not_found(client, auth_token):
    """Test getting a non-existent lead"""
    response = client.get(
        "/leads/99999",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 404

def test_update_lead(client, auth_token, admin_user):
    """Test updating a lead"""
    # Create a lead first
    db = TestingSessionLocal()
    lead = Lead(
        name="Test Lead",
        email="lead@test.com",
        company="Test Company",
        source="Website",
        status="New",
        assigned="Unassigned"
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    lead_id = lead.id
    db.close()
    
    # Update the lead
    update_data = {"status": "Contacted"}
    response = client.patch(
        f"/leads/{lead_id}",
        json=update_data,
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "Contacted"

def test_create_lead_unauthorized(client):
    """Test creating a lead without authentication"""
    lead_data = {
        "name": "Test Lead",
        "email": "lead@test.com",
        "company": "Test Company",
        "source": "Website"
    }
    response = client.post("/leads", json=lead_data)
    assert response.status_code == 401

