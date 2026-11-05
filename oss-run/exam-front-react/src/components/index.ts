/**
 * 公共基础组件出口（约束规范 §12 公共前端基础能力）
 * 业务页面统一从 '../components' 引入，不直接引用各组件文件，便于后续整体替换。
 */
export { default as PageContainer } from './PageContainer';
export { default as Section } from './Section';
export { default as PageLoading } from './PageLoading';
export { default as PageEmpty } from './PageEmpty';
export { default as ErrorResult } from './ErrorResult';
export { default as StatusTag } from './StatusTag';
export { default as StatCard } from './StatCard';
export { default as DataTable } from './DataTable';
