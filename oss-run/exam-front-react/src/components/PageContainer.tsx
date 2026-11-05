/**
 * 页面骨架容器（约束规范 §5.1 统一页面头部、§16.4 前端一致性）
 * 所有业务页面统一使用本组件承载标题与说明，禁止各页再写 `<div className="yj-page-title">`。
 */
import React from 'react';
import { Flex, Typography } from 'antd';

export interface PageContainerProps {
  /** 页面标题 */
  title: React.ReactNode;
  /** 一句话说明（统一为次要文字，位于标题下方） */
  description?: React.ReactNode;
  /** 标题右侧操作区 */
  extra?: React.ReactNode;
  children?: React.ReactNode;
}

export default function PageContainer({ title, description, extra, children }: PageContainerProps) {
  return (
    <div>
      <Flex align="center" gap={12} style={{ marginBottom: description ? 6 : 16 }}>
        <Typography.Title level={4} style={{ margin: 0, flex: 1, color: '#0e1c36' }}>
          {title}
        </Typography.Title>
        {extra}
      </Flex>
      {description && (
        <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
          {description}
        </Typography.Paragraph>
      )}
      {children}
    </div>
  );
}
