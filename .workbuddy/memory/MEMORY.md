# 小龙虾 AI 资源共享平台 — 长期记忆

## 项目概况
- **项目名**：Busy As A Shrimp（小龙虾 AI 资源共享平台）
- **技术栈**：NestJS 10 + TypeScript + Prisma ORM + MySQL 8.0 + Redis 7 + RabbitMQ 3 + Elasticsearch 8.12
- **部署**：Docker Compose，腾讯云 Ubuntu 22.04 LTS 服务器
- **数据库连接**：MySQL root:123456@localhost:3307/busy_as_a_shrimp（宿主机映射）
- **API 端口**：8081，全局前缀 api/v1

## 赛博分身架构决策
- **当前集成**：DeerFlow 2.0（字节开源多智能体框架）+ OpenClaw（浏览器自动化，MCP 协议）
- **DeerFlow 部署**：同服务器 localhost:2026（Gateway）/ localhost:2024（LangGraph Server）
- **OpenClaw 部署**：同服务器 localhost:18789（Gateway）/ localhost:18800（CDP）
- **通信方式**：NestJS→RabbitMQ→DeerFlow→MCP→OpenClaw，DeerFlow 回调 NestJS（HMAC签名验证）
- **2026-04-17 选型决策（最终版）**：OpenClaw vs Hermes Agent 深度对比完成
  - ⚠️ 纠正：之前说"OpenClaw 有 Camofox 插件"是不准确的，OpenClaw 插件生态中不存在 Camofox/Camoufox 插件
  - Camoufox（反检测浏览器）是独立 Python 库（PyPI: camoufox, 7.4k⭐），基于 Firefox + Juggler 协议，C++ 层指纹伪装
  - Hermes 内置了 Camoufox 作为 6 种浏览器引擎之一，开箱即用
  - OpenClaw 无任何内置反检测能力，要获得需自建 Camoufox Remote Server 集成
  - Hermes MCP Server 仅 stdio，需 mcp-proxy/supergateway 桥接才能被 DeerFlow HTTP/SSE 调用
  - **最终方案：Hermes 为主**，因为反检测是赛博分身生死线，OpenClaw 在这方面空白
  - 保留 OpenClaw 作为精确操作备选（拖拽/PDF/下载等场景）
  - Camoufox 2026 新版本实验性，生产环境先用 Hermes Browserbase 云模式或 CDP 模式，反检测场景切 Camoufox
- **2026-04-17 项目代码审计**：赛博分身实际集成状态
  - DeerFlow：✅ 完整集成（LobsterCyberTaskService 通过 LangGraph Thread/Run API，HMAC 回调）
  - OpenClaw：⚠️ 仅配置项（.env 有 OPENCLAW_BASE_URL，Python config.py 有 URL，但无任何实际调用代码）
  - Hermes：❌ 项目中无任何痕迹
  - RabbitMQ Producer：✅ 已实现（lobster.producer.ts 发布到 lobster.tasks 交换机）
  - AI Engine Python：⚠️ 早期残留（SQLAlchemy + Mock Jaccard 匹配，与 DeerFlow 无关）

## 数据模型
- 无独立 profiles/demands/wishes 表，用户画像通过 users + resources.tags + lobster_statuses 三表聚合
- 用户画像读取 API：GET /api/v1/lobster/profile/:userId（DeerFlow HMAC）/ GET /api/v1/lobster/me（JWT）
- Resource 表 tags 字段（Json）存储技能标签，resource_type 枚举：skill/location/account/time

## 2026-04-22 端到端联调完成

### Prisma 迁移修复
- `20260422094500_add_startup_posts` 迁移文件有 UTF-8 BOM（EF BB BF），导致 MySQL 报错
- 修复：用 Python 移除 BOM 后，`prisma migrate resolve --rolled-back` → `prisma migrate deploy` 成功
- 所有 16 个迁移全部应用完毕

### TypeScript 编译错误修复
- `@golevelup/nestjs-rabbitmq` v9 的 `@RabbitHandler` 装饰器与 async 方法返回类型不兼容（库自身 TypeScript 声明 bug）
  - 修复：`@RabbitHandler({ ... type: 'subscribe' } as any)` + `// @ts-expect-error` 抑制
- `lobster.service.ts` 的 `handleDeerflowResultFromQueue` 中 Opportunity 创建使用了不存在的 `title` 字段和 `status` 字段
  - 修复：映射到正确的 schema 字段（`position` → `companyName`/`position` 等），移除不存在的 `status`

### 完整已实现的模块
- LobsterModule: controller(20端点)/service(35KB)/scheduler/producer/consumer/DTOs/guards - 全链路完整
- DeerFlowGatewayService: DeerFlow Gateway API 完整封装（models/mcp/memory/chat）
- DeerFlowSignatureGuard: HMAC-SHA256 签名 + timingSafeEqual 防重放 + callback token 兜底
- Python AI Engine: deerflow_client + openclaw_skill + mq_consumer + main.py (FastAPI lifespan) 完整
- Workflow YAMLs: lobster_daily_master + 3性格子工作流（city/ecommerce/global）全部就绪

### .env 关键配置
- `DEERFLOW_BASE_URL=http://81.69.228.186:2026/api/langgraph`
- `OPENCLAW_BASE_URL=http://81.69.228.186:18789`
- `RABBITMQ_HOST=localhost / RABBITMQ_USER=airp / RABBITMQ_PASSWORD=airp`
- `DEERFLOW_CALLBACK_TOKEN=shrimp_callback_token_2026`（NestJS HMAC 验证）
- `DEERFLOW_CALLBACK_SECRET`（DeerFlow→NestJS 回调签名验证）

## 用户偏好
- 中文简体沟通
- 一次成型可直接部署的生产级代码，拒绝确认循环
- 输出格式偏好结构化表格
- 严格按步骤顺序执行，每步反馈后再推进
