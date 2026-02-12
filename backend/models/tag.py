"""
Tag model for custom tags on leads, subscribers, etc.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from database import Base

class Tag(Base):
    __tablename__ = 'tags'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)
    color = Column(String(7), default='#1E73FF')  # Hex color code
    entity_type = Column(String(50), index=True)  # 'lead', 'newsletter', 'submission', etc.
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())








