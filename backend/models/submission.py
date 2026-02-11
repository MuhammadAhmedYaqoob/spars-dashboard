from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Submission(Base):
    __tablename__ = 'submissions'
    id = Column(Integer, primary_key=True, index=True)
    form_type = Column(String(255), index=True)
    name = Column(String(255))
    email = Column(String(255))
    company = Column(String(255))
    submitted = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default='New')  # New | Converted | Archived
    lead_id = Column(Integer, ForeignKey('leads.id'), nullable=True)
    data = Column(JSON)  # dynamic form payload
