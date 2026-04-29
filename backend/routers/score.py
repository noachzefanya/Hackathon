"""
GuardianFlow AI — Score Router
POST /api/v1/score — Real-time risk scoring with SHAP explanations
"""
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.core.telemetry import record_scoring_event, Timer
from backend.core.redis_client import increment_velocity, get_device_trust, get_velocity
from backend.models.schemas import ScoreRequest, ScoreResponse
from backend.models.db_models import Transaction, Alert, RiskLevel, TxStatus, AlertSeverity
from backend.ml.scorer import score_transaction
from backend.services.webhook import dispatch_webhook
from backend.services.eventhub import publish_event

router = APIRouter(prefix="/api/v1", tags=["Scoring"])
logger = logging.getLogger(__name__)


@router.post("/score", response_model=ScoreResponse, summary="Score a transaction for fraud risk")
async def score(
    req: ScoreRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """
    Submit a transaction for real-time AI risk scoring.
    Returns risk_score (0–100), risk_level, action, and SHAP explanations.
    """
    # ── 1. Velocity lookup from Redis ─────────────────────────────────────────
    velocity = await increment_velocity(req.user_id)
    cached_trust = await get_device_trust(req.device_id)
    device_trust = cached_trust if cached_trust is not None else 80

    # ── 2. Derive time features ────────────────────────────────────────────────
    ts = req.timestamp or datetime.now(timezone.utc)
    hour_of_day = ts.hour
    day_of_week = ts.weekday()

    # ── 3. ML Scoring ─────────────────────────────────────────────────────────
    with Timer() as t:
        result = score_transaction(
            user_id=req.user_id,
            amount=req.amount,
            merchant_id=req.merchant_id,
            device_id=req.device_id,
            ip_address=req.ip_address,
            velocity_10min=velocity,
            geo_distance_km=0.0,           # Can be computed from lat/lng history
            device_trust_score=device_trust,
            hour_of_day=hour_of_day,
            day_of_week=day_of_week,
            is_new_device=1 if device_trust < 30 else 0,
            typing_speed_wpm=req.typing_speed_wpm or 60,
            location_lat=req.location_lat,
            location_lng=req.location_lng,
        )

    tx_id = str(uuid.uuid4())
    risk_score = result["risk_score"]
    risk_level = result["risk_level"]
    action = result["action"]
    reasons = result["reasons"]
    latency_ms = t.elapsed_ms

    # ── 4. Azure Monitor telemetry ────────────────────────────────────────────
    record_scoring_event(
        score=risk_score,
        level=risk_level,
        amount=req.amount,
        merchant_id=req.merchant_id,
        latency_ms=latency_ms,
        user_id=req.user_id,
        transaction_id=tx_id,
    )

    # ── 5. Persist transaction ─────────────────────────────────────────────────
    status_map = {"approve": TxStatus.approved, "step_up": TxStatus.flagged, "block": TxStatus.blocked}
    level_map = {"low": RiskLevel.low, "medium": RiskLevel.medium, "high": RiskLevel.high}

    tx = Transaction(
        id=uuid.UUID(tx_id),
        user_id=req.user_id,
        merchant_id=req.merchant_id,
        amount=req.amount,
        device_id=req.device_id,
        ip_address=req.ip_address,
        location_lat=req.location_lat,
        location_lng=req.location_lng,
        risk_score=risk_score,
        risk_level=level_map[risk_level],
        status=status_map[action],
        xai_reasons=[r.model_dump() for r in reasons],
        ai_trace_id=result["trace_id"],
        typing_speed_wpm=req.typing_speed_wpm,
        navigation_pattern_hash=req.navigation_pattern_hash,
        created_at=datetime.now(timezone.utc),
    )
    db.add(tx)

    # ── 6. Create Alert for high/medium risk ──────────────────────────────────
    if risk_score > 30:
        severity = AlertSeverity.critical if risk_score > 70 else AlertSeverity.medium
        alert = Alert(
            transaction_id=uuid.UUID(tx_id),
            severity=severity,
            reason="; ".join([r.description for r in reasons[:2]]),
            app_insights_event_id=result["trace_id"],
        )
        db.add(alert)

    await db.flush()

    # ── 7. Background tasks ───────────────────────────────────────────────────
    if risk_score > 70:
        if req.client_callback_url:
            background_tasks.add_task(
                dispatch_webhook,
                url=req.client_callback_url,
                payload={
                    "transaction_id": tx_id,
                    "risk_score": risk_score,
                    "risk_level": risk_level,
                    "action": action,
                },
            )
        background_tasks.add_task(
            publish_event,
            event_type="fraud_blocked",
            data={"tx_id": tx_id, "score": risk_score, "user_id": req.user_id},
        )

    # ── 8. Response ───────────────────────────────────────────────────────────
    return ScoreResponse(
        transaction_id=tx_id,
        risk_score=risk_score,
        risk_level=risk_level,
        action=action,
        reasons=reasons,
        latency_ms=round(latency_ms, 2),
        timestamp=datetime.now(timezone.utc),
    )
