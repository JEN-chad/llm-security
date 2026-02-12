import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError
from app.config import settings

DATABASE_URL = settings.DATABASE_URL

# Retry DB connection (important for Docker)
engine = None
for attempt in range(10):
    try:
        # engine = create_engine(
        #     DATABASE_URL,
        #     pool_size=10,
        #     max_overflow=20,
        #     pool_pre_ping=True
        # )
        engine = create_engine(
            settings.DATABASE_URL,
            pool_size=20,
            max_overflow=10,
            pool_timeout=30
        )

        # Try to connect
        connection = engine.connect()
        connection.close()
        print("✅ Database connected")
        break
    except OperationalError:
        print(f"⏳ Waiting for database... attempt {attempt+1}")
        time.sleep(3)

if engine is None:
    raise Exception("❌ Could not connect to database after retries")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
