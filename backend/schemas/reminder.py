"""
Pydantic schemas for Reminder
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ReminderBase(BaseModel):
    lead_id: Optional[int] = None
    user_id: int
    title: str
    description: Optional[str] = None
    due_date: datetime
    status: str = 'Pending'  # Pending, Completed, Cancelled
    completed: bool = False

class ReminderCreate(ReminderBase):
    pass

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None  # Pending, Completed, Cancelled
    completed: Optional[bool] = None

class ReminderOut(ReminderBase):
    id: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

