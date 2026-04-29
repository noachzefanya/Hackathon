"""
GuardianFlow AI — ML Scoring Engine
Real-time risk scoring with XGBoost + Isolation Forest + SHAP explanations
"""
import math
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

import numpy as np
import shap

from backend.ml.trainer import load_models, FEATURE_COLS
from backend.models.schemas import XAIReason

logger = logging.getLogger(__name__)

# Module-level model cache
_xgb_model = None
_iso_forest = None
_scaler = None
_explainer = None


def _load_if_needed():
    global _xgb_model, _iso_forest, _scaler, _explainer
    if _xgb_model is None:
        _xgb_model, _iso_forest, _scaler = load_models()
        _explainer = shap.TreeExplainer(_xgb_model)
        logger.info("ML models loaded into memory")


def _build_feature_vector(
    velocity_10min: int,
    geo_distance_km: float,
    device_trust_score: int,
    amount: float,
    amount_mean: float = 1_000_000,
    amount_std: float = 2_000_000,
    hour_of_day: int = 12,
    day_of_week: int = 1,
    is_new_device: int = 0,
    typing_speed_wpm: int = 60,
) -> np.ndarray:
    amount_zscore = (amount - amount_mean) / max(amount_std, 1)
    amount_log = math.log(max(amount, 1))

    return np.array([[
        velocity_10min,
        geo_distance_km,
        device_trust_score,
        amount_zscore,
        hour_of_day,
        day_of_week,
        is_new_device,
        typing_speed_wpm,
        amount_log,
    ]], dtype=np.float64)


def _shap_to_reasons(shap_values: np.ndarray) -> list[XAIReason]:
    """Convert SHAP values to top-3 human-readable explanations."""
    FEATURE_LABELS = {
        "velocity_10min": "Frekuensi transaksi tinggi (10 menit)",
        "geo_distance_km": "Lokasi jauh dari biasanya",
        "device_trust_score": "Perangkat tidak terpercaya",
        "amount_zscore": "Jumlah transaksi tidak wajar",
        "hour_of_day": "Transaksi di jam mencurigakan",
        "day_of_week": "Hari transaksi tidak biasa",
        "is_new_device": "Perangkat baru digunakan",
        "typing_speed_wpm": "Pola ketikan tidak wajar",
        "amount_log": "Skala jumlah anomali",
    }

    pairs = [(FEATURE_COLS[i], float(shap_values[0][i])) for i in range(len(FEATURE_COLS))]
    pairs_sorted = sorted(pairs, key=lambda x: abs(x[1]), reverse=True)[:3]

    reasons = []
    for feat, impact in pairs_sorted:
        reasons.append(XAIReason(
            feature=feat,
            impact=round(abs(impact), 4),
            direction="increase_risk" if impact > 0 else "decrease_risk",
            description=FEATURE_LABELS.get(feat, feat),
        ))
    return reasons


def score_transaction(
    user_id: str,
    amount: float,
    merchant_id: str,
    device_id: str,
    ip_address: str,
    velocity_10min: int = 1,
    geo_distance_km: float = 0.0,
    device_trust_score: int = 80,
    hour_of_day: int = 12,
    day_of_week: int = 1,
    is_new_device: int = 0,
    typing_speed_wpm: int = 60,
    location_lat: Optional[float] = None,
    location_lng: Optional[float] = None,
) -> dict:
    """
    Score a transaction. Returns:
      risk_score (0-100), risk_level, action, reasons, latency_ms, trace_id
    """
    _load_if_needed()

    import time
    t0 = time.perf_counter()

    X = _build_feature_vector(
        velocity_10min=velocity_10min,
        geo_distance_km=geo_distance_km,
        device_trust_score=device_trust_score,
        amount=amount,
        hour_of_day=hour_of_day,
        day_of_week=day_of_week,
        is_new_device=is_new_device,
        typing_speed_wpm=typing_speed_wpm,
    )
    X_scaled = _scaler.transform(X)

    # XGBoost probability
    xgb_prob = float(_xgb_model.predict_proba(X_scaled)[0][1])

    # Isolation Forest anomaly score — convert to 0-1 range
    iso_score = float(-_iso_forest.score_samples(X_scaled)[0])  # higher = more anomalous
    iso_norm = min(max((iso_score - 0.1) / 0.5, 0), 1)

    # Blend: 70% XGBoost + 30% Isolation Forest
    combined = 0.70 * xgb_prob + 0.30 * iso_norm
    risk_score = int(round(combined * 100))

    # SHAP explanations
    shap_vals = _explainer.shap_values(X_scaled)
    reasons = _shap_to_reasons(shap_vals if isinstance(shap_vals, np.ndarray) else shap_vals[1])

    latency_ms = (time.perf_counter() - t0) * 1000
    trace_id = str(uuid.uuid4())[:8]

    # Risk classification
    from backend.core.config import get_settings
    settings = get_settings()
    if risk_score < settings.RISK_THRESHOLD_LOW:
        risk_level, action = "low", "approve"
    elif risk_score <= settings.RISK_THRESHOLD_HIGH:
        risk_level, action = "medium", "step_up"
    else:
        risk_level, action = "high", "block"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "action": action,
        "reasons": reasons,
        "latency_ms": round(latency_ms, 2),
        "trace_id": trace_id,
    }
