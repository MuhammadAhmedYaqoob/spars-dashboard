from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Date
from sqlalchemy.sql import func
from database import Base

class Lead(Base):
    __tablename__ = 'leads'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(255), nullable=True)
    company = Column(String(255))
    source_type = Column(String(255), nullable=True)  # Website, Trade Show, Referral, etc.
    source = Column(String(255), nullable=True)  # Free-text: "Talk To Sales", "Request a Demo | XYZ Trade Show"
    designation = Column(String(255), nullable=True)
    status = Column(String(50), default='New')
    stage = Column(String(10), nullable=True)  # A-H pipeline stages
    assigned = Column(String(255), default='Unassigned')  # Keep for backward compatibility during migration
    assigned_to = Column(Integer, ForeignKey('users.id'), nullable=True)  # New FK relationship
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    follow_up_required = Column(Boolean, default=False)
    follow_up_date = Column(Date, nullable=True)
    follow_up_time = Column(String(10), nullable=True)  # HH:MM format
    follow_up_status = Column(String(20), nullable=True, default='Pending')  # Pending, Completed, Cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
