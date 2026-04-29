"""
GuardianFlow AI — Alerts Router
Manual review queue alerts management
"""
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.schemas import AlertOut, AlertResolve
from backend.models.db_models import Alert, AlertSeverity

router = APIRouter(prefix="/api/v1/alerts", tags=["Alerts"])
logger = logging.getLogger(__name__)


@router.get("", response_model=list[AlertOut])
async def list_alerts(
    resolved: bool | None = Query(None),
    severity: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    q = select(Alert).order_by(desc(Alert.created_at))
    if resolved is not None:
        if resolved:
            q = q.where(Alert.resolved_at.isnot(None))
        else:
            q = q.where(Alert.resolved_at.is_(None))
    if severity:
        q = q.where(Alert.severity == severity)

    offset = (page - 1) * page_size
    result = await db.execute(q.offset(offset).limit(page_size))
    return [AlertOut.model_validate(a) for a in result.scalars().all()]


@router.get("/{alert_id}", response_model=AlertOut)
async def get_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return AlertOut.model_validate(alert)


@router.post("/{alert_id}/resolve", response_model=AlertOut)
async def resolve_alert(
    alert_id: uuid.UUID,
    body: AlertResolve,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Mark an alert as resolved by the current analyst/admin."""
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.resolved_at:
        raise HTTPException(status_code=400, detail="Alert already resolved")

    alert.resolved_by = uuid.UUID(current_user["sub"])
    alert.resolved_at = datetime.now(timezone.utc)
    if body.notes:
        alert.reason = (alert.reason or "") + f"\n[Resolved] {body.notes}"
    return AlertOut.model_validate(alert)


@router.get("/stats/summary")
async def alert_stats(
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Return alert counts by severity and resolution status."""
    total = (await db.execute(select(func.count()).select_from(Alert))).scalar_one()
    unresolved = (await db.execute(
        select(func.count()).select_from(Alert).where(Alert.resolved_at.is_(None))
    )).scalar_one()
    critical = (await db.execute(
        select(func.count()).select_from(Alert).where(Alert.severity == AlertSeverity.critical)
    )).scalar_one()

    return {
        "total": total,
        "unresolved": unresolved,
        "resolved": total - unresolved,
        "critical": critical,
    }
