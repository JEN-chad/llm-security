"""
Data models — now plain Pydantic models for parsing db-service responses.
No more SQLAlchemy — the actual schema lives in the Drizzle db-service.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class User(BaseModel):
    id: int
    username: str
    failedAttempts: int = 0
    wins: int = 0
    lastAttemptTime: Optional[datetime] = None

    # Allow snake_case aliases from DB
    class Config:
        populate_by_name = True


class GlobalStats(BaseModel):
    id: int
    totalWins: int = 0
    securityLevel: int = 1

    class Config:
        populate_by_name = True


class Wallet(BaseModel):
    id: int
    userId: Optional[int] = None
    balance: str = "0"
    isMain: bool = False

    class Config:
        populate_by_name = True


class Session(BaseModel):
    sessionId: str
    userId: int
    hasApproved: bool = False
    createdAt: Optional[datetime] = None

    class Config:
        populate_by_name = True


class Transaction(BaseModel):
    id: Optional[int] = None
    userId: int
    sessionId: Optional[str] = None
    amount: Optional[str] = None
    decision: Optional[str] = None
    reason: Optional[str] = None
    createdAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
