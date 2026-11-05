/**
 * 统一请求封装（约束规范 §10.1 响应结构、§10.3 错误码、§12 公共请求与错误处理）
 *
 * - 基址取自 §14 环境变量（经 src/env.ts 统一读取），业务代码不写死服务地址
 * - 解析统一信封 { code, message, data, requestId }
 * - AUTH_TOKEN_EXPIRED → 静默续期并重试一次；AUTH_REQUIRED → 回统一登录
 * - 其余错误统一提示并附带 requestId，便于跨平台联调追踪
 */
import { message } from 'antd';
import { config } from '../env';
import type { ApiEnvelope, ApiErrorCode } from '../types/api';

export const APP_CODE = config.appCode;
export const ENV = config.env;

const BASE = config.apiBaseUrl;
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

export function getStoredUser<T = unknown>(): T | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setStoredUser(u: unknown) {
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
    this.name = 'ApiError';
    this.code = code;
    this.requestId = requestId;
  }
}

let refreshing: Promise<boolean> | null = null;

/** 单飞续期：并发请求只触发一次 refresh（§7.4 Refresh Token） */
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
        const j = (await res.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>;
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

/** 回统一登录页，保留当前地址便于登录后返回（§7.2） */
function toLogin() {
  clearSession();
  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/yj/login?redirect=${redirect}`;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

/**
 * 业务请求入口。默认泛型为 any 以兼容历史页面，调用方可显式指定类型（如 api<PageResult<Exam>>）。
 * 响应信封本身的解析与错误处理在下方统一完成。
 */
export async function api<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const send = async (): Promise<ApiEnvelope<T>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (getAccess()) headers.Authorization = `Bearer ${getAccess()}`;
    const res = await fetch(BASE + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    });
    return (await res.json()) as ApiEnvelope<T>;
  };

  let body = await send();

  // §7.4：Token 过期 → 续期后重试一次
  if ((body.code as ApiErrorCode) === 'AUTH_TOKEN_EXPIRED' && getRefresh()) {
    const ok = await doRefresh();
    if (ok) body = await send();
  }

  if (body.code === 'OK') return body.data;

  if (body.code === 'AUTH_TOKEN_EXPIRED' || body.code === 'AUTH_REQUIRED') {
    clearSession();
    message.warning('登录状态已失效，请重新通过认证中心登录');
    setTimeout(toLogin, 600);
    throw new ApiError(body.code, body.message, body.requestId);
  }

  message.error(`${body.message || '请求失败'}（requestId: ${body.requestId || '-'}）`);
  throw new ApiError(body.code || 'INTERNAL_ERROR', body.message || '请求失败', body.requestId || '-');
}
