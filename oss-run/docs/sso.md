# SSO 接入说明（约束规范 §2、§7）

## 2.1 原则

- 本平台**不自建账号密码体系**：已删除原 `/api/v1/auth/login` 密码登录接口，登录唯一入口是统一认证中心（OAuth 2.1 授权码模式）。
- 用户身份（userId / studentNo / realName / roles / permissions / organizationId / classId）全部来自认证中心，本平台不维护密码、不注册用户。

## 7.1 授权流程

```
浏览器 → GET {认证中心}/authorize?response_type=code
         &client_id={YJ_SSO_CLIENT_ID}
         &redirect_uri={本平台}/yj/sso/callback
         &state={随机state}
       → 用户登录并同意授权
       → 302 回 {redirect_uri}?code=xxx&state=xxx
前端 SsoCallback → POST /api/v1/sso/exchange {code, state}
       → BFF 校验 state → POST {认证中心}/token（换 access_token + refresh_token）
       → GET {认证中心}/userinfo（拉取统一用户）
       → 建本地会话（HttpOnly Cookie，aud=exam）→ 审计留痕
```

## 7.2 环境配置

| 环境变量 | 说明 |
| --- | --- |
| YJ_SSO_MODE | `mock`（内置 Mock 认证中心，联调默认）/ `real`（对接真实认证中心） |
| YJ_SSO_BASE_URL | 认证中心基地址（real 模式必填） |
| YJ_SSO_CLIENT_ID | OAuth client_id |
| YJ_SSO_CLIENT_SECRET | OAuth client_secret（仅存服务端） |

## 7.3 用户字段映射

认证中心 `/userinfo` 返回 → 本平台 `/api/v1/me`：

| 约束字段 | 本平台字段 | 说明 |
| --- | --- | --- |
| userId | id | 全局唯一用户 ID |
| studentNo | studentNo | 学号 |
| realName | realName | 姓名 |
| roles | roles | `student / teacher / admin` 数组 |
| permissions | permissions | 平台按 §8 角色权限点表映射后返回 |
| organizationId | organizationId | 院系/组织 ID |
| classId | classId | 班级 ID |

## 7.4 Token 与会话安全

- `code` 一次性使用，`state` 服务端签发校验（防 CSRF）。
- access_token 默认 2h、refresh_token 默认 7d（`YJ_JWT_TTL_H / YJ_REFRESH_TTL_D` 可调）。
- `POST /api/v1/sso/refresh` 轮换 access_token（旧 token 立即失效）。
- 登出：清除本地会话 + 跳转认证中心 `end_session_url`。

## 7.5 Mock 认证中心

`YJ_SSO_MODE=mock` 时，BFF 内置 `/sso-mock` 认证中心页面（selectable 身份：张予安/陈立群/管理员）+ `/sso-mock/authorize|token|userinfo` 协议端点，用于无认证中心环境下的联调与演示。生产部署时设置 `YJ_SSO_MODE=real` 即切换。
