// 警院智慧考试平台页面巡检：登录、大厅、详情、成绩、错题、资格、命题、阅卷、看板、管理、审计
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = 'C:/Users/24243/Desktop/考试平台2/oss-run/shots/yj';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1560, height: 940 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 300)));

  const shot = async (name, full = false) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
    console.log('shot', name);
  };

  // 登录页
  await page.goto('http://127.0.0.1/yj/login', { waitUntil: 'networkidle' });
  await shot('01-login');
  await page.click('.yj-login-btn');
  await page.waitForURL('**/yj/hall', { timeout: 15000 });
  await page.waitForTimeout(1200);
  await shot('02-hall', true);

  // 详情
  await page.goto('http://127.0.0.1/yj/exams/e_dp_admission', { waitUntil: 'networkidle' });
  await shot('03-detail', true);

  // 成绩单（总分达标但时空分析未达标）
  await page.goto('http://127.0.0.1/yj/result/att_seed_03', { waitUntil: 'networkidle' });
  await shot('04-result', true);

  // 错题本
  await page.goto('http://127.0.0.1/yj/wrong', { waitUntil: 'networkidle' });
  await shot('05-wrong', true);

  // 准入资格
  await page.goto('http://127.0.0.1/yj/admission', { waitUntil: 'networkidle' });
  await shot('06-admission', true);

  // 教师身份
  await page.evaluate(() => {
    localStorage.removeItem('yj_token');
    localStorage.removeItem('yj_user');
  });
  await page.goto('http://127.0.0.1/yj/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
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

  await page.goto('http://127.0.0.1/yj/teacher/workbench', { waitUntil: 'networkidle' });
  await shot('07-workbench', true);
  // 走一遍生成流程
  await page.click('text=下一步：设定参数');
  await page.waitForTimeout(500);
  await shot('08-workbench-params');
  await page.click('text=提交生成');
  await page.waitForTimeout(5200);
  await shot('09-workbench-result', true);

  await page.goto('http://127.0.0.1/yj/teacher/grading', { waitUntil: 'networkidle' });
  await shot('10-grading', true);

  await page.goto('http://127.0.0.1/yj/teacher/stats/e_dp_admission', { waitUntil: 'networkidle' });
  await shot('11-stats', true);

  await page.goto('http://127.0.0.1/yj/teacher/manage', { waitUntil: 'networkidle' });
  await shot('12-manage', true);

  await page.goto('http://127.0.0.1/yj/admin/audit', { waitUntil: 'networkidle' });
  await shot('13-audit', true);

  console.log('--- console errors ---');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => {
  console.error('FATAL', e.message);
  process.exit(1);
});
