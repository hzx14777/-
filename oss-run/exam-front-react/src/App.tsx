/**
 * 应用外壳与路由守卫（§12 菜单权限和路由守卫、§5.1 统一加载/空/错误/403/404 状态）
 */
import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Layout, Menu, Spin, Result as AntResult, Button } from 'antd';
import {
  DashboardOutlined, BookOutlined, SafetyCertificateOutlined,
  RobotOutlined, CheckSquareOutlined, SettingOutlined,
  FileSearchOutlined, UserOutlined, DatabaseOutlined, FolderOpenOutlined, SendOutlined
} from '@ant-design/icons';
import { useSession } from './session';
import { pageIn } from './motion';

import Login from './pages/Login';
import SsoCallback from './pages/SsoCallback';
import Hall from './pages/Hall';
import ExamDetail from './pages/ExamDetail';
import Answer from './pages/Answer';
import Result from './pages/Result';
import WrongBook from './pages/WrongBook';
import Admission from './pages/Admission';
import Workbench from './pages/Workbench';
import AiBank from './pages/AiBank';
import DocLib from './pages/DocLib';
import Publish from './pages/Publish';
import Grading from './pages/Grading';
import Stats from './pages/Stats';
import Manage from './pages/Manage';
import Audit from './pages/Audit';

const { Header, Content } = Layout;

/** 页面转场容器（§6.1） */
function Transition({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => pageIn(ref.current), []);
  return <div ref={ref}>{children}</div>;
}

function Empty404() {
  return (
    <AntResult
      status="404"
      title="404"
      subTitle="页面不存在"
      extra={<Button type="primary"><Link to="/hall">返回大厅</Link></Button>}
    />
  );
}

function Forbidden() {
  return (
    <AntResult
      status="403"
      title="403"
      subTitle="您没有访问该页面的权限（权限点不足）"
      extra={<Button type="primary"><Link to="/hall">返回大厅</Link></Button>}
    />
  );
}

/** 路由守卫：未登录 → 登录页；权限点不足 → 403 页（§8.2 页面访问权限） */
function Guard({ perm, children }: { perm?: string; children: React.ReactNode }) {
  const { user, loading, hasPerm } = useSession();
  const loc = useLocation();
  if (loading && !user) return <div style={{ padding: 120, textAlign: 'center' }}><Spin size="large" /></div>;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(loc.pathname)}`} replace />;
  if (perm && !hasPerm(perm)) return <Forbidden />;
  return <Transition>{children}</Transition>;
}

const MENU = [
  { key: '/hall', icon: <DashboardOutlined />, label: <Link to="/hall">考试大厅</Link>, perm: 'exam:read' },
  { key: '/wrong', icon: <BookOutlined />, label: <Link to="/wrong">错题本</Link>, perm: 'wrongbook:manage' },
  { key: '/admission', icon: <SafetyCertificateOutlined />, label: <Link to="/admission">准入资格</Link>, perm: 'admission:read' },
  { key: '/workbench', icon: <RobotOutlined />, label: <Link to="/workbench">AI 命题工作台</Link>, perm: 'question:create' },
  { key: '/ai-bank', icon: <DatabaseOutlined />, label: <Link to="/ai-bank">AI 题库</Link>, perm: 'question:read' },
  { key: '/doclib', icon: <FolderOpenOutlined />, label: <Link to="/doclib">文档库</Link>, perm: 'doclib:read' },
  { key: '/publish', icon: <SendOutlined />, label: <Link to="/publish">考试发布</Link>, perm: 'exam:manage' },
  { key: '/grading', icon: <CheckSquareOutlined />, label: <Link to="/grading">阅卷中心</Link>, perm: 'exam:grade' },
  { key: '/manage', icon: <SettingOutlined />, label: <Link to="/manage">考试管理</Link>, perm: 'exam:manage' },
  { key: '/audit', icon: <FileSearchOutlined />, label: <Link to="/audit">审计与事件</Link>, perm: 'audit:read' }
];

function Shell({ children }: { children: React.ReactNode }) {
  const { user, signOut, hasPerm } = useSession();
  const loc = useLocation();
  const selected = '/' + (loc.pathname.split('/')[1] || 'hall');
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
          items={MENU.filter((m) => hasPerm(m.perm)).map(({ key, icon, label }) => ({ key, icon, label }))}
        />
        <div style={{ color: '#c9d6ee', fontSize: 13, whiteSpace: 'nowrap' }}>
          <UserOutlined /> {user?.realName}
          <span style={{ margin: '0 10px', opacity: 0.4 }}>|</span>
          <a onClick={signOut} style={{ color: '#8fb0ff' }}>退出</a>
        </div>
      </Header>
      <Content style={{ padding: 20, maxWidth: 1440, margin: '0 auto', width: '100%' }}>{children}</Content>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/sso/callback" element={<SsoCallback />} />
      <Route path="/" element={<Navigate to="/hall" replace />} />
      <Route path="/hall" element={<Guard perm="exam:read"><Shell><Hall /></Shell></Guard>} />
      <Route path="/exam/:examId" element={<Guard perm="exam:read"><Shell><ExamDetail /></Shell></Guard>} />
      <Route path="/answer/:attemptId" element={<Guard perm="exam:submit"><Shell><Answer /></Shell></Guard>} />
      <Route path="/result/:attemptId" element={<Guard perm="record:read"><Shell><Result /></Shell></Guard>} />
      <Route path="/wrong" element={<Guard perm="wrongbook:manage"><Shell><WrongBook /></Shell></Guard>} />
      <Route path="/admission" element={<Guard perm="admission:read"><Shell><Admission /></Shell></Guard>} />
      <Route path="/workbench" element={<Guard perm="question:create"><Shell><Workbench /></Shell></Guard>} />
      <Route path="/ai-bank" element={<Guard perm="question:read"><Shell><AiBank /></Shell></Guard>} />
      <Route path="/doclib" element={<Guard perm="doclib:read"><Shell><DocLib /></Shell></Guard>} />
      <Route path="/publish" element={<Guard perm="exam:manage"><Shell><Publish /></Shell></Guard>} />
      <Route path="/grading" element={<Guard perm="exam:grade"><Shell><Grading /></Shell></Guard>} />
      <Route path="/stats/:examId" element={<Guard perm="stats:read"><Shell><Stats /></Shell></Guard>} />
      <Route path="/manage" element={<Guard perm="exam:manage"><Shell><Manage /></Shell></Guard>} />
      <Route path="/audit" element={<Guard perm="audit:read"><Shell><Audit /></Shell></Guard>} />
      <Route path="*" element={<Empty404 />} />
    </Routes>
  );
}
