/**
 * 错题本：按出错次数排序，可标记已掌握
 */
import { useEffect, useState } from 'react';
import { Button, Collapse, Select, Space, Spin, Tag, Typography } from 'antd';
import { endpoints } from '../api';

const TYPE_LABEL: Record<string, string> = { single: '单选', multiple: '多选', judge: '判断', blank: '填空', essay: '简答' };

export default function WrongBook() {
  const [d, setD] = useState<any>(null);
  const [kp, setKp] = useState<string | undefined>();

  const load = () => endpoints.wrongBook().then(setD).catch(() => {});
  useEffect(() => { load(); }, []);

  if (!d) return <div style={{ padding: 120, textAlign: 'center' }}><Spin size="large" /></div>;

  const list = (d.list || []).filter((x: any) => !kp || (x.kp || []).includes(kp));

  const toggle = async (qid: string, mastered: boolean) => {
    await endpoints.masterWrong(qid, mastered);
    load();
  };

  return (
    <div>
      <div className="yj-page-title">错题本</div>
      <Space style={{ marginBottom: 14 }}>
        <Typography.Text type="secondary">按知识点筛选：</Typography.Text>
        <Select
          allowClear
          placeholder="全部知识点"
          style={{ width: 240 }}
          value={kp}
          onChange={setKp}
          options={(d.kpStat || []).map((k: any) => ({ value: k.id, label: `${k.name}（${k.n}）` }))}
        />
      </Space>
      {list.length === 0 && <Typography.Text type="secondary">没有符合条件的错题，继续保持！</Typography.Text>}
      <Collapse
        items={list.map((w: any) => ({
          key: w.qid,
          label: (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Tag>{TYPE_LABEL[w.type]}</Tag>
              <Tag color="orange">错 {w.wrongCount} 次</Tag>
              {w.mastered && <Tag color="success">已掌握</Tag>}
              <span style={{ fontWeight: 600 }}>{w.stem}</span>
            </span>
          ),
          children: (
            <div style={{ fontSize: 13, lineHeight: 2 }}>
              <div><b>知识点：</b>{(w.kpNames || w.kp || []).join('、') || '-'}</div>
              <div><b>我的作答：</b>{fmt(w.myAnswer) || '（未作答）'}</div>
              <div><b>正确答案：</b>{fmt(w.answer)}</div>
              <div><b>解析：</b>{w.analysis}</div>
              <Button size="small" type={w.mastered ? 'default' : 'primary'} style={{ marginTop: 8 }} onClick={() => toggle(w.qid, !w.mastered)}>
                {w.mastered ? '取消掌握标记' : '标记为已掌握'}
              </Button>
            </div>
          )
        }))}
      />
    </div>
  );
}

function fmt(v: any): string {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map((x) => (Array.isArray(x) ? x.join(' / ') : x)).filter(Boolean).join(' ｜ ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
