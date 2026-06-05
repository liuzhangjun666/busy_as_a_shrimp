import asyncio
import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import BackgroundTasks, FastAPI
from pydantic import BaseModel, Field

from app.config import settings
from app.scheduler import setup_jobs
from app.scanner.campus_scanner import start_campus_task

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("ai-engine")


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_jobs()

    try:
        from app.mq_consumer import start_consumer

        asyncio.create_task(start_consumer())
        logger.info("[Startup] RabbitMQ consumer started")
    except Exception as exc:
        logger.warning("[Startup] RabbitMQ consumer start failed: %s", exc)

    try:
        from app.openclaw_skill import openclaw_skill

        is_ok = await openclaw_skill.health_check()
        if is_ok:
            logger.info("[Startup] OpenClaw is healthy: %s", settings.openclaw_base_url)
        else:
            logger.warning("[Startup] OpenClaw is unavailable, fallback paths will be used")
    except Exception as exc:
        logger.warning("[Startup] OpenClaw health check failed: %s", exc)

    logger.info("[Startup] AI Engine initialization completed")
    yield


app = FastAPI(title="Lobster AI Engine", version="0.2.0", lifespan=lifespan)


class CampusScanRequest(BaseModel):
    userId: str | None = Field(default=None, description="Trigger user ID")
    city: str | None = Field(default=None, description="Target city")
    keyword: str | None = Field(default=None, description="Search keyword")
    limit: int = Field(default=10, ge=1, le=100, description="Maximum records to fetch")
    scanType: str = Field(default="city", description="Scan type")


@app.get("/health")
def health() -> dict:
    return {"success": True, "service": settings.app_name, "status": "up", "version": "0.2.0"}


@app.get("/tasks/status")
def task_status() -> dict:
    return {
        "success": True,
        "version": "0.2.0",
        "capabilities": [
            "heartbeat(5m)",
            "collect_demands(6h)",
            "run_matching(5m)",
            "mq_consumer(rabbitmq)",
            "openclaw_browser(auto)",
            "campus_scan(api)",
        ],
        "integrations": {
            "deerflow": settings.deerflow_base_url,
            "openclaw": settings.openclaw_base_url,
            "rabbitmq": f"{settings.rabbitmq_host}:{settings.rabbitmq_port}",
            "nestjs": settings.nestjs_base_url,
        },
    }


@app.post("/scan/campus")
async def scan_campus(payload: CampusScanRequest, background_tasks: BackgroundTasks) -> dict:
    background_tasks.add_task(start_campus_task, payload.model_dump())
    return {"status": "task_received", "code": 200, "success": True}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8088, reload=settings.env == "development")
