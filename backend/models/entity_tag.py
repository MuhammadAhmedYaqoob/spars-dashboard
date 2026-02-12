"""
EntityTag model - many-to-many relationship between entities and tags
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from database import Base

class EntityTag(Base):
    __tablename__ = 'entity_tags'
    
    id = Column(Integer, primary_key=True, index=True)
    tag_id = Column(Integer, ForeignKey('tags.id'), nullable=False)
    entity_type = Column(String(50), index=True)  # 'lead', 'newsletter', 'submission', etc.
    entity_id = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Ensure one tag can only be applied once per entity
    __table_args__ = (
        UniqueConstraint('tag_id', 'entity_type', 'entity_id', name='uq_entity_tag'),
    )








