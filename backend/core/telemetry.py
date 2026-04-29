"""
GuardianFlow AI — Azure Monitor / OpenTelemetry Telemetry Module
Provides custom spans, metrics, and event tracking for Application Insights
"""
import time
import logging
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

logger = logging.getLogger(__name__)
tracer = trace.get_tracer("guardianflow.scorer", "1.0.0")


def record_scoring_event(
    score: int,
    level: str,
    amount: float,
    merchant_id: str,
    latency_ms: float,
    user_id: str = "",
    transaction_id: str = "",
) -> None:
    """Record custom attributes on current OTel span → forwarded to App Insights."""
    try:
        span = trace.get_current_span()
        if not span.is_recording():
            return

        span.set_attribute("risk.score", score)
        span.set_attribute("risk.level", level)
        span.set_attribute("tx.amount", float(amount))
        span.set_attribute("tx.merchant_id", merchant_id)
        span.set_attribute("tx.user_id", user_id)
        span.set_attribute("tx.id", transaction_id)
        span.set_attribute("model.latency_ms", round(latency_ms, 2))

        if score > 70:
            span.set_attribute("fraud.event", "fraud_blocked")
            span.set_attribute("fraud.action", "block")
        elif score >= 30:
            span.set_attribute("fraud.event", "fraud_stepup")
            span.set_attribute("fraud.action", "mfa_required")
        else:
            span.set_attribute("fraud.event", "fraud_approved")
            span.set_attribute("fraud.action", "approve")

        span.set_status(Status(StatusCode.OK))

    except Exception as exc:
        logger.warning(f"Telemetry record_scoring_event failed: {exc}")


def record_graph_cluster(entity_id: str, cluster_size: int, fraud_cluster: bool) -> None:
    """Track when a fraud cluster/syndicate is detected via graph analysis."""
    try:
        span = trace.get_current_span()
        if not span.is_recording():
            return
        span.set_attribute("graph.entity_id", entity_id)
        span.set_attribute("graph.cluster_size", cluster_size)
        span.set_attribute("graph.fraud_cluster", fraud_cluster)
        if fraud_cluster:
            span.set_attribute("fraud.event", "graph_cluster_found")
    except Exception as exc:
        logger.warning(f"Telemetry record_graph_cluster failed: {exc}")


def record_model_inference(model_name: str, latency_ms: float, version: str = "1.0") -> None:
    """Track ML model inference latency per model."""
    try:
        span = trace.get_current_span()
        if not span.is_recording():
            return
        span.set_attribute("ml.model_name", model_name)
        span.set_attribute("ml.latency_ms", round(latency_ms, 2))
        span.set_attribute("ml.version", version)
        span.set_attribute("fraud.event", "model_inference_ms")
    except Exception as exc:
        logger.warning(f"Telemetry record_model_inference failed: {exc}")


class Timer:
    """Context manager for measuring latency."""
    def __init__(self):
        self.elapsed_ms: float = 0.0

    def __enter__(self):
        self._start = time.perf_counter()
        return self

    def __exit__(self, *args):
        self.elapsed_ms = (time.perf_counter() - self._start) * 1000
