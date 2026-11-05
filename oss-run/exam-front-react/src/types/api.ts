/**
 * 统一类型定义（约束规范 §7.3 / §9 / §10.1 / §10.2）
 * 认证字段、响应信封、分页结构在此集中声明，业务代码不得自定义同义字段
 */

/** §10.1 统一响应结构 */
export interface ApiEnvelope<T = unknown> {
  code: string;
  message: string;
  data: T;
  requestId: string;
}

/** §10.2 统一分页响应 */
export interface PageResult<T = unknown> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** §10.2 统一分页请求 */
export interface PageQuery {
  page?: number;
  pageSize?: number;
}

/** §8.1 第一阶段仅开放三类身份 */
export type RoleCode = 'student' | 'teacher' | 'admin';

/** §7.3 认证中心返回的统一用户信息，字段名不得自行修改 */
export interface SessionUser {
  userId: string;
  studentNo: string | null;
  realName: string;
  roles: RoleCode[];
  permissions: string[];
  organizationId: string | null;
  classId: string | null;
  dept?: string;
  avatarColor?: string;
}

/** §10.3 统一错误码 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_REQUIRED'
  | 'AUTH_TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';
