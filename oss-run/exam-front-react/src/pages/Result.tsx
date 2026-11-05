/**
 * 成绩单：总分、双达标判定、知识点组、逐题解析
 * 状态/分数/时间/作答内容统一走公共组件与格式化方法（§5.1）
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Collapse, Flex, Progress, Tag, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { endpoints } from '../api';
import { panelIn } from '../utils/motion';
import { formatDateTime, formatPercent, formatScore, formatAnswer } from '../utils/format';
import { dict } from '../constants/dictionary';
import { PageContainer, PageLoading, Section } from '../components';

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
      } catch {
        /* 轮询错误静默，避免打断用户阅读 */
      }
    }, 5000);
    return () => clearInterval(t);
  }, [attemptId]);

  useEffect(() => {
    if (d?.status === 'graded') panelIn(ringRef.current);
  }, [d?.status]);

  if (!d) return <PageLoading tip="正在加载成绩单…" minHeight={320} />;

  const graded = d.status === 'graded';
  const pass = graded && d.dualPass;

  return (
    <PageContainer title={`成绩单 · ${d.examTitle}`}>
      {!graded && (
        <Section style={{ borderColor: '#f5e0bb', background: '#fdf6ec' }}>
          <Typography.Text type="warning">
            简答题已完成 AI 初评，待教师确认后成绩生效，页面将自动刷新。
          </Typography.Text>
        </Section>
      )}

      <Section>
        <div className="yj-score-ring" ref={ringRef}>
          <Progress
            type="circle"
            size={130}
            percent={graded ? Math.round(((d.totalScore || 0) / (d.passLine || 100)) * 100) : 0}
            status={pass ? 'success' : 'exception'}
            format={() => (
              <div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{graded ? formatScore(d.totalScore) : '—'}</div>
                <div style={{ fontSize: 12, color: '#6b7a90' }}>及格线 {formatScore(d.passLine)}</div>
              </div>
            )}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, marginBottom: 8 }}>
              {graded ? (
                pass ? <span className="yj-pass">✓ 双达标通过</span> : <span className="yj-fail">✗ 未达到双达标</span>
              ) : (
                <Tag color="processing">待教师确认</Tag>
              )}
              {graded && d.level === 'excellent' && <Tag color="gold">优秀</Tag>}
            </div>
            {graded && !pass && d.failReason && <Typography.Text type="secondary">{d.failReason}</Typography.Text>}
            <div className="yj-meta" style={{ marginTop: 6 }}>
              客观题 {formatScore(d.objectiveScore)} 分 · 简答题 {formatScore(d.essayScore)} 分 · 提交于 {formatDateTime(d.submittedAt)}
            </div>
            <Flex gap={10} style={{ marginTop: 12 }}>
              <Button onClick={() => nav(`/exam/${d.examId}`)}>返回考试</Button>
              <Button onClick={() => nav('/wrong')}>查看错题本</Button>
            </Flex>
          </div>
        </div>
      </Section>

      {graded && (d.groups || []).length > 0 && (
        <Section title="知识点组达标情况">
          {(d.groups || []).map((g: any) => (
            <Flex key={g.id} align="center" gap={12} style={{ marginBottom: 10 }}>
              <span style={{ width: 140, fontSize: 13 }}>{g.name}</span>
              <div className="yj-bar-track" style={{ maxWidth: 420 }}>
                <div
                  className="yj-bar-fill"
                  style={{ width: `${Math.min(100, Math.round(g.rate * 100))}%`, background: g.passed ? '#0f9d76' : '#d4380d' }}
                />
              </div>
              <span style={{ fontSize: 13, width: 190 }}>
                {formatPercent(g.rate)} / ≥{formatPercent(g.threshold)}{' '}
                {g.passed ? <span className="yj-pass">达标</span> : <span className="yj-fail">未达标</span>}
              </span>
            </Flex>
          ))}
        </Section>
      )}

      <Section title={`逐题解析${d.answersLocked ? '（成绩生效后开放）' : ''}`}>
        {d.answersLocked ? (
          <Typography.Text type="secondary">本卷设置为成绩生效后可见解析，请稍后回来查看。</Typography.Text>
        ) : (
          <Collapse
            items={(d.details || []).map((x: any) => ({
              key: x.qid,
              label: (
                <span>
                  <Tag>{dict('questionType', x.type).label}</Tag>
                  <Tag color={x.awarded >= x.score ? 'success' : x.awarded > 0 ? 'warning' : 'error'}>
                    {formatScore(x.awarded)}/{formatScore(x.score)} 分
                  </Tag>
                  {x.groupName && <Tag color="purple">{x.groupName}</Tag>}
                  <span style={{ fontWeight: 600 }}>{x.stem}</span>
                </span>
              ),
              children: (
                <div style={{ fontSize: 13, lineHeight: 2 }}>
                  <div><b>我的作答：</b>{formatAnswer(x.myAnswer, x.type) || '（未作答）'}</div>
                  <div><b>参考答案：</b>{formatAnswer(x.answer, x.type)}</div>
                  {x.analysis && <div><b>解析：</b>{x.analysis}</div>}
                  {x.ai && (
                    <div style={{ color: '#6b7a90' }}>
                      AI 初评：建议 {formatScore(x.ai.score ?? x.awarded)} 分 · 置信度 {formatPercent(x.ai.confidence)}
                      {x.ai.hit?.length ? ` · 命中要点 ${x.ai.hit.length}` : ''}
                    </div>
                  )}
                  {x.review && <div><b>教师评语：</b>{x.review.comment || '（无评语）'}</div>}
                </div>
              )
            }))}
          />
        )}
      </Section>
    </PageContainer>
  );
}
