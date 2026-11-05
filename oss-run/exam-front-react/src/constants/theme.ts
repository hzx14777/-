/**
 * 统一主题令牌（约束规范 §5.1 字体、颜色变量、间距、圆角、阴影和层级变量）
 * 全站只此一处定义 Ant Design 主题，页面不得覆盖公共组件样式（§5.2）。
 *
 * 视觉基线：output/ui-redesign 效果图（深海军蓝外壳 + 单一主蓝 + 准入金强调）。
 */
import type { ThemeConfig } from 'antd';

/** 设计令牌：颜色 */
export const COLORS = {
  /** 主色：操作、选中、可点击 */
  primary: '#1657D6',
  primaryHover: '#3D7BF0',
  /** 主色浅底：选中行、次级按钮、信息块 */
  primaryWeak: '#EDF3FE',
  /** 准入金：资格、等级、权威标记，仅用于语义强调 */
  gold: '#C89B3C',
  goldWeak: '#FBF3E2',
  success: '#0F9D76',
  successWeak: '#E8F6F0',
  warning: '#C2761B',
  warningWeak: '#FDF1E2',
  error: '#D4380D',
  errorWeak: '#FDECE6',
  text: '#16202E',
  textSecondary: '#415066',
  textMuted: '#6B7A90',
  textSubtle: '#8A97A8',
  title: '#0F2138',
  border: '#E7ECF5',
  borderStrong: '#DCE4F0',
  bg: '#F4F6FA',
  card: '#FFFFFF',
  /** 侧栏与封面色 */
  navy: '#0A1729',
  navyLight: '#0C1D33'
} as const;

/** 设计令牌：圆角与间距 */
export const RADIUS = { xs: 5, sm: 8, md: 12, lg: 14 } as const;
export const SPACING = { xs: 4, sm: 8, md: 16, lg: 20 } as const;

/** 设计令牌：阴影（统一低对比，避免卡片浮起过重） */
export const SHADOW = {
  card: '0 1px 2px rgba(16,32,64,.04)',
  pop: '0 8px 24px rgba(16,32,64,.10)',
  primary: '0 1px 2px rgba(22,87,214,.30), inset 0 1px 0 rgba(255,255,255,.14)'
} as const;

export const theme: ThemeConfig = {
  token: {
    colorPrimary: COLORS.primary,
    colorInfo: COLORS.primary,
    colorSuccess: COLORS.success,
    colorWarning: COLORS.warning,
    colorError: COLORS.error,
    colorTextBase: COLORS.text,
    colorTextSecondary: COLORS.textSecondary,
    colorBgLayout: COLORS.bg,
    colorBorder: COLORS.border,
    colorBorderSecondary: COLORS.border,
    borderRadius: RADIUS.sm,
    borderRadiusLG: RADIUS.md,
    fontFamily: "'Microsoft YaHei UI', 'Microsoft YaHei', -apple-system, 'Segoe UI', 'PingFang SC', sans-serif",
    fontSize: 14,
    controlHeight: 34,
    boxShadow: SHADOW.card,
    boxShadowSecondary: SHADOW.pop,
    wireframe: false
  },
  components: {
    /* 表格、卡片等公共组件的默认行为统一在此收敛（§5.1 表格分页/排序/筛选基础行为） */
    Table: {
      headerBg: '#FAFBFD',
      headerColor: COLORS.textMuted,
      headerSplitColor: 'transparent',
      borderColor: '#EFF3F9',
      rowHoverBg: '#F7FAFF',
      cellPaddingBlockSM: 9,
      cellPaddingInlineSM: 12
    },
    Card: { borderRadiusLG: RADIUS.md, paddingLG: 18, headerFontSize: 14 },
    Button: { controlHeight: 34, fontWeight: 500, primaryShadow: 'none', defaultShadow: 'none', paddingInline: 14 },
    Input: { controlHeight: 34, activeShadow: '0 0 0 3px rgba(22,87,214,.10)' },
    InputNumber: { controlHeight: 34 },
    Select: { controlHeight: 34 },
    Tag: { borderRadiusSM: RADIUS.xs, defaultBg: '#F1F4F9', defaultColor: '#5A6B80' },
    Progress: { defaultColor: COLORS.primary, remainingColor: '#EDF1F8' },
    Collapse: { headerBg: 'transparent', contentBg: 'transparent' },
    Menu: { itemHeight: 37, itemBorderRadius: RADIUS.sm, darkItemBg: 'transparent' },
    Modal: { borderRadiusLG: RADIUS.md },
    Tabs: { itemSelectedColor: COLORS.primary, titleFontSize: 13 },
    Steps: { iconSize: 26, titleLineHeight: 22 }
  }
};
