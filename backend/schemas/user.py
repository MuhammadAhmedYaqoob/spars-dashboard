from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    name: str
    email: str
    role_id: int
    manager_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    role_id: int | None = None
    password: str | None = None
    manager_id: int | None = None

class UserOut(UserBase):
    id: int
    manager_name: Optional[str] = None
    role_name: Optional[str] = None
    class Config:
        from_attributes = True

class PasswordChange(BaseModel):
    old_password: str
    new_password: str
