from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from app.config import Settings


class SettingsTests(unittest.TestCase):
    def test_defaults(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            settings = Settings()
        self.assertEqual(settings.env, "development")
        self.assertEqual(settings.openclaw_base_url, "http://localhost:18888")
        self.assertEqual(settings.deerflow_base_url, "http://localhost:2026")
        self.assertEqual(settings.nestjs_base_url, "http://localhost:8081")
        self.assertEqual(settings.rabbitmq_host, "localhost")
        self.assertEqual(settings.rabbitmq_port, 5672)
        self.assertEqual(settings.rabbitmq_user, "airp")
        self.assertEqual(settings.rabbitmq_pass, "airp")
        self.assertEqual(settings.heartbeat_minutes, 5)

    def test_env_overrides(self) -> None:
        overrides = {
            "NODE_ENV": "production",
            "OPENCLAW_BASE_URL": "http://127.0.0.1:18888",
            "DEERFLOW_BASE_URL": "http://127.0.0.1:2026",
            "NESTJS_BASE_URL": "http://127.0.0.1:8081",
            "RABBITMQ_HOST": "mq.internal",
            "RABBITMQ_PORT": "5673",
            "RABBITMQ_USER": "demo",
            "RABBITMQ_PASS": "secret",
            "AI_HEARTBEAT_MINUTES": "9",
        }
        with patch.dict(os.environ, overrides, clear=True):
            settings = Settings()
        self.assertEqual(settings.env, "production")
        self.assertEqual(settings.openclaw_base_url, "http://127.0.0.1:18888")
        self.assertEqual(settings.deerflow_base_url, "http://127.0.0.1:2026")
        self.assertEqual(settings.nestjs_base_url, "http://127.0.0.1:8081")
        self.assertEqual(settings.rabbitmq_host, "mq.internal")
        self.assertEqual(settings.rabbitmq_port, 5673)
        self.assertEqual(settings.rabbitmq_user, "demo")
        self.assertEqual(settings.rabbitmq_pass, "secret")
        self.assertEqual(settings.heartbeat_minutes, 9)

    def test_invalid_integer_falls_back_to_default(self) -> None:
        with patch.dict(
            os.environ,
            {"RABBITMQ_PORT": "oops", "AI_HEARTBEAT_MINUTES": "not-a-number"},
            clear=True,
        ):
            settings = Settings()
        self.assertEqual(settings.rabbitmq_port, 5672)
        self.assertEqual(settings.heartbeat_minutes, 5)


if __name__ == "__main__":
    unittest.main()
