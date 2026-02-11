"""
Call Logs router for managing sales call/meeting logs
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import SessionLocal
from models.call_log import CallLog
from models.lead import Lead
from models.user import User
from models.role import Role
from schemas.call_log import CallLogCreate, CallLogOut, CallLogUpdate
from routers.auth import get_current_active_user, check_permission

router = APIRouter(prefix="/call-logs", tags=["Call Logs"])

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[CallLogOut])
def list_call_logs(
    lead_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    """List call logs with optional filters"""
    query = db.query(CallLog)
    
    # Filter by lead if specified
    if lead_id:
        query = query.filter(CallLog.lead_id == lead_id)
    
    # Filter by user if specified (or show only current user's logs if not admin)
    if user_id:
        query = query.filter(CallLog.user_id == user_id)
    else:
        # Non-admin users only see their own call logs
        role = db.query(Role).filter(Role.id == current_user.role_id).first()
        if not role or not role.permissions.get("all"):
            query = query.filter(CallLog.user_id == current_user.id)
    
    # Filter out call logs linked to deleted leads
    # Only show call logs where the lead still exists
    from sqlalchemy import exists
    lead_exists = exists().where(Lead.id == CallLog.lead_id)
    query = query.filter(lead_exists)
    
    return query.order_by(CallLog.meeting_date.desc(), CallLog.created_at.desc()).all()

@router.post("/", response_model=CallLogOut)
def create_call_log(
    payload: CallLogCreate,
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new call log"""
    # Verify lead exists
    lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check permissions - user must have access to the lead
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    permissions = role.permissions if role else {}
    
    # Admin and users with "leads" permission can create logs for any lead
    if not (permissions.get("all") == True or permissions.get("leads") == True):
        # For read-only users, only allow if lead is assigned to them
        if lead.assigned_to != current_user.id and lead.assigned != current_user.name:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create call logs for leads assigned to you"
            )
    
    # Use current user's ID if not specified
    call_log_data = payload.dict()
    if not call_log_data.get('user_id'):
        call_log_data['user_id'] = current_user.id
    
    # Update lead's stage if provided
    if payload.stage:
        lead.stage = payload.stage
        db.add(lead)
    
    call_log = CallLog(**call_log_data)
    db.add(call_log)
    db.commit()
    db.refresh(call_log)
    return call_log

@router.get("/{id}", response_model=CallLogOut)
def get_call_log(
    id: int,
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific call log"""
    call_log = db.query(CallLog).filter(CallLog.id == id).first()
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    # Check if user has access (own log or admin)
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not role or not role.permissions.get("all"):
        if call_log.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this call log")
    
    return call_log

@router.patch("/{id}", response_model=CallLogOut)
def update_call_log(
    id: int,
    payload: CallLogUpdate,
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("leads", write_access=True))
):
    """Update a call log"""
    call_log = db.query(CallLog).filter(CallLog.id == id).first()
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    # Check if user has access
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not role or not role.permissions.get("all"):
        if call_log.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this call log")
    
    update_data = payload.dict(exclude_unset=True)
    
    # Update lead's stage if stage is being updated
    if 'stage' in update_data and update_data['stage']:
        lead = db.query(Lead).filter(Lead.id == call_log.lead_id).first()
        if lead:
            lead.stage = update_data['stage']
            db.add(lead)
    
    for key, value in update_data.items():
        setattr(call_log, key, value)
    
    db.add(call_log)
    db.commit()
    db.refresh(call_log)
    return call_log

@router.delete("/{id}")
def delete_call_log(
    id: int,
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("leads", write_access=True))
):
    """Delete a call log"""
    call_log = db.query(CallLog).filter(CallLog.id == id).first()
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    # Check if user has access
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not role or not role.permissions.get("all"):
        if call_log.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this call log")
    
    db.delete(call_log)
    db.commit()
    return {"ok": True}



