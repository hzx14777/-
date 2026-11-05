/**
 * 考试大厅：统计卡 + 考试卡片（解锁规则来自服务端 unlockState，前端只做展示）
 * 统计维度仅保留考试平台职责内的指标（§3 职责边界，学习积分由论坛平台负责，此处不再展示）
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Flex, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { endpoints } from '../api';
import { listIn } from '../utils/motion';
import { formatDateTime, formatScore } from '../utils/format';
import { PageContainer, PageLoading, PageEmpty, StatCard, StatusTag } from '../components';

const NEW_WINDOW_MS = 7 * 24 * 3600 * 1000;

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

  if (!d) return <PageLoading tip="正在加载考试列表…" minHeight={320} />;

  const stats = [
    { label: '可进入的考试', value: d.stats.available },
    { label: '已有成绩', value: d.stats.done },
    { label: '有效准入资格', value: d.stats.admissions }
  ];

  /** 主操作按钮：按服务端下发的答题状态决定，避免出现「能点但进不去」 */
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
    <PageContainer title="考试大厅" description="随堂测试、专项考试与项目准入统一入口；通过双达标后自动发放项目准入资格。">
      <div className="yj-stat-row">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value ?? 0} />
        ))}
      </div>

      {d.exams.length === 0 ? (
        <PageEmpty description="暂无可参加的考试" />
      ) : (
        <div className="yj-card-grid" ref={gridRef}>
          {d.exams.map((e: any) => (
            <div key={e.id} className="yj-exam-card">
              <Flex justify="space-between" align="flex-start" gap={8}>
                <h3>{e.title}</h3>
                <Flex gap={4} style={{ flex: '0 0 auto' }}>
                  {e.source === 'doclib' && e.publishedAt && Date.now() - new Date(e.publishedAt).getTime() < NEW_WINDOW_MS && (
                    <Tag color="red">NEW</Tag>
                  )}
                  <StatusTag kind="examType" value={e.type} />
                </Flex>
              </Flex>
              <div className="yj-meta">
                课程：{e.courseName} · {e.questionCount} 题 / {formatScore(e.totalScore)} 分<br />
                时长 {e.duration} 分钟 · 及格线 {formatScore(e.passLine)} 分 · 取历次最高分<br />
                {e.publishedAt && <>发布：{formatDateTime(e.publishedAt)}{e.publishedByName ? ` · ${e.publishedByName}` : ''}<br /></>}
                {e.groups.length > 0 && <>知识点组：{e.groups.map((g: any) => g.name).join('、')}<br /></>}
                {e.bestScore !== null ? (
                  <span className={e.bestPassed ? 'yj-ok' : 'yj-lock'}>
                    历次最高 {formatScore(e.bestScore)} 分 · {e.bestPassed ? '已达标' : '未达标'}
                  </span>
                ) : (
                  <span>尚未作答</span>
                )}
              </div>
              {!e.unlocked && <div className="yj-lock" style={{ marginTop: 8 }}>🔒 {e.lockReason}</div>}
              <Flex align="center" style={{ marginTop: 14 }}>
                <span style={{ flex: 1 }} />
                {actions(e)}
              </Flex>
            </div>
          ))}
        </div>
      )}
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 14, marginBottom: 0 }}>
        考试通过状态将通过统一事件 exam.passed / exam.failed 提供给实训工坊做项目准入判断。
      </Typography.Paragraph>
    </PageContainer>
  );
}
