/**
 * 分析看板：KPI、成绩分布、知识点组、题目质量（§5.1 统一数字/状态展示）
 */
import { useEffect, useState } from 'react';
import { Button, Spin, Table, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { endpoints } from '../api';

const COLORS = ['#1e5eff', '#5b8ff9', '#0f9d76', '#c2761b', '#d4380d'];

export default function Stats() {
  const { examId } = useParams();
  const [d, setD] = useState<any>(null);
  const nav = useNavigate();

  useEffect(() => {
    if (examId) endpoints.stats(examId).then(setD).catch(() => {});
  }, [examId]);

  if (!d) return <div style={{ padding: 120, textAlign: 'center' }}><Spin size="large" /></div>;

  const maxCount = Math.max(1, ...(d.buckets || []).map((b: any) => b.count));
  const s = d.summary;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <div className="yj-page-title" style={{ margin: 0, flex: 1 }}>分析看板 · {d.exam.title}</div>
        <Button onClick={() => nav('/manage')}>返回管理</Button>
      </div>

      <div className="yj-stat-row">
        {[
          { l: '参考人数', v: s.attendees },
          { l: '平均分', v: s.avg },
          { l: '中位数', v: s.median },
          { l: '双达标通过率', v: `${Math.round(s.passRate * 100)}%` },
          { l: '优秀率(≥85)', v: `${Math.round(s.excellentRate * 100)}%` },
          { l: '最高 / 最低', v: `${s.max} / ${s.min}` }
        ].map((x) => (
          <div key={x.l} className="yj-exam-card" style={{ textAlign: 'center' }}>
            <div className="yj-meta">{x.l}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0e1c36' }}>{x.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="yj-section">
          <h4>成绩分布（及格线 {s.passLine} 分）</h4>
          {(d.buckets || []).map((b: any, i: number) => (
            <div key={b.label} className="yj-bar-row">
              <span style={{ width: 60, fontSize: 12, color: '#6b7a90' }}>{b.label}</span>
              <div className="yj-bar-track">
                <div className="yj-bar-fill" style={{ width: `${(b.count / maxCount) * 100}%`, background: COLORS[i % COLORS.length] }} />
              </div>
              <b style={{ width: 24, textAlign: 'right', fontSize: 13 }}>{b.count}</b>
            </div>
          ))}
        </div>
        <div className="yj-section">
          <h4>知识点组平均得分率</h4>
          <Table
            size="small" rowKey="id" pagination={false} dataSource={d.groups}
            columns={[
              { title: '知识点组', dataIndex: 'name' },
              { title: '平均得分率', dataIndex: 'avgRate', render: (v: number) => `${Math.round(v * 100)}%` },
              { title: '达标线', dataIndex: 'threshold', render: (v: number) => `${Math.round(v * 100)}%` },
              { title: '达标/总人数', render: (_: any, r: any) => `${r.passCount} / ${r.total}` }
            ]}
          />
        </div>
      </div>

      <div className="yj-section" style={{ marginTop: 16 }}>
        <h4>题目质量（按正确率升序）</h4>
        <Table
          size="small" rowKey="qid" pagination={{ pageSize: 8 }} dataSource={d.questions}
          columns={[
            { title: '题干', dataIndex: 'stem', ellipsis: true },
            { title: '组', dataIndex: 'group', width: 110 },
            { title: '作答', dataIndex: 'answered', width: 70 },
            { title: '正确率', dataIndex: 'correctRate', width: 90, render: (v: number) => `${Math.round(v * 100)}%` },
            {
              title: '标记', dataIndex: 'flag', width: 110,
              render: (f: string) => (f ? <Typography.Text type={f === '过易' ? 'warning' : 'danger'}>{f}</Typography.Text> : '-')
            }
          ]}
        />
      </div>

      <div className="yj-section">
        <h4>学员成绩（按最高分排序，聚合历次）</h4>
        <Table
          size="small" rowKey="userId" pagination={false} dataSource={d.users}
          columns={[
            { title: '姓名', dataIndex: 'name' },
            { title: '最高分', dataIndex: 'score', sorter: (a: any, b: any) => a.score - b.score },
            { title: '双达标', dataIndex: 'dualPass', render: (v: boolean) => (v ? <span className="yj-pass">通过</span> : <span className="yj-fail">未通过</span>) },
            { title: '作答次数', dataIndex: 'attempts' },
            { title: '行为事件', dataIndex: 'events' }
          ]}
        />
      </div>
    </div>
  );
}
