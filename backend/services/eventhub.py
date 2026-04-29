"""
GuardianFlow AI — Azure Event Hubs Producer
Publishes fraud events to Azure Event Hubs for streaming consumers
"""
import json
import logging
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

_producer = None


async def _get_producer():
    global _producer
    if _producer is not None:
        return _producer

    conn_str = os.getenv("AZURE_EVENTHUB_CONN_STR", "")
    hub_name = os.getenv("AZURE_EVENTHUB_NAME", "transactions")

    if not conn_str:
        logger.warning("AZURE_EVENTHUB_CONN_STR not set — Event Hubs disabled")
        return None

    try:
        from azure.eventhub.aio import EventHubProducerClient
        _producer = EventHubProducerClient.from_connection_string(
            conn_str=conn_str,
            eventhub_name=hub_name,
        )
        logger.info(f"Event Hubs producer connected to {hub_name}")
    except Exception as exc:
        logger.error(f"Event Hubs init failed: {exc}")
        return None

    return _producer


async def publish_event(event_type: str, data: dict) -> bool:
    """Publish a JSON event to Azure Event Hubs."""
    producer = await _get_producer()
    if producer is None:
        return False

    try:
        from azure.eventhub import EventData
        payload = json.dumps({
            "event_type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **data,
        })

        async with producer:
            batch = await producer.create_batch()
            batch.add(EventData(payload))
            await producer.send_batch(batch)

        logger.debug(f"Event published: {event_type}")
        return True

    except Exception as exc:
        logger.error(f"Event Hubs publish failed: {exc}")
        return False


async def close_eventhub():
    global _producer
    if _producer:
        await _producer.close()
        _producer = None
