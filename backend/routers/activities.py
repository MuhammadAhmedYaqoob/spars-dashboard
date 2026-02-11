from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import SessionLocal
from models.activity_log import ActivityLog
from models.user import User
from schemas.activity_log import ActivityLogOut
from routers.auth import get_current_active_user

router = APIRouter(prefix="/activities", tags=["Activities"])

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=list[ActivityLogOut])
def list_activities(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    entity_type: str | None = Query(None, description="Filter by entity type"),
    action_type: str | None = Query(None, description="Filter by action type"),
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    """List activities with pagination and filtering. Users see only their own activities unless Admin/Sales Manager."""
    from models.role import Role
    
    query = db.query(ActivityLog)
    
    # Check if user is Admin or Sales Manager (they can see all activities)
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not role or (role.role_name not in ["Admin", "Sales Manager"] and not role.permissions.get("all")):
        # Regular users (Sales Executive, Marketing, etc.) only see their own activities
        query = query.filter(ActivityLog.user_id == current_user.id)
    
    if entity_type:
        query = query.filter(ActivityLog.entity_type == entity_type)
    
    if action_type:
        query = query.filter(ActivityLog.action_type == action_type)
    
    activities = query.order_by(desc(ActivityLog.created_at)).offset(skip).limit(limit).all()
    return activities

@router.get("/lead/{lead_id}", response_model=list[ActivityLogOut])
def get_lead_activities(
    lead_id: int,
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get all activities for a specific lead. Users see only their own activities unless Admin/Sales Manager."""
    from models.role import Role
    
    query = db.query(ActivityLog).filter(
        ActivityLog.entity_type == 'lead',
        ActivityLog.entity_id == lead_id
    )
    
    # Check if user is Admin or Sales Manager (they can see all activities)
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not role or (role.role_name not in ["Admin", "Sales Manager"] and not role.permissions.get("all")):
        # Regular users (Sales Executive, Marketing, etc.) only see their own activities
        query = query.filter(ActivityLog.user_id == current_user.id)
    
    activities = query.order_by(desc(ActivityLog.created_at)).all()
    
    return activities

@router.get("/user/{user_id}", response_model=list[ActivityLogOut])
def get_user_activities(
    user_id: int,
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get all activities performed by a specific user"""
    activities = db.query(ActivityLog).filter(
        ActivityLog.user_id == user_id
    ).order_by(desc(ActivityLog.created_at)).all()
    
    return activities

@router.get("/recent", response_model=list[ActivityLogOut])
def get_recent_activities(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get recent activities. Users see only their own activities unless Admin/Sales Manager."""
    from models.role import Role
    
    query = db.query(ActivityLog)
    
    # Check if user is Admin or Sales Manager (they can see all activities)
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not role or (role.role_name not in ["Admin", "Sales Manager"] and not role.permissions.get("all")):
        # Regular users (Sales Executive, Marketing, etc.) only see their own activities
        query = query.filter(ActivityLog.user_id == current_user.id)
    
    activities = query.order_by(desc(ActivityLog.created_at)).limit(limit).all()
    
    return activities






