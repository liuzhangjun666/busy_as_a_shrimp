from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAIN_FILE = ROOT / "app" / "main.py"


class ApiContractTests(unittest.TestCase):
    def test_health_and_scan_routes_exist(self) -> None:
        source = MAIN_FILE.read_text(encoding="utf-8")
        self.assertIn('@app.get("/health")', source)
        self.assertIn('@app.post("/scan/campus")', source)

    def test_scan_campus_response_contract(self) -> None:
        source = MAIN_FILE.read_text(encoding="utf-8")
        self.assertIn('"status": "task_received"', source)
        self.assertIn('"code": 200', source)
        self.assertIn('"success": True', source)


if __name__ == "__main__":
    unittest.main()
