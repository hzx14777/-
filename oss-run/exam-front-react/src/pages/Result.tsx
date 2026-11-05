/**
 * 成绩单：先给结论（是否达标、差在哪），再给证据（知识点组、逐题解析）
 * 状态/分数/时间/作答内容统一走公共组件与格式化方法（§5.1）
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Tag, Typography } from 'antd';
import {
  ArrowRightOutlined,
  BookOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  DownOutlined,
  InfoCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { endpoints } from '../api';
import { panelIn } from '../utils/motion';
import { formatDateTime, formatPercent, formatScore, formatAnswer } from '../utils/format';
import { dict } from '../constants/dictionary';
import { PageContainer, PageLoading, Section } from '../components';

export default function Result() {
  const { attemptId } = useParams();
  const [d, setD] = useState<any>(null);
  const [onlyWrong, setOnlyWrong] = useState(false);
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

  const fullScore = useMemo(
    () => (d?.details || []).reduce((s: number, x: any) => s + Number(x.score || 0), 0) || 100,
    [d]
  );

  if (!d) return <PageLoading tip="正在加载成绩单…" minHeight={320} />;

  const graded = d.status === 'graded';
  const pass = graded && d.dualPass;
  const groups = d.groups || [];
  const notPassed = groups.filter((g: any) => !g.passed).length;
  const wrongCount = (d.details || []).filter((x: any) => Number(x.awarded) < Number(x.score)).length;
  const pct = Math.min(100, Math.round(((d.totalScore || 0) / fullScore) * 100));
  const ringColor = pass ? '#0F9D76' : graded ? '#C2761B' : '#C7D2E2';
  const details = (d.details || []).filter((x: any) => (onlyWrong ? Number(x.awarded) < Number(x.score) : true));

  const verdict = !graded ? '待教师确认' : pass ? '双达标通过' : '未达到双达标';
  const verdictTip = !graded
    ? '简答题已完成 AI 初评，教师确认后成绩生效，页面会自动刷新。'
    : pass
      ? d.admission?.status === 'active'
        ? '已获得项目准入资格，可在实训工坊兑换对应项目。'
        : '总分与知识点组均达标，准入资格已记录。'
      : notPassed > 0
        ? `距准入还差 ${notPassed} 个知识点组，系统按双达标规则判定本次未通过，可再次作答。`
        : d.failReason || '总分未达及格线，可再次作答。';

  return (
    <PageContainer
      title={`成绩单 · ${d.examTitle}`}
      extra={
        graded && (
          <Typography.Text type="secondary" style={{ fontSize: 11.5 }}>
            提交于 {formatDateTime(d.submittedAt)}
          </Typography.Text>
        )
      }
    >
      {!graded && (
        <Section style={{ borderColor: '#f5e0bb', background: '#fdf6ec', padding: '11px 16px' }}>
          <Typography.Text style={{ color: '#a25c0d', fontSize: 12.5 }}>
            简答题已完成 AI 初评，待教师确认后成绩生效，页面将自动刷新。
          </Typography.Text>
        </Section>
      )}

      {/* ---------- 结论区 ---------- */}
      <div className="yj-section yj-result-hero">
        <div className="yj-rh-left" ref={ringRef}>
          <div className="yj-ring" style={{ ['--p' as any]: pct, ['--rj' as any]: ringColor, width: 104, height: 104 }}>
            <span style={{ fontSize: 26, color: graded ? ringColor : '#A3B0C2', lineHeight: 1.1, textAlign: 'center' }}>
              {graded ? formatScore(d.totalScore) : '—'}
              <i style={{ display: 'block', fontSize: 10, fontStyle: 'normal', color: '#8A97A8', fontWeight: 500, marginTop: 2 }}>
                总分 {formatScore(fullScore)}
              </i>
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className={`yj-verdict ${!graded ? 'wait' : pass ? 'ok' : 'bad'}`}>
              {graded ? pass ? <CheckCircleFilled /> : <CloseCircleFilled /> : <InfoCircleOutlined />}
              {verdict}
              {graded && d.level === 'excellent' && <span className="yj-badge gold">优秀</span>}
            </div>
            <div style={{ fontSize: 12.5, color: '#6B7A90', marginTop: 7, lineHeight: 1.7, maxWidth: 430 }}>{verdictTip}</div>
            <div style={{ display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
              <span className={`yj-badge ${graded && d.totalPassed ? 'ok' : graded ? 'bad' : ''}`}>
                总分达标 {formatScore(d.totalScore)} / {formatScore(d.passLine)}
              </span>
              <span className={`yj-badge ${!graded ? '' : notPassed === 0 ? 'ok' : 'bad'}`}>
                知识点组达标 {groups.filter((g: any) => g.passed).length} / {groups.length}
              </span>
              {d.admission?.status === 'active' && <span className="yj-badge gold">准入资格有效</span>}
            </div>
          </div>
        </div>

        <div className="yj-rh-right">
          <div className="yj-rh-stats">
            <div className="yj-rh-stat">
              <span>客观题</span>
              <b>{formatScore(d.objectiveScore)}</b>
            </div>
            <div className="yj-rh-stat">
              <span>简答题</span>
              <b>{formatScore(d.essayScore)}</b>
            </div>
            <div className="yj-rh-stat">
              <span>得分率</span>
              <b>{formatPercent(pct / 100)}</b>
            </div>
            <div className="yj-rh-stat">
              <span>错题</span>
              <b style={{ color: wrongCount > 0 ? '#C2761B' : undefined }}>{wrongCount}</b>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <Button icon={<BookOutlined />} onClick={() => nav('/wrong')}>错题本</Button>
            <Button icon={<ArrowRightOutlined />} onClick={() => nav(`/exam/${d.examId}`)}>返回考试</Button>
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => nav(`/exam/${d.examId}`)}>
              再考一次
            </Button>
          </div>
        </div>
      </div>

      {/* ---------- 知识点组 ---------- */}
      {graded && groups.length > 0 && (
        <Section title="知识点组得分" extra={<span className="yj-soft-note">虚线为达标线，未达标项需重点补强</span>}>
          {groups.map((g: any) => {
            const rate = Math.round(g.rate * 100);
            const th = Math.round(g.threshold * 100);
            return (
              <div className="yj-group-row" key={g.id}>
                <div className="yj-group-name">
                  {g.passed ? (
                    <CheckCircleFilled style={{ color: '#0F9D76', fontSize: 13 }} />
                  ) : (
                    <CloseCircleFilled style={{ color: '#D4380D', fontSize: 13 }} />
                  )}
                  {g.name}
                </div>
                <div className="yj-group-track">
                  <div
                    className="yj-group-fill"
                    style={{ width: `${Math.min(100, rate)}%`, background: g.passed ? '#0F9D76' : '#C2761B' }}
                  />
                  <div className="yj-group-threshold" style={{ left: `${th}%` }} />
                </div>
                <div className="yj-group-val">
                  <b>{rate}%</b> / ≥{th}%
                  <span className={g.passed ? 'yj-pass' : 'yj-fail'} style={{ marginLeft: 6, fontSize: 11.5 }}>
                    {g.passed ? '达标' : '未达标'}
                  </span>
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {/* ---------- 逐题回顾 ---------- */}
      <Section
        title={`逐题回顾 · ${details.length} 题`}
        extra={
          <div style={{ display: 'flex', gap: 6 }}>
            <div className={`yj-chip${!onlyWrong ? ' on' : ''}`} onClick={() => setOnlyWrong(false)}>全部</div>
            <div className={`yj-chip${onlyWrong ? ' on' : ''}`} onClick={() => setOnlyWrong(true)}>只看错题 {wrongCount}</div>
          </div>
        }
      >
        {d.answersLocked ? (
          <Typography.Text type="secondary">本卷设置为成绩生效后可见解析，请稍后回来查看。</Typography.Text>
        ) : details.length === 0 ? (
          <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 12.5, color: '#8A97A8' }}>
            本次没有错题，全部答对。
          </div>
        ) : (
          <div>
            {details.map((x: any) => {
              const full = Number(x.awarded) >= Number(x.score);
              const zero = Number(x.awarded) <= 0;
              return (
                <div className="yj-rv-item" key={x.qid}>
                  <div className="yj-rv-top">
                    <span className="yj-rv-no num">Q{String(x.qid).replace(/\D/g, '').slice(-2) || ''}</span>
                    <Tag color="blue" style={{ margin: 0 }}>{dict('questionType', x.type).label}</Tag>
                    {x.groupName && <span className="yj-badge gold">{x.groupName}</span>}
                    <span className="yj-rv-stem" title={x.stem}>{x.stem}</span>
                    <span className={`yj-badge ${full ? 'ok' : zero ? 'bad' : 'warn'}`} style={{ flex: 'none' }}>
                      得分 {formatScore(x.awarded)} / {formatScore(x.score)}
                    </span>
                  </div>

                  <div className="yj-rv-ans">
                    <span className={`a ${full ? 'good' : 'bad'}`}>
                      {full ? <CheckCircleFilled /> : <CloseCircleFilled />}我的答案 <b>{formatAnswer(x.myAnswer, x.type) || '未作答'}</b>
                    </span>
                    <span className="a">
                      <CheckCircleFilled style={{ color: '#0F9D76' }} />正确答案 <b>{formatAnswer(x.answer, x.type)}</b>
                    </span>
                    {x.ai && (
                      <span className="a" style={{ marginLeft: 'auto' }}>
                        AI 初评 {formatScore(x.ai.score ?? x.awarded)} 分 · 置信度 {formatPercent(x.ai.confidence)}
                      </span>
                    )}
                  </div>

                  {x.analysis && (
                    <div className="yj-rv-exp">
                      <b style={{ color: '#415066' }}>解析：</b>
                      {x.analysis}
                    </div>
                  )}
                  {x.review?.comment && (
                    <div className="yj-rv-exp">
                      <b style={{ color: '#415066' }}>教师评语：</b>
                      {x.review.comment}
                    </div>
                  )}
                </div>
              );
            })}
            {onlyWrong && wrongCount === 0 && (
              <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12.5, color: '#8A97A8' }}>
                本次全部答对，没有错题。
              </div>
            )}
          </div>
        )}
        <div style={{ borderTop: '1px solid #F2F5FA', marginTop: 10, paddingTop: 9, fontSize: 11, color: '#8A97A8', display: 'flex', alignItems: 'center', gap: 5 }}>
          <DownOutlined style={{ fontSize: 10 }} /> 正确答案与解析由教师确认后开放，若答案有异议请联系任课教师
        </div>
      </Section>
    </PageContainer>
  );
}
