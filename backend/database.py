from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from config import MYSQL_URL

# SQLite requires check_same_thread=False for FastAPI
# MySQL doesn't need this, so we conditionally add it
connect_args = {}
if MYSQL_URL.startswith('sqlite'):
    connect_args = {"check_same_thread": False}
    # SQLite doesn't need pool settings
    engine = create_engine(MYSQL_URL, connect_args=connect_args, echo=False)
else:
    # MySQL connection settings
    engine = create_engine(MYSQL_URL, pool_pre_ping=True, pool_recycle=3600)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()
