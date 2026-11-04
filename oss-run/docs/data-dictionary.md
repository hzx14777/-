# 数据字典（约束规范 §9）

本平台所有接口出参、存储对象均遵循统一数据字典。

## 9.1 基础字段

所有业务对象（user / admission / exam / record / paper / question / course / audit_log / event / outbox_item / inbox_item）均包含：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 业务主键，字母前缀 + 数字（如 `u1001`、`e3001`、`r5001`），全局唯一、不可变 |
| createdAt | string | 创建时间，ISO 8601 带时区，固定东八区格式 `2026-11-03T10:00:00+08:00` |
| updatedAt | string | 最近更新时间，同上格式 |
| createdBy | string \| null | 创建人 userId |
| updatedBy | string \| null | 最近更新人 userId |
| status | string | 状态码，英文小写下划线，见下方字典 |

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

### 试卷 paper.status / 考试 exam.status

| 状态 | 含义 |
| --- | --- |
| draft | 草稿（工作台第三步保存未发布） |
| published | 已发布，学生可见可考 |
| archived | 已归档（考试结束，不再接受作答） |

### 题目 question.status

| 状态 | 含义 |
| --- | --- |
| active | 可用 |
| disabled | 已停用（不出现在组卷池） |

### 用户 user.status

| 状态 | 含义 |
| --- | --- |
| active | 在册可用 |
| disabled | 已停用（SSO 登录被拒） |

### 出站事件 outbox_item.status（§11.4 失败留痕）

| 状态 | 含义 |
| --- | --- |
| pending | 待投递 |
| delivered | 已成功投递至事件总线 |
| skipped | 未配置事件总线，跳过投递（payload 已留痕） |
| failed | 投递失败（含 lastError，可经管理端重试） |

### 入站事件 inbox_item.status

| 状态 | 含义 |
| --- | --- |
| processed | 已消费 |
| duplicate | 重复事件（eventId 已存在，幂等跳过） |
| ignored | 不支持的事件类型，留痕不处理 |

## 9.4 统一枚举来源

- 角色固定为 `student / teacher / admin`（§8），来自 SSO 用户 `roles` 字段，本平台不自建角色。
- `sourcePlatform` 固定为 `exam`（本平台 appCode）。
- 权限点格式为 `资源:动作`，全量清单见 README「角色与权限点」一节。
