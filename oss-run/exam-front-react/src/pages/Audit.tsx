/**
 * 审计与事件：审计日志 + 业务事件（含出站投递状态，§11.4 失败可人工重放）
 * 事件名称、角色展示统一走字典（§11.3 / §8.1）
 *
 * 版式：概览四卡 + 双页签；审计按动作分组筛选，事件按出站/入站筛选并可查看报文。
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Input, Tabs, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { endpoints } from '../api';
import { formatDateTime } from '../utils/format';
import { PageContainer, DataTable, StatCard, StatusTag } from '../components';

/** 动作 → 分组，用于顶部的快捷筛选（动作名以审计中心登记的中文为准） */
const ACTION_GROUPS: { key: string; label: string; actions: string[] }[] = [
  { key: 'auth', label: '登录认证', actions: ['统一登录', '令牌续期', '退出登录'] },
  { key: 'exam', label: '考试与答卷', actions: ['开始考试', '提交答卷', '阅卷确认', '发布考试', '下架考试', '同步自学完成'] },
  { key: 'content', label: '内容与发布', actions: ['审核通过文档', '驳回文档', '生成试卷', '生成练习', '删除试卷', '分类维护'] },
  { key: 'bank', label: '题库维护', actions: ['AI 题库维护', '题目审核', 'AI 命题', 'AI 命题入库', '题目删除', '题目新增', '题目修改'] },
  { key: 'perm', label: '权限变更', actions: ['权限变更'] }
];

const groupOf = (action: string) => ACTION_GROUPS.find((g) => g.actions.includes(action))?.key || 'other';

/** 平台编码 → 中文展示（§9.3 不把英文编码直接输出到界面） */
const PLATFORM_LABEL: Record<string, string> = {
  exam: '考试平台',
  selfstudy: '自学平台',
  forum: '论坛',
  identity: '认证中心'
};
const platformLabel = (v: string) => PLATFORM_LABEL[String(v)] || String(v || '-');
/** 出站：本平台发出的 exam.*；入站：其他平台发来的 course.completed 等 */
const isOutbound = (r: any) => String(r.sourcePlatform) === 'exam' || String(r.eventType || '').startsWith('exam.');

export default function Audit() {
  const [audit, setAudit] = useState<any>(null);
  const [events, setEvents] = useState<any>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const [action, setAction] = useState('all');
  const [dir, setDir] = useState<'all' | 'out' | 'in'>('all');
  const [kw, setKw] = useState('');
  const [tab, setTab] = useState('audit');
  const [detail, setDetail] = useState<any>(null);
  const pageSize = 20;

  useEffect(() => {
    endpoints.audit(auditPage, pageSize).then(setAudit).catch(() => {});
  }, [auditPage]);

  useEffect(() => {
    endpoints.events(eventPage, pageSize).then(setEvents).catch(() => {});
  }, [eventPage]);

  const auditRows = useMemo(() => {
    const s = kw.trim().toLowerCase();
    return (audit?.items || []).filter((r: any) => {
      if (action !== 'all' && groupOf(r.action) !== action) return false;
      if (s && !`${r.actor} ${r.action} ${r.target} ${r.detail}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [audit, action, kw]);

  const eventRows = useMemo(() => {
    const s = kw.trim().toLowerCase();
    return (events?.items || []).filter((r: any) => {
      const out = isOutbound(r);
      if (dir === 'out' && !out) return false;
      if (dir === 'in' && out) return false;
      if (s && !`${r.eventType} ${r.eventId} ${r.operatorId} ${r.operatorName || ''}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [events, dir, kw]);

  const brief = useMemo(() => {
    const rows = audit?.items || [];
    return {
      actors: new Set(rows.map((r: any) => r.actor)).size,
      types: new Set(rows.map((r: any) => r.action)).size,
      latest: rows.reduce((t: string, r: any) => (String(r.at) > t ? String(r.at) : t), '')
    };
  }, [audit]);

  const auditPane = (
    <div className="yj-panel">
      <div className="yj-toolbar" style={{ padding: '10px 13px', marginBottom: 0, borderBottom: '1px solid var(--yj-line)' }}>
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: '#A3B0C2' }} />}
          placeholder="搜索操作人 / 对象 / 说明"
          style={{ width: 240 }}
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className={`yj-chip${action === 'all' ? ' on' : ''}`} onClick={() => setAction('all')}>全部</button>
          {ACTION_GROUPS.map((g) => (
            <button key={g.key} className={`yj-chip${action === g.key ? ' on' : ''}`} onClick={() => setAction(g.key)}>
              {g.label}
            </button>
          ))}
        </div>
        <span className="sp" />
        <span className="yj-hint">本页 {auditRows.length} 条</span>
      </div>
      <div style={{ padding: '10px 13px 6px' }}>
        <DataTable
          rowKey="id"
          page={audit?.page ?? auditPage}
          pageSize={audit?.pageSize ?? pageSize}
          total={audit?.total}
          onPageChange={(p) => setAuditPage(p)}
          emptyText="没有符合条件的审计记录"
          dataSource={auditRows}
          columns={[
            { title: '时间', dataIndex: 'at', width: 146, render: (v: string) => <span style={{ fontSize: 12.5 }}>{formatDateTime(v)}</span> },
            { title: '操作人', dataIndex: 'actor', width: 96 },
            {
              /* 系统自动动作不是角色（§8.1），单独标注，不与三类身份混用 */
              title: '角色', width: 88,
              render: (_: any, r: any) => (r.actorType === 'system' ? <span className="yj-badge">系统</span> : <StatusTag kind="role" value={r.role} />)
            },
            {
              title: '动作', dataIndex: 'action', width: 128,
              render: (v: string) => <span style={{ fontSize: 12.5, fontWeight: 500 }}>{v}</span>
            },
            { title: '对象', dataIndex: 'target', width: 132, ellipsis: true },
            { title: '说明', dataIndex: 'detail', ellipsis: true }
          ]}
        />
      </div>
    </div>
  );

  const eventPane = (
    <div className="yj-panel">
      <div className="yj-toolbar" style={{ padding: '10px 13px', marginBottom: 0, borderBottom: '1px solid var(--yj-line)' }}>
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: '#A3B0C2' }} />}
          placeholder="搜索 eventType / eventId"
          style={{ width: 240 }}
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {([['all', '全部'], ['out', '出站（本平台 → 总线）'], ['in', '入站（自学平台 → 本平台）']] as ['all' | 'out' | 'in', string][]).map(([k, label]) => (
            <button key={k} className={`yj-chip${dir === k ? ' on' : ''}`} onClick={() => setDir(k)}>{label}</button>
          ))}
        </div>
        <span className="sp" />
        <span className="yj-hint">共 {events?.total ?? 0} 条</span>
      </div>
      <div style={{ padding: '10px 13px 6px' }}>
        <Typography.Paragraph type="secondary" style={{ fontSize: 11.5, margin: '0 0 8px' }}>
          出站：exam.passed / exam.failed 按 §11.3 统一信封投递给事件总线；未配置总线时状态为 skipped，可人工重放。
          入站：course.completed（自学平台）已幂等消费，用于解锁章节考试。
        </Typography.Paragraph>
        <DataTable
          rowKey="eventId"
          page={events?.page ?? eventPage}
          pageSize={events?.pageSize ?? pageSize}
          total={events?.total}
          onPageChange={(p) => setEventPage(p)}
          emptyText="没有符合条件的跨平台事件"
          dataSource={eventRows}
          columns={[
            {
              title: '方向', width: 82,
              render: (_: any, r: any) => (
                <span className={`yj-badge ${isOutbound(r) ? 'pri' : 'ok'}`}>
                  {isOutbound(r) ? '出站' : '入站'}
                </span>
              )
            },
            { title: 'eventId', dataIndex: 'eventId', width: 176, render: (v: string) => <span style={{ fontSize: 11.5, color: 'var(--yj-muted)' }}>{v}</span> },
            { title: '类型', dataIndex: 'eventType', width: 150, render: (t: string) => <StatusTag kind="eventType" value={t} /> },
            { title: '发生时间', dataIndex: 'occurredAt', width: 146, render: (v: string) => <span style={{ fontSize: 12.5 }}>{formatDateTime(v)}</span> },
            { title: '来源平台', dataIndex: 'sourcePlatform', width: 100, render: (v: string) => platformLabel(v) },
            {
              /* 优先显示姓名；接口未带姓名时退回账号标识，避免整列空白 */
              title: '操作者', width: 96,
              render: (_: any, r: any) => r.operatorName || r.operatorId || '-'
            },
            { title: '数据', dataIndex: 'data', ellipsis: true, render: (v: unknown) => <span style={{ fontSize: 11.5, color: 'var(--yj-muted)' }}>{JSON.stringify(v)}</span> },
            {
              title: '', width: 64,
              render: (_: any, r: any) => <Button size="small" type="link" onClick={() => setDetail(r)}>报文</Button>
            }
          ]}
        />
      </div>
    </div>
  );

  return (
    <PageContainer title="审计与事件" description="认证与权限变更、发布与阅卷等关键动作全部留痕；跨平台事件按 §11.3 统一信封投递。">
      <div className="yj-kpi-row">
        <StatCard label="审计记录" value={audit?.total ?? 0} suffix="条" note="认证、发布、阅卷、题库等关键动作全留痕" />
        <StatCard label="跨平台事件" value={events?.total ?? 0} suffix="条" color="#1657D6" note="出站投递 + 入站消费" />
        <StatCard label="本页操作人" value={brief.actors} suffix="人" note={`覆盖 ${brief.types} 类动作`} />
        <StatCard label="最近一次操作" value={brief.latest ? formatDateTime(brief.latest).slice(5, 16) : '-'} color="#6B7A90" note="按审计时间倒序取当前页最新" />
      </div>

      <Tabs
        activeKey={tab}
        onChange={(k) => { setTab(k); setKw(''); }}
        items={[
          { key: 'audit', label: '审计日志', children: auditPane },
          { key: 'events', label: '跨平台事件', children: eventPane }
        ]}
      />

      <Drawer width={560} open={!!detail} onClose={() => setDetail(null)} title="事件报文">
        {detail && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <StatusTag kind="eventType" value={detail.eventType} />
              <span className="yj-badge pri">{detail.eventId}</span>
              <span className="yj-badge">{platformLabel(detail.sourcePlatform)}</span>
            </div>
            <pre style={{
              background: '#fafbfd', border: '1px solid var(--yj-line)', borderRadius: 10,
              padding: 14, fontSize: 11.5, lineHeight: 1.8, overflow: 'auto', color: 'var(--yj-text-2)'
            }}
            >
              {JSON.stringify(detail, null, 2)}
            </pre>
          </>
        )}
      </Drawer>
    </PageContainer>
  );
}
