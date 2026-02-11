from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import and_
from database import SessionLocal
from models.submission import Submission
from models.user import User
from schemas.submission import SubmissionCreate, SubmissionOut, FilterRequest
from routers.auth import get_current_active_user, check_permission

router = APIRouter(prefix="/submissions", tags=["Submissions"])

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=SubmissionOut)
def create_submission(payload: SubmissionCreate, db: Session = Depends(db_session)):
    sub = Submission(**payload.dict())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub

@router.get("/{form_type}", response_model=list[SubmissionOut])
def list_submissions(
    form_type: str, 
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(Submission).filter(Submission.form_type==form_type).all()

@router.post("/filter", response_model=list[SubmissionOut])
def filter_submissions(
    req: FilterRequest, 
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    q = db.query(Submission).filter(Submission.form_type==req.form_type)
    # naive JSON filtering: match exact key=value in data
    for k, v in req.filters.items():
        q = q.filter(Submission.data[k].as_string() == str(v))
    return q.all()
