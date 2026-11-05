/**
 * 统一页面外壳（约束规范 §5.1 基础布局、§8.2 菜单权限、§16.1 无权限不可通过改地址访问）
 *
 * 全站唯一的布局与守卫入口：
 * - 未登录 → 跳转统一登录（不自建账号密码，§7.1）
 * - 已登录但权限点不足 → 统一 403 页
 * - 菜单项由 routes.tsx 按权限点生成，路由与菜单不会脱钩
 */
import { useEffect, useRef } from 'react';
import { Avatar, Dropdown, Layout, Menu, Space, Typography } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/session';
import { menuItems, matchRoute } from '../routes';
import { ROLE, dict } from '../constants/dictionary';
import PageLoading from '../components/PageLoading';
import ErrorResult from '../components/ErrorResult';
import { pageIn } from '../utils/motion';

const { Header, Content } = Layout;

export default function AppShell() {
  const { user, loading, signOut, hasPerm } = useSession();
  const loc = useLocation();
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  // §6.1 页面转场：路由变化时重新执行一次进入动画
  useEffect(() => {
    pageIn(ref.current);
  }, [loc.pathname]);

  if (loading && !user) return <PageLoading tip="正在校验登录状态…" minHeight={320} />;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;

  const current = matchRoute(loc.pathname);
  if (current?.perm && !hasPerm(current.perm)) {
    return <ErrorResult status={403} subTitle={`访问该页面需要权限点「${current.perm}」`} />;
  }

  const selected = '/' + (loc.pathname.split('/')[1] || 'hall');
  const roleLabel = dict('role', user.roles?.[0]).label || ROLE.student.label;

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fb' }}>
      <Header style={{ background: '#0e1c36', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: 1, whiteSpace: 'nowrap' }}>
          警院智慧考试平台
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selected]}
          style={{ flex: 1, minWidth: 0, background: 'transparent', borderBottom: 'none' }}
          items={menuItems(hasPerm)}
          onClick={({ key }) => nav(key)}
        />
        <Dropdown
          menu={{
            items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }],
            onClick: ({ key }) => {
              if (key === 'logout') signOut();
            }
          }}
        >
          <Space style={{ color: '#c9d6ee', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Avatar size={26} style={{ background: user.avatarColor || '#1e5eff' }}>
              <UserOutlined />
            </Avatar>
            <span style={{ fontSize: 13 }}>
              {user.realName}
              <span style={{ opacity: 0.6, marginLeft: 6 }}>· {roleLabel}</span>
            </span>
          </Space>
        </Dropdown>
      </Header>
      <Content style={{ padding: 20, maxWidth: 1440, margin: '0 auto', width: '100%' }}>
        <div ref={ref}>
          <Outlet />
        </div>
      </Content>
      <div style={{ textAlign: 'center', padding: '6px 0 18px' }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          统一身份由论坛认证中心提供 · 本平台不自建账号密码
        </Typography.Text>
      </div>
    </Layout>
  );
}
