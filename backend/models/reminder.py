"""
Reminder model for follow-up reminders on leads
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base

class Reminder(Base):
    __tablename__ = 'reminders'
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey('leads.id'), nullable=True)  # Can be null for general reminders
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)  # User who needs to follow up
    title = Column(String(255))
    description = Column(String(1000), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default='Pending')  # Pending, Completed, Cancelled
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

