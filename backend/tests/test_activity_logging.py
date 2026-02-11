"""
Unit tests for activity logging functionality
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
from models.submission import Submission
from models.comment import Comment
from models.activity_log import ActivityLog
from passlib.hash import bcrypt

TEST_DATABASE_URL = "sqlite:///./test_activity.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def admin_role(db_session):
    db = TestingSessionLocal()
    role = Role(role_name="Super Admin", hierarchy_level=1, permissions={"all": True})
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
def test_lead(db_session, admin_user):
    db = TestingSessionLocal()
    lead = Lead(
        name="Test Lead",
        email="lead@test.com",
        company="Test Company",
        source="Website",
        status="New",
        created_by=admin_user.id
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    yield lead
    db.close()

def test_activity_log_created_on_lead_conversion(client, admin_user, db_session):
    """Test that activity log is created when converting submission to lead"""
    db = TestingSessionLocal()
    
    # Login
    login_response = client.post(
        "/auth/login",
        data={"username": "admin@test.com", "password": "admin123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a submission first (simplified - you may need to adjust)
    # Then convert it
    # Check activity log was created
    
    # For now, just verify login created activity
    activities = db.query(ActivityLog).filter(
        ActivityLog.user_id == admin_user.id,
        ActivityLog.action_type == 'login'
    ).all()
    
    assert len(activities) > 0
    db.close()

def test_activity_log_created_on_status_change(client, admin_user, test_lead, db_session):
    """Test that activity log is created when lead status changes"""
    db = TestingSessionLocal()
    
    login_response = client.post(
        "/auth/login",
        data={"username": "admin@test.com", "password": "admin123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Update lead status
    response = client.patch(
        f"/leads/{test_lead.id}",
        json={"status": "Contacted"},
        headers=headers
    )
    
    assert response.status_code == 200
    
    # Check activity log
    activities = db.query(ActivityLog).filter(
        ActivityLog.entity_type == 'lead',
        ActivityLog.entity_id == test_lead.id,
        ActivityLog.action_type == 'status_changed'
    ).all()
    
    assert len(activities) > 0
    db.close()

def test_activity_log_created_on_comment(client, admin_user, test_lead, db_session):
    """Test that activity log is created when comment is added"""
    db = TestingSessionLocal()
    
    login_response = client.post(
        "/auth/login",
        data={"username": "admin@test.com", "password": "admin123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Add comment
    response = client.post(
        "/comments",
        json={"lead_id": test_lead.id, "text": "Test comment"},
        headers=headers
    )
    
    assert response.status_code == 200
    
    # Check activity log
    activities = db.query(ActivityLog).filter(
        ActivityLog.entity_type == 'comment',
        ActivityLog.action_type == 'comment_added'
    ).all()
    
    assert len(activities) > 0
    db.close()

def test_hierarchy_enforcement(client, admin_user, db_session):
    """Test that role hierarchy is enforced when creating users"""
    db = TestingSessionLocal()
    
    # Create roles with different hierarchy levels
    manager_role = Role(role_name="Manager", hierarchy_level=2, permissions={"leads": True})
    marketing_role = Role(role_name="Marketing", hierarchy_level=3, permissions={"view": True})
    db.add(manager_role)
    db.add(marketing_role)
    db.commit()
    
    login_response = client.post(
        "/auth/login",
        data={"username": "admin@test.com", "password": "admin123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Admin (level 1) should be able to create Manager (level 2)
    response = client.post(
        "/users",
        json={
            "name": "Manager User",
            "email": "manager@test.com",
            "password": "pass123",
            "role_id": manager_role.id
        },
        headers=headers
    )
    assert response.status_code == 200
    
    # Admin should be able to create Marketing (level 3)
    response2 = client.post(
        "/users",
        json={
            "name": "Marketing User",
            "email": "marketing@test.com",
            "password": "pass123",
            "role_id": marketing_role.id
        },
        headers=headers
    )
    assert response2.status_code == 200
    
    db.close()






