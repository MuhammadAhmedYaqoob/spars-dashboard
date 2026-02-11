"""
Model for contact_forms table in spars_forms.db
"""
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database_forms import FormsBase

class ContactForm(FormsBase):
    __tablename__ = 'contact_forms'
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(255))
    last_name = Column(String(255))
    email = Column(String(255), index=True)
    phone = Column(String(255), nullable=True)
    company = Column(String(255))
    company_size = Column(String(255), nullable=True)
    message = Column(Text, nullable=True)
    demo_date = Column(String(255), nullable=True)
    current_system = Column(String(255), nullable=True)
    warehouses = Column(Integer, nullable=True)
    users = Column(Integer, nullable=True)
    requirements = Column(Text, nullable=True)
    timeline = Column(String(255), nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())






