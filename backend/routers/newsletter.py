from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from models.newsletter import Newsletter
from models.user import User
from schemas.newsletter import NewsletterCreate, NewsletterOut
from routers.auth import get_current_active_user

router = APIRouter(prefix="/newsletter", tags=["Newsletter"])

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=list[NewsletterOut])
def list_all(
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(Newsletter).all()

@router.post("/", response_model=NewsletterOut)
def add(
    item: NewsletterCreate, 
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    entry = Newsletter(**item.dict())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

@router.patch("/{id}", response_model=NewsletterOut)
def toggle(
    id: int, 
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    sub = db.query(Newsletter).filter(Newsletter.id==id).first()
    sub.active = not sub.active
    db.commit()
    db.refresh(sub)
    return sub
