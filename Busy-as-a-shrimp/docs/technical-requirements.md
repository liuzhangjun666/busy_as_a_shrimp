# AI资源共享平台 技术需求文档（TRD）

文档版本：v1.0  
更新时间：2026-03-25  
适用阶段：MVP（Phase 1）到 Phase 4.5

## 1. 文档目标

本文件用于统一产品、研发、测试、运维对“AI资源共享平台”的技术实现认知，明确：

- 业务边界与系统边界
- 项目框架与模块拆分
- 核心接口与数据模型
- 合规与风控底线
- 交付里程碑与验收标准

## 2. 项目背景与目标

### 2.1 背景

平台定位为“资源方与需求方的 AI 化撮合与内容协作平台”，核心流程为：

1. 用户注册与身份校验
2. 资源上传与标签化
3. 智能匹配与双向确认
4. AI内容生成与分发
5. 团长裂变与佣金体系
6. 会员增值与平台运营

### 2.2 目标

- 2-3 周内交付可运行 MVP（用户+资源+匹配）
- 14 周内完成 Phase 1 到 Phase 4.5 的基础能力
- 全链路落实“合规优先”：不存敏感实名信息、不提供资金托管、不暴露私下联系方式

## 3. 业务范围与边界

### 3.1 In Scope

- 用户体系：注册、登录、角色切换、基础资料
- 资源体系：资源上传、标签管理、资源审核
- 匹配体系：需求采集、匹配计算、结果确认
- 内容体系：AI生成、人工确认、发布与统计
- 团长体系：邀请关系、等级、佣金记录
- 管理后台：审核、统计、公告、风控处置

### 3.2 Out of Scope（当前阶段）

- 全量支付清结算系统（先保留支付接口能力）
- 多租户与复杂组织权限
- 全自动化投放闭环（先人工确认后发布）

## 4. 技术架构与项目框架

### 4.1 分层架构

1. 用户端层：微信小程序 / H5 Web / 管理后台
2. 网关层：Nginx + API Gateway + JWT + 限流
3. 应用层：用户、资源、匹配、内容、团长、会员、通知
4. AI引擎层：调度器、匹配引擎、内容生成、合规审查
5. 数据层：MySQL、Redis、RabbitMQ、Elasticsearch、OSS
6. 基础设施层：Docker/K8s、CI/CD、监控告警

### 4.2 当前项目框架（Monorepo）

```text
AI-sharing/
├─ apps/
│  ├─ api/                 # NestJS API（TypeScript）
│  ├─ web/                 # H5 Web（Next.js）
│  ├─ admin/               # 管理后台（Next.js）
│  └─ miniprogram/         # 小程序占位（Taro 预留）
├─ services/
│  └─ ai-engine-python/    # AI调度服务（FastAPI + APScheduler）
├─ packages/
│  └─ database/            # Prisma schema + DB package
├─ infra/
│  └─ nginx/               # 网关配置
├─ docs/                   # 架构/API/里程碑/TRD
├─ docker-compose.yml      # 本地与联调基础设施编排
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

### 4.3 技术选型

- 前端：Next.js（web/admin），后续接入 Taro（miniprogram）
- 后端：NestJS（模块化、易于分层与扩展）
- AI引擎：Python + FastAPI + APScheduler（便于接入 OpenClaw）
- 数据：MySQL 8.0（主库）、Redis（缓存）、RabbitMQ（异步）、ES（搜索）
- ORM：Prisma（统一数据模型与迁移）
- 部署：Docker Compose（开发），K8s（生产规划）

## 5. 功能需求（按模块）

### 5.1 用户模块（Phase 1）

- 手机号+验证码注册/登录
- 微信 OAuth 登录（预留）
- 实名校验（只校验，不落库）
- 角色：服务方/资源方/双角色
- JWT 鉴权（7天）

### 5.2 资源模块（Phase 1）

- 资源上传（skill/location/account/time）
- 多维标签：地区、技能、时间、规模
- 文本与图片上传前风险扫描
- 审核状态：pending/active/inactive/rejected

### 5.3 匹配模块（Phase 1）

- 匹配任务创建与调度
- 匹配结果列表与评分展示
- 双方确认后进入后续流程
- 默认不展示真实联系方式

### 5.4 内容模块（Phase 2）

- 内容生成：卡片/文案/脚本/海报
- 平台定向：抖音/小红书/视频号等
- 发布前用户确认机制
- 内容统计回流（浏览/点赞/咨询）

### 5.5 团长与佣金（Phase 3）

- 邀请码体系与邀请关系绑定
- 团长等级（普通/高级/金牌）
- 佣金记录与状态机（pending/active/paid/invalid）
- 防刷规则与异常处置

### 5.6 会员系统（Phase 3）

- 免费版/月度/年度/终身版
- 会员权益控制与到期管理
- 支付渠道接口预留

### 5.7 AI自主调度（Phase 4）

- 心跳、需求采集、夜间匹配等定时任务
- 算力动态策略（高收益高性能/低收益省电）
- 异常回退策略与任务恢复

### 5.8 赛博分身（Phase 4.5）

- 分身状态与偏好画像
- 任务优先级策略增强
- 轻量化实现，不额外增加算力成本

## 6. API 需求（V1）

Base URL: `/api/v1`

### 6.1 用户模块

- `POST /user/register`
- `POST /user/login`
- `POST /user/verify-identity`
- `GET /user/info`
- `PUT /user/info`
- `PUT /user/role`

### 6.2 资源模块

- `POST /resource/upload`
- `GET /resource/list`
- `PUT /resource/:id`
- `DELETE /resource/:id`
- `GET /resource/tags`

### 6.3 匹配模块

- `POST /match/run`
- `GET /match/list`
- `POST /match/:id/confirm`

### 6.4 团长模块

- `GET /captain/info`
- `GET /captain/ranking`
- `GET /captain/commissions`
- `POST /captain/withdraw`
- `GET /captain/stats`

### 6.5 管理后台模块

- `GET /admin/users`
- `GET /admin/resources`
- `PUT /admin/resources/:id`
- `GET /admin/stats`
- `POST /admin/announce`
- `GET /admin/captain/ranking`
- `PUT /admin/captain/:id/level`

## 7. 数据模型需求（核心表）

已在 `packages/database/prisma/schema.prisma` 落地：

- `users`
- `resources`
- `matches`
- `captain_commissions`
- `invite_records`
- `contents`

建模原则：

- 仅保存必要业务字段
- 敏感字段最小化与不可逆化（如 `phone_hash`）
- 状态字段统一枚举，便于风控与审计

## 8. 非功能需求

### 8.1 性能

- API P95 响应时间：< 300ms（非AI同步接口）
- 匹配任务：异步执行，支持队列堆积告警
- 管理后台核心列表：支持分页与筛选

### 8.2 可用性

- 目标可用性：99.9%（生产）
- 关键服务健康检查：API `/health`，AI引擎 `/health`
- 任务调度支持自动重启与恢复

### 8.3 可观测性

- 结构化日志（请求ID、用户ID、模块名）
- 指标监控（QPS、错误率、队列积压）
- 告警通道预留（企业微信/钉钉）

## 9. 安全、合规与风控

### 9.1 安全基线

- JWT 鉴权 + 关键接口鉴权
- 上传内容与图片预审查
- 限流、防刷与异常行为识别

### 9.2 合规基线

- 不存储实名证件原文
- 不开放私下联系方式直出
- 平台不托管用户资金（仅工具服务费模式）

### 9.3 风控规则（首版）

- 同IP/设备注册限额
- 异常邀请链识别与失效
- 违规内容分级处置（警告/禁言/封号）
- 刷单行为触发团长资格取消与佣金清零

## 10. 环境与部署需求

### 10.1 开发环境

- Node.js >= 20.10
- pnpm >= 9
- Python >= 3.11
- Docker / Docker Compose

### 10.2 启动方式

1. `pnpm install`
2. `pnpm infra:up`（MySQL/Redis/RabbitMQ/ES）
3. `pnpm dev:api`
4. `pnpm dev:web`
5. `pnpm dev:admin`

可选：`pnpm infra:up:all` 容器启动应用层

## 11. 里程碑计划（14周）

1. Phase 1（W1-W3）：用户+资源+匹配 MVP
2. Phase 2（W4-W6）：AI内容生成与发布闭环
3. Phase 3（W7-W9）：团长裂变+会员支付
4. Phase 4（W10-W12）：AI自主调度
5. Phase 4.5（W13-W14）：赛博分身轻量化

## 12. 验收标准（MVP）

- 用户可完成注册登录、角色切换、资料更新
- 资源可上传、审核、上架/下架
- 匹配任务可创建并返回匹配结果
- 管理后台可完成基础审核与统计展示
- 核心数据表可完成写入与查询闭环
- 合规规则可覆盖上传、内容、交易三阶段

## 13. 风险与对策

- 第三方依赖不稳定（短信、实名、内容审核）  
  对策：抽象 Provider 接口 + 降级策略
- 匹配算法早期效果不稳定  
  对策：规则+模型双轨，保留人工兜底
- 团长裂变被刷风险高  
  对策：邀请链监控 + 审核阈值 + 延迟结算

## 14. 后续扩展建议

- OpenAPI/Swagger 自动化文档
- CI 流水线与质量门禁（lint/test/build）
- 业务事件总线（埋点+风控+运营）
- 多环境配置体系（dev/staging/prod）
