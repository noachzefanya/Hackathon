"""
GuardianFlow AI — Transactions Router
CRUD for /api/v1/transactions
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.schemas import TransactionOut, TransactionListResponse
from backend.models.db_models import Transaction, TxStatus

router = APIRouter(prefix="/api/v1/transactions", tags=["Transactions"])
logger = logging.getLogger(__name__)


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    risk_level: Optional[str] = Query(None, description="low | medium | high"),
    status: Optional[str] = Query(None, description="approved | flagged | blocked | reviewing"),
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """List transactions with optional filters and pagination."""
    q = select(Transaction).order_by(desc(Transaction.created_at))

    if risk_level:
        q = q.where(Transaction.risk_level == risk_level)
    if status:
        q = q.where(Transaction.status == status)
    if user_id:
        q = q.where(Transaction.user_id == user_id)

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(q.offset(offset).limit(page_size))
    items = result.scalars().all()

    return TransactionListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[TransactionOut.model_validate(tx) for tx in items],
    )


@router.get("/queue", response_model=TransactionListResponse)
async def review_queue(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Return transactions in the manual review queue (score > 70)."""
    q = (
        select(Transaction)
        .where(Transaction.risk_score > 70)
        .where(Transaction.status == TxStatus.blocked)
        .order_by(desc(Transaction.created_at))
    )
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar_one()
    offset = (page - 1) * page_size
    result = await db.execute(q.offset(offset).limit(page_size))
    items = result.scalars().all()

    return TransactionListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[TransactionOut.model_validate(tx) for tx in items],
    )


@router.get("/{transaction_id}", response_model=TransactionOut)
async def get_transaction(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    tx = await db.get(Transaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return TransactionOut.model_validate(tx)


@router.patch("/{transaction_id}/status")
async def update_status(
    transaction_id: uuid.UUID,
    new_status: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update transaction status (e.g., move from reviewing → approved/blocked)."""
    tx = await db.get(Transaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    valid = {s.value for s in TxStatus}
    if new_status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")
    tx.status = TxStatus(new_status)
    return {"id": str(transaction_id), "status": new_status}
