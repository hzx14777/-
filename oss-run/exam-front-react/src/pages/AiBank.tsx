/**
 * AI 题库：接收 AI 命题工作台审核通过的题目，支持按学科 / 章节 / 知识点 / 题型 / 难度 / 状态检索与上下架
 * 字典、标签、分页、时间展示统一走公共层（§5.1 / §9.3 / §10.2）
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Descriptions,
  Drawer,
  Flex,
  Input,
  Select,
  Space,
  Steps,
  Tag,
  Typography,
  App as AntApp
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { endpoints } from '../api';
import { formatDateTime, formatAnswer } from '../utils/format';
import { dict, dictOptions } from '../constants/dictionary';
import { PageContainer, Section, DataTable, StatCard, StatusTag } from '../components';

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
  const [filters, setFilters] = useState<Record<string, string | undefined>>({
    courseId: undefined,
    chapterId: undefined,
    kpId: undefined,
    type: undefined,
    difficulty: undefined,
    status: undefined,
    kw: ''
  });

  const loadSummary = () => {
    endpoints.aiBankSummary().then(setSummary).catch(() => {});
  };

  const load = (p = page, ps = pageSize) => {
    setLoading(true);
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    qs.set('page', String(p));
    qs.set('pageSize', String(ps));
    endpoints
      .aiBankQuestions(qs.toString())
      .then((r: any) => {
        setRows(r.items || []);
        setTotal(r.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    endpoints.meta().then(setMeta).catch(() => {});
    loadSummary();
  }, []);

  useEffect(() => {
    load(page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, pageSize]);

  const patch = (next: Record<string, string | undefined>) => {
    setPage(1);
    setFilters((f) => ({ ...f, ...next }));
  };

  const reset = () => {
    setPage(1);
    setFilters({ courseId: undefined, chapterId: undefined, kpId: undefined, type: undefined, difficulty: undefined, status: undefined, kw: '' });
  };

  const changeStatus = async (q: any, status: string) => {
    await endpoints.setAiBankStatus(q.id, status);
    msg.success(`「${q.stem.slice(0, 12)}…」已${dict('questionStatus', status).label.replace('已', '')}`);
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
    const list = ch
      ? ch.kps
      : (meta.chapters || []).filter((c: any) => !filters.courseId || c.courseId === filters.courseId).flatMap((c: any) => c.kps);
    return list.map((k: any) => ({ value: k.id, label: k.name }));
  }, [meta, filters.courseId, filters.chapterId]);

  return (
    <PageContainer
      title="AI 题库"
      description="统一存放 AI 命题工作台审核通过的题目，可按学科、章节、知识点、题型、难度与状态检索和管理。"
      extra={<Button type="link" onClick={() => nav('/doclib')}>去文档库组卷 →</Button>}
    >
      <Section>
        <Steps
          size="small"
          current={3}
          items={[
            { title: 'AI 命题', description: '工作台按章节与知识点生成候选题' },
            { title: '教师审核', description: '逐题通过 / 淘汰，低置信度重点复核' },
            { title: '归档入库', description: '通过的题目写入 AI 题库并标记来源任务' }
          ]}
        />
      </Section>

      <div className="yj-stat-row">
        <StatCard label="题库总量" value={summary.total || 0} suffix="题" />
        <StatCard label="已上架" value={summary.byStatus?.published || 0} suffix="题" color="#0f9d76" />
        <StatCard label="已下架" value={summary.byStatus?.offline || 0} suffix="题" color="#c2761b" />
        <StatCard label="已归档" value={summary.byStatus?.archived || 0} suffix="题" color="#6b7a90" />
        <StatCard label="来源命题任务" value={summary.jobs || 0} suffix="个" />
      </div>

      <Section title="分类分布">
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          <div>
            <span style={{ color: '#6b7a90', fontSize: 12.5, marginRight: 8 }}>按题型</span>
            {dictOptions('questionType').map((o) => (
              <Tag key={o.value} color={dict('questionType', o.value).color} style={{ marginBottom: 4 }}>
                {o.label} {summary.byType?.[o.value] || 0}
              </Tag>
            ))}
          </div>
          <div>
            <span style={{ color: '#6b7a90', fontSize: 12.5, marginRight: 8 }}>按难度</span>
            {dictOptions('difficulty').map((o) => (
              <Tag key={o.value} color={dict('difficulty', o.value).color} style={{ marginBottom: 4 }}>
                {o.label} {summary.byDifficulty?.[o.value] || 0}
              </Tag>
            ))}
          </div>
          <div>
            <span style={{ color: '#6b7a90', fontSize: 12.5, marginRight: 8 }}>按学科</span>
            {(summary.courses || []).map((c: any) => (
              <Tag key={c.id} style={{ marginBottom: 4 }}>
                {c.name} {c.count}
              </Tag>
            ))}
          </div>
        </Space>
      </Section>

      <Section title="题目检索与管理">
        <Space wrap style={{ marginBottom: 12 }}>
          <Select
            allowClear
            placeholder="学科 / 课程"
            style={{ width: 170 }}
            value={filters.courseId}
            options={(meta.courses || []).map((c: any) => ({ value: c.id, label: c.name }))}
            onChange={(v) => patch({ courseId: v, chapterId: undefined, kpId: undefined })}
          />
          <Select
            allowClear
            placeholder="章节"
            style={{ width: 180 }}
            value={filters.chapterId}
            options={chapterOptions}
            onChange={(v) => patch({ chapterId: v, kpId: undefined })}
          />
          <Select allowClear placeholder="知识点" style={{ width: 180 }} value={filters.kpId} options={kpOptions} onChange={(v) => patch({ kpId: v })} />
          <Select allowClear placeholder="题型" style={{ width: 120 }} value={filters.type} options={dictOptions('questionType')} onChange={(v) => patch({ type: v })} />
          <Select allowClear placeholder="难度" style={{ width: 110 }} value={filters.difficulty} options={dictOptions('difficulty')} onChange={(v) => patch({ difficulty: v })} />
          <Select allowClear placeholder="状态" style={{ width: 120 }} value={filters.status} options={dictOptions('questionStatus')} onChange={(v) => patch({ status: v })} />
          <Input.Search
            placeholder="题干 / 解析关键词"
            allowClear
            style={{ width: 220 }}
            value={filters.kw}
            onChange={(e) => setFilters((f) => ({ ...f, kw: e.target.value }))}
            onSearch={() => setPage(1)}
          />
          <Button onClick={reset}>重置</Button>
        </Space>

        <DataTable
          rowKey="id"
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(p, ps) => {
            setPage(p);
            setPageSize(ps);
          }}
          emptyText="AI 题库暂无符合条件的题目"
          emptyAction={<Button type="primary" onClick={() => nav('/workbench')}>去 AI 命题工作台命题</Button>}
          dataSource={rows}
          columns={[
            {
              title: '题干',
              dataIndex: 'stem',
              ellipsis: true,
              render: (v: string, r: any) => <a onClick={() => setDetail(r)}>{v}</a>
            },
            { title: '题型', dataIndex: 'type', width: 96, render: (v: string) => <StatusTag kind="questionType" value={v} /> },
            { title: '难度', dataIndex: 'difficulty', width: 86, render: (v: string) => <StatusTag kind="difficulty" value={v} /> },
            {
              title: '学科 · 章节',
              width: 210,
              ellipsis: true,
              render: (_: unknown, r: any) => (
                <span style={{ fontSize: 12.5 }}>
                  {r.courseName} · {r.chapterName}
                </span>
              )
            },
            {
              title: '知识点',
              width: 180,
              render: (_: unknown, r: any) => (r.kpNames || []).map((n: string) => <Tag key={n} style={{ marginBottom: 2 }}>{n}</Tag>)
            },
            { title: '状态', dataIndex: 'status', width: 96, render: (v: string) => <StatusTag kind="questionStatus" value={v} /> },
            {
              title: '来源任务',
              dataIndex: 'sourceJobId',
              width: 130,
              ellipsis: true,
              render: (v: string) => <Typography.Text copyable={{ text: v }} style={{ fontSize: 12 }}>{v}</Typography.Text>
            },
            { title: '入库时间', dataIndex: 'createdAt', width: 150, render: (v: string) => <span style={{ fontSize: 12.5 }}>{formatDateTime(v)}</span> },
            {
              title: '操作',
              width: 168,
              fixed: 'right',
              render: (_: unknown, r: any) => (
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
      </Section>

      <Drawer width={640} open={!!detail} onClose={() => setDetail(null)} title="题目详情">
        {detail && (
          <>
            <Space wrap style={{ marginBottom: 12 }}>
              <StatusTag kind="questionType" value={detail.type} />
              <StatusTag kind="difficulty" value={detail.difficulty} />
              <StatusTag kind="questionStatus" value={detail.status} />
              <Tag color="blue">AI 生成</Tag>
            </Space>
            <Typography.Paragraph style={{ fontWeight: 600, fontSize: 14 }}>{detail.stem}</Typography.Paragraph>
            {(detail.options || []).map((o: any) => (
              <div key={o.id} style={{ padding: '4px 0', fontSize: 13 }}>
                <b>{o.id}.</b> {o.content}
                {detail.answer === o.id && <Tag color="success" style={{ marginLeft: 8 }}>正确答案</Tag>}
              </div>
            ))}
            <Descriptions
              column={1}
              size="small"
              bordered
              style={{ marginTop: 12 }}
              items={[
                { key: 'a', label: '答案', children: formatAnswer(detail.answer, detail.type) || '-' },
                { key: 'b', label: '解析', children: detail.analysis || '-' },
                { key: 'c', label: '学科 / 章节', children: `${detail.courseName || '-'} / ${detail.chapterName || '-'}` },
                { key: 'd', label: '知识点', children: (detail.kpNames || []).join('、') || '-' },
                { key: 'e', label: '来源任务', children: detail.sourceJobId || '-' },
                { key: 'f', label: '审核人 / 时间', children: `${detail.reviewedBy || '-'} / ${formatDateTime(detail.reviewedAt)}` },
                {
                  key: 'g',
                  label: '正文溯源',
                  children: detail.trace ? `章节 ${detail.trace.chapterId} · 哈希 ${detail.trace.bodyHash} · 模型 ${detail.trace.model}` : '-'
                },
                { key: 'h', label: '入库时间', children: formatDateTime(detail.createdAt) }
              ]}
            />
            <Flex gap={8} style={{ marginTop: 16 }}>
              {detail.status !== 'published' && <Button type="primary" onClick={() => changeStatus(detail, 'published')}>上架</Button>}
              {detail.status === 'published' && <Button onClick={() => changeStatus(detail, 'offline')}>下架</Button>}
              {detail.status !== 'archived' && <Button danger onClick={() => changeStatus(detail, 'archived')}>归档</Button>}
            </Flex>
          </>
        )}
      </Drawer>
    </PageContainer>
  );
}
