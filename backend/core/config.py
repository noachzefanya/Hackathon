"""
GuardianFlow AI — Application Configuration
Loads settings from environment variables / Azure Key Vault
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator
from typing import List, Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "GuardianFlow AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    # Azure Core
    AZURE_SUBSCRIPTION_ID: str = ""
    AZURE_RESOURCE_GROUP: str = "guardianflow-rg"
    AZURE_REGION: str = "southeastasia"
    AZURE_TENANT_ID: str = ""
    AZURE_CLIENT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""
    AZURE_KEYVAULT_URL: str = ""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/guardianflow"
    DATABASE_URL_SYNC: str = "postgresql://postgres:password@localhost:5432/guardianflow"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Cosmos DB
    COSMOS_ENDPOINT: str = ""
    COSMOS_KEY: str = ""
    COSMOS_DB: str = "guardianflow-graph"
    COSMOS_GRAPH: str = "fraud-graph"

    # Event Hubs
    AZURE_EVENTHUB_CONN_STR: str = ""
    AZURE_EVENTHUB_NAME: str = "transactions"

    # Azure ML
    AZURE_ML_WORKSPACE: str = "guardianflow-ml"
    AZURE_ACR_LOGIN_SERVER: str = "guardianflowacr.azurecr.io"

    # Monitoring
    APPLICATIONINSIGHTS_CONNECTION_STRING: str = ""
    APPINSIGHTS_INSTRUMENTATIONKEY: str = ""

    # Auth
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,https://guardianflow.azurestaticapps.net"

    # Risk Thresholds
    RISK_THRESHOLD_LOW: int = 30
    RISK_THRESHOLD_HIGH: int = 70

    # Webhook
    WEBHOOK_TIMEOUT_SECONDS: int = 5
    RATE_LIMIT_PER_MINUTE: int = 100

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
