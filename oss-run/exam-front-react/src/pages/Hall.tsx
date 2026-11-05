/**
 * 考试大厅：下一场考试（主视觉）+ 考试卡片（解锁规则来自服务端 unlockState，前端只做展示）
 * 统计维度仅保留考试平台职责内的指标（§3 职责边界，学习积分由论坛平台负责，此处不再展示）
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Typography } from 'antd';
import {
  AimOutlined,
  ArrowRightOutlined,
  BookOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  FileDoneOutlined,
  HourglassOutlined,
  LockOutlined,
  PlayCircleOutlined,
  SafetyCertificateOutlined,
  TrophyOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { endpoints } from '../api';
import { listIn } from '../utils/motion';
import { formatDateTime, formatScore } from '../utils/format';
import { PageContainer, PageLoading, PageEmpty, StatCard, StatusTag } from '../components';

const NEW_WINDOW_MS = 7 * 24 * 3600 * 1000;

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'todo', label: '待完成' },
  { key: 'done', label: '已完成' },
  { key: 'locked', label: '未解锁' }
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

/** 截止倒计时文案：超过一天显示「天 + 小时」，否则「小时 + 分」 */
function remainText(endAt: string | undefined, now: number): string | null {
  if (!endAt) return null;
  const ms = new Date(endAt).getTime() - now;
  if (Number.isNaN(ms) || ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d} 天 ${h} 小时`;
  if (h > 0) return `${h} 小时 ${m} 分`;
  return `${m} 分`;
}

/** 卡片状态：决定顶部 3px 状态条与分数环配色 */
function cardState(e: any): 'todo' | 'done' | 'locked' {
  if (e.ongoingAttemptId) return 'todo';
  if (e.bestScore !== null) return 'done';
  return e.unlocked ? 'todo' : 'locked';
}

export default function Hall() {
  const [d, setD] = useState<any>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [now, setNow] = useState(Date.now());
  const nav = useNavigate();
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endpoints.hall().then(setD).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const exams = d?.exams || [];

  const buckets = useMemo(() => {
    const todo = exams.filter((e: any) => cardState(e) === 'todo');
    const done = exams.filter((e: any) => e.bestScore !== null);
    const locked = exams.filter((e: any) => cardState(e) === 'locked');
    return { all: exams, todo, done, locked } as Record<FilterKey, any[]>;
  }, [exams]);

  /* 主视觉：正在进行 > 未作答且已解锁 > 未达标可重考 > 其他已解锁 */
  const featured = useMemo(() => {
    if (!exams.length) return null;
    return (
      exams.find((e: any) => e.ongoingAttemptId) ||
      exams.find((e: any) => e.unlocked && e.bestScore === null && !e.pendingAttemptId) ||
      exams.find((e: any) => e.unlocked && e.bestPassed === false) ||
      exams.find((e: any) => e.unlocked) ||
      null
    );
  }, [exams]);

  const list = buckets[filter];

  useEffect(() => {
    if (d) listIn(gridRef.current, '.yj-exam-card');
  }, [d, filter]);

  if (!d) return <PageLoading tip="正在加载考试列表…" minHeight={320} />;

  const s = d.stats;

  /** 卡片主操作：按服务端下发的答题状态决定，避免出现「能点但进不去」 */
  const actions = (e: any, block = false) => {
    const primary = (label: string, to: string, icon?: ReactNode) => (
      <Button type="primary" block={block} icon={icon} onClick={() => nav(to)}>
        {label}
      </Button>
    );

    if (e.ongoingAttemptId) return primary('继续答题', `/answer/${e.ongoingAttemptId}`, <PlayCircleOutlined />);
    if (e.pendingAttemptId)
      return (
        <Button block={block} icon={<FileDoneOutlined />} onClick={() => nav(`/result/${e.pendingAttemptId}`)}>
          待确认成绩
        </Button>
      );
    if (e.bestAttemptId && e.bestScore !== null) {
      return (
        <div style={{ display: 'flex', gap: 8, width: block ? '100%' : undefined, justifyContent: 'flex-end' }}>
          <Button onClick={() => nav(`/result/${e.bestAttemptId}`)} icon={<UnorderedListOutlined />}>
            查看成绩
          </Button>
          {e.unlocked && (
            <Button type="primary" onClick={() => nav(`/exam/${e.id}`)} icon={<ArrowRightOutlined />}>
              再考一次
            </Button>
          )}
        </div>
      );
    }
    if (e.unlocked) return primary('进入考试', `/exam/${e.id}`, <ArrowRightOutlined />);
    return (
      <Button block={block} disabled icon={<LockOutlined />}>
        未解锁
      </Button>
    );
  };

  return (
    <PageContainer
      title="考试大厅"
      description={`本学期共 ${exams.length} 场考试，${buckets.todo.length} 场待完成，双达标通过 ${buckets.done.filter((e: any) => e.bestPassed).length} 场`}
    >
      <div className="yj-kpi-row">
        <StatCard
          label="待完成考试"
          value={buckets.todo.length}
          suffix="场"
          icon={<ClockCircleOutlined />}
          note={featured?.endAt ? `最近截止 ${formatDateTime(featured.endAt)}` : '按发布时间排序'}
        />
        <StatCard
          label="已有成绩"
          value={s.done}
          suffix="场"
          icon={<TrophyOutlined />}
          note={
            s.done > 0
              ? `其中双达标 ${buckets.done.filter((e: any) => e.bestPassed).length} 场`
              : '完成首场考试后在此汇总'
          }
        />
        <StatCard
          label="有效准入资格"
          value={s.admissions}
          suffix="项"
          icon={<SafetyCertificateOutlined />}
          color={s.admissions > 0 ? '#C89B3C' : undefined}
          note={s.admissions > 0 ? '可在实训工坊兑换项目' : '双达标通过后自动发放'}
        />
      </div>

      {featured && (
        <div className="yj-hero">
          <div className="yj-hero-main">
            <div className="yj-hero-eyebrow">
              <StatusTag kind="examType" value={featured.type} />
              <span>{featured.ongoingAttemptId ? '答题进行中' : featured.bestPassed ? '可重考提分' : '下一场待完成'}</span>
            </div>
            <h2 className="yj-hero-title">{featured.title}</h2>
            <div className="yj-hero-meta">
              <span>
                <BookOutlined /> {featured.questionCount} 题 / {formatScore(featured.totalScore)} 分
              </span>
              <span>
                <ClockCircleOutlined /> {featured.duration} 分钟
              </span>
              <span>
                <AimOutlined /> 及格线 {formatScore(featured.passLine)} 分
              </span>
              <span>
                <SafetyCertificateOutlined /> 知识点组 {featured.groups.length} 个
              </span>
              <span>
                <FileDoneOutlined /> 已考 {featured.attemptCount} 次
              </span>
            </div>
            {featured.bestScore !== null && !featured.bestPassed && (
              <div className="yj-hero-gap">
                <HourglassOutlined />
                上次 {formatScore(featured.bestScore)} 分，距及格线还差 {formatScore(featured.passLine - featured.bestScore)} 分
              </div>
            )}
            {featured.bestPassed && (
              <div className="yj-hero-gap" style={{ color: '#a8e6d0', background: 'rgba(15,157,118,.14)', borderColor: 'rgba(15,157,118,.35)' }}>
                <CheckCircleFilled /> 双达标已通过，再考一次可刷新最高分
              </div>
            )}
          </div>
          <div className="yj-hero-side">
            {remainText(featured.endAt, now) && (
              <>
                <div className="yj-hero-count">距截止还有</div>
                <div className="yj-hero-time">{remainText(featured.endAt, now)}</div>
              </>
            )}
            <div className="yj-hero-acts">
              {featured.bestAttemptId && featured.bestScore !== null && (
                <Button ghost onClick={() => nav(`/result/${featured.bestAttemptId}`)}>
                  查看上次成绩
                </Button>
              )}
              {actions(featured)}
            </div>
          </div>
        </div>
      )}

      <div className="yj-hall-head" style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#16202E' }}>全部考试</h3>
        <span style={{ fontSize: 11.5, color: '#8A97A8' }}>按发布时间排序</span>
        <div className="yj-hall-filter">
          {FILTERS.map((f) => (
            <div
              key={f.key}
              className={`yj-chip${filter === f.key ? ' on' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => setFilter(f.key)}
              onKeyDown={(e) => e.key === 'Enter' && setFilter(f.key)}
            >
              {f.label} {buckets[f.key].length}
            </div>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <PageEmpty description={filter === 'all' ? '暂无可参加的考试' : '该分类下暂无考试'} />
      ) : (
        <div className="yj-card-grid" ref={gridRef}>
          {list.map((e: any) => {
            const st = cardState(e);
            const pct = e.bestScore !== null && e.totalScore ? Math.round((e.bestScore / e.totalScore) * 100) : 0;
            const ringColor = e.bestPassed ? '#0F9D76' : e.bestScore !== null ? '#C2761B' : '#C7D2E2';
            const isNew = e.source === 'doclib' && e.publishedAt && Date.now() - new Date(e.publishedAt).getTime() < NEW_WINDOW_MS;
            const barColor = e.bestPassed ? '#0F9D76' : e.bestScore !== null ? '#C89B3C' : st === 'locked' ? '#CBD5E3' : '#1657D6';
            return (
              <div key={e.id} className={`yj-exam-card ${st}`} style={{ ['--bar' as any]: barColor }}>
                <div className="yj-exam-top">
                  <h3>{e.title}</h3>
                  <div style={{ display: 'flex', gap: 4, flex: '0 0 auto', alignItems: 'center' }}>
                    {isNew && <span className="yj-badge bad">NEW</span>}
                    <StatusTag kind="examType" value={e.type} />
                  </div>
                </div>

                <div className="yj-exam-meta">
                  <div>
                    <BookOutlined /> {e.courseName} · {e.questionCount} 题 / {formatScore(e.totalScore)} 分
                  </div>
                  <div>
                    <ClockCircleOutlined /> {e.duration} 分钟 · 及格线 {formatScore(e.passLine)} 分 · 取历次最高
                  </div>
                  <div>
                    <AimOutlined /> {e.groups.length ? `知识点组：${e.groups.map((g: any) => g.name).join('、')}` : '未设置知识点组'}
                  </div>
                </div>

                <div className="yj-exam-score">
                  <div className="yj-ring" style={{ ['--p' as any]: pct, ['--rj' as any]: ringColor }}>
                    <span style={{ color: ringColor }}>
                      {e.bestScore !== null ? formatScore(e.bestScore) : '—'}
                    </span>
                  </div>
                  <div className="yj-exam-score-txt">
                    {e.bestScore !== null ? (
                      <>
                        历次最高 <b>{formatScore(e.bestScore)}</b> / {formatScore(e.totalScore)}
                        <div>{e.bestPassed ? '双达标已通过' : `未达标 · 及格线 ${formatScore(e.passLine)}`}</div>
                      </>
                    ) : e.ongoingAttemptId ? (
                      <>
                        <b>作答中</b>
                        <div>答案已自动保存，可继续作答</div>
                      </>
                    ) : e.pendingAttemptId ? (
                      <>
                        <b>待教师确认</b>
                        <div>简答题确认后成绩生效</div>
                      </>
                    ) : (
                      <>
                        <b>尚未作答</b>
                        <div>已考 {e.attemptCount} 次 · 取历次最高分</div>
                      </>
                    )}
                  </div>
                  <span className={`yj-badge ${e.bestPassed ? 'ok' : e.bestScore !== null ? 'warn' : st === 'locked' ? '' : 'pri'}`}>
                    {e.bestPassed ? '已达标' : e.bestScore !== null ? '未达标' : st === 'locked' ? '未解锁' : '待完成'}
                  </span>
                </div>

                {!e.unlocked && e.lockReason && (
                  <div className="yj-exam-lock">
                    <LockOutlined style={{ marginTop: 2 }} />
                    <span>{e.lockReason}</span>
                  </div>
                )}

                <div className="yj-exam-foot">
                  <span style={{ fontSize: 10.5, color: '#A3B0C2', flex: 1 }}>
                    {e.publishedAt ? `发布 ${formatDateTime(e.publishedAt)}` : ''}
                  </span>
                  {actions(e)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Typography.Paragraph type="secondary" style={{ fontSize: 11.5, marginTop: 14, marginBottom: 0 }}>
        考试通过状态将通过统一事件 exam.passed / exam.failed 提供给实训工坊做项目准入判断。
      </Typography.Paragraph>
    </PageContainer>
  );
}
