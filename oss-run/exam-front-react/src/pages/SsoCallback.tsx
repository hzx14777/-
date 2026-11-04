/**
 * SSO 授权码回调页（§7.2 推荐登录流程第 3-5 步：授权码换令牌 → 建立本地短期会话）
 */
import { useEffect, useRef, useState } from 'react';
import { Spin, Typography } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { endpoints } from '../api';
import { setTokens, setStoredUser } from '../api/request';
import { useSession } from '../session';

export default function SsoCallback() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { reload } = useSession();
  const [err, setErr] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = params.get('code') || '';
    const state = params.get('state') || '';
    (async () => {
      try {
        const r = await endpoints.ssoExchange(code, state);
        setTokens(r.accessToken, r.refreshToken);
        setStoredUser(r.user);
        await reload();
        nav(r.redirect || '/hall', { replace: true });
      } catch (e: any) {
        setErr(e.message || '登录失败');
      }
    })();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      {err ? (
        <>
          <Typography.Text type="danger">{err}</Typography.Text>
          <a href="/yj/login">返回重新登录</a>
        </>
      ) : (
        <>
          <Spin size="large" />
          <Typography.Text type="secondary">正在完成统一登录…</Typography.Text>
        </>
      )}
    </div>
  );
}
