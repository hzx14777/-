/**
 * SSO 授权码回调页（§7.2 推荐登录流程第 3-5 步：授权码换令牌 → 建立本地短期会话）
 * 令牌交换与用户信息读取全部由服务端完成，前端只接收短期凭证（§7.4 Access Token 不落 URL）。
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Typography } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { endpoints } from '../api';
import { setTokens, setStoredUser } from '../api/request';
import { useSession } from '../contexts/session';
import { PageLoading } from '../components';

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
      } catch (e: unknown) {
        setErr((e as Error)?.message || '登录失败');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (err) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Typography.Text type="danger">{err}</Typography.Text>
        <Button type="primary" onClick={() => (window.location.href = '/yj/login')}>
          返回重新登录
        </Button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PageLoading tip="正在完成统一登录…" minHeight={200} />
    </div>
  );
}
