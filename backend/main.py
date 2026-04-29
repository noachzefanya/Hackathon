"""
GuardianFlow AI — FastAPI Application Entry Point
Azure-native fraud detection middleware with OpenTelemetry monitoring
"""
import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

# ── Azure Monitor (MUST be first, before any other imports that create spans) ─
_appinsights_conn = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING", "")
if _appinsights_conn:
    try:
        from azure.monitor.opentelemetry import configure_azure_monitor
        configure_azure_monitor(connection_string=_appinsights_conn)
        logging.getLogger(__name__).info("Azure Monitor OpenTelemetry configured")
    except ImportError:
        logging.getLogger(__name__).warning("azure-monitor-opentelemetry not installed")

from backend.core.config import get_settings
from backend.core.database import create_tables
from backend.core.redis_client import get_redis, close_redis
from backend.routers import score, transactions, users, alerts, graph, websocket

settings = get_settings()
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown lifecycle."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # 1. Init DB tables (dev only; production uses Alembic)
    if settings.ENVIRONMENT != "production":
        try:
            await create_tables()
            logger.info("Database tables created/verified")
        except Exception as exc:
            logger.warning(f"DB table creation skipped: {exc}")

    # 2. Warm up Redis connection
    try:
        r = await get_redis()
        await r.ping()
        logger.info("Redis connection established")
    except Exception as exc:
        logger.warning(f"Redis not available: {exc}")

    # 3. Pre-load ML models (avoids cold-start latency on first request)
    try:
        from backend.ml.scorer import _load_if_needed
        _load_if_needed()
        logger.info("ML models pre-loaded")
    except Exception as exc:
        logger.warning(f"ML model pre-load skipped: {exc}")

    yield  # ── Application running ──

    # Cleanup
    await close_redis()
    logger.info("GuardianFlow AI shutdown complete")


# ── App factory ───────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "AI-powered real-time transaction fraud detection middleware. "
        "Scores transactions using XGBoost + Isolation Forest with SHAP explanations. "
        "Built on Azure — Container Apps, Cosmos DB, Redis, Application Insights."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error", "path": str(request.url)},
    )


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(score.router)
app.include_router(transactions.router)
app.include_router(users.router)
app.include_router(alerts.router)
app.include_router(graph.router)
app.include_router(websocket.router)


# ── Health & Info endpoints ───────────────────────────────────────────────────

@app.get("/health", tags=["System"], summary="Health check")
async def health():
    from backend.core.redis_client import get_redis
    db_status = "unknown"
    redis_status = "unknown"

    try:
        from backend.core.database import engine
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "unavailable"

    try:
        r = await get_redis()
        await r.ping()
        redis_status = "ok"
    except Exception:
        redis_status = "unavailable"

    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "db": db_status,
        "redis": redis_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/", tags=["System"], summary="API info")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "scoring": "/api/v1/score",
    }
