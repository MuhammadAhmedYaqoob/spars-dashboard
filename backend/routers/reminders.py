"""
Reminders router for managing follow-up reminders
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, timedelta
from database import SessionLocal
from models.reminder import Reminder
from models.user import User
from schemas.reminder import ReminderCreate, ReminderOut, ReminderUpdate
from routers.auth import get_current_active_user, check_permission
from models.lead import Lead
from models.role import Role

router = APIRouter(prefix="/reminders", tags=["Reminders"])

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[ReminderOut])
def list_reminders(
    lead_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    completed: Optional[bool] = Query(None),
    upcoming_only: bool = Query(False),
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("reminders"))
):
    """List reminders with optional filters"""
    from models.lead import Lead
    
    query = db.query(Reminder)
    
    # Filter by lead if specified
    if lead_id:
        query = query.filter(Reminder.lead_id == lead_id)
    
    # Filter by user if specified (or show only current user's reminders if not admin)
    if user_id:
        query = query.filter(Reminder.user_id == user_id)
    else:
        # Non-admin users only see their own reminders
        from models.role import Role
        role = db.query(Role).filter(Role.id == current_user.role_id).first()
        if not role or not role.permissions.get("all"):
            query = query.filter(Reminder.user_id == current_user.id)
    
    # Filter by completion status
    if completed is not None:
        query = query.filter(Reminder.completed == completed)
    
    # Filter for upcoming reminders only
    if upcoming_only:
        query = query.filter(
            Reminder.due_date >= datetime.utcnow(),
            Reminder.completed == False
        )
    
    # Filter out reminders linked to deleted leads
    # Only show reminders where lead_id is NULL or the lead still exists
    from sqlalchemy import exists
    lead_exists = exists().where(Lead.id == Reminder.lead_id)
    query = query.filter(
        (Reminder.lead_id == None) | lead_exists
    )
    
    return query.order_by(Reminder.due_date.asc()).all()

@router.post("/", response_model=ReminderOut)
def create_reminder(
    payload: ReminderCreate,
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)  # Allow all authenticated users
):
    """Create a new reminder"""
    # Validate status
    valid_statuses = ['Pending', 'Completed', 'Cancelled']
    if payload.status and payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(valid_statuses)}")
    
    # If reminder is for a lead, check if user has access to that lead
    if payload.lead_id:
        lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Check if user has permission or if lead is assigned to them
        role = db.query(Role).filter(Role.id == current_user.role_id).first()
        permissions = role.permissions if role else {}
        
        # Admin and users with "leads" permission can create reminders for any lead
        if not (permissions.get("all") == True or permissions.get("leads") == True):
            # For read-only users, only allow if lead is assigned to them
            if lead.assigned_to != current_user.id and lead.assigned != current_user.name:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only create reminders for leads assigned to you"
                )
    
    reminder_data = payload.dict()
    # Sync completed field with status
    if payload.status == 'Completed':
        reminder_data['completed'] = True
    elif payload.status in ['Pending', 'Cancelled']:
        reminder_data['completed'] = False
    
    reminder = Reminder(**reminder_data)
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder

@router.get("/{id}", response_model=ReminderOut)
def get_reminder(
    id: int,
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific reminder"""
    reminder = db.query(Reminder).filter(Reminder.id == id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    # Check if user has access (own reminder or admin)
    from models.role import Role
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not role or not role.permissions.get("all"):
        if reminder.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this reminder")
    
    return reminder

@router.patch("/{id}", response_model=ReminderOut)
def update_reminder(
    id: int,
    payload: ReminderUpdate,
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("reminders", write_access=True))
):
    """Update a reminder"""
    reminder = db.query(Reminder).filter(Reminder.id == id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    # Check if user has access
    from models.role import Role
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not role or not role.permissions.get("all"):
        if reminder.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this reminder")
    
    update_data = payload.dict(exclude_unset=True)
    
    # Validate status if provided
    valid_statuses = ['Pending', 'Completed', 'Cancelled']
    if 'status' in update_data and update_data['status'] not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(valid_statuses)}")
    
    # Sync completed field with status
    if 'status' in update_data:
        if update_data['status'] == 'Completed':
            update_data['completed'] = True
            if not reminder.completed:
                update_data['completed_at'] = datetime.utcnow()
        elif update_data['status'] in ['Pending', 'Cancelled']:
            update_data['completed'] = False
            update_data['completed_at'] = None
    
    # If marking as completed, set completed_at
    if update_data.get("completed") == True and not reminder.completed:
        update_data["completed_at"] = datetime.utcnow()
    elif update_data.get("completed") == False:
        update_data["completed_at"] = None
    
    for key, value in update_data.items():
        setattr(reminder, key, value)
    
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder

@router.delete("/{id}")
def delete_reminder(
    id: int,
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("reminders", write_access=True))
):
    """Delete a reminder"""
    reminder = db.query(Reminder).filter(Reminder.id == id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    # Check if user has access
    from models.role import Role
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not role or not role.permissions.get("all"):
        if reminder.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this reminder")
    
    db.delete(reminder)
    db.commit()
    return {"ok": True}

@router.get("/my/upcoming", response_model=List[ReminderOut])
def get_my_upcoming_reminders(
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's upcoming reminders"""
    now = datetime.utcnow()
    reminders = db.query(Reminder).filter(
        Reminder.user_id == current_user.id,
        Reminder.due_date >= now,
        Reminder.completed == False
    ).order_by(Reminder.due_date.asc()).all()
    return reminders

