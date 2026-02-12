from sqlalchemy import Column, Integer, String, JSON
from database import Base

class Role(Base):
    __tablename__ = 'roles'
    id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(100), unique=True)
    permissions = Column(JSON)  # optional granular permissions
    hierarchy_level = Column(Integer, default=4)  # 1=Super Admin, 2=Manager, 3=Marketing, 4=Read-Only