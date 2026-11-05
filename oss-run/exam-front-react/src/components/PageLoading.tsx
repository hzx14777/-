/**
 * 统一加载态（约束规范 §5.1 加载状态、§12 公共基础能力）
 * 全站页面级加载统一使用本组件，替代各页 `<div style={{padding:120}}><Spin/></div>`。
 */
import { Flex, Spin, Typography } from 'antd';

export interface PageLoadingProps {
  /** 加载提示文案，默认「加载中…」 */
  tip?: string;
  /** 撑满视口的比例，默认 120px 顶部留白 */
  minHeight?: number;
}

export default function PageLoading({ tip = '加载中…', minHeight = 160 }: PageLoadingProps) {
  return (
    <Flex vertical align="center" justify="center" gap={12} style={{ minHeight, padding: 24 }}>
      <Spin size="large" />
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
        {tip}
      </Typography.Text>
    </Flex>
  );
}
