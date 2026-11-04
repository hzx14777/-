/**
 * 考试详情：说明、题型分布、判定规则、历史记录（§5.1 统一展示规则）
 */
import { useEffect, useState } from 'react';
import { Button, Card, Descriptions, Spin, Table, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { endpoints } from '../api';

export default function ExamDetail() {
  const { examId } = useParams();
  const [d, setD] = useState<any>(null);
  const [starting, setStarting] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (examId) endpoints.exam(examId).then(setD).catch(() => {});
  }, [examId]);

  if (!d) return <div style={{ padding: 120, textAlign: 'center' }}><Spin size="large" /></div>;

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
  const typeLabel: Record<string, string> = { single: '单选', multiple: '多选', judge: '判断', blank: '填空', essay: '简答' };

  return (
    <div>
      <div className="yj-page-title">{d.title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        <div>
          <div className="yj-section">
            <h4>考试说明</h4>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="题型">{d.typeName}</Descriptions.Item>
              <Descriptions.Item label="课程">{d.courseName}</Descriptions.Item>
              <Descriptions.Item label="题量 / 总分">{d.questionCount} 题 / {d.totalScore} 分</Descriptions.Item>
              <Descriptions.Item label="及格线">{d.passLine} 分</Descriptions.Item>
              <Descriptions.Item label="开放时间">
                {String(d.startAt || '').replace('T', ' ').slice(0, 16)} ~ {String(d.endAt || '').replace('T', ' ').slice(0, 16)}
              </Descriptions.Item>
              <Descriptions.Item label="防作弊等级">{d.rules.cheatLevel}</Descriptions.Item>
            </Descriptions>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 10 }}>{d.paperDesc || d.remark}</Typography.Paragraph>
          </div>

          <div className="yj-section">
            <h4>判定规则（双达标）</h4>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 2, color: '#44506a', fontSize: 13 }}>
              <li>总分达到及格线 <b>{d.passLine} 分</b></li>
              {(d.groups || []).map((g: any) => (
                <li key={g.id}>知识点组「{g.name}」得分率 ≥ {Math.round(g.threshold * 100)}%（权重 {g.weight}%）</li>
              ))}
              <li>两项同时满足才算通过；仅总分过线时，未达标知识点组会给出补强建议</li>
              <li>答卷规则：{d.rules.allowBacktrack ? '可回查修改' : '禁止回查'} · 题序{d.rules.shuffleQuestion ? '随机' : '固定'} · {d.rules.answerPolicy === 'after_grading' ? '成绩生效后可见解析' : '交卷后可见解析'}</li>
            </ul>
          </div>

          <div className="yj-section">
            <h4>我的作答记录</h4>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={d.history || []}
              columns={[
                { title: '答卷', dataIndex: 'id' },
                { title: '状态', dataIndex: 'status', render: (s: string) => ({ answering: '答题中', submitted: '待阅卷', graded: '已生效' }[s] || s) },
                { title: '总分', dataIndex: 'totalScore' },
                { title: '判定', dataIndex: 'dualPass', render: (v: any) => (v === true ? <span className="yj-pass">通过</span> : v === false ? <span className="yj-fail">未通过</span> : '-') },
                { title: '提交时间', dataIndex: 'submittedAt' },
                { title: '', render: (_: any, r: any) => <a onClick={() => nav(`/result/${r.id}`)}>查看</a> }
              ]}
            />
          </div>
        </div>

        <div>
          <Card size="small" title="本场构成" style={{ marginBottom: 16 }}>
            {dist.map(([t, n]) => (
              <div key={t} className="yj-meta" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{typeLabel[t] || t}</span><b>{n as number} 题</b>
              </div>
            ))}
            {(d.groups || []).length > 0 && (
              <>
                <div style={{ borderTop: '1px dashed #e6ebf4', margin: '10px 0' }} />
                {d.groups.map((g: any) => (
                  <div key={g.id} className="yj-meta" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{g.name}</span><b>{g.weight}% · ≥{Math.round(g.threshold * 100)}%</b>
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
    </div>
  );
}
