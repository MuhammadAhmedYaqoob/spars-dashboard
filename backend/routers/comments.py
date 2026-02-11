from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import SessionLocal
from models.comment import Comment
from models.user import User
from models.lead import Lead
from models.role import Role
from schemas.comment import CommentCreate, CommentOut
from routers.auth import get_current_active_user, check_permission
from services.activity_logger import log_comment_added

router = APIRouter(prefix="/comments", tags=["Comments"])

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=CommentOut)
def add_comment(
    request: CommentCreate, 
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)  # Allow all authenticated users
):
    # Check if user has access to the lead
    lead = db.query(Lead).filter(Lead.id == request.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check if user has permission or if lead is assigned to them
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    permissions = role.permissions if role else {}
    
    # Admin and users with "leads" permission can comment on any lead
    if not (permissions.get("all") == True or permissions.get("leads") == True):
        # For read-only users, only allow if lead is assigned to them
        if lead.assigned_to != current_user.id and lead.assigned != current_user.name:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only add comments to leads assigned to you"
            )
    
    comment_data = request.dict()
    comment_data['created_by'] = current_user.id
    entry = Comment(**comment_data)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    
    # Log the comment addition
    log_comment_added(db, current_user.id, request.lead_id, entry.id)
    
    return entry

@router.get("/{lead_id}", response_model=list[CommentOut])
def list_comments(
    lead_id: int, 
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(Comment).filter(Comment.lead_id==lead_id).all()
