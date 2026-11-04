// 考生答题链路验证：开始考试 → 取卷 → 逐题作答 → 交卷 → 判分
const http = require('http');
const fs = require('fs');

const BASE = 'http://127.0.0.1:8080';
const TOKEN = fs.readFileSync('C:/Users/24243/Desktop/考试平台2/oss-run/token.txt', 'utf8').trim();
const CLIENT = 'e5cd7e4891bf95d1d19206ce24a7b32e';
const EXAM_ID = '2117492907131596801';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const opts = {
      hostname: u.hostname, port: u.port, path: u.pathname + u.search, method,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN, 'clientid': CLIENT }
    };
    if (data) opts.headers['Content-Length'] = data.length;
    const r = http.request(opts, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch (e) { resolve({ raw: buf, status: res.statusCode }); } });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
const j = o => JSON.stringify(o).slice(0, 400);

(async () => {
  let r = await req('POST', `/answer/record/start/${EXAM_ID}`, {});
  console.log('开始考试 =>', j(r));
  const recordId = r.data;
  if (!recordId) return;

  r = await req('GET', `/answer/record/${recordId}/paper`);
  console.log('取卷 => code', r.code, '题数', (r.data && r.data.questions || []).length);

  const qs = (r.data && r.data.questions) || [];
  for (const q of qs) {
    const t = q.questionType;
    const ans = t === 'MULTIPLE' ? { choices: ['C'] } : t === 'JUDGE' ? { choices: ['F'] } : { choices: ['A'] };
    const rr = await req('POST', `/answer/record/${recordId}/answer`, { questionId: q.questionId || q.id, answerContent: JSON.stringify(ans) });
    console.log('  作答', q.questionType, '=>', rr.code, rr.msg);
  }

  r = await req('POST', `/answer/record/${recordId}/submit`, {});
  console.log('交卷 =>', j(r));

  r = await req('GET', `/answer/record/${recordId}/result`);
  console.log('成绩 =>', j(r));

  r = await req('GET', '/answer/record/records?pageNum=1&pageSize=5');
  console.log('考试记录 => total', r.total, j((r.rows || [])[0] || {}));
})();
