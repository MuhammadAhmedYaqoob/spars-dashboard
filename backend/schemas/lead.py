from pydantic import BaseModel
from datetime import datetime, date

class LeadBase(BaseModel):
    name: str
    email: str
    company: str
    source_type: str | None = None
    source: str | None = None
    phone: str | None = None
    designation: str | None = None
    status: str = 'New'
    stage: str | None = None
    assigned: str = 'Unassigned'
    follow_up_required: bool = False
    follow_up_date: date | None = None
    follow_up_time: str | None = None
    follow_up_status: str | None = 'Pending'  # Pending, Completed, Cancelled

class LeadCreate(LeadBase):
    assigned_to_id: int | None = None

class LeadOut(LeadBase):
    id: int
    assigned_to: int | None = None
    created_by: int | None = None
    created_by_name: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    class Config:
        from_attributes = True

class ConvertRequest(BaseModel):
    source_type: str | None = None
    source: str | None = None
    designation: str | None = None
    assigned: str | None = None  # Keep for backward compatibility
    assigned_to_id: int | None = None  # New: user ID for assignment

class LeadUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    source_type: str | None = None
    source: str | None = None
    designation: str | None = None
    status: str | None = None
    stage: str | None = None
    assigned: str | None = None
    assigned_to_id: int | None = None  # User ID for assignment
    follow_up_required: bool | None = None
    follow_up_date: date | None = None
    follow_up_time: str | None = None
    follow_up_status: str | None = None  # Pending, Completed, Cancelled