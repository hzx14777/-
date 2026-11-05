/**
 * 在线考试发布：文档审核（通过 / 驳回）→ 发布考试（生成试卷与考试）→ 发布管理（上下架 / 删除）
 * 权限：教师与管理员均可审核、发布；教师只能上下架自己发布的考试，管理员可管理全部并删除。
 */
import { useEffect, useState } from 'react';
import {
  Alert, App as AntApp, Button, DatePicker, Drawer, Input, InputNumber, Modal,
  Popconfirm, Select, Space, Steps, Switch, Tabs, Tag, Tooltip, Typography
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, RocketOutlined,
  SendOutlined, StopOutlined, DeleteOutlined, BarChartOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { endpoints } from '../api';
import { useSession } from '../contexts/session';
import { PAPER_CSS, paperBody } from '../utils/paper';
import { formatDateTime, formatDateTimeRange, formatDuration, formatScore } from '../utils/format';
import { dictOptions } from '../constants/dictionary';
import { PageContainer, Section, DataTable, StatCard, StatusTag } from '../components';

export default function Publish() {
  const { hasPerm } = useSession();
  const isAdmin = hasPerm('bank:manage');
  const nav = useNavigate();
  const { message: msg } = AntApp.useApp();

  const [tab, setTab] = useState('review');

  /* ---------- 文档审核 ---------- */
  const [docs, setDocs] = useState<any[]>([]);
  const [docTotal, setDocTotal] = useState(0);
  const [docPage, setDocPage] = useState(1);
  const [docPageSize, setDocPageSize] = useState(10);
  const [docLoading, setDocLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<string | undefined>();
  const [docKw, setDocKw] = useState('');
  const [docApplied, setDocApplied] = useState('');
  const [docStats, setDocStats] = useState<any>({});

  const loadDocs = () => {
    setDocLoading(true);
    const qs = new URLSearchParams({ page: String(docPage), pageSize: String(docPageSize) });
    if (reviewFilter) qs.set('reviewStatus', reviewFilter);
    if (docApplied.trim()) qs.set('kw', docApplied.trim());
    endpoints.publishDocuments(qs.toString())
      .then((r: any) => { setDocs(r.items || []); setDocTotal(r.total || 0); setDocStats(r.stats || {}); })
      .catch(() => {})
      .finally(() => setDocLoading(false));
  };
  useEffect(loadDocs, [docPage, docPageSize, reviewFilter, docApplied]);

  /* ---------- 已发布考试 ---------- */
  const [exams, setExams] = useState<any[]>([]);
  const [examTotal, setExamTotal] = useState(0);
  const [examPage, setExamPage] = useState(1);
  const [examPageSize, setExamPageSize] = useState(10);
  const [examLoading, setExamLoading] = useState(false);
  const [examStatus, setExamStatus] = useState<string | undefined>();
  const [examKw, setExamKw] = useState('');
  const [examApplied, setExamApplied] = useState('');
  const [examStats, setExamStats] = useState<any>({});

  const loadExams = () => {
    setExamLoading(true);
    const qs = new URLSearchParams({ page: String(examPage), pageSize: String(examPageSize) });
    if (examStatus) qs.set('status', examStatus);
    if (examApplied.trim()) qs.set('kw', examApplied.trim());
    endpoints.publishExams(qs.toString())
      .then((r: any) => { setExams(r.items || []); setExamTotal(r.total || 0); setExamStats(r.stats || {}); })
      .catch(() => {})
      .finally(() => setExamLoading(false));
  };
  useEffect(loadExams, [examPage, examPageSize, examStatus, examApplied]);

  /* ---------- 文档预览 ---------- */
  const [preview, setPreview] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const openPreview = async (d: any) => {
    try {
      const full: any = await endpoints.document(d.id);
      setPreview(full);
      setPreviewOpen(true);
    } catch { /* 已提示 */ }
  };

  /* ---------- 审核 ---------- */
  const [review, setReview] = useState<{ doc: any; action: 'approve' | 'reject' } | null>(null);
  const [note, setNote] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const submitReview = async () => {
    if (!review) return;
    if (review.action === 'reject' && !note.trim()) { msg.warning('驳回时请填写原因'); return; }
    setReviewing(true);
    try {
      await endpoints.reviewPublishDoc(review.doc.id, { action: review.action, note });
      msg.success(review.action === 'approve' ? '审核通过，可发布考试' : '已驳回，组卷人可修改后重新提交');
      setReview(null); setNote('');
      loadDocs();
    } finally { setReviewing(false); }
  };

  /* ---------- 发布 ---------- */
  const [pub, setPub] = useState<any>(null);
  const [pubForm, setPubForm] = useState<any>({});
  const [publishing, setPublishing] = useState(false);
  const openPublish = (d: any) => {
    setPub(d);
    setPubForm({
      title: d.title,
      type: 'skill_exam',
      duration: d.duration || 60,
      passRate: 60,
      startAt: dayjs(),
      endAt: dayjs().add(90, 'day').endOf('day'),
      allowBacktrack: true,
      shuffleQuestion: false,
      shuffleOption: true,
      answerPolicy: 'after_grading',
      remark: ''
    });
  };
  const doPublish = async () => {
    if (!pub) return;
    if (!String(pubForm.title || '').trim()) { msg.warning('请填写考试名称'); return; }
    setPublishing(true);
    try {
      const r: any = await endpoints.publishExam(pub.id, {
        title: pubForm.title.trim(),
        type: pubForm.type,
        duration: pubForm.duration,
        passRate: pubForm.passRate,
        startAt: pubForm.startAt ? pubForm.startAt.toISOString() : undefined,
        endAt: pubForm.endAt ? pubForm.endAt.toISOString() : undefined,
        allowBacktrack: pubForm.allowBacktrack,
        shuffleQuestion: pubForm.shuffleQuestion,
        shuffleOption: pubForm.shuffleOption,
        answerPolicy: pubForm.answerPolicy,
        remark: pubForm.remark
      });
      msg.success(`「${r.title}」已发布，学生端考试大厅即时可见`);
      setPub(null);
      loadDocs(); loadExams();
      setTab('exams');
    } finally { setPublishing(false); }
  };

  const toggleExam = async (e: any) => {
    try {
      await endpoints.setExamStatus(e.id, e.status === 'published' ? 'archived' : 'published');
      msg.success(e.status === 'published' ? '已下架，学生端不再展示' : '已重新上架');
      loadExams(); loadDocs();
    } catch { /* 已提示 */ }
  };

  const removeExam = async (e: any) => {
    try {
      await endpoints.deleteExam(e.id);
      msg.success('考试已删除');
      loadExams(); loadDocs();
    } catch { /* 已提示 */ }
  };

  const docColumns = [
    { title: '考试文档', dataIndex: 'title', ellipsis: true, render: (v: string, d: any) => <a onClick={() => openPreview(d)}>{v}</a> },
    { title: '学科', dataIndex: 'courseName', width: 110, ellipsis: true },
    { title: '题量 / 总分', width: 104, render: (_: any, d: any) => `${d.questionCount} 题 / ${d.totalScore} 分` },
    { title: '组卷人', dataIndex: 'createdByName', width: 84 },
    { title: '组卷时间', dataIndex: 'createdAt', width: 150, render: (v: string) => <span style={{ fontSize: 12.5 }}>{formatDateTime(v)}</span> },
    {
      title: '审核状态', dataIndex: 'reviewStatus', width: 100,
      render: (s: string, d: any) => (
        <Tooltip title={d.reviewNote ? `审核意见：${d.reviewNote}` : `${d.reviewedByName || ''} ${formatDateTime(d.reviewedAt)}`}>
          <span>
            <StatusTag kind="reviewStatus" value={s} />
          </span>
        </Tooltip>
      )
    },
    {
      title: '发布状态', width: 100,
      render: (_: any, d: any) => {
        if (d.examStatus === 'published') return <Tag color="success">已发布</Tag>;
        if (d.examStatus === 'archived') return <Tag>已下架</Tag>;
        if (d.reviewStatus === 'approved') return <Tag color="blue">待发布</Tag>;
        return <Tag color="default">未发布</Tag>;
      }
    },
    {
      title: '操作', width: 268,
      render: (_: any, d: any) => (
        <Space size={4} wrap>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openPreview(d)}>预览</Button>
          {d.examStatus !== 'published' && d.reviewStatus !== 'approved' && (
            <Button size="small" type="primary" ghost icon={<CheckCircleOutlined />}
              onClick={() => { setReview({ doc: d, action: 'approve' }); setNote(''); }}>通过</Button>
          )}
          {d.examStatus !== 'published' && d.reviewStatus !== 'rejected' && (
            <Button size="small" danger icon={<CloseCircleOutlined />}
              onClick={() => { setReview({ doc: d, action: 'reject' }); setNote(''); }}>驳回</Button>
          )}
          {d.reviewStatus === 'approved' && d.examStatus !== 'published' && (
            <Button size="small" type="primary" icon={<RocketOutlined />} onClick={() => openPublish(d)}>
              {d.examStatus === 'archived' ? '重新发布' : '发布考试'}
            </Button>
          )}
          {d.examStatus === 'published' && (
            <Button size="small" icon={<BarChartOutlined />} onClick={() => nav(`/stats/${d.examId}`)}>数据看板</Button>
          )}
        </Space>
      )
    }
  ];

  const examColumns = [
    { title: '考试名称', dataIndex: 'title', ellipsis: true },
    { title: '类型', dataIndex: 'type', width: 110, render: (t: string) => <StatusTag kind="examType" value={t} /> },
    {
      title: '来源文档', dataIndex: 'documentTitle', width: 180, ellipsis: true,
      render: (v: string) => (v ? <a onClick={() => { setTab('review'); setDocKw(v); setDocApplied(v); setDocPage(1); }}>{v}</a> : <Tag>平台预置</Tag>)
    },
    { title: '题量 / 总分', width: 110, render: (_: any, e: any) => `${e.questionCount} 题 / ${formatScore(e.totalScore)} 分` },
    { title: '时长', dataIndex: 'duration', width: 90, render: (v: number) => formatDuration(v) },
    {
      title: '开放时间', width: 220,
      render: (_: any, e: any) => <span style={{ fontSize: 12.5 }}>{formatDateTimeRange(e.startAt, e.endAt)}</span>
    },
    {
      title: '答卷', width: 160,
      render: (_: any, e: any) => (
        <span style={{ fontSize: 12.5 }}>
          参考 {e.attemptCount} 人 · 已出分 {e.gradedCount}
          {e.avgScore !== null && <span style={{ color: '#1e5eff' }}> · 均分 {formatScore(e.avgScore)}</span>}
        </span>
      )
    },
    { title: '发布人', dataIndex: 'publishedByName', width: 100, ellipsis: true },
    {
      title: '状态', dataIndex: 'status', width: 96,
      render: (s: string) => <StatusTag kind="examStatus" value={s} />
    },
    {
      title: '操作', width: 230, fixed: 'right' as const,
      render: (_: any, e: any) => (
        <Space size={4}>
          <Button size="small" icon={<BarChartOutlined />} onClick={() => nav(`/stats/${e.id}`)}>看板</Button>
          <Button size="small" icon={e.status === 'published' ? <StopOutlined /> : <SendOutlined />}
            onClick={() => toggleExam(e)}>{e.status === 'published' ? '下架' : '上架'}</Button>
          {isAdmin && (
            <Popconfirm title="删除该考试及试卷？" description="已有答卷的考试不能删除，请先下架保留成绩。"
              okText="删除" cancelText="取消" onConfirm={() => removeExam(e)}>
              <Button size="small" danger type="link" icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  const reviewPane = (
    <>
      <div className="yj-stat-row" style={{ gridTemplateColumns: 'repeat(4, minmax(150px, 220px))' }}>
        <StatCard label="待审核文档" value={docStats.pending || 0} suffix="份" color="#c2761b" />
        <StatCard label="审核通过待发布" value={docStats.approved || 0} suffix="份" color="#1e5eff" />
        <StatCard label="已驳回" value={docStats.rejected || 0} suffix="份" />
        <StatCard label="已发布考试" value={docStats.published || 0} suffix="场" color="#0f9d76" />
      </div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="审核通过后才能发布考试；发布时会按文档快照生成独立试卷，题库后续变动不影响已发布考试。"
        description={
          isAdmin
            ? '管理员：可审核、发布、上下架与删除任意考试，并可维护题库题目。'
            : '教师：可审核、发布文档库中的试卷，并上下架自己发布的考试；删除考试需管理员操作。'
        }
      />
      <Section>
        <Space wrap style={{ marginBottom: 10 }}>
          <Select
            allowClear
            placeholder="审核状态"
            style={{ width: 140 }}
            value={reviewFilter}
            onChange={(v) => {
              setReviewFilter(v);
              setDocPage(1);
            }}
            options={dictOptions('reviewStatus')}
          />
          <Input.Search
            placeholder="文档名称 / 学科"
            allowClear
            style={{ width: 220 }}
            value={docKw}
            onChange={(e) => setDocKw(e.target.value)}
            onSearch={() => {
              setDocPage(1);
              setDocApplied(docKw);
            }}
          />
          <Button onClick={() => { setReviewFilter(undefined); setDocKw(''); setDocApplied(''); setDocPage(1); }}>重置</Button>
        </Space>
        <DataTable
          loading={docLoading}
          dataSource={docs}
          columns={docColumns}
          page={docPage}
          pageSize={docPageSize}
          total={docTotal}
          onPageChange={(p, ps) => { setDocPage(p); setDocPageSize(ps); }}
          emptyText="文档库暂无待审核的试卷，去「文档库 → 选题组卷」生成"
        />
      </Section>
    </>
  );

  const examPane = (
    <>
      <div className="yj-stat-row" style={{ gridTemplateColumns: 'repeat(4, minmax(150px, 220px))' }}>
        <StatCard label="已发布考试" value={examStats.published || 0} suffix="场" color="#0f9d76" />
        <StatCard label="已下架" value={examStats.archived || 0} suffix="场" />
        <StatCard label="文档发布" value={examStats.doclib || 0} suffix="场" />
        <StatCard
          label="学生答卷"
          value={examStats.attempts || 0}
          suffix="份"
          color={(examStats.pendingGrading || 0) > 0 ? '#c2761b' : undefined}
        />
      </div>
      <Section>
        <Space wrap style={{ marginBottom: 10 }}>
          <Select
            allowClear
            placeholder="发布状态"
            style={{ width: 140 }}
            value={examStatus}
            onChange={(v) => {
              setExamStatus(v);
              setExamPage(1);
            }}
            options={dictOptions('examStatus')}
          />
          <Input.Search
            placeholder="考试名称"
            allowClear
            style={{ width: 220 }}
            value={examKw}
            onChange={(e) => setExamKw(e.target.value)}
            onSearch={() => {
              setExamPage(1);
              setExamApplied(examKw);
            }}
          />
          <Button onClick={() => { setExamStatus(undefined); setExamKw(''); setExamApplied(''); setExamPage(1); }}>重置</Button>
        </Space>
        <DataTable
          loading={examLoading}
          dataSource={exams}
          columns={examColumns}
          scroll={{ x: 1400 }}
          page={examPage}
          pageSize={examPageSize}
          total={examTotal}
          onPageChange={(p, ps) => { setExamPage(p); setExamPageSize(ps); }}
          emptyText="还没有发布任何考试"
        />
      </Section>
    </>
  );

  return (
    <PageContainer
      title="考试发布"
      description="考试从组卷到学生作答的完整链路：文档库组卷 → 审核文档 → 发布考试 → 学生端接收作答。发布状态实时同步到考试大厅，下架后学生不再看到该考试，已产生的成绩保留。"
    >
      <Steps
        size="small"
        style={{ marginBottom: 16 }}
        items={[
          { title: '文档库组卷', description: '选题生成试卷 / 练习' },
          { title: '审核文档', description: '核对题量与分值' },
          { title: '发布考试', description: '配置时间与规则' },
          { title: '学生作答', description: '大厅接收并在线答题' }
        ]}
      />

      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'review', label: `文档审核与发布${(docStats.pending || 0) ? `（${docStats.pending} 待审）` : ''}`, children: reviewPane },
        { key: 'exams', label: `已发布考试管理${(examStats.published || 0) ? `（${examStats.published} 场）` : ''}`, children: examPane }
      ]} />

      {/* 审核弹窗 */}
      <Modal
        title={review?.action === 'approve' ? '审核通过' : '驳回文档'}
        open={!!review} onCancel={() => setReview(null)} onOk={submitReview}
        okText={review?.action === 'approve' ? '确认通过' : '确认驳回'}
        okButtonProps={{ danger: review?.action === 'reject', loading: reviewing }}
        width={520} destroyOnClose
      >
        <Typography.Paragraph style={{ marginTop: 8 }}>
          文档：<b>{review?.doc?.title}</b>（{review?.doc?.questionCount} 题 / {review?.doc?.totalScore} 分）
        </Typography.Paragraph>
        <div style={{ marginTop: 12, marginBottom: 6, fontSize: 13 }}>
          {review?.action === 'approve' ? '审核意见（可选）' : '驳回原因（必填）'}
        </div>
        <Input.TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} showCount
          placeholder={review?.action === 'approve' ? '如：题量、分值、知识点分布核对无误' : '如：第 3 题答案有误，请修改后重新提交'} />
        {review?.action === 'approve' && (
          <Alert style={{ marginTop: 12 }} type="warning" showIcon message="通过后即可发布为在线考试，发布时按当前文档快照生成试卷。" />
        )}
      </Modal>

      {/* 发布弹窗 */}
      <Modal
        title="发布在线考试" open={!!pub} onCancel={() => setPub(null)} onOk={doPublish}
        okText="确认发布" okButtonProps={{ loading: publishing }} width={600} destroyOnClose
      >
        {pub && (
          <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
            <Alert type="success" showIcon
              message={`来源文档：${pub.title}`}
              description={`${pub.questionCount} 题 · ${pub.totalScore} 分 · 组卷人 ${pub.createdByName || '—'}；发布后学生可在考试大厅直接参加。`} />
            <div>
              <div style={{ marginBottom: 6, fontSize: 13 }}>考试名称</div>
              <Input value={pubForm.title} onChange={(e) => setPubForm({ ...pubForm, title: e.target.value })} maxLength={60} showCount />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 6, fontSize: 13 }}>考试类型</div>
                <Select style={{ width: '100%' }} value={pubForm.type} onChange={(v) => setPubForm({ ...pubForm, type: v })} options={dictOptions('examType')} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 6, fontSize: 13 }}>时长（分钟）</div>
                <InputNumber style={{ width: '100%' }} min={10} max={300} value={pubForm.duration}
                  onChange={(v) => setPubForm({ ...pubForm, duration: v })} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 6, fontSize: 13 }}>及格线（%）</div>
                <InputNumber style={{ width: '100%' }} min={30} max={95} value={pubForm.passRate}
                  onChange={(v) => setPubForm({ ...pubForm, passRate: v })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 6, fontSize: 13 }}>开放时间</div>
                <DatePicker showTime style={{ width: '100%' }} value={pubForm.startAt}
                  onChange={(v) => setPubForm({ ...pubForm, startAt: v })} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 6, fontSize: 13 }}>截止时间</div>
                <DatePicker showTime style={{ width: '100%' }} value={pubForm.endAt}
                  onChange={(v) => setPubForm({ ...pubForm, endAt: v })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 13 }}>允许回看已答题 <Switch size="small" checked={pubForm.allowBacktrack}
                onChange={(v) => setPubForm({ ...pubForm, allowBacktrack: v })} /></span>
              <span style={{ fontSize: 13 }}>题目乱序 <Switch size="small" checked={pubForm.shuffleQuestion}
                onChange={(v) => setPubForm({ ...pubForm, shuffleQuestion: v })} /></span>
              <span style={{ fontSize: 13 }}>选项乱序 <Switch size="small" checked={pubForm.shuffleOption}
                onChange={(v) => setPubForm({ ...pubForm, shuffleOption: v })} /></span>
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 13 }}>考试说明</div>
              <Input.TextArea rows={2} value={pubForm.remark} onChange={(e) => setPubForm({ ...pubForm, remark: e.target.value })}
                placeholder="展示在学生端考试详情页，如考试范围、注意事项" maxLength={120} showCount />
            </div>
          </div>
        )}
      </Modal>

      {/* 文档预览 */}
      <Drawer title={preview?.title || '文档预览'} open={previewOpen} onClose={() => setPreviewOpen(false)} width={780}
        extra={<Tag color="blue">{preview?.questionCount} 题 / {formatScore(preview?.totalScore)} 分</Tag>}>
        <style>{PAPER_CSS}</style>
        {preview && <div className="yj-paper" dangerouslySetInnerHTML={{ __html: paperBody(preview, true) }} />}
      </Drawer>
    </PageContainer>
  );
}
