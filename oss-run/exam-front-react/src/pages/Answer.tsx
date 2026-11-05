/**
 * 答题页：计时、答题卡、防作弊事件埋点（§6.2 动效不阻塞答题等核心操作）
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Checkbox, Input, Radio, Tag, Typography, App as AntApp } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { endpoints } from '../api';
import { optionsOf } from '../utils/paper';
import { dict } from '../constants/dictionary';
import { PageLoading } from '../components';

export default function Answer() {
  const { attemptId } = useParams();
  const nav = useNavigate();
  const { message, modal } = AntApp.useApp();
  const [a, setA] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [cur, setCur] = useState(0);
  const [remain, setRemain] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const eventsBuf = useRef<any[]>([]);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  /* ---- 加载 ---- */
  useEffect(() => {
    if (!attemptId) return;
    endpoints.attempt(attemptId).then((r: any) => {
      setA(r);
      setAnswers(r.answers || {});
      setRemain(r.remainSeconds || 0);
    }).catch(() => {});
  }, [attemptId]);

  /* ---- 计时 ---- */
  useEffect(() => {
    if (!a || a.status !== 'answering') return;
    const t = setInterval(() => setRemain((x) => Math.max(0, x - 1)), 1000);
    return () => clearInterval(t);
  }, [a?.id, a?.status]);

  /* ---- 自动保存（20s） ---- */
  const save = useCallback(async () => {
    if (!attemptId || !a || a.status !== 'answering') return;
    try {
      await endpoints.saveAnswers(attemptId, answersRef.current);
    } catch { /* 静默重试由下个周期承担 */ }
  }, [attemptId, a?.id, a?.status]);

  useEffect(() => {
    if (!a || a.status !== 'answering') return;
    const t = setInterval(save, 20000);
    return () => clearInterval(t);
  }, [a?.id, a?.status, save]);

  /* ---- 防作弊事件埋点（仅留痕） ---- */
  const track = useCallback((type: string, detail?: string) => {
    eventsBuf.current.push({ type, detail: detail || '' });
  }, []);

  useEffect(() => {
    if (!attemptId || !a || a.status !== 'answering') return;
    const flush = () => {
      if (!eventsBuf.current.length) return;
      const list = eventsBuf.current.splice(0);
      endpoints.pushEvents(attemptId, list).catch(() => {});
    };
    const onVis = () => { if (document.hidden) track('blur', '切出页面'); };
    const onFs = () => { if (!document.fullscreenElement) track('fullscreen_exit', '退出全屏'); };
    const onCopy = () => track('copy', '复制操作');
    const onPaste = () => track('paste', '粘贴操作');
    const onCtx = (e: MouseEvent) => { e.preventDefault(); track('contextmenu', '右键菜单'); };
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onCtx);
    const t = setInterval(flush, 8000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onCtx);
      clearInterval(t);
      flush();
    };
  }, [attemptId, a?.id, a?.status, track]);

  const setAnswer = (qid: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [qid]: val }));
  };

  const doSubmit = () => {
    modal.confirm({
      title: '确认交卷？',
      content: `已答 ${Object.keys(answers).filter((k) => answers[k] !== '' && answers[k] != null && !(Array.isArray(answers[k]) && !answers[k].length)).length} / ${a?.questions?.length || 0} 题。交卷后客观题立即判分。`,
      okText: '确认交卷',
      cancelText: '继续作答',
      onOk: async () => {
        setSubmitting(true);
        try {
          await save();
          const r = await endpoints.submitAttempt(attemptId!, answersRef.current);
          message.success(r.message || '已交卷');
          nav(`/result/${r.attemptId}`);
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  const mm = useMemo(() => `${String(Math.floor(remain / 60)).padStart(2, '0')}:${String(remain % 60).padStart(2, '0')}`, [remain]);

  if (!a) return <PageLoading tip="正在加载答卷…" minHeight={320} />;
  if (a.status !== 'answering') {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <Typography.Text>该答卷已提交。</Typography.Text>
        <Button type="primary" style={{ marginLeft: 12 }} onClick={() => nav(`/result/${a.id}`)}>查看结果</Button>
      </div>
    );
  }

  const q = a.questions[cur];
  const ans = answers[q.qid];
  const answeredCount = a.questions.filter((x: any) => {
    const v = answers[x.qid];
    return v !== '' && v != null && !(Array.isArray(v) && !v.length);
  }).length;

  const renderQ = () => (
    <div className="yj-q-item" key={q.qid}>
      <div className="yj-q-stem">
        <Tag color="blue">{dict('questionType', q.type).label}</Tag>
        <Tag>{q.score} 分</Tag>
        {a.groups.find((g: any) => g.id === q.group) && <Tag color="purple">{a.groups.find((g: any) => g.id === q.group).name}</Tag>}
        {cur + 1}. {q.stem}
      </div>
      {(q.type === 'single' || q.type === 'judge') && (
        <Radio.Group value={ans} onChange={(e) => setAnswer(q.qid, e.target.value)} style={{ width: '100%' }}>
          {optionsOf(q).map((o: any) => (
            <div
              key={o.id}
              className={`yj-option ${ans === o.id ? 'active' : ''}`}
              onClick={(e) => {
                /* 整行可点：点击空白区域也能选中，点到 label 时交给 Radio 自身处理避免重复触发 */
                if (!(e.target as HTMLElement).closest('.ant-radio-wrapper')) setAnswer(q.qid, o.id);
              }}
            >
              <Radio value={o.id}>
                {q.type === 'judge' ? o.content : <>{o.id}. {o.content}</>}
              </Radio>
            </div>
          ))}
        </Radio.Group>
      )}
      {q.type === 'multiple' && (
        <Checkbox.Group value={Array.isArray(ans) ? ans : []} onChange={(v) => setAnswer(q.qid, v)} style={{ width: '100%' }}>
          {optionsOf(q).map((o: any) => (
            <div
              key={o.id}
              className={`yj-option ${Array.isArray(ans) && ans.includes(o.id) ? 'active' : ''}`}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('.ant-checkbox-wrapper')) return;
                const arr: string[] = Array.isArray(ans) ? [...ans] : [];
                setAnswer(q.qid, arr.includes(o.id) ? arr.filter((x) => x !== o.id) : [...arr, o.id]);
              }}
            >
              <Checkbox value={o.id}>{o.id}. {o.content}</Checkbox>
            </div>
          ))}
        </Checkbox.Group>
      )}
      {q.type === 'blank' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: q.blankCount || 1 }).map((_, i) => (
            <Input
              key={i}
              placeholder={`第 ${i + 1} 空`}
              value={(Array.isArray(ans) ? ans[i] : ans) || ''}
              onChange={(e) => {
                const arr = Array.isArray(ans) ? [...ans] : new Array(q.blankCount || 1).fill('');
                arr[i] = e.target.value;
                setAnswer(q.qid, arr);
              }}
            />
          ))}
        </div>
      )}
      {q.type === 'essay' && (
        <Input.TextArea rows={6} value={ans || ''} onChange={(e) => setAnswer(q.qid, e.target.value)} placeholder="按要点作答，教师将结合 AI 初评进行确认" />
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, gap: 12 }}>
        <Typography.Title level={4} style={{ margin: 0, flex: 1, color: '#0e1c36' }}>{a.examTitle}</Typography.Title>
        <Tag color={remain < 300 ? 'red' : 'blue'} style={{ fontSize: 15, padding: '4px 12px' }}>⏱ {mm}</Tag>
        <Button danger type="primary" loading={submitting} onClick={doSubmit}>交卷</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        <div>
          {renderQ()}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button disabled={cur === 0 || !a.allowBacktrack} onClick={() => setCur(cur - 1)}>上一题</Button>
            <Button disabled={cur >= a.questions.length - 1} onClick={() => setCur(cur + 1)}>下一题</Button>
          </div>
          {a.events?.length > 0 && (
            <div className="yj-proctor">
              行为留痕：{a.events.slice(-4).map((e: any) => `${e.type}${e.detail ? `(${e.detail})` : ''}`).join('；')}
            </div>
          )}
        </div>
        <div className="yj-section" style={{ position: 'sticky', top: 16 }}>
          <h4>答题卡（{answeredCount}/{a.questions.length}）</h4>
          <div className="yj-answer-grid">
            {a.questions.map((x: any, i: number) => {
              const v = answers[x.qid];
              const done = v !== '' && v != null && !(Array.isArray(v) && !v.length);
              return (
                <div key={x.qid} className={`yj-answer-cell ${done ? 'done' : ''} ${i === cur ? 'current' : ''}`} onClick={() => setCur(i)}>
                  {i + 1}
                </div>
              );
            })}
          </div>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
            答案每 20 秒自动保存；切屏、退出全屏、复制粘贴将被记录。
          </Typography.Paragraph>
        </div>
      </div>
    </div>
  );
}
