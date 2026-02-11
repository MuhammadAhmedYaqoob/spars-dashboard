from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from database import Base

class ActivityLog(Base):
    __tablename__ = 'activity_logs'
    id = Column(Integer, primary_key=True, index=True)
    action_type = Column(String(50))  # 'lead_converted', 'status_changed', 'comment_added', 'user_created', 'user_updated', 'user_deleted', 'login'
    description = Column(String(500))
    entity_type = Column(String(50))  # 'lead', 'user', 'submission', 'comment'
    entity_id = Column(Integer, nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    meta_data = Column(JSON, nullable=True)  # Additional context (renamed from 'metadata' to avoid SQLAlchemy conflict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

