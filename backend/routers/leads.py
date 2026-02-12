from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from models.lead import Lead
from models.submission import Submission
from models.user import User
from schemas.lead import LeadCreate, LeadOut, ConvertRequest, LeadUpdate
from routers.auth import get_current_active_user, check_permission, get_current_user
from services.activity_logger import log_lead_conversion, log_status_change

router = APIRouter(prefix="/leads", tags=["Leads"])

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def normalize_lead_source(lead: Lead) -> Lead:
    """
    Normalize lead source: Ensure form-based leads have source_type='Website' and source=form name.
    This ensures all form-based leads are grouped under 'Website' in reports/dashboards.
    This function modifies the lead object in-place for response normalization only.
    """
    form_source_names = [
        'Brochure Download',
        'Product Profile Download',
        'Talk to Sales',
        'General Inquiry',
        'Request a Demo'
    ]
    
    # If source is a form name but source_type is not 'Website', normalize it
    if lead.source and lead.source in form_source_names:
        if lead.source_type != 'Website':
            # Set source_type to 'Website' (category)
            lead.source_type = 'Website'
            # Keep source as form name (specific source)
            # lead.source stays as is
    
    # Legacy: If source_type is a form name (old data structure), normalize it
    elif lead.source_type and lead.source_type in form_source_names:
        # Move form name to source, set source_type to 'Website'
        form_name = lead.source_type
        lead.source_type = 'Website'
        lead.source = form_name if not lead.source or lead.source == 'Website' else lead.source
    
    return lead

@router.get("/", response_model=list[LeadOut])
def get_leads(
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("leads"))
):
    # Viewing leads requires "leads" permission (Admin, Sales Manager, Sales Executive can view)
    from models.role import Role
    
    query = db.query(Lead)
    
    # Check if user is Admin or Sales Manager
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if role and (role.role_name == "Admin" or role.permissions.get("all")):
        # Admin sees all leads
        leads = query.all()
    elif role and role.role_name == "Sales Manager":
        # Sales Manager: only see leads assigned to their own Sales Executives
        # Get IDs of Sales Executives under this manager
        sales_executive_role = db.query(Role).filter(Role.role_name == "Sales Executive").first()
        if sales_executive_role:
            team_executive_ids = db.query(User.id).filter(
                User.manager_id == current_user.id,
                User.role_id == sales_executive_role.id
            ).all()
            team_executive_ids = [id[0] for id in team_executive_ids]
            
            if team_executive_ids:
                query = query.filter(Lead.assigned_to.in_(team_executive_ids))
            else:
                # No team members, return empty list
                query = query.filter(Lead.id == -1)  # Impossible condition
        
        leads = query.all()
    else:
        # Sales Executive and other users only see leads assigned to them
        query = query.filter(
            (Lead.assigned_to == current_user.id) | (Lead.assigned == current_user.name)
        )
        leads = query.all()
    
    # Build a cache of user names for created_by lookup
    created_by_ids = set(lead.created_by for lead in leads if lead.created_by)
    creator_names = {}
    if created_by_ids:
        creators = db.query(User).filter(User.id.in_(created_by_ids)).all()
        creator_names = {u.id: u.name for u in creators}
    
    # Normalize sources and attach created_by_name
    result = []
    for lead in leads:
        lead = normalize_lead_source(lead)
        lead_dict = LeadOut.model_validate(lead).model_dump()
        lead_dict['created_by_name'] = creator_names.get(lead.created_by) if lead.created_by else None
        result.append(lead_dict)
    return result

@router.post("/", response_model=LeadOut)
def create_lead(
    request: LeadCreate, 
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("leads", write_access=True))
):
    from fastapi import HTTPException, status
    from models.role import Role
    
    lead_data = request.dict()
    lead_data['created_by'] = current_user.id
    
    # Handle assignment
    assigned_to_id = lead_data.pop('assigned_to_id', None)
    assigned_name = 'Unassigned'
    
    if assigned_to_id:
        # Validate that the user exists and is assignable (not Admin/Manager)
        assigned_user = db.query(User).filter(User.id == assigned_to_id).first()
        if assigned_user:
            user_role = db.query(Role).filter(Role.id == assigned_user.role_id).first()
            # Only allow assignment to Sales Executive (level 2) and Marketing (level 3)
            if user_role and user_role.hierarchy_level >= 2:
                # Additional validation for Sales Managers: can only assign to their own team
                current_role = db.query(Role).filter(Role.id == current_user.role_id).first()
                if current_role and current_role.role_name == "Sales Manager":
                    if assigned_user.manager_id != current_user.id:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="You can only assign leads to your own Sales Executives"
                        )
                
                lead_data['assigned_to'] = assigned_user.id
                assigned_name = assigned_user.name
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot assign leads to Admin or Manager roles"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assigned user not found"
            )
    
    lead_data['assigned'] = assigned_name
    
    lead = Lead(**lead_data)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    # Normalize source before returning
    return normalize_lead_source(lead)

@router.get("/{id}", response_model=LeadOut)
def get_lead(
    id: int, 
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    lead = db.query(Lead).filter(Lead.id==id).first()
    if not lead:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    # Normalize source before returning
    return normalize_lead_source(lead)

@router.patch("/{id}", response_model=LeadOut)
def update_lead(
    id: int, 
    payload: LeadUpdate, 
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("lead_status_update", write_access=True))
):
    from fastapi import HTTPException, status
    from models.role import Role
    lead = db.query(Lead).filter(Lead.id==id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    
    # Track status change for logging
    old_status = lead.status
    update_data = payload.dict(exclude_unset=True)
    
    # Handle assignment if assigned_to_id is being updated
    if 'assigned_to_id' in update_data:
        assigned_to_id = update_data.pop('assigned_to_id')
        if assigned_to_id:
            # Validate that the user exists and is assignable
            assigned_user = db.query(User).filter(User.id == assigned_to_id).first()
            if assigned_user:
                user_role = db.query(Role).filter(Role.id == assigned_user.role_id).first()
                # Only allow assignment to Sales Executive (level 2)
                if user_role and user_role.hierarchy_level == 2:
                    # Additional validation for Sales Managers: can only assign to their own team
                    current_role = db.query(Role).filter(Role.id == current_user.role_id).first()
                    if current_role and current_role.role_name == "Sales Manager":
                        if assigned_user.manager_id != current_user.id:
                            raise HTTPException(
                                status_code=status.HTTP_403_FORBIDDEN,
                                detail="You can only assign leads to your own Sales Executives"
                            )
                    
                    lead.assigned_to = assigned_user.id
                    lead.assigned = assigned_user.name
                    # Always set created_by to the current user when assigning (who assigns is who created/assigned it)
                    # This ensures "Assigned By" shows the Sales Manager who assigned it
                    lead.created_by = current_user.id
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Can only assign leads to Sales Executives"
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Assigned user not found"
                )
        else:
            lead.assigned_to = None
            lead.assigned = 'Unassigned'
            # Don't change created_by when unassigning
    elif 'assigned' in update_data:
        # Handle legacy assignment by name
        assigned_name = update_data.get('assigned')
        if assigned_name and assigned_name != 'Unassigned':
            assigned_user = db.query(User).filter(User.name == assigned_name).first()
            if assigned_user:
                user_role = db.query(Role).filter(Role.id == assigned_user.role_id).first()
                if user_role and user_role.hierarchy_level == 2:
                    # Additional validation for Sales Managers: can only assign to their own team
                    current_role = db.query(Role).filter(Role.id == current_user.role_id).first()
                    if current_role and current_role.role_name == "Sales Manager":
                        if assigned_user.manager_id != current_user.id:
                            raise HTTPException(
                                status_code=status.HTTP_403_FORBIDDEN,
                                detail="You can only assign leads to your own Sales Executives"
                            )
                    
                    lead.assigned_to = assigned_user.id
                    lead.assigned = assigned_user.name
                    # Always set created_by to the current user when assigning
                    lead.created_by = current_user.id
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Can only assign leads to Sales Executives"
                    )
            else:
                # If user not found by name, just update the assigned field
                lead.assigned = assigned_name
        else:
            lead.assigned_to = None
            lead.assigned = 'Unassigned'
            # Don't change created_by when unassigning
    
    # Update other fields
    for key, value in update_data.items():
        if key not in ['assigned']:  # Skip 'assigned' if we already handled it
            setattr(lead, key, value)
    
    db.add(lead)
    db.commit()
    db.refresh(lead)
    
    # Log status change if status was updated
    if 'status' in update_data and old_status != lead.status:
        log_status_change(db, current_user.id, lead.id, old_status, lead.status)
    
    # Normalize source before returning
    return normalize_lead_source(lead)

@router.post("/convert/{submission_id}", response_model=LeadOut)
def convert_submission(
    submission_id: int, 
    request: ConvertRequest, 
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("convert_to_lead", write_access=True))
):
    from fastapi import HTTPException, status
    sub = db.query(Submission).filter(Submission.id==submission_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    
    # Map form_type to source name (handle variations)
    form_type_to_source = {
        'contact': 'General Inquiry',
        'talk_to_sales': 'Talk to Sales',
        'talk': 'Talk to Sales',
        'brochure': 'Brochure Download',
        'product_profile': 'Product Profile Download',
        'product-profile': 'Product Profile Download',
        'demo': 'Request a Demo'
    }
    
    # Normalize form_type (handle variations)
    normalized_form_type = sub.form_type.lower().replace('-', '_') if sub.form_type else ''
    
    # Set source_type to 'Website' (category) and source to form name (specific source)
    source_type = 'Website'  # Category: always 'Website' for form submissions
    source = form_type_to_source.get(sub.form_type) or form_type_to_source.get(normalized_form_type) or 'Website Form'  # Specific form name
    
    # Find assigned user - prefer assigned_to_id, fallback to name lookup
    assigned_to_id = None
    assigned_name = 'Unassigned'
    
    if request.assigned_to_id:
        # Validate that the user exists and is assignable (only Sales Executive)
        assigned_user = db.query(User).filter(User.id == request.assigned_to_id).first()
        if assigned_user:
            from models.role import Role
            user_role = db.query(Role).filter(Role.id == assigned_user.role_id).first()
            # Only allow assignment to Sales Executive (hierarchy_level = 2), reject Marketing (level 3)
            if user_role and user_role.hierarchy_level == 2:
                # Additional validation for Sales Managers: can only assign to their own team
                current_role = db.query(Role).filter(Role.id == current_user.role_id).first()
                if current_role and current_role.role_name == "Sales Manager":
                    if assigned_user.manager_id != current_user.id:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="You can only assign leads to your own Sales Executives"
                        )
                
                assigned_to_id = assigned_user.id
                assigned_name = assigned_user.name
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Can only assign leads to Sales Executives, not Marketing users"
                )
    elif request.assigned and request.assigned != 'Unassigned':
        # Fallback: lookup by name (for backward compatibility)
        assigned_user = db.query(User).filter(User.name == request.assigned).first()
        if assigned_user:
            from models.role import Role
            user_role = db.query(Role).filter(Role.id == assigned_user.role_id).first()
            if user_role and user_role.hierarchy_level == 2:
                # Additional validation for Sales Managers: can only assign to their own team
                current_role = db.query(Role).filter(Role.id == current_user.role_id).first()
                if current_role and current_role.role_name == "Sales Manager":
                    if assigned_user.manager_id != current_user.id:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="You can only assign leads to your own Sales Executives"
                        )
                
                assigned_to_id = assigned_user.id
                assigned_name = assigned_user.name
    
    lead = Lead(
        name=sub.name, 
        email=sub.email, 
        company=sub.company, 
        source_type=source_type,  # Category: 'Website' for form submissions
        source=source,  # Specific source: form name (e.g., 'Brochure Download', 'Request a Demo')
        designation=request.designation if hasattr(request, 'designation') else None,
        status='New', 
        assigned=assigned_name,
        assigned_to=assigned_to_id,
        created_by=current_user.id
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    
    # mark submission as converted, keep visible
    sub.status = 'Converted'
    sub.lead_id = lead.id
    db.add(sub)
    db.commit()
    
    # Log the conversion
    log_lead_conversion(db, current_user.id, submission_id, lead.id)
    
    # Normalize source before returning (should already be correct, but ensure consistency)
    return normalize_lead_source(lead)

@router.delete("/{id}")
def delete_lead(
    id: int,
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("leads", write_access=True))
):
    """Delete a lead and all related data"""
    from fastapi import HTTPException, status
    from models.role import Role
    from models.call_log import CallLog
    from models.reminder import Reminder
    from models.comment import Comment
    from models.entity_tag import EntityTag
    from services.activity_logger import log_activity
    
    lead = db.query(Lead).filter(Lead.id == id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    
    # Store lead info for logging before deletion
    lead_name = lead.name
    lead_email = lead.email
    lead_company = lead.company
    
    # Check permissions - Admin and Sales Manager can delete any lead
    # Sales Executive can only delete leads assigned to them
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if role and (role.role_name == "Admin" or role.role_name == "Sales Manager" or role.permissions.get("all")):
        # Admin/Sales Manager can delete any lead
        pass
    else:
        # Sales Executive can only delete their own leads
        if lead.assigned_to != current_user.id and lead.assigned != current_user.name:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this lead"
            )
    
    # Delete all related data before deleting the lead
    
    # 1. Delete call logs (calendar/meetings)
    call_logs_count = db.query(CallLog).filter(CallLog.lead_id == id).delete()
    
    # 2. Delete reminders (calendar)
    reminders_count = db.query(Reminder).filter(Reminder.lead_id == id).delete()
    
    # 3. Delete comments
    comments_count = db.query(Comment).filter(Comment.lead_id == id).delete()
    
    # 4. Delete entity tags (if any)
    entity_tags_count = db.query(EntityTag).filter(
        EntityTag.entity_type == 'lead',
        EntityTag.entity_id == id
    ).delete()
    
    # 5. Update submissions - set lead_id to NULL instead of deleting (preserve submission history)
    submissions = db.query(Submission).filter(Submission.lead_id == id).all()
    submissions_updated = len(submissions)
    for submission in submissions:
        submission.lead_id = None
        submission.status = 'New'
        db.add(submission)
    
    # 6. Log the deletion activity BEFORE deleting the lead (so we can reference lead_id)
    log_activity(
        db=db,
        user_id=current_user.id,
        action_type='lead_deleted',
        description=f"Deleted lead #{id}: {lead_name} ({lead_email})",
        entity_type='lead',
        entity_id=id,
        metadata={
            'lead_id': id,
            'lead_name': lead_name,
            'lead_email': lead_email,
            'lead_company': lead_company,
            'related_data_deleted': {
                'call_logs': call_logs_count,
                'reminders': reminders_count,
                'comments': comments_count,
                'entity_tags': entity_tags_count,
                'submissions_updated': submissions_updated
            }
        }
    )
    
    # 7. Delete the lead itself
    db.delete(lead)
    db.commit()
    
    return {
        "ok": True,
        "message": "Lead deleted successfully",
        "related_data_deleted": {
            "call_logs": call_logs_count,
            "reminders": reminders_count,
            "comments": comments_count,
            "entity_tags": entity_tags_count,
            "submissions_updated": submissions_updated
        }
    }
