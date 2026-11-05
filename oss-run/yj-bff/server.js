/**
 * 警院智慧考试平台 · 需求适配服务（BFF）
 * 在砚考 exam-platform 之上补齐 SRS 规定的判定规则：双达标、人机共判、准入资格、AI 命题任务
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const seed = require('./seed');
const { gradeAttempt, gradeQuestion, similarity, selfCheck, round1, uid, seededShuffle } = require('./engine');

const PORT = Number(process.env.YJ_PORT || 80);
const HOST = process.env.YJ_HOST || '0.0.0.0';
const DATA_DIR = path.join(__dirname, 'data');
/* 前端生产产物（vite build 输出），由本服务同源托管，避免依赖 vite dev server */
const DIST = process.env.YJ_DIST || path.join(__dirname, '..', 'exam-front-react', 'dist');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SECRET = 'yj-exam-platform-2026';

/* ---------------- 五平台约束：运行配置（§14，禁止在业务代码写死服务地址） ---------------- */
const CONFIG = (() => {
  const c = {
    appCode: process.env.YJ_APP_CODE || 'exam',
    sourcePlatform: 'exam',
    platformKey: process.env.YJ_PLATFORM_KEY || 'yj-demo-platform-key',
    sso: {
      mode: process.env.YJ_SSO_MODE || 'mock', // mock = 本服务内置联调认证中心；real = 论坛统一认证
      baseUrl: process.env.YJ_SSO_BASE_URL || `http://127.0.0.1:${process.env.YJ_PORT || 80}/sso`,
      clientId: process.env.YJ_SSO_CLIENT_ID || 'exam-platform-client',
      clientSecret: process.env.YJ_SSO_CLIENT_SECRET || 'exam-platform-secret'
    },
    event: {
      baseUrl: process.env.YJ_EVENT_BASE_URL || '',
      ingestPath: process.env.YJ_EVENT_INGEST_PATH || '/api/v1/events'
    },
    file: { baseUrl: process.env.YJ_FILE_BASE_URL || '' }
  };
  try {
    const f = path.join(__dirname, 'config.json');
    if (fs.existsSync(f)) {
      const o = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (o.appCode) c.appCode = o.appCode;
      if (o.platformKey) c.platformKey = o.platformKey;
      if (o.sso) Object.assign(c.sso, o.sso);
      if (o.event) Object.assign(c.event, o.event);
      if (o.file) Object.assign(c.file, o.file);
    }
  } catch (e) { /* 配置文件可选 */ }
  return c;
})();

/* ---------------- 五平台约束：统一角色权限点（§8.2，资源:动作） ---------------- */
const ROLE_PERMISSIONS = {
  student: ['course:read', 'chapter:read', 'exam:read', 'exam:submit', 'record:read', 'wrongbook:manage', 'admission:read'],
  teacher: ['course:read', 'chapter:read', 'exam:read', 'exam:submit', 'record:read', 'wrongbook:manage', 'admission:read',
    'exam:grade', 'question:read', 'question:create', 'question:review', 'exam:manage', 'stats:read', 'job:manage',
    'doclib:read', 'doclib:compose'],
  admin: ['course:read', 'chapter:read', 'exam:read', 'exam:submit', 'record:read', 'wrongbook:manage', 'admission:read',
    'exam:grade', 'question:read', 'question:create', 'question:review', 'exam:manage', 'stats:read', 'job:manage',
    'doclib:read', 'doclib:compose', 'bank:manage',
    'audit:read', 'event:read', 'outbox:manage', 'user:read']
};

/* ---------------- 存储 ---------------- */
function setUserPerms(u) {
  u.permissions = ROLE_PERMISSIONS[u.role] || ROLE_PERMISSIONS.student;
  u.roles = [u.role];
  return u;
}

/* 统一数据字典（§9.2）：核心对象补齐 id/createdAt/updatedAt/createdBy/updatedBy/status；事件统一信封（§11.3） */
function normalize(db) {
  const t = iso(now());
  const touch = (o) => {
    o.createdAt = o.createdAt || o.startedAt || o.at || t;
    o.updatedAt = o.updatedAt || o.createdAt;
    o.createdBy = o.createdBy || 'system';
    o.updatedBy = o.updatedBy || o.createdBy;
    return o;
  };
  ['courses', 'chapters', 'questions', 'papers', 'exams', 'users', 'attempts', 'admissions', 'jobs', 'audits'].forEach((k) => (db[k] || []).forEach(touch));
  db.events = (db.events || []).map((e) => e.eventType ? e : {
    eventId: e.id || uid('evt'),
    eventType: e.event || 'exam.submitted',
    occurredAt: e.at || t,
    sourcePlatform: CONFIG.sourcePlatform,
    operatorId: e.operatorId || '',
    data: e.payload || {}
  });
  db.inbox = db.inbox || [];
  db.outbox = db.outbox || [];
  db.sessions = db.sessions || [];
  /* 文档库：教师/管理员基于题库勾选生成的试卷与练习 */
  db.documents = db.documents || [];
  /* 兼容历史数据：文档默认待审核，考试默认审核通过（存量考试直接视为已发布） */
  db.documents.forEach((d) => {
    if (!d.reviewStatus) d.reviewStatus = 'pending';
    if (!d.reviewNote) d.reviewNote = '';
  });
  (db.exams || []).forEach((e) => {
    if (!e.reviewStatus) e.reviewStatus = 'approved';
    if (!e.source) e.source = e.documentId ? 'doclib' : 'seed';
  });
  (db.users || []).forEach(setUserPerms);
  return db;
}

function load() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(raw);
    if (db && db.users && db.exams) return normalize(db);
  } catch (e) {
    /* 首次运行 */
  }
  const db = normalize(seed.build());
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  return db;
}
let DB = null;
let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    fs.writeFile(DB_FILE, JSON.stringify(DB, null, 2), () => {});
  }, 300);
}

/* ---------------- 会话 ---------------- */
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', SECRET).update(body).digest('base64url').slice(0, 24);
  return `${body}.${mac}`;
}
function verify(token) {
  if (!token || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expect = crypto.createHmac('sha256', SECRET).update(body).digest('base64url').slice(0, 24);
  if (mac !== expect) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (p.exp < Date.now()) return { expired: true };
    return p;
  } catch {
    return null;
  }
}

/* ---------------- 领域工具 ---------------- */
const now = () => new Date();
const iso = (d) => {
  const dt = new Date(d);
  const pad = (x) => String(x).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}+08:00`;
};
const userById = (id) => DB.users.find((u) => u.id === id);
DB = load();
const examById = (id) => DB.exams.find((e) => e.id === id);
const paperById = (id) => DB.papers.find((p) => p.id === id);
const attemptsOf = (uidv) => DB.attempts.filter((a) => a.userId === uidv);
const bestOf = (uidv, examId) => {
  const list = attemptsOf(uidv).filter((a) => a.examId === examId && a.status === 'graded');
  if (!list.length) return null;
  return list.reduce((m, a) => (a.totalScore > m.totalScore ? a : m), list[0]);
};

function chapterCompleted(userId, chapterId) {
  const u = userById(userId);
  return !!(u && u.completed.includes(chapterId));
}

/** 考试解锁状态（6.1 / FR-EX-002） */
function unlockState(exam, userId) {
  if (exam.status !== 'published') return { unlocked: false, reason: '考试已下架' };
  if (exam.requireChapter && !chapterCompleted(userId, exam.requireChapter)) {
    const ch = DB.chapters.find((c) => c.id === exam.requireChapter);
    return { unlocked: false, reason: `需先完成《${ch ? ch.name : '前置章节'}》章节学习`, chapterId: exam.requireChapter };
  }
  const t = iso(now());
  if (exam.startAt && t < exam.startAt) return { unlocked: false, reason: '尚未到开放时间' };
  if (exam.endAt && t > exam.endAt) return { unlocked: false, reason: '已超过考试截止时间' };
  return { unlocked: true, reason: '' };
}

function examCard(exam, userId) {
  const paper = paperById(exam.paperId);
  const course = DB.courses.find((c) => c.id === exam.courseId);
  const list = attemptsOf(userId).filter((a) => a.examId === exam.id);
  const graded = list.filter((a) => a.status === 'graded');
  const best = graded.length ? graded.reduce((m, a) => (a.totalScore > m.totalScore ? a : m), graded[0]) : null;
  const ongoing = list.find((a) => a.status === 'answering');
  const pending = list.find((a) => a.status === 'submitted');
  const un = unlockState(exam, userId);
  return {
    id: exam.id,
    title: exam.title,
    type: exam.type,
    typeName: { chapter_quiz: '章节随堂测', skill_exam: '专项技能卷', admission_exam: '项目准入卷' }[exam.type],
    courseName: course ? course.name : '',
    courseId: exam.courseId,
    questionCount: paper ? paper.items.length : 0,
    totalScore: paper ? paper.totalScore : 100,
    passRate: paper ? paper.passRate : 0.7,
    duration: exam.duration,
    startAt: exam.startAt,
    endAt: exam.endAt,
    abilityScope: exam.abilityScope || [],
    groups: (paper ? paper.groups : []).map((g) => ({ id: g.id, name: g.name, weight: g.weight, threshold: g.threshold })),
    attemptCount: list.length,
    bestScore: best ? best.totalScore : null,
    bestPassed: best ? best.dualPass : null,
    bestAttemptId: best ? best.id : (pending ? pending.id : null),
    passLine: paper ? round1(paper.totalScore * paper.passRate) : 70,
    unlocked: un.unlocked,
    lockReason: un.reason,
    lockChapterId: un.chapterId || null,
    ongoingAttemptId: ongoing ? ongoing.id : null,
    pendingAttemptId: pending ? pending.id : null,
    status: exam.status,
    source: exam.source || (exam.documentId ? 'doclib' : 'seed'),
    documentId: exam.documentId || '',
    publishedAt: exam.publishedAt || exam.createdAt,
    publishedByName: exam.publishedByName || '',
    remark: exam.remark,
    answerPolicy: exam.answerPolicy,
    cheatLevel: exam.cheatLevel
  };
}

function attemptBrief(a) {
  const exam = examById(a.examId);
  const paper = paperById(a.paperId);
  return {
    id: a.id,
    examId: a.examId,
    examTitle: exam ? exam.title : '',
    examType: exam ? exam.type : '',
    paperTitle: paper ? paper.title : '',
    courseName: (DB.courses.find((c) => c.id === (exam && exam.courseId)) || {}).name || '',
    status: a.status,
    totalScore: a.totalScore,
    objectiveScore: a.objectiveScore,
    essayScore: a.essayScore,
    dualPass: a.dualPass,
    level: a.level,
    passLine: paper ? round1(paper.totalScore * paper.passRate) : 70,
    submittedAt: a.submittedAt,
    eventCount: (a.events || []).length,
    failReason: a.failReason
  };
}

/* 判断题在题库中以 answer=T/F 存储、不带选项行；答题与导出统一用标准二选一补齐 */
const JUDGE_OPTIONS = [{ id: 'T', content: '正确' }, { id: 'F', content: '错误' }];

function optionList(q) {
  const list = Array.isArray(q && q.options) ? q.options.filter((o) => o && o.id) : [];
  if (list.length) return list.map((o) => ({ id: o.id, content: o.content }));
  if (q && q.type === 'judge') return JUDGE_OPTIONS.map((o) => ({ ...o }));
  return [];
}

function snapshotOf(paper, seedNum) {
  return paper.items.map((it) => {
    const q = DB.questions.find((x) => x.id === it.qid);
    let options = optionList(q);
    const exam = DB.exams.find((e) => e.paperId === paper.id);
    if (exam && exam.shuffleOption && options.length) options = seededShuffle(options, seedNum + it.qid.length);
    return {
      qid: q.id,
      type: q.type,
      stem: q.stem,
      options,
      score: it.score,
      group: it.group,
      answer: q.answer,
      analysis: q.analysis,
      kp: q.kp,
      scorePoints: q.scorePoints,
      chapterId: q.chapterId,
      difficulty: q.difficulty
    };
  });
}

function audit(actor, role, action, target, detail) {
  DB.audits.unshift({ id: uid('au'), at: iso(now()), actor: actor || '系统', role: role || 'system', action, target, detail });
  save();
}

function issueAdmission(attempt, exam, teacher) {
  const exist = DB.admissions.find((x) => x.userId === attempt.userId && x.examId === exam.id);
  const issued = now();
  const expire = new Date(issued);
  expire.setFullYear(expire.getFullYear() + 1);
  const u = userById(attempt.userId);
  if (exist) {
    const upgrade = attempt.totalScore > exist.score;
    if (upgrade) {
      Object.assign(exist, {
        score: attempt.totalScore,
        level: attempt.level,
        attemptId: attempt.id,
        issuedAt: iso(issued),
        expireAt: iso(expire),
        status: 'active',
        updatedAt: iso(issued),
        updatedBy: teacher ? teacher.id : attempt.userId
      });
    }
    return { admission: exist, created: false, upgraded: upgrade };
  }
  const adm = {
    id: uid('adm'),
    userId: attempt.userId,
    userName: u.name,
    examId: exam.id,
    examTitle: exam.title,
    attemptId: attempt.id,
    abilityScope: exam.abilityScope || [],
    score: attempt.totalScore,
    level: attempt.level,
    issuedAt: iso(issued),
    expireAt: iso(expire),
    status: 'active',
    revokedReason: '',
    createdAt: iso(issued),
    updatedAt: iso(issued),
    createdBy: teacher ? teacher.id : 'system',
    updatedBy: teacher ? teacher.id : 'system'
  };
  DB.admissions.push(adm);
  return { admission: adm, created: true };
}

/* ---------------- AI 命题（本地命题引擎 + 可切换模型） ---------------- */
function genCandidates(chapter, kps, params) {
  const out = [];
  const others = DB.chapters.flatMap((c) => c.kps).filter((k) => !kps.find((x) => x.id === k.id));
  const pickOther = (i) => others[(i * 7 + 3) % others.length];

  kps.forEach((kp, idx) => {
    const bodySent = chapter.body.join(' ');
    const stemSource = kp.brief;
    // 单选：正确项为知识点定义，干扰项取自其它知识点的定义
    // 干扰项取自其它知识点的表述，正确项位置随知识点序号轮转，避免答案恒为 A
    const distractors = [pickOther(idx).brief, pickOther(idx + 1).brief, pickOther(idx + 2).brief].filter((x) => x !== stemSource);
    const correctIdx = idx % 4;
    const contents = [];
    let di = 0;
    for (let i = 0; i < 4; i++) contents.push(i === correctIdx ? stemSource : distractors[di++ % distractors.length]);
    const opts = contents.map((content, i) => ({ id: ['A', 'B', 'C', 'D'][i], content }));
    const single = {
      type: 'single',
      stem: `关于「${kp.name}」，下列表述正确的是？`,
      options: opts,
      answer: ['A', 'B', 'C', 'D'][correctIdx],
      analysis: `${stemSource}。其余选项分别描述的是「${pickOther(idx).name}」「${pickOther(idx + 1).name}」等其他知识点。`,
      kp: [kp.id],
      difficulty: 'medium',
      score: 5,
      sourceType: 'ai',
      scorePoints: [],
      fromBody: bodySent.includes(stemSource.slice(0, 6)) ? '正文原句' : '正文改写'
    };
    out.push(single);

    // 判断题：改写正文陈述，制造错误项
    const wrongVersion = stemSource.replace(/不|必须|只能|禁止/, (m) => (m === '不' ? '一定' : m === '必须' ? '无需' : m === '只能' ? '可以' : '允许'));
    const isTrue = wrongVersion === stemSource;
    out.push({
      type: 'judge',
      stem: `判断：${wrongVersion}。`,
      options: [],
      answer: isTrue ? 'T' : 'F',
      analysis: isTrue ? `与章节正文一致：${stemSource}。` : `题干与正文相反，正文表述为：${stemSource}。`,
      kp: [kp.id],
      difficulty: 'easy',
      score: 5,
      sourceType: 'ai',
      scorePoints: [],
      fromBody: '正文改写'
    });

    // 填空题：挖掉知识点名称本身，答案即知识点术语
    const blankStem = stemSource.includes(kp.name)
      ? stemSource.replace(kp.name, '____')
      : `本节要求掌握的知识点「____」，其要点为：${stemSource}。`;
    out.push({
      type: 'blank',
      stem: `填空：${blankStem}`,
      options: [],
      answer: [[kp.name]],
      analysis: `该空对应知识点名称「${kp.name}」，正文依据：${stemSource}。`,
      kp: [kp.id],
      difficulty: 'medium',
      score: 5,
      sourceType: 'ai',
      scorePoints: [],
      fromBody: '正文原句'
    });

    if (idx < 2) {
      out.push({
        type: 'essay',
        stem: `结合本章内容，简述「${kp.name}」在实际业务中的作用与注意事项。`,
        options: [],
        answer: null,
        analysis: '按知识点定义与业务场景要点给分，答出作用与注意事项两条主线即可。',
        kp: [kp.id],
        difficulty: 'hard',
        score: 10,
        sourceType: 'ai',
        scorePoints: [
          { text: `准确说明「${kp.name}」的定义或要求`, keywords: [kp.name.slice(0, 4), kp.name.slice(0, 2)], weight: 0.4 },
          { text: '结合业务场景说明作用', keywords: ['业务', '场景', '作用', '用于'], weight: 0.35 },
          { text: '指出落地时的注意事项或常见错误', keywords: ['注意', '风险', '避免', '问题'], weight: 0.25 }
        ],
        fromBody: '正文改写'
      });
    }
  });

  // 按题型/难度分布裁剪
  const want = params.count || 12;
  const typeOrder = Object.keys(params.typeRatio || {}).sort((a, b) => (params.typeRatio[b] || 0) - (params.typeRatio[a] || 0));
  let picked = [];
  typeOrder.forEach((t) => {
    const quota = Math.round(want * (params.typeRatio[t] || 0) / 100);
    picked = picked.concat(out.filter((q) => q.type === t).slice(0, quota));
  });
  if (picked.length < want) {
    out.forEach((q) => {
      if (picked.length < want && !picked.includes(q)) picked.push(q);
    });
  }
  picked = picked.slice(0, want);

  // 四道自检 + 相似度判重
  return picked.map((c, i) => {
    const cand = { ...c, id: `cand_${i + 1}` };
    const issues = [];
    // 单选干扰项互斥性校验（模拟真实模型的偶发错误）
    if (cand.type === 'single') {
      const dup = cand.options.find((o, oi) => cand.options.some((p, pi) => pi !== oi && p.content === o.content));
      if (dup) issues.push({ code: 'exclusive', text: '干扰项与正确项重复，选项不互斥' });
    }
    const chk = selfCheck(cand);
    const sims = DB.questions
      .map((q) => ({ qid: q.id, stem: q.stem, sim: similarity(q.stem, cand.stem) }))
      .sort((a, b) => b.sim - a.sim);
    const top = sims[0];
    const dupHit = top && top.sim >= 0.9;
    return {
      ...cand,
      checked: chk.ok && !dupHit,
      issues: [...chk.issues, ...(dupHit ? [{ code: 'dup', text: `与题库题目相似度 ${Math.round(top.sim * 100)}%，判定重复` }] : [])],
      duplicate: dupHit ? { qid: top.qid, stem: top.stem, sim: top.sim } : null,
      trace: {
        courseId: chapter.courseId,
        chapterId: chapter.id,
        chapterName: chapter.name,
        bodyHash: crypto.createHash('md5').update(chapter.body.join('')).digest('hex').slice(0, 12),
        jobId: '',
        model: 'yj-local-generator-v1'
      }
    };
  });
}

function jobProgress(job) {
  const elapsed = Date.now() - new Date(job.createdAt).getTime();
  const stages = [
    { t: 0, name: '拉取章节正文与知识点' },
    { t: 700, name: '文本切片与知识点绑定' },
    { t: 1500, name: '模型生成候选题' },
    { t: 2600, name: '四道自检与相似度去重' },
    { t: 3600, name: '等待教师审核' }
  ];
  let idx = 0;
  stages.forEach((s, i) => {
    if (elapsed >= s.t) idx = i;
  });
  return { stage: stages[idx].name, index: idx, percent: Math.min(100, Math.round(((idx + 1) / stages.length) * 100)), done: idx >= 3 };
}

/* 对外的任务状态统一走平台数据字典（§9.2）：in_progress / completed
   内部仍保留 running / done / reviewed 三个持久化取值，避免历史数据需要迁移 */
function jobStatusOut(job) {
  if (job.status === 'done' || job.status === 'reviewed' || job.status === 'completed') return 'completed';
  return 'in_progress';
}

/* ---------------- 五平台约束：鉴权与分页助手（§8.2/§10.2） ---------------- */
class HttpError extends Error {
  constructor(code, message, httpCode = 200) { super(message); this.code = code; this.httpCode = httpCode; }
}
function need(me, expired, perm) {
  if (!me) throw new HttpError(expired ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_REQUIRED', expired ? '登录状态已过期，请重新登录' : '未登录', 401);
  if (perm && !(me.permissions || []).includes(perm)) throw new HttpError('FORBIDDEN', `缺少权限点 ${perm}`, 403);
}
function paginate(list, url) {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
  return { items: list.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: list.length };
}

/* ---------------- 五平台约束：统一业务事件 + 出站投递与失败留痕（§11.3/§11.4） ---------------- */
function emitBusiness(eventType, operatorId, data) {
  const ev = { eventId: uid('evt'), eventType, occurredAt: iso(now()), sourcePlatform: CONFIG.sourcePlatform, operatorId: operatorId || '', data: data || {} };
  DB.events.unshift(ev);
  const ob = {
    eventId: ev.eventId, eventType,
    target: CONFIG.event.baseUrl || '(未配置事件总线 EVENT_BASE_URL)',
    status: CONFIG.event.baseUrl ? 'pending' : 'skipped',
    attempts: 0, lastAt: null, lastError: '',
    payloadDigest: crypto.createHash('sha1').update(JSON.stringify(ev)).digest('hex').slice(0, 12),
    createdAt: ev.occurredAt
  };
  DB.outbox.unshift(ob);
  if (CONFIG.event.baseUrl) dispatchOutbox(ob, ev);
  return ev;
}
function dispatchOutbox(ob, ev) {
  ob.status = 'delivering';
  ob.attempts += 1;
  ob.lastAt = iso(now());
  httpJson('POST', CONFIG.event.baseUrl.replace(/\/$/, '') + CONFIG.event.ingestPath, { 'X-Platform-Key': CONFIG.platformKey }, ev, 5000).then((r) => {
    if (r.status >= 200 && r.status < 300) ob.status = 'delivered';
    else { ob.status = 'failed'; ob.lastError = `HTTP ${r.status} ${r.error || ''}`.trim(); }
    save();
  });
}
function httpJson(method, urlStr, headers, payload, timeoutMs = 5000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(urlStr);
      const mod = u.protocol === 'https:' ? require('node:https') : http;
      const data = payload ? JSON.stringify(payload) : null;
      const rq = mod.request({
        hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search, method,
        headers: Object.assign({ 'Content-Type': 'application/json' }, data ? { 'Content-Length': Buffer.byteLength(data) } : {}, headers || {}),
        timeout: timeoutMs
      }, (rs) => {
        let raw = '';
        rs.on('data', (c) => (raw += c));
        rs.on('end', () => { try { resolve({ status: rs.statusCode, body: JSON.parse(raw) }); } catch (e) { resolve({ status: rs.statusCode, body: raw }); } });
      });
      rq.on('timeout', () => { rq.destroy(); resolve({ status: 0, body: null, error: 'timeout' }); });
      rq.on('error', (e) => resolve({ status: 0, body: null, error: e.message }));
      if (data) rq.write(data);
      rq.end();
    } catch (e) { resolve({ status: 0, body: null, error: e.message }); }
  });
}

/* ---------------- 五平台约束：SSO 客户端 + 联调 Mock 认证中心（§7） ---------------- */
const ssoCodes = new Map();
const ssoTokens = new Map();
const ssoStates = new Map();
function ssoUserInfo(u) {
  return {
    userId: u.id,
    studentNo: u.studentNo || (u.role === 'student' ? u.account : null),
    realName: u.name,
    roles: [u.role],
    permissions: u.permissions || ROLE_PERMISSIONS[u.role] || [],
    organizationId: u.organizationId || null,
    classId: u.classId || null
  };
}
function ssoMock(req, res, url, method, p) {
  if (CONFIG.sso.mode !== 'mock') return fail(res, 'NOT_FOUND', '当前未启用 Mock 认证中心', 404);
  if (p === '/sso/oauth/authorize' && method === 'GET') {
    const redirectUri = url.searchParams.get('redirect_uri') || '';
    const state = url.searchParams.get('state') || '';
    const rows = DB.users.map((u) =>
      `<a class="b" href="/sso/oauth/consent?uid=${u.id}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}"><span class="dot" style="background:${u.avatarColor}"></span><b>${u.name}</b><i>${u.role} · ${u.account}</i></a>`).join('');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><title>警院统一认证中心（联调 Mock）</title>
<style>body{font-family:"Microsoft YaHei",system-ui;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0e1526;color:#e7edf7}
.card{width:420px;background:#141d33;border:1px solid #26324d;border-radius:14px;padding:28px 30px}
h1{font-size:19px;margin:0 0 4px}.tip{color:#8fa1c0;font-size:12px;margin:4px 0 18px}
.b{display:flex;align-items:center;gap:10px;padding:11px 12px;border:1px solid #26324d;border-radius:10px;margin-bottom:9px;color:#e7edf7;text-decoration:none;transition:.15s}
.b:hover{border-color:#3f6fff;background:#182540}
.dot{width:10px;height:10px;border-radius:50%;flex:none}.b i{margin-left:auto;font-style:normal;color:#8fa1c0;font-size:12px}</style></head>
<body><div class="card"><h1>警院统一认证中心</h1><p class="tip">OAuth 2.1 授权码模式 · 联调 Mock（生产环境由论坛平台提供本服务）</p><p class="tip">client_id=${CONFIG.sso.clientId} · state=${state || '-'}</p>${rows}</div></body></html>`);
    return;
  }
  if (p === '/sso/oauth/consent' && method === 'GET') {
    const uidv = url.searchParams.get('uid') || '';
    const redirectUri = url.searchParams.get('redirect_uri') || '';
    const state = url.searchParams.get('state') || '';
    const u = userById(uidv);
    if (!u || !redirectUri) return fail(res, 'VALIDATION_ERROR', '授权参数无效', 400);
    const code = crypto.randomBytes(12).toString('hex');
    ssoCodes.set(code, { userId: u.id, redirectUri, exp: Date.now() + 5 * 60000 });
    const joiner = redirectUri.includes('?') ? '&' : '?';
    res.writeHead(302, { Location: `${redirectUri}${joiner}code=${code}&state=${encodeURIComponent(state)}` });
    res.end();
    return;
  }
  if (p === '/sso/oauth/token' && method === 'POST') {
    body(req).then((b) => {
      const rec = ssoCodes.get(b.code || '');
      ssoCodes.delete(b.code || '');
      if (!rec || rec.exp < Date.now()) return fail(res, 'AUTH_REQUIRED', '授权码无效、过期或已使用', 400);
      if ((b.clientId || b.client_id) !== CONFIG.sso.clientId || (b.clientSecret || b.client_secret) !== CONFIG.sso.clientSecret) {
        return fail(res, 'AUTH_REQUIRED', '客户端凭证无效', 401);
      }
      const at = 'at_' + crypto.randomBytes(16).toString('hex');
      const rt = 'rt_' + crypto.randomBytes(16).toString('hex');
      ssoTokens.set(at, { userId: rec.userId, exp: Date.now() + 7200 * 1000 });
      return raw(res, 200, { access_token: at, token_type: 'Bearer', expires_in: 7200, refresh_token: rt, scope: 'openid exam' });
    });
    return;
  }
  if (p === '/sso/oauth/userinfo' && method === 'GET') {
    const at = (req.headers.authorization || '').replace('Bearer ', '');
    const rec = ssoTokens.get(at);
    if (!rec || rec.exp < Date.now()) return fail(res, 'AUTH_TOKEN_EXPIRED', '访问令牌无效或已过期', 401);
    const u = userById(rec.userId);
    if (!u) return fail(res, 'NOT_FOUND', '用户不存在', 404);
    return raw(res, 200, ssoUserInfo(u));
  }
  return fail(res, 'NOT_FOUND', '未知认证端点', 404);
}

/* ---------------- 路由 ---------------- */
function json(res, httpCode, body) {
  const rid = res.rid || crypto.randomUUID().slice(0, 8);
  const data = JSON.stringify(Object.assign({ requestId: rid }, body));
  res.writeHead(httpCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'Access-Control-Expose-Headers': 'X-Request-Id',
    'X-Request-Id': rid,
    'Cache-Control': 'no-store'
  });
  res.end(data);
}
/* §10.1 统一响应：code/message/data/requestId */
const ok = (res, data) => json(res, 200, { code: 'OK', message: 'success', data });
const fail = (res, code, msg, httpCode = 200) => json(res, httpCode, { code, message: msg, data: null });
/* OAuth 协议端点按 RFC 6749 返回原始载荷（不做平台信封，保证与真实认证中心互通） */
const raw = (res, httpCode, body) => {
  const rid = res.rid || crypto.randomUUID().slice(0, 8);
  res.writeHead(httpCode, { 'Content-Type': 'application/json; charset=utf-8', 'X-Request-Id': rid, 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

function body(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

/* ---------------- 静态资源 ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function serveStatic(req, res, pathname) {
  // React Router basename 为 /yj，根路径直接 302 进平台
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(302, { Location: '/yj/login' });
    res.end();
    return true;
  }
  if (!fs.existsSync(DIST)) {
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h3>前端产物缺失</h3><p>请先执行 build-front.bat 生成 dist 目录。</p>');
    return true;
  }
  const rel = decodeURIComponent(pathname).replace(/^\/+/, '');
  let file = path.join(DIST, rel);
  // 防目录穿越
  if (!file.startsWith(DIST)) file = path.join(DIST, 'index.html');
  let stat = null;
  try {
    stat = fs.statSync(file);
  } catch (e) {
    stat = null;
  }
  if (!stat || stat.isDirectory()) {
    // 带扩展名的资源不存在 -> 404；其余当作前端路由，回退 index.html
    const looksLikeAsset = /\.[a-z0-9]{2,5}$/i.test(pathname);
    if (looksLikeAsset && stat === null) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return true;
    }
    file = path.join(DIST, 'index.html');
    try {
      stat = fs.statSync(file);
    } catch (e) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('index.html missing');
      return true;
    }
  }
  const ext = path.extname(file).toLowerCase();
  const etag = `W/"${stat.size}-${Math.floor(stat.mtimeMs)}"`;
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag });
    res.end();
    return true;
  }
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    ETag: etag,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=604800'
  };
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end(), true;
  fs.createReadStream(file).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  let p = url.pathname.replace(/\/$/, '');
  const method = req.method;
  // 同源部署：前端仍按 /yjapi 调用，这里直接剥掉前缀
  if (p === '/yjapi') p = '';
  else if (p.startsWith('/yjapi/')) p = p.slice(6);
  res.rid = crypto.randomUUID().slice(0, 8);
  if (method === 'OPTIONS') return json(res, 204, {});

  /* Mock 认证中心（§7：生产环境由论坛平台提供，本 Mock 仅供联调） */
  if (p.startsWith('/sso/oauth')) return ssoMock(req, res, url, method, p);

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const session = verify(token);
  const expired = !!(session && session.expired);
  const me = session && !session.expired ? userById(session.u) : null;

  // 非接口请求（页面、静态资源）一律走静态托管
  if (!p.startsWith('/api') && (method === 'GET' || method === 'HEAD')) {
    return serveStatic(req, res, url.pathname === '/yjapi' ? '/' : url.pathname);
  }

  try {
    /* ---- 基础 ---- */
    if (p === '/api/v1/health') return ok(res, { ok: true, at: iso(now()) });
    if (p === '/api/v1/meta') {
      return ok(res, {
        title: '警院智慧考试平台',
        subtitle: 'Smart Examination Platform · EXAM-SRS-V1.0',
        appCode: CONFIG.appCode,
        sourcePlatform: CONFIG.sourcePlatform,
        ssoMode: CONFIG.sso.mode,
        statusDict: { draft: '草稿', pending: '待审核', published: '已发布', offline: '已下架', in_progress: '进行中', completed: '已完成', rejected: '已驳回', archived: '已归档', answering: '答题中', submitted: '待阅卷', graded: '成绩已生效', active: '资格有效', revoked: '资格已撤销' },
        permissions: ROLE_PERMISSIONS,
        eventTypes: ['exam.passed', 'exam.failed', 'exam.submitted', 'course.completed'],
        courses: DB.courses,
        chapters: DB.chapters.map((c) => ({ id: c.id, name: c.name, courseId: c.courseId, order: c.order, kps: c.kps })),
        examTypes: [
          { value: 'chapter_quiz', label: '章节随堂测', desc: '章节学习完成后解锁，不发放准入资格' },
          { value: 'skill_exam', label: '专项技能卷', desc: '自主报考，量化专项能力' },
          { value: 'admission_exam', label: '项目准入卷', desc: '工坊任务要求时报考，发放准入资格' }
        ],
        questionTypes: [
          { value: 'single', label: '单选题' },
          { value: 'multiple', label: '多选题' },
          { value: 'judge', label: '判断题' },
          { value: 'blank', label: '填空题' },
          { value: 'essay', label: '简答题' }
        ],
        policy: { passRate: 0.7, groupThreshold: 0.6, aiReviewThreshold: 0.75, admissionMonths: 12, similarity: 0.9 },
        accounts: DB.users.map((u) => ({ account: u.account, name: u.name, role: u.role, dept: u.dept }))
      });
    }

    /* ---- 统一登录（§7：OAuth 2.1 授权码模式；平台不自建账号密码体系、不保存密码） ---- */
    if (p === '/api/v1/sso/url' && method === 'GET') {
      const back = url.searchParams.get('redirect') || '/yj/hall';
      const state = crypto.randomBytes(8).toString('hex');
      ssoStates.set(state, { redirect: back, exp: Date.now() + 10 * 60000 });
      const host = `http://${req.headers.host || '127.0.0.1'}`;
      const redirectUri = `${host}/yj/sso/callback`;
      const qs = `response_type=code&client_id=${encodeURIComponent(CONFIG.sso.clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid&state=${state}`;
      const authorizeUrl = CONFIG.sso.mode === 'mock' ? `/sso/oauth/authorize?${qs}` : `${CONFIG.sso.baseUrl}/oauth/authorize?${qs}`;
      return ok(res, { authorizeUrl, state, redirectUri, mode: CONFIG.sso.mode });
    }
    if (p === '/api/v1/sso/exchange' && method === 'POST') {
      const b = await body(req);
      if (!b.code) return fail(res, 'VALIDATION_ERROR', '缺少授权码 code');
      const st = ssoStates.get(b.state || '');
      if (!st || st.exp < Date.now()) return fail(res, 'AUTH_REQUIRED', '登录状态校验失败（state 无效或已过期）', 401);
      ssoStates.delete(b.state);
      const host = `http://${req.headers.host || '127.0.0.1'}`;
      const tokenResp = await httpJson('POST', `${CONFIG.sso.baseUrl}/oauth/token`, {}, {
        grant_type: 'authorization_code', code: b.code,
        client_id: CONFIG.sso.clientId, client_secret: CONFIG.sso.clientSecret,
        redirect_uri: `${host}/yj/sso/callback`
      });
      if (tokenResp.status === 0) return fail(res, 'SERVICE_UNAVAILABLE', `认证中心不可用：${tokenResp.error || '网络错误'}`);
      if (tokenResp.status !== 200 || !tokenResp.body || !tokenResp.body.access_token) {
        logLine(`sso exchange token 失败 status=${tokenResp.status} body=${JSON.stringify(tokenResp.body).slice(0, 200)} err=${tokenResp.error || ''}`);
        return fail(res, 'AUTH_REQUIRED', '授权码换取令牌失败', 401);
      }
      const uiResp = await httpJson('GET', `${CONFIG.sso.baseUrl}/oauth/userinfo`, { Authorization: `Bearer ${tokenResp.body.access_token}` }, null);
      if (uiResp.status !== 200 || !uiResp.body || !uiResp.body.userId) return fail(res, 'AUTH_REQUIRED', '获取统一用户信息失败', 401);
      const info = uiResp.body;
      let u = userById(info.userId);
      if (!u) {
        u = {
          id: info.userId, account: info.studentNo || info.userId, name: info.realName || info.userId,
          role: (Array.isArray(info.roles) && info.roles[0]) || 'student', dept: '', avatarColor: '#1e5eff',
          completed: [], points: 0, studentNo: info.studentNo || '',
          organizationId: info.organizationId || '', classId: info.classId || ''
        };
        DB.users.push(u);
      }
      setUserPerms(u);
      const accessToken = sign({ u: u.id, exp: Date.now() + 7200 * 1000 });
      const refreshToken = 'lj_rt_' + crypto.randomBytes(16).toString('hex');
      DB.sessions.push({ token: refreshToken, userId: u.id, exp: Date.now() + 7 * 24 * 3600 * 1000, revoked: false, createdAt: iso(now()) });
      if (DB.sessions.length > 200) DB.sessions = DB.sessions.slice(-100);
      audit(u.name, u.role, '统一登录', u.id, `经认证中心（${CONFIG.sso.mode}）建立本地会话`);
      save();
      return ok(res, { accessToken, refreshToken, expiresIn: 7200, user: ssoUserInfo(u), redirect: st.redirect });
    }
    if (p === '/api/v1/sso/refresh' && method === 'POST') {
      const b = await body(req);
      const rec = DB.sessions.find((x) => x.token === b.refreshToken && !x.revoked && x.exp > Date.now());
      if (!rec) return fail(res, 'AUTH_TOKEN_EXPIRED', '续期凭证无效或已过期', 401);
      rec.revoked = true;
      const u = userById(rec.userId);
      if (!u) return fail(res, 'AUTH_TOKEN_EXPIRED', '用户不存在', 401);
      const accessToken = sign({ u: u.id, exp: Date.now() + 7200 * 1000 });
      const refreshToken = 'lj_rt_' + crypto.randomBytes(16).toString('hex');
      DB.sessions.push({ token: refreshToken, userId: u.id, exp: Date.now() + 7 * 24 * 3600 * 1000, revoked: false, createdAt: iso(now()) });
      audit(u.name, u.role, '令牌续期', u.id, '刷新令牌轮换');
      save();
      return ok(res, { accessToken, refreshToken, expiresIn: 7200 });
    }
    if (p === '/api/v1/auth/logout' && method === 'POST') {
      const b = await body(req);
      DB.sessions.forEach((x) => { if (!b.refreshToken || x.token === b.refreshToken) x.revoked = true; });
      if (me) audit(me.name, me.role, '退出登录', me.id, '本地会话已清理，统一退出见 endSessionUrl');
      save();
      const endSessionUrl = CONFIG.sso.mode === 'mock' ? '/yj/login' : `${CONFIG.sso.baseUrl}/protocol/logout`;
      return ok(res, { endSessionUrl });
    }
    if (p === '/api/v1/me') {
      need(me, expired);
      return ok(res, {
        userId: me.id,
        studentNo: me.studentNo || (me.role === 'student' ? me.account : null),
        realName: me.name,
        roles: [me.role],
        permissions: me.permissions || [],
        organizationId: me.organizationId || null,
        classId: me.classId || null,
        account: me.account,
        dept: me.dept,
        avatarColor: me.avatarColor,
        admissions: DB.admissions.filter((a) => a.userId === me.id).length
      });
    }

    /* ---- 考试门户 ---- */
    if (p === '/api/v1/hall') {
      need(me, expired);
      /* 学生端只接收「已发布」考试；草稿/已下架/未通过审核的考试不进入大厅 */
      const list = DB.exams
        .filter((e) => e.status === 'published' && (e.reviewStatus || 'approved') !== 'rejected')
        .map((e) => examCard(e, me.id));
      return ok(res, {
        courses: DB.courses,
        exams: list.sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || ''))),
        stats: {
          available: list.filter((x) => x.unlocked).length,
          done: list.filter((x) => x.bestScore !== null).length,
          admissions: DB.admissions.filter((a) => a.userId === me.id && a.status === 'active').length
        }
      });
    }

    let m = p.match(/^\/api\/v1\/exams\/([\w-]+)$/);
    if (m && method === 'GET') {
      need(me, expired);
      const exam = examById(m[1]);
      if (!exam) return fail(res, 'NOT_FOUND', '考试不存在');
      const paper = paperById(exam.paperId);
      const card = examCard(exam, me.id);
      const history = attemptsOf(me.id).filter((a) => a.examId === exam.id).map(attemptBrief);
      const typeDist = {};
      const groupCounts = {};
      paper.items.forEach((it) => {
        const q = DB.questions.find((x) => x.id === it.qid);
        typeDist[q.type] = (typeDist[q.type] || 0) + 1;
        groupCounts[it.group] = (groupCounts[it.group] || 0) + 1;
      });
      return ok(res, {
        ...card,
        paperDesc: paper.paperDesc,
        typeDist,
        groupCounts,
        passLine: round1(paper.totalScore * paper.passRate),
        rules: {
          allowBacktrack: exam.allowBacktrack,
          shuffleQuestion: exam.shuffleQuestion,
          shuffleOption: exam.shuffleOption,
          cheatLevel: exam.cheatLevel,
          answerPolicy: exam.answerPolicy,
          partialScore: true,
          retryLimit: '不限次数，取历次最高分'
        },
        history
      });
    }

    m = p.match(/^\/api\/v1\/exams\/([\w-]+)\/attempts$/);
    if (m && method === 'POST') {
      need(me, expired);
      const exam = examById(m[1]);
      if (!exam) return fail(res, 'NOT_FOUND', '考试不存在');
      const un = unlockState(exam, me.id);
      if (!un.unlocked) return fail(res, 'BUSINESS_ERROR', un.reason);
      const exists = DB.attempts.find((a) => a.examId === exam.id && a.userId === me.id && a.status === 'answering');
      if (exists) return ok(res, { attemptId: exists.id, resumed: true });
      const paper = paperById(exam.paperId);
      const seedNum = Math.floor(Math.random() * 9999) + 1;
      let snap = snapshotOf(paper, seedNum);
      if (exam.shuffleQuestion) snap = seededShuffle(snap, seedNum);
      const started = now();
      const att = {
        id: uid('att'),
        createdAt: iso(started),
        createdBy: me.id,
        examId: exam.id,
        paperId: paper.id,
        userId: me.id,
        status: 'answering',
        startedAt: iso(started),
        deadlineAt: iso(new Date(started.getTime() + exam.duration * 60000)),
        submittedAt: null,
        snapshot: snap,
        answers: {},
        seed: seedNum,
        events: [],
        reviews: []
      };
      DB.attempts.push(att);
      audit(me.name, me.role, '开始考试', att.id, `进入「${exam.title}」`);
      save();
      return ok(res, { attemptId: att.id, deadlineAt: att.deadlineAt, resumed: false });
    }

    m = p.match(/^\/api\/v1\/attempts\/([\w-]+)$/);
    if (m && method === 'GET') {
      need(me, expired);
      const a = DB.attempts.find((x) => x.id === m[1]);
      if (!a) return fail(res, 'NOT_FOUND', '答卷不存在');
      if (a.userId !== me.id && me.role === 'student') return fail(res, 'FORBIDDEN', '不可访问他人答卷', 403);
      const exam = examById(a.examId);
      const remain = Math.max(0, Math.round((new Date(a.deadlineAt) - now()) / 1000));
      return ok(res, {
        id: a.id,
        examId: a.examId,
        examTitle: exam.title,
        status: a.status,
        deadlineAt: a.deadlineAt,
        remainSeconds: a.status === 'answering' ? remain : 0,
        allowBacktrack: exam.allowBacktrack,
        events: a.events,
        answers: a.answers,
        groups: (paperById(a.paperId).groups || []).map((g) => ({ id: g.id, name: g.name })),
        questions: a.snapshot.map((q) => ({
          qid: q.qid,
          type: q.type,
          stem: q.stem,
          options: optionList(q),
          score: q.score,
          group: q.group,
          blankCount: Array.isArray(q.answer) ? q.answer.length : 1
        }))
      });
    }

    m = p.match(/^\/api\/v1\/attempts\/([\w-]+)\/answers$/);
    if (m && method === 'PATCH') {
      need(me, expired);
      const a = DB.attempts.find((x) => x.id === m[1]);
      if (!a || a.userId !== me.id) return fail(res, 'FORBIDDEN', '不可保存他人答卷', 403);
      if (a.status !== 'answering') return fail(res, 'CONFLICT', '答卷已提交');
      const b = await body(req);
      Object.assign(a.answers, b.answers || {});
      a.updatedAt = iso(now());
      a.updatedBy = me.id;
      save();
      return ok(res, { savedAt: iso(now()), count: Object.keys(a.answers).length });
    }

    m = p.match(/^\/api\/v1\/attempts\/([\w-]+)\/events$/);
    if (m && method === 'POST') {
      need(me, expired);
      const a = DB.attempts.find((x) => x.id === m[1]);
      if (!a) return fail(res, 'NOT_FOUND', '答卷不存在');
      const b = await body(req);
      const list = Array.isArray(b.events) ? b.events : [b];
      list.forEach((e) => a.events.push({ type: e.type, at: iso(now()), detail: e.detail || '' }));
      save();
      return ok(res, { count: a.events.length });
    }

    m = p.match(/^\/api\/v1\/attempts\/([\w-]+)\/submit$/);
    if (m && method === 'POST') {
      need(me, expired);
      const a = DB.attempts.find((x) => x.id === m[1]);
      if (!a) return fail(res, 'NOT_FOUND', '答卷不存在');
      if (a.status !== 'answering') return ok(res, { alreadySubmitted: true, attemptId: a.id });
      const b = await body(req);
      if (b && b.answers) Object.assign(a.answers, b.answers);
      const paper = paperById(a.paperId);
      const exam = examById(a.examId);
      const result = gradeAttempt(paper, a.snapshot, a.answers);
      Object.assign(a, {
        status: 'submitted',
        submittedAt: iso(now()),
        objectiveScore: result.objective,
        essayScore: result.essay,
        totalScore: result.total,
        groups: result.groups,
        dualPass: result.dualPass,
        totalPassed: result.totalPassed,
        failReason: result.failReason,
        failType: result.failType,
        level: result.level,
        details: result.details
      });
      DB.events.push({ id: uid('ev'), event: 'exam.submitted', at: iso(now()), payload: { attemptId: a.id, examId: exam.id, userId: a.userId } });
      audit(me.name, me.role, '提交答卷', a.id, `「${exam.title}」客观题 ${result.objective} 分`);
      // 无简答题则直接生效
      const hasEssay = a.snapshot.some((q) => q.type === 'essay');
      if (!hasEssay) {
        a.status = 'graded';
        a.updatedAt = iso(now());
        a.updatedBy = me.id;
        let adm = null;
        if (result.dualPass && exam.type !== 'chapter_quiz') { const r = issueAdmission(a, exam); adm = r.admission; }
        emitBusiness(result.dualPass ? 'exam.passed' : 'exam.failed', me.id, {
          attemptId: a.id, examId: exam.id, examType: exam.type, userId: a.userId,
          totalScore: result.total, dualPass: result.dualPass, admissionId: adm ? adm.id : null
        });
      }
      save();
      return ok(res, {
        attemptId: a.id,
        objectiveScore: result.objective,
        totalScore: result.total,
        status: a.status,
        needReview: hasEssay,
        message: hasEssay ? '简答题已进入 AI 初评与教师确认队列' : '成绩已生效'
      });
    }

    m = p.match(/^\/api\/v1\/attempts\/([\w-]+)\/result$/);
    if (m && method === 'GET') {
      need(me, expired);
      const a = DB.attempts.find((x) => x.id === m[1]);
      if (!a) return fail(res, 'NOT_FOUND', '答卷不存在');
      const exam = examById(a.examId);
      const paper = paperById(a.paperId);
      const graded = a.status === 'graded';
      const policy = exam.answerPolicy;
      const canSeeAnswer = graded || policy === 'after_submit';
      const admission = DB.admissions.find((x) => x.attemptId === a.id);
      return ok(res, {
        id: a.id,
        examId: a.examId,
        examTitle: exam.title,
        examType: exam.type,
        paperTitle: paper.title,
        status: a.status,
        submittedAt: a.submittedAt,
        totalScore: a.totalScore,
        objectiveScore: a.objectiveScore,
        essayScore: a.essayScore,
        passLine: round1(paper.totalScore * paper.passRate),
        totalPassed: a.totalPassed,
        dualPass: graded ? a.dualPass : null,
        estimateDualPass: a.dualPass,
        failReason: graded ? a.failReason : '简答题待教师确认，成绩尚未生效',
        failType: a.failType,
        level: a.level,
        groups: a.groups,
        events: a.events,
        admission: admission || null,
        canSeeAnswer,
        answersLocked: !canSeeAnswer,
        details: a.details.map((d) => {
          const snap = a.snapshot.find((s) => s.qid === d.qid);
          return {
            qid: d.qid,
            type: d.type,
            stem: snap.stem,
            options: optionList(snap),
            score: d.score,
            awarded: d.awarded,
            group: d.group,
            groupName: (a.groups || []).find((g) => g.id === d.group)?.name || '',
            answer: canSeeAnswer ? snap.answer : null,
            analysis: canSeeAnswer ? snap.analysis : null,
            myAnswer: d.answer,
            ai: d.ai || null,
            review: (a.reviews || []).find((r) => r.qid === d.qid) || null,
            chapterId: snap.chapterId,
            kp: snap.kp
          };
        })
      });
    }

    if (p === '/api/v1/records') {
      need(me, expired);
      const rows = attemptsOf(me.id).slice()
        .sort((a, b) => ((a.submittedAt || a.startedAt) < (b.submittedAt || b.startedAt) ? 1 : -1))
        .map(attemptBrief);
      return ok(res, paginate(rows, url));
    }

    /* ---- 错题本 ---- */
    if (p === '/api/v1/wrong-book') {
      need(me, expired);
      const map = new Map();
      attemptsOf(me.id)
        .filter((a) => a.status === 'graded')
        .forEach((a) => {
          (a.details || []).forEach((d) => {
            if (d.type === 'essay') return;
            if (d.level === 'full') return;
            const snap = a.snapshot.find((s) => s.qid === d.qid);
            const key = d.qid;
            const prev = map.get(key);
            const item = {
              qid: d.qid,
              stem: snap.stem,
              type: d.type,
              options: snap.options,
              answer: snap.answer,
              analysis: snap.analysis,
              myAnswer: d.answer,
              kp: snap.kp,
              chapterId: snap.chapterId,
              chapterName: (DB.chapters.find((c) => c.id === snap.chapterId) || {}).name || '',
              courseId: snap.courseId || (DB.chapters.find((c) => c.id === snap.chapterId) || {}).courseId,
              wrongCount: (prev ? prev.wrongCount : 0) + 1,
              lastAt: a.submittedAt,
              mastered: prev ? prev.mastered : false
            };
            map.set(key, item);
          });
        });
      // 已掌握状态持久化在 users 上
      const mastered = (me.masteredWrong || []);
      const allKps = DB.chapters.flatMap((c) => c.kps);
      const list = [...map.values()].map((x) => ({
        ...x,
        mastered: mastered.includes(x.qid),
        kpNames: (x.kp || []).map((k) => (allKps.find((y) => y.id === k) || {}).name || k)
      }));
      const kpStat = {};
      list.forEach((x) => (x.kp || []).forEach((k) => (kpStat[k] = (kpStat[k] || 0) + 1)));
      return ok(res, {
        list: list.sort((a, b) => b.wrongCount - a.wrongCount),
        kpStat: Object.entries(kpStat).map(([id, n]) => ({
          id, n, name: (DB.chapters.flatMap((c) => c.kps).find((k) => k.id === id) || {}).name || id
        })).sort((a, b) => b.n - a.n)
      });
    }
    if (p === '/api/v1/wrong-book/master' && method === 'POST') {
      need(me, expired);
      const b = await body(req);
      me.masteredWrong = me.masteredWrong || [];
      if (b.mastered) {
        if (!me.masteredWrong.includes(b.qid)) me.masteredWrong.push(b.qid);
      } else {
        me.masteredWrong = me.masteredWrong.filter((x) => x !== b.qid);
      }
      save();
      return ok(res, { qid: b.qid, mastered: !!b.mastered });
    }

    /* ---- 准入资格 ---- */
    if (p === '/api/v1/admissions') {
      need(me, expired, 'admission:read');
      const rows = DB.admissions
        .filter((a) => (me.role === 'student' ? a.userId === me.id : true))
        .map((a) => ({ ...a, expired: new Date(a.expireAt) < now(), examType: (examById(a.examId) || {}).type }))
        .sort((x, y) => (x.expireAt < y.expireAt ? 1 : -1));
      return ok(res, paginate(rows, url));
    }

    /* ---- 课程与章节（命题原料） ---- */
    if (p === '/api/v1/courses') {
      need(me, expired, 'course:read');
      const rows = DB.courses.map((c) => ({
        ...c,
        chapterCount: DB.chapters.filter((x) => x.courseId === c.id).length,
        questionCount: DB.questions.filter((q) => q.courseId === c.id).length
      }));
      return ok(res, paginate(rows, url));
    }
    m = p.match(/^\/api\/v1\/chapters\/([\w-]+)$/);
    if (m) {
      need(me, expired, 'chapter:read');
      const ch = DB.chapters.find((c) => c.id === m[1]);
      if (!ch) return fail(res, 'NOT_FOUND', '章节不存在');
      return ok(res, {
        ...ch,
        kpStats: ch.kps.map((k) => ({ ...k, questionCount: DB.questions.filter((q) => q.kp.includes(k.id)).length })),
        questionCount: DB.questions.filter((q) => q.chapterId === ch.id).length
      });
    }

    /* ---- AI 命题 ---- */
    if (p === '/api/v1/ai/jobs' && method === 'POST') {
      need(me, expired, 'question:create');
      const b = await body(req);
      const ch = DB.chapters.find((c) => c.id === b.chapterId);
      if (!ch) return fail(res, 'NOT_FOUND', '章节不存在');
      const params = {
        count: Math.min(20, Math.max(3, Number(b.count) || 12)),
        typeRatio: b.typeRatio || { single: 50, multiple: 20, judge: 15, blank: 10, essay: 5 },
        difficultyRatio: b.difficultyRatio || { easy: 40, medium: 40, hard: 20 },
        kpIds: b.kpIds && b.kpIds.length ? b.kpIds : ch.kps.map((k) => k.id)
      };
      const job = {
        id: uid('job'),
        chapterId: ch.id,
        courseId: ch.courseId,
        params,
        createdAt: iso(now()),
        createdBy: me.id,
        candidates: [],
        status: 'running'
      };
      const kps = ch.kps.filter((k) => params.kpIds.includes(k.id));
      job.candidates = genCandidates(ch, kps.length ? kps : ch.kps, params).map((c) => ({
        ...c,
        trace: { ...c.trace, jobId: job.id }
      }));
      DB.jobs.unshift(job);
      audit(me.name, me.role, 'AI 命题', job.id, `「${ch.name}」生成 ${job.candidates.length} 题`);
      save();
      return ok(res, { jobId: job.id });
    }
    if (p === '/api/v1/ai/jobs' && method === 'GET') {
      need(me, expired, 'job:manage');
      const jobRows = DB.jobs.map((j) => ({
        id: j.id,
        chapterName: (DB.chapters.find((c) => c.id === j.chapterId) || {}).name,
        createdAt: j.createdAt,
        // 历史任务可能因提前中断仍停留在 running，按已耗时长重新判定，避免列表永久显示“进行中”
        status: jobProgress(j).done ? 'completed' : 'in_progress',
        count: j.candidates.length,
        approved: j.candidates.filter((c) => c.review === 'approved').length
      }));
      return ok(res, paginate(jobRows, url));
    }
    m = p.match(/^\/api\/v1\/ai\/jobs\/([\w-]+)$/);
    if (m) {
      need(me, expired, 'job:manage');
      const job = DB.jobs.find((j) => j.id === m[1]);
      if (!job) return fail(res, 'NOT_FOUND', '任务不存在');
      const ch = DB.chapters.find((c) => c.id === job.chapterId);
      const prog = jobProgress(job);
      if (prog.done) job.status = 'done';
      if (!prog.done) {
        return ok(res, { id: job.id, status: 'in_progress', progress: prog, chapter: { id: ch.id, name: ch.name }, candidates: [] });
      }
      return ok(res, {
        id: job.id,
        status: jobStatusOut(job),
        progress: prog,
        chapter: { id: ch.id, name: ch.name, body: ch.body, kps: ch.kps },
        params: job.params,
        candidates: job.candidates
      });
    }
    m = p.match(/^\/api\/v1\/ai\/jobs\/([\w-]+)\/review$/);
    if (m && method === 'POST') {
      need(me, expired, 'question:review');
      const job = DB.jobs.find((j) => j.id === m[1]);
      if (!job) return fail(res, 'NOT_FOUND', '任务不存在');
      const b = await body(req);
      const approveIds = b.approve || [];
      const reject = b.reject || [];
      let created = 0;
      approveIds.forEach((cid) => {
        const c = job.candidates.find((x) => x.id === cid);
        if (!c) return;
        if (DB.questions.some((q) => q.stem === c.stem)) return;
        const q = {
          id: uid('q'),
          type: c.type,
          courseId: job.courseId,
          chapterId: job.chapterId,
          kp: c.kp,
          stem: c.stem,
          options: c.options,
          answer: c.answer,
          analysis: c.analysis,
          difficulty: c.difficulty,
          score: c.score,
          scorePoints: c.scorePoints,
          sourceType: 'ai',
          sourceJobId: job.id,
          bank: 'ai',            // 归档去向：AI 题库
          origin: 'ai_workbench', // 来源链路：AI 命题工作台审核入库
          trace: c.trace,        // 正文溯源：课程/章节/正文哈希/任务/模型
          fromBody: c.fromBody,
          status: 'published',
          reviewedBy: me.name,
          reviewedById: me.id,
          reviewedAt: iso(now()),
          stats: { attempts: 0, correct: 0 },
          createdAt: iso(now()),
          updatedAt: iso(now()),
          createdBy: me.id,
          updatedBy: me.id
        };
        DB.questions.push(q);
        c.review = 'approved';
        c.questionId = q.id;
        created += 1;
      });
      reject.forEach((r) => {
        const c = job.candidates.find((x) => x.id === (r.id || r));
        if (c) {
          c.review = 'rejected';
          c.rejectReason = r.reason || '教师淘汰';
        }
      });
      job.status = 'reviewed';
      audit(me.name, me.role, '题目审核', job.id, `通过 ${created} 题，淘汰 ${reject.length} 题`);
      save();
      return ok(res, { created, rejected: reject.length });
    }

    /* ---- 题库 ---- */
    if (p === '/api/v1/questions') {
      need(me, expired, 'question:read');
      const type = url.searchParams.get('type');
      const kw = url.searchParams.get('kw');
      let list = DB.questions.slice();
      if (type) list = list.filter((q) => q.type === type);
      if (kw) list = list.filter((q) => q.stem.includes(kw));
      const rows = list.map((q) => ({
        ...q,
        chapterName: (DB.chapters.find((c) => c.id === q.chapterId) || {}).name,
        kpNames: (q.kp || []).map((k) => (DB.chapters.flatMap((c) => c.kps).find((x) => x.id === k) || {}).name || k)
      }));
      return ok(res, paginate(rows, url));
    }

    /* ---- AI 题库（仅收录 AI 命题工作台审核通过的题目） ---- */
    const aiBankQuestions = () => DB.questions.filter((q) => q.bank === 'ai' || (q.sourceType === 'ai' && q.sourceJobId));
    const kpNameOf = (id) => (DB.chapters.flatMap((c) => c.kps).find((x) => x.id === id) || {}).name || id;

    if (p === '/api/v1/ai-bank/summary' && method === 'GET') {
      need(me, expired, 'question:read');
      const list = aiBankQuestions();
      const countBy = (fn) => list.reduce((acc, q) => {
        const k = fn(q) || 'unknown';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});
      const byStatus = countBy((q) => q.status || 'published');
      return ok(res, {
        total: list.length,
        byStatus: { published: byStatus.published || 0, offline: byStatus.offline || 0, archived: byStatus.archived || 0 },
        byType: countBy((q) => q.type),
        byDifficulty: countBy((q) => q.difficulty),
        jobs: new Set(list.map((q) => q.sourceJobId)).size,
        courses: DB.courses.map((c) => ({ id: c.id, name: c.name, count: list.filter((q) => q.courseId === c.id).length })),
        latestAt: list.reduce((t, q) => (String(q.createdAt) > t ? String(q.createdAt) : t), '')
      });
    }
    if (p === '/api/v1/ai-bank/questions' && method === 'GET') {
      need(me, expired, 'question:read');
      const qp = (k) => (url.searchParams.get(k) || '').trim();
      const courseId = qp('courseId');
      const chapterId = qp('chapterId');
      const kpId = qp('kpId');
      const type = qp('type');
      const difficulty = qp('difficulty');
      const status = qp('status');
      const kw = qp('kw');
      let list = aiBankQuestions().slice();
      if (courseId) list = list.filter((q) => q.courseId === courseId);
      if (chapterId) list = list.filter((q) => q.chapterId === chapterId);
      if (kpId) list = list.filter((q) => (q.kp || []).includes(kpId));
      if (type) list = list.filter((q) => q.type === type);
      if (difficulty) list = list.filter((q) => q.difficulty === difficulty);
      if (status) list = list.filter((q) => (q.status || 'published') === status);
      if (kw) list = list.filter((q) => q.stem.includes(kw) || String(q.analysis || '').includes(kw));
      list.sort((a, b) => (String(a.createdAt) < String(b.createdAt) ? 1 : -1));
      const rows = list.map((q) => ({
        ...q,
        courseName: (DB.courses.find((c) => c.id === q.courseId) || {}).name || '',
        chapterName: (DB.chapters.find((c) => c.id === q.chapterId) || {}).name || '',
        kpNames: (q.kp || []).map(kpNameOf),
        status: q.status || 'published',
        // 早期入库的题目未落 trace，这里按章节正文补算，保证溯源信息始终可查
        trace: q.trace || (() => {
          const ch = DB.chapters.find((c) => c.id === q.chapterId);
          if (!ch) return null;
          return {
            courseId: ch.courseId,
            chapterId: ch.id,
            chapterName: ch.name,
            bodyHash: crypto.createHash('md5').update(ch.body.join('')).digest('hex').slice(0, 12),
            jobId: q.sourceJobId || '',
            model: 'yj-local-generator-v1'
          };
        })()
      }));
      return ok(res, paginate(rows, url));
    }
    m = p.match(/^\/api\/v1\/ai-bank\/questions\/([\w-]+)\/status$/);
    if (m && method === 'POST') {
      need(me, expired, 'question:review');
      const q = DB.questions.find((x) => x.id === m[1] && (x.bank === 'ai' || x.sourceType === 'ai'));
      if (!q) return fail(res, 'NOT_FOUND', '题目不存在或不属于 AI 题库');
      const b = await body(req);
      const allow = ['published', 'offline', 'archived'];
      if (!allow.includes(b.status)) return fail(res, 'VALIDATION_ERROR', `status 仅支持 ${allow.join(' / ')}`);
      q.status = b.status;
      q.updatedAt = iso(now());
      q.updatedBy = me.id;
      audit(me.name, me.role, 'AI 题库维护', q.id, `「${q.stem.slice(0, 24)}」状态调整为 ${b.status}`);
      save();
      return ok(res, { id: q.id, status: q.status });
    }

    /* ---- 文档库：题目增删改（管理员） ---- */
    if (p === '/api/v1/ai-bank/questions' && method === 'POST') {
      need(me, expired, 'bank:manage');
      const b = await body(req);
      const ch = DB.chapters.find((c) => c.id === b.chapterId);
      if (!ch) return fail(res, 'VALIDATION_ERROR', '请选择有效的章节');
      const type = ['single', 'multiple', 'judge', 'blank', 'essay'].includes(b.type) ? b.type : 'single';
      const stem = String(b.stem || '').trim();
      if (!stem) return fail(res, 'VALIDATION_ERROR', '题干不能为空');
      let options = (Array.isArray(b.options) ? b.options : []).filter((o) => o && o.id && String(o.content || '').trim());
      const answer = b.answer;
      if (type === 'single' || type === 'multiple') {
        if (options.length < 2) return fail(res, 'VALIDATION_ERROR', '选择题至少需要 2 个选项');
        const ok = type === 'single' ? options.some((o) => o.id === answer) : Array.isArray(answer) && answer.every((a) => options.some((o) => o.id === a));
        if (!ok) return fail(res, 'VALIDATION_ERROR', '正确答案必须是选项之一');
      } else {
        options = [];
      }
      if (type === 'judge' && !['T', 'F'].includes(answer)) return fail(res, 'VALIDATION_ERROR', '判断题答案只能是 T / F');
      if (type === 'essay' && answer != null) return fail(res, 'VALIDATION_ERROR', '简答题不需要预设答案');
      const kp = (Array.isArray(b.kp) ? b.kp : []).filter((id) => ch.kps.some((k) => k.id === id));
      const q = {
        id: uid('q'),
        type,
        courseId: ch.courseId,
        chapterId: ch.id,
        kp,
        stem,
        options,
        answer: type === 'essay' ? null : type === 'blank' ? (Array.isArray(answer) ? answer : [[String(answer || '').trim()]]) : answer,
        analysis: String(b.analysis || ''),
        difficulty: ['easy', 'medium', 'hard'].includes(b.difficulty) ? b.difficulty : 'medium',
        score: Number(b.score) > 0 ? Number(b.score) : 5,
        scorePoints: [],
        sourceType: 'manual',
        bank: 'ai',
        origin: 'doclib_manual',
        status: 'published',
        stats: { attempts: 0, correct: 0 },
        trace: {
          courseId: ch.courseId,
          chapterId: ch.id,
          chapterName: ch.name,
          bodyHash: crypto.createHash('md5').update((ch.body || []).join('')).digest('hex').slice(0, 12),
          jobId: '',
          model: 'manual-entry'
        },
        createdAt: iso(now()),
        updatedAt: iso(now()),
        createdBy: me.id,
        updatedBy: me.id
      };
      DB.questions.push(q);
      audit(me.name, me.role, '题目新增', q.id, `手工录入「${q.stem.slice(0, 24)}」`);
      save();
      return ok(res, q);
    }
    m = p.match(/^\/api\/v1\/ai-bank\/questions\/([\w-]+)$/);
    if (m && method === 'PATCH') {
      need(me, expired, 'bank:manage');
      const q = DB.questions.find((x) => x.id === m[1] && (x.bank === 'ai' || x.sourceType === 'ai'));
      if (!q) return fail(res, 'NOT_FOUND', '题目不存在或不属于本库');
      const b = await body(req);
      const type = b.type && ['single', 'multiple', 'judge', 'blank', 'essay'].includes(b.type) ? b.type : q.type;
      if (b.stem !== undefined) {
        if (!String(b.stem).trim()) return fail(res, 'VALIDATION_ERROR', '题干不能为空');
        q.stem = String(b.stem).trim();
      }
      if (b.chapterId && b.chapterId !== q.chapterId) {
        const ch = DB.chapters.find((c) => c.id === b.chapterId);
        if (!ch) return fail(res, 'VALIDATION_ERROR', '章节不存在');
        q.chapterId = ch.id;
        q.courseId = ch.courseId;
      }
      const ch = DB.chapters.find((c) => c.id === q.chapterId);
      q.type = type;
      if (b.options !== undefined) q.options = (Array.isArray(b.options) ? b.options : []).filter((o) => o && o.id && String(o.content || '').trim());
      if (type !== 'single' && type !== 'multiple') q.options = [];
      if ((type === 'single' || type === 'multiple') && q.options.length < 2) return fail(res, 'VALIDATION_ERROR', '选择题至少需要 2 个选项');
      if (b.answer !== undefined) q.answer = b.answer;
      if (type === 'essay') q.answer = null;
      if (type === 'judge' && !['T', 'F'].includes(q.answer)) return fail(res, 'VALIDATION_ERROR', '判断题答案只能是 T / F');
      if (type === 'single' && !q.options.some((o) => o.id === q.answer)) return fail(res, 'VALIDATION_ERROR', '正确答案必须是选项之一');
      if (b.difficulty && ['easy', 'medium', 'hard'].includes(b.difficulty)) q.difficulty = b.difficulty;
      if (b.score !== undefined && Number(b.score) > 0) q.score = Number(b.score);
      if (b.analysis !== undefined) q.analysis = String(b.analysis || '');
      if (b.status && ['published', 'offline', 'archived'].includes(b.status)) q.status = b.status;
      if (Array.isArray(b.kp) && ch) q.kp = b.kp.filter((id) => ch.kps.some((k) => k.id === id));
      q.updatedAt = iso(now());
      q.updatedBy = me.id;
      audit(me.name, me.role, '题目修改', q.id, `更新「${q.stem.slice(0, 24)}」`);
      save();
      return ok(res, q);
    }
    if (m && method === 'DELETE') {
      need(me, expired, 'bank:manage');
      const idx = DB.questions.findIndex((x) => x.id === m[1] && (x.bank === 'ai' || x.sourceType === 'ai'));
      if (idx < 0) return fail(res, 'NOT_FOUND', '题目不存在或不属于本库');
      const [gone] = DB.questions.splice(idx, 1);
      audit(me.name, me.role, '题目删除', gone.id, `删除「${gone.stem.slice(0, 24)}」`);
      save();
      return ok(res, { id: gone.id, deleted: true });
    }

    /* ---- 文档库：分类维护（管理员） ---- */
    if (p === '/api/v1/catalog' && method === 'GET') {
      need(me, expired, 'doclib:read');
      const rows = DB.courses.map((c) => {
        const chapters = DB.chapters.filter((x) => x.courseId === c.id).sort((a, b) => (a.order || 0) - (b.order || 0));
        return {
          id: c.id,
          name: c.name,
          code: c.code || '',
          questionCount: DB.questions.filter((q) => q.courseId === c.id).length,
          chapterCount: chapters.length,
          chapters: chapters.map((ch) => ({
            id: ch.id,
            name: ch.name,
            order: ch.order || 0,
            questionCount: DB.questions.filter((q) => q.chapterId === ch.id).length,
            kps: (ch.kps || []).map((k) => ({
              ...k,
              questionCount: DB.questions.filter((q) => (q.kp || []).includes(k.id)).length
            }))
          }))
        };
      });
      return ok(res, { courses: rows });
    }
    /* §3 职责边界：课程 / 章节 / 知识点由自学平台维护，考试平台只读引用。
       原分类维护写接口已按规范下线，保留 GET 供组卷与命题读取（§11.1 通过公开 API 查询）。 */
    if (/^\/api\/v1\/catalog(\/|$)/.test(p) && method !== 'GET') {
      return fail(res, 'FORBIDDEN', '课程目录由自学平台维护，考试平台只读引用，不提供分类维护', 403);
    }
    if (p === '/api/v1/catalog/courses' && method === 'POST') {
      need(me, expired, 'catalog:manage');
      const b = await body(req);
      const name = String(b.name || '').trim();
      if (!name) return fail(res, 'VALIDATION_ERROR', '学科名称不能为空');
      if (DB.courses.some((c) => c.name === name)) return fail(res, 'VALIDATION_ERROR', '同名学科已存在');
      const c = {
        id: uid('c'),
        name,
        code: String(b.code || '').trim() || `C${DB.courses.length + 1}`,
        teacher: me.id,
        term: b.term || '2026 秋',
        catalog: b.catalog || '数据警务学院',
        createdAt: iso(now()),
        updatedAt: iso(now()),
        createdBy: me.id,
        updatedBy: me.id
      };
      DB.courses.push(c);
      audit(me.name, me.role, '分类维护', c.id, `新增学科「${name}」`);
      save();
      return ok(res, c);
    }
    m = p.match(/^\/api\/v1\/catalog\/courses\/([\w-]+)$/);
    if (m && method === 'PATCH') {
      need(me, expired, 'catalog:manage');
      const c = DB.courses.find((x) => x.id === m[1]);
      if (!c) return fail(res, 'NOT_FOUND', '学科不存在');
      const b = await body(req);
      if (b.name !== undefined) {
        const name = String(b.name).trim();
        if (!name) return fail(res, 'VALIDATION_ERROR', '学科名称不能为空');
        c.name = name;
      }
      if (b.code !== undefined) c.code = String(b.code);
      c.updatedAt = iso(now());
      c.updatedBy = me.id;
      audit(me.name, me.role, '分类维护', c.id, `修改学科「${c.name}」`);
      save();
      return ok(res, c);
    }
    if (m && method === 'DELETE') {
      need(me, expired, 'catalog:manage');
      const c = DB.courses.find((x) => x.id === m[1]);
      if (!c) return fail(res, 'NOT_FOUND', '学科不存在');
      const chapters = DB.chapters.filter((x) => x.courseId === c.id);
      const qCount = DB.questions.filter((q) => q.courseId === c.id).length;
      const examCount = DB.exams.filter((e) => (e.courseId || '') === c.id).length;
      if (chapters.length || qCount || examCount) {
        return fail(res, 'VALIDATION_ERROR', `该学科下仍有 ${chapters.length} 个章节、${qCount} 道题目、${examCount} 场考试，无法删除`);
      }
      DB.courses = DB.courses.filter((x) => x.id !== c.id);
      audit(me.name, me.role, '分类维护', c.id, `删除学科「${c.name}」`);
      save();
      return ok(res, { id: c.id, deleted: true });
    }
    if (p === '/api/v1/catalog/chapters' && method === 'POST') {
      need(me, expired, 'catalog:manage');
      const b = await body(req);
      const c = DB.courses.find((x) => x.id === b.courseId);
      if (!c) return fail(res, 'VALIDATION_ERROR', '请选择有效的学科');
      const name = String(b.name || '').trim();
      if (!name) return fail(res, 'VALIDATION_ERROR', '章节名称不能为空');
      const ch = {
        id: uid('ch'),
        courseId: c.id,
        order: DB.chapters.filter((x) => x.courseId === c.id).length + 1,
        name,
        kps: [],
        body: [],
        createdAt: iso(now()),
        updatedAt: iso(now()),
        createdBy: me.id,
        updatedBy: me.id
      };
      DB.chapters.push(ch);
      audit(me.name, me.role, '分类维护', ch.id, `新增章节「${c.name} / ${name}」`);
      save();
      return ok(res, ch);
    }
    m = p.match(/^\/api\/v1\/catalog\/chapters\/([\w-]+)$/);
    if (m && method === 'PATCH') {
      need(me, expired, 'catalog:manage');
      const ch = DB.chapters.find((x) => x.id === m[1]);
      if (!ch) return fail(res, 'NOT_FOUND', '章节不存在');
      const b = await body(req);
      if (b.name !== undefined) {
        const name = String(b.name).trim();
        if (!name) return fail(res, 'VALIDATION_ERROR', '章节名称不能为空');
        ch.name = name;
      }
      if (b.courseId !== undefined) {
        const c = DB.courses.find((x) => x.id === b.courseId);
        if (!c) return fail(res, 'VALIDATION_ERROR', '学科不存在');
        ch.courseId = c.id;
      }
      ch.updatedAt = iso(now());
      ch.updatedBy = me.id;
      audit(me.name, me.role, '分类维护', ch.id, `修改章节「${ch.name}」`);
      save();
      return ok(res, ch);
    }
    if (m && method === 'DELETE') {
      need(me, expired, 'catalog:manage');
      const ch = DB.chapters.find((x) => x.id === m[1]);
      if (!ch) return fail(res, 'NOT_FOUND', '章节不存在');
      const qCount = DB.questions.filter((q) => q.chapterId === ch.id).length;
      if (qCount) return fail(res, 'VALIDATION_ERROR', `该章节下仍有 ${qCount} 道题目，无法删除`);
      DB.chapters = DB.chapters.filter((x) => x.id !== ch.id);
      audit(me.name, me.role, '分类维护', ch.id, `删除章节「${ch.name}」`);
      save();
      return ok(res, { id: ch.id, deleted: true });
    }
    if (p === '/api/v1/catalog/kps' && method === 'POST') {
      need(me, expired, 'catalog:manage');
      const b = await body(req);
      const ch = DB.chapters.find((x) => x.id === b.chapterId);
      if (!ch) return fail(res, 'VALIDATION_ERROR', '请选择有效的章节');
      const name = String(b.name || '').trim();
      if (!name) return fail(res, 'VALIDATION_ERROR', '知识点名称不能为空');
      const kp = { id: uid('kp'), name, brief: String(b.brief || '').trim() || name };
      ch.kps = ch.kps || [];
      ch.kps.push(kp);
      ch.updatedAt = iso(now());
      ch.updatedBy = me.id;
      audit(me.name, me.role, '分类维护', kp.id, `新增知识点「${ch.name} / ${name}」`);
      save();
      return ok(res, kp);
    }
    m = p.match(/^\/api\/v1\/catalog\/kps\/([\w-]+)$/);
    if (m && method === 'PATCH') {
      need(me, expired, 'catalog:manage');
      const ch = DB.chapters.find((x) => (x.kps || []).some((k) => k.id === m[1]));
      if (!ch) return fail(res, 'NOT_FOUND', '知识点不存在');
      const kp = ch.kps.find((k) => k.id === m[1]);
      const b = await body(req);
      if (b.name !== undefined) {
        const name = String(b.name).trim();
        if (!name) return fail(res, 'VALIDATION_ERROR', '知识点名称不能为空');
        kp.name = name;
      }
      if (b.brief !== undefined) kp.brief = String(b.brief || '');
      ch.updatedAt = iso(now());
      ch.updatedBy = me.id;
      audit(me.name, me.role, '分类维护', kp.id, `修改知识点「${kp.name}」`);
      save();
      return ok(res, kp);
    }
    if (m && method === 'DELETE') {
      need(me, expired, 'catalog:manage');
      const ch = DB.chapters.find((x) => (x.kps || []).some((k) => k.id === m[1]));
      if (!ch) return fail(res, 'NOT_FOUND', '知识点不存在');
      const kp = ch.kps.find((k) => k.id === m[1]);
      const qCount = DB.questions.filter((q) => (q.kp || []).includes(kp.id)).length;
      if (qCount) return fail(res, 'VALIDATION_ERROR', `该知识点已被 ${qCount} 道题目引用，无法删除`);
      ch.kps = ch.kps.filter((k) => k.id !== kp.id);
      ch.updatedAt = iso(now());
      ch.updatedBy = me.id;
      audit(me.name, me.role, '分类维护', kp.id, `删除知识点「${kp.name}」`);
      save();
      return ok(res, { id: kp.id, deleted: true });
    }

    /* ---- 文档库：试卷 / 练习 ---- */
    if (p === '/api/v1/doclib/documents' && method === 'POST') {
      need(me, expired, 'doclib:compose');
      const b = await body(req);
      const title = String(b.title || '').trim();
      if (!title) return fail(res, 'VALIDATION_ERROR', '请填写试卷 / 练习名称');
      const ids = Array.isArray(b.questionIds) ? [...new Set(b.questionIds)] : [];
      if (!ids.length) return fail(res, 'VALIDATION_ERROR', '请至少勾选 1 道题目');
      const picked = ids.map((id) => DB.questions.find((q) => q.id === id));
      const missing = ids.filter((id, i) => !picked[i]);
      if (missing.length) return fail(res, 'VALIDATION_ERROR', `有 ${missing.length} 道题目已被删除，请刷新后重选`);
      const qs = picked.filter(Boolean).slice();
      const order = { single: 1, multiple: 2, judge: 3, blank: 4, essay: 5 };
      qs.sort((x, y) => (order[x.type] || 9) - (order[y.type] || 9));
      const n = qs.length;
      const scoreMode = b.scoreMode === 'total' ? 'total' : 'perQuestion';
      let scores = [];
      let totalScore = 0;
      if (scoreMode === 'total') {
        totalScore = Math.max(1, Number(b.totalScore) || 100);
        const base = Math.floor((totalScore / n) * 10) / 10;
        scores = new Array(n).fill(base);
        let rest = round1(totalScore - base * n);
        for (let i = 0; rest > 0 && i < n; i += 1) {
          scores[i] = round1(scores[i] + 0.1);
          rest = round1(rest - 0.1);
        }
      } else {
        const per = Math.max(0.5, Number(b.scorePerQuestion) || 5);
        scores = new Array(n).fill(per);
        totalScore = round1(per * n);
      }
      const kpNameOf = (id) => (DB.chapters.flatMap((x) => x.kps).find((k) => k.id === id) || {}).name || id;
      const course = DB.courses.find((c) => c.id === qs[0].courseId) || {};
      const d = {
        id: uid('doc'),
        type: b.type === 'practice' ? 'practice' : 'paper',
        title,
        courseId: course.id || '',
        courseName: course.name || '',
        questionCount: n,
        totalScore,
        scoreMode,
        duration: Number(b.duration) > 0 ? Number(b.duration) : 0,
        includeAnswer: b.includeAnswer !== false,
        items: qs.map((q, i) => ({
          qid: q.id,
          order: i + 1,
          type: q.type,
          score: scores[i],
          stem: q.stem,
          options: optionList(q),
          answer: q.answer,
          analysis: q.analysis || '',
          difficulty: q.difficulty,
          kpNames: (q.kp || []).map(kpNameOf),
          chapterName: (DB.chapters.find((c) => c.id === q.chapterId) || {}).name || ''
        })),
        status: 'published',
        createdAt: iso(now()),
        updatedAt: iso(now()),
        createdBy: me.id,
        createdByName: me.name,
        updatedBy: me.id
      };
      DB.documents.unshift(d);
      audit(me.name, me.role, d.type === 'paper' ? '生成试卷' : '生成练习', d.id, `「${title}」共 ${n} 题 / ${totalScore} 分`);
      save();
      return ok(res, d);
    }
    if (p === '/api/v1/doclib/documents' && method === 'GET') {
      need(me, expired, 'doclib:read');
      const type = url.searchParams.get('type');
      const kw = (url.searchParams.get('kw') || '').trim();
      let list = DB.documents.slice();
      if (type) list = list.filter((d) => d.type === type);
      if (kw) list = list.filter((d) => d.title.includes(kw));
      const rows = list.map((d) => ({
        id: d.id,
        type: d.type,
        title: d.title,
        courseName: d.courseName,
        questionCount: d.questionCount,
        totalScore: d.totalScore,
        duration: d.duration,
        includeAnswer: d.includeAnswer,
        createdAt: d.createdAt,
        createdBy: d.createdBy,
        createdByName: d.createdByName || (userById(d.createdBy) || {}).name || '',
        reviewStatus: d.reviewStatus || 'pending',
        reviewNote: d.reviewNote || '',
        reviewedByName: d.reviewedByName || '',
        reviewedAt: d.reviewedAt || '',
        examId: d.examId || '',
        examStatus: (() => {
          const ex = d.examId ? examById(d.examId) : null;
          return ex ? ex.status : '';
        })(),
        examTitle: (() => {
          const ex = d.examId ? examById(d.examId) : null;
          return ex ? ex.title : '';
        })()
      }));
      return ok(res, Object.assign(paginate(rows, url), {
        stats: {
          total: DB.documents.length,
          papers: DB.documents.filter((d) => d.type === 'paper').length,
          practices: DB.documents.filter((d) => d.type === 'practice').length
        }
      }));
    }
    m = p.match(/^\/api\/v1\/doclib\/documents\/([\w-]+)$/);
    if (m && method === 'GET') {
      need(me, expired, 'doclib:read');
      const d = DB.documents.find((x) => x.id === m[1]);
      if (!d) return fail(res, 'NOT_FOUND', '试卷不存在');
      return ok(res, d);
    }
    if (m && method === 'PATCH') {
      need(me, expired, 'doclib:compose');
      const d = DB.documents.find((x) => x.id === m[1]);
      if (!d) return fail(res, 'NOT_FOUND', '试卷不存在');
      if (d.createdBy !== me.id && !(me.permissions || []).includes('bank:manage')) return fail(res, 'FORBIDDEN', '只能修改自己创建的试卷', 403);
      const b = await body(req);
      if (b.title !== undefined) {
        const title = String(b.title).trim();
        if (!title) return fail(res, 'VALIDATION_ERROR', '名称不能为空');
        d.title = title;
      }
      d.updatedAt = iso(now());
      d.updatedBy = me.id;
      audit(me.name, me.role, '修改试卷', d.id, `重命名为「${d.title}」`);
      save();
      return ok(res, d);
    }
    if (m && method === 'DELETE') {
      need(me, expired, 'doclib:read');
      const d = DB.documents.find((x) => x.id === m[1]);
      if (!d) return fail(res, 'NOT_FOUND', '试卷不存在');
      if (d.createdBy !== me.id && !(me.permissions || []).includes('bank:manage')) return fail(res, 'FORBIDDEN', '只能删除自己创建的试卷', 403);
      DB.documents = DB.documents.filter((x) => x.id !== d.id);
      audit(me.name, me.role, '删除试卷', d.id, `删除「${d.title}」`);
      save();
      return ok(res, { id: d.id, deleted: true });
    }

    /* ---- 在线考试发布：文档审核 → 发布考试 → 发布管理 ---- */
    /* 审核状态：pending 待审核 / approved 审核通过 / rejected 已驳回 */

    const pubDocRow = (d) => {
      const ex = d.examId ? examById(d.examId) : null;
      const atts = ex ? DB.attempts.filter((a) => a.examId === ex.id) : [];
      const graded = atts.filter((a) => a.status === 'graded');
      return {
        id: d.id,
        title: d.title,
        type: d.type,
        courseId: d.courseId,
        courseName: d.courseName,
        questionCount: d.questionCount,
        totalScore: d.totalScore,
        duration: d.duration,
        includeAnswer: d.includeAnswer,
        createdAt: d.createdAt,
        createdBy: d.createdBy,
        createdByName: d.createdByName || (userById(d.createdBy) || {}).name || '',
        reviewStatus: d.reviewStatus || 'pending',
        reviewNote: d.reviewNote || '',
        reviewedByName: d.reviewedByName || '',
        reviewedAt: d.reviewedAt || '',
        publishedAt: d.publishedAt || '',
        publishedByName: d.publishedByName || '',
        examId: ex ? ex.id : '',
        examTitle: ex ? ex.title : '',
        examStatus: ex ? ex.status : '',
        examStartAt: ex ? ex.startAt : '',
        examEndAt: ex ? ex.endAt : '',
        attemptCount: atts.length,
        gradedCount: graded.length,
        avgScore: graded.length ? round1(graded.reduce((s, a) => s + (a.totalScore || 0), 0) / graded.length) : null
      };
    };

    if (p === '/api/v1/publish/documents' && method === 'GET') {
      need(me, expired, 'exam:manage');
      const reviewStatus = url.searchParams.get('reviewStatus');
      const kw = (url.searchParams.get('kw') || '').trim();
      const mine = url.searchParams.get('mine');
      let list = DB.documents.filter((d) => d.type === 'paper');
      if (reviewStatus) list = list.filter((d) => (d.reviewStatus || 'pending') === reviewStatus);
      if (kw) list = list.filter((d) => d.title.includes(kw) || (d.courseName || '').includes(kw));
      if (mine === '1') list = list.filter((d) => d.createdBy === me.id);
      const rows = list.map(pubDocRow);
      const all = DB.documents.filter((d) => d.type === 'paper').map(pubDocRow);
      return ok(res, Object.assign(paginate(rows, url), {
        stats: {
          pending: all.filter((x) => x.reviewStatus === 'pending').length,
          approved: all.filter((x) => x.reviewStatus === 'approved' && !(x.examStatus === 'published')).length,
          rejected: all.filter((x) => x.reviewStatus === 'rejected').length,
          published: all.filter((x) => x.examStatus === 'published').length
        }
      }));
    }

    m = p.match(/^\/api\/v1\/publish\/documents\/([\w-]+)\/review$/);
    if (m && method === 'POST') {
      need(me, expired, 'exam:manage');
      const d = DB.documents.find((x) => x.id === m[1]);
      if (!d) return fail(res, 'NOT_FOUND', '文档不存在');
      if (d.type !== 'paper') return fail(res, 'VALIDATION_ERROR', '只有「试卷」类型文档可以发布为考试，练习文档仅用于自主练习');
      const ex = d.examId ? examById(d.examId) : null;
      if (ex && ex.status === 'published') return fail(res, 'BUSINESS_ERROR', '该文档已发布考试，请先在发布管理中下架后再重新审核');
      const b = await body(req);
      const action = b.action === 'reject' ? 'reject' : b.action === 'approve' ? 'approve' : '';
      if (!action) return fail(res, 'VALIDATION_ERROR', 'action 仅支持 approve / reject');
      if (action === 'reject' && !String(b.note || '').trim()) return fail(res, 'VALIDATION_ERROR', '驳回时请填写原因，便于组卷人修改');
      d.reviewStatus = action === 'approve' ? 'approved' : 'rejected';
      d.reviewNote = String(b.note || '').trim();
      d.reviewedBy = me.id;
      d.reviewedByName = me.name;
      d.reviewedAt = iso(now());
      d.updatedAt = iso(now());
      d.updatedBy = me.id;
      audit(me.name, me.role, action === 'approve' ? '审核通过文档' : '驳回文档', d.id,
        `「${d.title}」${action === 'approve' ? '审核通过，可发布考试' : `退回修改：${d.reviewNote}`}`);
      save();
      return ok(res, pubDocRow(d));
    }

    m = p.match(/^\/api\/v1\/publish\/documents\/([\w-]+)\/publish$/);
    if (m && method === 'POST') {
      need(me, expired, 'exam:manage');
      const d = DB.documents.find((x) => x.id === m[1]);
      if (!d) return fail(res, 'NOT_FOUND', '文档不存在');
      if (d.type !== 'paper') return fail(res, 'VALIDATION_ERROR', '只有「试卷」类型文档可以发布为考试');
      if ((d.reviewStatus || 'pending') !== 'approved') {
        return fail(res, 'BUSINESS_ERROR', (d.reviewStatus === 'rejected' ? '文档已被驳回，请修改后重新提交审核' : '文档尚未通过审核，请先完成审核'));
      }
      const old = d.examId ? examById(d.examId) : null;
      if (old && old.status === 'published') return fail(res, 'BUSINESS_ERROR', '该文档已有进行中的考试，请先下架后再重新发布');
      const b = await body(req);
      const title = String(b.title || d.title || '').trim();
      if (!title) return fail(res, 'VALIDATION_ERROR', '请填写考试名称');
      const duration = Number(b.duration) > 0 ? Math.min(300, Math.round(Number(b.duration))) : (Number(d.duration) > 0 ? Number(d.duration) : 60);
      const passRate = Math.min(0.95, Math.max(0.3, Number(b.passRate) > 1 ? Number(b.passRate) / 100 : (Number(b.passRate) || 0.6)));
      const type = ['chapter_quiz', 'skill_exam', 'admission_exam'].includes(b.type) ? b.type : 'skill_exam';
      const startAt = b.startAt ? iso(new Date(b.startAt)) : iso(now());
      const endAt = b.endAt ? iso(new Date(b.endAt)) : iso(new Date(now() + 90 * 24 * 3600 * 1000));
      if (new Date(endAt) <= new Date(startAt)) return fail(res, 'VALIDATION_ERROR', '截止时间必须晚于开放时间');
      const missing = d.items.filter((it) => !DB.questions.find((q) => q.id === it.qid));
      if (missing.length) return fail(res, 'BUSINESS_ERROR', `有 ${missing.length} 道题目已从题库删除，无法发布，请重新组卷`);
      const paper = {
        id: uid('p'),
        title,
        courseId: d.courseId,
        paperDesc: `由文档库《${d.title}》发布，${d.questionCount} 题 / ${d.totalScore} 分。`,
        totalScore: d.totalScore,
        passRate,
        duration,
        status: 'published',
        groups: [{ id: 'g1', name: '综合', chapterId: '', weight: 100, threshold: Math.max(0.3, passRate - 0.1) }],
        items: d.items.map((it) => ({ qid: it.qid, score: it.score, group: 'g1' })),
        createdAt: iso(now()),
        updatedAt: iso(now()),
        createdBy: me.id,
        updatedBy: me.id
      };
      DB.papers.push(paper);
      const exam = {
        id: uid('e'),
        title,
        type,
        paperId: paper.id,
        courseId: d.courseId,
        chapterIds: [],
        duration,
        startAt,
        endAt,
        allowBacktrack: b.allowBacktrack !== false,
        shuffleQuestion: !!b.shuffleQuestion,
        shuffleOption: b.shuffleOption !== false,
        cheatLevel: ['low', 'medium', 'high'].includes(b.cheatLevel) ? b.cheatLevel : 'medium',
        answerPolicy: b.answerPolicy === 'immediately' ? 'immediately' : 'after_grading',
        status: 'published',
        remark: String(b.remark || '').trim() || `发布于 ${iso(now()).replace('T', ' ').slice(0, 16)}`,
        documentId: d.id,
        source: 'doclib',
        reviewStatus: 'approved',
        publishedAt: iso(now()),
        publishedBy: me.id,
        publishedByName: me.name,
        createdAt: iso(now()),
        updatedAt: iso(now()),
        createdBy: me.id,
        updatedBy: me.id
      };
      DB.exams.push(exam);
      d.examId = exam.id;
      d.publishedAt = exam.publishedAt;
      d.publishedBy = me.id;
      d.publishedByName = me.name;
      d.updatedAt = iso(now());
      d.updatedBy = me.id;
      audit(me.name, me.role, '发布考试', exam.id, `「${title}」由文档《${d.title}》发布，${d.questionCount} 题 / ${d.totalScore} 分 / ${duration} 分钟`);
      save();
      return ok(res, { examId: exam.id, paperId: paper.id, title, status: exam.status, startAt, endAt, document: pubDocRow(d) });
    }

    if (p === '/api/v1/publish/exams' && method === 'GET') {
      need(me, expired, 'exam:manage');
      const status = url.searchParams.get('status');
      const kw = (url.searchParams.get('kw') || '').trim();
      let list = DB.exams.slice().sort((a, b) => String(b.publishedAt || b.createdAt).localeCompare(String(a.publishedAt || a.createdAt)));
      if (status) list = list.filter((e) => e.status === status);
      if (kw) list = list.filter((e) => e.title.includes(kw));
      const rows = list.map((e) => {
        const paper = paperById(e.paperId) || {};
        const doc = DB.documents.find((d) => d.id === e.documentId);
        const atts = DB.attempts.filter((a) => a.examId === e.id);
        const graded = atts.filter((a) => a.status === 'graded');
        return {
          id: e.id,
          title: e.title,
          type: e.type,
          typeName: { chapter_quiz: '章节随堂测', skill_exam: '专项技能卷', admission_exam: '项目准入卷' }[e.type] || '考试',
          status: e.status,
          courseName: doc ? doc.courseName : ((DB.courses.find((c) => c.id === e.courseId) || {}).name || ''),
          documentId: e.documentId || '',
          documentTitle: doc ? doc.title : '',
          source: e.source || (e.documentId ? 'doclib' : 'seed'),
          questionCount: (paper.items || []).length,
          totalScore: paper.totalScore,
          passRate: paper.passRate,
          duration: e.duration,
          startAt: e.startAt,
          endAt: e.endAt,
          publishedAt: e.publishedAt || e.createdAt,
          publishedByName: e.publishedByName || (userById(e.createdBy) || {}).name || '平台预置',
          publishedBy: e.publishedBy || e.createdBy,
          attemptCount: atts.length,
          gradedCount: graded.length,
          avgScore: graded.length ? round1(graded.reduce((s, a) => s + (a.totalScore || 0), 0) / graded.length) : null,
          passCount: graded.filter((a) => a.dualPass).length,
          remark: e.remark || ''
        };
      });
      const all = DB.exams.map((e) => ({ status: e.status, source: e.source || (e.documentId ? 'doclib' : 'seed') }));
      return ok(res, Object.assign(paginate(rows, url), {
        stats: {
          total: all.length,
          published: all.filter((x) => x.status === 'published').length,
          archived: all.filter((x) => x.status === 'archived').length,
          doclib: all.filter((x) => x.source === 'doclib').length,
          attempts: DB.attempts.length,
          pendingGrading: DB.attempts.filter((a) => a.status === 'submitted').length
        }
      }));
    }

    m = p.match(/^\/api\/v1\/exams\/([\w-]+)$/);
    if (m && method === 'DELETE') {
      if (me.role !== 'admin' && !(me.permissions || []).includes('bank:manage')) {
        return fail(res, 'FORBIDDEN', '只有管理员可以删除考试，教师可先下架', 403);
      }
      const exam = examById(m[1]);
      if (!exam) return fail(res, 'NOT_FOUND', '考试不存在');
      const atts = DB.attempts.filter((a) => a.examId === exam.id);
      if (atts.length) return fail(res, 'BUSINESS_ERROR', `该考试已有 ${atts.length} 份答卷，不能删除，请使用下架保留成绩`);
      DB.exams = DB.exams.filter((x) => x.id !== exam.id);
      DB.papers = DB.papers.filter((x) => x.id !== exam.paperId);
      const doc = DB.documents.find((d) => d.examId === exam.id);
      if (doc) {
        doc.examId = '';
        doc.publishedAt = '';
        doc.publishedBy = '';
        doc.publishedByName = '';
        doc.updatedAt = iso(now());
      }
      audit(me.name, me.role, '删除考试', exam.id, `删除「${exam.title}」及其试卷`);
      save();
      return ok(res, { id: exam.id, deleted: true });
    }

    /* ---- 阅卷中心 ---- */
    if (p === '/api/v1/grading/queue') {
      need(me, expired, 'exam:grade');
      const pending = DB.attempts.filter((a) => a.status === 'submitted');
      return ok(res, pending.map((a) => {
        const exam = examById(a.examId);
        const u = userById(a.userId);
        const essays = (a.details || []).filter((d) => d.type === 'essay');
        const minConf = essays.length ? Math.min(...essays.map((d) => (d.ai ? d.ai.confidence : 1))) : 1;
        return {
          attemptId: a.id,
          examTitle: exam.title,
          examType: exam.type,
          userName: u.name,
          userAccount: u.account,
          submittedAt: a.submittedAt,
          objectiveScore: a.objectiveScore,
          essayCount: essays.length,
          confidence: minConf,
          needReview: minConf < 0.75,
          eventCount: (a.events || []).length,
          estimatedTotal: a.totalScore
        };
      }).sort((x, y) => x.confidence - y.confidence));
    }
    m = p.match(/^\/api\/v1\/grading\/([\w-]+)$/);
    if (m && method === 'GET') {
      need(me, expired, 'exam:grade');
      const a = DB.attempts.find((x) => x.id === m[1]);
      if (!a) return fail(res, 'NOT_FOUND', '答卷不存在');
      const exam = examById(a.examId);
      const u = userById(a.userId);
      return ok(res, {
        attemptId: a.id,
        examTitle: exam.title,
        userName: u.name,
        userAccount: u.account,
        objectiveScore: a.objectiveScore,
        totalScore: a.totalScore,
        groups: a.groups,
        status: a.status,
        items: a.details.filter((d) => d.type === 'essay').map((d) => {
          const snap = a.snapshot.find((s) => s.qid === d.qid);
          return {
            qid: d.qid,
            stem: snap.stem,
            score: d.score,
            awarded: d.awarded,
            myAnswer: d.answer,
            scorePoints: snap.scorePoints,
            ai: d.ai ? { ...d.ai, score: d.awarded } : null,
            review: (a.reviews || []).find((r) => r.qid === d.qid) || null
          };
        }),
        events: a.events
      });
    }
    m = p.match(/^\/api\/v1\/grading\/([\w-]+)\/confirm$/);
    if (m && method === 'POST') {
      need(me, expired, 'exam:grade');
      const a = DB.attempts.find((x) => x.id === m[1]);
      if (!a) return fail(res, 'NOT_FOUND', '答卷不存在');
      if (a.status === 'graded') return ok(res, { alreadyGraded: true });
      const b = await body(req);
      const items = b.items || [];
      a.reviews = items.map((it) => ({
        qid: it.qid,
        score: Number(it.score) || 0,
        comment: it.comment || '',
        confirmedBy: me.id,
        confirmedByName: me.name,
        confirmedAt: iso(now())
      }));
      // 用教师确认分重算
      const details = a.details.map((d) => {
        const r = a.reviews.find((x) => x.qid === d.qid);
        return r ? { ...d, awarded: r.score } : d;
      });
      const objective = details.filter((d) => d.type !== 'essay').reduce((s, d) => s + d.awarded, 0);
      const essay = details.filter((d) => d.type === 'essay').reduce((s, d) => s + d.awarded, 0);
      const total = round1(objective + essay);
      const paper = paperById(a.paperId);
      const passLine = round1(paper.totalScore * paper.passRate);
      const groups = (paper.groups || []).map((g) => {
        const list = details.filter((d) => d.group === g.id);
        const full = list.reduce((s, d) => s + d.score, 0);
        const got = round1(list.reduce((s, d) => s + d.awarded, 0));
        const rate = full ? Number((got / full).toFixed(3)) : 1;
        return { id: g.id, name: g.name, weight: g.weight, threshold: g.threshold, full, score: got, rate, passed: rate >= g.threshold };
      });
      const weak = groups.filter((g) => !g.passed);
      const totalPassed = total >= passLine;
      const dualPass = totalPassed && weak.length === 0;
      const exam = examById(a.examId);
      Object.assign(a, {
        status: 'graded',
        details,
        objectiveScore: round1(objective),
        essayScore: round1(essay),
        totalScore: total,
        groups,
        totalPassed,
        dualPass,
        level: total >= 85 ? 'excellent' : dualPass ? 'qualified' : 'none',
        failReason: dualPass ? '' : !totalPassed ? `总分 ${total} 分低于及格线 ${passLine} 分` : `${weak.map((g) => `${g.name}得分率 ${Math.round(g.rate * 100)}%`).join('、')}，低于达标线`,
        failType: dualPass ? '' : !totalPassed ? (weak.length ? 'both' : 'total') : 'group'
      });
      let adm = null;
      if (dualPass && exam.type !== 'chapter_quiz') { const r = issueAdmission(a, exam, me); adm = r.admission; }
      a.updatedAt = iso(now());
      a.updatedBy = me.id;
      emitBusiness(dualPass ? 'exam.passed' : 'exam.failed', me.id, {
        attemptId: a.id, examId: exam.id, examType: exam.type, userId: a.userId,
        totalScore: total, dualPass, admissionId: adm ? adm.id : null
      });
      audit(me.name, me.role, '阅卷确认', a.id, `确认 ${items.length} 道简答题，总分 ${total}，${dualPass ? '双达标通过' : '未达标'}`);
      save();
      return ok(res, { totalScore: total, dualPass, groups, admission: adm });
    }

    /* ---- 分析看板 ---- */
    m = p.match(/^\/api\/v1\/stats\/([\w-]+)$/);
    if (m) {
      need(me, expired, 'stats:read');
      const exam = examById(m[1]);
      if (!exam) return fail(res, 'NOT_FOUND', '考试不存在');
      const paper = paperById(exam.paperId);
      const list = DB.attempts.filter((a) => a.examId === exam.id && a.status === 'graded');
      const scores = list.map((a) => a.totalScore);
      const passLine = round1(paper.totalScore * paper.passRate);
      const buckets = [0, 60, 70, 80, 90].map((lo, i, arr) => {
        const hi = arr[i + 1] === undefined ? 101 : arr[i + 1];
        return { label: `${lo}-${hi === 101 ? 100 : hi - 1}`, count: scores.filter((s) => s >= lo && s < hi).length };
      });
      const sorted = scores.slice().sort((a, b) => a - b);
      const median = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : round1((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)) : 0;
      const groupAgg = (paper.groups || []).map((g) => {
        const rates = list.map((a) => (a.groups.find((x) => x.id === g.id) || {}).rate || 0);
        const avg = rates.length ? Number((rates.reduce((s, r) => s + r, 0) / rates.length).toFixed(3)) : 0;
        const passedCount = list.filter((a) => (a.groups.find((x) => x.id === g.id) || {}).passed).length;
        return { id: g.id, name: g.name, threshold: g.threshold, avgRate: avg, passCount: passedCount, total: list.length };
      });
      const qStat = (paper.items || []).filter((it) => (DB.questions.find((x) => x.id === it.qid) || {}).type !== 'essay').map((it) => {
        const q = DB.questions.find((x) => x.id === it.qid);
        const ds = list.map((a) => a.details.find((d) => d.qid === it.qid)).filter(Boolean);
        const correct = ds.filter((d) => d.level === 'full').length;
        const rate = ds.length ? Number((correct / ds.length).toFixed(2)) : 0;
        return {
          qid: it.qid,
          stem: q.stem,
          type: q.type,
          score: it.score,
          group: (paper.groups.find((g) => g.id === it.group) || {}).name,
          answered: ds.length,
          correctRate: rate,
          flag: rate >= 0.95 ? '过易' : rate <= 0.3 ? '疑似错题' : ''
        };
      });
      return ok(res, {
        exam: { id: exam.id, title: exam.title, type: exam.type },
        summary: {
          attendees: list.length,
          avg: scores.length ? round1(scores.reduce((s, x) => s + x, 0) / scores.length) : 0,
          median,
          passRate: scores.length ? Number((list.filter((a) => a.dualPass).length / scores.length).toFixed(2)) : 0,
          excellentRate: scores.length ? Number((list.filter((a) => a.totalScore >= 85).length / scores.length).toFixed(2)) : 0,
          max: scores.length ? Math.max(...scores) : 0,
          min: scores.length ? Math.min(...scores) : 0,
          passLine
        },
        buckets,
        groups: groupAgg,
        questions: qStat.sort((a, b) => a.correctRate - b.correctRate),
        users: Object.values(
          list.reduce((acc, a) => {
            const prev = acc[a.userId];
            const item = {
              userId: a.userId,
              name: (userById(a.userId) || {}).name,
              score: a.totalScore,
              dualPass: a.dualPass,
              attempts: 1,
              events: (a.events || []).length
            };
            if (!prev) return { ...acc, [a.userId]: item };
            return {
              ...acc,
              [a.userId]: {
                ...prev,
                score: Math.max(prev.score, item.score),
                dualPass: prev.dualPass || item.dualPass,
                attempts: prev.attempts + 1,
                events: prev.events + item.events
              }
            };
          }, {})
        ).sort((x, y) => y.score - x.score)
      });
    }

    /* ---- 管理与审计 ---- */
    if (p === '/api/v1/papers') {
      need(me, expired, 'exam:manage');
      const paperRows = DB.papers.map((x) => ({
        id: x.id, title: x.title, courseId: x.courseId,
        courseName: (DB.courses.find((c) => c.id === x.courseId) || {}).name,
        questionCount: x.items.length, totalScore: x.totalScore, passRate: x.passRate,
        duration: x.duration, groups: x.groups, status: x.status,
        examCount: DB.exams.filter((e) => e.paperId === x.id).length
      }));
      return ok(res, paginate(paperRows, url));
    }
    if (p === '/api/v1/exams' && method === 'GET') {
      need(me, expired, 'exam:manage');
      const rows = DB.exams.map((e) => ({ ...examCard(e, me.id), createdAt: e.createdAt, updatedAt: e.updatedAt, createdBy: e.createdBy }));
      return ok(res, paginate(rows, url));
    }
    m = p.match(/^\/api\/v1\/exams\/([\w-]+)\/status$/);
    if (m && method === 'POST') {
      need(me, expired, 'exam:manage');
      const exam = examById(m[1]);
      if (!exam) return fail(res, 'NOT_FOUND', '考试不存在');
      const b = await body(req);
      if (!['published', 'archived'].includes(b.status)) return fail(res, 'VALIDATION_ERROR', 'status 仅支持 published / archived');
      if (exam.source === 'doclib' && exam.createdBy !== me.id && me.role !== 'admin') {
        return fail(res, 'FORBIDDEN', '只能上下架自己发布的考试，需要管理员操作请联系平台管理员', 403);
      }
      if (exam.source === 'doclib' && b.status === 'published' && exam.documentId) {
        const doc = DB.documents.find((d) => d.id === exam.documentId);
        if (!doc) return fail(res, 'BUSINESS_ERROR', '来源文档已删除，无法重新上架，请重新组卷发布');
        if ((doc.reviewStatus || 'pending') !== 'approved') return fail(res, 'BUSINESS_ERROR', '来源文档审核状态已变更，请先重新审核');
      }
      exam.status = b.status;
      exam.updatedAt = iso(now());
      exam.updatedBy = me.id;
      if (b.status === 'published' && !exam.publishedAt) exam.publishedAt = iso(now());
      audit(me ? me.name : '管理员', me ? me.role : 'admin', b.status === 'published' ? '发布考试' : '下架考试', exam.id, exam.title);
      save();
      return ok(res, { id: exam.id, status: exam.status });
    }
    if (p === '/api/v1/audit') {
      need(me, expired, 'audit:read');
      return ok(res, paginate(DB.audits, url));
    }
    /* ---- 跨平台事件入站（§11.3，统一信封 + eventId 幂等消费） ---- */
    if (p === '/api/v1/events' && method === 'POST') {
      if ((req.headers['x-platform-key'] || '') !== CONFIG.platformKey) return fail(res, 'FORBIDDEN', '平台密钥校验失败', 403);
      const b = await body(req);
      if (!b.eventId || !b.eventType) return fail(res, 'VALIDATION_ERROR', '缺少 eventId 或 eventType');
      if (DB.inbox.some((x) => x.eventId === b.eventId)) return ok(res, { duplicate: true, eventId: b.eventId });
      const entry = {
        eventId: b.eventId, eventType: b.eventType, occurredAt: b.occurredAt || iso(now()),
        sourcePlatform: b.sourcePlatform || 'unknown', operatorId: b.operatorId || null,
        receivedAt: iso(now()), status: 'processed'
      };
      if (b.eventType === 'course.completed' && b.data && b.data.userId && b.data.chapterId) {
        const u = userById(b.data.userId);
        if (u && !u.completed.includes(b.data.chapterId)) u.completed.push(b.data.chapterId);
        entry.status = u ? 'processed' : 'ignored_user_not_found';
        audit('系统', 'system', '同步自学完成', b.data.chapterId, `用户 ${b.data.userId} 完成章节（事件 ${b.eventId}），考试解锁已更新`);
      } else {
        entry.status = 'ignored_unknown_type';
      }
      DB.inbox.unshift(entry);
      save();
      return ok(res, { duplicate: false, eventId: b.eventId, status: entry.status });
    }

    /* ---- 对外公开查询：考试通过状态（§11.2.3，供实训工坊判断项目准入） ---- */
    if (p === '/api/v1/public/exam-pass' && method === 'GET') {
      if ((req.headers['x-platform-key'] || '') !== CONFIG.platformKey) return fail(res, 'FORBIDDEN', '平台密钥校验失败', 403);
      const targetUser = url.searchParams.get('userId');
      if (!targetUser) return fail(res, 'VALIDATION_ERROR', '缺少 userId 参数');
      const u = userById(targetUser);
      if (!u) return fail(res, 'NOT_FOUND', '用户不存在');
      const results = {};
      attemptsOf(targetUser).filter((a) => a.status === 'graded').forEach((a) => {
        const prev = results[a.examId];
        if (!prev || (a.totalScore || 0) > (prev.totalScore || 0)) {
          results[a.examId] = { examId: a.examId, attemptId: a.id, totalScore: a.totalScore, dualPass: a.dualPass, gradedAt: a.submittedAt };
        }
      });
      return ok(res, {
        userId: targetUser,
        realName: u.name,
        passedExamIds: Object.values(results).filter((r) => r.dualPass).map((r) => r.examId),
        results: Object.values(results),
        admissions: DB.admissions.filter((a) => a.userId === targetUser).map((a) => ({
          examId: a.examId, examTitle: a.examTitle, status: a.status, level: a.level,
          grantedAt: a.issuedAt, expireAt: a.expireAt
        }))
      });
    }

    /* ---- 事件出站人工重放（§11.4，预留日志与重试字段） ---- */
    if (p === '/api/v1/admin/outbox/retry' && method === 'POST') {
      need(me, expired, 'outbox:manage');
      const b = await body(req);
      if (!b.eventId) return fail(res, 'VALIDATION_ERROR', '缺少 eventId');
      const ob = DB.outbox.find((x) => x.eventId === b.eventId);
      if (!ob) return fail(res, 'NOT_FOUND', '出站事件不存在');
      if (!CONFIG.event.baseUrl) return fail(res, 'BUSINESS_ERROR', '未配置事件总线地址（EVENT_BASE_URL）');
      const ev = DB.events.find((x) => x.eventId === b.eventId);
      dispatchOutbox(ob, ev);
      save();
      return ok(res, ob);
    }

    if (p === '/api/v1/events' && method === 'GET') {
      need(me, expired, 'event:read');
      return ok(res, paginate(DB.events, url));
    }

    return fail(res, 'NOT_FOUND', `未知接口 ${method} ${p}`, 404);
  } catch (e) {
    if (typeof HttpError !== 'undefined' && e instanceof HttpError) return fail(res, e.code, e.message, e.httpCode);
    logLine(`500 ${method} ${p} :: ${e && e.stack ? e.stack.split('\n').slice(0, 2).join(' | ') : e}`);
    return fail(res, 'INTERNAL_ERROR', '服务内部错误', 500);
  }
});

/* 计划任务方式启动时没有控制台，写一份日志便于事后定位 */
const LOG_DIR = path.join(__dirname, '..', 'run-logs');
function logLine(msg) {
  const line = `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] ${msg}\n`;
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOG_DIR, 'service.log'), line);
  } catch (e) {
    /* 日志失败不影响主流程 */
  }
  process.stdout.write(line);
}

function listen(port, retry) {
  server.once('error', (e) => {
    if (e.code === 'EADDRINUSE' && retry) {
      logLine(`端口 ${port} 被占用，改用 ${retry} 重启`);
      setTimeout(() => listen(retry, 0), 200);
      return;
    }
    logLine(`启动失败 port=${port}: ${e.message}`);
    process.exit(1);
  });
  server.listen(port, HOST, () => {
    logLine(`listening on http://127.0.0.1:${port}  (LAN: http://<本机IP>:${port})`);
    logLine(`static -> ${DIST}`);
    logLine(`data   -> ${DB_FILE}`);
  });
}

process.on('uncaughtException', (e) => {
  logLine(`uncaughtException: ${e && e.stack ? e.stack.split('\n')[0] : e}`);
});
process.on('unhandledRejection', (e) => {
  logLine(`unhandledRejection: ${e && e.message ? e.message : e}`);
});
listen(PORT, PORT === 80 ? 8090 : 0);
