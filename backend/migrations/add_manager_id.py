"""
Migration script to add manager_id column to users table
Run with: python -m migrations.add_manager_id
"""
import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# Add parent directory to path to import config and models
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from config import MYSQL_URL

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_migration():
    print("Starting manager_id column migration...")
    db = SessionLocal()
    inspector = inspect(engine)
    
    try:
        # Check if column already exists
        if inspector.has_table('users'):
            columns = [col['name'] for col in inspector.get_columns('users')]
            if 'manager_id' in columns:
                print("[INFO] Column 'manager_id' already exists. Skipping migration.")
                return
        
        # Add manager_id column
        db.execute(text("ALTER TABLE users ADD COLUMN manager_id INTEGER NULL"))
        
        # Note: SQLite doesn't support adding foreign key constraints via ALTER TABLE
        # The foreign key relationship is handled by SQLAlchemy model definition
        # For MySQL, you can add the constraint separately if needed
        
        db.commit()
        print("[OK] Added 'manager_id' column to 'users' table.")
        print("[SUCCESS] Manager ID migration completed successfully.")
        
    except Exception as e:
        print(f"[ERROR] Error during migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()

