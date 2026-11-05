# 数据字典（约束规范 §9）

本平台所有接口出参、存储对象均遵循统一数据字典。

## 9.1 基础字段

### 9.1.1 业务对象

业务对象（user / course / chapter / question / paper / exam / record / admission / document / job）均包含：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 业务主键，字母前缀 + 下划线/短横线编号（如 `u_stu1`、`e_py_ch1`、`att_seed_01`），全局唯一、不可变 |
| createdAt | string | 创建时间，ISO 8601 带时区，固定东八区格式 `2026-11-03T10:00:00+08:00` |
| updatedAt | string | 最近更新时间，同上格式 |
| createdBy | string \| null | 创建人 userId |
| updatedBy | string \| null | 最近更新人 userId |
| status | string | 状态码，英文小写下划线，见下方字典（用户对象除外，见 9.3 说明） |

> `user` 是本平台对认证中心身份的本地投影，状态由认证中心维护，故不带 `status`。

### 9.1.2 流水与事件记录

审计、事件、出站/入站队列属于流水记录，按各自信封定义字段，不套用业务对象的 `createdAt/updatedAt/createdBy/updatedBy`：

| 记录 | 字段 |
| --- | --- |
| 审计 audit_log | `id`、`at`（ISO 8601）、`actor`、`role`（仅 student/teacher/admin，系统动作为空）、`actorType`（user/system）、`action`、`target`、`detail` |
| 业务事件 event | `eventId`、`eventType`、`occurredAt`（ISO 8601）、`sourcePlatform`、`operatorId`、`data`（§11.3 信封） |
| 出站 outbox_item | `eventId`、`eventType`、`target`、`status`、`attempts`、`lastAt`、`lastError`、`payloadDigest`、`createdAt` |
| 入站 inbox_item | `eventId`、`eventType`、`occurredAt`、`sourcePlatform`、`operatorId`、`receivedAt`、`status` |

## 9.2 时间规范

- 所有时间字段为 **ISO 8601 带时区**，服务端统一输出 `YYYY-MM-DDTHH:mm:ss+08:00`（东八区）。
- 前端展示使用 `dayjs` / `dayjs().format('YYYY-MM-DD HH:mm')`，不做时区换算（平台仅面向境内使用）。

## 9.3 状态值字典（英文状态码）

### 考试记录 record.status

| 状态 | 含义 |
| --- | --- |
| answering | 答题中（已开始未交卷） |
| submitted | 已交卷，待阅卷确认 |
| graded | 已阅卷确认，成绩已发布 |

### 准入资格 admission.status

| 状态 | 含义 |
| --- | --- |
| active | 资格有效（双达标通过后授予） |
| used | 已用于对应课程考试 |
| revoked | 已撤销（违规或人工收回） |
| expired | 已过期（超出有效期） |

### 试卷 paper.status / 考试 exam.status

| 状态 | 含义 |
| --- | --- |
| draft | 草稿（工作台第三步保存未发布） |
| published | 已发布，学生可见可考 |
| archived | 已归档（考试结束，不再接受作答） |

### 试卷文档 document.reviewStatus（文档库 → 发布审核）

| 状态 | 含义 |
| --- | --- |
| pending | 待审核 |
| approved | 审核通过，可发布为考试 |
| rejected | 已驳回（含 reviewNote 驳回原因） |

### 题目 question.status

| 状态 | 含义 |
| --- | --- |
| published | 已上架，可进入组卷与命题候选池 |
| offline | 已下架（保留历史引用，不再进入组卷池） |
| archived | 已归档（长期不再使用） |

### 用户 user.status

本平台不持有用户状态：账号启停由论坛统一认证中心维护（§2.2 / §7.1），本平台只缓存身份投影（`userId / studentNo / realName / roles / permissions / organizationId / classId`）。登录时若认证中心判定账号禁用，本平台直接拒绝建立会话。

### 命题任务 job.status（对外）

| 状态 | 含义 |
| --- | --- |
| in_progress | 命题中（含排队、抽取正文、生成候选） |
| completed | 已完成（候选已产出，可进入审核） |

> 内部持久化另有 `running / done / reviewed` 三个中间取值，接口出口统一经 `jobStatusOut()` 归并为上面两个值。

### 出站事件 outbox_item.status（§11.4 失败留痕）

| 状态 | 含义 |
| --- | --- |
| pending | 待投递 |
| delivering | 投递中（已发起，等待响应） |
| delivered | 已成功投递至事件总线 |
| skipped | 未配置事件总线，跳过投递（payload 已留痕） |
| failed | 投递失败（含 lastError，可经管理端重试） |

### 入站事件 inbox_item.status

| 状态 | 含义 |
| --- | --- |
| processed | 已消费 |
| duplicate | 重复事件（eventId 已存在，幂等跳过；接口返回 `duplicate: true`，不新增记录） |
| ignored | 不支持的事件类型，留痕不处理 |
| ignored_user_not_found | 事件里的 userId 在本平台不存在，留痕不处理 |

## 9.4 统一枚举来源

- 角色固定为 `student / teacher / admin`（§8），来自 SSO 用户 `roles` 字段，本平台不自建角色。
- 审计记录另带 `actorType`（`user` / `system`）：系统自动动作（如消费 `course.completed` 后解锁章节）不是角色，`role` 留空、`actorType=system`，不参与任何权限判定，也不在角色字典中登记。
- `sourcePlatform` 固定为 `exam`（本平台 appCode）。
- 权限点格式为 `资源:动作`，全量清单见 README「角色与权限点」一节。
- **前端唯一字典实现**：`exam-front-react/src/constants/dictionary.ts`（中文名 + Tag 语义色）。接口只传英文编码，页面一律经该字典或 `StatusTag` 组件展示，不得在页面内新增临时映射表。

## 9.5 已下线字段（2026-11-04 整改）

| 字段 | 原用途 | 下线原因 |
| --- | --- | --- |
| `points` | 学生学习积分（考试通过后累加） | §3 积分属论坛平台职责；`/me`、`/hall.stats`、`/admissions` 已不再返回 |
| 权限点 `catalog:manage` | 课程 / 章节 / 知识点维护 | §3 课程内容维护属自学平台；本平台仅只读引用 `GET /api/v1/catalog` |

