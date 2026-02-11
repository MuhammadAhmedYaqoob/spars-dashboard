"""
Migration script to add activity_logs table
Run with: python -m migrations.add_activity_logs
"""
import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# Add parent directory to path to import config and models
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, engine
from models.activity_log import ActivityLog
from config import MYSQL_URL

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_migration():
    print("Starting activity_logs table migration...")
    db = SessionLocal()
    inspector = inspect(engine)
    
    try:
        # Check if table already exists
        if inspector.has_table('activity_logs'):
            print("[INFO] Table 'activity_logs' already exists. Skipping migration.")
            return
        
        # Create the table using SQLAlchemy
        ActivityLog.__table__.create(bind=engine, checkfirst=True)
        print("[OK] Created 'activity_logs' table.")
        
        db.commit()
        print("[SUCCESS] Activity logs migration completed successfully.")
        
    except Exception as e:
        print(f"[ERROR] Error during migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()






