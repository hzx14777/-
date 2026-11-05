/**
 * 答题页：计时、三栏答题卡、防作弊事件埋点（§6.2 动效不阻塞答题等核心操作）
 *
 * 版式：左侧题型分组导航（已答/未答一目了然）、中间单题聚焦、右侧答题卡与交卷。
 * 进入后使用全屏考试外壳（AppShell 不再渲染站点导航），避免误点离开。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Checkbox, Drawer, Input, Radio, Tag, Tooltip, Typography, App as AntApp } from 'antd';
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CloudUploadOutlined,
  EditOutlined,
  FlagFilled,
  FlagOutlined,
  LeftOutlined,
  RightOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { endpoints } from '../api';
import { optionsOf } from '../utils/paper';
import { dict } from '../constants/dictionary';
import { PageLoading } from '../components';

const TYPE_ORDER = ['single', 'multiple', 'judge', 'blank', 'essay'];
const CN_NUM = ['一', '二', '三', '四', '五'];

export default function Answer() {
  const { attemptId } = useParams();
  const nav = useNavigate();
  const { message, modal } = AntApp.useApp();
  const [a, setA] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [cur, setCur] = useState(0);
  const [remain, setRemain] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [savedAt, setSavedAt] = useState('');
  /* 草稿纸：按题存本地，不参与阅卷、不上传服务端 */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [draftOpen, setDraftOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
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

  /* ---- 草稿纸：读取本机暂存 ---- */
  useEffect(() => {
    if (!attemptId) return;
    try {
      const raw = localStorage.getItem(`yj_draft_${attemptId}`);
      setDrafts(raw ? JSON.parse(raw) : {});
    } catch {
      setDrafts({});
    }
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
    setSaveState('saving');
    try {
      await endpoints.saveAnswers(attemptId, answersRef.current);
      setSaveState('saved');
      setSavedAt(new Date().toTimeString().slice(0, 5));
    } catch {
      /* 静默重试由下个周期承担，不打断作答 */
      setSaveState('idle');
    }
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

  const isDone = (v: any) => v !== '' && v != null && !(Array.isArray(v) && !v.length);

  /** 草稿只落本机 localStorage：换设备不带走，也不参与判分 */
  const writeDraft = (qid: string, v: string) => {
    const next = { ...drafts };
    if (v.trim()) next[qid] = v;
    else delete next[qid];
    setDrafts(next);
    try {
      localStorage.setItem(`yj_draft_${attemptId}`, JSON.stringify(next));
    } catch {
      /* 隐私模式或配额满时忽略，不阻断作答 */
    }
  };
  const draftCount = Object.keys(drafts).length;

  const answeredCount = useMemo(
    () => (a ? a.questions.filter((x: any) => isDone(answers[x.qid])).length : 0),
    [a, answers]
  );

  /* 答题卡抽屉按题量算高度（每行 5 格、格高 34+6），题少时不至于空一大截 */
  const sheetHeight = useMemo(() => {
    const n = a?.questions?.length || 0;
    const rows = Math.max(1, Math.ceil(n / 5));
    const vh = typeof window === 'undefined' ? 844 : window.innerHeight;
    return Math.min(Math.round(vh * 0.78), 230 + rows * 40);
  }, [a?.questions?.length]);

  const doSubmit = () => {
    const blank = (a?.questions?.length || 0) - answeredCount;
    modal.confirm({
      title: '确认交卷？',
      content: `已答 ${answeredCount} / ${a?.questions?.length || 0} 题${blank > 0 ? `，还有 ${blank} 题未作答` : ''}。交卷后客观题立即判分，简答题进入阅卷队列。`,
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

  const mm = useMemo(
    () => `${String(Math.floor(remain / 60)).padStart(2, '0')}:${String(remain % 60).padStart(2, '0')}`,
    [remain]
  );

  /* 左侧导航按题型分组：题量大时仍能快速定位 */
  const navGroups = useMemo(() => {
    if (!a) return [];
    const map = new Map<string, { i: number; q: any }[]>();
    a.questions.forEach((q: any, i: number) => {
      const arr = map.get(q.type) || [];
      arr.push({ i, q });
      map.set(q.type, arr);
    });
    return TYPE_ORDER.filter((t) => map.has(t)).map((t) => ({
      type: t,
      label: dict('questionType', t).label,
      items: map.get(t)!
    }));
  }, [a]);

  if (!a) return <PageLoading tip="正在加载答卷…" minHeight={360} />;

  if (a.status !== 'answering') {
    return (
      <div className="yj-exam-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="yj-qcard" style={{ maxWidth: 420, textAlign: 'center', padding: 32 }}>
          <CheckCircleFilled style={{ fontSize: 34, color: '#0F9D76' }} />
          <div style={{ fontSize: 16, fontWeight: 600, margin: '12px 0 6px' }}>该答卷已提交</div>
          <div style={{ fontSize: 12.5, color: '#6B7A90', marginBottom: 18 }}>客观题已判分，简答题确认后可查看完整成绩。</div>
          <Button type="primary" onClick={() => nav(`/result/${a.id}`)}>查看结果</Button>
        </div>
      </div>
    );
  }

  const q = a.questions[cur];
  const ans = answers[q.qid];
  const flagged = flags.has(cur);
  const groupName = a.groups.find((g: any) => g.id === q.group)?.name;
  const progress = Math.round((answeredCount / a.questions.length) * 100);
  const urgent = remain < 300;

  const toggleFlag = () => {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(cur)) next.delete(cur);
      else next.add(cur);
      return next;
    });
  };

  const renderAnswer = () => {
    if (q.type === 'single' || q.type === 'judge') {
      return (
        <Radio.Group value={ans} onChange={(e) => setAnswer(q.qid, e.target.value)} style={{ width: '100%' }}>
          <div className="yj-opts">
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
          </div>
        </Radio.Group>
      );
    }

    if (q.type === 'multiple') {
      return (
        <Checkbox.Group value={Array.isArray(ans) ? ans : []} onChange={(v) => setAnswer(q.qid, v)} style={{ width: '100%' }}>
          <div className="yj-opts">
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
          </div>
        </Checkbox.Group>
      );
    }

    if (q.type === 'blank') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: q.blankCount || 1 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11.5, color: '#8A97A8', width: 40 }}>第 {i + 1} 空</span>
              <Input
                placeholder="填写答案"
                style={{ maxWidth: 420 }}
                value={(Array.isArray(ans) ? ans[i] : ans) || ''}
                onChange={(e) => {
                  const arr = Array.isArray(ans) ? [...ans] : new Array(q.blankCount || 1).fill('');
                  arr[i] = e.target.value;
                  setAnswer(q.qid, arr);
                }}
              />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div>
        <Input.TextArea
          rows={7}
          value={ans || ''}
          onChange={(e) => setAnswer(q.qid, e.target.value)}
          placeholder="按采分点分条作答：先给结论，再写依据。系统将先由 AI 初评，再由教师确认。"
        />
        <div style={{ marginTop: 6, textAlign: 'right', fontSize: 11, color: '#A3B0C2' }}>
          {(ans || '').length} 字
        </div>
      </div>
    );
  };

  /* 答题卡九宫格：桌面右栏与移动端抽屉共用 */
  const renderCells = () => (
    <>
      {a.questions.map((x: any, i: number) => {
        const done = isDone(answers[x.qid]);
        return (
          <div
            key={x.qid}
            className={`yj-answer-cell${done ? ' done' : ''}${i === cur ? ' current' : ''}`}
            onClick={() => { setCur(i); setSheetOpen(false); }}
            title={x.stem}
          >
            {i + 1}
          </div>
        );
      })}
    </>
  );

  return (
    <div className="yj-exam-shell">
      {/* ---------- 考试顶栏 ---------- */}
      <div className="yj-exam-bar">
        <div style={{ minWidth: 0, maxWidth: 320 }}>
          <div className="yj-eb-title">{a.examTitle}</div>
          <div className="yj-eb-sub">
            {a.userName || '考生'} · {a.questions.length} 题 · {a.allowBacktrack ? '可回查修改' : '禁止回查'}
          </div>
        </div>

        <div className="yj-eb-progress">
          <span className="yj-eb-count">已答 {answeredCount}/{a.questions.length}</span>
          <div className="yj-eb-track">
            <i style={{ width: `${progress}%` }} />
          </div>
          <span className="yj-eb-count">{progress}%</span>
        </div>

        <div className={`yj-timer${urgent ? ' urgent' : ''}`}>
          <ClockCircleOutlined /> {mm}
        </div>
        <Button danger type="primary" loading={submitting} onClick={doSubmit} style={{ flex: 'none' }}>
          交卷
        </Button>
      </div>

      {/* ---------- 三栏 ---------- */}
      <div className="yj-answer-layout">
        {/* 左：题型分组导航 */}
        <aside className="yj-qnav">
          <div className="yj-panel-title">
            题目导航 <span>{a.questions.length} 题</span>
          </div>
          {navGroups.map((g, gi) => (
            <div key={g.type} style={{ marginBottom: 8 }}>
              <div className="yj-qnav-group">
                {CN_NUM[gi]}、{g.label} · {g.items[0].i + 1}-{g.items[g.items.length - 1].i + 1}
              </div>
              <div className="yj-qnav-grid">
                {g.items.map(({ i, q: item }) => {
                  const done = isDone(answers[item.qid]);
                  return (
                    <div
                      key={item.qid}
                      className={`yj-qnav-cell${done ? ' done' : ''}${i === cur ? ' on' : ''}`}
                      onClick={() => setCur(i)}
                      role="button"
                      tabIndex={0}
                      title={item.stem}
                      onKeyDown={(e) => e.key === 'Enter' && setCur(i)}
                    >
                      {i + 1}
                      {flags.has(i) && <i className="flag" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* 中：单题 */}
        <main className="yj-qmain">
          <div className="yj-qcard">
            <div className="yj-qhead">
              <span className="yj-qno num">{String(cur + 1).padStart(2, '0')}</span>
              <span style={{ color: '#C7D0DE' }}>/ {a.questions.length}</span>
              <Tag color="blue" style={{ marginLeft: 4 }}>{dict('questionType', q.type).label}</Tag>
              <span className="yj-badge">{q.score} 分</span>
              {groupName && <span className="yj-badge gold">{groupName}</span>}
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Tooltip title="草稿纸：仅保存在本机，不参与阅卷">
                  <Button
                    size="small"
                    type={drafts[q.qid] ? 'default' : 'text'}
                    icon={<EditOutlined />}
                    onClick={() => setDraftOpen(true)}
                  >
                    草稿{drafts[q.qid] ? ' ·已写' : ''}
                  </Button>
                </Tooltip>
                <Tooltip title={flagged ? '取消标记' : '标记待查'}>
                  <Button
                    size="small"
                    type={flagged ? 'primary' : 'text'}
                    icon={flagged ? <FlagFilled /> : <FlagOutlined />}
                    onClick={toggleFlag}
                  >
                    {flagged ? '已标记' : '标记'}
                  </Button>
                </Tooltip>
              </span>
            </div>

            <div className="yj-qstem">{q.stem}</div>
            {renderAnswer()}
          </div>

          <div className="yj-qfoot">
            <Button
              icon={<LeftOutlined />}
              disabled={cur === 0 || !a.allowBacktrack}
              onClick={() => setCur(cur - 1)}
            >
              上一题
            </Button>
            <Button
              type="primary"
              disabled={cur >= a.questions.length - 1}
              onClick={() => setCur(cur + 1)}
            >
              下一题 <RightOutlined />
            </Button>
            <span className="yj-qfoot-tip">
              {a.allowBacktrack ? '本场允许回查修改，修改后请留意右下角保存状态' : '本场禁止回查，提交前请确认当前题'}
            </span>
          </div>

          {a.events?.length > 0 && (
            <div className="yj-proctor">
              行为留痕：{a.events.slice(-4).map((e: any) => `${e.type}${e.detail ? `(${e.detail})` : ''}`).join('；')}
            </div>
          )}
        </main>

        {/* 右：答题卡 */}
        <aside className="yj-sheet">
          <div className="yj-sheet-head">
            <div className="yj-ring" style={{ ['--p' as any]: progress, width: 52, height: 52 }}>
              <span style={{ fontSize: 13, color: '#1657D6' }}>{progress}%</span>
            </div>
            <div className="yj-sheet-stat">
              <div>已答 <b>{answeredCount}</b> 题</div>
              <div>未答 <b>{a.questions.length - answeredCount}</b> 题</div>
              <div>标记 <b>{flags.size}</b> 题</div>
            </div>
          </div>
          <div className="yj-sheet-grid">{renderCells()}</div>

          <div className="yj-sheet-legend">
            <span><i style={{ background: '#1657D6' }} />当前</span>
            <span><i style={{ background: '#C9DBFA' }} />已答</span>
            <span><i style={{ background: '#E7ECF5' }} />未答</span>
            <span><i style={{ background: '#C89B3C' }} />标记</span>
          </div>

          <div className="yj-sheet-save">
            <CloudUploadOutlined />
            {saveState === 'saving' ? '正在保存答案…' : saveState === 'saved' ? `答案已保存 ${savedAt}` : '答案每 20 秒自动保存'}
          </div>

          <div className="yj-sheet-sub">
            <Button danger type="primary" block loading={submitting} onClick={doSubmit}>
              交卷并结束作答
            </Button>
          </div>

          <Typography.Paragraph type="secondary" style={{ fontSize: 10.5, margin: '10px 0 0', lineHeight: 1.6 }}>
            切屏、退出全屏、复制粘贴会被记录，仅用于教师复核，不阻断作答。
          </Typography.Paragraph>
        </aside>
      </div>

      {/* ---------- 草稿纸（本机暂存，不参与阅卷） ---------- */}
      <Drawer
        title={`草稿纸 · 第 ${cur + 1} 题`}
        placement="right"
        width={400}
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
      >
        <div className="yj-hint" style={{ marginBottom: 9, color: 'var(--yj-text-2)' }}>{q.stem}</div>
        <Input.TextArea
          rows={13}
          value={drafts[q.qid] || ''}
          onChange={(e) => writeDraft(q.qid, e.target.value)}
          placeholder="写思路、列公式、拆采分点…"
        />
        <div className="yj-draft-note">
          草稿仅保存在本机浏览器，不参与阅卷、不随答卷上传；换设备或清理缓存后会丢失。
          本场已有 {draftCount} 题记录了草稿。
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button block onClick={() => writeDraft(q.qid, '')} disabled={!drafts[q.qid]}>清空本题草稿</Button>
          <Button block type="primary" onClick={() => setDraftOpen(false)}>完成</Button>
        </div>
      </Drawer>

      {/* ---------- 移动端：答题卡抽屉 ---------- */}
      <Drawer
        title={`答题卡 ${answeredCount}/${a.questions.length}`}
        placement="bottom"
        height={sheetHeight}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        /* 交卷按钮钉在弹层底部，题量少时也不会留出大片空白 */
        styles={{ body: { display: 'flex', flexDirection: 'column', paddingBottom: 16 } }}
      >
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div className="yj-sheet-grid">{renderCells()}</div>
          <div className="yj-sheet-legend">
            <span><i style={{ background: '#1657D6' }} />当前</span>
            <span><i style={{ background: '#C9DBFA' }} />已答</span>
            <span><i style={{ background: '#E7ECF5' }} />未答</span>
            <span><i style={{ background: '#C89B3C' }} />标记</span>
          </div>
          <div className="yj-hint" style={{ marginTop: 10 }}>
            交卷前请确认所有题目已作答，交卷后不可再修改。
          </div>
        </div>
        <Button
          danger
          type="primary"
          block
          style={{ marginTop: 12, flex: 'none' }}
          loading={submitting}
          onClick={() => { setSheetOpen(false); doSubmit(); }}
        >
          交卷并结束作答
        </Button>
      </Drawer>

      {/* ---------- 移动端底部操作条 ---------- */}
      <div className="yj-mbar">
        <Button icon={<UnorderedListOutlined />} onClick={() => setSheetOpen(true)}>答题卡</Button>
        <span className="grow" />
        <Button
          icon={<LeftOutlined />}
          aria-label="上一题"
          onClick={() => setCur(cur - 1)}
          disabled={cur === 0 || !a.allowBacktrack}
        />
        <Button
          type="primary"
          onClick={() => setCur(cur + 1)}
          disabled={cur >= a.questions.length - 1}
        >
          下一题
        </Button>
        <Button danger type="primary" loading={submitting} onClick={doSubmit}>交卷</Button>
      </div>
    </div>
  );
}
