from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from datetime import datetime

class SubmissionBase(BaseModel):
    form_type: str
    name: str
    email: str
    company: str
    data: Dict[str, Any] = {}

class SubmissionCreate(SubmissionBase):
    pass

class SubmissionOut(SubmissionBase):
    id: int
    submitted: datetime
    status: str
    lead_id: Optional[int] = None
    class Config:
        from_attributes = True

class FilterRequest(BaseModel):
    form_type: str
    filters: Dict[str, Any] = {}
