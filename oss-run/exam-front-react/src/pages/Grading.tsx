/**
 * 阅卷中心：队列（按置信度升序置顶）+ 卷面 + 右侧评分面板
 * 三栏工作台的目的：评分时不必在「看答案」和「填分数」之间来回滚动。
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Input, InputNumber, Tag, Typography, App as AntApp, Tooltip } from 'antd';
import {
  CheckCircleFilled,
  ExclamationCircleFilled,
  RobotOutlined,
  ThunderboltOutlined,
  UserOutlined
} from '@ant-design/icons';
import { endpoints } from '../api';
import { formatPercent, formatScore } from '../utils/format';
import { PageContainer, PageLoading, PageEmpty } from '../components';

export default function Grading() {
  const [queue, setQueue] = useState<any[]>([]);
  const [cur, setCur] = useState<string>();
  const [d, setD] = useState<any>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { message: msg } = AntApp.useApp();

  const loadQueue = (autoSelect = false) =>
    endpoints
      .gradingQueue()
      .then((r: any) => {
        setQueue(r);
        if (autoSelect && r.length) setCur(r[0].attemptId);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));

  useEffect(() => {
    loadQueue(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cur) return;
    setD(null);
    endpoints
      .gradingDetail(cur)
      .then((r: any) => {
        setD(r);
        const s: Record<string, number> = {};
        (r.items || []).forEach((it: any) => {
          s[it.qid] = it.awarded ?? 0;
        });
        setScores(s);
        setComments({});
      })
      .catch(() => {});
  }, [cur]);

  const total = useMemo(() => Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0), [scores]);
  const fullTotal = useMemo(() => (d?.items || []).reduce((a: number, it: any) => a + Number(it.score || 0), 0), [d]);
  const aiTotal = useMemo(() => (d?.items || []).reduce((a: number, it: any) => a + Number(it.ai?.score ?? it.awarded ?? 0), 0), [d]);

  const confirm = async () => {
    setSaving(true);
    try {
      const items = (d.items || []).map((it: any) => ({ qid: it.qid, score: scores[it.qid] ?? 0, comment: comments[it.qid] || '' }));
      const r = await endpoints.gradingConfirm(cur!, items);
      msg.success(`成绩已生效：${formatScore(r.totalScore)} 分，${r.dualPass ? '双达标通过' : '未达标'}`);
      setScores({});
      setComments({});
      setD(null);
      await loadQueue(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title="阅卷中心"
      description="AI 初评 + 教师确认：置信度低的答卷自动排在队首，确认后成绩立即生效并同步准入判定。"
      extra={
        <span className="yj-badge pri">
          待确认 {queue.length} 份
        </span>
      }
    >
      <div className="yj-grade-layout">
        {/* 左：队列 */}
        <div className="yj-grade-queue">
          <div className="yj-queue-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600 }}>
              <UserOutlined style={{ color: '#1657D6' }} /> 待确认答卷
            </div>
            <div style={{ fontSize: 10.5, color: '#8A97A8', marginTop: 3 }}>按 AI 置信度升序，低置信度优先复核</div>
          </div>
          <div className="yj-queue-list">
            {!loaded && <PageLoading tip="加载队列…" minHeight={120} />}
            {loaded && queue.length === 0 && <PageEmpty description="队列为空，全部答卷已确认" />}
            {queue.map((r: any) => (
              <div
                key={r.attemptId}
                className={`yj-queue-item${r.attemptId === cur ? ' on' : ''}`}
                onClick={() => setCur(r.attemptId)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="q-name">
                    {r.userName} <span style={{ color: '#8A97A8', fontWeight: 400, fontSize: 11 }}>{r.userAccount}</span>
                  </div>
                  <div className="q-sub">{r.examTitle}</div>
                  <div className="q-sub" style={{ marginTop: 4 }}>
                    简答 {r.essayCount} 题 · 留痕 {r.eventCount} 次
                  </div>
                </div>
                <Tag color={r.needReview ? 'red' : 'green'} style={{ margin: 0, flex: 'none' }}>
                  {formatPercent(r.confidence)}
                </Tag>
              </div>
            ))}
          </div>
        </div>

        {/* 中：卷面 */}
        <div className="yj-grade-body">
          {!d && (cur ? <PageLoading tip="正在加载答卷…" /> : <PageEmpty description="从左侧选择一份待确认答卷" />)}
          {d && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                    {d.userName}
                    <span style={{ fontSize: 11.5, color: '#8A97A8', fontWeight: 400, marginLeft: 6 }}>{d.userAccount}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#6B7A90', marginTop: 2 }}>{d.examTitle}</div>
                </div>
                <span className="yj-badge">客观题 {formatScore(d.objectiveScore)} 分</span>
                <span className="yj-badge pri">简答 {d.items?.length || 0} 题</span>
              </div>

              {(d.items || []).map((it: any, i: number) => (
                <div key={it.qid} className="yj-grade-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="yj-badge pri">Q{i + 1}</span>
                    <span className="yj-badge">简答 · {formatScore(it.score)} 分</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8A97A8' }}>
                      AI 建议 {formatScore(it.ai?.score ?? it.awarded)} 分
                    </span>
                  </div>
                  <div className="yj-grade-stem">{it.stem}</div>
                  <div className="yj-grade-answer">{it.myAnswer || '（未作答）'}</div>

                  {it.ai && (
                    <div className="yj-ai-strip">
                      <div className="t">
                        <RobotOutlined /> AI 初评要点 · 置信度 {formatPercent(it.ai.confidence)}
                      </div>
                      {(it.ai.points || []).map((p: any, k: number) => (
                        <div key={k} className={`yj-ai-point ${p.hit ? 'hit' : 'miss'}`}>
                          {p.hit ? <CheckCircleFilled style={{ fontSize: 11 }} /> : <ExclamationCircleFilled style={{ fontSize: 11 }} />}{' '}
                          {p.text}
                          <span style={{ color: '#8A97A8' }}>（权重 {formatPercent(p.weight)}）</span>
                          {p.evidence ? <span style={{ color: '#8A97A8' }}> · 依据：{p.evidence}</span> : null}
                        </div>
                      ))}
                    </div>
                  )}

                  <Input
                    placeholder="评语（可选，学生可在成绩单看到）"
                    value={comments[it.qid] || ''}
                    onChange={(e) => setComments((p) => ({ ...p, [it.qid]: e.target.value }))}
                  />
                </div>
              ))}
            </>
          )}
        </div>

        {/* 右：评分面板 */}
        <div className="yj-score-panel">
          <div className="yj-queue-head">
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>评分</div>
            <div style={{ fontSize: 10.5, color: '#8A97A8', marginTop: 3 }}>逐题给分，确认后立即生效</div>
          </div>

          <div className="yj-score-total">
            <b>{formatScore(total)}</b>
            <span>/ {formatScore(fullTotal)} 分（简答部分）</span>
          </div>

          <div style={{ maxHeight: 'calc(100vh - 360px)', overflow: 'auto' }}>
            {(d?.items || []).length === 0 && (
              <div style={{ padding: '16px 14px', fontSize: 11.5, color: '#8A97A8' }}>选择答卷后在此给分</div>
            )}
            {(d?.items || []).map((it: any, i: number) => (
              <div className="yj-score-row" key={it.qid}>
                <span className="qn">Q{i + 1}</span>
                <span className="qs" title={it.stem}>{it.stem}</span>
                <InputNumber
                  size="small"
                  min={0}
                  max={it.score}
                  value={scores[it.qid]}
                  onChange={(v) => setScores((p) => ({ ...p, [it.qid]: Number(v) || 0 }))}
                  style={{ width: 62 }}
                />
                <span style={{ fontSize: 10.5, color: '#8A97A8', width: 26, textAlign: 'right' }}>/{formatScore(it.score)}</span>
              </div>
            ))}
          </div>

          <div className="yj-score-acts">
            {d && (
              <div style={{ display: 'flex', gap: 6, fontSize: 11, color: '#8A97A8' }}>
                <Tooltip title="按 AI 建议分数填充，可再逐题微调">
                  <Button
                    size="small"
                    type="dashed"
                    block
                    icon={<ThunderboltOutlined />}
                    onClick={() => {
                      const s: Record<string, number> = {};
                      (d.items || []).forEach((it: any) => (s[it.qid] = Number(it.ai?.score ?? it.awarded ?? 0)));
                      setScores(s);
                    }}
                  >
                    采用 AI 建议分（{formatScore(aiTotal)}）
                  </Button>
                </Tooltip>
              </div>
            )}
            <Button type="primary" block loading={saving} disabled={!d} onClick={confirm}>
              确认成绩并进入下一份
            </Button>
            <Typography.Text type="secondary" style={{ fontSize: 10.5, lineHeight: 1.6 }}>
              确认后成绩立即生效，并触发 exam.passed / exam.failed 事件；确认前可反复调整。
            </Typography.Text>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
