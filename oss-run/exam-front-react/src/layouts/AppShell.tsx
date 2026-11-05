/**
 * 统一页面外壳（约束规范 §5.1 基础布局、§8.2 菜单权限、§16.1 无权限不可通过改地址访问）
 *
 * 全站唯一的布局与守卫入口：
 * - 未登录 → 跳转统一登录（不自建账号密码，§7.1）
 * - 已登录但权限点不足 → 统一 403 页
 * - 菜单项由 routes.tsx 按权限点生成，路由与菜单不会脱钩
 * - 答题页（/answer/*）使用全屏考试外壳，不展示站点导航，避免误点离开（§6.2）
 */
import { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Drawer, Dropdown, Layout, Typography } from 'antd';
import {
  CloseOutlined,
  DownOutlined,
  LogoutOutlined,
  MenuOutlined,
  SafetyCertificateFilled,
  UserOutlined
} from '@ant-design/icons';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../contexts/session';
import { MENU_GROUPS, activeMenuKey, matchRoute, menuItems } from '../routes';
import { ROLE, dict } from '../constants/dictionary';
import PageLoading from '../components/PageLoading';
import ErrorResult from '../components/ErrorResult';
import { pageIn } from '../utils/motion';

const { Content } = Layout;

export default function AppShell() {
  const { user, loading, signOut, hasPerm } = useSession();
  const loc = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const [navOpen, setNavOpen] = useState(false);

  // §6.1 页面转场：路由变化时重新执行一次进入动画
  useEffect(() => {
    pageIn(ref.current);
    setNavOpen(false);
  }, [loc.pathname]);

  if (loading && !user) return <PageLoading tip="正在校验登录状态…" minHeight={320} />;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;

  const current = matchRoute(loc.pathname);
  if (current?.perm && !hasPerm(current.perm)) {
    return <ErrorResult status={403} subTitle={`访问该页面需要权限点「${current.perm}」`} />;
  }

  /* 答题页全屏：考试条由页面自身承担，外壳不渲染导航 */
  if (/^\/answer\//.test(loc.pathname)) {
    return (
      <div ref={ref}>
        <Outlet />
      </div>
    );
  }

  const selected = activeMenuKey(loc.pathname);
  const items = menuItems(hasPerm);
  const roleLabel = dict('role', user.roles?.[0]).label || ROLE.student.label;
  const parentLabel = current?.parent ? items.find((i) => i.key === current.parent)?.label : undefined;
  const crumb = current?.menu?.label || parentLabel || '考试大厅';

  const navList = (
    <nav className="yj-nav" aria-label="站点导航">
      {MENU_GROUPS.map((g) => {
        const groupItems = items.filter((i) => i.group === g.key);
        if (!groupItems.length) return null;
        return (
          <div key={g.key} className="yj-nav-group">
            <div className="yj-nav-title">{g.title}</div>
            {groupItems.map((it) => (
              <NavLink
                key={it.key}
                to={it.key}
                className={() => `yj-nav-item${selected === it.key ? ' on' : ''}`}
                title={it.label}
                onClick={() => setNavOpen(false)}
              >
                <span className="yj-nav-icon">{it.icon}</span>
                <span className="yj-nav-label">{it.label}</span>
              </NavLink>
            ))}
          </div>
        );
      })}
    </nav>
  );

  return (
    <Layout className="yj-shell">
      <aside className="yj-side">
        <div className="yj-brand">
          <div className="yj-brand-mark">
            <SafetyCertificateFilled />
          </div>
          <div>
            <div className="yj-brand-name">警院智慧考试</div>
            <div className="yj-brand-sub">EXAM PLATFORM</div>
          </div>
        </div>

        {navList}

        <div className="yj-side-foot">
          <div className="yj-side-note">统一身份由认证中心提供</div>
          <div className="yj-side-ver">v1.0 · 智慧警务五平台体系</div>
        </div>
      </aside>

      {/* 移动端导航（<980px 侧栏隐藏时使用） */}
      <Drawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        placement="left"
        width={248}
        closable={false}
        styles={{ body: { padding: 0, background: 'linear-gradient(180deg,#0c1d33 0%,#0a1729 62%,#081320 100%)' } }}
      >
        <div className="yj-side" style={{ position: 'static', width: '100%', height: '100vh', boxSizing: 'border-box' }}>
          <div className="yj-brand">
            <div className="yj-brand-mark">
              <SafetyCertificateFilled />
            </div>
            <div style={{ flex: 1 }}>
              <div className="yj-brand-name">警院智慧考试</div>
              <div className="yj-brand-sub">EXAM PLATFORM</div>
            </div>
            <Button type="text" icon={<CloseOutlined />} onClick={() => setNavOpen(false)} style={{ color: '#8ea4c2' }} />
          </div>
          {navList}
          <div className="yj-side-foot">
            <div className="yj-side-note">统一身份由认证中心提供</div>
            <div className="yj-side-ver">v1.0 · 智慧警务五平台体系</div>
          </div>
        </div>
      </Drawer>

      <div className="yj-main">
        <header className="yj-topbar">
          <Button
            className="yj-menu-btn"
            type="text"
            icon={<MenuOutlined />}
            aria-label="打开导航"
            onClick={() => setNavOpen(true)}
          />
          <div className="yj-crumb">
            <span>考试中心</span>
            <span className="yj-crumb-sep">/</span>
            <b>{crumb}</b>
          </div>

          <div className="yj-topbar-right">
            <Dropdown
              placement="bottomRight"
              menu={{
                items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }],
                onClick: ({ key }) => {
                  if (key === 'logout') signOut();
                }
              }}
            >
              <div className="yj-me" role="button" tabIndex={0}>
                <Avatar size={30} style={{ background: user.avatarColor || '#1657D6' }} icon={<UserOutlined />} />
                <div className="yj-me-info">
                  <b>{user.realName}</b>
                  <em>{roleLabel}</em>
                </div>
                <DownOutlined className="yj-me-caret" />
              </div>
            </Dropdown>
          </div>
        </header>

        <Content className="yj-content">
          <div ref={ref} className="yj-content-inner">
            <Outlet />
          </div>
        </Content>

        <div className="yj-foot">
          <Typography.Text type="secondary" style={{ fontSize: 11.5 }}>
            统一身份由论坛认证中心提供 · 本平台不自建账号密码
          </Typography.Text>
        </div>
      </div>
    </Layout>
  );
}
