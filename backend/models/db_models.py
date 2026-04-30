"""
GuardianFlow AI — SQLAlchemy ORM Models
Transaction, User, Device, Alert tables — compatible with SQLite and PostgreSQL
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, String, Text,
    Integer, Numeric, ForeignKey, JSON,
)
from sqlalchemy.orm import relationship

from backend.core.database import Base, _is_sqlite


def now_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ── Enums (stored as strings for cross-DB compat) ─────────────────────────────

import enum

class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TxStatus(str, enum.Enum):
    approved = "approved"
    flagged = "flagged"
    blocked = "blocked"
    reviewing = "reviewing"


class UserRole(str, enum.Enum):
    admin = "admin"
    analyst = "analyst"
    api_client = "api_client"


class AlertSeverity(str, enum.Enum):
    medium = "medium"
    high = "high"
    critical = "critical"


# ── Transaction ───────────────────────────────────────────────────────────────

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(128), nullable=False, index=True)
    merchant_id = Column(String(128), nullable=False, index=True)
    amount = Column(Numeric(precision=18, scale=2), nullable=False)
    currency = Column(String(3), default="IDR")
    device_id = Column(String(256), nullable=False, index=True)
    ip_address = Column(String(45), nullable=False)
    location_lat = Column(Numeric(precision=10, scale=7))
    location_lng = Column(Numeric(precision=10, scale=7))
    risk_score = Column(Integer, nullable=False, default=0)
    risk_level = Column(String(16), nullable=False, default="low")
    status = Column(String(16), nullable=False, default="approved")
    xai_reasons = Column(JSON, default=list)
    ai_trace_id = Column(String(64))
    typing_speed_wpm = Column(Integer)
    navigation_pattern_hash = Column(String(64))
    created_at = Column(DateTime, default=now_utc, nullable=False)

    alert = relationship("Alert", back_populates="transaction", uselist=False)


# ── User ──────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(16), nullable=False, default="analyst")
    is_active = Column(Boolean, default=True)
    api_key_ref = Column(String(255))
    created_at = Column(DateTime, default=now_utc, nullable=False)

    resolved_alerts = relationship("Alert", back_populates="resolver")


# ── Device ────────────────────────────────────────────────────────────────────

class Device(Base):
    __tablename__ = "devices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fingerprint_hash = Column(String(256), unique=True, nullable=False, index=True)
    user_id = Column(String(128), nullable=False, index=True)
    first_seen = Column(DateTime, default=now_utc)
    last_seen = Column(DateTime, default=now_utc)
    trust_score = Column(Integer, default=50)
    ip_history = Column(JSON, default=list)
    city_history = Column(JSON, default=list)


# ── Alert ─────────────────────────────────────────────────────────────────────

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_id = Column(String(36), ForeignKey("transactions.id"), nullable=False)
    severity = Column(String(16), nullable=False, default="high")
    reason = Column(Text)
    resolved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    app_insights_event_id = Column(String(128))
    created_at = Column(DateTime, default=now_utc, nullable=False)

    transaction = relationship("Transaction", back_populates="alert")
    resolver = relationship("User", back_populates="resolved_alerts")
