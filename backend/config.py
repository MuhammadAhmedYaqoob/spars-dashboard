import os

# Default to SQLite, but can be overridden with MYSQL_URL env var for MySQL if needed
# Ensure database is in project root, not backend directory
_db_env = os.getenv('MYSQL_URL', '')
if _db_env and not _db_env.startswith('sqlite'):
    # MySQL or other database URL provided
    MYSQL_URL = _db_env
else:
    # SQLite - use project root directory
    _current_dir = os.path.dirname(os.path.abspath(__file__))
    # If we're in backend/, go up one level to project root
    if os.path.basename(_current_dir) == 'backend':
        _project_root = os.path.dirname(_current_dir)
    else:
        _project_root = _current_dir
    _db_file = os.path.join(_project_root, 'spars.db')
    MYSQL_URL = f'sqlite:///{_db_file}'

SECRET_KEY = os.getenv('SECRET_KEY', 'supersecret')
ALGORITHM = os.getenv('ALGORITHM', 'HS256')
ALLOW_ORIGINS = [o.strip() for o in os.getenv('ALLOW_ORIGINS', 'http://localhost:3002,http://192.168.100.77:3002').split(',') if o.strip()]

# Forms Database Configuration
# If USE_FORMS_DB=true, connect to spars_forms.db for form data
# If USE_FORMS_DB=false, use seeded dummy data in CRM database
USE_FORMS_DB = os.getenv('USE_FORMS_DB', 'false').lower() == 'true'
FORMS_DB_PATH = os.getenv('FORMS_DB_PATH', './spars_forms.db')
