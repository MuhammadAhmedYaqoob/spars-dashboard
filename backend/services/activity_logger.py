"""
Activity logging service for tracking all system activities
"""
from sqlalchemy.orm import Session
from models.activity_log import ActivityLog
from models.user import User
from models.lead import Lead
from models.submission import Submission

def log_activity(
    db: Session,
    user_id: int,
    action_type: str,
    description: str,
    entity_type: str,
    entity_id: int | None = None,
    metadata: dict | None = None
):
    """Generic activity logging function"""
    activity = ActivityLog(
        user_id=user_id,
        action_type=action_type,
        description=description,
        entity_type=entity_type,
        entity_id=entity_id,
        meta_data=metadata or {}
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity

def log_lead_conversion(db: Session, user_id: int, submission_id: int, lead_id: int):
    """Log when a form submission is converted to a lead"""
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    user = db.query(User).filter(User.id == user_id).first()
    
    description = f"Converted form submission to lead #{lead_id}"
    if submission:
        description += f" (Form: {submission.form_type}, Name: {submission.name})"
    
    return log_activity(
        db=db,
        user_id=user_id,
        action_type='lead_converted',
        description=description,
        entity_type='lead',
        entity_id=lead_id,
        metadata={
            'submission_id': submission_id,
            'lead_id': lead_id,
            'lead_name': lead.name if lead else None,
            'form_type': submission.form_type if submission else None
        }
    )

def log_status_change(db: Session, user_id: int, lead_id: int, old_status: str, new_status: str):
    """Log when a lead status is changed"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    user = db.query(User).filter(User.id == user_id).first()
    
    description = f"Changed lead #{lead_id} status from '{old_status}' to '{new_status}'"
    if lead:
        description += f" (Lead: {lead.name})"
    
    return log_activity(
        db=db,
        user_id=user_id,
        action_type='status_changed',
        description=description,
        entity_type='lead',
        entity_id=lead_id,
        metadata={
            'lead_id': lead_id,
            'lead_name': lead.name if lead else None,
            'old_status': old_status,
            'new_status': new_status
        }
    )

def log_comment_added(db: Session, user_id: int, lead_id: int, comment_id: int):
    """Log when a comment is added to a lead"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    user = db.query(User).filter(User.id == user_id).first()
    
    description = f"Added comment to lead #{lead_id}"
    if lead:
        description += f" (Lead: {lead.name})"
    
    return log_activity(
        db=db,
        user_id=user_id,
        action_type='comment_added',
        description=description,
        entity_type='lead',
        entity_id=lead_id,
        metadata={
            'lead_id': lead_id,
            'lead_name': lead.name if lead else None,
            'comment_id': comment_id
        }
    )

def log_user_action(
    db: Session,
    actor_id: int,
    action: str,  # 'user_created', 'user_updated', 'user_deleted'
    target_user_id: int | None = None,
    target_user_name: str | None = None
):
    """Log user management actions"""
    actor = db.query(User).filter(User.id == actor_id).first()
    
    if action == 'user_created':
        description = f"Created new user"
        if target_user_name:
            description += f": {target_user_name}"
    elif action == 'user_updated':
        description = f"Updated user"
        if target_user_name:
            description += f": {target_user_name}"
    elif action == 'user_deleted':
        description = f"Deleted user"
        if target_user_name:
            description += f": {target_user_name}"
    else:
        description = f"Performed action: {action}"
    
    return log_activity(
        db=db,
        user_id=actor_id,
        action_type=action,
        description=description,
        entity_type='user',
        entity_id=target_user_id,
        metadata={
            'target_user_id': target_user_id,
            'target_user_name': target_user_name
        }
    )

def log_login(db: Session, user_id: int, success: bool = True):
    """Log user login attempts"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if success:
        description = f"User logged in successfully"
    else:
        description = f"Failed login attempt"
    
    return log_activity(
        db=db,
        user_id=user_id,
        action_type='login',
        description=description,
        entity_type='user',
        entity_id=user_id,
        metadata={
            'success': success,
            'user_email': user.email if user else None
        }
    )

