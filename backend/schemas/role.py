from pydantic import BaseModel
from typing import Dict, Any

class RoleBase(BaseModel):
    role_name: str
    permissions: Dict[str, Any] | None = None

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    role_name: str | None = None
    permissions: Dict[str, Any] | None = None

class RoleOut(RoleBase):
    id: int
    hierarchy_level: int = 4
    class Config:
        from_attributes = True
