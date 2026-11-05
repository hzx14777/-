/**
 * 统一内容区块（约束规范 §5.1 统一间距、圆角与区块标题层级）
 * 替代各页手写的 `<div className="yj-section"><h4>…</h4>`，标题层级与留白由组件统一。
 */
import React from 'react';
import { Flex, Typography } from 'antd';

export interface SectionProps {
  title?: React.ReactNode;
  extra?: React.ReactNode;
  /** 紧凑模式下不显示标题，仅作为内容容器 */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export default function Section({ title, extra, children, style }: SectionProps) {
  return (
    <div className="yj-section" style={style}>
      {(title || extra) && (
        <Flex align="center" gap={12} style={{ marginBottom: 12 }}>
          {title && (
            <Typography.Text strong style={{ flex: 1, fontSize: 15, color: '#0e1c36' }}>
              {title}
            </Typography.Text>
          )}
          {extra}
        </Flex>
      )}
      {children}
    </div>
  );
}
