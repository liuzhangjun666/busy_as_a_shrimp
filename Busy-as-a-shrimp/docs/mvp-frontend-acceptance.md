# MVP 前端验收清单（Phase 1）

文档版本：v1.0  
更新时间：2026-03-26  
对应来源：`docs/technical-requirements.md` 第 12 节（MVP 验收标准）

## 1. 验收范围

本清单仅覆盖前端可交付部分（`apps/web` + `apps/admin` + `packages/http-client`），
不包含后端真实业务数据与生产部署项。

## 2. 需求到实现映射

| TRD 验收项                             | 前端实现映射                                                                                | 当前状态                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------ |
| 用户可完成注册登录、角色切换、资料更新 | `web` 已落地 `/login`、`/profile` 页面与 `user` 接口调用链路                                | 已完成                   |
| 资源可上传、审核、上架/下架            | `web` 已落地 `/resource/new`、`/resource/list`；`admin` 已落地 `/resources/review` 审核动作 | 已完成（前端链路）       |
| 匹配任务可创建并返回匹配结果           | `web` 已落地 `/match/list`，支持发起匹配与确认动作                                          | 已完成（前端链路）       |
| 管理后台可完成基础审核与统计展示       | `admin` 已落地 `/dashboard`、`/users`、`/resources/review`、`/captain/ranking`              | 已完成                   |
| 合规规则可覆盖上传、内容、交易三阶段   | 前端已约束：不直出联系方式；实名仅走校验接口；错误信息统一映射                              | 部分完成（依赖后端策略） |

## 3. 质量门禁（可执行）

在仓库根目录执行：

```bash
corepack pnpm verify:frontend:mvp
```

该脚本串行执行：

1. `lint:web`
2. `lint:admin`
3. `typecheck:web`
4. `typecheck:admin`
5. `test:http-client`
6. `test:web`
7. `test:admin`
8. `e2e:web`

## 4. E2E 冒烟范围

当前 `web` 冒烟用例覆盖：

1. 登录页面可达与提交动作可触发（`/login`）
2. 资源列表页面可达与状态渲染（`/resource/list`）
3. 匹配页面可达与发起动作可触发（`/match/list`）

## 5. 残余风险与后续动作

1. 当前 E2E 以可用性冒烟为主，真实业务断言仍依赖后端稳定联调数据。
2. `admin` 暂无 Playwright 冒烟，建议在下阶段补齐后台端到端脚本。
3. 合规相关（实名/风控）当前仅做前端边界约束，需与后端策略联测后再签收。
