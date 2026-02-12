"""
Model for newsletter_subscriptions table in spars_forms.db
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database_forms import FormsBase

class NewsletterSubscription(FormsBase):
    __tablename__ = 'newsletter_subscriptions'
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True)
    subscribed_at = Column(DateTime(timezone=True), server_default=func.now())








