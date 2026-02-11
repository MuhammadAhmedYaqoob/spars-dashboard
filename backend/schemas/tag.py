"""
Pydantic schemas for Tag
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class TagBase(BaseModel):
    name: str
    color: str = '#1E73FF'
    entity_type: str
    created_by: Optional[int] = None

class TagCreate(TagBase):
    pass

class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    entity_type: Optional[str] = None

class TagOut(TagBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class EntityTagBase(BaseModel):
    tag_id: int
    entity_type: str
    entity_id: int

class EntityTagCreate(EntityTagBase):
    pass

class EntityTagOut(EntityTagBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True






