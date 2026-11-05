/**
 * 错题本：按出错次数排序，可标记已掌握
 * 题型标签与作答格式化统一取自字典与 utils/format，不再各页重复定义。
 */
import { useEffect, useState } from 'react';
import { Button, Collapse, Flex, Select, Tag, Typography } from 'antd';
import { endpoints } from '../api';
import { formatAnswer } from '../utils/format';
import { PageContainer, PageLoading, PageEmpty, StatusTag } from '../components';

export default function WrongBook() {
  const [d, setD] = useState<any>(null);
  const [kp, setKp] = useState<string | undefined>();

  const load = () => endpoints.wrongBook().then(setD).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  if (!d) return <PageLoading tip="正在加载错题本…" minHeight={320} />;

  const list = (d.list || []).filter((x: any) => !kp || (x.kp || []).includes(kp));

  const toggle = async (qid: string, mastered: boolean) => {
    await endpoints.masterWrong(qid, mastered);
    load();
  };

  return (
    <PageContainer title="错题本" description="按出错次数排序；标记已掌握后不再置顶，但仍保留记录供复习。">
      <Flex align="center" gap={8} style={{ marginBottom: 14 }}>
        <Typography.Text type="secondary">按知识点筛选：</Typography.Text>
        <Select
          allowClear
          placeholder="全部知识点"
          style={{ width: 240 }}
          value={kp}
          onChange={setKp}
          options={(d.kpStat || []).map((k: any) => ({ value: k.id, label: `${k.name}（${k.n}）` }))}
        />
      </Flex>

      {list.length === 0 ? (
        <PageEmpty description="没有符合条件的错题，继续保持！" />
      ) : (
        <Collapse
          items={list.map((w: any) => ({
            key: w.qid,
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <StatusTag kind="questionType" value={w.type} />
                <Tag color="orange">错 {w.wrongCount} 次</Tag>
                {w.mastered && <Tag color="success">已掌握</Tag>}
                <span style={{ fontWeight: 600 }}>{w.stem}</span>
              </span>
            ),
            children: (
              <div style={{ fontSize: 13, lineHeight: 2 }}>
                <div><b>知识点：</b>{(w.kpNames || w.kp || []).join('、') || '-'}</div>
                <div><b>我的作答：</b>{formatAnswer(w.myAnswer, w.type) || '（未作答）'}</div>
                <div><b>正确答案：</b>{formatAnswer(w.answer, w.type)}</div>
                <div><b>解析：</b>{w.analysis}</div>
                <Button
                  size="small"
                  type={w.mastered ? 'default' : 'primary'}
                  style={{ marginTop: 8 }}
                  onClick={() => toggle(w.qid, !w.mastered)}
                >
                  {w.mastered ? '取消掌握标记' : '标记为已掌握'}
                </Button>
              </div>
            )
          }))}
        />
      )}
    </PageContainer>
  );
}
