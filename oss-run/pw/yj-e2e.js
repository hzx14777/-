// 端到端联调：学生作答 → 交卷 → 教师阅卷确认 → 双达标与资格发放
const { chromium } = require('playwright');
const OUT = 'C:/Users/24243/Desktop/考试平台2/oss-run/shots/yj';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1560, height: 940 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));

  const api = async (path, opt = {}) =>
    page.evaluate(
      async ([p, o]) => {
        const r = await fetch('/yjapi' + p, {
          method: o.method || 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('yj_token') },
          body: o.body ? JSON.stringify(o.body) : undefined
        });
        return r.json();
      },
      [path, opt]
    );

  // 学生登录
  await page.goto('http://127.0.0.1/yj/login', { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    const r = await fetch('/yjapi/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: '2023013', password: '123456' })
    });
    const j = await r.json();
    localStorage.setItem('yj_token', j.data.token);
    localStorage.setItem('yj_user', JSON.stringify(j.data.user));
  });

  // 进入考试详情
  await page.goto('http://127.0.0.1/yj/exams/e_py_skill', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: OUT + '/e2e-01-detail.png' });
  await page.click('button:has-text("开始考试")');
  await page.waitForTimeout(400);
  await page.click('.el-checkbox');
  await page.click('button:has-text("进入答题")');
  await page.waitForURL('**/yj/answer/**', { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: OUT + '/e2e-02-answer.png' });

  const total = await page.locator('.yj-qnav button').count();
  console.log('题目数', total);

  for (let i = 0; i < total; i++) {
    await page.locator('.yj-qnav button').nth(i).click();
    await page.waitForTimeout(250);
    const opts = page.locator('.yj-opt');
    const optCount = await opts.count();
    if (optCount > 0) {
      await opts.nth(0).click();
      // 多选题补选第二项
      const isMulti = (await page.locator('.yj-badge:has-text("多选题")').count()) > 0;
      if (isMulti && optCount > 1) await opts.nth(1).click();
    } else if (await page.locator('textarea').count()) {
      await page.locator('textarea').fill(
        '去重以案件编号为主键，保留更新时间最新的一条，主键冲突无法判定时转入人工核验。缺失值要先区分随机缺失与系统性缺失，随机缺失可以插补，系统性缺失需回查采集环节。敏感字段如身份证号、手机号必须脱敏后才能进入分析环境。按辖区 groupby 分组后用 agg 计数聚合，注意编号前导零要指定 dtype。'
      );
    } else if (await page.locator('.el-input__inner').count()) {
      const inputs = page.locator('.el-input__inner');
      const n = await inputs.count();
      for (let k = 0; k < n; k++) await inputs.nth(k).fill('案件编号');
    }
  }

  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + '/e2e-03-answered.png' });
  await page.click('button:has-text("交卷")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + '/e2e-04-submit-confirm.png' });
  await page.click('button:has-text("确认交卷")');
  await page.waitForURL('**/yj/result/**', { timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: OUT + '/e2e-05-result-pending.png', fullPage: true });

  const result = await page.evaluate(() => {
    const t = document.querySelector('.score-ring .num');
    return { score: t ? t.textContent.trim() : null, url: location.pathname };
  });
  console.log('交卷后成绩', JSON.stringify(result));

  // 教师阅卷
  await page.evaluate(async () => {
    const r = await fetch('/yjapi/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: 'T1001', password: '123456' })
    });
    const j = await r.json();
    localStorage.setItem('yj_token', j.data.token);
    localStorage.setItem('yj_user', JSON.stringify(j.data.user));
  });
  await page.goto('http://127.0.0.1/yj/teacher/grading', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: OUT + '/e2e-06-grading.png', fullPage: true });
  const queueBefore = await page.locator('.yj-queue-item').count();
  console.log('待阅队列', queueBefore);

  await page.click('button:has-text("确认并生效")');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: OUT + '/e2e-07-confirm-dialog.png' });
  await page.click('.el-message-box__btns button:has-text("下一份")');
  await page.waitForTimeout(1000);

  // 校验资格与审计
  const after = await api('/api/v1/admissions');
  console.log('资格条数', after.data.list.length);
  const audit = await api('/api/v1/audit');
  console.log('最新审计', audit.data.slice(0, 3).map((a) => a.actor + '·' + a.action + '·' + a.detail));

  console.log('错误：', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})().catch((e) => {
  console.error('FATAL', e.message);
  process.exit(1);
});
