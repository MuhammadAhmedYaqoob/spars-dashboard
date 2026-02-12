"""
Migration script to normalize lead sources in the database.
This ensures all form-based leads have source='Website' and source_type=form name.
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, engine
from config import MYSQL_URL

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def normalize_lead_sources():
    """Normalize lead sources: set source='Website' for form-based leads"""
    print("Starting lead source normalization migration...")
    db = SessionLocal()
    
    try:
        # Form source names that should be normalized
        form_source_names = [
            'Brochure Download',
            'Product Profile Download',
            'Talk to Sales',
            'General Inquiry',
            'Request a Demo'
        ]
        
        # Update leads where source_type is a form name but source is not 'Website'
        for form_name in form_source_names:
            result = db.execute(
                text("""
                    UPDATE leads 
                    SET source = 'Website' 
                    WHERE source_type = :form_name AND source != 'Website'
                """),
                {"form_name": form_name}
            )
            count = result.rowcount
            if count > 0:
                print(f"[OK] Updated {count} leads with source_type='{form_name}' to source='Website'")
        
        # Update leads where source is a form name (old data structure)
        for form_name in form_source_names:
            result = db.execute(
                text("""
                    UPDATE leads 
                    SET source = 'Website',
                        source_type = CASE 
                            WHEN source_type IS NULL OR source_type = '' THEN :form_name
                            ELSE source_type
                        END
                    WHERE source = :form_name AND source != 'Website'
                """),
                {"form_name": form_name}
            )
            count = result.rowcount
            if count > 0:
                print(f"[OK] Updated {count} leads with source='{form_name}' to source='Website'")
        
        db.commit()
        print("[SUCCESS] Lead source normalization completed successfully.")
        
    except Exception as e:
        print(f"[ERROR] Error during migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    normalize_lead_sources()


