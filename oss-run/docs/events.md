# 跨平台业务事件清单（约束规范 §11）

## 11.1 事件信封

所有出站/入站事件均为统一信封：

```json
{
  "eventId": "evt-169f0a2b3c",
  "eventType": "exam.passed",
  "occurredAt": "2026-11-03T10:00:00+08:00",
  "sourcePlatform": "exam",
  "operatorId": "u1001",
  "data": { "...": "..." }
}
```

- `eventId` 全局唯一，消费方以此做幂等（本平台 inbox 以 eventId 判重）。
- `occurredAt` 为 ISO 8601 带时区时间。
- `sourcePlatform` 标识产生方：`exam`（考试平台）/ `forum` / `selfstudy` / `workshop` / `plaza`。

## 11.2 本平台生产的事件

### exam.passed —— 考试双达标通过

触发时机：阅卷确认（成绩发布）且判定为双达标（考试分 ≥60 且 ≤3 次防作弊违规）。

`data` 载荷：

```json
{
  "examId": "e3001",
  "recordId": "r5001",
  "userId": "u1001",
  "studentNo": "2024010101",
  "admissionId": "ad2001",
  "score": 88,
  "passed": true,
  "violationCount": 0
}
```

联动效果：对应课程的自学进度视为达标（其他平台消费后回写）。

### exam.failed —— 考试未通过

触发时机：阅卷确认且判定不达标（分数 <60，或违规 >3 次）。

`data` 载荷：同上（`passed: false`，含 `failReason`：`low_score` / `too_many_violations`）。

联动效果：消费方可推送补学任务；不产生准入资格。

## 11.3 本平台消费的事件

### course.completed —— 课程学习完成

来源平台：`selfstudy`（自学平台）。

`data` 载荷：

```json
{ "userId": "u1001", "courseId": "c4001" }
```

处理逻辑：标记该学生该课程学习进度达标（写入 `db.learning`），为「准入资格」中的学习达标维度提供依据。

消费保障：
- **幂等**：eventId 已存在时返回 `duplicate:true`，不重复处理（inbox 留痕）。
- **留痕**：所有入站事件（含不支持类型）均写入 `inbox`，状态 `processed / duplicate / ignored`。

## 11.4 投递机制（Outbox 模式）

- 出站事件先落库 `outbox`（状态 `pending`），再由 `dispatchOutbox()` 异步投递到事件总线 `YJ_EVENT_BASE_URL + YJ_EVENT_INGEST_PATH`。
- 每条 outbox 记录含 `attempts / lastAt / lastError / payloadDigest`，投递失败不丢失业务结果。
- 未配置事件总线时状态记为 `skipped`，载荷完整留痕，可随时补投。
- 管理端重试接口：`POST /api/v1/admin/outbox/retry`（权限点 `outbox:manage`，仅 admin）。
- 查询接口：`GET /api/v1/admin/outbox`（分页）；入站查询 `GET /api/v1/events`（分页）。

## 11.5 平台间调用约定

- 其他平台可通过 `GET /api/v1/public/exam-pass?userId=`（免鉴权只读）获取某学生的 `passedExamIds` 与 `admissions`，供实训工坊解锁实践任务。
- 平台间禁止直接读库，只允许经公开 API 或业务事件联动。
