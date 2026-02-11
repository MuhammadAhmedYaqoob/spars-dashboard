from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from models.form_field import FormField
from models.user import User
from schemas.form_field import FormFieldCreate, FormFieldOut
from routers.auth import get_current_active_user, check_permission

router = APIRouter(prefix="/forms", tags=["Forms"])

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/{form_type}/fields", response_model=list[FormFieldOut])
def get_fields(
    form_type: str, 
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(FormField).filter(FormField.form_type==form_type).all()

@router.post("/fields", response_model=FormFieldOut)
def create_field(
    payload: FormFieldCreate, 
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("configuration"))
):
    f = FormField(**payload.dict())
    db.add(f)
    db.commit()
    db.refresh(f)
    return f
