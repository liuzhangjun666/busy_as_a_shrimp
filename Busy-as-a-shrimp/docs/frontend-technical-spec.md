# 前端技术文档（MVP / Phase 1）

文档版本：v1.2  
更新时间：2026-03-26  
适用范围：`apps/web`、`apps/admin`、`apps/miniprogram`（占位）

## 1. 文档目标

在现有 Monorepo 骨架基础上，定义前端可落地的技术方案与搭建边界，覆盖：

- 工程结构与依赖策略
- API 对接契约与状态管理约定
- Phase 1 页面范围与交付顺序
- 开发、测试、构建、发布基线

## 2. 输入前提

本方案基于当前仓库事实与 TRD：

- 后端基址：`/api/v1`（`apps/api/src/main.ts`）
- 当前前端框架：`apps/web` 与 `apps/admin` 均为 Next.js 14（App Router）
- 当前脚手架状态：页面仅占位，`lint/test` 尚未配置
- 业务优先级：Phase 1（用户 + 资源 + 匹配）优先
- 合规约束：不直出联系方式、实名只校验不落库、平台不做资金托管

## 3. 前端搭建方案对比

### 方案 A：`web/admin` 完全独立演进（不做共享包）

优点：

- 上手成本最低，改动小

代价：

- 类型、请求封装、组件规范重复建设
- 中后期维护成本高

### 方案 B（推荐）：保留双 Next 应用 + 新增共享前端包

优点：

- 保留业务隔离（C 端与管理端）
- 通过 `packages/*` 复用 API 类型、请求层、通用组件，减少重复
- 与当前 Monorepo 结构一致，迁移成本可控

代价：

- 初期需要补齐共享包边界与版本管理

### 方案 C：合并为单 Next 应用（按路由分域）

优点：

- 部署链路统一

代价：

- 权限、UI 风格、构建边界耦合度高
- 与当前仓库结构冲突，需要较大迁移

结论：采用方案 B。

## 4. 目标工程结构

```text
apps/
  web/                      # 用户端 H5（Next.js）
  admin/                    # 管理后台（Next.js）
  miniprogram/              # 小程序占位（下一阶段补齐）
packages/
  ui/                       # 跨端基础组件（按钮、表单容器、状态组件）
  http-client/              # 请求封装、拦截器、错误映射
  api-types/                # 接口 DTO 与响应类型（与后端对齐）
  eslint-config/            # 前端统一 lint 规则
  tsconfig/                 # 前端共享 tsconfig
```

说明：

- `apps/web` 与 `apps/admin` 保持独立路由与发布节奏。
- 公共能力沉淀在 `packages/*`，避免应用间复制代码。

## 5. 技术栈与版本基线

- Runtime：Node.js `>=20.10.0`
- 包管理：pnpm `>=9`
- Framework：Next.js `14.x`（App Router）
- Language：TypeScript `5.x`
- 网络层：`fetch` + 统一请求封装（推荐后续接入 `ky` 或 `axios`，二选一）
- 表单：React Hook Form + Zod
- 服务端状态：TanStack Query
- 本地状态：Zustand（仅用于跨页面轻量状态）
- 动效：Framer Motion（用于页面过渡、列表进场、反馈动效）
- 样式策略：
  - `web`：Tailwind CSS + 业务组件
  - `admin`：Ant Design（表格/筛选/后台表单效率优先）
- 测试：Vitest + Testing Library + Playwright
- Mock：MSW（开发与联调前阶段）
- 上传优化：browser-image-compression（资源图片上传前压缩）

## 6. 环境变量约定（前端）

新增（建议）：

- `NEXT_PUBLIC_API_BASE_URL`：API 完整基址，如 `http://localhost:8081/api/v1`
- `NEXT_PUBLIC_APP_ENV`：`local | dev | staging | prod`

规则：

- 前端仅读取 `NEXT_PUBLIC_*`。
- 非公开密钥只允许保留在服务端（API/BFF），不下发浏览器。

## 7. API 契约与错误处理

后端统一响应结构：

```ts
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
```

前端约定：

1. 请求层统一解包 `ApiResponse<T>`，仅向业务层暴露 `data`。
2. `success=false` 或网络错误统一映射为业务错误码（如 `AUTH_EXPIRED`、`RATE_LIMITED`）。
3. 401 统一触发登录态失效流程（清 token + 跳转登录页）。
4. 页面只处理业务态，不直接拼接底层错误字符串。

## 8. 鉴权与路由守卫

### 8.1 登录态

- token 存储：以 `HttpOnly Cookie` 作为正式环境默认方案
- 若后端未就绪，仅允许在本地开发环境临时使用 `localStorage`，上线前必须切回 Cookie
- 登录成功后写入用户摘要信息（角色、昵称、城市）

### 8.2 路由守卫

- `web`：未登录访问业务页跳 `login`
- `admin`：必须具备后台角色声明，否则跳转无权限页
- 鉴权校验放在中间件或布局层，避免每页重复判断

### 8.3 App Router 缓存策略

- 用户私有数据接口（如“我的资源”“匹配列表”）默认使用 `cache: "no-store"`
- 只对低频静态数据启用缓存（如标签字典），并设置显式 revalidate 时间
- 不在页面层直接写散落 `fetch` 配置，统一通过请求层策略函数控制

### 8.4 管理端样式隔离

- `admin` 通过 `ConfigProvider` 统一主题与 token
- 不在共享包注入全局 reset 样式，避免污染 `web`
- `web` 与 `admin` 的样式入口分离，禁止跨应用直接引用全局样式文件

## 9. Phase 1 页面范围（前端）

### 9.1 `apps/web`（用户端）

1. `/login`：手机号验证码登录（微信登录按钮占位）
2. `/profile`：用户资料查看/编辑、角色切换
3. `/resource/new`：资源上传（类型、标签、地区、价格区间）
4. `/resource/list`：我的资源列表与状态
5. `/match/list`：匹配结果列表与确认

### 9.2 `apps/admin`（管理端）

1. `/login`：后台登录
2. `/dashboard`：核心统计（用户数、资源数、匹配任务数）
3. `/resources/review`：资源审核（通过/驳回）
4. `/users`：用户列表查询
5. `/captain/ranking`：团长排行列表（Phase 1 可只读占位）

## 10. 与后端接口映射（MVP）

`web` 关键接口：

- `POST /user/register`
- `POST /user/login`
- `GET /user/info`
- `PUT /user/info`
- `PUT /user/role`
- `POST /resource/upload`
- `GET /resource/list`
- `GET /resource/tags`
- `POST /match/run`
- `GET /match/list`
- `POST /match/:id/confirm`

`admin` 关键接口：

- `GET /admin/users`
- `GET /admin/resources`
- `PUT /admin/resources/:id`
- `GET /admin/stats`
- `GET /admin/captain/ranking`

## 11. 代码规范与质量门禁

最低门禁（当前仓库需补齐）：

1. `eslint`：禁止 `any` 滥用、未使用变量、循环依赖
2. `prettier`：统一格式化
3. `typecheck`：`tsc --noEmit`
4. `test`：关键页面最少 1 条渲染/交互用例
5. `e2e`：登录主链路 + 资源上传主链路
6. `husky + lint-staged`：提交前自动执行 `eslint --fix` 与 `prettier --write`

建议在根脚本新增：

- `lint:web`、`lint:admin`
- `test:web`、`test:admin`
- `typecheck:web`、`typecheck:admin`

## 12. 前端搭建执行清单

### 里程碑 1：工程基线（1-2 天）

- 补齐 `eslint/prettier/typecheck`
- 建立 `packages/http-client` 与 `packages/api-types`
- 建立统一环境变量读取模块
- 接入 `husky + lint-staged` 提交拦截
- 接入 `MSW` 本地 mock 基线（覆盖登录、资源列表、匹配列表）

里程碑状态（2026-03-25）：

- 已完成：`eslint.config.mjs`、`.prettierrc.json`、`.prettierignore`
- 已完成：`packages/api-types`、`packages/http-client`（含 Vitest 用例）
- 已完成：`apps/web` 与 `apps/admin` 的 `src/env.ts` 与 env 测试
- 已完成：`apps/web` 与 `apps/admin` 的 `MSW handlers/browser` 基线
- 已完成：`.husky/pre-commit` + `lint-staged` 配置

### 里程碑 2：用户端主链路（2-4 天）

- 完成 `login/profile/resource/match` 页面骨架
- 打通 `user/resource/match` 接口
- 落地统一错误提示与空态
- 增加关键动效（页面切换、状态反馈、列表骨架进场）
- 导航栏与浮层使用 `backdrop-filter` 建立玻璃态视觉层
- 资源上传接入前端图片压缩策略（按尺寸与体积阈值）

里程碑状态（2026-03-26）：

- 已完成：`/login`、`/profile`、`/resource/new`、`/resource/list`、`/match/list` 页面骨架
- 已完成：`apps/web/src/api/*` 对接 `user/resource/match` 接口封装
- 已完成：统一 `ErrorState` / `EmptyState` 组件与错误展示路径
- 已完成：页面进场与列表项使用 `framer-motion`
- 已完成：导航与页面容器 `backdrop-filter` 玻璃态样式
- 已完成：资源上传图片压缩接入 `browser-image-compression`

### 里程碑 3：管理端审核链路（2-3 天）

- 完成 `dashboard/resources/users` 页面
- 打通资源审核动作与统计查询

里程碑状态（2026-03-26）：

- 已完成：`/dashboard`（`GET /admin/stats`）
- 已完成：`/users`（`GET /admin/users`）
- 已完成：`/resources/review`（`GET /admin/resources` + `PUT /admin/resources/:id`）
- 已完成：`/captain/ranking`（`GET /admin/captain/ranking`，只读）
- 已完成：`apps/admin/src/api/*` 的 admin 接口封装与测试
- 已完成：`admin` 端统一导航、错态/空态、MSW 启动入口

### 里程碑 4：联调与验收（1-2 天）

- 联调 API 错误码
- 补齐 E2E 冒烟
- 对齐 MVP 验收清单

里程碑状态（2026-03-26）：

- 已完成：`packages/http-client` 统一错误码（`AUTH_EXPIRED / RATE_LIMITED / SERVER_ERROR / ...`）
- 已完成：`resolveClientError` 统一错误消息映射，并在 `web/admin` 页面 catch 分支接入
- 已完成：`apps/web` Playwright 冒烟（`/login`、`/resource/list`、`/match/list`）
- 已完成：MVP 前端验收清单文档（`docs/mvp-frontend-acceptance.md`）
- 已完成：根脚本一键验收（`corepack pnpm verify:frontend:mvp`）
- 已完成：`apps/web/next.config.mjs` 加入 `allowedDevOrigins`，消除本地 E2E 跨域开发警告
- 待执行：与后端联调阶段逐接口替换 MSW，并补充真实数据断言

## 13. 风险与对应策略（前端视角）

- 接口字段变动频繁  
  策略：`packages/api-types` 统一出口，禁止页面内联接口类型

- 登录态策略未定（Cookie vs Token）  
  策略：将 Cookie 设为正式基线，仅允许本地临时 token 方案

- 管理端列表性能  
  策略：分页、筛选参数统一序列化；表格默认服务端分页

- 小程序端尚未落地  
  策略：先沉淀 API 类型与业务组件规范，后续 Taro 复用

- 开发依赖后端进度导致阻塞  
  策略：MSW 先行模拟契约，联调阶段逐接口替换

## 14. 交付定义（前端）

满足以下条件可视为 Phase 1 前端完成：

1. `web` 主流程可用：登录 -> 资料维护 -> 资源上传 -> 匹配查看/确认
2. `admin` 审核流程可用：资源审核与核心统计可操作
3. 前端质量门禁通过：lint + typecheck + 基础测试
4. 与 TRD 合规边界一致：不直出联系方式、不落地实名原文

前端一键验收命令：

- `corepack pnpm verify:frontend:mvp`
