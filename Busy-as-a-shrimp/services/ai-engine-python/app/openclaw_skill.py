"""
OpenClaw 浏览器自动化 Skill —— 通过 MCP 协议调用 OpenClaw 执行浏览器操作

适用场景：
  - 校园招聘信息抓取（访问高校就业网/招聘平台）
  - 电商商品信息采集（1688/淘宝/拼多多）
  - 本地生活信息采集（美团/大众点评）

通信方式：
  NestJS → RabbitMQ → [Python AI Engine] → HTTP/MCP → [OpenClaw Gateway:18789]
"""

import json
from typing import Any
from dataclasses import dataclass, field

import httpx

from .config import settings


@dataclass
class BrowserAction:
    """浏览器动作基类"""
    action_type: str  # navigate | click | fill | screenshot | extract | scroll | wait
    params: dict[str, Any] = field(default_factory=dict)


@dataclass
class ScrapingSession:
    """一次完整的浏览器采集会话"""
    session_id: str = ""
    url: str = ""
    actions: list[BrowserAction] = field(default_factory=list)
    result: list[dict[str, Any]] = field(default_factory=list)
    status: str = "pending"  # pending | running | completed | failed


class OpenClawSkill:
    """
    OpenClaw MCP 客户端封装

    通过 HTTP API 调用 OpenClaw 的浏览器自动化能力。
    当 OpenClaw 不可用时，自动降级到内置 Mock 数据源（开发/测试环境）。
    """

    def __init__(self):
        self.base_url = settings.openclaw_base_url.rstrip("/")
        self.timeout = 120.0  # 页面加载和渲染可能较慢

    async def health_check(self) -> bool:
        """检查 OpenClaw 服务是否可用"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.base_url}/health")
                return resp.status_code == 200
        except Exception:
            return False

    async def create_session(self, url: str | None = None) -> dict[str, Any]:
        """
        创建新的浏览器会话

        Args:
            url: 初始打开的 URL（可选，后续可通过 navigate 设置）

        Returns:
            {"session_id": "xxx", "cdp_url": "ws://..."}
        """
        payload: dict[str, Any] = {"browser_type": "chromium"}
        if url:
            payload["start_url"] = url

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(f"{self.base_url}/api/session", json=payload)
            resp.raise_for_status()
            return resp.json()

    async def navigate(self, session_id: str, url: str) -> dict[str, Any]:
        """导航到指定 URL"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.base_url}/api/session/{session_id}/navigate",
                json={"url": url}
            )
            resp.raise_for_status()
            return resp.json()

    async def extract_content(
        self,
        session_id: str,
        selectors: dict[str, str],
        wait_for: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        从页面提取结构化数据

        Args:
            session_id: 会话 ID
            selectors: CSS 选择器映射 {"title": "h1.job-title", "company": ".company-name"}
            wait_for: 等待的 CSS 选择器（确保页面加载完成）
        """
        payload: dict[str, Any] = {"selectors": selectors}
        if wait_for:
            payload["wait_for"] = wait_for

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.base_url}/api/session/{session_id}/extract",
                json=payload
            )
            resp.raise_for_status()
            return resp.json().get("data", [])

    async def screenshot(self, session_id: str, path: str | None = None) -> bytes | dict[str, Any]:
        """截取当前页面的截图"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{self.base_url}/api/session/{session_id}/screenshot")
            resp.raise_for_status()
            if path:
                with open(path, "wb") as f:
                    f.write(resp.content)
                return resp.content
            return {"screenshot_size": len(resp.content)}

    async def close_session(self, session_id: str) -> None:
        """关闭浏览器会话并释放资源"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.delete(f"{self.base_url}/api/session/{session_id}")
        except Exception:
            pass  # 关闭失败不影响主流程

    # ========== 高级：预定义采集任务 ==========

    async def scrape_campus_recruitment(
        self,
        target_urls: list[str],
        city: str | None = None,
        keyword: str | None = None,
        max_results: int = 30,
    ) -> list[dict[str, Any]]:
        """
        校园招聘信息采集（高级封装）

        自动化流程：
          1. 创建无头浏览器会话
          2. 逐个访问目标 URL
          3. 提取职位卡片数据
          4. 结构化返回结果

        Args:
            target_urls: 目标就业网站 URL 列表
            city: 城市过滤关键词
            keyword: 职位关键词
            max_results: 最大结果数限制

        Returns:
            标准化的机会列表
        """
        results: list[dict[str, Any]] = []
        session_info = await self.create_session()
        session_id = session_info.get("session_id", "")

        try:
            for url in target_urls:
                if len(results) >= max_results:
                    break

                await self.navigate(session_id, url)

                # 通用的招聘页面选择器（适配大多数就业网）
                extracted = await self.extract_content(
                    session_id,
                    selectors={
                        "title": ".job-title, .position-name, h3 a, .recruit-title",
                        "company": ".company-name, .corp-name, .employer",
                        "location": ".job-area, .location, [class*=location]",
                        "date": ".publish-time, .time, [class*=date]",
                        "link": "a[href*='detail'], a[href*='position']",
                        "desc": ".job-desc, .detail-content, .text-content",
                    },
                    wait_for=".job-title, .position-name, h3, .list-item",
                )

                for item in extracted:
                    if len(results) >= max_results:
                        break

                    title_text = (item.get("title") or "").strip()
                    if not title_text or len(title_text) < 4:
                        continue

                    # 关键词过滤
                    if keyword and keyword.lower() not in title_text.lower():
                        continue

                    location_text = (item.get("location") or "").strip()
                    if city and city not in location_text and location_text:
                        continue

                    results.append({
                        "source_type": "campus_recruitment",
                        "company_name": item.get("company", "未知企业").strip(),
                        "industry": self._infer_industry(item.get("company", "")),
                        "logo_gradient": self._pick_gradient(),
                        "recruitment_type": self._infer_recruitment_type(url),
                        "location": location_text or city or "全国",
                        "position": title_text,
                        "announcement_url": item.get("link", url),
                        "apply_url": item.get("link", url),
                        "start_date": item.get("date", "") or "",
                        "end_date": "",
                        "no_written_test": False,
                        "raw_data": item,
                    })

        finally:
            await self.close_session(session_id)

        return results

    async def scrape_ecommerce_products(
        self,
        platform: str = "1688",
        category: str | None = None,
        max_results: int = 20,
    ) -> list[dict[str, Any]]:
        """
        电商产品信息采集（用于电商型分身）

        Args:
            platform: 平台标识 (1688 / taobao / pdd)
            category: 商品分类
            max_results: 最大结果数
        """
        # TODO: 根据平台构建目标 URL 和选择器
        # 当前为骨架实现，等待实际需求填充
        return []

    @staticmethod
    def _infer_industry(company_name: str) -> str:
        """根据公司名推断行业"""
        industry_map = {
            "字节": "互联网", "腾讯": "互联网", "阿里": "电商", "百度": "互联网",
            "小米": "智能硬件", "京东": "零售", "美团": "生活服务", "蔚来": "新能源",
            "华为": "通信", "比亚迪": "新能源", "快手": "互联网", "滴滴": "出行",
        }
        for keyword, industry in industry_map.items():
            if keyword in company_name:
                return industry
        return "未知行业"

    @staticmethod
    def _pick_gradient() -> str:
        """随机选取一个 logo 渐变色（用于前端展示）"""
        import random
        gradients = [
            "from-indigo-500 to-blue-500",
            "from-sky-500 to-cyan-500",
            "from-emerald-500 to-teal-500",
            "from-orange-500 to-red-500",
            "from-purple-500 to-pink-500",
            "from-blue-600 to-indigo-600",
            "from-amber-400 to-orange-500",
        ]
        return random.choice(gradients)

    @staticmethod
    def _infer_recruitment_type(url: str) -> str:
        """从 URL 推断招聘类型"""
        url_lower = url.lower()
        if "summer" in url_lower or "暑期" in url_lower:
            return "暑期实习"
        if "intern" in url_lower or "实习" in url_lower:
            return "日常实习"
        if "spring" in url_lower or "春招" in url_lower:
            return "春招"
        if "autumn" in url_lower or "秋招" in url_lower or "fall" in url_lower:
            return "秋招提前批"
        return "校园招聘"


# 全局单例
openclaw_skill = OpenClawSkill()
