/**
 * 准入资格：证书卡片（§11.2.3 考试通过状态可被实训工坊使用）
 */
import { useEffect, useState } from 'react';
import { Card, Spin, Table, Tag, Typography } from 'antd';
import { endpoints } from '../api';

export default function Admission() {
  const [d, setD] = useState<any>(null);

  useEffect(() => {
    endpoints.admissions().then(setD).catch(() => {});
  }, []);

  if (!d) return <div style={{ padding: 120, textAlign: 'center' }}><Spin size="large" /></div>;

  return (
    <div>
      <div className="yj-page-title">项目准入资格</div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        双达标通过后自动发放；重考提分将自动续期升级。实训工坊将通过统一接口核验该资格。
      </Typography.Paragraph>
      <div className="yj-card-grid" style={{ marginBottom: 20 }}>
        {(d.items || []).map((a: any) => (
          <Card key={a.id} style={{ borderRadius: 12, borderColor: a.expired ? '#e6ebf4' : '#1e5eff55', background: a.expired ? '#fafbfe' : 'linear-gradient(160deg,#ffffff, #f3f7ff)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Tag color={a.expired ? 'default' : 'gold'}>{a.expired ? '已过期' : '有效'}</Tag>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{a.examType === 'admission_exam' ? '项目准入卷' : a.examType === 'skill_exam' ? '专项技能卷' : '随堂测'}</Typography.Text>
            </div>
            <Typography.Title level={4} style={{ margin: '10px 0 4px' }}>{a.examTitle}</Typography.Title>
            <div className="yj-meta">
              等级：<b style={{ color: a.level === 'excellent' ? '#c2761b' : '#0f9d76' }}>{a.level === 'excellent' ? '优秀' : '合格'}</b> · 成绩 {a.score} 分<br />
              能力范围：{(a.abilityScope || []).join('、') || '-'}<br />
              发放 {a.issuedAt} · 有效期至 {a.expireAt}
            </div>
          </Card>
        ))}
      </div>
      <div className="yj-section">
        <h4>学习积分：{d.points}</h4>
        <Table
          size="small"
          rowKey="id"
          pagination={d.total > 10 ? { total: d.total, pageSize: d.pageSize, current: d.page } : false}
          dataSource={d.items || []}
          columns={[
            { title: '考试', dataIndex: 'examTitle' },
            { title: '状态', dataIndex: 'status', render: (s: string) => ({ active: '有效', revoked: '已撤销', expired: '已过期' }[s] || s) },
            { title: '成绩', dataIndex: 'score' },
            { title: '有效期至', dataIndex: 'expireAt' }
          ]}
        />
      </div>
    </div>
  );
}
