/**
 * 文档库：收录 AI 题库题目，按学科 / 章节 / 知识点 / 题型 / 难度分类浏览，
 * 勾选后生成试卷或练习并导出（HTML / Word / 打印）。
 *
 * §3 职责边界：课程、章节、知识点由自学平台维护，本平台只读引用，不提供分类增删改；
 * 题库题目维护（增删改）属于考试平台职责，仅管理员可用（bank:manage）。
 */
import { useEffect, useMemo, useState } from 'react';
import {
  App as AntApp, Button, Checkbox, Drawer, Dropdown, Input, InputNumber, Modal,
  Radio, Select, Space, Tabs, Tag, Tree, Typography
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined, PrinterOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/session';
import { endpoints } from '../api';
import { paperBody, PAPER_CSS, fullPaperHtml, downloadFile, printPaper } from '../utils/paper';
import { formatDateTime, formatDuration, formatScore } from '../utils/format';
import { dict, dictOptions } from '../constants/dictionary';
import { PageContainer, DataTable, StatusTag, StatCard } from '../components';

const EMPTY_OPTIONS = [
  { id: 'A', content: '' }, { id: 'B', content: '' }, { id: 'C', content: '' }, { id: 'D', content: '' }
];

export default function DocLib() {
  const { hasPerm } = useSession();
  const nav = useNavigate();
  const canBank = hasPerm('bank:manage');
  const canPublish = hasPerm('exam:manage');
  const { message: msg, modal } = AntApp.useApp();
  const [tab, setTab] = useState('compose');

  /* ---------- 分类树 ---------- */
  const [catalog, setCatalog] = useState<any[]>([]);
  const [node, setNode] = useState<any>({});
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const loadCatalog = () =>
    endpoints.catalog().then((r: any) => {
      const list = r.courses || [];
      setCatalog(list);
      // 分类树默认全展开，方便批量浏览与选题
      const keys: string[] = [];
      list.forEach((c: any) => {
        keys.push(`c:${c.id}`);
        (c.chapters || []).forEach((ch: any) => keys.push(`ch:${ch.id}`));
      });
      setExpandedKeys(keys);
    }).catch(() => {});

  const treeData = useMemo(() => catalog.map((c) => ({
    key: `c:${c.id}`,
    title: c.name,
    count: c.questionCount,
    level: 'course',
    raw: c,
    children: (c.chapters || []).map((ch: any) => ({
      key: `ch:${ch.id}`,
      title: ch.name,
      count: ch.questionCount,
      level: 'chapter',
      raw: ch,
      children: (ch.kps || []).map((k: any) => ({
        key: `kp:${k.id}`,
        title: k.name,
        count: k.questionCount,
        level: 'kp',
        raw: k
      }))
    }))
  })), [catalog]);

  const onPickNode = (keys: any[]) => {
    const key = String(keys[0] || '');
    if (!key) {
      setNode({});
      return;
    }
    const [level, id] = key.split(':');
    if (level === 'c') {
      setNode({ courseId: id });
      return;
    }
    for (const c of catalog) {
      for (const ch of c.chapters || []) {
        if (level === 'ch' && ch.id === id) {
          setNode({ courseId: c.id, chapterId: ch.id });
          return;
        }
        if (level === 'kp' && (ch.kps || []).some((k: any) => k.id === id)) {
          setNode({ courseId: c.id, chapterId: ch.id, kpId: id });
          return;
        }
      }
    }
  };

  const chapterOptions = useMemo(() => catalog.flatMap((c) =>
    (c.chapters || []).map((ch: any) => ({ value: ch.id, label: `${c.name} / ${ch.name}`, courseId: c.id, kps: ch.kps || [] }))), [catalog]);

  /* ---------- 题目列表 ---------- */
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [qType, setQType] = useState<string | undefined>();
  const [qDiff, setQDiff] = useState<string | undefined>();
  const [qStatus, setQStatus] = useState<string>('published');
  const [qKw, setQKw] = useState('');
  const [sel, setSel] = useState<Record<string, any>>({});
  const selKeys = Object.keys(sel);

  const loadQuestions = () => {
    setLoading(true);
    const qs = new URLSearchParams();
    ['courseId', 'chapterId', 'kpId'].forEach((k) => { if (node[k]) qs.set(k, node[k]); });
    if (qType) qs.set('type', qType);
    if (qDiff) qs.set('difficulty', qDiff);
    if (qStatus) qs.set('status', qStatus);
    if (qKw.trim()) qs.set('kw', qKw.trim());
    qs.set('page', String(page));
    qs.set('pageSize', String(pageSize));
    endpoints.aiBankQuestions(qs.toString())
      .then((r: any) => { setRows(r.items || []); setTotal(r.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadQuestions(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [node, qType, qDiff, qStatus, qKw, page, pageSize]);

  const resetFilters = () => {
    setNode({});
    setQType(undefined);
    setQDiff(undefined);
    setQStatus('published');
    setQKw('');
    setPage(1);
  };

  /* ---------- 组卷弹窗 ---------- */
  const [composeOpen, setComposeOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: '', type: 'paper', scoreMode: 'perQuestion', scorePerQuestion: 5, totalScore: 100, duration: 90, includeAnswer: true });

  const openCompose = (type: 'paper' | 'practice') => {
    if (!selKeys.length) {
      msg.warning('请先勾选题目');
      return;
    }
    const courseName = catalog.find((c) => c.id === node.courseId)?.name || '综合';
    setForm((f: any) => ({
      ...f,
      type,
      title: `${courseName}${type === 'paper' ? '试卷' : '练习'} ${new Date().toLocaleDateString('zh-CN')}`,
      scoreMode: 'perQuestion',
      scorePerQuestion: type === 'paper' ? 5 : 2,
      totalScore: type === 'paper' ? selKeys.length * 5 : selKeys.length * 2,
      duration: type === 'paper' ? 90 : 0,
      includeAnswer: type === 'paper'
    }));
    setComposeOpen(true);
  };

  const previewScore = form.scoreMode === 'total'
    ? Number(form.totalScore) || 0
    : Math.round(selKeys.length * (Number(form.scorePerQuestion) || 0) * 10) / 10;

  const createDoc = async () => {
    if (!form.title.trim()) return msg.warning('请填写名称');
    try {
      const d: any = await endpoints.createDocument({
        title: form.title.trim(),
        type: form.type,
        questionIds: selKeys,
        scoreMode: form.scoreMode,
        scorePerQuestion: form.scorePerQuestion,
        totalScore: form.totalScore,
        duration: form.duration,
        includeAnswer: form.includeAnswer
      });
      setComposeOpen(false);
      setSel({});
      msg.success(`${d.type === 'paper' ? '试卷' : '练习'}已生成：${d.questionCount} 题 / ${d.totalScore} 分`);
      setPreview(d);
      setPreviewAnswer(!!d.includeAnswer);
      loadDocs();
      setTab('docs');
    } catch {
      /* 统一错误提示已由请求层处理 */
    }
  };

  /* ---------- 试题预览 / 导出 ---------- */
  const [preview, setPreview] = useState<any>(null);
  const [previewAnswer, setPreviewAnswer] = useState(true);

  const openDoc = async (d: any) => {
    try {
      const full: any = await endpoints.document(d.id);
      setPreview(full);
      setPreviewAnswer(!!full.includeAnswer);
    } catch { /* ignore */ }
  };

  const expHtml = (d: any, ans: boolean = previewAnswer) => downloadFile(`${d.title}.html`, fullPaperHtml(d, ans), 'text/html;charset=utf-8');
  const expWord = (d: any, ans: boolean = previewAnswer) => downloadFile(`${d.title}.doc`, fullPaperHtml(d, ans), 'application/msword;charset=utf-8');

  /* ---------- 试卷 / 练习库 ---------- */
  const [docs, setDocs] = useState<any[]>([]);
  const [docTotal, setDocTotal] = useState(0);
  const [docPage, setDocPage] = useState(1);
  const [docPageSize, setDocPageSize] = useState(10);
  const [docType, setDocType] = useState<string | undefined>();
  const [docKw, setDocKw] = useState('');
  const [docStats, setDocStats] = useState<any>({ total: 0, papers: 0, practices: 0 });
  const [docLoading, setDocLoading] = useState(false);

  const loadDocs = () => {
    setDocLoading(true);
    const qs = new URLSearchParams();
    if (docType) qs.set('type', docType);
    if (docKw.trim()) qs.set('kw', docKw.trim());
    qs.set('page', String(docPage));
    qs.set('pageSize', String(docPageSize));
    endpoints.documents(qs.toString())
      .then((r: any) => {
        setDocs(r.items || []);
        setDocTotal(r.total || 0);
        if (r.stats) setDocStats(r.stats);
      })
      .catch(() => {})
      .finally(() => setDocLoading(false));
  };
  useEffect(() => { loadDocs(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [docType, docKw, docPage, docPageSize]);

  const removeDoc = (d: any) => {
    modal.confirm({
      title: '删除确认',
      content: `确定删除「${d.title}」？删除后不可恢复，已导出的文件不受影响。`,
      okType: 'danger',
      onOk: async () => {
        await endpoints.deleteDocument(d.id);
        msg.success('已删除');
        loadDocs();
      }
    });
  };

  /* ---------- 题目编辑（管理员） ---------- */
  const [qModal, setQModal] = useState<any>(null);
  const qData = qModal?.data;

  const openCreateQ = () => setQModal({
    mode: 'create',
    data: { chapterId: undefined, type: 'single', stem: '', options: EMPTY_OPTIONS.map((o) => ({ ...o })), answer: 'A', difficulty: 'medium', score: 5, analysis: '', kp: [] }
  });

  const openEditQ = (r: any) => setQModal({
    mode: 'edit',
    data: {
      id: r.id,
      chapterId: r.chapterId,
      type: r.type,
      stem: r.stem,
      options: (r.options && r.options.length ? r.options : EMPTY_OPTIONS).map((o: any) => ({ ...o })),
      answer: r.type === 'blank' ? String((r.answer && r.answer[0] && r.answer[0][0]) || '') : r.answer,
      difficulty: r.difficulty,
      score: r.score,
      analysis: r.analysis,
      kp: r.kp || [],
      status: r.status
    }
  });

  const patchQ = (p: any) => setQModal((m: any) => ({ ...m, data: { ...m.data, ...p } }));

  const kpOptionsFor = (chapterId: string) =>
    (chapterOptions.find((c: any) => c.value === chapterId)?.kps || []).map((k: any) => ({ value: k.id, label: k.name }));

  const saveQ = async () => {
    const d = qData;
    if (!d.chapterId) return msg.warning('请选择章节');
    if (!d.stem.trim()) return msg.warning('请填写题干');
    const payload: any = {
      chapterId: d.chapterId, type: d.type, stem: d.stem.trim(), difficulty: d.difficulty,
      score: d.score, analysis: d.analysis, kp: d.kp
    };
    if (d.type === 'single') {
      payload.options = (d.options || []).filter((o: any) => String(o.content || '').trim());
      payload.answer = d.answer;
    } else if (d.type === 'judge') payload.answer = d.answer;
    else if (d.type === 'blank') payload.answer = [[String(d.answer || '').trim()]];
    else payload.answer = null;
    try {
      if (qModal.mode === 'create') await endpoints.createQuestion(payload);
      else await endpoints.updateQuestion(d.id, payload);
      msg.success('题目已保存');
      setQModal(null);
      loadQuestions();
      loadCatalog();
    } catch { /* 请求层已提示 */ }
  };

  const removeQ = (r: any) => {
    modal.confirm({
      title: '删除题目',
      content: `确定删除「${r.stem.slice(0, 24)}…」？已生成的试卷不受影响（保留当时快照）。`,
      okType: 'danger',
      onOk: async () => {
        await endpoints.deleteQuestion(r.id);
        msg.success('已删除');
        setSel((prev) => { const n = { ...prev }; delete n[r.id]; return n; });
        loadQuestions();
        loadCatalog();
      }
    });
  };

  useEffect(() => { loadCatalog(); }, []);

  /* ---------- 渲染 ---------- */
  const treeNodeTitle = (n: any) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span title={n.title} style={{ maxWidth: 148, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
      <Tag style={{ marginInlineEnd: 0 }}>{n.count || 0}</Tag>
    </span>
  );

  const composePane = (
    <div className="yj-doclib">
      {/* 左：分类树（只读引用） */}
      <div className="yj-panel yj-doclib-side">
        <div className="yj-panel-head">
          <b>分类浏览</b>
          <span className="yj-sub">只读引用</span>
        </div>
        <div style={{ padding: '6px 6px 4px' }}>
          <Tree
            treeData={treeData}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys as string[])}
            selectedKeys={node.kpId ? [`kp:${node.kpId}`] : node.chapterId ? [`ch:${node.chapterId}`] : node.courseId ? [`c:${node.courseId}`] : []}
            onSelect={onPickNode}
            titleRender={treeNodeTitle}
            blockNode
            style={{ fontSize: 12.5 }}
          />
        </div>
        <div style={{ padding: '0 13px 12px' }}>
          <div className="yj-hint">数量为该分类下的题库题目数；点击分类即筛选右侧列表。</div>
        </div>
      </div>

      {/* 中：题目列表 */}
      <div className="yj-panel" style={{ minWidth: 0 }}>
        <div className="yj-panel-head">
          <b>题目列表</b>
          <span className="yj-sub">共 {total} 题</span>
          <span className="right">
            {canBank && <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={openCreateQ}>新增题目</Button>}
          </span>
        </div>
        <div className="yj-toolbar" style={{ padding: '10px 13px', marginBottom: 0, borderBottom: '1px solid var(--yj-line)' }}>
          <Select allowClear placeholder="题型" style={{ width: 92 }} value={qType} onChange={(v) => { setQType(v); setPage(1); }}
            options={dictOptions('questionType')} />
          <Select allowClear placeholder="难度" style={{ width: 88 }} value={qDiff} onChange={(v) => { setQDiff(v); setPage(1); }}
            options={dictOptions('difficulty')} />
          <Select style={{ width: 106 }} value={qStatus} onChange={(v) => { setQStatus(v); setPage(1); }}
            options={[...dictOptions('questionStatus'), { value: '', label: '全部状态' }]} />
          <Input.Search placeholder="题干 / 解析关键词" allowClear style={{ width: 152 }} value={qKw}
            onChange={(e) => setQKw(e.target.value)} onSearch={() => setPage(1)} />
          <Button onClick={resetFilters}>重置</Button>
        </div>

        <div style={{ padding: '10px 13px 6px' }}>
          <DataTable
            loading={loading}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(p, ps) => { setPage(p); setPageSize(ps); }}
            emptyText="当前分类下没有题目，去 AI 题库入库或调整筛选条件"
            dataSource={rows}
            rowSelection={{
              selectedRowKeys: selKeys,
              preserveSelectedRowKeys: true,
              onSelect: (record, selected) => setSel((prev) => {
                const n = { ...prev };
                if (selected) n[record.id] = record; else delete n[record.id];
                return n;
              }),
              onSelectAll: (selected, _rows, changeRows) => setSel((prev) => {
                const n = { ...prev };
                changeRows.forEach((r) => { if (selected) n[r.id] = r; else delete n[r.id]; });
                return n;
              }),
              getCheckboxProps: (r) => ({ disabled: r.status !== 'published' })
            }}
            columns={[
              {
                title: '题干',
                dataIndex: 'stem',
                ellipsis: true,
                render: (v: string, r: any) => (
                  <div style={{ minWidth: 0 }}>
                    <div className="yj-cell-t" title={v}>{v}</div>
                    <div className="yj-cell-s">
                      <span>{dict('questionType', r.type).label}</span>
                      <span>·</span>
                      <span>{dict('difficulty', r.difficulty).label}</span>
                      {r.chapterName && <><span>·</span><span>{r.chapterName}</span></>}
                      {(r.kpNames || []).length > 0 && <><span>·</span><span>{(r.kpNames || []).slice(0, 2).join('、')}</span></>}
                    </div>
                  </div>
                )
              },
              { title: '分值', dataIndex: 'score', width: 60, render: (v: number) => <span className="num">{formatScore(v)}</span> },
              { title: '状态', dataIndex: 'status', width: 88, render: (v: string) => <StatusTag kind="questionStatus" value={v} /> },
              ...(canBank ? [{
                title: '', width: 76,
                render: (_: any, r: any) => (
                  <Space size={0} style={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditQ(r)} />
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeQ(r)} />
                  </Space>
                )
              }] : [])
            ]}
          />
        </div>
      </div>

      {/* 右：组卷篮 */}
      <aside className="yj-panel yj-basket">
        <div className="yj-panel-head">
          <b>组卷篮</b>
          <span className="yj-sub">已选 {selKeys.length} 题</span>
          <span className="right">
            <Button size="small" type="text" disabled={!selKeys.length} onClick={() => setSel({})}>清空</Button>
          </span>
        </div>

        {selKeys.length === 0 ? (
          <div className="yj-basket-empty">
            还没有选中的题目
            <br />
            在中间列表勾选后自动进入组卷篮
          </div>
        ) : (
          <div className="yj-basket-body">
            {selKeys.map((k) => {
              const r = sel[k];
              return (
                <div className="yj-basket-item" key={k}>
                  <span className="yj-badge pri">{dict('questionType', r?.type).label}</span>
                  <span className="t" title={r?.stem}>{r?.stem}</span>
                  <span
                    className="x"
                    title="移出组卷篮"
                    onClick={() => setSel((prev) => { const n = { ...prev }; delete n[k]; return n; })}
                  >
                    ×
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="yj-basket-sum">
          <div>已选<b>{selKeys.length} 题</b></div>
          <div>预计总分<b>{selKeys.length * 5} 分</b></div>
        </div>

        <div className="yj-basket-foot">
          <Button type="primary" block disabled={!selKeys.length} onClick={() => openCompose('paper')}>生成试卷</Button>
          <Button block disabled={!selKeys.length} onClick={() => openCompose('practice')}>生成练习</Button>
          <div className="yj-hint">试卷默认每题 5 分 / 90 分钟，练习每题 2 分；生成前可在弹窗中调整。</div>
        </div>
      </aside>
    </div>
  );

  const docsPane = (
    <>
      <div className="yj-kpi-row" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <StatCard label="文档总数" value={docStats.total || 0} suffix="份" note="试卷与练习合并统计" />
        <StatCard label="试卷" value={docStats.papers || 0} suffix="份" color="#1657D6" note="可审核后发布为在线考试" />
        <StatCard label="练习" value={docStats.practices || 0} suffix="份" color="#7A5AF8" note="仅用于导出与线下练习" />
      </div>
      <div className="yj-panel">
        <div className="yj-panel-head">
          <b>试卷 / 练习库</b>
          <span className="yj-sub">共 {docTotal} 份</span>
        </div>
        <div className="yj-toolbar" style={{ padding: '10px 13px', marginBottom: 0, borderBottom: '1px solid var(--yj-line)' }}>
          <Select allowClear placeholder="类型" style={{ width: 110 }} value={docType} onChange={(v) => { setDocType(v); setDocPage(1); }}
            options={[{ value: 'paper', label: '试卷' }, { value: 'practice', label: '练习' }]} />
          <Input.Search placeholder="名称关键词" allowClear style={{ width: 210 }} value={docKw}
            onChange={(e) => setDocKw(e.target.value)} onSearch={() => setDocPage(1)} />
          <Button onClick={() => { setDocType(undefined); setDocKw(''); setDocPage(1); }}>重置</Button>
          <span className="sp" />
          {canPublish && <Button type="primary" ghost onClick={() => nav('/publish')}>考试发布 →</Button>}
        </div>
        <div style={{ padding: '10px 13px 6px' }}>
          <DataTable
            loading={docLoading}
            dataSource={docs}
            page={docPage}
            pageSize={docPageSize}
            total={docTotal}
            onPageChange={(p, ps) => { setDocPage(p); setDocPageSize(ps); }}
            emptyText="还没有生成任何试卷或练习，去「选题组卷」试试"
            columns={[
              {
                title: '名称', dataIndex: 'title', ellipsis: true,
                render: (v: string, d: any) => (
                  <div style={{ minWidth: 0 }}>
                    <div className="yj-cell-t" style={{ color: 'var(--yj-pri)', cursor: 'pointer' }} title={v} onClick={() => openDoc(d)}>{v}</div>
                    <div className="yj-cell-s">
                      <span>{d.courseName || '-'}</span>
                      <span>·</span>
                      <span>{d.createdByName || '-'}</span>
                    </div>
                  </div>
                )
              },
              { title: '类型', dataIndex: 'type', width: 76, render: (v: string) => (v === 'paper' ? <Tag color="blue">试卷</Tag> : <Tag color="purple">练习</Tag>) },
              {
                title: '题量 / 总分', width: 100,
                render: (_: any, d: any) => <span className="num" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{d.questionCount} 题 / {formatScore(d.totalScore)}</span>
              },
              { title: '时长', dataIndex: 'duration', width: 82, render: (v: number) => (v ? formatDuration(v) : '不限') },
              {
                title: '审核', dataIndex: 'reviewStatus', width: 92,
                render: (s: string, d: any) => (d.type !== 'paper' ? <Tag>无需审核</Tag> : <StatusTag kind="reviewStatus" value={s} />)
              },
              {
                title: '发布', width: 92,
                render: (_: any, d: any) => {
                  if (d.type !== 'paper') return <span style={{ color: '#9aa7bb' }}>—</span>;
                  if (d.examStatus === 'published') return <Tag color="success">已发布</Tag>;
                  if (d.examStatus === 'archived') return <Tag>已下架</Tag>;
                  return <span style={{ color: '#9aa7bb' }}>未发布</span>;
                }
              },
              { title: '生成时间', dataIndex: 'createdAt', width: 140, render: (v: string) => <span style={{ fontSize: 12 }}>{formatDateTime(v)}</span> },
              {
                title: '操作', width: 224, fixed: 'right' as const,
                render: (_: any, d: any) => (
                  <Space size={4}>
                    <Button size="small" onClick={() => openDoc(d)}>预览</Button>
                    <Dropdown menu={{ items: [{ key: 'html', label: '导出 HTML' }, { key: 'word', label: '导出 Word' }], onClick: async ({ key }) => { const full: any = await endpoints.document(d.id); if (key === 'html') expHtml(full, !!full.includeAnswer); else expWord(full, !!full.includeAnswer); } }}>
                      <Button size="small" icon={<DownloadOutlined />}>导出</Button>
                    </Dropdown>
                    {d.type === 'paper' && d.examStatus !== 'published' && (
                      <Button size="small" type="link" onClick={() => nav('/publish')}>去发布</Button>
                    )}
                    <Button size="small" danger type="link" onClick={() => removeDoc(d)}>删除</Button>
                  </Space>
                )
              }
            ]}
          />
        </div>
      </div>
    </>
  );

  const items = [
    { key: 'compose', label: '选题组卷', children: composePane },
    { key: 'docs', label: '试卷 / 练习库', children: docsPane }
  ];

  return (
    <PageContainer
      title="文档库"
      description={`收录 AI 题库中的题目，按学科、章节、知识点、题型与难度分类浏览；勾选题目即可生成试卷或练习，并导出 HTML / Word 或直接打印。试卷可在「考试发布」中审核并发布为在线考试。${
        canBank ? ' 当前为管理员：可维护题库题目。' : ' 当前为教师：可选题组卷、审核与发布考试；题库题目由管理员维护。'
      }课程与章节由自学平台维护，本平台只读引用。`}
    >
      <Tabs activeKey={tab} onChange={setTab} items={items} />

      <Modal
        title={form.type === 'paper' ? '生成试卷' : '生成练习'}
        open={composeOpen}
        onCancel={() => setComposeOpen(false)}
        onOk={createDoc}
        okText="生成并预览"
        width={560}
      >
        <div style={{ display: 'grid', gap: 14, marginTop: 8 }}>
          <div>
            <div style={{ marginBottom: 6, fontSize: 13 }}>名称</div>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="请输入试卷 / 练习名称" maxLength={60} showCount />
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 6, fontSize: 13 }}>题量</div>
              <Input value={`${selKeys.length} 题`} disabled />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 6, fontSize: 13 }}>{form.type === 'paper' ? '建议时长（分钟）' : '预计时长（分钟，可空）'}</div>
              <InputNumber min={0} max={300} value={form.duration} onChange={(v) => setForm({ ...form, duration: v })} style={{ width: '100%' }} />
            </div>
          </div>
          <div>
            <div style={{ marginBottom: 6, fontSize: 13 }}>分值配置</div>
            <Radio.Group value={form.scoreMode} onChange={(e) => setForm({ ...form, scoreMode: e.target.value })}>
              <Radio value="perQuestion">统一每题分值</Radio>
              <Radio value="total">指定总分平均分配</Radio>
            </Radio.Group>
            <div style={{ marginTop: 8 }}>
              {form.scoreMode === 'perQuestion' ? (
                <Space>
                  <span>每题</span>
                  <InputNumber min={0.5} max={100} step={0.5} value={form.scorePerQuestion} onChange={(v) => setForm({ ...form, scorePerQuestion: v })} style={{ width: 100 }} />
                  <span>分，合计 <b>{previewScore}</b> 分</span>
                </Space>
              ) : (
                <Space>
                  <span>总分</span>
                  <InputNumber min={1} max={1000} value={form.totalScore} onChange={(v) => setForm({ ...form, totalScore: v })} style={{ width: 110 }} />
                  <span>分，平均每题约 <b>{Math.round((previewScore / Math.max(1, selKeys.length)) * 10) / 10}</b> 分</span>
                </Space>
              )}
            </div>
          </div>
          <Checkbox checked={form.includeAnswer} onChange={(e) => setForm({ ...form, includeAnswer: e.target.checked })}>
            导出时附带参考答案与解析
          </Checkbox>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            题目按题型（单选 → 多选 → 判断 → 填空 → 简答）自动排序，生成后可在预览中调整导出方式。
          </Typography.Text>
        </div>
      </Modal>

      <Modal
        title={qModal?.mode === 'create' ? '新增题目' : '编辑题目'}
        open={!!qModal}
        onCancel={() => setQModal(null)}
        onOk={saveQ}
        okText="保存"
        width={720}
        destroyOnClose
      >
        {qData && (
          <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
            <Space wrap>
              <Select placeholder="章节" style={{ width: 260 }} value={qData.chapterId} showSearch optionFilterProp="label"
                options={chapterOptions.map((c: any) => ({ value: c.value, label: c.label }))}
                onChange={(v) => patchQ({ chapterId: v, kp: [] })} />
              <Select style={{ width: 120 }} value={qData.type}
                options={dictOptions('questionType').filter((o) => o.value !== 'multiple')}
                onChange={(v) => patchQ({ type: v, answer: v === 'judge' ? 'T' : v === 'blank' ? '' : v === 'single' ? 'A' : null })} />
              <Select style={{ width: 100 }} value={qData.difficulty}
                options={dictOptions('difficulty')}
                onChange={(v) => patchQ({ difficulty: v })} />
              <InputNumber min={0.5} max={100} step={0.5} value={qData.score} onChange={(v) => patchQ({ score: v })} addonBefore="分值" style={{ width: 130 }} />
            </Space>
            <Input.TextArea rows={3} placeholder="题干" value={qData.stem} onChange={(e) => patchQ({ stem: e.target.value })} />
            {qData.type === 'single' && (
              <div style={{ display: 'grid', gap: 6 }}>
                {(qData.options || []).map((o: any, i: number) => (
                  <Space key={o.id}>
                    <b>{o.id}</b>
                    <Input style={{ width: 520 }} value={o.content} placeholder={`选项 ${o.id}`}
                      onChange={(e) => {
                        const opts = [...qData.options];
                        opts[i] = { ...opts[i], content: e.target.value };
                        patchQ({ options: opts });
                      }} />
                  </Space>
                ))}
                <Space>
                  <span>正确答案</span>
                  <Select style={{ width: 90 }} value={qData.answer} onChange={(v) => patchQ({ answer: v })}
                    options={(qData.options || []).map((o: any) => ({ value: o.id, label: o.id }))} />
                </Space>
              </div>
            )}
            {qData.type === 'judge' && (
              <Space>
                <span>正确答案</span>
                <Radio.Group value={qData.answer} onChange={(e) => patchQ({ answer: e.target.value })}>
                  <Radio value="T">正确</Radio>
                  <Radio value="F">错误</Radio>
                </Radio.Group>
              </Space>
            )}
            {qData.type === 'blank' && (
              <Space>
                <span>填空答案</span>
                <Input style={{ width: 360 }} value={qData.answer} onChange={(e) => patchQ({ answer: e.target.value })} placeholder="多个空用 / 分隔（当前按单空入库）" />
              </Space>
            )}
            <div>
              <div style={{ marginBottom: 6, fontSize: 13 }}>知识点</div>
              <Select mode="multiple" style={{ width: '100%' }} value={qData.kp} onChange={(v) => patchQ({ kp: v })}
                placeholder={qData.chapterId ? '选择知识点（可多选）' : '请先选择章节'}
                options={kpOptionsFor(qData.chapterId)} disabled={!qData.chapterId} />
            </div>
            <Input.TextArea rows={3} placeholder="解析（可选）" value={qData.analysis} onChange={(e) => patchQ({ analysis: e.target.value })} />
          </div>
        )}
      </Modal>

      <Drawer
        width={880}
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.title}
        extra={preview && (
          <Space>
            <Checkbox checked={previewAnswer} onChange={(e) => setPreviewAnswer(e.target.checked)}>显示答案</Checkbox>
            <Button size="small" icon={<DownloadOutlined />} onClick={() => expHtml(preview)}>HTML</Button>
            <Button size="small" icon={<FileTextOutlined />} onClick={() => expWord(preview)}>Word</Button>
            <Button size="small" type="primary" icon={<PrinterOutlined />} onClick={() => printPaper(preview, previewAnswer)}>打印</Button>
          </Space>
        )}
      >
        {preview && (
          <>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
              {preview.type === 'paper' ? '试卷' : '练习'} · {preview.questionCount} 题 · 满分 {preview.totalScore} 分
              {preview.duration ? ` · 建议 ${preview.duration} 分钟` : ''} · 生成人 {preview.createdByName || '-'}
            </Typography.Paragraph>
            <style>{PAPER_CSS}</style>
            <div style={{ background: '#eef2f9', padding: 16, borderRadius: 8 }}>
              <div className="yj-paper" style={{ boxShadow: '0 2px 14px rgba(14,28,54,.10)' }}
                dangerouslySetInnerHTML={{ __html: paperBody(preview, previewAnswer) }} />
            </div>
          </>
        )}
      </Drawer>
    </PageContainer>
  );
}
