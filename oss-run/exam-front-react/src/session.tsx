/**
 * 会话上下文（§12 用户、角色和权限读取）
 * 权限数据来自认证中心 /me（§7.3），前端权限控制仅用于体验，服务端另有鉴权（§8.2）
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getAccess, getStoredUser, setStoredUser, clearSession } from './api/request';

interface SessionUser {
  userId: string;
  studentNo: string | null;
  realName: string;
  roles: string[];
  permissions: string[];
  organizationId: string | null;
  classId: string | null;
  dept?: string;
  avatarColor?: string;
  points?: number;
  admissions?: number;
}

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
  const [loading, setLoading] = useState(!!getAccess());

  const reload = async () => {
    if (!getAccess()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
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
    reload();
  }, []);

  const hasPerm = (perm: string) => !!user && (user.permissions || []).includes(perm);

  const signOut = async () => {
    try {
      const refresh = localStorage.getItem('yj_refresh') || '';
      const r: any = await api('/api/v1/auth/logout', { method: 'POST', body: { refreshToken: refresh } });
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
