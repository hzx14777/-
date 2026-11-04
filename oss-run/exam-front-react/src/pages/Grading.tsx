/**
 * 阅卷中心：队列（按置信度升序置顶）+ 卷面 + 教师确认
 */
import { useEffect, useState } from 'react';
import { Button, Input, InputNumber, Spin, Table, Tag, Typography, App as AntApp } from 'antd';
import { endpoints } from '../api';

export default function Grading() {
  const [queue, setQueue] = useState<any[]>([]);
  const [cur, setCur] = useState<string>();
  const [d, setD] = useState<any>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { message: msg } = AntApp.useApp();

  const loadQueue = () => endpoints.gradingQueue().then((r: any) => {
    setQueue(r);
    if (!cur && r.length) setCur(r[0].attemptId);
  }).catch(() => {});

  useEffect(() => { loadQueue(); }, []);

  useEffect(() => {
    if (!cur) return;
    setD(null);
    endpoints.gradingDetail(cur).then((r: any) => {
      setD(r);
      const s: Record<string, number> = {};
      (r.items || []).forEach((it: any) => { s[it.qid] = it.awarded ?? 0; });
      setScores(s);
      setComments({});
    }).catch(() => {});
  }, [cur]);

  const confirm = async () => {
    setSaving(true);
    try {
      const items = (d.items || []).map((it: any) => ({ qid: it.qid, score: scores[it.qid] ?? 0, comment: comments[it.qid] || '' }));
      const r = await endpoints.gradingConfirm(cur!, items);
      msg.success(`成绩已生效：${r.totalScore} 分，${r.dualPass ? '双达标通过' : '未达标'}`);
      setCur(undefined);
      setD(null);
      loadQueue();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="yj-page-title">阅卷中心（AI 初评 + 教师确认）</div>
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, alignItems: 'start' }}>
        <div className="yj-section" style={{ padding: 12 }}>
          <Table
            size="small"
            rowKey="attemptId"
            pagination={false}
            dataSource={queue}
            rowClassName={(r) => (r.attemptId === cur ? 'ant-table-row-selected' : '')}
            onRow={(r) => ({ onClick: () => setCur(r.attemptId), style: { cursor: 'pointer' } })}
            columns={[
              {
                title: '考生 / 试卷', dataIndex: 'userName',
                render: (_: any, r: any) => (
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.userName} <span style={{ color: '#6b7a90', fontWeight: 400 }}>{r.userAccount}</span></div>
                    <div style={{ fontSize: 12, color: '#6b7a90' }}>{r.examTitle}</div>
                  </div>
                )
              },
              {
                title: 'AI 置信度', dataIndex: 'confidence', width: 100,
                render: (v: number, r: any) => (
                  <Tag color={r.needReview ? 'red' : 'green'}>{Math.round(v * 100)}%</Tag>
                ),
                sorter: (a: any, b: any) => a.confidence - b.confidence,
                defaultSortOrder: 'ascend'
              },
              { title: '简答', dataIndex: 'essayCount', width: 55 },
              { title: '留痕', dataIndex: 'eventCount', width: 55 }
            ]}
          />
          {queue.length === 0 && <Typography.Text type="secondary">队列为空，全部答卷已确认。</Typography.Text>}
        </div>

        <div className="yj-section">
          {!d && (cur ? <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div> : <Typography.Text type="secondary">← 从左侧选择一份待确认答卷</Typography.Text>)}
          {d && (
            <>
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                {d.userName}（{d.userAccount}）· {d.examTitle} · 客观题 {d.objectiveScore} 分
              </Typography.Title>
              {(d.items || []).map((it: any) => (
                <div key={it.qid} className="yj-q-item">
                  <div className="yj-q-stem"><Tag color="purple">简答 · {it.score} 分</Tag>{it.stem}</div>
                  <div style={{ background: '#f7f9fd', borderRadius: 8, padding: '8px 12px', marginBottom: 10, whiteSpace: 'pre-wrap' }}>
                    {it.myAnswer || '（未作答）'}
                  </div>
                  {it.ai && (
                    <div style={{ fontSize: 12.5, color: '#44506a', marginBottom: 8 }}>
                      <b>AI 初评要点：</b>
                      {(it.ai.points || []).map((p: any, i: number) => (
                        <div key={i} style={{ paddingLeft: 10 }}>
                          {p.hit ? '✅' : '⚠️'} {p.text}（权重 {Math.round(p.weight * 100)}%）{p.evidence ? ` · 依据：${p.evidence}` : ''}
                        </div>
                      ))}
                      置信度 {Math.round((it.ai.confidence || 0) * 100)}% · 建议得分 {it.ai.score}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>教师确认得分：</span>
                    <InputNumber min={0} max={it.score} value={scores[it.qid]} onChange={(v) => setScores((p) => ({ ...p, [it.qid]: Number(v) || 0 }))} />
                    <Input
                      placeholder="评语（可选）"
                      style={{ flex: 1 }}
                      value={comments[it.qid] || ''}
                      onChange={(e) => setComments((p) => ({ ...p, [it.qid]: e.target.value }))}
                    />
                  </div>
                </div>
              ))}
              <Button type="primary" size="large" loading={saving} onClick={confirm}>确认成绩并生效</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
