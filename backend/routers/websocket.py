"""
GuardianFlow AI — WebSocket Router
Live transaction feed via native FastAPI WebSocket
"""
import asyncio
import json
import logging
import random
from datetime import datetime, timezone
from typing import Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSocket"])
logger = logging.getLogger(__name__)

# Connected clients registry
_connections: Set[WebSocket] = set()


async def broadcast(message: dict) -> None:
    """Broadcast a message to all connected WebSocket clients."""
    dead = set()
    data = json.dumps(message, default=str)
    for ws in _connections.copy():
        try:
            await ws.send_text(data)
        except Exception:
            dead.add(ws)
    _connections -= dead


@router.websocket("/ws/transactions")
async def transactions_feed(websocket: WebSocket):
    """
    WebSocket endpoint for the live transaction feed on /dashboard.
    Sends a simulated transaction event every second.
    In production, replace with Event Hubs consumer.
    """
    await websocket.accept()
    _connections.add(websocket)
    logger.info(f"WebSocket connected: {websocket.client}. Total: {len(_connections)}")

    MERCHANTS = ["Tokopedia", "Shopee", "Gojek", "OVO", "Dana", "BRI", "BCA", "Mandiri"]
    CITIES = ["Jakarta", "Surabaya", "Bandung", "Medan", "Makassar", "Bali"]

    try:
        while True:
            score = random.randint(0, 100)
            level = "low" if score < 30 else ("medium" if score <= 70 else "high")
            action = "approve" if score < 30 else ("step_up" if score <= 70 else "block")

            event = {
                "type": "transaction",
                "data": {
                    "transaction_id": f"tx_{random.randint(100000, 999999)}",
                    "user_id": f"user_{random.randint(1000, 9999)}",
                    "merchant_id": random.choice(MERCHANTS),
                    "amount": round(random.uniform(10_000, 50_000_000), 2),
                    "risk_score": score,
                    "risk_level": level,
                    "action": action,
                    "city": random.choice(CITIES),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "reasons": [
                        {"feature": "velocity_10min", "description": "Frekuensi transaksi tinggi", "impact": round(random.uniform(0.1, 0.9), 3)},
                    ] if score > 30 else [],
                },
            }
            await websocket.send_text(json.dumps(event, default=str))
            await asyncio.sleep(1.5)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {websocket.client}")
    except Exception as exc:
        logger.error(f"WebSocket error: {exc}")
    finally:
        _connections.discard(websocket)
