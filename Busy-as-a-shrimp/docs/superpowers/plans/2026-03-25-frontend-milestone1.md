# Frontend Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Phase 1 前端工程基线（lint/prettier/typecheck、shared api/http、env、MSW、husky）。

**Architecture:** 在 `apps/web` 与 `apps/admin` 保持独立应用的前提下，新增 `packages/api-types` 与 `packages/http-client` 作为共享基础层。应用内通过统一 env 读取模块与请求模块完成接口调用准备，开发环境通过 MSW 提供无后端依赖的接口模拟。

**Tech Stack:** Next.js 14, TypeScript 5, ESLint 9, Prettier 3, Vitest, MSW, Husky, lint-staged.

---

### Task 1: 工程质量门禁基线

**Files:**

- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `eslint.config.mjs`
- Modify: `package.json`
- Modify: `apps/web/package.json`
- Modify: `apps/admin/package.json`

- [x] Step 1: 新增 lint/format/typecheck 统一脚本
- [x] Step 2: 配置 ESLint + Prettier
- [x] Step 3: 跑 `pnpm lint:web`、`pnpm lint:admin`、`pnpm typecheck:web`、`pnpm typecheck:admin`

### Task 2: shared API 类型包

**Files:**

- Create: `packages/api-types/package.json`
- Create: `packages/api-types/tsconfig.json`
- Create: `packages/api-types/src/index.ts`
- Create: `packages/api-types/src/api-response.ts`
- Create: `packages/api-types/src/user.ts`
- Create: `packages/api-types/src/resource.ts`
- Create: `packages/api-types/src/match.ts`

- [x] Step 1: 先写类型导出测试（Vitest）
- [x] Step 2: 运行测试确认 RED
- [x] Step 3: 实现类型定义并导出
- [x] Step 4: 运行测试确认 GREEN

### Task 3: shared HTTP 客户端包

**Files:**

- Create: `packages/http-client/package.json`
- Create: `packages/http-client/tsconfig.json`
- Create: `packages/http-client/src/index.ts`
- Create: `packages/http-client/src/errors.ts`
- Create: `packages/http-client/src/create-http-client.ts`
- Create: `packages/http-client/src/__tests__/create-http-client.test.ts`

- [x] Step 1: 编写失败测试（成功解包、业务失败、HTTP 失败）
- [x] Step 2: 运行 `pnpm --filter @airp/http-client test` 确认 RED
- [x] Step 3: 实现最小可用 client
- [x] Step 4: 再跑测试确认 GREEN

### Task 4: 应用接入 env 模块与 MSW 基线

**Files:**

- Create: `apps/web/src/env.ts`
- Create: `apps/admin/src/env.ts`
- Create: `apps/web/src/mocks/handlers.ts`
- Create: `apps/web/src/mocks/browser.ts`
- Create: `apps/admin/src/mocks/handlers.ts`
- Create: `apps/admin/src/mocks/browser.ts`
- Create: `apps/web/src/__tests__/env.test.ts`
- Create: `apps/admin/src/__tests__/env.test.ts`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/admin/app/page.tsx`

- [x] Step 1: 先写 env 测试（缺失变量时报错）
- [x] Step 2: 运行测试确认 RED
- [x] Step 3: 实现 env 读取 + MSW handlers
- [x] Step 4: 页面改为通过 shared 模块演示调用
- [x] Step 5: 运行 app 级测试确认 GREEN

### Task 5: Husky + lint-staged

**Files:**

- Modify: `package.json`
- Create: `.husky/pre-commit`

- [x] Step 1: 配置 `prepare` 与 `lint-staged`
- [x] Step 2: 配置 pre-commit 钩子执行 `lint-staged`
- [x] Step 3: 手动执行 lint-staged 验证命令可运行

### Task 6: 最终验证

**Files:**

- Modify: `docs/frontend-technical-spec.md`

- [x] Step 1: 运行 `pnpm install`
- [x] Step 2: 运行 `pnpm --filter @airp/http-client test`
- [x] Step 3: 运行 `pnpm --filter @airp/web test` 与 `pnpm --filter @airp/admin test`
- [x] Step 4: 运行 `pnpm lint:web && pnpm lint:admin`
- [x] Step 5: 运行 `pnpm typecheck:web && pnpm typecheck:admin`
- [x] Step 6: 将文档中的 Milestone 1 标记为已落地
