"""
Workflow engine for executing manual workflows
"""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from models.lead import Lead
from models.submission import Submission
from models.reminder import Reminder
from models.entity_tag import EntityTag
from models.tag import Tag
from services.activity_logger import log_activity

def execute_demo_request_workflow(
    db: Session,
    user_id: int,
    submission_id: int,
    assigned_to_user_id: int = None
):
    """
    Workflow 1: Demo Request
    - Create lead from submission
    - Log "Confirmation email sent" activity
    - Create follow-up reminder
    """
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise ValueError(f"Submission {submission_id} not found")
    
    # Create lead
    lead = Lead(
        name=submission.name,
        email=submission.email,
        company=submission.company,
        source="Website",
        status="New",
        assigned_to=assigned_to_user_id,
        assigned=assigned_to_user_id or "Unassigned",
        created_by=user_id
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    
    # Mark submission as converted
    submission.status = "Converted"
    submission.lead_id = lead.id
    db.add(submission)
    db.commit()
    
    # Log lead conversion
    log_activity(
        db, user_id, "lead_converted", "lead", lead.id,
        {"submission_id": submission_id, "form_type": submission.form_type}
    )
    
    # Log "Confirmation email sent" (no actual email sent per requirements)
    log_activity(
        db, user_id, "email_sent", "lead", lead.id,
        {"email_type": "confirmation", "recipient": submission.email}
    )
    
    # Create follow-up reminder (1 day from now)
    reminder = Reminder(
        lead_id=lead.id,
        user_id=assigned_to_user_id or user_id,
        title=f"Follow up with {submission.name}",
        due_date=datetime.utcnow() + timedelta(days=1),
        completed=False
    )
    db.add(reminder)
    db.commit()
    
    return lead

def execute_brochure_workflow(
    db: Session,
    user_id: int,
    submission_id: int,
    assigned_to_user_id: int = None
):
    """
    Workflow 2: Brochure/Product Profile Download
    - Create lead from submission
    - Log "Brochure sent" activity
    - Create 2-day follow-up reminder
    """
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise ValueError(f"Submission {submission_id} not found")
    
    # Create lead
    lead = Lead(
        name=submission.name,
        email=submission.email,
        company=submission.company,
        source="Website",
        status="New",
        assigned_to=assigned_to_user_id,
        assigned=assigned_to_user_id or "Unassigned",
        created_by=user_id
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    
    # Mark submission as converted
    submission.status = "Converted"
    submission.lead_id = lead.id
    db.add(submission)
    db.commit()
    
    # Log lead conversion
    log_activity(
        db, user_id, "lead_converted", "lead", lead.id,
        {"submission_id": submission_id, "form_type": submission.form_type}
    )
    
    # Log "Brochure sent"
    log_activity(
        db, user_id, "email_sent", "lead", lead.id,
        {"email_type": "brochure", "recipient": submission.email}
    )
    
    # Create 2-day follow-up reminder
    reminder = Reminder(
        lead_id=lead.id,
        user_id=assigned_to_user_id or user_id,
        title=f"Follow up after brochure: {submission.name}",
        due_date=datetime.utcnow() + timedelta(days=2),
        completed=False
    )
    db.add(reminder)
    db.commit()
    
    return lead

def execute_newsletter_workflow(
    db: Session,
    user_id: int,
    email: str
):
    """
    Workflow 3: Newsletter Signup
    - Log "Welcome email sent" activity
    - Auto-tag subscriber as "Marketing Lead"
    """
    # Log "Welcome email sent"
    log_activity(
        db, user_id, "email_sent", "newsletter", None,
        {"email_type": "welcome", "recipient": email}
    )
    
    # Find or create "Marketing Lead" tag
    tag = db.query(Tag).filter(
        Tag.name == "Marketing Lead",
        Tag.entity_type == "newsletter"
    ).first()
    
    if not tag:
        tag = Tag(
            name="Marketing Lead",
            color="#28C76F",
            entity_type="newsletter",
            created_by=user_id
        )
        db.add(tag)
        db.commit()
        db.refresh(tag)
    
    # Find newsletter subscription by email (if exists in Submission table)
    # Note: This assumes newsletter subscriptions are stored as submissions with form_type="newsletter"
    subscription = db.query(Submission).filter(
        Submission.email == email,
        Submission.form_type == "newsletter"
    ).first()
    
    if subscription:
        # Check if already tagged
        existing_tag = db.query(EntityTag).filter(
            EntityTag.tag_id == tag.id,
            EntityTag.entity_type == "newsletter",
            EntityTag.entity_id == subscription.id
        ).first()
        
        if not existing_tag:
            entity_tag = EntityTag(
                tag_id=tag.id,
                entity_type="newsletter",
                entity_id=subscription.id
            )
            db.add(entity_tag)
            db.commit()
    
    return {"tagged": True, "tag_id": tag.id}

def execute_inactive_lead_workflow(
    db: Session,
    user_id: int,
    lead_id: int
):
    """
    Workflow 4: Inactive Lead
    - Check if lead has no activity for 7+ days
    - Create reminder for Sales Executive
    - If 14+ days, escalate to Sales Manager
    """
    from models.activity_log import ActivityLog
    
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise ValueError(f"Lead {lead_id} not found")
    
    # Get last activity for this lead
    last_activity = db.query(ActivityLog).filter(
        ActivityLog.entity_type == "lead",
        ActivityLog.entity_id == lead_id
    ).order_by(ActivityLog.created_at.desc()).first()
    
    if not last_activity:
        # No activity at all - use lead creation date
        days_inactive = (datetime.utcnow() - lead.created_at).days if lead.created_at else 999
    else:
        days_inactive = (datetime.utcnow() - last_activity.created_at).days
    
    if days_inactive < 7:
        return {"status": "active", "days_inactive": days_inactive, "message": "Lead is still active"}
    
    # Create reminder
    reminder_user_id = lead.assigned_to or user_id
    
    # If 14+ days, escalate to Sales Manager
    if days_inactive >= 14:
        # Find a Sales Manager
        from models.user import User
        from models.role import Role
        sales_manager_role = db.query(Role).filter(Role.role_name == "Sales Manager").first()
        if sales_manager_role:
            sales_manager = db.query(User).filter(User.role_id == sales_manager_role.id).first()
            if sales_manager:
                reminder_user_id = sales_manager.id
    
    reminder = Reminder(
        lead_id=lead_id,
        user_id=reminder_user_id,
        title=f"Inactive lead: {lead.name} ({days_inactive} days)",
        due_date=datetime.utcnow() + timedelta(days=1),
        completed=False
    )
    db.add(reminder)
    db.commit()
    
    # Log the workflow execution
    log_activity(
        db, user_id, "inactive_lead_processed", "lead", lead_id,
        {"days_inactive": days_inactive, "reminder_created": True}
    )
    
    return {
        "status": "processed",
        "days_inactive": days_inactive,
        "reminder_created": True,
        "reminder_id": reminder.id
    }








