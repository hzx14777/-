/**
 * 统一请求封装（约束规范 §10.1 响应结构、§10.3 错误码、§12 公共请求与错误处理）
 *
 * - 基址取自 §14 环境变量（经 src/env.ts 统一读取），业务代码不写死服务地址
 * - 解析统一信封 { code, message, data, requestId }
 * - AUTH_TOKEN_EXPIRED → 静默续期并重试一次；AUTH_REQUIRED → 回统一登录
 * - 其余错误统一提示并附带 requestId，便于跨平台联调追踪
 *
 * 凭证承载（§7.2.4 前端不直接保存长期凭证）：
 * - 访问令牌短期有效（2h），只放 sessionStorage，关标签页即失效；
 * - 刷新令牌由服务端以 httpOnly Cookie 下发，前端读不到也存不了，续期时浏览器自动带上。
 */
import { message } from 'antd';
import { config } from '../env';
import type { ApiEnvelope, ApiErrorCode } from '../types/api';

export const APP_CODE = config.appCode;
export const ENV = config.env;

const BASE = config.apiBaseUrl;
const ACCESS_KEY = 'yj_access';
const USER_KEY = 'yj_user';

export function getAccess(): string {
  return sessionStorage.getItem(ACCESS_KEY) || '';
}

export function setAccess(access: string) {
  sessionStorage.setItem(ACCESS_KEY, access);
}

export function getStoredUser<T = unknown>(): T | null {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setStoredUser(u: unknown) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(u));
}

export function clearSession() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(USER_KEY);
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

/**
 * 续期：凭 httpOnly Cookie 换新的访问令牌（§7.4 Refresh Token）。
 * 单飞执行，并发请求只触发一次轮换；Cookie 由浏览器自动携带，前端不参与传递。
 */
export async function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${BASE}/api/v1/sso/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: '{}'
        });
        const j = (await res.json()) as ApiEnvelope<{ accessToken: string }>;
        if (j.code === 'OK' && j.data?.accessToken) {
          setAccess(j.data.accessToken);
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
      credentials: 'same-origin',
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    });
    return (await res.json()) as ApiEnvelope<T>;
  };

  let body = await send();

  // §7.4：Token 过期 → 续期后重试一次
  if ((body.code as ApiErrorCode) === 'AUTH_TOKEN_EXPIRED') {
    const done = await refreshSession();
    if (done) body = await send();
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
