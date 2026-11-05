# 变更记录（约束规范 §15 联调问题与变更记录、§18 规范变更规则）

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
