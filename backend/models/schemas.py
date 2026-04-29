"""
GuardianFlow AI — Pydantic Request/Response Schemas
"""
import uuid
from datetime import datetime
from typing import List, Optional, Any
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field, UUID4


# ── Score endpoint ────────────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=128)
    amount: float = Field(..., gt=0, description="Transaction amount")
    merchant_id: str = Field(..., min_length=1, max_length=128)
    device_id: str = Field(..., min_length=1, max_length=256)
    ip_address: str = Field(..., min_length=7, max_length=45)
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    timestamp: Optional[datetime] = None
    typing_speed_wpm: Optional[int] = Field(None, ge=0, le=300)
    navigation_pattern_hash: Optional[str] = None
    client_callback_url: Optional[str] = None  # For webhooks

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_001",
                "amount": 5000000,
                "merchant_id": "merchant_tokopedia",
                "device_id": "dev_abc123",
                "ip_address": "103.28.3.100",
                "location_lat": -6.2088,
                "location_lng": 106.8456,
                "timestamp": "2024-04-28T14:00:00Z",
                "typing_speed_wpm": 72,
                "navigation_pattern_hash": "d4f2a9b1",
            }
        }


class XAIReason(BaseModel):
    feature: str
    impact: float
    direction: str  # "increase_risk" | "decrease_risk"
    description: str


class ScoreResponse(BaseModel):
    transaction_id: str
    risk_score: int = Field(..., ge=0, le=100)
    risk_level: str  # low / medium / high
    action: str       # approve / step_up / block
    reasons: List[XAIReason]
    latency_ms: float
    timestamp: datetime


# ── Transaction schemas ───────────────────────────────────────────────────────

class TransactionOut(BaseModel):
    id: UUID4
    user_id: str
    merchant_id: str
    amount: float
    currency: str
    device_id: str
    ip_address: str
    location_lat: Optional[float]
    location_lng: Optional[float]
    risk_score: int
    risk_level: str
    status: str
    xai_reasons: List[Any]
    ai_trace_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[TransactionOut]


# ── User schemas ──────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = "analyst"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID4
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


# ── Alert schemas ─────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: UUID4
    transaction_id: UUID4
    severity: str
    reason: Optional[str]
    resolved_by: Optional[UUID4]
    resolved_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class AlertResolve(BaseModel):
    notes: Optional[str] = None


# ── Graph schemas ─────────────────────────────────────────────────────────────

class GraphNode(BaseModel):
    id: str
    label: str  # ip | device | user
    value: str
    fraud_score: float


class GraphEdge(BaseModel):
    source: str
    target: str
    weight: int
    last_seen: Optional[str]


class GraphResponse(BaseModel):
    entity_id: str
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    fraud_cluster: bool
    cluster_size: int


# ── API Key schemas ───────────────────────────────────────────────────────────

class APIKeyCreate(BaseModel):
    name: str
    description: Optional[str] = None


class APIKeyOut(BaseModel):
    key_id: str
    name: str
    api_key: str  # Only shown once at creation
    created_at: datetime


# ── Health ────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    db: str
    redis: str
    timestamp: datetime
