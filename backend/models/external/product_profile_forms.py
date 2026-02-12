"""
Model for product_profile_forms table in spars_forms.db
"""
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database_forms import FormsBase

class ProductProfileForm(FormsBase):
    __tablename__ = 'product_profile_forms'
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(255))
    last_name = Column(String(255))
    email = Column(String(255), index=True)
    phone = Column(String(255))
    job_title = Column(String(255), nullable=True)
    company_name = Column(String(255))
    industry = Column(String(255), nullable=True)
    company_size = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    current_system = Column(String(255), nullable=True)
    warehouses = Column(Integer, nullable=True)
    users = Column(Integer, nullable=True)
    requirements = Column(Text, nullable=True)
    timeline = Column(String(255), nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())








