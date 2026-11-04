/**
 * AI 命题工作台（三步）：选章节 → 设参数 → 审核候选题
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Collapse, Select, Slider, Spin, Steps, Tag, Typography, App as AntApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { endpoints } from '../api';
import { fmtAnswer, optionsOf } from '../paper';

/** 任务终态：后端统一返回 completed；兼容历史/其它实现的取值 */
const DONE_STATUS = ['completed', 'done', 'reviewed', 'success'];
const FAIL_STATUS = ['failed', 'error', 'cancelled', 'canceled'];
const MAX_POLL = 60; // 60 × 1.2s ≈ 72s，避免无限轮询

export default function Workbench() {
  const [step, setStep] = useState(0);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState<string>();
  const [chapters, setChapters] = useState<any[]>([]);
  const [chapterId, setChapterId] = useState<string>();
  const [chapter, setChapter] = useState<any>(null);
  const [kpIds, setKpIds] = useState<string[]>([]);
  const [count, setCount] = useState(10);
  const [jobId, setJobId] = useState<string>();
  const [job, setJob] = useState<any>(null);
  const [approving, setApproving] = useState(false);
  const timer = useRef<any>(null);
  const nav = useNavigate();
  const { message: msg } = AntApp.useApp();

  useEffect(() => {
    endpoints.courses().then((r: any) => setCourses(r.items || [])).catch(() => {});
  }, []);

  const stopPoll = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  // 组件卸载时清掉定时器，避免离开页面后仍在轮询
  useEffect(() => stopPoll, []);

  const pickCourse = async (v: string) => {
    setCourseId(v);
    setChapterId(undefined);
    // 章节列表从 meta 获取
    const meta = await endpoints.meta();
    setChapters((meta.chapters || []).filter((c: any) => c.courseId === v));
  };

  const pickChapter = async (v: string) => {
    setChapterId(v);
    setKpIds([]);
    const ch = await endpoints.chapter(v);
    setChapter(ch);
    setStep(1);
  };

  const generate = async () => {
    try {
      const r = await endpoints.createJob({ chapterId, count, kpIds: kpIds.length ? kpIds : undefined });
      setJobId(r.jobId);
      setJob(null);
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
          // 统一成前端使用的终态，后续渲染只认 completed
          setJob({ ...j, status: 'completed' });
          if ((j.candidates || []).length) msg.success('命题完成，请审核候选题');
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

  const review = async (approve: string[], reject: { id: string; reason?: string }[]) => {
    setApproving(true);
    try {
      const r: any = await endpoints.reviewJob(jobId!, { approve, reject });
      msg.success(`审核完成：通过 ${r?.created ?? approve.length} 题，已归档至 AI 题库`);
      stopPoll();
      setStep(0);
      setJob(null);
      setJobId(undefined);
      // 入库后直接进入 AI 题库，确保题目可查、可管理
      if ((r?.created ?? approve.length) > 0) nav('/ai-bank');
    } finally {
      setApproving(false);
    }
  };

  const approveIds = (job?.candidates || []).filter((c: any) => !c.review).map((c: any) => c.id);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="yj-page-title">AI 命题工作台</div>
        <Button type="link" onClick={() => nav('/ai-bank')}>查看 AI 题库 →</Button>
      </div>
      <Steps
        current={step}
        items={[{ title: '选择章节' }, { title: '命题参数' }, { title: '审核入库' }]}
        style={{ maxWidth: 620, marginBottom: 22 }}
      />

      {step === 0 && (
        <div className="yj-section" style={{ maxWidth: 620 }}>
          <h4>课程</h4>
          <Select placeholder="选择课程" style={{ width: '100%' }} value={courseId} onChange={pickCourse}
            options={courses.map((c) => ({ value: c.id, label: `${c.name}（${c.chapterCount} 章 / ${c.questionCount} 题）` }))} />
          {chapters.length > 0 && (
            <>
              <h4 style={{ marginTop: 16 }}>章节</h4>
              <Select placeholder="选择章节" style={{ width: '100%' }} value={chapterId} onChange={pickChapter}
                options={chapters.map((c: any) => ({ value: c.id, label: c.name }))} />
            </>
          )}
        </div>
      )}

      {step === 1 && chapter && (
        <div className="yj-section" style={{ maxWidth: 620 }}>
          <h4>{chapter.name}</h4>
          <Typography.Paragraph type="secondary" style={{ maxHeight: 120, overflow: 'auto', fontSize: 12.5 }}>{chapter.body}</Typography.Paragraph>
          <h4>知识点范围（不选=全部）</h4>
          <Checkbox.Group value={kpIds} onChange={(v) => setKpIds(v as string[])} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(chapter.kps || []).map((k: any) => (
              <Checkbox key={k.id} value={k.id}>{k.name}（已有 {k.questionCount} 题）</Checkbox>
            ))}
          </Checkbox.Group>
          <h4 style={{ marginTop: 16 }}>题量：{count}</h4>
          <Slider min={3} max={20} value={count} onChange={setCount} />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <Button onClick={() => setStep(0)}>上一步</Button>
            <Button type="primary" onClick={generate}>开始命题</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="yj-section">
          {(!job || job.status !== 'completed' || !(job.candidates || []).length) && (
            <div style={{ padding: 60, textAlign: 'center' }}>
              {job?.status === 'completed' ? (
                <Alert
                  type="warning"
                  showIcon
                  message="本次未生成候选题"
                  description="可返回上一步调整知识点范围或题量后重新命题。"
                  action={<Button size="small" onClick={() => setStep(1)}>返回调整</Button>}
                />
              ) : (
                <>
                  <Spin />
                  <div style={{ marginTop: 10 }}>
                    <Typography.Text type="secondary">
                      {job?.progress?.stage
                        ? `${job.progress.stage}…（${job.progress.percent || 0}%）`
                        : '命题中（抽取正文要点 → 生成候选 → 自检与查重）…'}
                    </Typography.Text>
                  </div>
                </>
              )}
            </div>
          )}
          {job && job.status === 'completed' && (job.candidates || []).length > 0 && (
            <>
              <Alert type="success" showIcon style={{ marginBottom: 12 }}
                message={`生成 ${job.candidates.length} 题候选，已通过自检与相似度判重（阈值 0.90），全部携带正文溯源`}
                description="审核通过的题目将自动归档至「AI 题库」，可按学科、章节、知识点、题型、难度检索与管理。" />
              <Collapse
                items={(job.candidates || []).map((c: any, i: number) => ({
                  key: c.id,
                  label: (
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Tag>{i + 1}</Tag>
                      <Tag color="blue">{c.type}</Tag>
                      <Tag color={c.difficulty === 'hard' ? 'red' : c.difficulty === 'medium' ? 'orange' : 'green'}>{c.difficulty}</Tag>
                      {c.review === 'approved' && <Tag color="success">已入库</Tag>}
                      {c.review === 'rejected' && <Tag color="error">已淘汰</Tag>}
                      <span style={{ fontWeight: 600 }}>{c.stem}</span>
                    </span>
                  ),
                  children: (
                    <div style={{ fontSize: 13, lineHeight: 2 }}>
                      {optionsOf(c).map((o: any) => <div key={o.id}>{c.type === 'judge' ? o.content : <><b>{o.id}.</b> {o.content}</>}</div>)}
                      <div><b>答案：</b>{fmtAnswer(c)}</div>
                      <div><b>解析：</b>{c.analysis}</div>
                      <div style={{ color: '#6b7a90' }}>
                        自检：{(c.issues || []).length === 0 ? '全部通过' : c.issues.map((x: any) => x.text).join('；')}
                        <br />溯源：章节 {c.trace?.chapterId} · 正文哈希 {c.trace?.bodyHash} · 任务 {c.trace?.jobId} · 模型 {c.trace?.model}
                      </div>
                    </div>
                  )
                }))}
              />
              {job.status === 'completed' && (
                <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                  <Button onClick={() => setStep(1)}>调整参数重出</Button>
                  <Button type="primary" loading={approving} disabled={!approveIds.length} onClick={() => review(approveIds, (job.candidates || []).filter((c: any) => !c.review && !approveIds.includes(c.id)).map((c: any) => ({ id: c.id, reason: '教师淘汰' })))}>
                    全部通过并入库（{approveIds.length} 题）
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
