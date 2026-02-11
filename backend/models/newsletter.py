from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class Newsletter(Base):
    __tablename__ = 'newsletter'
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True)
    date = Column(String(255))
    active = Column(Boolean, default=True)
