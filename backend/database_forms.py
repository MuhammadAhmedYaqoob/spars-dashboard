"""
Secondary database connection for spars_forms.db (read-only)
Only used when USE_FORMS_DB=true
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from config import USE_FORMS_DB, FORMS_DB_PATH
import os

# Base for external forms models
FormsBase = declarative_base()

# Forms database engine (only created if USE_FORMS_DB is True)
forms_engine = None
FormsSessionLocal = None

if USE_FORMS_DB:
    # Construct the full path to the forms database
    if not os.path.isabs(FORMS_DB_PATH):
        # Relative path - make it relative to backend directory
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        forms_db_path = os.path.join(backend_dir, FORMS_DB_PATH)
    else:
        forms_db_path = FORMS_DB_PATH
    
    # SQLite connection for forms database
    forms_db_url = f'sqlite:///{forms_db_path}'
    forms_engine = create_engine(
        forms_db_url,
        connect_args={"check_same_thread": False},
        echo=False
    )
    FormsSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=forms_engine)
    print(f"[INFO] Connected to forms database: {forms_db_path}")
else:
    print("[INFO] Using dummy form data from CRM database (USE_FORMS_DB=false)")

def get_forms_session():
    """Get a database session for forms database"""
    if not USE_FORMS_DB:
        raise RuntimeError("USE_FORMS_DB is False. Forms database is not available.")
    if FormsSessionLocal is None:
        raise RuntimeError("Forms database session not initialized.")
    return FormsSessionLocal()






