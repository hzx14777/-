# 变更记录（约束规范 §15 联调问题与变更记录、§18 规范变更规则）

## V1.2 · 2026-11-05 · 规范符合性复核整改

**触发依据**：按《五平台前端与功能联动约束规范 V1.0》逐条复核，重点为 §7.2/§7.4 认证凭证、§8.2 数据范围、§9.2 时间格式、§10.4 接口文档、§11.3 事件名称、§14 密钥与环境。

### 一、认证与凭证（§7.2.4 / §7.4 / §14）

| # | 问题 | 位置 | 处理 |
| --- | --- | --- | --- |
| 1 | 刷新令牌（7 天）存 `localStorage`，前端持有长期凭证 | `src/api/request.ts` | 改为服务端 `Set-Cookie: yj_rt=...; HttpOnly; SameSite=Lax; Max-Age=604800`；响应体不再返回 refreshToken；前端只把 2h 的 access token 放 `sessionStorage`，新标签页靠 Cookie 静默续期 |
| 2 | 回调地址无白名单，任意 `redirect_uri` 都能拿到授权码 | `server.js` `ssoMock` authorize/consent | 新增 `isAllowedRedirect()`，仅放行 `YJ_SSO_REDIRECT_PATH`（默认 `/yj/sso/callback`）+ 同源或 `YJ_SSO_REDIRECT_HOSTS` 主机；换票时校验 redirect_uri 与授权时一致 |
| 3 | 会话签名密钥硬编码 `yj-exam-platform-2026` | `server.js` 顶部 `SECRET` | 改为 `YJ_SESSION_SECRET` → `data/.session-secret`（首次启动随机生成，0600，已加入 .gitignore） |
| 4 | 退出登录未带 token 时会把**所有人**的会话置为 revoked | `POST /api/v1/auth/logout` | 只注销本次请求携带的令牌，并下发清除 Cookie |
| 5 | CORS 固定 `Access-Control-Allow-Origin: *` | `json()` | 改为按 `YJ_CORS_ORIGINS` 精确回显 Origin + `Allow-Credentials`；同源部署不下发 CORS 头 |
| 6 | 登录跳转参数 `redirect` 未校验，可被拼成外部地址 | `GET /api/v1/sso/url` | 只接受站内相对路径 |

### 二、权限与数据范围（§8.1 / §8.2）

| # | 问题 | 位置 | 处理 |
| --- | --- | --- | --- |
| 7 | `POST /api/v1/attempts/{id}/events` 无归属校验，可写他人答卷 | `server.js` | 增加 `a.userId !== me.id && role==='student' → FORBIDDEN` |
| 8 | `POST /api/v1/attempts/{id}/submit` 无归属校验，可替他人交卷 | `server.js` | 同上 |
| 9 | `GET /api/v1/attempts/{id}/result` 无归属校验，可查他人成绩单 | `server.js` | 同上（教师/管理员保留查询权，用于阅卷与统计） |
| 10 | 审计记录里出现第四种角色编码 `system` | `audit()` + 历史数据 | 拆出 `actorType`（`user`/`system`），`role` 只保留三个可登录角色；前端角色列按 `actorType` 显示「系统」；`constants/dictionary.ts` 的 `ROLE` 字典同步删除 `system` |

### 三、数据与接口（§9.2 / §9.3 / §10.4 / §11.3）

| # | 问题 | 位置 | 处理 |
| --- | --- | --- | --- |
| 11 | `iso()` 用服务器本地时钟 + 硬编码 `+08:00`，云上 UTC 会把时刻标错 | `server.js` | 改为先按 +8h 偏移再取 UTC 字段，任何时区部署输出同一时刻 |
| 12 | 交卷写入 `exam.submitted` 事件，不在 §11.3 清单内 | `submit` 处理器、`meta.eventTypes`、`dictionary.ts` | 交卷只落审计日志；`events` 表按白名单过滤历史遗留；字典与 `meta` 只保留 `exam.passed / exam.failed / course.completed` |
| 13 | `docs/events.md` 记载的 `GET /api/v1/admin/outbox` 未实现 | `server.js` | 补齐接口（权限点 `outbox:manage`，分页） |
| 14 | 分类维护写接口（`POST /catalog/courses|chapters|kps`）为不可达死代码，且违反 §3 | `server.js` | 删除 162 行死代码，保留 `GET /api/v1/catalog` 只读 + 非 GET 统一 `FORBIDDEN` |
| 15 | OpenAPI 缺 20 个已实现操作（AI 命题/题库、文档库、发布管理、课程、错题标记、出站队列） | `docs/openapi.yaml` | 补齐至 47 个路径，含参数、权限点、状态值与错误码；事件枚举去掉 `exam.submitted` |
| 16 | 数据字典与实现不符（题目/准入/出站/入站状态、用户状态、ID 示例） | `docs/data-dictionary.md` | 按实现重写各状态表；说明用户状态由认证中心维护、`actorType` 非角色 |
| 17 | 登录换票后 `setUserPerms()` 用本地角色表覆盖认证中心下发的 permissions（§7.1 不得自行解释角色编码） | `server.js` `setUserPerms` / `sso/exchange` | 认证中心返回的 `roles` / `permissions` 为准，仅在缺失时按 §8.2 角色表兜底 |
| 18 | `/api/v1/meta` 的 `statusDict` 只有 13 项，缺 `approved/used/expired/delivering/...` | `server.js` `meta` | 补齐为 21 项，与 `data-dictionary.md` 一致 |

### 四、工程规范（§4.2）

- `eslint src` 由 2 error 修到 0 error（未使用变量、三元表达式语句化），保持 14 条 `react-hooks` 提示不改语义。

### 五、验证

- `tsc --noEmit` 通过、`eslint src` 0 error、`vite build` 通过；
- 登录闭环：登录 → 新标签页免登录续期 → 退出后 Cookie 清除，浏览器控制台 **0 报错**；
- 越权用例：学生读他人成绩单 / 写他人答卷事件均返回 `FORBIDDEN`；
- 白名单用例：`redirect_uri=http://evil.example.com/steal` 返回 `VALIDATION_ERROR`；
- 三角色 14 个页面巡检控制台 0 报错；`data/db.json` 中 `exam.submitted` 残留 0 条、审计 `role` 仅三类。

### 六、遗留（§15 待评审）

1. 新增 `actorType` 字段与 `offline/archived/revoked/expired` 等状态码，需在架构评审中并入统一数据字典；
2. 多实例部署时 `YJ_SESSION_SECRET` 必须显式配置为同一值（当前会话以内存态存储，仅支持单实例）。

## V1.1 · 2026-11-04 · 按《五平台前端与功能联动约束规范 V1.0》整改

**触发依据**：规范 §2 项目总体原则、§3 五个平台职责边界、§5.1 视觉与交互统一、§9.3 状态字典、§12 公共前端基础能力、§14 环境配置。

### 一、删除的越界功能

| # | 删除项 | 原实现位置 | 依据 | 处理方式 |
| --- | --- | --- | --- | --- |
| 1 | 课程 / 章节 / 知识点维护（新增·重命名·删除） | `DocLib` 页「分类维护」页签、分类树行内操作按钮、分类弹窗 | §3：课程内容维护不属考试平台，属自学平台 | 前端整块移除；`api/index.ts` 删除 9 个写接口；后端 `POST/PATCH/DELETE /api/v1/catalog/**` 统一返回 `FORBIDDEN`；`catalog:manage` 权限点从角色表移除 |
| 2 | 学习积分（学生积分展示与累计） | 考试大厅第 4 张统计卡、准入资格页「学习积分」区块 | §3：积分属论坛平台职责 | 前端两处展示移除；后端 `/me`、`/hall.stats`、`/admissions` 不再返回 `points`；准入发放不再累加积分 |
| 3 | 前端硬编码平台密钥 `platformKey()` | `api/request.ts` 导出函数（未被使用） | §14：生产不得输出敏感信息 | 直接删除，平台间密钥只存在于服务端 |
| 4 | 后端「试卷状态直出英文」与页面内自建状态表 | `Manage`、`DocLib`、`AiBank`、`Publish`、`Admission`、`Audit`、`Result`、`ExamDetail` 各自维护的 `*_LABEL/*_COLOR/REVIEW_META` | §9.3：状态统一英文编码 + 字典映射中文 | 收敛为 `constants/dictionary.ts` 单一字典，页面改用 `StatusTag` |

### 二、前端统一的具体做法

| 维度 | 做法 |
| --- | --- |
| 目录结构 | 新增 `components/ constants/ contexts/ layouts/ types/ utils/`；`motion.ts`、`paper.ts` 迁入 `utils/`，`session.tsx` 迁入 `contexts/`；根目录只保留 `App.tsx`、`routes.tsx`、`main.tsx`、`env.ts`、`styles.css` |
| 路由与菜单 | 新增 `routes.tsx` 作为「路由 + 菜单 + 权限点」单一数据源；`layouts/AppShell.tsx` 统一承载外壳、403 拦截与登录跳转，删除 `App.tsx` 中逐条手写路由 |
| 公共组件 | `PageContainer`（标题/说明/操作区）、`Section`（内容区块）、`PageLoading`（加载）、`PageEmpty`（空态）、`ErrorResult`（403/404/500，含 requestId 展示）、`StatusTag`（字典驱动）、`StatCard`（统计卡）、`DataTable`（分页/空态/尺寸统一） |
| 命名 | 组件 PascalCase、工具 camelCase、字典常量全大写下划线；接口函数动词开头（`setAiBankStatus` / `reviewPublishDoc`）；移除 `fmt`、`formatAns`、`fmtAnswer` 三套同义实现，统一 `formatAnswer` |
| 展示规则 | 时间统一 `formatDateTime`（`YYYY-MM-DD HH:mm`，不再手写 `replace('T',' ').slice(0,16)`）；分数 `formatScore`（整数不带小数）；比率 `formatPercent`；时长 `formatDuration` |
| 交互 | 危险操作（下架考试、删除试卷/考试）统一二次确认；AI 任务轮询统一 60 次上限与卸载清理；错误提示统一带 `requestId`；表格分页统一「共 N 条」 |
| 主题 | 主题令牌收敛到 `constants/theme.ts`（颜色/圆角/字体/表格与卡片默认行为），页面不再零散覆盖公共组件样式 |
| 环境 | 新增 `.env.test`、`.env.staging`，四套环境齐备；新增 `src/env.ts` 作为唯一读取入口；`vite.config.ts` 代理目标改为读环境变量；新增 `build:test` / `build:staging` 脚本 |

### 三、修复的缺陷

1. `Audit.tsx` 用 `useState(() => { load(); })` 触发请求（在渲染期产生副作用），改为 `useEffect`；
2. 审计与事件的表格分页点击后不重新请求，改为按页拉取；
3. `Manage` 试卷状态列直接输出 `published` / `draft` 英文字符串，改为中文标签；
4. 多个页面缺空态（错题本、准入资格、阅卷队列），补齐统一空态与引导操作；
5. 文档 `docs/environments.md` 记录的变量（`VITE_SSO_AUTH_URL`、`VITE_EVENT_WS_URL`、`VITE_API_BASE_URL=/api`）与实际代码不符，已按现状重写。

### 四、影响与验证

- 影响接口：`/api/v1/catalog/**`（写操作 403）、`/api/v1/me`、`/api/v1/hall`、`/api/v1/admissions`（去掉 `points`）；
- 影响权限点：删除 `catalog:manage`（管理员权限中不再包含），其余权限点不变；
- 验证方式：`tsc --noEmit` 通过、`eslint` 0 error、`vite build` 通过；`pw/yj-spec-verify.js` 覆盖 SSO 登录、10 个页面渲染、菜单权限、统一 404、未登录跳转、越界功能下线、状态中文化，18 项全部 PASS，浏览器控制台 0 报错。

### 五、遗留与待评审（§15）

1. 课程目录的正式来源需由自学平台提供公开 API，当前仍读取本平台内置演示数据；
2. 文件上传（§13）尚未接入统一文件服务，`VITE_FILE_BASE_URL` 仅预留；
3. 新增状态码（`answering/submitted/graded/offline/used`）已登记在 `constants/dictionary.ts` 与 `data-dictionary.md`，需在架构评审中确认是否并入统一字典。
