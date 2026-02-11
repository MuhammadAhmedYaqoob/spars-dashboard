from pydantic import BaseModel

class NewsletterCreate(BaseModel):
    email: str
    date: str

class NewsletterOut(BaseModel):
    id: int
    email: str
    date: str
    active: bool
    class Config:
        from_attributes = True
