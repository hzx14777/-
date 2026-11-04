/**
 * 判分 / 双达标 / 命题引擎
 * 依据《警院智慧考试平台需求规格说明书》第 6 章「关键业务规则」实现
 */
const crypto = require('node:crypto');

/* ---------------- 文本规范化（6.4 填空规则） ---------------- */
function normalizeText(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

/* ---------------- 客观题判分 ---------------- */
function judgeChoice(q, raw) {
  const std = q.answer;
  if (q.type === 'single' || q.type === 'judge') {
    const hit = String(raw ?? '') === String(std);
    return { score: hit ? q.score : 0, correct: hit, level: hit ? 'full' : 'none' };
  }
  if (q.type === 'multiple') {
    const stdArr = Array.isArray(std) ? std.slice().sort() : [];
    const gotArr = Array.isArray(raw) ? raw.slice().sort() : [];
    const same = stdArr.length === gotArr.length && stdArr.every((v, i) => v === gotArr[i]);
    if (same) return { score: q.score, correct: true, level: 'full' };
    const wrongPick = gotArr.some((v) => !stdArr.includes(v));
    if (wrongPick | gotArr.length === 0) return { score: 0, correct: false, level: 'none' };
    // 漏选按半分（可按考试配置关闭）
    return { score: round1(q.score / 2), correct: false, level: 'partial' };
  }
  return { score: 0, correct: false, level: 'none' };
}

function judgeBlank(q, raw) {
  const blanks = Array.isArray(q.answer) ? q.answer : [q.answer];
  const got = Array.isArray(raw) ? raw : String(raw ?? '').split('|');
  const per = q.score / blanks.length;
  let score = 0;
  let hitCount = 0;
  blanks.forEach((b, i) => {
    const candidates = Array.isArray(b) ? b : [b];
    const value = normalizeText(got[i]);
    const ok = value.length > 0 && candidates.some((c) => normalizeText(c) === value);
    if (ok) {
      score += per;
      hitCount += 1;
    }
  });
  return {
    score: round1(score),
    correct: hitCount === blanks.length,
    level: hitCount === blanks.length ? 'full' : hitCount === 0 ? 'none' : 'partial',
    detail: `${hitCount}/${blanks.length} 空命中`
  };
}

/* ---------------- 简答题 AI 初评（要点逐点匹配） ---------------- */
function judgeEssay(q, raw) {
  const text = normalizeText(raw);
  const points = q.scorePoints || [];
  const hit = [];
  const miss = [];
  let weight = 0;
  points.forEach((p) => {
    const ok = (p.keywords || []).some((k) => text.includes(normalizeText(k)));
    if (ok) {
      hit.push(p.text);
      weight += p.weight;
    } else {
      miss.push(p.text);
    }
  });
  const rawScore = q.score * weight;
  const score = round1(Math.min(q.score, rawScore));
  // 置信度：命中越多越高，缺失要点越多越低；被试答案过短额外扣减
  let confidence = 0.58 + (hit.length / Math.max(points.length, 1)) * 0.34;
  if (text.length < 12) confidence -= 0.16;
  if (miss.length === 0) confidence += 0.05;
  confidence = Math.min(0.96, Math.max(0.52, Number(confidence.toFixed(2))));
  return { score, confidence, hit, miss, needReview: confidence < 0.75 };
}

function gradeQuestion(q, raw) {
  if (q.type === 'essay') {
    const r = judgeEssay(q, raw);
    return { score: r.score, correct: null, level: 'essay', ...r };
  }
  if (q.type === 'blank') return judgeBlank(q, raw);
  return judgeChoice(q, raw);
}

/* ---------------- 整卷判分 + 双达标（6.5） ---------------- */
function gradeAttempt(paper, snapshot, answers, opts = {}) {
  const details = snapshot.map((item) => {
    const q = item; // 卷面快照即题目副本
    const raw = answers[item.qid];
    const r = gradeQuestion(q, raw);
    return {
      qid: item.qid,
      type: item.type,
      group: item.group,
      score: item.score,
      awarded: r.score,
      correct: r.correct,
      level: r.level,
      answer: raw ?? null,
      ai: r.level === 'essay' ? { hit: r.hit, miss: r.miss, confidence: r.confidence, needReview: r.needReview } : undefined
    };
  });

  const objective = details.filter((d) => d.type !== 'essay').reduce((s, d) => s + d.awarded, 0);
  const essay = details.filter((d) => d.type === 'essay').reduce((s, d) => s + d.awarded, 0);
  const total = round1(objective + essay);

  const groups = (paper.groups || []).map((g) => {
    const items = details.filter((d) => d.group === g.id);
    const full = items.reduce((s, d) => s + d.score, 0);
    const got = round1(items.reduce((s, d) => s + d.awarded, 0));
    const rate = full > 0 ? Number((got / full).toFixed(3)) : 1;
    return {
      id: g.id,
      name: g.name,
      weight: g.weight,
      threshold: g.threshold,
      full,
      score: got,
      rate,
      passed: rate >= g.threshold
    };
  });

  const passLine = round1(paper.totalScore * paper.passRate);
  const totalPassed = total >= passLine;
  const weak = groups.filter((g) => !g.passed);
  const dualPass = totalPassed && weak.length === 0;
  let failReason = '';
  let failType = '';
  if (!totalPassed && weak.length) {
    failType = 'both';
    failReason = `总分 ${total} 分未达及格线 ${passLine} 分，且 ${weak.map((g) => g.name).join('、')} 未达标`;
  } else if (!totalPassed) {
    failType = 'total';
    failReason = `总分 ${total} 分，低于及格线 ${passLine} 分，整体掌握不足，建议系统复习`;
  } else if (weak.length) {
    failType = 'group';
    failReason = `${weak.map((g) => `${g.name}得分率 ${Math.round(g.rate * 100)}%`).join('、')}，低于 ${Math.round(
      weak[0].threshold * 100
    )}% 达标线，建议优先补强`;
  }

  return { details, objective: round1(objective), essay: round1(essay), total, groups, passLine, totalPassed, dualPass, weak, failReason, failType, level: total >= 85 ? 'excellent' : dualPass ? 'qualified' : 'none' };
}

/* ---------------- 相似度（6.2 判重 0.90） ---------------- */
function bigrams(s) {
  const t = (s || '').replace(/[\s，。、？的是了对与和为在]/g, '');
  const set = new Set();
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
  return set;
}
function similarity(a, b) {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((x) => {
    if (B.has(x)) inter += 1;
  });
  return Number((inter / Math.min(A.size, B.size)).toFixed(3));
}

/* ---------------- 自检（6.2 四道硬校验） ---------------- */
function selfCheck(q) {
  const issues = [];
  if (!q.stem || q.stem.length < 8) issues.push({ code: 'stem', text: '题干过短，无法独立成题' });
  if (q.type === 'single' || q.type === 'multiple') {
    const opts = q.options || [];
    if (opts.length < 3) issues.push({ code: 'options', text: '选项少于 3 个' });
    const contents = opts.map((o) => normalizeText(o.content));
    if (new Set(contents).size !== contents.length) issues.push({ code: 'exclusive', text: '存在重复选项，选项不互斥' });
    const keys = Array.isArray(q.answer) ? q.answer : [q.answer];
    if (keys.some((k) => !opts.find((o) => o.id === k))) issues.push({ code: 'unique', text: '标准答案不在选项内' });
    // 题干泄答案：题干中直接出现正确选项全文
    const leak = opts.some((o) => keys.includes(o.id) && o.content.length > 4 && q.stem.includes(o.content));
    if (leak) issues.push({ code: 'leak', text: '题干包含正确选项原文，存在泄题风险' });
  }
  if (!q.analysis || q.analysis.length < 10) issues.push({ code: 'analysis', text: '解析缺失或过短，无法与答案互证' });
  if (q.type === 'essay' && (!q.scorePoints || !q.scorePoints.length)) issues.push({ code: 'points', text: '简答题缺少评分要点' });
  if (!q.kp || !q.kp.length) issues.push({ code: 'kp', text: '未标注知识点，无法溯源' });
  return { ok: issues.length === 0, issues };
}

/* ---------------- 工具 ---------------- */
function round1(n) {
  return Math.round(n * 10) / 10;
}
function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`;
}
function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed || 1;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = { normalizeText, gradeQuestion, gradeAttempt, judgeEssay, similarity, selfCheck, round1, uid, seededShuffle };
