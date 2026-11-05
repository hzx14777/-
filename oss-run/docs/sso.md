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
       → 建本地会话：access_token 回响应体，refresh_token 写入 httpOnly Cookie → 审计留痕
```

## 7.2 环境配置

| 环境变量 | 说明 |
| --- | --- |
| YJ_SSO_MODE | `mock`（内置 Mock 认证中心，联调默认）/ `real`（对接真实认证中心） |
| YJ_SSO_BASE_URL | 认证中心基地址（real 模式必填） |
| YJ_SSO_CLIENT_ID | OAuth client_id |
| YJ_SSO_CLIENT_SECRET | OAuth client_secret（仅存服务端） |
| YJ_SSO_REDIRECT_PATH | 回调路径白名单，默认 `/yj/sso/callback` |
| YJ_SSO_REDIRECT_HOSTS | 额外允许的回调主机（逗号分隔），同源部署无需配置 |
| YJ_SESSION_SECRET | 会话签名密钥；未配置时首次启动随机生成并落盘到 `yj-bff/data/.session-secret`（不入库） |
| YJ_CORS_ORIGINS | 允许跨域的前端源（逗号分隔）；同源部署留空即可 |

## 7.3 用户字段映射

认证中心 `/userinfo` 返回 → 本平台 `/api/v1/me`：

| 约束字段 | 本平台字段 | 说明 |
| --- | --- | --- |
| userId | userId | 全局唯一用户 ID（本地主键同值存储） |
| studentNo | studentNo | 学号 |
| realName | realName | 姓名 |
| roles | roles | `student / teacher / admin` 数组 |
| permissions | permissions | 平台按 §8 角色权限点表映射后返回 |
| organizationId | organizationId | 院系/组织 ID |
| classId | classId | 班级 ID |

## 7.4 Token 与会话安全

- `code` 一次性使用（5 分钟有效），`state` 服务端签发校验（防 CSRF）；回调地址必须在白名单内，否则拒绝下发授权码（§7.4）。
- access_token 有效期 2 小时，只存 `sessionStorage`（关闭标签页即失效）；refresh_token 有效期 7 天，只以 `HttpOnly + SameSite=Lax` Cookie 承载，前端 JS 读不到、也不落任何本地存储（§7.2.4）。
- `POST /api/v1/sso/refresh` 轮换 refresh_token（旧令牌立即失效，检测重放），响应体只回新的 access_token，新 refresh_token 经 `Set-Cookie` 下发。
- access_token 不写入 URL、不写日志；换票失败只记录状态码与认证中心返回的错误摘要。
- 登出：注销当前会话令牌 → 清除 Cookie → 跳转认证中心 `end_session_url`（Mock 模式回落 `/yj/login`）。

## 7.5 Mock 认证中心

`YJ_SSO_MODE=mock` 时，BFF 内置认证中心页面与协议端点：`/sso/oauth/authorize`（选择身份）、`/sso/oauth/consent`（下发授权码）、`/sso/oauth/token`（换票）、`/sso/oauth/userinfo`（统一用户信息）。生产部署时设置 `YJ_SSO_MODE=real` 即切到论坛统一认证中心。
