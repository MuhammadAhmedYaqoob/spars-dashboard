"""
Unified form submissions router
Reads from either spars_forms.db (when USE_FORMS_DB=true) or Submission table (when USE_FORMS_DB=false)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import SessionLocal
from models.submission import Submission
from models.user import User
from routers.auth import get_current_active_user, check_permission
from config import USE_FORMS_DB
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/form-submissions", tags=["Form Submissions"])

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic schemas for form submissions
class FormSubmissionOut(BaseModel):
    id: int
    form_type: str
    name: str
    email: str
    company: str
    submitted_at: datetime
    data: dict
    status: str = 'New'  # New | Converted | Archived
    lead_id: Optional[int] = None
    
    class Config:
        from_attributes = True

def _convert_submission_to_form_submission(sub: Submission) -> FormSubmissionOut:
    """Convert Submission model to FormSubmissionOut"""
    return FormSubmissionOut(
        id=sub.id,
        form_type=sub.form_type,
        name=sub.name,
        email=sub.email,
        company=sub.company,
        submitted_at=sub.submitted,
        data=sub.data or {},
        status=sub.status or 'New',
        lead_id=sub.lead_id
    )

def _get_submissions_from_crm_db(form_type: Optional[str], db: Session) -> List[FormSubmissionOut]:
    """Get submissions from CRM database (Submission table)"""
    query = db.query(Submission)
    if form_type:
        # Handle form type aliases (bidirectional mapping)
        if form_type == 'product-profile':
            query = query.filter(Submission.form_type.in_(['product-profile', 'product_profile']))
        elif form_type == 'product_profile':
            # Reverse mapping: product_profile should also return product-profile entries
            query = query.filter(Submission.form_type.in_(['product-profile', 'product_profile']))
        elif form_type == 'talk':
            query = query.filter(Submission.form_type.in_(['talk', 'talk_to_sales']))
        elif form_type == 'talk_to_sales':
            query = query.filter(Submission.form_type.in_(['talk', 'talk_to_sales']))
        elif form_type == 'general':
            # 'general' should return both 'general' and 'contact' entries
            query = query.filter(Submission.form_type.in_(['general', 'contact']))
        elif form_type == 'contact':
            # Reverse mapping: 'contact' should also return 'general' entries
            query = query.filter(Submission.form_type.in_(['general', 'contact']))
        else:
            query = query.filter(Submission.form_type == form_type)
    submissions = query.order_by(Submission.submitted.desc()).all()
    return [_convert_submission_to_form_submission(sub) for sub in submissions]

def _get_submissions_from_forms_db(form_type: Optional[str]) -> List[FormSubmissionOut]:
    """Get submissions from spars_forms.db"""
    from database_forms import get_forms_session
    from models.external.contact_forms import ContactForm
    from models.external.brochure_forms import BrochureForm
    from models.external.product_profile_forms import ProductProfileForm
    from models.external.talk_to_sales_forms import TalkToSalesForm
    from models.external.newsletter_subscriptions import NewsletterSubscription
    
    db = get_forms_session()
    results = []
    
    try:
        # Map form_type to model
        form_type_map = {
            'contact': ContactForm,  # General inquiry (demo_date = NULL)
            'general': ContactForm,  # General inquiry (alias for contact, demo_date = NULL)
            'demo': ContactForm,  # Request demo (demo_date set) - same table, different data
            'brochure': BrochureForm,
            'product-profile': ProductProfileForm,
            'product_profile': ProductProfileForm,  # Support both formats
            'talk': TalkToSalesForm,
            'talk_to_sales': TalkToSalesForm,  # Support both formats
            'newsletter': NewsletterSubscription
        }
        
        if form_type:
            # Get specific form type
            if form_type not in form_type_map:
                return []
            model = form_type_map[form_type]
            query = db.query(model)
            # For contact/general/demo, filter by demo_date to distinguish
            if form_type == 'contact' or form_type == 'general':
                query = query.filter(model.demo_date == None)
            elif form_type == 'demo':
                query = query.filter(model.demo_date != None)
            forms = query.order_by(model.submitted_at.desc()).all()
            
            for form in forms:
                # Convert to unified format
                if form_type == 'newsletter':
                    results.append(FormSubmissionOut(
                        id=form.id,
                        form_type='newsletter',
                        name='',  # Newsletter doesn't have name
                        email=form.email,
                        company='',
                        submitted_at=form.subscribed_at,
                        data={'email': form.email}
                    ))
                else:
                    # Extract name from first_name + last_name
                    name = f"{getattr(form, 'first_name', '')} {getattr(form, 'last_name', '')}".strip()
                    # Build data dict from all attributes
                    data = {}
                    for key in form.__table__.columns.keys():
                        if key not in ['id', 'submitted_at']:
                            value = getattr(form, key, None)
                            if value is not None:
                                data[key] = value
                    
                    results.append(FormSubmissionOut(
                        id=form.id,
                        form_type=form_type,
                        name=name,
                        email=getattr(form, 'email', ''),
                        company=getattr(form, 'company', '') or getattr(form, 'company_name', ''),
                        submitted_at=getattr(form, 'submitted_at', datetime.now()),
                        data=data,
                        status='New',  # External forms are always 'New' until converted
                        lead_id=None
                    ))
        else:
            # Get all form types
            for ft, model in form_type_map.items():
                # Skip duplicate mappings (product-profile/product_profile, talk/talk_to_sales)
                if ft in ['product_profile', 'talk_to_sales']:
                    continue
                query = db.query(model)
                # For contact/demo, filter by demo_date to distinguish
                if ft == 'contact':
                    query = query.filter(model.demo_date == None)
                elif ft == 'demo':
                    query = query.filter(model.demo_date != None)
                forms = query.order_by(model.submitted_at.desc()).all()
                for form in forms:
                    if ft == 'newsletter':
                        results.append(FormSubmissionOut(
                            id=form.id,
                            form_type='newsletter',
                            name='',
                            email=form.email,
                            company='',
                            submitted_at=form.subscribed_at,
                            data={'email': form.email},
                            status='New',  # External forms are always 'New' until converted
                            lead_id=None
                        ))
                    else:
                        name = f"{getattr(form, 'first_name', '')} {getattr(form, 'last_name', '')}".strip()
                        data = {}
                        for key in form.__table__.columns.keys():
                            if key not in ['id', 'submitted_at']:
                                value = getattr(form, key, None)
                                if value is not None:
                                    data[key] = value
                        
                        results.append(FormSubmissionOut(
                            id=form.id,
                            form_type=ft,
                            name=name,
                            email=getattr(form, 'email', ''),
                            company=getattr(form, 'company', '') or getattr(form, 'company_name', ''),
                            submitted_at=getattr(form, 'submitted_at', datetime.now()),
                            data=data,
                            status='New',  # External forms are always 'New' until converted
                            lead_id=None
                        ))
    finally:
        db.close()
    
    # Sort by submitted_at descending
    results.sort(key=lambda x: x.submitted_at, reverse=True)
    return results

@router.get("/", response_model=List[FormSubmissionOut])
def list_all_form_submissions(
    form_type: Optional[str] = None,
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("submissions"))
):
    """List all form submissions from either source based on USE_FORMS_DB"""
    if USE_FORMS_DB:
        return _get_submissions_from_forms_db(form_type)
    else:
        return _get_submissions_from_crm_db(form_type, db)

@router.get("/{form_type}", response_model=List[FormSubmissionOut])
def list_form_submissions_by_type(
    form_type: str,
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("submissions"))
):
    """List form submissions by type"""
    if USE_FORMS_DB:
        return _get_submissions_from_forms_db(form_type)
    else:
        return _get_submissions_from_crm_db(form_type, db)

@router.get("/newsletter/all", response_model=List[FormSubmissionOut])
def list_newsletter_subscriptions(
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("submissions"))
):
    """List all newsletter subscriptions"""
    return list_form_submissions_by_type('newsletter', db, current_user)






