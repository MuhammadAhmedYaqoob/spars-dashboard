"""
Pydantic schemas for CallLog
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class CallLogBase(BaseModel):
    lead_id: int
    user_id: int
    stage: Optional[str] = None  # A-H pipeline stages
    activity_type: Optional[str] = None
    objective: Optional[str] = None
    planning_notes: Optional[str] = None
    post_meeting_notes: Optional[str] = None
    follow_up_notes: Optional[str] = None
    challenges: Optional[str] = None
    secured_order: bool = False
    dollar_value: Optional[float] = None
    meeting_date: Optional[datetime] = None
    is_completed: bool = False
    is_cancelled: bool = False

class CallLogCreate(CallLogBase):
    pass

class CallLogUpdate(BaseModel):
    stage: Optional[str] = None
    activity_type: Optional[str] = None
    objective: Optional[str] = None
    planning_notes: Optional[str] = None
    post_meeting_notes: Optional[str] = None
    follow_up_notes: Optional[str] = None
    challenges: Optional[str] = None
    secured_order: Optional[bool] = None
    dollar_value: Optional[float] = None
    meeting_date: Optional[datetime] = None
    is_completed: Optional[bool] = None
    is_cancelled: Optional[bool] = None

class CallLogOut(CallLogBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True





