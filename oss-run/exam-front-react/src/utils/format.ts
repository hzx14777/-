/**
 * 统一格式化工具（约束规范 §5.1 日期/时间/数字/分数展示规则、§9.2 时间规范）
 *
 * 时间：接口统一返回 ISO 8601 带时区，页面一律经 formatDateTime 输出 `YYYY-MM-DD HH:mm`，
 *      不得再出现 `String(t).replace('T',' ').slice(0,16)` 这类手写截断。
 */
import dayjs from 'dayjs';

/** ISO 8601 → `YYYY-MM-DD HH:mm`，空值统一显示 `-` */
export function formatDateTime(v?: string | null): string {
  if (!v) return '-';
  const d = dayjs(v);
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : String(v);
}

/** ISO 8601 → `YYYY-MM-DD` */
export function formatDate(v?: string | null): string {
  if (!v) return '-';
  const d = dayjs(v);
  return d.isValid() ? d.format('YYYY-MM-DD') : String(v);
}

/** 时间区间：`起 ~ 止`，任一端为空时显示 `-` */
export function formatDateTimeRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return '-';
  return `${formatDateTime(start)} ~ ${formatDateTime(end)}`;
}

/** 分数：整数不带小数位，小数保留一位（0.5 分步长场景），空值 `-` */
export function formatScore(v?: number | string | null): string {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** 比率（0~1 小数）→ 百分比文本 */
export function formatPercent(v?: number | null, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '-';
  return `${(Number(v) * 100).toFixed(digits)}%`;
}

/** 时长（分钟）→ 文本 */
export function formatDuration(min?: number | null): string {
  if (min === null || min === undefined) return '-';
  return `${min} 分钟`;
}

/**
 * 作答内容统一格式化：判断题 T/F → 正确/错误，多空答案用 `｜` 分隔。
 * 成绩单、错题本、题库详情共用，避免三处各写一份。
 */
export function formatAnswer(v: unknown, type?: string): string {
  if (v === null || v === undefined || v === '') return '';
  if (type === 'judge') {
    const one = (x: unknown) => (x === 'T' ? '正确' : x === 'F' ? '错误' : String(x ?? ''));
    return Array.isArray(v) ? v.map(one).filter(Boolean).join(' ｜ ') : one(v);
  }
  if (Array.isArray(v)) {
    return v
      .map((x) => (Array.isArray(x) ? x.join(' / ') : x))
      .filter((x) => x !== '' && x !== null && x !== undefined)
      .join(' ｜ ');
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
