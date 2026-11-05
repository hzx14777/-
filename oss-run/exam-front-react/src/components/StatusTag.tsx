/**
 * 统一状态标签（约束规范 §5.1 状态标签展示规则、§9.3 中文映射）
 * 接口传英文编码，展示一律走字典，禁止在页面内直接输出 `published` 之类的原始值。
 */
import { Tag, Tooltip } from 'antd';
import { dict, type DictKind } from '../constants/dictionary';

export interface StatusTagProps {
  kind: DictKind;
  value?: string | null;
  /** 是否在标签上附带原始编码（联调排查用，默认关闭） */
  showCode?: boolean;
  style?: React.CSSProperties;
}

export default function StatusTag({ kind, value, showCode = false, style }: StatusTagProps) {
  const { label, color } = dict(kind, value);
  const text = showCode && value ? `${label}（${value}）` : label;
  // 未登记编码给出提示，避免新增状态漏更新字典（§15）
  const unknown = !!value && label === value;
  const node = <Tag color={color} style={style}>{text}</Tag>;
  return unknown ? <Tooltip title="该状态编码尚未登记到统一字典，请同步更新 constants/dictionary.ts 与数据字典">{node}</Tooltip> : node;
}
