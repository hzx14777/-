// 砚考核心链路造数脚本：题库 → 试题 → 试卷 → 考试
const http = require('http');
const fs = require('fs');

const BASE = 'http://127.0.0.1:8080';
const TOKEN = fs.readFileSync('C:/Users/24243/Desktop/考试平台2/oss-run/token.txt', 'utf8').trim();
const CLIENT = 'e5cd7e4891bf95d1d19206ce24a7b32e';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const opts = {
      hostname: u.hostname, port: u.port, path: u.pathname + u.search, method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + TOKEN,
        'clientid': CLIENT
      }
    };
    if (data) opts.headers['Content-Length'] = data.length;
    const r = http.request(opts, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch (e) { resolve({ raw: buf, status: res.statusCode }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

const show = (t, r) => console.log(t, '=>', JSON.stringify(r).slice(0, 220));

(async () => {
  // 1. 题库
  let r = await req('POST', '/question/bank', {
    bankName: '警务技术实训题库', bankDesc: '用于验证考试链路：出题、组卷、考试、判分',
    visibility: 'public', status: '1'
  });
  show('建题库', r);

  r = await req('GET', '/question/bank/list?pageNum=1&pageSize=10');
  const bank = (r.rows || []).find(x => x.bankName === '警务技术实训题库');
  if (!bank) { console.log('题库未创建成功'); return; }
  const bankId = bank.id;
  console.log('bankId =', bankId);

  // 2. 试题（单选 / 多选 / 判断）
  const qs = [
    {
      title: '<p>HTTP 协议默认使用的端口号是？</p>', questionType: 'SINGLE', difficulty: 'easy',
      score: 5, answer: '{"rightKeys":["B"]}', analysis: 'HTTP 默认端口为 80，HTTPS 为 443。', status: '1',
      options: [
        { optionKey: 'A', optionContent: '21', sort: 1, isRight: false },
        { optionKey: 'B', optionContent: '80', sort: 2, isRight: true },
        { optionKey: 'C', optionContent: '443', sort: 3, isRight: false },
        { optionKey: 'D', optionContent: '3306', sort: 4, isRight: false }
      ]
    },
    {
      title: '<p>以下哪些属于关系型数据库？</p>', questionType: 'MULTIPLE', difficulty: 'easy',
      score: 5, answer: '{"rightKeys":["A","B"]}', analysis: 'MySQL 与 PostgreSQL 是关系型，Redis 与 MongoDB 不是。', status: '1',
      options: [
        { optionKey: 'A', optionContent: 'MySQL', sort: 1, isRight: true },
        { optionKey: 'B', optionContent: 'PostgreSQL', sort: 2, isRight: true },
        { optionKey: 'C', optionContent: 'Redis', sort: 3, isRight: false },
        { optionKey: 'D', optionContent: 'MongoDB', sort: 4, isRight: false }
      ]
    },
    {
      title: '<p>TCP 是面向连接的可靠传输协议。</p>', questionType: 'JUDGE', difficulty: 'easy',
      score: 5, answer: '{"rightKeys":["T"]}', analysis: 'TCP 通过三次握手建立连接，提供可靠传输。', status: '1',
      options: [
        { optionKey: 'T', optionContent: '正确', sort: 1, isRight: true },
        { optionKey: 'F', optionContent: '错误', sort: 2, isRight: false }
      ]
    }
  ];
  const qIds = [];
  for (const q of qs) {
    q.bankId = bankId;
    const rr = await req('POST', '/question/create', q);
    show('建试题 ' + q.questionType, rr);
  }

  r = await req('GET', `/question/list?pageNum=1&pageSize=20&bankId=${bankId}`);
  const list = r.rows || [];
  console.log('试题总数 =', r.total);
  list.forEach(x => { qIds.push(x.id); console.log('  q', x.id, x.questionType, (x.title || '').replace(/<[^>]+>/g, '').slice(0, 30)); });

  if (qIds.length < 3) { console.log('试题不足，终止'); return; }

  // 3. 试卷
  r = await req('POST', '/paper/save', {
    paperName: '网络安全基础测验（演示卷）', paperDesc: '自动判分演示卷，3 题共 15 分',
    paperType: 'MANUAL', totalScore: 15, passScore: 9, visibility: 'public',
    status: 'ready', defaultScore: 5, autoJudge: '1', manualReview: '0',
    questions: qIds.map(id => ({ questionId: id, paperScore: 5 }))
  });
  show('建试卷', r);
  const paperId = r.data;
  console.log('paperId =', paperId);

  // 4. 考试
  r = await req('POST', '/exam', {
    examName: '网络安全基础测验（第 1 场）', examDesc: '用于本地功能验证的演示考试',
    paperId, examType: '1',
    startTime: '2026-11-03 00:00:00', endTime: '2026-11-30 23:59:59',
    duration: 60, allowLate: 1, lateMinute: 30, allowRetry: 0, maxRetryCount: 1,
    showAnswerMode: 'after_submit', partialScore: '0',
    participantType: 'public', status: 'ongoing'
  });
  show('建考试', r);
  const examId = r.data;
  console.log('examId =', examId);

  // 5. 校验列表
  for (const p of ['/paper/list?pageNum=1&pageSize=5', '/exam/list?pageNum=1&pageSize=5']) {
    const rr = await req('GET', p);
    console.log(p, '=> total', rr.total, (rr.rows || []).map(x => x.paperName || x.examName).join(','));
  }
})();
