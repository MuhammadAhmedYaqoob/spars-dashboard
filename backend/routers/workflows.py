"""
Workflows router for manual workflow execution
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from database import SessionLocal
from models.user import User
from routers.auth import check_permission
from services.workflow_engine import (
    execute_demo_request_workflow,
    execute_brochure_workflow,
    execute_newsletter_workflow,
    execute_inactive_lead_workflow
)

router = APIRouter(prefix="/workflows", tags=["Workflows"])

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class WorkflowRequest(BaseModel):
    submission_id: Optional[int] = None
    lead_id: Optional[int] = None
    email: Optional[str] = None
    assigned_to_user_id: Optional[int] = None

@router.post("/demo-request")
def run_demo_request_workflow(
    request: WorkflowRequest,
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("convert_to_lead", write_access=True))
):
    """Execute Demo Request Workflow"""
    if not request.submission_id:
        raise HTTPException(status_code=400, detail="submission_id is required")
    
    try:
        lead = execute_demo_request_workflow(
            db, current_user.id, request.submission_id, request.assigned_to_user_id
        )
        return {
            "success": True,
            "message": "Demo request workflow executed successfully",
            "lead_id": lead.id
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")

@router.post("/brochure-download")
def run_brochure_workflow(
    request: WorkflowRequest,
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("convert_to_lead", write_access=True))
):
    """Execute Brochure/Product Profile Download Workflow"""
    if not request.submission_id:
        raise HTTPException(status_code=400, detail="submission_id is required")
    
    try:
        lead = execute_brochure_workflow(
            db, current_user.id, request.submission_id, request.assigned_to_user_id
        )
        return {
            "success": True,
            "message": "Brochure workflow executed successfully",
            "lead_id": lead.id
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")

@router.post("/newsletter-signup")
def run_newsletter_workflow(
    request: WorkflowRequest,
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("submissions", write_access=True))
):
    """Execute Newsletter Signup Workflow"""
    if not request.email:
        raise HTTPException(status_code=400, detail="email is required")
    
    try:
        result = execute_newsletter_workflow(db, current_user.id, request.email)
        return {
            "success": True,
            "message": "Newsletter workflow executed successfully",
            "tagged": result["tagged"],
            "tag_id": result["tag_id"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")

@router.post("/inactive-lead")
def run_inactive_lead_workflow(
    request: WorkflowRequest,
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("leads", write_access=True))
):
    """Execute Inactive Lead Workflow"""
    if not request.lead_id:
        raise HTTPException(status_code=400, detail="lead_id is required")
    
    try:
        result = execute_inactive_lead_workflow(db, current_user.id, request.lead_id)
        return {
            "success": True,
            "message": "Inactive lead workflow executed",
            **result
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")

@router.post("/process-inactive-leads")
def process_all_inactive_leads(
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("leads", write_access=True))
):
    """Process all inactive leads (7+ days with no activity)"""
    from models.lead import Lead
    from models.activity_log import ActivityLog
    from datetime import datetime, timedelta
    
    leads = db.query(Lead).filter(Lead.status != "Closed Won", Lead.status != "Closed Lost").all()
    processed = []
    
    for lead in leads:
        last_activity = db.query(ActivityLog).filter(
            ActivityLog.entity_type == "lead",
            ActivityLog.entity_id == lead.id
        ).order_by(ActivityLog.created_at.desc()).first()
        
        if not last_activity:
            days_inactive = (datetime.utcnow() - lead.created_at).days if lead.created_at else 999
        else:
            days_inactive = (datetime.utcnow() - last_activity.created_at).days
        
        if days_inactive >= 7:
            try:
                result = execute_inactive_lead_workflow(db, current_user.id, lead.id)
                processed.append({
                    "lead_id": lead.id,
                    "lead_name": lead.name,
                    **result
                })
            except Exception as e:
                processed.append({
                    "lead_id": lead.id,
                    "lead_name": lead.name,
                    "error": str(e)
                })
    
    return {
        "success": True,
        "message": f"Processed {len(processed)} inactive leads",
        "processed": processed
    }








