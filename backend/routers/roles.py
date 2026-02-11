from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from models.role import Role
from models.user import User
from schemas.role import RoleCreate, RoleOut, RoleUpdate
from routers.auth import get_current_active_user, check_permission

router = APIRouter(prefix="/roles", tags=["Roles"])

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=list[RoleOut])
def list_roles(
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("roles"))
):
    return db.query(Role).all()

@router.post("/", response_model=RoleOut)
def create_role(
    payload: RoleCreate, 
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("roles"))
):
    r = Role(**payload.dict())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r

@router.patch("/{id}", response_model=RoleOut)
def update_role(
    id: int, 
    payload: RoleUpdate, 
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("roles"))
):
    r = db.query(Role).filter(Role.id==id).first()
    if not r:
        raise Exception("Role not found")
    
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(r, key, value)
    
    db.add(r)
    db.commit()
    db.refresh(r)
    return r

@router.delete("/{id}")
def delete_role(
    id: int, 
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("roles"))
):
    r = db.query(Role).filter(Role.id==id).first()
    if r:
        db.delete(r)
        db.commit()
    return {"ok": True}
