# 环境变量说明（约束规范 §4.4、§14）

## 前端（Vite，exam-front-react/）

文件：`.env.development` / `.env.production`，命名统一 `VITE_` 前缀：

| 变量 | development | production | 说明 |
| --- | --- | --- | --- |
| VITE_API_BASE_URL | `/api` | `/api` | API 基地址（生产同源，走 BFF） |
| VITE_APP_CODE | `exam` | `exam` | 平台标识 |
| VITE_SSO_AUTH_URL | `http://127.0.0.1/api/v1/sso-mock/authorize` | `/api/v1/sso-mock/authorize` | 认证中心授权页地址 |
| VITE_SSO_CLIENT_ID | `yj-exam-platform` | `yj-exam-platform` | OAuth client_id |
| VITE_SSO_REDIRECT_URI | `http://127.0.0.1/yj/sso/callback` | `/yj/sso/callback` | 授权回调地址 |
| VITE_EVENT_WS_URL | （空） | （空） | 预留：事件推送通道 |

前端代码中一律经 `import.meta.env.VITE_*` 读取，类型声明见 `src/vite-env.d.ts`，不硬编码环境相关值。

## 后端（yj-bff，YJ_ 前缀）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| YJ_PORT | 80（占用降 8090） | 服务端口 |
| YJ_DB_PATH | `data/db.json` | JSON 存储路径 |
| YJ_DIST_PATH | `../exam-front-react/dist` | 前端静态资源目录 |
| YJ_APP_CODE | `exam` | 平台标识（sourcePlatform） |
| YJ_SSO_MODE | `mock` | `mock` / `real` |
| YJ_SSO_BASE_URL | — | 认证中心基地址（real 必填） |
| YJ_SSO_CLIENT_ID | `yj-exam-platform` | OAuth client_id |
| YJ_SSO_CLIENT_SECRET | — | OAuth client_secret |
| YJ_JWT_SECRET | 内置开发密钥 | 会话签名密钥（生产必改） |
| YJ_JWT_TTL_H | `2` | access_token 有效期（小时） |
| YJ_REFRESH_TTL_D | `7` | refresh_token 有效期（天） |
| YJ_EVENT_BASE_URL | — | 事件总线基地址（不配则事件 skipped 留痕） |
| YJ_EVENT_INGEST_PATH | `/ingest` | 事件总线投递路径 |
| YJ_FILE_DIR | `data/files` | 上传文件目录（预留） |

所有变量均可在 `yj-bff/config.json` 中以同名（去前缀）键覆盖，优先级：环境变量 > config.json > 默认值。

## 构建与运行

- 前端构建：`oss-run/build-front.bat`（输出 `exam-front-react/dist`，改前端后必须重建）
- 启停：`oss-run/start-platform.bat` / `stop-platform.bat`
- 环境自检：`oss-run/check-env.bat`
