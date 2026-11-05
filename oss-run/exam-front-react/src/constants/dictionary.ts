/**
 * 统一数据字典（约束规范 §9.3 状态字段 / §5.1 状态标签展示规则）
 *
 * 约定：
 * 1. 接口只传英文编码，中文展示一律经本字典映射，页面内不得再写 `{ published: '已发布' }` 之类的临时表；
 * 2. 新增状态必须先更新本文件 + docs/data-dictionary.md（§15），再改实现；
 * 3. 颜色统一取 Ant Design Tag 语义色，保证跨页面观感一致。
 */
import type { RoleCode } from '../types/api';

export interface DictEntry {
  /** 中文展示名 */
  label: string;
  /** Ant Design Tag 语义色 */
  color: string;
}

export type DictKind =
  | 'questionType'
  | 'difficulty'
  | 'questionStatus'
  | 'examType'
  | 'examStatus'
  | 'recordStatus'
  | 'reviewStatus'
  | 'admissionStatus'
  | 'level'
  | 'jobStatus'
  | 'eventType'
  | 'role';

/** 题型（§10.4 与 openapi.yaml 的 enum 保持一致） */
export const QUESTION_TYPE: Record<string, DictEntry> = {
  single: { label: '单选题', color: 'blue' },
  multiple: { label: '多选题', color: 'geekblue' },
  judge: { label: '判断题', color: 'cyan' },
  blank: { label: '填空题', color: 'purple' },
  essay: { label: '简答题', color: 'magenta' }
};

/** 难度 */
export const DIFFICULTY: Record<string, DictEntry> = {
  easy: { label: '简单', color: 'green' },
  medium: { label: '中等', color: 'orange' },
  hard: { label: '困难', color: 'red' }
};

/** 题目状态（AI 题库） */
export const QUESTION_STATUS: Record<string, DictEntry> = {
  published: { label: '已上架', color: 'success' },
  offline: { label: '已下架', color: 'warning' },
  archived: { label: '已归档', color: 'default' }
};

/** 考试类型 */
export const EXAM_TYPE: Record<string, DictEntry> = {
  chapter_quiz: { label: '随堂测试', color: 'blue' },
  skill_exam: { label: '专项考试', color: 'geekblue' },
  admission_exam: { label: '项目准入', color: 'purple' }
};

/** 考试 / 试卷状态（§9.3 draft / published / archived） */
export const EXAM_STATUS: Record<string, DictEntry> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已归档', color: 'warning' }
};

/** 答卷状态 */
export const RECORD_STATUS: Record<string, DictEntry> = {
  answering: { label: '答题中', color: 'processing' },
  submitted: { label: '待阅卷', color: 'warning' },
  graded: { label: '已生效', color: 'success' }
};

/** 审核状态（试卷 → 考试发布） */
export const REVIEW_STATUS: Record<string, DictEntry> = {
  pending: { label: '待审核', color: 'gold' },
  approved: { label: '已通过', color: 'green' },
  rejected: { label: '已驳回', color: 'red' }
};

/** 准入资格状态 */
export const ADMISSION_STATUS: Record<string, DictEntry> = {
  active: { label: '有效', color: 'gold' },
  used: { label: '已使用', color: 'default' },
  revoked: { label: '已撤销', color: 'red' },
  expired: { label: '已过期', color: 'default' }
};

/** 成绩等级 */
export const LEVEL: Record<string, DictEntry> = {
  excellent: { label: '优秀', color: 'gold' },
  pass: { label: '合格', color: 'green' }
};

/** AI 命题任务状态（后端对外统一 in_progress / completed） */
export const JOB_STATUS: Record<string, DictEntry> = {
  in_progress: { label: '命题中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  failed: { label: '已失败', color: 'error' }
};

/** 跨平台业务事件（§11.3 统一事件名称：只登记清单内的事件，新增须先过架构评审） */
export const EVENT_TYPE: Record<string, DictEntry> = {
  'exam.passed': { label: 'exam.passed', color: 'success' },
  'exam.failed': { label: 'exam.failed', color: 'error' },
  'course.completed': { label: 'course.completed', color: 'warning' }
};

/**
 * 角色（§8.1 展示名称，仅三个可登录角色）
 * 审计里的「系统」不是角色，走 actorType 标记，不在此登记（见 Audit 页）。
 */
export const ROLE: Record<RoleCode, DictEntry> = {
  student: { label: '学生', color: 'blue' },
  teacher: { label: '教师', color: 'geekblue' },
  admin: { label: '管理员', color: 'purple' }
};

const DICTS: Record<DictKind, Record<string, DictEntry>> = {
  questionType: QUESTION_TYPE,
  difficulty: DIFFICULTY,
  questionStatus: QUESTION_STATUS,
  examType: EXAM_TYPE,
  examStatus: EXAM_STATUS,
  recordStatus: RECORD_STATUS,
  reviewStatus: REVIEW_STATUS,
  admissionStatus: ADMISSION_STATUS,
  level: LEVEL,
  jobStatus: JOB_STATUS,
  eventType: EVENT_TYPE,
  role: ROLE
};

/** 取字典项；未登记编码时回退为原值，便于发现漏登记（§9.3） */
export function dict(kind: DictKind, value?: string | null): DictEntry {
  if (!value) return { label: '-', color: 'default' };
  return DICTS[kind][value] || { label: value, color: 'default' };
}

/** 字典 → Select 选项 */
export function dictOptions(kind: DictKind) {
  return Object.entries(DICTS[kind]).map(([value, e]) => ({ value, label: e.label }));
}
