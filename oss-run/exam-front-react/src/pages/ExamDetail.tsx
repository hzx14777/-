/**
 * 考试详情：说明、题型分布、判定规则、历史记录
 * 时间、分数、状态统一走 utils/format 与 StatusTag（§5.1 统一展示规则）
 */
import { useEffect, useState } from 'react';
import { Button, Card, Descriptions, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { endpoints } from '../api';
import { formatDateTime, formatDateTimeRange, formatPercent, formatScore } from '../utils/format';
import { dict } from '../constants/dictionary';
import { PageContainer, PageLoading, Section, DataTable, StatusTag } from '../components';

export default function ExamDetail() {
  const { examId } = useParams();
  const [d, setD] = useState<any>(null);
  const [starting, setStarting] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (examId) endpoints.exam(examId).then(setD).catch(() => {});
  }, [examId]);

  if (!d) return <PageLoading tip="正在加载考试详情…" minHeight={320} />;

  const start = async () => {
    setStarting(true);
    try {
      const r = await endpoints.startAttempt(examId!);
      nav(`/answer/${r.attemptId}`);
    } finally {
      setStarting(false);
    }
  };

  const dist = Object.entries(d.typeDist || {});

  return (
    <PageContainer title={d.title} description={d.paperDesc || d.remark}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        <div>
          <Section title="考试说明">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="题型">{dict('examType', d.type).label}</Descriptions.Item>
              <Descriptions.Item label="课程">{d.courseName}</Descriptions.Item>
              <Descriptions.Item label="题量 / 总分">
                {d.questionCount} 题 / {formatScore(d.totalScore)} 分
              </Descriptions.Item>
              <Descriptions.Item label="及格线">{formatScore(d.passLine)} 分</Descriptions.Item>
              <Descriptions.Item label="开放时间" span={2}>
                {formatDateTimeRange(d.startAt, d.endAt)}
              </Descriptions.Item>
              <Descriptions.Item label="防作弊等级">{d.rules.cheatLevel}</Descriptions.Item>
            </Descriptions>
          </Section>

          <Section title="判定规则（双达标）">
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 2, color: '#44506a', fontSize: 13 }}>
              <li>总分达到及格线 <b>{formatScore(d.passLine)} 分</b></li>
              {(d.groups || []).map((g: any) => (
                <li key={g.id}>
                  知识点组「{g.name}」得分率 ≥ {formatPercent(g.threshold)}（权重 {g.weight}%）
                </li>
              ))}
              <li>两项同时满足才算通过；仅总分过线时，未达标知识点组会给出补强建议</li>
              <li>
                答卷规则：{d.rules.allowBacktrack ? '可回查修改' : '禁止回查'} · 题序{d.rules.shuffleQuestion ? '随机' : '固定'} ·{' '}
                {d.rules.answerPolicy === 'after_grading' ? '成绩生效后可见解析' : '交卷后可见解析'}
              </li>
            </ul>
          </Section>

          <Section title="我的作答记录">
            <DataTable
              rowKey="id"
              pagination={false}
              emptyText="还没有作答记录"
              dataSource={d.history || []}
              columns={[
                { title: '答卷', dataIndex: 'id' },
                { title: '状态', dataIndex: 'status', width: 100, render: (s: string) => <StatusTag kind="recordStatus" value={s} /> },
                { title: '总分', dataIndex: 'totalScore', width: 80, render: (v: number) => formatScore(v) },
                {
                  title: '判定',
                  dataIndex: 'dualPass',
                  width: 90,
                  render: (v: unknown) =>
                    v === true ? <span className="yj-pass">通过</span> : v === false ? <span className="yj-fail">未通过</span> : '-'
                },
                { title: '提交时间', dataIndex: 'submittedAt', width: 150, render: (v: string) => formatDateTime(v) },
                {
                  title: '操作',
                  width: 80,
                  render: (_: unknown, r: any) => <a onClick={() => nav(`/result/${r.id}`)}>查看</a>
                }
              ]}
            />
          </Section>
        </div>

        <div>
          <Card size="small" title="本场构成" style={{ marginBottom: 16 }}>
            {dist.map(([t, n]) => (
              <div key={t} className="yj-meta" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{dict('questionType', t).label}</span>
                <b>{n as number} 题</b>
              </div>
            ))}
            {(d.groups || []).length > 0 && (
              <>
                <div style={{ borderTop: '1px dashed #e6ebf4', margin: '10px 0' }} />
                {d.groups.map((g: any) => (
                  <div key={g.id} className="yj-meta" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{g.name}</span>
                    <b>
                      {g.weight}% · ≥{formatPercent(g.threshold)}
                    </b>
                  </div>
                ))}
              </>
            )}
          </Card>
          <Button type="primary" size="large" block loading={starting} disabled={!d.unlocked} onClick={start}>
            {d.unlocked ? (d.bestAttemptId ? '重新开始（取最高分）' : '开始考试') : d.lockReason}
          </Button>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 10 }}>
            进入答题后系统将记录切屏、退出全屏、复制粘贴等行为事件（仅留痕，供教师复核）。
          </Typography.Paragraph>
        </div>
      </div>
    </PageContainer>
  );
}
