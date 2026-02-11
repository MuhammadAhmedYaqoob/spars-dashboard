"""
Unit tests for authentication and authorization
"""
import pytest

def test_login_success(client, test_user):
    """Test successful login"""
    response = client.post(
        "/auth/login",
        data={"username": "test@example.com", "password": "testpass123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "user" in data
    assert data["user"]["email"] == "test@example.com"

def test_login_invalid_credentials(client):
    """Test login with invalid credentials"""
    response = client.post(
        "/auth/login",
        data={"username": "wrong@example.com", "password": "wrongpass"}
    )
    assert response.status_code == 401

def test_get_current_user(client, auth_token):
    """Test getting current user with valid token"""
    if not auth_token:
        pytest.skip("Auth token not available")
    
    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"

def test_get_current_user_no_token(client):
    """Test getting current user without token"""
    response = client.get("/auth/me")
    assert response.status_code == 401

def test_protected_endpoint_without_auth(client):
    """Test accessing protected endpoint without authentication"""
    response = client.get("/leads")
    assert response.status_code == 401

def test_protected_endpoint_with_auth(client, auth_token):
    """Test accessing protected endpoint with authentication"""
    if not auth_token:
        pytest.skip("Auth token not available")
    
    response = client.get(
        "/leads",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200

