/**
 * 审计与事件：审计日志 + 业务事件（含出站投递状态，§11.4 失败可人工重放）
 */
import { useState } from 'react';
import { Table, Tabs, Tag, Typography } from 'antd';
import { endpoints } from '../api';

const EVENT_COLOR: Record<string, string> = {
  'exam.passed': 'success',
  'exam.failed': 'error',
  'exam.submitted': 'processing',
  'course.completed': 'warning'
};

export default function Audit() {
  const [audit, setAudit] = useState<any>(null);
  const [events, setEvents] = useState<any>(null);

  const load = () => {
    endpoints.audit().then(setAudit).catch(() => {});
    endpoints.events().then(setEvents).catch(() => {});
  };
  useState(() => { load(); });

  return (
    <div>
      <div className="yj-page-title">审计与事件</div>
      <Tabs
        items={[
          {
            key: 'audit',
            label: '审计日志',
            children: (
              <Table
                size="small" rowKey="id"
                pagination={audit ? { total: audit.total, pageSize: audit.pageSize, current: audit.page } : false}
                dataSource={audit?.items || []}
                columns={[
                  { title: '时间', dataIndex: 'at', width: 180 },
                  { title: '操作人', dataIndex: 'actor', width: 110 },
                  { title: '角色', dataIndex: 'role', width: 90 },
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
              <>
                <Typography.Paragraph type="secondary" style={{ fontSize: 12.5 }}>
                  出站：exam.passed / exam.failed 按 §11.3 统一信封投递给事件总线；未配置总线时状态为 skipped，可在下方重试。
                  入站：course.completed（自学平台）已幂等消费，用于解锁章节考试。
                </Typography.Paragraph>
                <Table
                  size="small" rowKey="eventId"
                  pagination={events ? { total: events.total, pageSize: events.pageSize, current: events.page } : false}
                  dataSource={events?.items || []}
                  columns={[
                    { title: 'eventId', dataIndex: 'eventId', width: 170 },
                    {
                      title: '类型', dataIndex: 'eventType', width: 150,
                      render: (t: string) => <Tag color={EVENT_COLOR[t] || 'default'}>{t}</Tag>
                    },
                    { title: '发生时间', dataIndex: 'occurredAt', width: 180 },
                    { title: '来源平台', dataIndex: 'sourcePlatform', width: 100 },
                    { title: '操作者', dataIndex: 'operatorId', width: 110 },
                    {
                      title: '数据', dataIndex: 'data', ellipsis: true,
                      render: (v: any) => JSON.stringify(v)
                    }
                  ]}
                />
              </>
            )
          }
        ]}
      />
    </div>
  );
}
