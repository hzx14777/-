/**
 * 应用路由装配（约束规范 §12 路由守卫、§5.1 统一 404）
 * 路由表在 routes.tsx 中集中声明，此处只做组装，不再逐个手写路由。
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from './routes';
import AppShell from './layouts/AppShell';
import ErrorResult from './components/ErrorResult';
import Login from './pages/Login';
import SsoCallback from './pages/SsoCallback';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/sso/callback" element={<SsoCallback />} />
      <Route path="/" element={<Navigate to="/hall" replace />} />
      <Route element={<AppShell />}>
        {ROUTES.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Route>
      <Route path="*" element={<ErrorResult status={404} />} />
    </Routes>
  );
}
