"""
GuardianFlow AI — Webhook Service
Async HTTP POST to client callback URLs when fraud is detected
"""
import logging
import httpx

from backend.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


async def dispatch_webhook(url: str, payload: dict, retries: int = 3) -> bool:
    """
    Fire an async webhook POST to the client callback URL.
    Retries up to 3 times on failure.
    Returns True if successful.
    """
    for attempt in range(1, retries + 1):
        try:
            async with httpx.AsyncClient(timeout=settings.WEBHOOK_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={
                        "Content-Type": "application/json",
                        "X-GuardianFlow-Event": "fraud.detected",
                        "X-GuardianFlow-Version": "1.0",
                    },
                )
                if response.status_code < 400:
                    logger.info(f"Webhook delivered to {url} (attempt {attempt})")
                    return True
                else:
                    logger.warning(f"Webhook {url} returned {response.status_code} (attempt {attempt})")
        except Exception as exc:
            logger.warning(f"Webhook attempt {attempt} failed for {url}: {exc}")

    logger.error(f"Webhook FAILED after {retries} attempts: {url}")
    return False
