"""
Comprehensive unit tests for all user roles and login functionality
Tests the actual roles from seed.py: Super Admin, Sales Manager, Marketing User, Read-Only User
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

# Use test database
TEST_DATABASE_URL = "sqlite:///./test_roles.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function")
def db_session():
    """Create test database tables"""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def client():
    """Test client"""
    return TestClient(app)

@pytest.fixture
def seed_roles(db_session):
    """Create all roles from seed.py"""
    db = TestingSessionLocal()
    roles_data = [
        {
            "role_name": "Super Admin", 
            "permissions": {
                "all": True, 
                "leads": True, 
                "submissions": True, 
                "users": True, 
                "roles": True, 
                "reports": True,
                "settings": True,
                "configuration": True
            }
        },
        {
            "role_name": "Sales Manager", 
            "permissions": {
                "leads": True, 
                "submissions": True, 
                "reports": True,
                "lead_assignment": True,
                "lead_followup": True,
                "lead_status_update": True,
                "lead_comments": True
            }
        },
        {
            "role_name": "Marketing User", 
            "permissions": {
                "view": True,
                "leads": False,  # View-only for leads
                "submissions": True,  # Can view submissions
                "reports": True  # Can view reports
            }
        },
        {
            "role_name": "Read-Only User", 
            "permissions": {
                "view": True
            }
        },
    ]
    roles = {}
    for role_data in roles_data:
        role = Role(**role_data)
        db.add(role)
        db.commit()
        db.refresh(role)
        # Store role ID and name, not the object itself
        roles[role_data["role_name"]] = {"id": role.id, "name": role.role_name}
    db.close()
    return roles

@pytest.fixture
def seed_users(db_session, seed_roles):
    """Create all users from seed.py"""
    db = TestingSessionLocal()
    users_data = [
        {"name": "Super Admin", "email": "admin@spars.com", "password": "admin123", "role_name": "Super Admin"},
        {"name": "Sales Manager", "email": "salesmanager@spars.com", "password": "manager123", "role_name": "Sales Manager"},
        {"name": "Marketing User", "email": "marketing@spars.com", "password": "marketing123", "role_name": "Marketing User"},
        {"name": "Read-Only User", "email": "readonly@spars.com", "password": "readonly123", "role_name": "Read-Only User"},
    ]
    users = {}
    for user_data in users_data:
        role_name = user_data.pop("role_name")
        password = user_data.pop("password")
        # Get role from database to ensure it's in the same session
        role = db.query(Role).filter(Role.role_name == role_name).first()
        if not role:
            continue
        hashed = bcrypt.hash(password)
        user = User(**user_data, hashed_password=hashed, role_id=role.id)
        db.add(user)
        db.commit()
        db.refresh(user)
        users[user_data["email"]] = user
    db.close()
    return users

# ========== LOGIN TESTS ==========

def test_super_admin_login(client, seed_users):
    """Test Super Admin can log in successfully"""
    response = client.post(
        "/auth/login",
        data={"username": "admin@spars.com", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "user" in data
    assert data["user"]["email"] == "admin@spars.com"
    assert data["user"]["role_name"] == "Super Admin"
    assert data["user"]["permissions"].get("all") == True

def test_sales_manager_login(client, seed_users):
    """Test Sales Manager can log in successfully"""
    response = client.post(
        "/auth/login",
        data={"username": "salesmanager@spars.com", "password": "manager123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "salesmanager@spars.com"
    assert data["user"]["role_name"] == "Sales Manager"
    assert data["user"]["permissions"].get("leads") == True

def test_marketing_user_login(client, seed_users):
    """Test Marketing User can log in successfully"""
    response = client.post(
        "/auth/login",
        data={"username": "marketing@spars.com", "password": "marketing123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "marketing@spars.com"
    assert data["user"]["role_name"] == "Marketing User"
    assert data["user"]["permissions"].get("view") == True

def test_readonly_user_login(client, seed_users):
    """Test Read-Only User can log in successfully"""
    response = client.post(
        "/auth/login",
        data={"username": "readonly@spars.com", "password": "readonly123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "readonly@spars.com"
    assert data["user"]["role_name"] == "Read-Only User"
    assert data["user"]["permissions"].get("view") == True

def test_login_invalid_email(client, seed_users):
    """Test login with invalid email"""
    response = client.post(
        "/auth/login",
        data={"username": "nonexistent@spars.com", "password": "anypassword"}
    )
    assert response.status_code == 401

def test_login_invalid_password(client, seed_users):
    """Test login with invalid password"""
    response = client.post(
        "/auth/login",
        data={"username": "admin@spars.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401

# ========== PERMISSION TESTS ==========

def test_super_admin_access_all(client, seed_users):
    """Test Super Admin can access all endpoints"""
    # Login
    login_response = client.post(
        "/auth/login",
        data={"username": "admin@spars.com", "password": "admin123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test access to various endpoints
    assert client.get("/leads", headers=headers).status_code == 200
    assert client.get("/submissions/demo", headers=headers).status_code == 200  # submissions requires form_type
    assert client.get("/users", headers=headers).status_code == 200
    assert client.get("/roles", headers=headers).status_code == 200
    assert client.get("/newsletter", headers=headers).status_code == 200

def test_sales_manager_access(client, seed_users):
    """Test Sales Manager can access leads and submissions"""
    login_response = client.post(
        "/auth/login",
        data={"username": "salesmanager@spars.com", "password": "manager123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Should have access
    assert client.get("/leads", headers=headers).status_code == 200
    assert client.get("/submissions/demo", headers=headers).status_code == 200  # submissions requires form_type
    
    # Should NOT have access to users/roles (unless they have "all" permission)
    # This depends on implementation - if check_permission("users") is used, it should be 403
    # If get_current_active_user is used, it might be 200 but empty

def test_marketing_user_view_only(client, seed_users):
    """Test Marketing User has view-only access"""
    login_response = client.post(
        "/auth/login",
        data={"username": "marketing@spars.com", "password": "marketing123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Should be able to view leads (view permission)
    assert client.get("/leads", headers=headers).status_code == 200
    assert client.get("/submissions/demo", headers=headers).status_code == 200  # submissions requires form_type

def test_readonly_user_view_only(client, seed_users):
    """Test Read-Only User has view-only access"""
    login_response = client.post(
        "/auth/login",
        data={"username": "readonly@spars.com", "password": "readonly123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Should be able to view leads (view permission)
    assert client.get("/leads", headers=headers).status_code == 200
    assert client.get("/submissions/demo", headers=headers).status_code == 200  # submissions requires form_type

def test_readonly_user_cannot_create_lead(client, seed_users):
    """Test Read-Only User cannot create leads"""
    login_response = client.post(
        "/auth/login",
        data={"username": "readonly@spars.com", "password": "readonly123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    lead_data = {
        "name": "Test Lead",
        "email": "lead@test.com",
        "company": "Test Company",
        "source": "Website"
    }
    response = client.post(
        "/leads",
        json=lead_data,
        headers=headers
    )
    # Should be 403 Forbidden
    assert response.status_code == 403

def test_sales_manager_can_create_lead(client, seed_users):
    """Test Sales Manager can create leads"""
    login_response = client.post(
        "/auth/login",
        data={"username": "salesmanager@spars.com", "password": "manager123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    lead_data = {
        "name": "Test Lead",
        "email": "lead@test.com",
        "company": "Test Company",
        "source": "Website"
    }
    response = client.post(
        "/leads",
        json=lead_data,
        headers=headers
    )
    # Should be 200 or 201
    assert response.status_code in [200, 201]

# ========== TOKEN VALIDATION TESTS ==========

def test_get_current_user_with_valid_token(client, seed_users):
    """Test getting current user with valid token"""
    login_response = client.post(
        "/auth/login",
        data={"username": "admin@spars.com", "password": "admin123"}
    )
    token = login_response.json()["access_token"]
    
    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "admin@spars.com"

def test_get_current_user_without_token(client):
    """Test getting current user without token"""
    response = client.get("/auth/me")
    assert response.status_code == 401

def test_get_current_user_with_invalid_token(client):
    """Test getting current user with invalid token"""
    response = client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401

# ========== PASSWORD CHANGE TESTS ==========

def test_change_password_success(client, seed_users):
    """Test successful password change"""
    login_response = client.post(
        "/auth/login",
        data={"username": "admin@spars.com", "password": "admin123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.post(
        "/auth/change-password",
        json={
            "old_password": "admin123",
            "new_password": "newadmin123"
        },
        headers=headers
    )
    assert response.status_code == 200
    
    # Verify can login with new password
    login_response2 = client.post(
        "/auth/login",
        data={"username": "admin@spars.com", "password": "newadmin123"}
    )
    assert login_response2.status_code == 200
    
    # Change back
    response2 = client.post(
        "/auth/change-password",
        json={
            "old_password": "newadmin123",
            "new_password": "admin123"
        },
        headers={"Authorization": f"Bearer {login_response2.json()['access_token']}"}
    )
    assert response2.status_code == 200

def test_change_password_wrong_old_password(client, seed_users):
    """Test password change with wrong old password"""
    login_response = client.post(
        "/auth/login",
        data={"username": "admin@spars.com", "password": "admin123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.post(
        "/auth/change-password",
        json={
            "old_password": "wrongpassword",
            "new_password": "newadmin123"
        },
        headers=headers
    )
    assert response.status_code == 401

def test_change_password_short_new_password(client, seed_users):
    """Test password change with too short new password"""
    login_response = client.post(
        "/auth/login",
        data={"username": "admin@spars.com", "password": "admin123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.post(
        "/auth/change-password",
        json={
            "old_password": "admin123",
            "new_password": "12345"  # Too short
        },
        headers=headers
    )
    assert response.status_code == 400

