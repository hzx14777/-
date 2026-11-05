/**
 * 分析看板：KPI、成绩分布（含及格线）、知识点组、题目质量（§5.1 统一数字/状态展示）
 */
import { useEffect, useMemo, useState } from 'react';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { endpoints } from '../api';
import { formatPercent, formatScore } from '../utils/format';
import { PageContainer, PageLoading, Section, StatCard, DataTable } from '../components';

const BAR_COLORS = ['#C9D8F5', '#9FBDF0', '#6C9AEE', '#3D7BF0', '#1657D6'];

export default function Stats() {
  const { examId } = useParams();
  const [d, setD] = useState<any>(null);
  const nav = useNavigate();

  useEffect(() => {
    if (examId) endpoints.stats(examId).then(setD).catch(() => {});
  }, [examId]);

  /* 及格线所在桶：用于在分布图上画一条参考线 */
  const passIdx = useMemo(() => {
    if (!d) return -1;
    const line = Number(d.summary.passLine);
    return (d.buckets || []).findIndex((b: any) => {
      const nums = String(b.label).match(/\d+/g);
      if (!nums) return false;
      const hi = Number(nums[nums.length - 1]);
      return hi >= line;
    });
  }, [d]);

  if (!d) return <PageLoading tip="正在统计成绩…" minHeight={320} />;

  const buckets = d.buckets || [];
  const maxCount = Math.max(1, ...buckets.map((b: any) => b.count));
  const s = d.summary;

  return (
    <PageContainer
      title={`分析看板 · ${d.exam.title}`}
      description="以双达标为判定口径统计；题目质量按正确率升序，便于优先调整过易或过难题目。"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => nav('/manage')}>返回管理</Button>
      }
    >
      <div className="yj-kpi-row yj-kpi-6">
        <StatCard label="参考人数" value={s.attendees} suffix="人" note={`作答 ${d.users?.length || 0} 人`} />
        <StatCard label="平均分" value={formatScore(s.avg)} note={`及格线 ${formatScore(s.passLine)} 分`} />
        <StatCard label="中位数" value={formatScore(s.median)} note="排除极端分数影响" />
        <StatCard
          label="双达标通过率"
          value={formatPercent(s.passRate)}
          color="#0F9D76"
          note={`${Math.round((s.passRate || 0) * (s.attendees || 0))} 人通过`}
        />
        <StatCard label="优秀率（≥85）" value={formatPercent(s.excellentRate)} color="#C89B3C" note="含重考最高分" />
        <StatCard label="最高 / 最低" value={`${formatScore(s.max)} / ${formatScore(s.min)}`} note="取历次最高分聚合" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 14 }}>
        <div className="yj-chart-card">
          <div className="yj-chart-head">
            <b>成绩分布</b>
            <span>及格线 {formatScore(s.passLine)} 分 · 纵轴为人数</span>
            <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#A3B0C2' }}>虚线左侧为未过线</span>
          </div>

          <div style={{ position: 'relative', paddingTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 148, borderBottom: '1px solid #E7ECF5' }}>
              {buckets.map((b: any, i: number) => (
                <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#415066' }}>{b.count}</span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 46,
                      height: Math.max(3, (b.count / maxCount) * 112),
                      borderRadius: '6px 6px 0 0',
                      background: i < passIdx ? '#C9D8F5' : BAR_COLORS[Math.min(i, BAR_COLORS.length - 1)],
                      transition: 'height .3s'
                    }}
                  />
                </div>
              ))}
            </div>
            {passIdx >= 0 && passIdx < buckets.length && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 18,
                  left: `${(passIdx / buckets.length) * 100}%`,
                  borderLeft: '1px dashed #C2761B'
                }}
              >
                <span style={{ position: 'absolute', top: -2, left: 4, fontSize: 10, color: '#C2761B', whiteSpace: 'nowrap' }}>
                  及格 {formatScore(s.passLine)}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              {buckets.map((b: any) => (
                <div key={b.label} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, color: '#8A97A8' }}>{b.label}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="yj-chart-card">
          <div className="yj-chart-head">
            <b>知识点组平均得分率</b>
            <span>虚线为达标线</span>
          </div>
          {(d.groups || []).length === 0 && (
            <div style={{ padding: '30px 0', textAlign: 'center', fontSize: 12, color: '#8A97A8' }}>本场考试未设置知识点组</div>
          )}
          {(d.groups || []).map((g: any) => {
            const rate = Math.min(100, Math.round((g.avgRate || 0) * 100));
            const th = Math.round((g.threshold || 0) * 100);
            const ok = (g.avgRate || 0) >= (g.threshold || 0);
            return (
              <div key={g.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: '#415066', flex: 1 }}>{g.name}</span>
                  <b style={{ fontSize: 12.5, color: ok ? '#0F9D76' : '#C2761B' }}>{rate}%</b>
                  <span style={{ fontSize: 10.5, color: '#A3B0C2' }}>≥{th}%</span>
                </div>
                <div className="yj-group-track" style={{ maxWidth: 'none', height: 8 }}>
                  <div className="yj-group-fill" style={{ width: `${rate}%`, background: ok ? '#0F9D76' : '#C2761B' }} />
                  <div className="yj-group-threshold" style={{ left: `${th}%` }} />
                </div>
              </div>
            );
          })}
          {(d.groups || []).length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed #EFF3F8', fontSize: 11, color: '#8A97A8' }}>
              达标组 {(d.groups || []).filter((g: any) => (g.avgRate || 0) >= (g.threshold || 0)).length} / {d.groups.length}
            </div>
          )}
        </div>
      </div>

      <Section title="题目质量（按正确率升序）" style={{ marginTop: 14 }}>
        <DataTable
          rowKey="qid"
          pagination={{ pageSize: 8 }}
          emptyText="暂无作答数据"
          dataSource={d.questions}
          columns={[
            { title: '题干', dataIndex: 'stem', ellipsis: true },
            { title: '知识点组', dataIndex: 'group', width: 130 },
            { title: '作答', dataIndex: 'answered', width: 70 },
            {
              title: '正确率',
              dataIndex: 'correctRate',
              width: 170,
              render: (v: number) => {
                const p = Math.round((v || 0) * 100);
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: '#EEF2F9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${p}%`, height: '100%', background: p < 40 ? '#D4380D' : p > 90 ? '#C2761B' : '#1657D6' }} />
                    </div>
                    <span style={{ fontSize: 11.5, color: '#415066', width: 34, textAlign: 'right' }}>{p}%</span>
                  </div>
                );
              }
            },
            {
              title: '标记',
              dataIndex: 'flag',
              width: 100,
              render: (f: string) => (f ? <span className={`yj-badge ${f === '过易' ? 'warn' : 'bad'}`}>{f}</span> : <span style={{ color: '#C7D0DE' }}>—</span>)
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
              render: (v: boolean) => (
                <span className={`yj-badge ${v ? 'ok' : 'bad'}`}>{v ? '通过' : '未通过'}</span>
              )
            },
            { title: '作答次数', dataIndex: 'attempts', width: 100 },
            { title: '行为事件', dataIndex: 'events', width: 100 }
          ]}
        />
      </Section>
    </PageContainer>
  );
}
