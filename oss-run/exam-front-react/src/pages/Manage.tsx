/**
 * 考试管理：试卷库 + 考试上下架
 * 状态一律经统一字典展示（§9.3 不得把英文状态直接输出到界面）。
 *
 * 版式：顶部四项概览 → 试卷库 / 考试两个页签，各自带检索与状态筛选。
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Select, Space, Tabs, Tag, Typography, App as AntApp } from 'antd';
import { EditOutlined, FundOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { endpoints } from '../api';
import { formatDateTime, formatDateTimeRange, formatPercent, formatDuration, formatScore } from '../utils/format';
import { PageContainer, DataTable, StatCard, StatusTag } from '../components';

export default function Manage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [tab, setTab] = useState('papers');
  const [pKw, setPKw] = useState('');
  const [pStatus, setPStatus] = useState<string>('all');
  const [eKw, setEKw] = useState('');
  const [eStatus, setEStatus] = useState<string>('all');
  const nav = useNavigate();
  const { message: msg, modal } = AntApp.useApp();

  const load = () => {
    endpoints.papers().then((r: any) => setPapers(r.items || [])).catch(() => {});
    endpoints.exams().then((r: any) => setExams(r.items || [])).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  /** 上下架属于影响学生可见性的操作，统一二次确认 */
  const toggle = (e: any) => {
    const offline = e.status === 'published';
    modal.confirm({
      title: offline ? '下架考试' : '发布考试',
      content: offline
        ? `下架后学生将无法在考试大厅看到「${e.title}」，已提交的答卷不受影响。`
        : `发布后「${e.title}」将立即出现在学生考试大厅。`,
      okType: offline ? 'danger' : 'primary',
      onOk: async () => {
        await endpoints.setExamStatus(e.id, offline ? 'archived' : 'published');
        msg.success(offline ? '已下架' : '已发布');
        load();
      }
    });
  };

  const stats = useMemo(() => {
    const published = exams.filter((e) => e.status === 'published').length;
    const archived = exams.filter((e) => e.status === 'archived').length;
    const rates = papers.map((p) => Number(p.passRate)).filter((n) => !Number.isNaN(n));
    const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    return { papers: papers.length, published, archived, avg };
  }, [papers, exams]);

  const paperRows = useMemo(() => {
    const s = pKw.trim().toLowerCase();
    return papers.filter((p) => {
      if (pStatus !== 'all' && (p.status || '') !== pStatus) return false;
      if (s && !`${p.title} ${p.courseName || ''}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [papers, pKw, pStatus]);

  const examRows = useMemo(() => {
    const s = eKw.trim().toLowerCase();
    return exams.filter((e) => {
      if (eStatus !== 'all' && (e.status || '') !== eStatus) return false;
      if (s && !String(e.title).toLowerCase().includes(s)) return false;
      return true;
    });
  }, [exams, eKw, eStatus]);

  const paperPane = (
    <div className="yj-panel">
      <div className="yj-toolbar" style={{ padding: '10px 13px', marginBottom: 0, borderBottom: '1px solid var(--yj-line)' }}>
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: '#A3B0C2' }} />}
          placeholder="搜索试卷 / 课程"
          style={{ width: 230 }}
          value={pKw}
          onChange={(e) => setPKw(e.target.value)}
        />
        <Select
          style={{ width: 128 }}
          value={pStatus}
          onChange={setPStatus}
          options={[
            { value: 'all', label: '全部状态' },
            { value: 'published', label: '已发布' },
            { value: 'draft', label: '草稿' },
            { value: 'archived', label: '已归档' }
          ]}
        />
        <span className="yj-hint">共 {paperRows.length} 份</span>
        <span className="sp" />
        <Button onClick={() => nav('/doclib')}>去文档库组卷</Button>
      </div>
      <div style={{ padding: '10px 13px 6px' }}>
        <DataTable
          rowKey="id"
          pagination={false}
          emptyText="没有符合条件的试卷，可先在文档库组卷"
          dataSource={paperRows}
          columns={[
            {
              title: '试卷',
              dataIndex: 'title',
              ellipsis: true,
              render: (v: string, p: any) => (
                <div>
                  <div className="yj-cell-t" title={v}>{v}</div>
                  <div className="yj-cell-s">{p.courseName || '-'}</div>
                </div>
              )
            },
            {
              title: '题量 / 总分', width: 122,
              render: (_: any, p: any) => (
                <span className="num" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{p.questionCount} 题 / {formatScore(p.totalScore)} 分</span>
              )
            },
            {
              title: '及格率', width: 116,
              render: (_: any, p: any) => {
                const v = Number(p.passRate) || 0;
                return (
                  <span className={`yj-rate${v < 0.6 ? ' low' : ''}`}>
                    <span className="track"><i style={{ width: `${Math.round(v * 100)}%` }} /></span>
                    <span>{formatPercent(p.passRate)}</span>
                  </span>
                );
              }
            },
            {
              title: '知识点组', width: 236, ellipsis: true,
              render: (_: any, p: any) => (
                <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(p.groups || []).slice(0, 2).map((g: any) => <Tag key={g.id} style={{ marginInlineEnd: 0 }}>{g.name}</Tag>)}
                  {(p.groups || []).length > 2 && <span className="yj-hint">+{(p.groups || []).length - 2}</span>}
                </span>
              )
            },
            { title: '关联考试', dataIndex: 'examCount', width: 84, render: (v: number) => <span className="num">{v ?? 0}</span> },
            { title: '状态', dataIndex: 'status', width: 96, render: (s: string) => <StatusTag kind="examStatus" value={s} /> }
          ]}
        />
      </div>
    </div>
  );

  const examPane = (
    <div className="yj-panel">
      <div className="yj-toolbar" style={{ padding: '10px 13px', marginBottom: 0, borderBottom: '1px solid var(--yj-line)' }}>
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: '#A3B0C2' }} />}
          placeholder="搜索考试名称"
          style={{ width: 230 }}
          value={eKw}
          onChange={(e) => setEKw(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {([['all', '全部'], ['published', '已发布'], ['archived', '已下架']] as [string, string][]).map(([k, label]) => (
            <button key={k} className={`yj-chip${eStatus === k ? ' on' : ''}`} onClick={() => setEStatus(k)}>{label}</button>
          ))}
        </div>
        <span className="yj-hint">共 {examRows.length} 场</span>
        <span className="sp" />
        <Button type="primary" ghost onClick={() => nav('/publish')}>考试发布 →</Button>
      </div>
      <div style={{ padding: '10px 13px 6px' }}>
        <DataTable
          rowKey="id"
          pagination={false}
          emptyText="没有符合条件的考试，可在考试发布中发布"
          dataSource={examRows}
          columns={[
            {
              title: '考试',
              dataIndex: 'title',
              ellipsis: true,
              render: (v: string, e: any) => (
                <div>
                  <div className="yj-cell-t" title={v}>{v}</div>
                  <div className="yj-cell-s">
                    <span>{formatDuration(e.duration)}</span>
                    <span>·</span>
                    <span>{formatDateTimeRange(e.startAt, e.endAt)}</span>
                  </div>
                </div>
              )
            },
            { title: '类型', dataIndex: 'type', width: 108, render: (t: string) => <StatusTag kind="examType" value={t} /> },
            { title: '状态', dataIndex: 'status', width: 96, render: (s: string) => <StatusTag kind="examStatus" value={s} /> },
            { title: '更新时间', dataIndex: 'updatedAt', width: 146, render: (v: string) => <span style={{ fontSize: 12.5 }}>{formatDateTime(v)}</span> },
            {
              title: '操作', width: 168,
              render: (_: unknown, e: any) => (
                <Space size={6}>
                  <Button size="small" icon={<FundOutlined />} onClick={() => nav(`/stats/${e.id}`)}>看板</Button>
                  <Button size="small" icon={<EditOutlined />} danger={e.status === 'published'} onClick={() => toggle(e)}>
                    {e.status === 'published' ? '下架' : '发布'}
                  </Button>
                </Space>
              )
            }
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ fontSize: 11.5, margin: '8px 2px 6px' }}>
          下架后状态置为「已归档」，学生端不再展示，但历史成绩与审计记录保留。
        </Typography.Paragraph>
      </div>
    </div>
  );

  return (
    <PageContainer
      title="考试管理"
      description="试卷库与考试上下架。状态取值统一走数据字典映射为中文展示，新增状态需先更新数据字典并完成评审（§9.3/§15）。"
    >
      <div className="yj-kpi-row">
        <StatCard label="试卷总量" value={stats.papers} suffix="份" note="来源于文档库组卷" />
        <StatCard label="在架考试" value={stats.published} suffix="场" color="#0F9D76" note="学生端可见并可作答" />
        <StatCard label="已下架" value={stats.archived} suffix="场" color="#6B7A90" note="历史成绩与审计保留" />
        <StatCard label="平均及格率" value={formatPercent(stats.avg)} color="#1657D6" note="按试卷库中已设定及格线的试卷统计" />
      </div>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'papers', label: '试卷库', children: paperPane },
          { key: 'exams', label: '考试', children: examPane }
        ]}
      />
    </PageContainer>
  );
}
