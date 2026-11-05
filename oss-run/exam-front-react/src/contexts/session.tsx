/**
 * 会话上下文（§12 用户、角色和权限读取）
 * 权限数据来自认证中心 /me（§7.3），前端权限控制仅用于体验，服务端另有鉴权（§8.2）
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getAccess, getStoredUser, setStoredUser, clearSession, refreshSession } from '../api/request';
import type { SessionUser } from '../types/api';

interface SessionCtx {
  user: SessionUser | null;
  loading: boolean;
  hasPerm: (perm: string) => boolean;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionCtx>({ user: null, loading: true, hasPerm: () => false, reload: async () => {}, signOut: async () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(getStoredUser());
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      /* 新标签页或浏览器重启后只剩 httpOnly Cookie（§7.2.4），先用它续期换回短期访问令牌 */
      if (!getAccess()) {
        const renewed = await refreshSession();
        if (!renewed) {
          setUser(null);
          return;
        }
      }
      const me = await api<SessionUser>('/api/v1/me');
      setUser(me);
      setStoredUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    /* 登录页与授权回调页本来就没有会话，不必尝试续期（否则会多打一次 401） */
    const path = window.location.pathname;
    if (/\/login$/.test(path) || path.includes('/sso/callback')) {
      setLoading(false);
      return;
    }
    reload();
  }, []);

  const hasPerm = (perm: string) => !!user && (user.permissions || []).includes(perm);

  const signOut = async () => {
    try {
      /* 刷新令牌在 httpOnly Cookie 里，前端无需（也无法）传参，服务端读到即注销并下发清除指令 */
      const r: any = await api('/api/v1/auth/logout', { method: 'POST', body: {} });
      clearSession();
      setUser(null);
      // §7.2.6 退出时按统一规则退出认证中心
      if (r?.endSessionUrl) window.location.href = r.endSessionUrl;
      else window.location.href = '/yj/login';
    } catch {
      clearSession();
      window.location.href = '/yj/login';
    }
  };

  return <Ctx.Provider value={{ user, loading, hasPerm, reload, signOut }}>{children}</Ctx.Provider>;
}

export function useSession() {
  return useContext(Ctx);
}
