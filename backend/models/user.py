from sqlalchemy import Column, Integer, String, ForeignKey
from database import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    email = Column(String(255), unique=True)
    hashed_password = Column(String(255))
    role_id = Column(Integer, ForeignKey('roles.id'))
    manager_id = Column(Integer, ForeignKey('users.id'), nullable=True)  # Self-referential for hierarchy
