/**
 * 准入资格：证书卡片（§11.2.3 考试通过状态可被实训工坊使用）
 * 仅展示考试平台职责内的准入结果；学习积分等论坛平台指标不在本平台展示（§3）。
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, Flex, Typography } from 'antd';
import { endpoints } from '../api';
import { formatDateTime, formatScore } from '../utils/format';
import { PageContainer, PageLoading, PageEmpty, Section, DataTable, StatusTag } from '../components';

export default function Admission() {
  const [d, setD] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = (p = page, ps = pageSize) => endpoints.admissions(p, ps).then(setD).catch(() => {});

  useEffect(() => {
    load(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(() => d?.items || [], [d]);

  if (!d) return <PageLoading tip="正在加载准入资格…" minHeight={320} />;

  return (
    <PageContainer
      title="项目准入资格"
      description="双达标通过后自动发放，重考提分将自动续期升级；实训工坊通过统一接口核验该资格（§11.2.3）。"
    >
      {cards.length === 0 ? (
        <PageEmpty description="还没有获得准入资格，完成对应考试的双达标判定后自动发放" />
      ) : (
        <div className="yj-card-grid" style={{ marginBottom: 20 }}>
          {cards.map((a: any) => (
            <Card
              key={a.id}
              style={{
                borderRadius: 12,
                borderColor: a.expired ? '#e6ebf4' : '#1e5eff55',
                background: a.expired ? '#fafbfe' : 'linear-gradient(160deg,#ffffff, #f3f7ff)'
              }}
            >
              <Flex justify="space-between" align="center">
                <StatusTag kind="admissionStatus" value={a.expired ? 'expired' : a.status} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {a.examType ? (a.examType === 'admission_exam' ? '项目准入卷' : a.examType === 'skill_exam' ? '专项技能卷' : '随堂测') : '-'}
                </Typography.Text>
              </Flex>
              <Typography.Title level={4} style={{ margin: '10px 0 4px' }}>{a.examTitle}</Typography.Title>
              <div className="yj-meta">
                等级：
                <b style={{ color: a.level === 'excellent' ? '#c2761b' : '#0f9d76' }}>
                  {a.level === 'excellent' ? '优秀' : '合格'}
                </b>{' '}
                · 成绩 {formatScore(a.score)} 分<br />
                能力范围：{(a.abilityScope || []).join('、') || '-'}<br />
                发放 {formatDateTime(a.issuedAt)} · 有效期至 {formatDateTime(a.expireAt)}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Section title="资格明细">
        <DataTable
          rowKey="id"
          page={d.page}
          pageSize={d.pageSize}
          total={d.total}
          onPageChange={(p, ps) => {
            setPage(p);
            setPageSize(ps);
            load(p, ps);
          }}
          emptyText="暂无准入资格记录"
          dataSource={d.items || []}
          columns={[
            { title: '考试', dataIndex: 'examTitle' },
            { title: '状态', dataIndex: 'status', width: 110, render: (s: string) => <StatusTag kind="admissionStatus" value={s} /> },
            { title: '成绩', dataIndex: 'score', width: 90, render: (v: number) => formatScore(v) },
            { title: '有效期至', dataIndex: 'expireAt', width: 160, render: (v: string) => formatDateTime(v) }
          ]}
        />
      </Section>
    </PageContainer>
  );
}
