# 环境变量说明（约束规范 §4.3、§4.4、§14）

> 本文件与代码保持一致：前端变量以 `src/env.ts` 为唯一读取入口，后端变量以 `yj-bff/server.js` 顶部 `CONFIG` 为准。
> 任何新增/变更变量都必须同时更新本文件（§15 项目负责人维护清单）。

## 1. 前端（Vite，`exam-front-react/`）

### 1.1 四套环境文件

| 环境 | 文件 | 用途 |
| --- | --- | --- |
| 开发 | `.env.development` | 本地 `vite dev`，走 dev server 代理 |
| 测试 | `.env.test` | 联调测试环境（`npm run build:test`） |
| 预发布 | `.env.staging` | 与生产同形态，指向预发布网关（`npm run build:staging`） |
| 生产 | `.env.production` | 生产构建（`npm run build`） |

### 1.2 统一变量（§14 规定的六项，名称不得改写）

| 变量 | 说明 | 取值示例 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 接口基地址，生产与适配服务同源 | `/yjapi` |
| `VITE_SSO_BASE_URL` | 统一认证中心地址 | `/sso` |
| `VITE_FILE_BASE_URL` | 统一文件服务地址（§13 预留） | `/files` |
| `VITE_EVENT_BASE_URL` | 事件总线地址（§11 预留） | `/events` |
| `VITE_APP_CODE` | 平台标识，同时作为 `X-Platform` 取值 | `exam` |
| `VITE_ENV` | 当前环境标识，用于环境自检与生产禁调试 | `development` / `test` / `staging` / `production` |

约定：

1. 业务代码**只允许**通过 `src/env.ts` 读取上述变量；
2. 页面、组件、`api/` 内不得出现写死的域名、端口或 `/yjapi` 字面量；
3. 构建脚本 `build:test` / `build:staging` 已就绪，禁止用 production 配置冒充其他环境。

### 1.3 构建期可选变量

| 变量 | 说明 |
| --- | --- |
| `YJ_DEV_PROXY` | 仅开发态生效，覆盖 `vite.config.ts` 中默认的 `http://127.0.0.1:8090` 代理目标 |

## 2. 后端（`yj-bff`，`YJ_` 前缀）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `YJ_PORT` | `80`（被占用时自动降 `8090`） | 监听端口 |
| `YJ_HOST` | `0.0.0.0` | 监听地址 |
| `YJ_DIST` | `../exam-front-react/dist` | 前端静态产物目录 |
| `YJ_APP_CODE` | `exam` | 平台标识，事件信封 `sourcePlatform` 取值 |
| `YJ_PLATFORM_KEY` | `yj-demo-platform-key` | 平台间入站事件校验密钥（生产必须替换） |
| `YJ_SSO_MODE` | `mock` | `mock`＝内置联调认证中心；`real`＝论坛统一认证 |
| `YJ_SSO_BASE_URL` | `http://127.0.0.1:<PORT>/sso` | 认证中心基地址（`real` 模式必填） |
| `YJ_SSO_CLIENT_ID` | `exam-platform-client` | OAuth client_id |
| `YJ_SSO_CLIENT_SECRET` | `exam-platform-secret` | OAuth client_secret（生产必须替换） |
| `YJ_SSO_REDIRECT_PATH` | `/yj/sso/callback` | 回调地址白名单路径（§7.4），不在此路径的回调一律拒绝下发授权码 |
| `YJ_SSO_REDIRECT_HOSTS` | 空 | 额外允许的回调主机（逗号分隔）；同源部署留空 |
| `YJ_SESSION_SECRET` | 自动生成并落盘 `data/.session-secret` | 会话签名密钥（§14 不硬编码）；多实例部署必须显式配置同一个值 |
| `YJ_CORS_ORIGINS` | 空 | 允许跨域访问的前端源（逗号分隔）；同源部署留空，跨域时不能用 `*`（Cookie 凭证要求精确 Origin） |
| `YJ_EVENT_BASE_URL` | 空 | 事件总线基地址；为空时出站事件标记 `skipped` 并留痕 |
| `YJ_EVENT_INGEST_PATH` | `/api/v1/events` | 事件投递路径 |
| `YJ_FILE_BASE_URL` | 空 | 统一文件服务地址（§13 预留） |

数据文件固定为 `yj-bff/data/db.json`（删除后重启按 `seed.js` 重建演示数据）。

## 3. 环境切换检查清单

1. `VITE_ENV` 与部署环境一致，生产不得出现 `development`；
2. `YJ_SSO_MODE=real` 且 `YJ_SSO_BASE_URL` / `CLIENT_ID` / `CLIENT_SECRET` 指向论坛认证中心；
3. `YJ_PLATFORM_KEY` 已替换为与平台约定一致的密钥；
4. `VITE_*` 与后端同源路径一致（默认 `/yjapi`），否则前端跨域或 404；
5. 改完前端必须重新 `build`（产物 `exam-front-react/dist`），改完后端需重启服务。
