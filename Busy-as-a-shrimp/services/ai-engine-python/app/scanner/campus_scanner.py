import asyncio
import hashlib
import json
import os
import random
import re
import time
from datetime import date, datetime, timedelta
from typing import Any
from urllib.parse import urlparse, urljoin

import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from app.models import Opportunity

# Dependency note:
# - `httpx` is already in this project dependencies.
# - Ensure BeautifulSoup is installed before running:
#   pip install beautifulsoup4
# - If your environment does not have httpx, run:
#   pip install httpx beautifulsoup4

load_dotenv(os.path.join(os.path.dirname(__file__), "../../../../.env"))

_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
]

_FALLBACK_GRADIENTS = [
    "from-slate-500 to-zinc-500",
    "from-blue-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-cyan-500 to-sky-500",
    "from-violet-500 to-fuchsia-500",
    "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-500",
    "from-lime-500 to-emerald-500",
]

_KNOWN_COMPANY_GRADIENTS = {
    "阿里": "from-orange-500 to-amber-400",
    "腾讯": "from-blue-500 to-cyan-500",
    "字节": "from-indigo-500 to-violet-500",
}

_CITY_TOKENS = [
    "北京",
    "上海",
    "深圳",
    "广州",
    "杭州",
    "武汉",
    "南京",
    "成都",
    "西安",
    "苏州",
]

_INDUSTRY_MAP = {
    "阿里": "电商",
    "腾讯": "互联网",
    "字节": "互联网",
    "百度": "互联网",
    "京东": "零售",
    "美团": "生活服务",
    "网易": "互联网",
    "华为": "通信",
    "小米": "智能硬件",
    "蔚来": "新能源",
    "理想": "新能源",
}

_POSITION_HINTS = [
    "后端开发工程师",
    "前端开发工程师",
    "算法工程师",
    "测试开发工程师",
    "数据分析师",
    "产品经理",
    "运营",
    "实习生",
]

_COMPANY_PATTERN = re.compile(
    r"(字节跳动|腾讯|阿里巴巴|阿里|百度|京东|美团|网易|华为|小米|蔚来|理想汽车|理想|快手|滴滴|拼多多|小红书|哔哩哔哩)"
)


def _build_ai_engine_mysql_url() -> str:
    explicit_url = os.getenv("AI_ENGINE_DATABASE_URL")
    if explicit_url:
        if explicit_url.startswith("mysql://"):
            return explicit_url.replace("mysql://", "mysql+pymysql://")
        return explicit_url

    host = os.getenv("MYSQL_HOST", "localhost")
    # Keep compatibility with legacy AI_ENGINE_MYSQL_PORT, but default to the
    # same MYSQL_PORT used by the main app to avoid writing into a different DB.
    port = (
        os.getenv("AI_ENGINE_MYSQL_PORT")
        or os.getenv("MYSQL_PORT")
        or "3306"
    )
    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "123456")
    database = os.getenv("MYSQL_DATABASE", "busy_as_a_shrimp")
    return f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"


def get_company_logo_gradient(company_name: str) -> str:
    normalized = (company_name or "").strip()
    for keyword, gradient in _KNOWN_COMPANY_GRADIENTS.items():
        if keyword in normalized:
            return gradient

    if not normalized:
        return "from-slate-500 to-zinc-500"

    digest = hashlib.md5(normalized.encode("utf-8")).hexdigest()
    index = int(digest, 16) % len(_FALLBACK_GRADIENTS)
    return _FALLBACK_GRADIENTS[index]


def _infer_industry(company_name: str) -> str:
    for keyword, industry in _INDUSTRY_MAP.items():
        if keyword in company_name:
            return industry
    return "互联网"


def _infer_company_name(title: str, snippet: str, link: str) -> str:
    merged = f"{title} {snippet}"
    matched = _COMPANY_PATTERN.search(merged)
    if matched:
        return matched.group(1)

    for token in re.split(r"[-|｜_·•:：]", title):
        cleaned = token.strip()
        if 1 < len(cleaned) <= 16 and not any(keyword in cleaned for keyword in _POSITION_HINTS):
            return cleaned

    hostname = urlparse(link).hostname or ""
    domain = hostname.replace("www.", "").split(".")[0].strip()
    return domain or "未知公司"


def _infer_position(title: str, snippet: str, keyword: str | None) -> str:
    merged = f"{title} {snippet}"
    for token in re.split(r"[-|｜_·•:：]", title):
        cleaned = token.strip()
        if any(hint in cleaned for hint in _POSITION_HINTS):
            return cleaned[:120]

    for hint in _POSITION_HINTS:
        if hint in merged:
            return hint

    if keyword and keyword.strip():
        return f"{keyword.strip()}相关岗位"
    return "校招岗位"


def _infer_location(snippet: str, city: str | None) -> str:
    if city and city.strip() and not _is_garbled_location(city):
        return city.strip()
    for token in _CITY_TOKENS:
        if token in snippet:
            return token
    return "全国"


def _is_garbled_location(value: str | None) -> bool:
    if value is None:
        return True

    text = value.strip()
    if not text:
        return True

    lowered = text.lower()
    if lowered in {"none", "null", "undefined", "n/a"}:
        return True

    # 常见脏值：'??' / '？？' / 单个问号 / 全是 replacement 字符
    if all(char in {"?", "？", "�", "-", "—", "_", "*", " "} for char in text):
        return True

    return False


def _normalize_location_value(
    location: str | None, fallback_city: str | None, snippet: str = ""
) -> str:
    if not _is_garbled_location(location):
        return str(location).strip()

    if fallback_city and fallback_city.strip() and not _is_garbled_location(fallback_city):
        return fallback_city.strip()

    inferred = _infer_location(snippet, fallback_city)
    if not _is_garbled_location(inferred):
        return inferred

    return "全国"


def _infer_recruitment_type(text: str) -> str:
    normalized = text.lower()
    if "秋招" in text:
        return "秋招提前批"
    if "春招" in text:
        return "春招"
    if "暑期" in text:
        return "暑期实习"
    if "实习" in text or "intern" in normalized:
        return "日常实习"
    return "校园招聘"


def _infer_no_written_test(text: str) -> bool:
    return "免笔试" in text or "无需笔试" in text


class CampusWebScraper:
    def __init__(self, city: str | None, keyword: str | None, scan_type: str, limit: int):
        self.city = city.strip() if isinstance(city, str) else None
        self.keyword = keyword.strip() if isinstance(keyword, str) else None
        self.scan_type = (scan_type or "city").strip().lower()
        self.limit = max(1, min(100, int(limit)))
        self.max_retries = 3
        self.timeout_seconds = 15.0

    def scrape(self) -> list[dict[str, Any]]:
        all_records: list[dict[str, Any]] = []
        seen_links: set[str] = set()
        today = date.today().isoformat()
        end_date = (date.today() + timedelta(days=60)).isoformat()

        with httpx.Client(timeout=self.timeout_seconds, follow_redirects=True) as client:
            for target in self._build_queries():
                html = self._fetch_page_with_retry(
                    client=client,
                    url=target["url"],
                    params=target["params"],
                    source=target["source"],
                )
                if not html:
                    continue

                if target["source"] == "shixiseng":
                    parsed_items = self._parse_shixiseng_results(
                        html=html,
                        base_url=target["base_url"],
                        city_fallback=target.get("city_fallback"),
                    )
                else:
                    parsed_items = self._parse_nowcoder_results(
                        html=html,
                        base_url=target["base_url"],
                        city_fallback=target.get("city_fallback"),
                    )

                for parsed in parsed_items:
                    link = parsed["apply_url"]
                    if link in seen_links:
                        continue
                    seen_links.add(link)

                    company_name = parsed["company_name"]
                    merged_text = f"{parsed['title']} {parsed['snippet']}"
                    all_records.append(
                        {
                            "company_name": company_name,
                            "industry": _infer_industry(company_name),
                            "logo_gradient": get_company_logo_gradient(company_name),
                            "recruitment_type": _infer_recruitment_type(merged_text),
                            "location": parsed["location"],
                            "start_date": today,
                            "end_date": end_date,
                            "no_written_test": _infer_no_written_test(merged_text),
                            "position": parsed["position"],
                            "announcement_url": parsed["announcement_url"],
                            "apply_url": parsed["apply_url"],
                            "source_type": "campus_recruitment",
                        }
                    )

                    if len(all_records) >= self.limit:
                        return all_records

        return all_records

    def _build_queries(self) -> list[dict[str, Any]]:
        city_token = self.city if self.city else "北京"
        return [
            {
                "source": "nowcoder",
                "url": "https://www.nowcoder.com/jobs/school/jobs",
                "base_url": "https://www.nowcoder.com",
                "city_fallback": city_token,
                "params": {},
            },
            {
                "source": "nowcoder",
                "url": "https://www.nowcoder.com/jobs/intern/center",
                "base_url": "https://www.nowcoder.com",
                "city_fallback": city_token,
                "params": {},
            },
        ]

    def _fetch_page_with_retry(
        self, client: httpx.Client, url: str, params: dict[str, Any], source: str
    ) -> str | None:
        for attempt in range(1, self.max_retries + 1):
            self._random_delay()
            try:
                response = client.get(url, params=params, headers=self._build_headers(url))
                print(
                    f"[DEBUG] {source} 响应，状态码: {response.status_code}, HTML长度: {len(response.text)}"
                )
                if response.status_code in {403, 429}:
                    print(
                        f"[WARN] {source} 触发反爬限制，状态码: {response.status_code}, url={url}, attempt={attempt}"
                    )
                if response.status_code == 200 and response.text:
                    return response.text

                if response.status_code not in {403, 429, 500, 502, 503, 504}:
                    return None
            except httpx.HTTPError as exc:
                print(f"[DEBUG] 网络请求异常: {exc}")

            if attempt < self.max_retries:
                time.sleep(0.8 * attempt + random.uniform(0.2, 0.8))

        return None

    def _build_headers(self, referer: str) -> dict[str, str]:
        return {
            "User-Agent": random.choice(_USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": referer,
            "Connection": "keep-alive",
        }

    def _random_delay(self) -> None:
        time.sleep(random.uniform(1.0, 3.0))

    def _parse_shixiseng_results(
        self, html: str, base_url: str, city_fallback: str | None
    ) -> list[dict[str, str]]:
        soup = BeautifulSoup(html, "html.parser")
        records: list[dict[str, str]] = []
        # 优先解析常见职位卡片结构；结构变化时回退为链接扫描。
        job_cards = soup.select(
            ".intern-wrap .intern-item, .intern-wrap .job-item, .job-list .job-item, .position-list .position-item"
        )
        if not job_cards:
            job_cards = soup.select("a[href*='/intern/'], a[href*='/job/']")

        for card in job_cards:
            if card.name == "a":
                title_link = card
                snippet = card.get_text(" ", strip=True)
            else:
                title_link = (
                    card.select_one("a[href*='/intern/']")
                    or card.select_one("a[href*='/job/']")
                    or card.select_one("h3 a")
                    or card.select_one("h2 a")
                    or card.select_one("a")
                )
                snippet = card.get_text(" ", strip=True)

            if not title_link:
                continue

            title = title_link.get_text(" ", strip=True)
            href = (title_link.get("href") or "").strip()
            if not href.startswith("http"):
                href = urljoin(base_url, href)
            if not href.startswith("http"):
                continue

            company_node = (
                card.select_one(".company-name")
                or card.select_one(".com-name")
                or card.select_one(".name")
                or card.select_one("[class*='company']")
            )
            location_node = (
                card.select_one(".area")
                or card.select_one(".city")
                or card.select_one(".location")
                or card.select_one("[class*='city']")
                or card.select_one("[class*='address']")
            )
            company_text = company_node.get_text(" ", strip=True) if company_node else ""
            location_text = location_node.get_text(" ", strip=True) if location_node else ""

            company_name = company_text or _infer_company_name(title, snippet, href)
            position = _infer_position(title, snippet, self.keyword)
            location = _normalize_location_value(
                location_text or _infer_location(snippet, city_fallback),
                city_fallback,
                snippet,
            )

            records.append(
                {
                    "title": title,
                    "snippet": snippet,
                    "company_name": company_name,
                    "position": position,
                    "location": location,
                    "announcement_url": href,
                    "apply_url": href,
                }
            )

        print(f"[DEBUG] shixiseng 解析记录数: {len(records)}")
        return records

    def _parse_nowcoder_results(
        self, html: str, base_url: str, city_fallback: str | None
    ) -> list[dict[str, str]]:
        job_cards = self._extract_nowcoder_job_cards(html)
        if job_cards:
            records: list[dict[str, str]] = []
            normalized_city = (self.city or "").strip()
            if _is_garbled_location(normalized_city):
                normalized_city = ""
            normalized_keyword = (self.keyword or "").strip()
            city_filter_enabled = bool(normalized_city and normalized_city not in {"全国", "all"})
            keyword_filter_enabled = bool(
                normalized_keyword and normalized_keyword not in {"-", "—", "all", "全部"}
            )

            for item in job_cards:
                company_name = (
                    str(item.get("companyNameText") or "")
                    or self._extract_nowcoder_nested_company(item)
                    or "未知公司"
                ).strip()
                position = (
                    str(item.get("jobName") or item.get("careerJobName") or "")
                    or "校招岗位"
                ).strip()
                job_city = str(item.get("jobCity") or "").strip()
                job_city_list = item.get("jobCityList")
                if isinstance(job_city_list, list):
                    parsed_cities = [
                        str(city).strip()
                        for city in job_city_list
                        if str(city).strip() and not _is_garbled_location(str(city))
                    ]
                else:
                    parsed_cities = []
                raw_location = job_city or "、".join(parsed_cities)
                location = _normalize_location_value(raw_location, city_fallback, position)

                if city_filter_enabled:
                    city_hit = normalized_city in location or any(
                        normalized_city in candidate for candidate in parsed_cities
                    )
                    if not city_hit:
                        continue

                industry = str(item.get("companyIndustryText") or item.get("industryName") or "").strip()
                merge_text = f"{company_name} {position} {industry} {location}"
                if keyword_filter_enabled and normalized_keyword.lower() not in merge_text.lower():
                    continue

                job_id = item.get("id")
                redirect_external_url = str(item.get("redirectExternalUrl") or "").strip()
                if redirect_external_url.startswith("http"):
                    apply_url = redirect_external_url
                elif job_id:
                    apply_url = f"{base_url}/jobs/detail/{job_id}"
                else:
                    continue

                snippet = " ".join(
                    value
                    for value in [
                        industry,
                        str(item.get("salaryText") or "").strip(),
                        str(item.get("jobAddress") or "").strip(),
                    ]
                    if value
                ).strip()

                records.append(
                    {
                        "title": position,
                        "snippet": snippet,
                        "company_name": company_name,
                        "position": position,
                        "location": location,
                        "announcement_url": apply_url,
                        "apply_url": apply_url,
                    }
                )

            dedup: dict[str, dict[str, str]] = {}
            for item in records:
                dedup[item["apply_url"]] = item
            unique_records = list(dedup.values())
            print(f"[DEBUG] nowcoder 解析记录数: {len(unique_records)}")
            return unique_records

        soup = BeautifulSoup(html, "html.parser")
        records: list[dict[str, str]] = []
        links = soup.select("a[href*='/jobs/'], a[href*='/position/'], a[href*='/intern/']")

        for anchor in links:
            title = anchor.get_text(" ", strip=True)
            if len(title) < 2:
                continue
            href = (anchor.get("href") or "").strip()
            if not href:
                continue
            if not href.startswith("http"):
                href = urljoin(base_url, href)
            if not href.startswith("http"):
                continue

            container = anchor.parent if anchor.parent else anchor
            snippet = container.get_text(" ", strip=True)
            company_name = _infer_company_name(title, snippet, href)
            position = _infer_position(title, snippet, self.keyword)
            location = _normalize_location_value(
                _infer_location(snippet, city_fallback), city_fallback, snippet
            )

            records.append(
                {
                    "title": title,
                    "snippet": snippet,
                    "company_name": company_name,
                    "position": position,
                    "location": location,
                    "announcement_url": href,
                    "apply_url": href,
                }
            )

        # 去重（同链接只保留一条）
        dedup: dict[str, dict[str, str]] = {}
        for item in records:
            dedup[item["apply_url"]] = item
        unique_records = list(dedup.values())
        print(f"[DEBUG] nowcoder 解析记录数: {len(unique_records)}")
        return unique_records

    def _extract_nowcoder_job_cards(self, html: str) -> list[dict[str, Any]]:
        marker = "window.__INITIAL_STATE__="
        marker_index = html.find(marker)
        if marker_index < 0:
            return []

        payload = html[marker_index + len(marker) :]
        json_text = self._extract_balanced_json_object(payload)
        if not json_text:
            return []

        try:
            state = json.loads(json_text)
        except json.JSONDecodeError:
            return []

        candidates: list[dict[str, Any]] = []
        app_map = state.get("app", {})
        if isinstance(app_map, dict):
            for value in app_map.values():
                if isinstance(value, dict):
                    job_list_data = value.get("jobListData")
                    if isinstance(job_list_data, list):
                        candidates.extend(item for item in job_list_data if isinstance(item, dict))

        store_map = state.get("store", {})
        if isinstance(store_map, dict):
            for section_value in store_map.values():
                if not isinstance(section_value, dict):
                    continue
                for key in ("jobList", "jobListData"):
                    section_list = section_value.get(key)
                    if isinstance(section_list, list):
                        candidates.extend(item for item in section_list if isinstance(item, dict))

        return candidates

    def _extract_balanced_json_object(self, text: str) -> str | None:
        brace_count = 0
        in_string = False
        escaped = False
        start_index = -1

        for index, char in enumerate(text):
            if in_string:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == '"':
                    in_string = False
                continue

            if char == '"':
                in_string = True
                continue

            if char == "{":
                if start_index < 0:
                    start_index = index
                brace_count += 1
                continue

            if char == "}":
                brace_count -= 1
                if brace_count == 0 and start_index >= 0:
                    return text[start_index : index + 1]

        return None

    def _extract_nowcoder_nested_company(self, item: dict[str, Any]) -> str:
        user_data = item.get("user")
        if not isinstance(user_data, dict):
            return ""
        identity_list = user_data.get("identity")
        if not isinstance(identity_list, list) or not identity_list:
            return ""
        first_identity = identity_list[0]
        if not isinstance(first_identity, dict):
            return ""
        return str(first_identity.get("companyName") or "").strip()


_AI_ENGINE_DATABASE_URL = _build_ai_engine_mysql_url()
_engine = create_engine(_AI_ENGINE_DATABASE_URL, pool_size=5, max_overflow=10, pool_pre_ping=True)
_SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def _persist_records(records: list[dict[str, Any]], user_id: int) -> int:
    db = _SessionLocal()
    try:
        now = datetime.now()
        entities = [
            Opportunity(
                user_id=user_id,
                title=item.get("title", item["position"]),
                company_name=item["company_name"],
                industry=item["industry"],
                logo_gradient=item["logo_gradient"],
                recruitment_type=item["recruitment_type"],
                location=item["location"],
                start_date=item["start_date"],
                end_date=item["end_date"],
                no_written_test=item["no_written_test"],
                position=item["position"],
                announcement_url=item["announcement_url"],
                apply_url=item["apply_url"],
                source_type="campus_recruitment",
                created_at=now,
                **({"updated_at": now} if hasattr(Opportunity, "updated_at") else {}),
            )
            for item in records
        ]

        db.add_all(entities)
        db.commit()
        return len(entities)
    except SQLAlchemyError:
        db.rollback()
        raise
    finally:
        db.close()


def _resolve_target_user_id(payload_user_id: Any, fallback_user_id: int) -> int:
    try:
        if payload_user_id is None:
            return fallback_user_id
        normalized = int(str(payload_user_id).strip())
        return normalized if normalized > 0 else fallback_user_id
    except (TypeError, ValueError):
        return fallback_user_id


async def start_campus_task(payload: dict[str, Any]) -> None:
    city = payload.get("city")
    keyword = payload.get("keyword")
    scan_type = str(payload.get("scanType", "city"))
    requested_limit = int(payload.get("limit", 15))
    limit = max(1, min(100, requested_limit))
    if isinstance(keyword, str) and keyword.strip() in {"-", "—", "all", "全部"}:
        keyword = None
    system_user_id = int(os.getenv("AI_ENGINE_SYSTEM_USER_ID", "1"))
    target_user_id = _resolve_target_user_id(payload.get("userId"), system_user_id)

    print(
        "[AI-ENGINE][CampusScan] task started, "
        f"userId={target_user_id}, scanType={scan_type}, city={city}, keyword={keyword}, limit={limit}"
    )

    scraper = CampusWebScraper(
        city=city if isinstance(city, str) else None,
        keyword=keyword if isinstance(keyword, str) else None,
        scan_type=scan_type,
        limit=limit,
    )

    records = await asyncio.to_thread(scraper.scrape)
    if not records:
        print("[AI-ENGINE][CampusScan] no records scraped from web sources")
        return

    for index, item in enumerate(records, start=1):
        print(
            "[AI-ENGINE][CampusScan] "
            f"#{index} {item['company_name']} | {item['position']} | {item['location']} | {item['apply_url']}"
        )
        await asyncio.sleep(0.02)

    try:
        inserted = await asyncio.to_thread(_persist_records, records, target_user_id)
    except Exception as exc:
        print(f"[AI-ENGINE][CampusScan] persist failed: {exc}")
        return

    safe_db_target = _AI_ENGINE_DATABASE_URL.split("@")[-1] if "@" in _AI_ENGINE_DATABASE_URL else "unknown"
    print(
        "[AI-ENGINE][CampusScan] done, "
        f"userId={target_user_id}, inserted={inserted}, db={safe_db_target}"
    )


# ==========================================
# 本地测试专用执行入口 (仅直接运行脚本时生效)
# ==========================================
if __name__ == "__main__":
    import asyncio

    # 模拟从 NestJS 发送过来的指令 Payload
    mock_payload = {
        "city": "杭州",  # 你想扫描的城市
        "keyword": "开发",  # 岗位关键词，也可以改成 "产品"、"算法"
        "scanType": "city",
        "limit": 5,  # 为了测试跑得快点，先抓 5 条
        "userId": 1,  # 挂在哪个用户的主键下
    }

    print("🚀 启动独立爬虫测试模式...")
    # 运行异步抓取任务
    asyncio.run(start_campus_task(mock_payload))
