from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric
from app.database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    failed_attempts = Column(Integer, default=0)
    wins = Column(Integer, default=0)
    last_attempt_time = Column(DateTime, default=datetime.utcnow)


class GlobalStats(Base):
    __tablename__ = "global_stats"

    id = Column(Integer, primary_key=True)
    total_wins = Column(Integer, default=0)
    security_level = Column(Integer, default=1)


class Wallet(Base):
    __tablename__ = "wallet"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    balance = Column(Numeric(12, 2), default=0)
    is_main = Column(Boolean, default=False)


class Session(Base):
    __tablename__ = "sessions"

    session_id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    has_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)   # ✅ ADD THIS LINE    
    session_id = Column(String, index=True)
    amount = Column(Numeric(12, 2))
    decision = Column(String)
    reason = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
