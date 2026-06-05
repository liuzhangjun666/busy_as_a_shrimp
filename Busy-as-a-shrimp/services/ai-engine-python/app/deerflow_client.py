import httpx
import hmac
import hashlib
import time
import json
from .config import settings

class DeerFlowClient:
    """DeerFlow Gateway API 客户端"""
    def __init__(self):
        self.base_url = settings.deerflow_base_url
        self.api_key = settings.deerflow_api_key

    async def trigger_scan(
        self,
        user_id: str,
        personality: str,
        city: str | None = None,
        thread_id: str | None = None,
    ) -> dict:
        """触发 DeerFlow 执行龙虾每日扫描"""
        payload = {
            "messages": [{
                "role": "user",
                "content": f"执行龙虾每日扫描，用户ID: {user_id}, 性格: {personality}, 城市: {city or '未知'}",
            }],
            "skill": "lobster-daily-scan",
            "thread_id": thread_id or f"lobster-{user_id}-{int(time.time())}",
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/api/chat",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=60.0,
            )
            return resp.json()

    async def resume_run(
        self,
        thread_id: str,
        run_id: str,
        approved: bool,
        feedback: str | None = None,
    ) -> dict:
        """恢复中断的 DeerFlow 执行"""
        payload = {
            "command": "resume",
            "input": {"approved": approved, "feedback": feedback},
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/api/threads/{thread_id}/runs/{run_id}/resume",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30.0,
            )
            return resp.json()

def sign_callback(body: dict) -> dict:
    """为 NestJS 回调请求生成 HMAC 签名头"""
    timestamp = str(int(time.time()))
    raw = json.dumps(body, ensure_ascii=False)
    signature = hmac.new(
        settings.deerflow_callback_secret.encode(),
        f"{timestamp}.{raw}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return {
        "X-DeerFlow-Signature": signature,
        "X-DeerFlow-Timestamp": timestamp,
    }

deerflow_client = DeerFlowClient()
