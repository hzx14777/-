/**
 * 统一异常页（约束规范 §5.1 错误页/权限不足页/404、§10.3 错误码、§12 requestId 展示）
 *
 * 403 无权限、404 页面不存在、500 服务异常、SERVICE_UNAVAILABLE 依赖不可用共用一套版式，
 * 并统一提供 requestId 展示位，便于跨平台联调追踪。
 */
import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';

export type ErrorStatus = 403 | 404 | 500;

export interface ErrorResultProps {
  status: ErrorStatus;
  /** 自定义说明，缺省按状态给统一文案 */
  subTitle?: string;
  /** §10.3 请求追踪 ID，有则展示 */
  requestId?: string;
  /** 返回按钮目标，默认考试大厅 */
  backTo?: string;
  backText?: string;
  /** 额外操作（如「重新登录」） */
  extra?: React.ReactNode;
}

const DEFAULT_TEXT: Record<ErrorStatus, string> = {
  403: '您没有访问该页面的权限（权限点不足），如需开通请联系管理员',
  404: '页面不存在或已被移除',
  500: '服务暂时不可用，请稍后重试'
};

export default function ErrorResult({ status, subTitle, requestId, backTo = '/hall', backText = '返回考试大厅', extra }: ErrorResultProps) {
  return (
    <Result
      status={status === 500 ? '500' : status === 403 ? '403' : '404'}
      title={String(status)}
      subTitle={
        <>
          {subTitle || DEFAULT_TEXT[status]}
          {requestId && (
            <div style={{ fontSize: 12, color: '#6b7a90', marginTop: 6 }}>requestId：{requestId}</div>
          )}
        </>
      }
      extra={
        <>
          {extra}
          <Button type="primary">
            <Link to={backTo}>{backText}</Link>
          </Button>
        </>
      }
    />
  );
}
