/**
 * 审计与事件：审计日志 + 业务事件（含出站投递状态，§11.4 失败可人工重放）
 * 事件名称、角色展示统一走字典（§11.3 / §8.1）
 */
import { useEffect, useState } from 'react';
import { Tabs, Typography } from 'antd';
import { endpoints } from '../api';
import { formatDateTime } from '../utils/format';
import { PageContainer, Section, DataTable, StatusTag } from '../components';

export default function Audit() {
  const [audit, setAudit] = useState<any>(null);
  const [events, setEvents] = useState<any>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    endpoints.audit(auditPage, pageSize).then(setAudit).catch(() => {});
  }, [auditPage]);

  useEffect(() => {
    endpoints.events(eventPage, pageSize).then(setEvents).catch(() => {});
  }, [eventPage]);

  return (
    <PageContainer title="审计与事件" description="认证与权限变更、发布与阅卷等关键动作全部留痕；跨平台事件按 §11.3 统一信封投递。">
      <Tabs
        items={[
          {
            key: 'audit',
            label: '审计日志',
            children: (
              <DataTable
                rowKey="id"
                page={audit?.page ?? auditPage}
                pageSize={audit?.pageSize ?? pageSize}
                total={audit?.total}
                onPageChange={(p) => setAuditPage(p)}
                emptyText="暂无审计记录"
                dataSource={audit?.items || []}
                columns={[
                  { title: '时间', dataIndex: 'at', width: 160, render: (v: string) => formatDateTime(v) },
                  { title: '操作人', dataIndex: 'actor', width: 110 },
                  { title: '角色', dataIndex: 'role', width: 90, render: (r: string) => <StatusTag kind="role" value={r} /> },
                  { title: '动作', dataIndex: 'action', width: 130 },
                  { title: '对象', dataIndex: 'target', width: 150 },
                  { title: '说明', dataIndex: 'detail', ellipsis: true }
                ]}
              />
            )
          },
          {
            key: 'events',
            label: '跨平台事件',
            children: (
              <Section>
                <Typography.Paragraph type="secondary" style={{ fontSize: 12.5 }}>
                  出站：exam.passed / exam.failed 按 §11.3 统一信封投递给事件总线；未配置总线时状态为 skipped，可人工重放。
                  入站：course.completed（自学平台）已幂等消费，用于解锁章节考试。
                </Typography.Paragraph>
                <DataTable
                  rowKey="eventId"
                  page={events?.page ?? eventPage}
                  pageSize={events?.pageSize ?? pageSize}
                  total={events?.total}
                  onPageChange={(p) => setEventPage(p)}
                  emptyText="暂无跨平台事件"
                  dataSource={events?.items || []}
                  columns={[
                    { title: 'eventId', dataIndex: 'eventId', width: 170 },
                    { title: '类型', dataIndex: 'eventType', width: 150, render: (t: string) => <StatusTag kind="eventType" value={t} /> },
                    { title: '发生时间', dataIndex: 'occurredAt', width: 160, render: (v: string) => formatDateTime(v) },
                    { title: '来源平台', dataIndex: 'sourcePlatform', width: 100 },
                    { title: '操作者', dataIndex: 'operatorId', width: 110 },
                    { title: '数据', dataIndex: 'data', ellipsis: true, render: (v: unknown) => JSON.stringify(v) }
                  ]}
                />
              </Section>
            )
          }
        ]}
      />
    </PageContainer>
  );
}
