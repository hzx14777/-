/**
 * 成绩单：总分、双达标判定、知识点组、逐题解析
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Collapse, Progress, Spin, Tag, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { endpoints } from '../api';
import { panelIn } from '../motion';

const TYPE_LABEL: Record<string, string> = { single: '单选', multiple: '多选', judge: '判断', blank: '填空', essay: '简答' };

export default function Result() {
  const { attemptId } = useParams();
  const [d, setD] = useState<any>(null);
  const nav = useNavigate();
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!attemptId) return;
    const load = () => endpoints.attemptResult(attemptId).then(setD).catch(() => {});
    load();
    // 待阅卷状态每 5s 轮询，成绩生效后停止
    const t = setInterval(async () => {
      try {
        const r = await endpoints.attemptResult(attemptId);
        setD(r);
        if (r.status === 'graded') clearInterval(t);
      } catch { /* 忽略轮询错误 */ }
    }, 5000);
    return () => clearInterval(t);
  }, [attemptId]);

  useEffect(() => {
    if (d?.status === 'graded') panelIn(ringRef.current);
  }, [d?.status]);

  if (!d) return <div style={{ padding: 120, textAlign: 'center' }}><Spin size="large" /></div>;

  const graded = d.status === 'graded';
  const pass = graded && d.dualPass;

  return (
    <div>
      <div className="yj-page-title">成绩单 · {d.examTitle}</div>
      {!graded && (
        <div className="yj-section" style={{ borderColor: '#f5e0bb', background: '#fdf6ec' }}>
          <Typography.Text type="warning">
            简答题已完成 AI 初评，待教师确认后成绩生效，页面将自动刷新。
          </Typography.Text>
        </div>
      )}
      <div className="yj-section">
        <div className="yj-score-ring" ref={ringRef}>
          <Progress type="circle" size={130} percent={graded ? Math.round(((d.totalScore || 0) / (d.passLine || 100)) * 100) : 0}
            status={pass ? 'success' : 'exception'}
            format={() => (
              <div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{graded ? d.totalScore : '—'}</div>
                <div style={{ fontSize: 12, color: '#6b7a90' }}>及格线 {d.passLine}</div>
              </div>
            )} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, marginBottom: 8 }}>
              {graded ? (pass ? <span className="yj-pass">✓ 双达标通过</span> : <span className="yj-fail">✗ 未达到双达标</span>) : <Tag color="processing">待教师确认</Tag>}
              {graded && d.level === 'excellent' && <Tag color="gold">优秀</Tag>}
            </div>
            {graded && !pass && d.failReason && <Typography.Text type="secondary">{d.failReason}</Typography.Text>}
            <div className="yj-meta" style={{ marginTop: 6 }}>
              客观题 {d.objectiveScore ?? '-'} 分 · 简答题 {d.essayScore ?? '-'} 分 · 提交于 {d.submittedAt}
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
              <Button onClick={() => nav(`/exam/${d.examId}`)}>返回考试</Button>
              <Button onClick={() => nav('/wrong')}>查看错题本</Button>
            </div>
          </div>
        </div>
      </div>

      {graded && (d.groups || []).length > 0 && (
        <div className="yj-section">
          <h4>知识点组达标情况</h4>
          {(d.groups || []).map((g: any) => (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ width: 140, fontSize: 13 }}>{g.name}</span>
              <div className="yj-bar-track" style={{ maxWidth: 420 }}>
                <div className="yj-bar-fill" style={{ width: `${Math.min(100, Math.round(g.rate * 100))}%`, background: g.passed ? '#0f9d76' : '#d4380d' }} />
              </div>
              <span style={{ fontSize: 13, width: 190 }}>
                {Math.round(g.rate * 100)}% / ≥{Math.round(g.threshold * 100)}% {g.passed ? <span className="yj-pass">达标</span> : <span className="yj-fail">未达标</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="yj-section">
        <h4>逐题解析{d.answersLocked ? '（成绩生效后开放）' : ''}</h4>
        {d.answersLocked ? (
          <Typography.Text type="secondary">本卷设置为成绩生效后可见解析，请稍后回来查看。</Typography.Text>
        ) : (
          <Collapse
            items={(d.details || []).map((x: any) => ({
              key: x.qid,
              label: (
                <span>
                  <Tag>{TYPE_LABEL[x.type]}</Tag>
                  <Tag color={x.awarded >= x.score ? 'success' : x.awarded > 0 ? 'warning' : 'error'}>{x.awarded}/{x.score} 分</Tag>
                  {x.groupName && <Tag color="purple">{x.groupName}</Tag>}
                  <span style={{ fontWeight: 600 }}>{x.stem}</span>
                </span>
              ),
              children: (
                <div style={{ fontSize: 13, lineHeight: 2 }}>
                  <div><b>我的作答：</b>{formatAns(x.myAnswer, x.type) || '（未作答）'}</div>
                  <div><b>参考答案：</b>{formatAns(x.answer, x.type)}</div>
                  {x.analysis && <div><b>解析：</b>{x.analysis}</div>}
                  {x.ai && (
                    <div style={{ color: '#6b7a90' }}>
                      AI 初评：建议 {x.ai.score ?? x.awarded} 分 · 置信度 {Math.round((x.ai.confidence || 0) * 100)}%{x.ai.hit?.length ? ` · 命中要点 ${x.ai.hit.length}` : ''}
                    </div>
                  )}
                  {x.review && <div><b>教师评语：</b>{x.review.comment || '（无评语）'}</div>}
                </div>
              )
            }))}
          />
        )}
      </div>
    </div>
  );
}

function formatAns(v: any, type?: string): string {
  if (v == null) return '';
  if (type === 'judge') {
    const one = (x: any) => (x === 'T' ? '正确' : x === 'F' ? '错误' : String(x ?? ''));
    return Array.isArray(v) ? v.map(one).filter(Boolean).join(' ｜ ') : one(v);
  }
  if (Array.isArray(v)) return v.map((x) => (Array.isArray(x) ? x.join(' / ') : x)).filter(Boolean).join(' ｜ ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
