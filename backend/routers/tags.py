"""
Tags router for managing custom tags
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import SessionLocal
from models.tag import Tag
from models.entity_tag import EntityTag
from models.user import User
from schemas.tag import TagCreate, TagOut, TagUpdate, EntityTagCreate, EntityTagOut
from routers.auth import get_current_active_user, check_permission

router = APIRouter(prefix="/tags", tags=["Tags"])

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[TagOut])
def list_tags(
    entity_type: Optional[str] = None,
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    """List all tags, optionally filtered by entity_type"""
    query = db.query(Tag)
    if entity_type:
        query = query.filter(Tag.entity_type == entity_type)
    return query.order_by(Tag.name).all()

@router.post("/", response_model=TagOut)
def create_tag(
    payload: TagCreate,
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("leads", write_access=True))
):
    """Create a new tag"""
    # Check if tag with same name already exists
    existing = db.query(Tag).filter(Tag.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tag with this name already exists")
    
    tag_data = payload.dict()
    tag_data['created_by'] = current_user.id
    tag = Tag(**tag_data)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag

@router.patch("/{id}", response_model=TagOut)
def update_tag(
    id: int,
    payload: TagUpdate,
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("leads", write_access=True))
):
    """Update a tag"""
    tag = db.query(Tag).filter(Tag.id == id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tag, key, value)
    
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag

@router.delete("/{id}")
def delete_tag(
    id: int,
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("leads", write_access=True))
):
    """Delete a tag and all its entity associations"""
    tag = db.query(Tag).filter(Tag.id == id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    # Delete all entity associations
    db.query(EntityTag).filter(EntityTag.tag_id == id).delete()
    
    # Delete the tag
    db.delete(tag)
    db.commit()
    return {"ok": True}

@router.get("/entity/{entity_type}/{entity_id}", response_model=List[TagOut])
def get_entity_tags(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get all tags for a specific entity"""
    entity_tags = db.query(EntityTag).filter(
        EntityTag.entity_type == entity_type,
        EntityTag.entity_id == entity_id
    ).all()
    
    tag_ids = [et.tag_id for et in entity_tags]
    if not tag_ids:
        return []
    
    tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
    return tags

@router.post("/entity/{entity_type}/{entity_id}", response_model=EntityTagOut)
def add_tag_to_entity(
    entity_type: str,
    entity_id: int,
    tag_id: int = Query(..., description="Tag ID to add"),
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("leads", write_access=True))
):
    """Add a tag to an entity"""
    # Check if tag exists
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    # Check if already tagged
    existing = db.query(EntityTag).filter(
        EntityTag.tag_id == tag_id,
        EntityTag.entity_type == entity_type,
        EntityTag.entity_id == entity_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Entity already has this tag")
    
    entity_tag = EntityTag(
        tag_id=tag_id,
        entity_type=entity_type,
        entity_id=entity_id
    )
    db.add(entity_tag)
    db.commit()
    db.refresh(entity_tag)
    return entity_tag

@router.delete("/entity/{entity_type}/{entity_id}/{tag_id}")
def remove_tag_from_entity(
    entity_type: str,
    entity_id: int,
    tag_id: int,
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("leads", write_access=True))
):
    """Remove a tag from an entity"""
    entity_tag = db.query(EntityTag).filter(
        EntityTag.tag_id == tag_id,
        EntityTag.entity_type == entity_type,
        EntityTag.entity_id == entity_id
    ).first()
    
    if not entity_tag:
        raise HTTPException(status_code=404, detail="Tag association not found")
    
    db.delete(entity_tag)
    db.commit()
    return {"ok": True}

