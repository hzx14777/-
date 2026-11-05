/**
 * 准入资格：证书卡片（§11.2.3 考试通过状态可被实训工坊使用）
 * 仅展示考试平台职责内的准入结果；学习积分等论坛平台指标不在本平台展示（§3）。
 *
 * 版式：顶部资格概览 → 证书卡片（印章 + 分数环 + 能力范围）→ 资格明细表。
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Tag, Typography } from 'antd';
import { SafetyCertificateFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { endpoints } from '../api';
import { formatDate, formatDateTime, formatScore } from '../utils/format';
import { PageContainer, PageLoading, Section, DataTable, StatCard, StatusTag } from '../components';

const DAY = 24 * 60 * 60 * 1000;

export default function Admission() {
  const [d, setD] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const nav = useNavigate();

  const load = (p = page, ps = pageSize) => endpoints.admissions(p, ps).then(setD).catch(() => {});

  useEffect(() => {
    load(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(() => d?.items || [], [d]);

  const brief = useMemo(() => {
    const active = cards.filter((a: any) => !a.expired && a.status !== 'revoked');
    const scopes = new Set<string>();
    active.forEach((a: any) => (a.abilityScope || []).forEach((s: string) => scopes.add(s)));
    const soon = active.filter((a: any) => {
      const t = new Date(a.expireAt).getTime();
      return t > Date.now() && t - Date.now() <= 90 * DAY;
    }).length;
    return { active: active.length, scopes: scopes.size, soon };
  }, [cards]);

  if (!d) return <PageLoading tip="正在加载准入资格…" minHeight={320} />;

  return (
    <PageContainer
      title="项目准入资格"
      description="双达标通过后自动发放，重考提分将自动续期升级；实训工坊通过统一接口核验该资格（§11.2.3）。"
    >
      <div className="yj-adm-hero">
        <div className="m">
          <div className="eb">ADMISSION CERTIFICATE</div>
          <h2>已获得 {brief.active} 项项目准入资格</h2>
          <div style={{ fontSize: 11.5, color: '#a8c2e6', marginTop: 6, lineHeight: 1.7 }}>
            资格随成绩自动续期；到期前 90 天会在此提示，逾期需重新参加对应考试。
          </div>
        </div>
        <div className="st">
          <div>生效资格<b>{brief.active}<i>项</i></b></div>
          <div>覆盖能力<b>{brief.scopes}<i>项</i></b></div>
          <div>90 天内到期<b>{brief.soon}<i>项</i></b></div>
        </div>
      </div>

      <div className="yj-kpi-row">
        <StatCard label="资格总数" value={cards.length} suffix="项" note="含已过期与被撤销记录" />
        <StatCard label="生效中" value={brief.active} suffix="项" color="#0F9D76" note="可被实训工坊核验使用" />
        <StatCard label="覆盖能力" value={brief.scopes} suffix="项" color="#1657D6" note="按生效资格的能力范围去重统计" />
        <StatCard label="90 天内到期" value={brief.soon} suffix="项" color="#C2761B" note="到期前建议安排重考续期" />
      </div>

      {cards.length === 0 ? (
        <div className="yj-panel" style={{ padding: '46px 20px' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ fontSize: 12.5, color: 'var(--yj-muted)' }}>还没有获得准入资格，完成对应考试的双达标判定后自动发放</span>}
          />
        </div>
      ) : (
        <div className="yj-cert-grid" style={{ marginBottom: 16 }}>
          {cards.map((a: any) => {
            const dead = a.expired || a.status === 'revoked';
            const gold = a.level === 'excellent' && !dead;
            const days = Math.ceil((new Date(a.expireAt).getTime() - Date.now()) / DAY);
            return (
              <article key={a.id} className={`yj-cert${dead ? ' expired' : ''}`}>
                <div className="yj-cert-top">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <StatusTag kind="admissionStatus" value={a.expired ? 'expired' : a.status} />
                      <span className={`yj-badge ${gold ? 'gold' : 'ok'}`}>{gold ? '优秀' : '合格'}</span>
                      <span className="yj-hint">{a.examType === 'admission_exam' ? '项目准入卷' : a.examType === 'skill_exam' ? '专项技能卷' : '随堂测'}</span>
                    </div>
                    <h3 style={{ marginTop: 7 }}>{a.examTitle}</h3>
                  </div>
                  <div className="yj-cert-seal">
                    <SafetyCertificateFilled />
                  </div>
                </div>

                <div className="yj-cert-scope">
                  {(a.abilityScope || []).length ? (
                    (a.abilityScope || []).map((s: string) => (
                      <Tag key={s} style={{ marginInlineEnd: 0, fontSize: 10.5, lineHeight: '18px', padding: '0 7px' }}>{s}</Tag>
                    ))
                  ) : (
                    <span className="yj-hint">能力范围以考试成绩单为准</span>
                  )}
                </div>

                <div className="yj-cert-kv">
                  <div>成绩<b style={{ color: gold ? '#94690F' : '#0B7A5C' }}>{formatScore(a.score)} 分</b></div>
                  <div>发放日期<b>{formatDate(a.issuedAt)}</b></div>
                  <div>有效期至<b>{formatDate(a.expireAt)}</b></div>
                </div>

                <div className="yj-cert-foot">
                  <span className="yj-hint">
                    {a.expired ? '已过期，需重新参加考试' : days >= 0 ? `距到期还有 ${days} 天` : '有效期异常'}
                  </span>
                  <span className="sp" />
                  {a.attemptId && (
                    <Button size="small" type="link" onClick={() => nav(`/result/${a.attemptId}`)}>
                      查看成绩单 →
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
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
            { title: '考试', dataIndex: 'examTitle', ellipsis: true },
            {
              title: '等级', dataIndex: 'level', width: 84,
              render: (v: string) => (v === 'excellent' ? <span className="yj-badge gold">优秀</span> : <span className="yj-badge ok">合格</span>)
            },
            { title: '成绩', dataIndex: 'score', width: 78, render: (v: number) => <span className="num">{formatScore(v)}</span> },
            { title: '状态', dataIndex: 'status', width: 100, render: (s: string) => <StatusTag kind="admissionStatus" value={s} /> },
            { title: '发放时间', dataIndex: 'issuedAt', width: 146, render: (v: string) => <span style={{ fontSize: 12.5 }}>{formatDateTime(v)}</span> },
            { title: '有效期至', dataIndex: 'expireAt', width: 146, render: (v: string) => <span style={{ fontSize: 12.5 }}>{formatDateTime(v)}</span> }
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ fontSize: 11.5, margin: '8px 2px 0' }}>
          资格由考试成绩自动判定：总分达及格线且各知识点组均达标（双达标）才会发放，缺一不发。
        </Typography.Paragraph>
      </Section>
    </PageContainer>
  );
}
