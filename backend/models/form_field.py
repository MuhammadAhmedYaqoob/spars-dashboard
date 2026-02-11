from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class FormField(Base):
    __tablename__ = 'form_fields'
    id = Column(Integer, primary_key=True, index=True)
    form_type = Column(String(255), index=True)
    field_name = Column(String(255))
    field_label = Column(String(255))
    field_type = Column(String(50))   # text | select | number | date
    required = Column(Boolean, default=False)
    options = Column(String(2000), nullable=True)  # comma-separated for select
