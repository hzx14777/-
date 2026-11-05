/**
 * 错题本：按出错次数排序，可标记已掌握
 * 版式：左侧知识点分布（点击筛选）+ 右侧错题卡片（默认折叠解析，展开看选项与解析）。
 * 题型标签与作答格式化统一取自字典与 utils/format，不再各页重复定义。
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Input, Select, Tag, Typography } from 'antd';
import {
  CheckCircleOutlined,
  DownOutlined,
  FireOutlined,
  SearchOutlined,
  TagsOutlined,
  UpOutlined
} from '@ant-design/icons';
import { endpoints } from '../api';
import { formatAnswer, formatDateTime } from '../utils/format';
import { PageContainer, PageLoading, StatCard, StatusTag } from '../components';

type Filter = 'all' | 'todo' | 'done';

export default function WrongBook() {
  const [d, setD] = useState<any>(null);
  const [kp, setKp] = useState<string | undefined>();
  const [kw, setKw] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<'count' | 'recent'>('count');
  const [open, setOpen] = useState<Set<string>>(new Set());

  const load = () => endpoints.wrongBook().then(setD).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const all = d?.list || [];
  const kpStat = d?.kpStat || [];

  const stats = useMemo(() => {
    const done = all.filter((x: any) => x.mastered).length;
    return {
      total: all.length,
      todo: all.length - done,
      done,
      hot: all.filter((x: any) => (x.wrongCount || 0) >= 2).length,
      kp: kpStat.length
    };
  }, [all, kpStat]);

  const list = useMemo(() => {
    const s = String(kw).trim().toLowerCase();
    const rows = all.filter((x: any) => {
      if (kp && !(x.kp || []).includes(kp)) return false;
      if (filter === 'todo' && x.mastered) return false;
      if (filter === 'done' && !x.mastered) return false;
      if (s) {
        const hay = `${x.stem} ${(x.kpNames || []).join(' ')} ${x.chapterName || ''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
    return rows.sort((a: any, b: any) =>
      sort === 'count' ? b.wrongCount - a.wrongCount : String(b.lastAt || '').localeCompare(String(a.lastAt || ''))
    );
  }, [all, kp, kw, filter, sort]);

  if (!d) return <PageLoading tip="正在加载错题本…" minHeight={320} />;

  const toggle = async (qid: string, mastered: boolean) => {
    await endpoints.masterWrong(qid, mastered);
    load();
  };

  const expand = (qid: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  };


  return (
    <PageContainer
      title="错题本"
      description="按出错次数排序；标记已掌握后不再计入待攻克，但记录保留供复习。所有条目来自已判分答卷，不含待阅卷的简答题。"
      extra={<span className="yj-badge">共 {stats.total} 道</span>}
    >
      <div className="yj-kpi-row">
        <StatCard label="错题总数" value={stats.total} suffix="道" note={`覆盖 ${stats.kp} 个知识点`} />
        <StatCard label="待攻克" value={stats.todo} suffix="道" color="#D4380D" note="标记掌握前持续置顶" />
        <StatCard label="已掌握" value={stats.done} suffix="道" color="#0F9D76" note={`掌握率 ${stats.total ? Math.round((stats.done / stats.total) * 100) : 0}%`} />
        <StatCard label="重复出错" value={stats.hot} suffix="道" color="#C2761B" note="同题错 2 次及以上，建议优先复盘" />
      </div>

      <div className="yj-wb-layout">
        {/* 左：知识点分布 */}
        <aside className="yj-panel yj-wb-side">
          <div className="yj-panel-head">
            <TagsOutlined style={{ color: '#93A3B8' }} />
            <b>知识点分布</b>
            <span className="yj-sub">{kpStat.length} 个</span>
          </div>
          <div className="yj-panel-pad" style={{ paddingTop: 8, paddingBottom: 10 }}>
            <div className={`yj-kp-row${!kp ? ' on' : ''}`} onClick={() => setKp(undefined)}>
              <span className="nm">全部知识点</span>
              <span className="bar"><i style={{ width: '100%' }} /></span>
              <span className="n num">{stats.total}</span>
            </div>
            {kpStat.map((k: any) => (
              <div
                key={k.id}
                className={`yj-kp-row${kp === k.id ? ' on' : ''}`}
                onClick={() => setKp(kp === k.id ? undefined : k.id)}
                title={k.name}
              >
                <span className="nm">{k.name}</span>
                <span className="bar"><i style={{ width: `${Math.max(8, Math.round((k.n / Math.max(1, stats.total)) * 100))}%` }} /></span>
                <span className="n num">{k.n}</span>
              </div>
            ))}
            <Typography.Paragraph type="secondary" style={{ fontSize: 10.5, lineHeight: 1.75, margin: '10px 0 0' }}>
              条长表示该知识点占全部错题的比例，越长越需要优先补课。
            </Typography.Paragraph>
          </div>
        </aside>

        {/* 右：错题列表 */}
        <div style={{ minWidth: 0 }}>
          <div className="yj-panel" style={{ marginBottom: 12 }}>
            <div className="yj-toolbar" style={{ padding: '10px 13px', marginBottom: 0 }}>
              <Input
                allowClear
                prefix={<SearchOutlined style={{ color: '#A3B0C2' }} />}
                placeholder="搜索题干 / 知识点"
                style={{ width: 220 }}
                value={kw}
                onChange={(e) => setKw(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                {([['all', '全部'], ['todo', '待攻克'], ['done', '已掌握']] as [Filter, string][]).map(([k, label]) => (
                  <button key={k} className={`yj-chip${filter === k ? ' on' : ''}`} onClick={() => setFilter(k)}>
                    {label}
                  </button>
                ))}
              </div>
              <span className="sp" />
              <Select
                size="small"
                style={{ width: 132 }}
                value={sort}
                onChange={setSort}
                options={[{ value: 'count', label: '按出错次数' }, { value: 'recent', label: '按最近出错' }]}
              />
            </div>
          </div>

          {list.length === 0 ? (
            <div className="yj-panel" style={{ padding: '40px 20px' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span style={{ fontSize: 12.5, color: 'var(--yj-muted)' }}>没有符合条件的错题，换个筛选条件看看</span>}
              />
            </div>
          ) : (
            list.map((w: any, i: number) => {
              const expanded = open.has(w.qid);
              return (
                <article key={w.qid} className={`yj-wrong-item${w.mastered ? ' mastered' : ''}`}>
                  <div className="yj-wrong-top">
                    <span className="yj-wrong-no num">{String(i + 1).padStart(2, '0')}</span>
                    <StatusTag kind="questionType" value={w.type} />
                    <span className={`yj-badge ${w.wrongCount >= 2 ? 'bad' : 'warn'}`}>
                      {w.wrongCount >= 2 && <FireOutlined />}错 {w.wrongCount} 次
                    </span>
                    <span className="yj-wrong-stem">{w.stem}</span>
                    {w.mastered && <span className="yj-badge ok">已掌握</span>}
                  </div>

                  <div className="yj-wrong-meta">
                    {w.chapterName && <span>{w.chapterName}</span>}
                    {(w.kpNames || []).map((n: string) => (
                      <Tag key={n} style={{ marginInlineEnd: 0, fontSize: 10.5, lineHeight: '18px', padding: '0 6px' }}>{n}</Tag>
                    ))}
                    <span>最近错于 {formatDateTime(w.lastAt)}</span>
                  </div>

                  <div className="yj-wrong-ans">
                    <span className="a mine">
                      我的作答 <b>{formatAnswer(w.myAnswer, w.type) || '未作答'}</b>
                    </span>
                    <span className="a right">
                      正确答案 <b>{formatAnswer(w.answer, w.type)}</b>
                    </span>
                  </div>

                  {expanded && (
                    <>
                      {(w.options || []).length > 0 && (
                        <div className="yj-wrong-exp">
                          {(w.options || []).map((o: any) => (
                            <div key={o.id}>
                              <b>{o.id}.</b> {o.content}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="yj-wrong-exp">
                        <b style={{ color: '#415066' }}>解析：</b>
                        {w.analysis || '该题暂未录入解析，可联系任课教师补充。'}
                      </div>
                    </>
                  )}

                  <div className="yj-wrong-foot">
                    <Button size="small" type="link" style={{ paddingLeft: 0 }} onClick={() => expand(w.qid)}>
                      {expanded ? <>收起解析 <UpOutlined /></> : <>展开解析 <DownOutlined /></>}
                    </Button>
                    <span className="sp" />
                    <Button
                      size="small"
                      type={w.mastered ? 'default' : 'primary'}
                      ghost={!w.mastered}
                      icon={<CheckCircleOutlined />}
                      onClick={() => toggle(w.qid, !w.mastered)}
                    >
                      {w.mastered ? '取消掌握标记' : '标记为已掌握'}
                    </Button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </PageContainer>
  );
}
