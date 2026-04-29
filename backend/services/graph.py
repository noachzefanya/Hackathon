"""
GuardianFlow AI — Cosmos DB Gremlin Graph Service
Link analysis: IP, device, and user node relationships
"""
import logging
import os
from typing import Optional

from backend.models.schemas import GraphResponse, GraphNode, GraphEdge

logger = logging.getLogger(__name__)

# ── Cosmos DB Gremlin Client ──────────────────────────────────────────────────

def _get_gremlin_client():
    """Create Gremlin client — returns None if not configured."""
    endpoint = os.getenv("COSMOS_ENDPOINT", "")
    key = os.getenv("COSMOS_KEY", "")

    if not endpoint or not key:
        return None

    try:
        from gremlin_python.driver import client as gremlin_client
        from gremlin_python.driver.protocol import GremlinServerError

        host = endpoint.replace("https://", "").replace(":443/", "")
        return gremlin_client.Client(
            f"wss://{host}:443/",
            "g",
            username=f"/dbs/{os.getenv('COSMOS_DB', 'guardianflow-graph')}/colls/{os.getenv('COSMOS_GRAPH', 'fraud-graph')}",
            password=key,
        )
    except Exception as exc:
        logger.warning(f"Gremlin client init failed: {exc}")
        return None


# ── Synthetic demo graph (when Cosmos not configured) ─────────────────────────

def _synthetic_graph(entity_id: str) -> GraphResponse:
    """Return a realistic synthetic graph for demo/dev mode."""
    import random
    rng = random.Random(hash(entity_id) % (2**32))

    nodes = [
        GraphNode(id=entity_id, label="ip", value=entity_id, fraud_score=rng.uniform(0.4, 0.9)),
        GraphNode(id=f"dev_{rng.randint(1000,9999)}", label="device", value=f"Chrome/Win10-{rng.randint(10,99)}", fraud_score=rng.uniform(0.1, 0.6)),
        GraphNode(id=f"dev_{rng.randint(1000,9999)}", label="device", value=f"Safari/iOS-{rng.randint(10,17)}", fraud_score=rng.uniform(0.6, 0.95)),
        GraphNode(id=f"user_{rng.randint(100,999)}", label="user", value=f"user_{rng.randint(100,999)}", fraud_score=rng.uniform(0.3, 0.8)),
        GraphNode(id=f"user_{rng.randint(100,999)}", label="user", value=f"user_{rng.randint(100,999)}", fraud_score=rng.uniform(0.7, 0.99)),
    ]

    edges = [
        GraphEdge(source=nodes[0].id, target=nodes[1].id, weight=rng.randint(2, 12), last_seen="2024-04-27T08:30:00Z"),
        GraphEdge(source=nodes[0].id, target=nodes[2].id, weight=rng.randint(5, 20), last_seen="2024-04-28T02:15:00Z"),
        GraphEdge(source=nodes[1].id, target=nodes[3].id, weight=rng.randint(1, 8), last_seen="2024-04-27T14:00:00Z"),
        GraphEdge(source=nodes[2].id, target=nodes[4].id, weight=rng.randint(3, 15), last_seen="2024-04-28T03:45:00Z"),
    ]

    cluster_size = len(nodes)
    fraud_cluster = any(n.fraud_score > 0.7 for n in nodes)

    return GraphResponse(
        entity_id=entity_id,
        nodes=nodes,
        edges=edges,
        fraud_cluster=fraud_cluster,
        cluster_size=cluster_size,
    )


# ── Main service function ─────────────────────────────────────────────────────

async def get_entity_graph(entity_id: str, depth: int = 2) -> GraphResponse:
    """
    Query Cosmos DB Gremlin for the fraud link graph of an entity.
    Falls back to synthetic data if Cosmos is not configured.
    """
    gremlin = _get_gremlin_client()

    if gremlin is None:
        logger.info(f"Graph: using synthetic data for entity {entity_id}")
        return _synthetic_graph(entity_id)

    try:
        query = (
            f"g.V().has('value', '{entity_id}')"
            f".repeat(both().simplePath()).times({depth}).dedup()"
            f".path().by(valueMap(true))"
        )
        result = gremlin.submit(query).all().result()

        nodes: dict[str, GraphNode] = {}
        edges: list[GraphEdge] = []
        high_fraud_count = 0

        for path in result:
            objects = path.get("objects", [])
            for i, obj in enumerate(objects):
                vid = str(obj.get("id", ""))
                label = obj.get("label", "unknown")
                value = str(obj.get("value", [vid])[0] if isinstance(obj.get("value"), list) else obj.get("value", vid))
                fraud_score = float(obj.get("fraud_score", [0])[0] if isinstance(obj.get("fraud_score"), list) else obj.get("fraud_score", 0))

                if vid not in nodes:
                    nodes[vid] = GraphNode(id=vid, label=label, value=value, fraud_score=fraud_score)
                    if fraud_score > 0.7:
                        high_fraud_count += 1

                if i > 0:
                    src = str(objects[i-1].get("id", ""))
                    edges.append(GraphEdge(source=src, target=vid, weight=1, last_seen=None))

        fraud_cluster = high_fraud_count >= 2
        return GraphResponse(
            entity_id=entity_id,
            nodes=list(nodes.values()),
            edges=edges,
            fraud_cluster=fraud_cluster,
            cluster_size=len(nodes),
        )

    except Exception as exc:
        logger.error(f"Gremlin query failed: {exc}")
        return _synthetic_graph(entity_id)
