from dataclasses import dataclass, field
import os


def _env(name: str, default: str) -> str:
    value = os.getenv(name)
    return value if value is not None else default


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


@dataclass
class Settings:
    app_name: str = "lobster-ai-engine"
    env: str = field(default_factory=lambda: _env("NODE_ENV", "development"))
    openclaw_base_url: str = field(
        default_factory=lambda: _env("OPENCLAW_BASE_URL", "http://localhost:18888")
    )
    deerflow_base_url: str = field(
        default_factory=lambda: _env("DEERFLOW_BASE_URL", "http://localhost:2026")
    )
    deerflow_api_key: str = field(default_factory=lambda: _env("DEERFLOW_API_KEY", ""))
    nestjs_base_url: str = field(
        default_factory=lambda: _env("NESTJS_BASE_URL", "http://localhost:8081")
    )
    deerflow_callback_secret: str = field(
        default_factory=lambda: _env("DEERFLOW_CALLBACK_SECRET", "")
    )
    rabbitmq_host: str = field(default_factory=lambda: _env("RABBITMQ_HOST", "localhost"))
    rabbitmq_port: int = field(default_factory=lambda: _env_int("RABBITMQ_PORT", 5672))
    rabbitmq_user: str = field(default_factory=lambda: _env("RABBITMQ_USER", "airp"))
    rabbitmq_pass: str = field(default_factory=lambda: _env("RABBITMQ_PASS", "airp"))
    heartbeat_minutes: int = field(default_factory=lambda: _env_int("AI_HEARTBEAT_MINUTES", 5))

settings = Settings()
