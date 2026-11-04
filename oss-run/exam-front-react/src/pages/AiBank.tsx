/**
 * AI 题库：统一接收 AI 命题工作台「命题 → 审核 → 入库」流程中审核通过的题目
 * 支持按学科（课程）/ 章节 / 知识点 / 题型 / 难度 / 状态检索，以及上架、下架、归档管理
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Button, Card, Collapse, Descriptions, Drawer, Empty, Input, Select, Space, Statistic, Steps, Table, Tag, Typography, App as AntApp
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { endpoints } from '../api';

const TYPE_LABEL: Record<string, string> = {
  single: '单选题', multiple: '多选题', judge: '判断题', blank: '填空题', essay: '简答题'
};
const TYPE_COLOR: Record<string, string> = {
  single: 'blue', multiple: 'geekblue', judge: 'cyan', blank: 'purple', essay: 'magenta'
};
const DIFF_LABEL: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难' };
const DIFF_COLOR: Record<string, string> = { easy: 'green', medium: 'orange', hard: 'red' };
const STATUS_LABEL: Record<string, string> = { published: '已上架', offline: '已下架', archived: '已归档' };
const STATUS_COLOR: Record<string, string> = { published: 'success', offline: 'warning', archived: 'default' };

const fmtAnswer = (q: any) => {
  if (q.type === 'judge') return q.answer === 'T' ? '正确' : '错误';
  if (q.answer === null || q.answer === undefined) return '主观题（按评分点给分）';
  if (Array.isArray(q.answer)) return q.answer.map((x: any) => (Array.isArray(x) ? x.join(' / ') : x)).join('；');
  return String(q.answer);
};

export default function AiBank() {
  const nav = useNavigate();
  const { message: msg } = AntApp.useApp();
  const [summary, setSummary] = useState<any>({ total: 0, byStatus: {}, byType: {}, byDifficulty: {}, courses: [], jobs: 0 });
  const [meta, setMeta] = useState<any>({ courses: [], chapters: [] });
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [filters, setFilters] = useState<any>({ courseId: undefined, chapterId: undefined, kpId: undefined, type: undefined, difficulty: undefined, status: undefined, kw: '' });

  const loadSummary = () => {
    endpoints.aiBankSummary().then((r: any) => setSummary(r)).catch(() => {});
  };

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    qs.set('page', String(page));
    qs.set('pageSize', String(pageSize));
    endpoints.aiBankQuestions(qs.toString())
      .then((r: any) => {
        setRows(r.items || []);
        setTotal(r.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    endpoints.meta().then((m: any) => setMeta(m)).catch(() => {});
    loadSummary();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, pageSize]);

  const patch = (next: any) => {
    setPage(1);
    setFilters((f: any) => ({ ...f, ...next }));
  };

  const reset = () => {
    setPage(1);
    setFilters({ courseId: undefined, chapterId: undefined, kpId: undefined, type: undefined, difficulty: undefined, status: undefined, kw: '' });
  };

  const changeStatus = async (q: any, status: string) => {
    await endpoints.setAiBankStatus(q.id, status);
    msg.success(`「${q.stem.slice(0, 12)}…」已${STATUS_LABEL[status] === '已上架' ? '上架' : status === 'offline' ? '下架' : '归档'}`);
    load();
    loadSummary();
    if (detail && detail.id === q.id) setDetail({ ...detail, status });
  };

  const chapterOptions = useMemo(() => {
    const list = (meta.chapters || []).filter((c: any) => !filters.courseId || c.courseId === filters.courseId);
    return list.map((c: any) => ({ value: c.id, label: c.name }));
  }, [meta, filters.courseId]);

  const kpOptions = useMemo(() => {
    const ch = (meta.chapters || []).find((c: any) => c.id === filters.chapterId);
    const list = ch ? ch.kps : (meta.chapters || []).filter((c: any) => !filters.courseId || c.courseId === filters.courseId).flatMap((c: any) => c.kps);
    return list.map((k: any) => ({ value: k.id, label: k.name }));
  }, [meta, filters.courseId, filters.chapterId]);

  const typeTags = Object.keys(TYPE_LABEL).map((t) => ({ t, n: summary.byType?.[t] || 0 }));
  const diffTags = Object.keys(DIFF_LABEL).map((d) => ({ d, n: summary.byDifficulty?.[d] || 0 }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="yj-page-title">AI 题库</div>
        <Button type="link" onClick={() => nav('/doclib')}>去文档库组卷 →</Button>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginTop: -8, fontSize: 13 }}>
        统一存放 AI 命题工作台审核通过的题目。题目经「命题 → 教师审核 → 归档入库」后进入本库，可按学科、章节、知识点、题型、难度与状态检索和管理。
      </Typography.Paragraph>

      <div className="yj-section">
        <Steps
          size="small"
          current={3}
          items={[
            { title: 'AI 命题', description: '工作台按章节与知识点生成候选题' },
            { title: '教师审核', description: '逐题通过 / 淘汰，低置信度重点复核' },
            { title: '归档入库', description: '通过的题目写入 AI 题库并标记来源任务' }
          ]}
        />
      </div>

      <div className="yj-stat-row">
        <Card size="small"><Statistic title="题库总量" value={summary.total || 0} suffix="题" /></Card>
        <Card size="small"><Statistic title="已上架" value={summary.byStatus?.published || 0} valueStyle={{ color: '#0f9d76' }} suffix="题" /></Card>
        <Card size="small"><Statistic title="已下架" value={summary.byStatus?.offline || 0} valueStyle={{ color: '#c2761b' }} suffix="题" /></Card>
        <Card size="small"><Statistic title="已归档" value={summary.byStatus?.archived || 0} valueStyle={{ color: '#6b7a90' }} suffix="题" /></Card>
        <Card size="small"><Statistic title="来源命题任务" value={summary.jobs || 0} suffix="个" /></Card>
      </div>

      <div className="yj-section">
        <h4>分类分布</h4>
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          <div>
            <span style={{ color: '#6b7a90', fontSize: 12.5, marginRight: 8 }}>按题型</span>
            {typeTags.map(({ t, n }) => (
              <Tag key={t} color={TYPE_COLOR[t]} style={{ marginBottom: 4 }}>{TYPE_LABEL[t]} {n}</Tag>
            ))}
          </div>
          <div>
            <span style={{ color: '#6b7a90', fontSize: 12.5, marginRight: 8 }}>按难度</span>
            {diffTags.map(({ d, n }) => (
              <Tag key={d} color={DIFF_COLOR[d]} style={{ marginBottom: 4 }}>{DIFF_LABEL[d]} {n}</Tag>
            ))}
          </div>
          <div>
            <span style={{ color: '#6b7a90', fontSize: 12.5, marginRight: 8 }}>按学科</span>
            {(summary.courses || []).map((c: any) => (
              <Tag key={c.id} style={{ marginBottom: 4 }}>{c.name} {c.count}</Tag>
            ))}
          </div>
        </Space>
      </div>

      <div className="yj-section">
        <h4>题目检索与管理</h4>
        <Space wrap style={{ marginBottom: 12 }}>
          <Select allowClear placeholder="学科 / 课程" style={{ width: 170 }} value={filters.courseId}
            options={(meta.courses || []).map((c: any) => ({ value: c.id, label: c.name }))}
            onChange={(v) => patch({ courseId: v, chapterId: undefined, kpId: undefined })} />
          <Select allowClear placeholder="章节" style={{ width: 180 }} value={filters.chapterId}
            options={chapterOptions} onChange={(v) => patch({ chapterId: v, kpId: undefined })} />
          <Select allowClear placeholder="知识点" style={{ width: 180 }} value={filters.kpId}
            options={kpOptions} onChange={(v) => patch({ kpId: v })} />
          <Select allowClear placeholder="题型" style={{ width: 120 }} value={filters.type}
            options={Object.keys(TYPE_LABEL).map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
            onChange={(v) => patch({ type: v })} />
          <Select allowClear placeholder="难度" style={{ width: 110 }} value={filters.difficulty}
            options={Object.keys(DIFF_LABEL).map((d) => ({ value: d, label: DIFF_LABEL[d] }))}
            onChange={(v) => patch({ difficulty: v })} />
          <Select allowClear placeholder="状态" style={{ width: 120 }} value={filters.status}
            options={Object.keys(STATUS_LABEL).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            onChange={(v) => patch({ status: v })} />
          <Input.Search placeholder="题干 / 解析关键词" allowClear style={{ width: 220 }} value={filters.kw}
            onChange={(e) => setFilters((f: any) => ({ ...f, kw: e.target.value }))}
            onSearch={() => setPage(1)} />
          <Button onClick={reset}>重置</Button>
        </Space>

        <Table
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={rows}
          locale={{
            emptyText: (
              <Empty description="AI 题库暂无符合条件的题目">
                <Button type="primary" onClick={() => nav('/workbench')}>去 AI 命题工作台命题</Button>
              </Empty>
            )
          }}
          pagination={{
            current: page, pageSize, total, showSizeChanger: true,
            showTotal: (t) => `共 ${t} 题`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); }
          }}
          columns={[
            {
              title: '题干', dataIndex: 'stem', ellipsis: true,
              render: (v: string, r: any) => <a onClick={() => setDetail(r)}>{v}</a>
            },
            { title: '题型', dataIndex: 'type', width: 88, render: (v: string) => <Tag color={TYPE_COLOR[v]}>{TYPE_LABEL[v] || v}</Tag> },
            { title: '难度', dataIndex: 'difficulty', width: 78, render: (v: string) => <Tag color={DIFF_COLOR[v]}>{DIFF_LABEL[v] || v}</Tag> },
            {
              title: '学科 · 章节', width: 210, ellipsis: true,
              render: (_: any, r: any) => <span style={{ fontSize: 12.5 }}>{r.courseName} · {r.chapterName}</span>
            },
            {
              title: '知识点', width: 180,
              render: (_: any, r: any) => (r.kpNames || []).map((n: string) => <Tag key={n} style={{ marginBottom: 2 }}>{n}</Tag>)
            },
            {
              title: '状态', dataIndex: 'status', width: 92,
              render: (v: string) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] || v}</Tag>
            },
            {
              title: '来源任务', dataIndex: 'sourceJobId', width: 130, ellipsis: true,
              render: (v: string) => <Typography.Text copyable={{ text: v }} style={{ fontSize: 12 }}>{v}</Typography.Text>
            },
            { title: '入库时间', dataIndex: 'createdAt', width: 160, render: (v: string) => <span style={{ fontSize: 12.5 }}>{String(v || '').replace('T', ' ').slice(0, 16)}</span> },
            {
              title: '操作', width: 168, fixed: 'right',
              render: (_: any, r: any) => (
                <Space size={4}>
                  <Button size="small" onClick={() => setDetail(r)}>查看</Button>
                  {r.status !== 'published' && <Button size="small" type="link" onClick={() => changeStatus(r, 'published')}>上架</Button>}
                  {r.status === 'published' && <Button size="small" type="link" onClick={() => changeStatus(r, 'offline')}>下架</Button>}
                  {r.status !== 'archived' && <Button size="small" type="link" danger onClick={() => changeStatus(r, 'archived')}>归档</Button>}
                </Space>
              )
            }
          ]}
        />
        <Collapse
          size="small"
          style={{ marginTop: 10 }}
          items={[{
            key: 'schema',
            label: '存储结构与分类维度说明',
            children: (
              <Descriptions
                size="small"
                column={1}
                bordered
                items={[
                  { key: 'a', label: '归属主键', children: '题目 id；学科 courseId；章节 chapterId；知识点 kp[]（支持一题多知识点）' },
                  { key: 'b', label: '分类维度', children: '按学科（课程）→ 章节 → 知识点三级组织，叠加题型（单选/多选/判断/填空/简答）与难度（easy/medium/hard）' },
                  { key: 'c', label: '状态标识', children: 'published 已上架（可用于组卷）/ offline 已下架（暂不参与组卷）/ archived 已归档（留存备查）' },
                  { key: 'd', label: '来源与审计', children: 'sourceType=ai、origin=ai_workbench、sourceJobId 记录命题任务；reviewedBy / reviewedAt 记录审核人与审核时间' },
                  { key: 'e', label: '正文溯源', children: 'trace 保存章节、正文哈希（bodyHash）与生成模型版本，可回溯到命中所依据的教材正文' }
                ]}
              />
            )
          }]}
        />
      </div>

      <Drawer width={640} open={!!detail} onClose={() => setDetail(null)} title="题目详情">
        {detail && (
          <>
            <Space wrap style={{ marginBottom: 12 }}>
              <Tag color={TYPE_COLOR[detail.type]}>{TYPE_LABEL[detail.type] || detail.type}</Tag>
              <Tag color={DIFF_COLOR[detail.difficulty]}>{DIFF_LABEL[detail.difficulty] || detail.difficulty}</Tag>
              <Tag color={STATUS_COLOR[detail.status]}>{STATUS_LABEL[detail.status] || detail.status}</Tag>
              <Tag color="blue">AI 生成</Tag>
            </Space>
            <Typography.Paragraph style={{ fontWeight: 600, fontSize: 14 }}>{detail.stem}</Typography.Paragraph>
            {(detail.options || []).map((o: any) => (
              <div key={o.id} style={{ padding: '4px 0', fontSize: 13 }}>
                <b>{o.id}.</b> {o.content}
                {detail.answer === o.id && <Tag color="success" style={{ marginLeft: 8 }}>正确答案</Tag>}
              </div>
            ))}
            <Descriptions column={1} size="small" bordered style={{ marginTop: 12 }}
              items={[
                { key: 'a', label: '答案', children: fmtAnswer(detail) },
                { key: 'b', label: '解析', children: detail.analysis || '-' },
                { key: 'c', label: '学科 / 章节', children: `${detail.courseName || '-'} / ${detail.chapterName || '-'}` },
                { key: 'd', label: '知识点', children: (detail.kpNames || []).join('、') || '-' },
                { key: 'e', label: '来源任务', children: detail.sourceJobId || '-' },
                { key: 'f', label: '审核人 / 时间', children: `${detail.reviewedBy || '-'} / ${String(detail.reviewedAt || '-').replace('T', ' ').slice(0, 19)}` },
                { key: 'g', label: '正文溯源', children: detail.trace ? `章节 ${detail.trace.chapterId} · 哈希 ${detail.trace.bodyHash} · 模型 ${detail.trace.model}` : '-' },
                { key: 'h', label: '入库时间', children: String(detail.createdAt || '').replace('T', ' ').slice(0, 19) }
              ]}
            />
            {(detail.scorePoints || []).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <b style={{ fontSize: 13 }}>评分点</b>
                {(detail.scorePoints || []).map((s: any, i: number) => (
                  <div key={i} style={{ fontSize: 12.5, color: '#44506a', marginTop: 4 }}>
                    {i + 1}. {s.text}（权重 {Math.round((s.weight || 0) * 100)}%，关键词：{(s.keywords || []).join('、')}）
                  </div>
                ))}
              </div>
            )}
            <Space style={{ marginTop: 16 }}>
              {detail.status !== 'published' && <Button type="primary" onClick={() => changeStatus(detail, 'published')}>上架</Button>}
              {detail.status === 'published' && <Button onClick={() => changeStatus(detail, 'offline')}>下架</Button>}
              {detail.status !== 'archived' && <Button danger onClick={() => changeStatus(detail, 'archived')}>归档</Button>}
            </Space>
          </>
        )}
      </Drawer>
    </div>
  );
}
