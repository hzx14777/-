/**
 * 统一主题令牌（约束规范 §5.1 字体、颜色变量、间距、圆角、阴影和层级变量）
 * 全站只此一处定义 Ant Design 主题，页面不得覆盖公共组件样式（§5.2）。
 */
import type { ThemeConfig } from 'antd';

/** 设计令牌：颜色 */
export const COLORS = {
  primary: '#1e5eff',
  success: '#0f9d76',
  warning: '#c2761b',
  error: '#d4380d',
  text: '#1f2733',
  textMuted: '#6b7a90',
  title: '#0e1c36',
  border: '#e6ebf4',
  bg: '#f5f7fb'
} as const;

/** 设计令牌：圆角与间距 */
export const RADIUS = { sm: 8, md: 12, lg: 14 } as const;
export const SPACING = { xs: 4, sm: 8, md: 16, lg: 20 } as const;

export const theme: ThemeConfig = {
  token: {
    colorPrimary: COLORS.primary,
    colorInfo: COLORS.primary,
    colorSuccess: COLORS.success,
    colorWarning: COLORS.warning,
    colorError: COLORS.error,
    colorTextBase: COLORS.text,
    borderRadius: RADIUS.sm,
    fontFamily: "-apple-system, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif",
    fontSize: 14
  },
  components: {
    /* 表格、卡片等公共组件的默认行为统一在此收敛（§5.1 表格分页/排序/筛选基础行为） */
    Table: { headerBg: '#f7f9fd', cellPaddingBlockSM: 8 },
    Card: { borderRadiusLG: RADIUS.md }
  }
};
