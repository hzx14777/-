/**
 * 统一统计卡（约束规范 §5.1 数字展示规则）
 * 大厅、题库、看板共用：标签在上、数值在下、字号与颜色统一。
 */
import React from 'react';
import { Card, Statistic } from 'antd';

export interface StatCardProps {
  label: React.ReactNode;
  value: number | string;
  suffix?: string;
  /** 数值强调色，默认主文字色 */
  color?: string;
  loading?: boolean;
}

export default function StatCard({ label, value, suffix, color = '#0e1c36', loading }: StatCardProps) {
  return (
    <Card size="small" loading={loading}>
      <Statistic title={label} value={value} suffix={suffix} valueStyle={{ color, fontSize: 24, fontWeight: 700 }} />
    </Card>
  );
}
