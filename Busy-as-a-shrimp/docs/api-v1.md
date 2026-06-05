# API V1（初始骨架）

Base URL: `/api/v1`

## 用户模块

- `POST /user/register`
- `POST /user/login`
- `POST /user/verify-identity`
- `GET /user/info`
- `PUT /user/info`
- `PUT /user/role`

## 资源模块

- `POST /resource/upload`
- `GET /resource/list`
- `PUT /resource/:id`
- `DELETE /resource/:id`
- `GET /resource/tags`

## 匹配模块

- `POST /match/run`
- `GET /match/list`
- `POST /match/:id/confirm`

## 团长模块

- `GET /captain/info`
- `GET /captain/ranking`
- `GET /captain/commissions`
- `POST /captain/withdraw`
- `GET /captain/stats`

## 管理后台模块

- `POST /admin/login`
- `GET /admin/me`
- `GET /admin/users`
- `PUT /admin/users/:id/status`
- `GET /admin/resources`
- `PUT /admin/resources/:id`
- `GET /admin/stats`
- `POST /admin/announce`
- `GET /admin/announcements`
- `GET /admin/captain/ranking`
- `PUT /admin/captain/:id/level`
