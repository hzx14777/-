/**
 * 统一空状态（约束规范 §5.1 空状态、§12）
 * 支持可选引导操作，避免各页各写一套 Empty 文案结构。
 */
import React from 'react';
import { Empty } from 'antd';

export interface PageEmptyProps {
  description?: React.ReactNode;
  /** 引导操作，例如「去命题」「调整筛选条件」 */
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export default function PageEmpty({ description = '暂无数据', action, style }: PageEmptyProps) {
  return (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} style={{ padding: '20px 0', ...style }}>
      {action}
    </Empty>
  );
}
