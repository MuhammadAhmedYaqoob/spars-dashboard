from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any

class ActivityLogBase(BaseModel):
    action_type: str
    description: str
    entity_type: str
    entity_id: Optional[int] = None
    user_id: int
    metadata: Optional[Dict[str, Any]] = Field(None, alias='meta_data')  # Map meta_data (DB) to metadata (API)

class ActivityLogCreate(ActivityLogBase):
    pass

class ActivityLogOut(ActivityLogBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
        populate_by_name = True  # Allow both field name and alias

