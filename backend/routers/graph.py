"""
GuardianFlow AI — Graph Router
GET /api/v1/graph/{entity_id} — Link analysis via Azure Cosmos DB Gremlin
"""
import logging
from fastapi import APIRouter, Depends, HTTPException

from backend.core.security import get_current_user
from backend.core.telemetry import record_graph_cluster
from backend.models.schemas import GraphResponse
from backend.services.graph import get_entity_graph

router = APIRouter(prefix="/api/v1/graph", tags=["Graph Analysis"])
logger = logging.getLogger(__name__)


@router.get("/{entity_id}", response_model=GraphResponse)
async def graph_analysis(
    entity_id: str,
    depth: int = 2,
    _user: dict = Depends(get_current_user),
):
    """
    Retrieve the fraud link graph for an entity (IP, device_id, or user_id).
    Returns adjacency list with fraud cluster detection.
    """
    try:
        result = await get_entity_graph(entity_id, depth=depth)
    except Exception as exc:
        logger.error(f"Graph query failed for {entity_id}: {exc}")
        raise HTTPException(status_code=503, detail=f"Graph service unavailable: {exc}")

    # Telemetry
    record_graph_cluster(
        entity_id=entity_id,
        cluster_size=result.cluster_size,
        fraud_cluster=result.fraud_cluster,
    )

    return result
