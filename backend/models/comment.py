from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Comment(Base):
    __tablename__ = 'comments'
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey('leads.id'))
    text = Column(String(1000))
    status = Column(String(50), nullable=True)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
