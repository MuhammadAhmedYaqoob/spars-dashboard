from pydantic import BaseModel
from datetime import datetime

class CommentCreate(BaseModel):
    lead_id: int
    text: str
    status: str | None = None

class CommentOut(BaseModel):
    id: int
    lead_id: int
    text: str
    status: str | None = None
    created_by: int | None = None
    timestamp: datetime
    class Config:
        from_attributes = True
