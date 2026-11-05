# 警院智慧考试平台（五平台体系 · 考试平台）

> 本平台是「警院 WeChat 五平台」中的**考试平台**，按《五平台前端与功能联动约束规范 V1.0》实现：
> 统一技术基线（React + TS + Vite + AntD5 + GSAP）、论坛统一认证（SSO）、统一角色与权限点、
> 统一响应/错误码/分页、统一数据字典与业务事件。

- 访问入口：`http://127.0.0.1/yj/login`（局域网 `http://<本机IP>/yj/login`）
- 技术栈：前端 React 18 + TypeScript + Vite 5 + Ant Design 5 + GSAP 3；后端 Node 22 零依赖 HTTP 服务 + JSON 存储
- 部署形态：单进程同源托管，`yj-bff` 同时提供静态页面与 `/yjapi` 接口，默认 80 端口

## 目录结构

```
oss-run/
├─ exam-front-react/           # 前端（唯一正式前端，§4 技术基线 React18 + TS + Vite5 + AntD5 + GSAP3）
│  ├─ src/
│  │  ├─ api/                  # request.ts 统一请求封装（信封/续期/错误码/requestId）、index.ts 接口清单
│  │  ├─ components/           # 公共基础组件：PageContainer / Section / PageLoading / PageEmpty /
│  │  │                        #   ErrorResult(403·404·500) / StatusTag / StatCard / DataTable
│  │  ├─ constants/            # dictionary.ts 统一状态字典（§9.3）、theme.ts 主题令牌（§5.1）
│  │  ├─ contexts/session.tsx  # 会话与权限点上下文（§7.3/§8.2）
│  │  ├─ layouts/AppShell.tsx  # 统一外壳：菜单、路由守卫、403 拦截（§5.1/§8.2/§12）
│  │  ├─ routes.tsx            # 路由 + 菜单 + 权限点单一数据源
│  │  ├─ types/api.ts          # 统一类型：响应信封、分页、认证字段、错误码
│  │  ├─ utils/                # format.ts 时间/分数/作答格式化、motion.ts GSAP 动效、paper.ts 试卷导出
│  │  ├─ env.ts                # §14 环境变量唯一读取入口
│  │  ├─ App.tsx               # 路由装配（登录/回调/外壳/404）
│  │  └─ pages/                # 14 个业务页面
│  └─ .env.{development,test,staging,production}   # §14 四套环境配置
├─ yj-bff/                     # 后端适配服务
│  ├─ server.js                # 路由、SSO、权限、事件、静态托管
│  ├─ engine.js                # 判分 / 双达标 / 命题引擎
│  ├─ seed.js                  # 演示数据
│  └─ data/db.json             # 数据文件（删除后重启即恢复种子）
├─ exam-front/                 # 旧 Vue3 前端（仅存档，不再参与构建，勿用于新开发）
├─ demo/                       # HTML 功能 Demo（§4.6）
├─ docs/                       # OpenAPI、数据字典、事件清单、SSO 配置、环境变量、整改记录
├─ start-platform.bat          # 启动（优先计划任务，无 node 环境也可用）
├─ stop-platform.bat
├─ build-front.bat             # 重建前端产物
├─ check-env.bat               # 一屏自检
└─ install-autostart.bat       # 注册/移除登录自启
```

## 职责边界（§3）

| 本平台负责 | 本平台不负责（由其他平台提供） |
| --- | --- |
| 随堂测试、专项考试、项目准入判定、成绩与错题本 | 课程 / 章节 / 知识点内容维护（自学平台） |
| 题库、组卷、试卷审核、考试发布、阅卷与统计 | 学习积分、答疑与公告（论坛平台） |
| 考试通过状态对外提供（`exam.passed` / `exam.failed`） | 项目过程与里程碑管理（实训工坊）、作品展示（成果广场） |

课程目录在本平台仅作只读引用：`GET /api/v1/catalog` 可用，写接口已下线并返回 `FORBIDDEN`（2026-11-04 整改）。


## 快速开始

```bat
cd oss-run
install-autostart.bat     :: 可选：注册登录自启（计划任务 YJ-Exam-Platform）
start-platform.bat        :: 启动并打开 http://127.0.0.1/yj/login
check-env.bat             :: 出问题时先跑这个
build-front.bat           :: 改过前端代码后必须重建 dist
```

## 统一登录（§7）

本平台**不提供账号密码登录**，登录流程固定为授权码模式：

1. 打开 `/yj/login` → 点击「前往统一认证中心登录」；
2. 浏览器跳到认证中心 `/sso/oauth/authorize`（`YJ_SSO_MODE=mock` 时为本服务内置的联调 Mock）；
3. 选择身份并授权 → 回调 `/yj/sso/callback?code=&state=`；
4. 前端把授权码交回 `POST /api/v1/sso/exchange`，**由服务端**换取令牌并读取统一用户信息；
5. 服务端建立本地短期会话（Access Token 2 小时 / Refresh Token 7 天，轮换制），前端只持有短期凭证；
6. 退出时清理本地会话，并按 `endSessionUrl` 退出认证中心。

生产接入只需改配置（`YJ_SSO_MODE=real` + `YJ_SSO_BASE_URL` / `YJ_SSO_CLIENT_ID` / `YJ_SSO_CLIENT_SECRET`），代码无需改动。

## 角色与权限点（§8）

| 角色 | 权限点 |
| --- | --- |
| `student` | `course:read` `chapter:read` `exam:read` `exam:submit` `record:read` `wrongbook:manage` `admission:read` |
| `teacher` | 学生全部 + `exam:grade` `question:read` `question:create` `question:review` `exam:manage` `stats:read` `job:manage` |
| `admin` | 教师全部 + `audit:read` `event:read` `outbox:manage` `user:read` |

前端菜单/路由按权限点隐藏与拦截至 403 页；**接口侧同时校验**，直接改地址或伪造 Token 均无法访问（§16.1）。

## 对外接口与联动（§10/§11）

- 统一响应：`{ code, message, data, requestId }`；错误码 `VALIDATION_ERROR / AUTH_REQUIRED / AUTH_TOKEN_EXPIRED / FORBIDDEN / NOT_FOUND / CONFLICT / BUSINESS_ERROR / SERVICE_UNAVAILABLE / INTERNAL_ERROR`
- 分页：请求 `page/pageSize`，响应 `{ items, page, pageSize, total }`
- 出站事件：`exam.passed` / `exam.failed`（统一信封 + 出站留痕，可人工重放）
- 入站事件：`POST /api/v1/events`（`X-Platform-Key` 校验 + `eventId` 幂等）
- 公开查询：`GET /api/v1/public/exam-pass?userId=` 供实训工坊判断项目准入

接口细节见 `docs/openapi.yaml`，事件与 SSO 配置见 `docs/events.md`、`docs/sso.md`。

## 环境变量（§14）

前端 `VITE_API_BASE_URL` `VITE_SSO_BASE_URL` `VITE_FILE_BASE_URL` `VITE_EVENT_BASE_URL` `VITE_APP_CODE` `VITE_ENV`；
后端 `YJ_PORT` `YJ_SSO_MODE` `YJ_SSO_BASE_URL` `YJ_SSO_CLIENT_ID` `YJ_SSO_CLIENT_SECRET` `YJ_EVENT_BASE_URL` `YJ_PLATFORM_KEY`。
完整说明见 `docs/environments.md`，业务代码中不存在写死的服务地址。

## 已知边界

- 数据存储为 `yj-bff/data/db.json`（单机演示够用），生产建议按 `docs/data-dictionary.md` 平移 MySQL；
- AI 命题为本地规则引擎（模板 + 正文抽取 + 自检 + 相似度判重），未调用真实大模型；
- Mock 认证中心仅用于联调，生产必须指向论坛平台的认证服务；
- 文件上传与统一文件服务尚未接入（`VITE_FILE_BASE_URL` 已预留）。
