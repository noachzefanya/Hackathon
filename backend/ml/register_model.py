"""
GuardianFlow AI — Azure ML Model Registration
Registers trained model to Azure Machine Learning workspace
"""
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def register_model_to_azure_ml():
    """Register trained models to Azure ML Registry with version tags."""
    try:
        from azure.ai.ml import MLClient
        from azure.ai.ml.entities import Model
        from azure.identity import DefaultAzureCredential
        from azure.ai.ml.constants import AssetTypes

        subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID", "")
        resource_group = os.getenv("AZURE_RESOURCE_GROUP", "guardianflow-rg")
        workspace_name = os.getenv("AZURE_ML_WORKSPACE", "guardianflow-ml")

        if not subscription_id:
            logger.warning("AZURE_SUBSCRIPTION_ID not set — skipping Azure ML registration")
            return

        credential = DefaultAzureCredential()
        ml_client = MLClient(
            credential=credential,
            subscription_id=subscription_id,
            resource_group_name=resource_group,
            workspace_name=workspace_name,
        )

        model_dir = Path(__file__).parent / "artifacts"
        model = Model(
            path=str(model_dir),
            type=AssetTypes.CUSTOM_MODEL,
            name="guardianflow-fraud-detector",
            description="XGBoost + IsolationForest fraud detection ensemble",
            tags={
                "framework": "scikit-learn+xgboost",
                "shap": "true",
                "risk_threshold_low": str(os.getenv("RISK_THRESHOLD_LOW", "30")),
                "risk_threshold_high": str(os.getenv("RISK_THRESHOLD_HIGH", "70")),
                "environment": os.getenv("ENVIRONMENT", "production"),
            },
        )

        registered = ml_client.models.create_or_update(model)
        logger.info(f"Model registered: {registered.name} v{registered.version}")
        return registered

    except ImportError:
        logger.warning("azure-ai-ml not installed — skipping model registration")
    except Exception as exc:
        logger.error(f"Azure ML registration failed: {exc}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from backend.ml.trainer import train_models
    train_models()
    register_model_to_azure_ml()
