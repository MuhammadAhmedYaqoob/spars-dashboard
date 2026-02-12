import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, engine

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_migration():
    print("Starting follow_up_status column migration...")
    db = SessionLocal()
    inspector = inspect(engine)
    
    try:
        if not inspector.has_table('leads'):
            print("[ERROR] 'leads' table does not exist. Cannot add follow_up_status.")
            return

        # Check if follow_up_status column already exists
        columns = [col['name'] for col in inspector.get_columns('leads')]
        if 'follow_up_status' in columns:
            print("[INFO] Column 'follow_up_status' already exists in 'leads' table. Skipping.")
            return
        
        # Add the column
        db.execute(text("ALTER TABLE leads ADD COLUMN follow_up_status VARCHAR(20) NULL DEFAULT 'Pending'"))
        print("[OK] Added 'follow_up_status' column to 'leads' table.")
        
        # Update existing follow-ups to have 'Pending' status
        db.execute(text("UPDATE leads SET follow_up_status = 'Pending' WHERE follow_up_required = 1 AND follow_up_status IS NULL"))
        print("[OK] Updated existing follow-ups to 'Pending' status.")
        
        db.commit()
        print("[SUCCESS] Follow-up status migration completed successfully.")
        
    except Exception as e:
        print(f"[ERROR] Error during migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()


