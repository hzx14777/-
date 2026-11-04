/**
 * 考试管理：试卷库 + 考试上下架
 */
import { useEffect, useState } from 'react';
import { Button, Table, Tag, Typography, App as AntApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { endpoints } from '../api';

export default function Manage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const nav = useNavigate();
  const { message: msg } = AntApp.useApp();

  const load = () => {
    endpoints.papers().then((r: any) => setPapers(r.items || [])).catch(() => {});
    endpoints.exams().then((r: any) => setExams(r.items || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const toggle = async (e: any) => {
    await endpoints.setExamStatus(e.id, e.status === 'published' ? 'archived' : 'published');
    msg.success(e.status === 'published' ? '已下架' : '已发布');
    load();
  };

  return (
    <div>
      <div className="yj-page-title">考试管理</div>
      <div className="yj-section">
        <h4>试卷库</h4>
        <Table
          size="small" rowKey="id" pagination={false} dataSource={papers}
          columns={[
            { title: '试卷', dataIndex: 'title' },
            { title: '课程', dataIndex: 'courseName' },
            { title: '题量', dataIndex: 'questionCount', width: 70 },
            { title: '总分', dataIndex: 'totalScore', width: 70 },
            { title: '及格率', dataIndex: 'passRate', width: 90, render: (v: number) => `${Math.round(v * 100)}%` },
            { title: '状态', dataIndex: 'status', width: 90, render: (s: string) => <Tag color={s === 'published' ? 'success' : 'default'}>{s === 'published' ? 'published' : 'draft'}</Tag> },
            { title: '关联考试', dataIndex: 'examCount', width: 90 },
            {
              title: '知识点组', dataIndex: 'groups', ellipsis: true,
              render: (gs: any[]) => (gs || []).map((g) => g.name).join('、')
            }
          ]}
        />
      </div>
      <div className="yj-section">
        <h4>考试</h4>
        <Table
          size="small" rowKey="id" pagination={false} dataSource={exams}
          columns={[
            { title: '考试', dataIndex: 'title', ellipsis: true },
            { title: '类型', dataIndex: 'typeName', width: 110 },
            { title: '时长', dataIndex: 'duration', width: 80, render: (v: number) => `${v} 分钟` },
            { title: '状态', dataIndex: 'status', width: 100, render: (s: string) => <Tag color={s === 'published' ? 'success' : 'default'}>{s}</Tag> },
            { title: '更新时间', dataIndex: 'updatedAt', width: 180 },
            {
              title: '操作', width: 200,
              render: (_: any, e: any) => (
                <>
                  <Button size="small" onClick={() => nav(`/stats/${e.id}`)}>看板</Button>
                  <Button size="small" style={{ marginLeft: 8 }} onClick={() => toggle(e)}>
                    {e.status === 'published' ? '下架' : '发布'}
                  </Button>
                </>
              )
            }
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
          状态值遵循统一数据字典（published / archived），新增状态需先更新字典并经架构评审（§9.3/§15）。
        </Typography.Paragraph>
      </div>
    </div>
  );
}
