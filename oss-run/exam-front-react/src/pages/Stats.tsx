/**
 * 分析看板：KPI、成绩分布、知识点组、题目质量（§5.1 统一数字/状态展示）
 */
import { useEffect, useState } from 'react';
import { Button, Flex } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { endpoints } from '../api';
import { formatPercent, formatScore } from '../utils/format';
import { PageContainer, PageLoading, Section, StatCard, DataTable } from '../components';

const BAR_COLORS = ['#1e5eff', '#5b8ff9', '#0f9d76', '#c2761b', '#d4380d'];

export default function Stats() {
  const { examId } = useParams();
  const [d, setD] = useState<any>(null);
  const nav = useNavigate();

  useEffect(() => {
    if (examId) endpoints.stats(examId).then(setD).catch(() => {});
  }, [examId]);

  if (!d) return <PageLoading tip="正在统计成绩…" minHeight={320} />;

  const maxCount = Math.max(1, ...(d.buckets || []).map((b: any) => b.count));
  const s = d.summary;

  return (
    <PageContainer
      title={`分析看板 · ${d.exam.title}`}
      extra={<Button onClick={() => nav('/manage')}>返回管理</Button>}
    >
      <div className="yj-stat-row">
        <StatCard label="参考人数" value={s.attendees} />
        <StatCard label="平均分" value={formatScore(s.avg)} />
        <StatCard label="中位数" value={formatScore(s.median)} />
        <StatCard label="双达标通过率" value={formatPercent(s.passRate)} color="#0f9d76" />
        <StatCard label="优秀率（≥85）" value={formatPercent(s.excellentRate)} color="#c2761b" />
        <StatCard label="最高 / 最低" value={`${formatScore(s.max)} / ${formatScore(s.min)}`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Section title={`成绩分布（及格线 ${formatScore(s.passLine)} 分）`}>
          {(d.buckets || []).map((b: any, i: number) => (
            <Flex key={b.label} align="center" gap={10} className="yj-bar-row">
              <span style={{ width: 60, fontSize: 12, color: '#6b7a90' }}>{b.label}</span>
              <div className="yj-bar-track">
                <div
                  className="yj-bar-fill"
                  style={{ width: `${(b.count / maxCount) * 100}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
                />
              </div>
              <b style={{ width: 24, textAlign: 'right', fontSize: 13 }}>{b.count}</b>
            </Flex>
          ))}
        </Section>

        <Section title="知识点组平均得分率">
          <DataTable
            rowKey="id"
            pagination={false}
            emptyText="本场考试未设置知识点组"
            dataSource={d.groups}
            columns={[
              { title: '知识点组', dataIndex: 'name' },
              { title: '平均得分率', dataIndex: 'avgRate', render: (v: number) => formatPercent(v) },
              { title: '达标线', dataIndex: 'threshold', render: (v: number) => formatPercent(v) },
              { title: '达标/总人数', render: (_: unknown, r: any) => `${r.passCount} / ${r.total}` }
            ]}
          />
        </Section>
      </div>

      <Section title="题目质量（按正确率升序）" style={{ marginTop: 16 }}>
        <DataTable
          rowKey="qid"
          pagination={{ pageSize: 8 }}
          emptyText="暂无作答数据"
          dataSource={d.questions}
          columns={[
            { title: '题干', dataIndex: 'stem', ellipsis: true },
            { title: '组', dataIndex: 'group', width: 110 },
            { title: '作答', dataIndex: 'answered', width: 70 },
            { title: '正确率', dataIndex: 'correctRate', width: 90, render: (v: number) => formatPercent(v) },
            {
              title: '标记',
              dataIndex: 'flag',
              width: 110,
              render: (f: string) => (f ? <span className={f === '过易' ? 'yj-lock' : 'yj-fail'}>{f}</span> : '-')
            }
          ]}
        />
      </Section>

      <Section title="学员成绩（按最高分排序，聚合历次）">
        <DataTable
          rowKey="userId"
          pagination={false}
          emptyText="暂无学员成绩"
          dataSource={d.users}
          columns={[
            { title: '姓名', dataIndex: 'name' },
            { title: '最高分', dataIndex: 'score', sorter: (a: any, b: any) => a.score - b.score },
            {
              title: '双达标',
              dataIndex: 'dualPass',
              render: (v: boolean) => (v ? <span className="yj-pass">通过</span> : <span className="yj-fail">未通过</span>)
            },
            { title: '作答次数', dataIndex: 'attempts' },
            { title: '行为事件', dataIndex: 'events' }
          ]}
        />
      </Section>
    </PageContainer>
  );
}
