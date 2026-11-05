/**
 * 统一路由与菜单配置（约束规范 §8.2 页面访问权限、§12 菜单权限和路由守卫）
 *
 * 单一数据源：菜单项、路由、权限点在此一处声明，避免「菜单隐藏了但路由可直达」这类不一致。
 * 新增页面只需在 ROUTES 追加一条，菜单与守卫自动生效。
 */
import React from 'react';
import {
  DashboardOutlined,
  BookOutlined,
  SafetyCertificateOutlined,
  RobotOutlined,
  DatabaseOutlined,
  FolderOpenOutlined,
  SendOutlined,
  CheckSquareOutlined,
  SettingOutlined,
  FileSearchOutlined
} from '@ant-design/icons';

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

export interface AppRouteConfig {
  /** 路由路径，支持 :param */
  path: string;
  /** 页面组件 */
  element: React.ReactNode;
  /** §8.2 页面访问所需权限点，缺省表示登录即可访问 */
  perm?: string;
  /** 顶部菜单信息，缺省表示不在菜单中展示（详情类页面） */
  menu?: { label: string; icon: React.ReactNode };
}

export const ROUTES: AppRouteConfig[] = [
  { path: '/hall', element: <Hall />, perm: 'exam:read', menu: { label: '考试大厅', icon: <DashboardOutlined /> } },
  { path: '/wrong', element: <WrongBook />, perm: 'wrongbook:manage', menu: { label: '错题本', icon: <BookOutlined /> } },
  { path: '/admission', element: <Admission />, perm: 'admission:read', menu: { label: '准入资格', icon: <SafetyCertificateOutlined /> } },
  { path: '/workbench', element: <Workbench />, perm: 'question:create', menu: { label: 'AI 命题工作台', icon: <RobotOutlined /> } },
  { path: '/ai-bank', element: <AiBank />, perm: 'question:read', menu: { label: 'AI 题库', icon: <DatabaseOutlined /> } },
  { path: '/doclib', element: <DocLib />, perm: 'doclib:read', menu: { label: '文档库', icon: <FolderOpenOutlined /> } },
  { path: '/publish', element: <Publish />, perm: 'exam:manage', menu: { label: '考试发布', icon: <SendOutlined /> } },
  { path: '/grading', element: <Grading />, perm: 'exam:grade', menu: { label: '阅卷中心', icon: <CheckSquareOutlined /> } },
  { path: '/manage', element: <Manage />, perm: 'exam:manage', menu: { label: '考试管理', icon: <SettingOutlined /> } },
  { path: '/audit', element: <Audit />, perm: 'audit:read', menu: { label: '审计与事件', icon: <FileSearchOutlined /> } },
  /* 详情类页面：不在菜单展示，直接访问仍需权限点（§16.1 改地址无法绕过） */
  { path: '/exam/:examId', element: <ExamDetail />, perm: 'exam:read' },
  { path: '/answer/:attemptId', element: <Answer />, perm: 'exam:submit' },
  { path: '/result/:attemptId', element: <Result />, perm: 'record:read' },
  { path: '/stats/:examId', element: <Stats />, perm: 'stats:read' }
];

/** 菜单项（按权限点过滤） */
export function menuItems(hasPerm: (perm: string) => boolean) {
  return ROUTES.filter((r) => r.menu && (!r.perm || hasPerm(r.perm))).map((r) => ({
    key: r.path,
    icon: r.menu!.icon,
    label: r.menu!.label
  }));
}

/** 取当前路径对应的路由配置，用于权限守卫 */
export function matchRoute(pathname: string): AppRouteConfig | undefined {
  return ROUTES.find((r) => {
    const pattern = new RegExp(`^${r.path.replace(/:[^/]+/g, '[^/]+')}$`);
    return pattern.test(pathname);
  });
}
