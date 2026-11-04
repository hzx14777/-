/**
 * 统一请求封装（§12 公共请求/认证/错误处理）
 * - 基址来自 §14 环境变量 VITE_API_BASE_URL，业务代码不写死服务地址
 * - 解析 §10.1 统一响应 { code, message, data, requestId }
 * - §10.3 统一错误码：AUTH_TOKEN_EXPIRED 自动续期重试一次；AUTH_REQUIRED 跳转统一登录
 * - §10.3/§12 所有错误提示携带 requestId 便于跨平台联调追踪
 */
import { message } from 'antd';

export const APP_CODE = import.meta.env.VITE_APP_CODE || 'exam';
export const ENV = import.meta.env.VITE_ENV || 'development';
const BASE: string = import.meta.env.VITE_API_BASE_URL || '';

const ACCESS_KEY = 'yj_access';
const REFRESH_KEY = 'yj_refresh';
const USER_KEY = 'yj_user';

export function getAccess(): string {
  return localStorage.getItem(ACCESS_KEY) || '';
}
export function getRefresh(): string {
  return localStorage.getItem(REFRESH_KEY) || '';
}
export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
export function getStoredUser(): any {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}
export function setStoredUser(u: any) {
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}
export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  code: string;
  requestId: string;
  constructor(code: string, msg: string, requestId: string) {
    super(msg);
    this.code = code;
    this.requestId = requestId;
  }
}

let refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  if (!getRefresh()) return false;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${BASE}/api/v1/sso/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: getRefresh() })
        });
        const j = await res.json();
        if (j.code === 'OK' && j.data?.accessToken) {
          setTokens(j.data.accessToken, j.data.refreshToken);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

function toLogin() {
  clearSession();
  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/yj/login?redirect=${redirect}`;
}

interface Opts {
  method?: string;
  body?: any;
  raw?: boolean;
}

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const send = async () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (getAccess()) headers.Authorization = `Bearer ${getAccess()}`;
    const res = await fetch(BASE + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    });
    return res.json();
  };

  let j = await send();

  // §7.4/§10.3：Token 过期 → 续期后重试一次
  if (j.code === 'AUTH_TOKEN_EXPIRED' && getRefresh()) {
    const okRefresh = await doRefresh();
    if (okRefresh) j = await send();
  }

  if (j.code === 'OK') return j.data as T;

  if (j.code === 'AUTH_TOKEN_EXPIRED' || j.code === 'AUTH_REQUIRED') {
    clearSession();
    message.warning('登录状态已失效，请重新通过认证中心登录');
    setTimeout(toLogin, 600);
    throw new ApiError(j.code, j.message, j.requestId);
  }

  // §10.3：其余统一错误码直接提示，并携带 requestId
  message.error(`${j.message || '请求失败'}（requestId: ${j.requestId || '-'}）`);
  throw new ApiError(j.code || 'INTERNAL_ERROR', j.message || '请求失败', j.requestId || '-');
}

/** 平台间服务调用（§11.2 公开 API，需 X-Platform-Key） */
export function platformKey(): string {
  // 前端演示环境使用演示密钥；生产由服务间调用，不经过前端
  return 'yj-demo-platform-key';
}
