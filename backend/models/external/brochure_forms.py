"""
Model for brochure_forms table in spars_forms.db
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from database_forms import FormsBase

class BrochureForm(FormsBase):
    __tablename__ = 'brochure_forms'
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(255))
    last_name = Column(String(255))
    email = Column(String(255), index=True)
    company = Column(String(255))
    phone = Column(String(255), nullable=True)
    job_role = Column(String(255), nullable=True)
    agreed_to_marketing = Column(Boolean, default=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())






