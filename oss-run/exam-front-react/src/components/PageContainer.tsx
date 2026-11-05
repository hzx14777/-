/**
 * 页面骨架容器（约束规范 §5.1 统一页面头部、§16.4 前端一致性）
 * 所有业务页面统一使用本组件承载标题与说明，禁止各页再写 `<div className="yj-page-title">`。
 */
import React from 'react';
import { Typography } from 'antd';

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
      <div className="yj-hall-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Typography.Title level={4} className="yj-hall-title" style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          {description && <div className="yj-hall-desc">{description}</div>}
        </div>
        {extra}
      </div>
      {children}
    </div>
  );
}
