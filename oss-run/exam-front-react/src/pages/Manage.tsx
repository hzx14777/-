/**
 * 考试管理：试卷库 + 考试上下架
 * 状态一律经统一字典展示（§9.3 不得把英文状态直接输出到界面）。
 */
import { useEffect, useState } from 'react';
import { Button, Space, Typography, App as AntApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { endpoints } from '../api';
import { formatDateTime, formatPercent, formatDuration } from '../utils/format';
import { PageContainer, Section, DataTable, StatusTag } from '../components';

export default function Manage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
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

  return (
    <PageContainer title="考试管理" description="试卷库与考试上下架。状态取值统一走数据字典映射为中文展示，新增状态需先更新数据字典并完成评审（§9.3/§15）。">
      <Section title="试卷库">
        <DataTable
          rowKey="id"
          pagination={false}
          emptyText="暂无试卷，可先在文档库组卷"
          dataSource={papers}
          columns={[
            { title: '试卷', dataIndex: 'title' },
            { title: '课程', dataIndex: 'courseName', width: 160 },
            { title: '题量', dataIndex: 'questionCount', width: 70 },
            { title: '总分', dataIndex: 'totalScore', width: 70 },
            { title: '及格率', dataIndex: 'passRate', width: 90, render: (v: number) => formatPercent(v) },
            { title: '状态', dataIndex: 'status', width: 100, render: (s: string) => <StatusTag kind="examStatus" value={s} /> },
            { title: '关联考试', dataIndex: 'examCount', width: 90 },
            {
              title: '知识点组',
              dataIndex: 'groups',
              ellipsis: true,
              render: (gs: any[]) => (gs || []).map((g) => g.name).join('、') || '-'
            }
          ]}
        />
      </Section>

      <Section title="考试">
        <DataTable
          rowKey="id"
          pagination={false}
          emptyText="暂无考试，可在考试发布中发布"
          dataSource={exams}
          columns={[
            { title: '考试', dataIndex: 'title', ellipsis: true },
            { title: '类型', dataIndex: 'type', width: 110, render: (t: string) => <StatusTag kind="examType" value={t} /> },
            { title: '时长', dataIndex: 'duration', width: 90, render: (v: number) => formatDuration(v) },
            { title: '状态', dataIndex: 'status', width: 100, render: (s: string) => <StatusTag kind="examStatus" value={s} /> },
            { title: '更新时间', dataIndex: 'updatedAt', width: 160, render: (v: string) => formatDateTime(v) },
            {
              title: '操作',
              width: 180,
              render: (_: unknown, e: any) => (
                <Space size={8}>
                  <Button size="small" onClick={() => nav(`/stats/${e.id}`)}>看板</Button>
                  <Button size="small" danger={e.status === 'published'} onClick={() => toggle(e)}>
                    {e.status === 'published' ? '下架' : '发布'}
                  </Button>
                </Space>
              )
            }
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
          考试被下架后状态置为 archived（已归档），学生端不再展示，但历史成绩与审计记录保留。
        </Typography.Paragraph>
      </Section>
    </PageContainer>
  );
}
