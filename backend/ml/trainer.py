"""
GuardianFlow AI — ML Training Pipeline
XGBoost Classifier + Isolation Forest for fraud detection
Generates 10,000 synthetic training rows on startup if DB is empty
SHAP explanations included per transaction
"""
import os
import uuid
import logging
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

import xgboost as xgb
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

logger = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).parent / "artifacts"
MODEL_DIR.mkdir(exist_ok=True)

XGB_PATH = MODEL_DIR / "xgb_model.joblib"
ISO_PATH = MODEL_DIR / "iso_forest.joblib"
SCALER_PATH = MODEL_DIR / "scaler.joblib"

FEATURE_COLS = [
    "velocity_10min",
    "geo_distance_km",
    "device_trust_score",
    "amount_zscore",
    "hour_of_day",
    "day_of_week",
    "is_new_device",
    "typing_speed_wpm",
    "amount_log",
]


def generate_synthetic_data(n: int = 10_000) -> pd.DataFrame:
    """Generate synthetic transaction feature rows for training."""
    rng = np.random.default_rng(42)
    n_fraud = int(n * 0.08)  # 8% fraud rate
    n_legit = n - n_fraud

    def make_rows(count, fraud=False):
        if fraud:
            velocity = rng.integers(5, 30, count)
            geo = rng.uniform(200, 5000, count)
            trust = rng.integers(0, 40, count)
            amt_z = rng.uniform(2, 8, count)
            hour = rng.choice([0, 1, 2, 3, 22, 23], count)
            typing = rng.integers(0, 30, count)
            is_new = rng.integers(1, 2, count)
        else:
            velocity = rng.integers(1, 6, count)
            geo = rng.uniform(0, 50, count)
            trust = rng.integers(60, 100, count)
            amt_z = rng.uniform(-1, 1.5, count)
            hour = rng.integers(8, 22, count)
            typing = rng.integers(40, 120, count)
            is_new = rng.integers(0, 2, count)

        amount_log = rng.uniform(10, 18, count)
        dow = rng.integers(0, 7, count)
        labels = np.ones(count, dtype=int) if fraud else np.zeros(count, dtype=int)

        return pd.DataFrame({
            "velocity_10min": velocity,
            "geo_distance_km": geo,
            "device_trust_score": trust,
            "amount_zscore": amt_z,
            "hour_of_day": hour,
            "day_of_week": dow,
            "is_new_device": is_new,
            "typing_speed_wpm": typing,
            "amount_log": amount_log,
            "label": labels,
        })

    df = pd.concat([make_rows(n_legit, False), make_rows(n_fraud, True)], ignore_index=True)
    return df.sample(frac=1, random_state=42).reset_index(drop=True)


def train_models(df: pd.DataFrame | None = None) -> dict:
    """Train XGBoost + IsolationForest and save artifacts."""
    if df is None:
        logger.info("Generating 10,000 synthetic training rows…")
        df = generate_synthetic_data(10_000)

    X = df[FEATURE_COLS].values
    y = df["label"].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    # XGBoost
    xgb_model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        scale_pos_weight=len(y[y == 0]) / max(len(y[y == 1]), 1),
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )
    xgb_model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    preds = xgb_model.predict(X_test)
    report = classification_report(y_test, preds, output_dict=True)
    logger.info(f"XGBoost — precision={report['1']['precision']:.3f} recall={report['1']['recall']:.3f}")

    # Isolation Forest (unsupervised anomaly)
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.08,
        random_state=42,
        n_jobs=-1,
    )
    iso_forest.fit(X_scaled[y == 0])  # Train only on legit

    # Save
    joblib.dump(xgb_model, XGB_PATH)
    joblib.dump(iso_forest, ISO_PATH)
    joblib.dump(scaler, SCALER_PATH)
    logger.info(f"Models saved to {MODEL_DIR}")

    return {
        "xgb_precision": report["1"]["precision"],
        "xgb_recall": report["1"]["recall"],
        "n_samples": len(df),
        "version": "1.0.0",
        "trained_at": datetime.utcnow().isoformat(),
    }


def load_models():
    """Load trained models or train them if not found."""
    if not XGB_PATH.exists() or not ISO_PATH.exists() or not SCALER_PATH.exists():
        logger.info("Model artifacts not found — training now…")
        train_models()

    xgb_model = joblib.load(XGB_PATH)
    iso_forest = joblib.load(ISO_PATH)
    scaler = joblib.load(SCALER_PATH)
    return xgb_model, iso_forest, scaler


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    stats = train_models()
    print(f"Training complete: {stats}")
