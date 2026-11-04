/**
 * 考试大厅：统计卡 + 考试卡片（解锁规则来自服务端 unlockState，前端只做展示）
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Empty, Spin, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { endpoints } from '../api';
import { listIn } from '../motion';

const TYPE_COLOR: Record<string, string> = { chapter_quiz: 'blue', skill_exam: 'geekblue', admission_exam: 'purple' };

export default function Hall() {
  const [d, setD] = useState<any>(null);
  const nav = useNavigate();
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endpoints.hall().then(setD).catch(() => {});
  }, []);

  useEffect(() => {
    if (d) listIn(gridRef.current, '.yj-exam-card');
  }, [d]);

  if (!d) return <div style={{ padding: 120, textAlign: 'center' }}><Spin size="large" /></div>;

  const cards = [
    { label: '可进入的考试', value: d.stats.available },
    { label: '已有成绩', value: d.stats.done },
    { label: '有效准入资格', value: d.stats.admissions },
    { label: '学习积分', value: d.stats.points }
  ];

  const actions = (e: any) => {
    if (e.ongoingAttemptId) return <Button type="primary" onClick={() => nav(`/answer/${e.ongoingAttemptId}`)}>继续答题</Button>;
    if (e.pendingAttemptId) return <Button onClick={() => nav(`/result/${e.pendingAttemptId}`)}>查看待确认成绩</Button>;
    if (e.bestAttemptId && e.bestScore !== null)
      return (
        <>
          <Button onClick={() => nav(`/result/${e.bestAttemptId}`)}>查看成绩</Button>
          {e.unlocked && <Button type="primary" style={{ marginLeft: 8 }} onClick={() => nav(`/exam/${e.id}`)}>重考提分</Button>}
        </>
      );
    if (e.unlocked) return <Button type="primary" onClick={() => nav(`/exam/${e.id}`)}>进入考试</Button>;
    return <Button disabled>未解锁</Button>;
  };

  return (
    <div>
      <div className="yj-page-title">考试大厅</div>
      <div className="yj-stat-row">
        {cards.map((c) => (
          <Card key={c.label} size="small"><Typography.Text type="secondary">{c.label}</Typography.Text><div style={{ fontSize: 26, fontWeight: 700, color: '#0e1c36' }}>{c.value ?? 0}</div></Card>
        ))}
      </div>
      {d.exams.length === 0 && <Empty description="暂无可参加的考试" />}
      <div className="yj-card-grid" ref={gridRef}>
        {d.exams.map((e: any) => (
          <div key={e.id} className="yj-exam-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <h3>{e.title}</h3>
              <div style={{ display: 'flex', gap: 4, flex: '0 0 auto' }}>
                {e.source === 'doclib' && e.publishedAt && Date.now() - new Date(e.publishedAt).getTime() < 7 * 24 * 3600 * 1000 && (
                  <Tag color="red">NEW</Tag>
                )}
                <Tag color={TYPE_COLOR[e.type] || 'default'}>{e.typeName}</Tag>
              </div>
            </div>
            <div className="yj-meta">
              课程：{e.courseName} · {e.questionCount} 题 / {e.totalScore} 分<br />
              时长 {e.duration} 分钟 · 及格线 {e.passLine} 分 · 取历次最高分<br />
              {e.publishedAt && <>发布：{String(e.publishedAt).replace('T', ' ').slice(0, 16)}{e.publishedByName ? ` · ${e.publishedByName}` : ''}<br /></>}
              {e.groups.length > 0 && <>知识点组：{e.groups.map((g: any) => g.name).join('、')}<br /></>}
              {e.bestScore !== null ? (
                <span className={e.bestPassed ? 'yj-ok' : 'yj-lock'}>历次最高 {e.bestScore} 分 · {e.bestPassed ? '已达标' : '未达标'}</span>
              ) : (
                <span>尚未作答</span>
              )}
            </div>
            {!e.unlocked && <div className="yj-lock" style={{ marginTop: 8 }}>🔒 {e.lockReason}</div>}
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1 }} />
              {actions(e)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
