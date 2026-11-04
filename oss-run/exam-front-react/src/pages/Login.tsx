/**
 * 登录页（§2.2/§7：不自建账号密码体系，跳转论坛统一认证中心）
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Tag, Typography } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { endpoints } from '../api';
import { pageIn } from '../motion';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/hall';
  const ref = useRef<HTMLDivElement>(null);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    pageIn(ref.current);
    endpoints.meta().then(setMeta).catch(() => {});
  }, []);

  const goSso = async () => {
    setLoading(true);
    try {
      const r = await endpoints.ssoUrl(redirect);
      window.location.href = r.authorizeUrl;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div ref={ref} style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0e1c36 0%, #16305e 55%, #1e5eff 130%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 520px) minmax(320px, 400px)', gap: 28, alignItems: 'center', maxWidth: 1000, width: '100%' }}>
        <div style={{ color: '#fff' }}>
          <Tag color="blue" style={{ marginBottom: 12 }}>智慧警务 · 五平台体系</Tag>
          <Typography.Title level={2} style={{ color: '#fff', marginBottom: 8 }}>警院智慧考试平台</Typography.Title>
          <Typography.Paragraph style={{ color: '#b9c8e6', fontSize: 14 }}>
            随堂测试 · 专项考试 · 项目准入 · 成绩与错题本。账号体系统一由论坛平台（认证中心）提供，本平台不自建账号密码。
          </Typography.Paragraph>
          <ul style={{ color: '#b9c8e6', fontSize: 13, lineHeight: 2.1, paddingLeft: 18, margin: 0 }}>
            <li>双达标判定：总分过线 且 每个知识点组达标，才发项目准入资格</li>
            <li>人机共判：AI 初评 + 教师确认，低置信度答卷优先复核</li>
            <li>考试通过状态开放给实训工坊作准入判断（统一事件 exam.passed / exam.failed）</li>
          </ul>
        </div>
        <Card style={{ borderRadius: 14, boxShadow: '0 18px 50px rgba(0,0,0,.35)' }} styles={{ body: { padding: 30 } }}>
          <Typography.Title level={4} style={{ marginTop: 0 }}>统一身份登录</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
            将跳转至「警院统一认证中心」完成登录，认证完成后自动返回
            {redirect !== '/hall' ? '原页面' : '考试大厅'}。
          </Typography.Paragraph>
          <Button type="primary" size="large" block loading={loading} onClick={goSso}>
            前往统一认证中心登录
          </Button>
          {meta?.ssoMode === 'mock' && (
            <Typography.Paragraph type="warning" style={{ fontSize: 12, marginTop: 14, marginBottom: 0 }}>
              当前为联调模式（Mock 认证中心），生产环境由论坛平台提供认证服务。
            </Typography.Paragraph>
          )}
          {meta && (
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
              appCode: {meta.appCode} · sourcePlatform: {meta.sourcePlatform}
            </Typography.Paragraph>
          )}
        </Card>
      </div>
    </div>
  );
}
