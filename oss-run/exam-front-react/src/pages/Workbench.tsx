/**
 * AI 命题工作台（三步）：选章节 → 设参数 → 审核候选题
 * 章节与知识点为只读引用（课程内容由自学平台维护，§3）；题型/难度标签统一走字典。
 *
 * 版式：顶部三段式步骤条 + 分栏工作区；审核阶段逐题给「通过 / 淘汰」，
 * 只有全部通过才会归档入库，其余题目带原因退回，避免误入库。
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Slider, Tag, App as AntApp } from 'antd';
import {
  ArrowRightOutlined,
  CheckOutlined,
  CloseOutlined,
  FileTextOutlined,
  ReloadOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { endpoints } from '../api';
import { fmtAnswer, optionsOf } from '../utils/paper';
import { PageContainer, PageLoading, StatusTag } from '../components';

/** 任务终态：后端统一返回 completed；保留兼容取值，避免历史任务卡在进行中 */
const DONE_STATUS = ['completed', 'done', 'reviewed', 'success'];
const FAIL_STATUS = ['failed', 'error', 'cancelled', 'canceled'];
const MAX_POLL = 60; // 60 × 1.2s ≈ 72s，避免无限轮询

const STEP_META = [
  { title: '选择章节', desc: '课程 → 章节' },
  { title: '命题参数', desc: '知识点与题量' },
  { title: '审核入库', desc: '逐题通过 / 淘汰' }
];

export default function Workbench() {
  const [step, setStep] = useState(0);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState<string>();
  const [chapters, setChapters] = useState<any[]>([]);
  const [chapterId, setChapterId] = useState<string>();
  const [chapter, setChapter] = useState<any>(null);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [kpIds, setKpIds] = useState<string[]>([]);
  const [count, setCount] = useState(10);
  const [jobId, setJobId] = useState<string>();
  const [job, setJob] = useState<any>(null);
  const [decisions, setDecisions] = useState<Record<string, 'approve' | 'reject'>>({});
  const [approving, setApproving] = useState(false);
  const timer = useRef<any>(null);
  const nav = useNavigate();
  const { message: msg } = AntApp.useApp();

  useEffect(() => {
    endpoints
      .courses()
      .then((r: any) => setCourses(r.items || []))
      .catch(() => {});
  }, []);

  const stopPoll = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  // 组件卸载时清掉定时器，避免离开页面后仍在轮询
  useEffect(() => stopPoll, []);

  const pickCourse = async (id: string) => {
    setCourseId(id);
    setChapterId(undefined);
    setChapter(null);
    try {
      const meta = await endpoints.meta();
      setChapters((meta.chapters || []).filter((c: any) => c.courseId === id));
    } catch {
      setChapters([]);
    }
  };

  const pickChapter = async (id: string) => {
    setChapterId(id);
    setKpIds([]);
    setLoadingChapter(true);
    try {
      const ch = await endpoints.chapter(id);
      setChapter(ch);
    } catch {
      setChapter(null);
    } finally {
      setLoadingChapter(false);
    }
  };

  const generate = async () => {
    if (!chapterId) return msg.warning('请先选择章节');
    try {
      const r = await endpoints.createJob({ chapterId, count, kpIds: kpIds.length ? kpIds : undefined });
      setJobId(r.jobId);
      setJob(null);
      setDecisions({});
      setStep(2);
      poll(r.jobId);
    } catch (e: any) {
      msg.error(e?.message || '命题任务创建失败，请重试');
    }
  };

  const poll = (id: string) => {
    stopPoll();
    let ticks = 0;
    timer.current = setInterval(async () => {
      ticks += 1;
      try {
        const j = await endpoints.job(id);
        const st = String(j?.status || '');
        const finished = !!j?.progress?.done || DONE_STATUS.includes(st);
        if (finished) {
          stopPoll();
          const list = j.candidates || [];
          const seed: Record<string, 'approve' | 'reject'> = {};
          list.forEach((c: any) => {
            seed[c.id] = c.review === 'rejected' ? 'reject' : 'approve';
          });
          setDecisions(seed);
          setJob({ ...j, status: 'completed' });
          if (list.length) msg.success('命题完成，请审核候选题');
          else msg.warning('本次未生成候选题，请调整章节或参数后重试');
          return;
        }
        if (FAIL_STATUS.includes(st)) {
          stopPoll();
          setJob(j);
          msg.warning('命题任务未完成，请重试');
          return;
        }
        setJob(j);
        if (ticks >= MAX_POLL) {
          stopPoll();
          msg.warning('命题耗时较长，请稍后重试');
        }
      } catch (e: any) {
        stopPoll();
        msg.error(e?.message || '命题进度查询失败，请重试');
      }
    }, 1200);
  };

  const submitReview = async () => {
    const cands = job?.candidates || [];
    const approve = cands.filter((c: any) => !c.review && decisions[c.id] === 'approve').map((c: any) => c.id);
    const reject = cands
      .filter((c: any) => !c.review && decisions[c.id] === 'reject')
      .map((c: any) => ({ id: c.id, reason: '教师审核淘汰' }));
    if (!approve.length && !reject.length) return msg.warning('没有待提交的候选题');
    setApproving(true);
    try {
      const r: any = await endpoints.reviewJob(jobId!, { approve, reject });
      msg.success(`审核完成：通过 ${r?.created ?? approve.length} 题，淘汰 ${reject.length} 题`);
      stopPoll();
      setStep(0);
      setJob(null);
      setJobId(undefined);
      setDecisions({});
      if ((r?.created ?? approve.length) > 0) nav('/ai-bank');
    } finally {
      setApproving(false);
    }
  };

  const resetStep = (target: number) => {
    if (target === 2 && !jobId) return;
    if (target < 2) stopPoll();
    setStep(target);
  };

  const cands = job?.candidates || [];
  const pending = cands.filter((c: any) => !c.review);
  const approveCount = pending.filter((c: any) => decisions[c.id] === 'approve').length;
  const rejectCount = pending.length - approveCount;
  const flagged = cands.filter((c: any) => (c.issues || []).length > 0).length;
  const course = courses.find((c) => c.id === courseId);
  const progress = Number(job?.progress?.percent || 0);

  return (
    <PageContainer
      title="AI 命题工作台"
      description="按章节与知识点抽取教材正文生成候选题，经教师审核后归档至 AI 题库；课程与章节由自学平台维护，本平台只读引用。"
      extra={<Button type="link" onClick={() => nav('/ai-bank')}>查看 AI 题库 →</Button>}
    >
      {/* 步骤条 */}
      <div className="yj-panel" style={{ padding: '14px 18px 12px', marginBottom: 14 }}>
        <div className="yj-steps">
          {STEP_META.map((s, i) => (
            <div key={s.title} style={{ display: 'contents' }}>
              <div className={`yj-step${step === i ? ' on' : ''}${step > i ? ' done' : ''}`} onClick={() => resetStep(i)} role="button" tabIndex={0}>
                <span className="yj-step-no">{step > i ? <CheckOutlined /> : i + 1}</span>
                <span className="yj-step-txt">
                  <b>{s.title}</b>
                  <span>{s.desc}</span>
                </span>
              </div>
              {i < STEP_META.length - 1 && <span className={`yj-step-line${step > i ? ' done' : ''}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* ---------- 第一步：课程与章节 ---------- */}
      {step === 0 && (
        <div className="yj-grid-2">
          <div className="yj-panel">
            <div className="yj-panel-head">
              <FileTextOutlined style={{ color: '#93A3B8' }} />
              <b>选择课程</b>
              <span className="yj-sub">共 {courses.length} 门</span>
            </div>
            <div className="yj-panel-pad">
              {courses.length === 0 ? (
                <PageLoading tip="正在加载课程…" minHeight={160} />
              ) : (
                <div className="yj-course-grid">
                  {courses.map((c) => (
                    <div
                      key={c.id}
                      className={`yj-course-card${courseId === c.id ? ' on' : ''}`}
                      onClick={() => pickCourse(c.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <b>{c.name}</b>
                      <span>{c.chapterCount} 章 · 已有 {c.questionCount} 题</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="yj-panel">
            <div className="yj-panel-head">
              <b>章节</b>
              <span className="yj-sub">{course ? course.name : '先选择左侧课程'}</span>
            </div>
            <div className="yj-panel-pad">
              {!courseId ? (
                <div className="yj-hint" style={{ padding: '22px 0', textAlign: 'center' }}>
                  选择课程后在这里列出章节
                </div>
              ) : chapters.length === 0 ? (
                <PageLoading tip="正在加载章节…" minHeight={140} />
              ) : (
                <div className="yj-chapter-list">
                  {chapters.map((ch: any) => (
                    <div
                      key={ch.id}
                      className={`yj-chapter-item${chapterId === ch.id ? ' on' : ''}`}
                      onClick={() => pickChapter(ch.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="nm">{ch.name}</span>
                      <span className="n">{(ch.kps || []).length} 知识点</span>
                    </div>
                  ))}
                </div>
              )}
              <Button
                type="primary"
                block
                style={{ marginTop: 12 }}
                disabled={!chapter || loadingChapter}
                onClick={() => setStep(1)}
              >
                下一步：配置参数 <ArrowRightOutlined />
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 0 && (
        <div className="yj-panel" style={{ marginTop: 14 }}>
          <div className="yj-panel-head">
            <b>命题流水线</b>
            <span className="yj-sub">所有候选题均携带正文溯源，可回溯到章节与模型版本</span>
          </div>
          <div className="yj-panel-pad">
            <div className="yj-flow-grid">
              {[
                ['抽取正文', '按章节读取教材正文与知识点，只读引用自学平台内容，不在本平台修改课程。'],
                ['生成候选', '依据正文要点生成题干、选项、答案与解析，自动完成自检与相似度判重（阈值 0.90）。'],
                ['教师审核', '逐题通过或淘汰；通过的题目归档至 AI 题库，并记录来源任务与审核人。']
              ].map(([t, d], i) => (
                <div className="yj-flow-card" key={t}>
                  <b><span className="yj-flow-no">{i + 1}</span>{t}</b>
                  <span>{d}</span>
                </div>
              ))}
            </div>

            {courses.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed #f0f3f8' }}>
                <div className="yj-subhead" style={{ marginBottom: 8 }}>各课程题量（用于判断哪些章节需要补题）</div>
                <div className="yj-course-stat">
                  {courses.map((c) => {
                    const max = Math.max(...courses.map((x) => x.questionCount || 0), 1);
                    return (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                        <span style={{ flex: '0 0 112px', fontSize: 11.4, color: 'var(--yj-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.name}
                        </span>
                        <span style={{ flex: 1, minWidth: 0, height: 5, borderRadius: 3, background: '#eef2f9', overflow: 'hidden' }}>
                          <i style={{ display: 'block', height: '100%', width: `${Math.round(((c.questionCount || 0) / max) * 100)}%`, background: '#9fbbec', borderRadius: 3 }} />
                        </span>
                        <span className="num" style={{ fontSize: 11, color: 'var(--yj-sub)', flex: 'none' }}>{c.questionCount || 0} 题</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- 第二步：参数 ---------- */}
      {step === 1 && chapter && (
        <div className="yj-grid-2">
          <div className="yj-panel">
            <div className="yj-panel-head">
              <b>{chapter.name}</b>
              <span className="yj-sub">教材正文（只读引用）</span>
            </div>
            <div className="yj-panel-pad">
              <div style={{ maxHeight: 208, overflow: 'auto', fontSize: 12.5, lineHeight: 1.9, color: 'var(--yj-text-2)', paddingRight: 4 }}>
                {chapter.body}
              </div>
              <div className="yj-subhead" style={{ marginTop: 16 }}>
                知识点范围 <span style={{ color: 'var(--yj-sub)', fontWeight: 400 }}>（不选则整章）</span>
              </div>
              <div className="yj-kp-chips">
                {(chapter.kps || []).map((k: any) => {
                  const on = kpIds.includes(k.id);
                  return (
                    <button
                      key={k.id}
                      className={`yj-kp-chip${on ? ' on' : ''}`}
                      onClick={() => setKpIds((prev) => (on ? prev.filter((x) => x !== k.id) : [...prev, k.id]))}
                    >
                      {on && <CheckOutlined />}
                      {k.name}
                      <i>{k.questionCount} 题</i>
                    </button>
                  );
                })}
              </div>

              <div className="yj-draft-note" style={{ marginTop: 14 }}>
                <b style={{ color: 'var(--yj-text-2)', display: 'block', marginBottom: 3 }}>命题提示</b>
                · 题干与解析会自动附带章节出处，便于溯源与复核；<br />
                · 与已入库题目相似度高于 0.90 的候选题会被判重拦截；<br />
                · 生成结果全部为候选状态，审核通过后才写入题库。
              </div>
            </div>
          </div>

          <div className="yj-panel">
            <div className="yj-panel-head">
              <ThunderboltOutlined style={{ color: '#C89B3C' }} />
              <b>生成参数</b>
            </div>
            <div className="yj-panel-pad">
              <div className="yj-subhead">题量</div>
              <div className="yj-stepper">
                <button onClick={() => setCount((c) => Math.max(3, c - 1))} disabled={count <= 3} aria-label="减少题量">−</button>
                <b className="num">{count}</b>
                <button onClick={() => setCount((c) => Math.min(20, c + 1))} disabled={count >= 20} aria-label="增加题量">+</button>
                <span className="yj-hint" style={{ marginLeft: 4 }}>3 - 20 题</span>
              </div>
              <Slider min={3} max={20} value={count} onChange={setCount} style={{ marginTop: 8 }} />

              <div style={{ marginTop: 12, borderTop: '1px dashed #f0f3f8', paddingTop: 10 }}>
                {[
                  ['课程', course?.name || '-'],
                  ['章节', chapter.name],
                  ['知识点', kpIds.length ? `${kpIds.length} 个已选` : '整章覆盖'],
                  ['拟生成', `${count} 题候选`],
                  ['耗时预估', `约 ${Math.max(1, Math.round(count * 0.8))} 分钟`]
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', fontSize: 11.5, padding: '4px 0' }}>
                    <span style={{ width: 66, color: 'var(--yj-sub)' }}>{k}</span>
                    <span style={{ flex: 1, color: 'var(--yj-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <Button onClick={() => setStep(0)}>上一步</Button>
                <Button type="primary" block onClick={generate}>
                  开始命题
                </Button>
              </div>
              <div className="yj-hint" style={{ marginTop: 8 }}>
                命题结果全部为候选状态，需审核通过后才进入题库。
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- 第三步：审核 ---------- */}
      {step === 2 && (
        <div>
          {(!job || job.status !== 'completed' || !cands.length) && (
            <div className="yj-panel yj-panel-pad">
              {job?.status === 'completed' ? (
                <Alert
                  type="warning"
                  showIcon
                  message="本次未生成候选题"
                  description="可返回上一步调整知识点范围或题量后重新命题。"
                  action={<Button size="small" onClick={() => setStep(1)}>返回调整</Button>}
                />
              ) : (
                <div style={{ padding: '18px 4px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--yj-text-2)' }}>
                    <ThunderboltOutlined style={{ color: 'var(--yj-pri)' }} />
                    {job?.progress?.stage || '抽取正文要点 → 生成候选 → 自检与查重'}
                    <span className="yj-badge pri" style={{ marginLeft: 'auto' }}>{progress}%</span>
                  </div>
                  <div className="yj-progress-big">
                    <i style={{ width: `${Math.max(6, progress)}%` }} />
                  </div>
                  <div className="yj-hint">命题过程不会阻塞其他操作，完成后候选题会在这里列出，可逐题通过或淘汰。</div>
                </div>
              )}
            </div>
          )}

          {job && job.status === 'completed' && cands.length > 0 && (
            <>
              <div className="yj-panel" style={{ padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span className="yj-badge ok"><CheckOutlined /> 通过 {approveCount}</span>
                <span className="yj-badge bad"><CloseOutlined /> 淘汰 {rejectCount}</span>
                <span className="yj-hint">
                  共 {cands.length} 题候选，
                  {flagged ? `其中 ${flagged} 题命中重复或自检告警，建议复核后再入库` : '全部通过自检与相似度判重（阈值 0.90）'}
                  ，均携带正文溯源
                </span>
                <span style={{ flex: 1 }} />
                <Button
                  size="small"
                  onClick={() => setDecisions(Object.fromEntries(pending.map((c: any) => [c.id, 'approve'])) as any)}
                  disabled={!pending.length}
                >
                  全部通过
                </Button>
                <Button
                  size="small"
                  onClick={() => setDecisions(Object.fromEntries(pending.map((c: any) => [c.id, 'reject'])) as any)}
                  disabled={!pending.length}
                >
                  全部淘汰
                </Button>
                <Button size="small" onClick={() => setStep(1)}>调整参数重出</Button>
              </div>

              {cands.map((c: any, i: number) => {
                const d = decisions[c.id] || 'approve';
                return (
                  <div key={c.id} className={`yj-cand${d === 'reject' ? ' reject' : ''}`}>
                    <div className="yj-cand-head">
                      <span className="yj-wrong-no num">{String(i + 1).padStart(2, '0')}</span>
                      <StatusTag kind="questionType" value={c.type} />
                      <StatusTag kind="difficulty" value={c.difficulty} />
                      {c.review && <StatusTag kind="reviewStatus" value={c.review} />}
                      <span className="yj-cand-stem">{c.stem}</span>
                    </div>

                    <div className="yj-cand-opts">
                      {optionsOf(c).map((o: any) => (
                        <div key={o.id}>
                          {c.type === 'judge' ? o.content : <><b>{o.id}.</b> {o.content}</>}
                        </div>
                      ))}
                    </div>

                    <div className="yj-cand-foot">
                      <span><b style={{ color: '#415066' }}>答案</b> {fmtAnswer(c)}</span>
                      <span>·</span>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 420 }}>
                        解析 {c.analysis || '—'}
                      </span>
                      <span className="sp" />
                      {((c.issues || []).length === 0) ? (
                        <Tag color="success" style={{ marginInlineEnd: 0 }}>自检通过</Tag>
                      ) : (
                        <Tag color="warning" style={{ marginInlineEnd: 0 }}>{(c.issues || []).map((x: any) => x.text).join('；')}</Tag>
                      )}
                      {!c.review && (
                        <span className="yj-seg">
                          <button
                            className={d === 'approve' ? 'on ok' : ''}
                            onClick={() => setDecisions((p) => ({ ...p, [c.id]: 'approve' }))}
                          >
                            通过
                          </button>
                          <button
                            className={d === 'reject' ? 'on no' : ''}
                            onClick={() => setDecisions((p) => ({ ...p, [c.id]: 'reject' }))}
                          >
                            淘汰
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="yj-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="yj-hint" style={{ maxWidth: 520 }}>
                  审核通过的题目将归档至「AI 题库」，可按学科、章节、知识点、题型、难度检索与管理；淘汰题目保留原因供回溯。
                </span>
                <span style={{ flex: 1 }} />
                <Button icon={<ReloadOutlined />} onClick={() => setStep(1)}>重新命题</Button>
                <Button type="primary" loading={approving} onClick={submitReview} disabled={!pending.length}>
                  提交审核（{approveCount} 通过 / {rejectCount} 淘汰）
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </PageContainer>
  );
}
