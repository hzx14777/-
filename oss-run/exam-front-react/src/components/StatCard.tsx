/**
 * 统一统计卡（约束规范 §5.1 数字展示规则）
 * 大厅、题库、看板共用：标签在上、数值在下、字号与颜色统一。
 */
import React from 'react';

export interface StatCardProps {
  label: React.ReactNode;
  value: number | string;
  suffix?: string;
  /** 数值强调色，默认主文字色 */
  color?: string;
  /** 底部补充说明（如「较上学期 +6.4」「覆盖 3 个知识点组」） */
  note?: React.ReactNode;
  /** 标签左侧图标 */
  icon?: React.ReactNode;
  loading?: boolean;
}

export default function StatCard({ label, value, suffix, color = '#16202E', note, icon, loading }: StatCardProps) {
  return (
    <div className="yj-kpi">
      <div className="yj-kpi-label">
        {icon}
        <span>{label}</span>
      </div>
      <div className="yj-kpi-value num" style={{ color }}>
        {loading ? '—' : value}
        {suffix && !loading && <i>{suffix}</i>}
      </div>
      {note && <div className="yj-kpi-note">{note}</div>}
    </div>
  );
}
