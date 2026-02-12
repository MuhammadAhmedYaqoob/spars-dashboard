"""
CallLog model for tracking sales calls and meetings
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text, Float, Date
from sqlalchemy.sql import func
from database import Base

class CallLog(Base):
    __tablename__ = 'call_logs'
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey('leads.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    stage = Column(String(10), nullable=True)  # A-H pipeline stages
    activity_type = Column(String(100), nullable=True)  # e.g., "Face to Face (In Person)", "Phone Call", etc.
    objective = Column(String(500), nullable=True)
    planning_notes = Column(Text, nullable=True)
    post_meeting_notes = Column(Text, nullable=True)
    follow_up_notes = Column(Text, nullable=True)
    challenges = Column(Text, nullable=True)
    secured_order = Column(Boolean, default=False)
    dollar_value = Column(Float, nullable=True)
    meeting_date = Column(DateTime(timezone=True), nullable=True)
    is_completed = Column(Boolean, default=False)
    is_cancelled = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())





