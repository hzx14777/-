// 学生答题链路验证（只答题、不交卷）：用于新前端回归，跑在隔离实例上
// 用法: node student-flow.js [BASE_URL] [学生姓名]
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = (process.argv[2] || 'http://127.0.0.1:8092').replace(/\/$/, '');
const WHO = process.argv[3] || '张予安';
const OUT = 'C:/Users/24243/Desktop/考试平台2/oss-run/shots/deploy';
fs.mkdirSync(OUT, { recursive: true });

const step = (n, s) => console.log(`[${n}] ${s}`);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 160)));

  // 1. 学生登录
  await page.goto(`${BASE}/yj/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByRole('button', { name: /统一认证中心登录/ }).click();
  await page.waitForSelector('a.b', { timeout: 20000 });
  await page.locator('a.b', { hasText: WHO }).click();
  await page.waitForURL('**/yj/hall', { timeout: 30000 });
  await page.waitForTimeout(900);
  step(1, `学生登录成功 role=学生 url=${page.url()}`);

  // 2. 进入可作答的考试详情
  const enter = page.getByRole('button', { name: '进入考试' }).first();
  if (!(await enter.count())) throw new Error('大厅没有可进入的考试卡');
  await enter.click();
  await page.waitForTimeout(1500);
  const detailUrl = page.url();
  await page.screenshot({ path: `${OUT}/05-exam-detail.png`, fullPage: true });
  step(2, `进入考试详情 ${detailUrl}`);

  // 3. 开始考试：新版点「开始考试」直接进入答题页；兼容旧版弹窗勾选承诺的交互
  await page.getByRole('button', { name: /开始考试|重新开始/ }).first().click();
  await page.waitForTimeout(900);
  const goBtn = page.getByRole('button', { name: /进入答题|确认开始/ });
  if (await goBtn.count()) {
    const cb = page.locator('.ant-modal .ant-checkbox-input').first();
    if (await cb.count()) await cb.click({ force: true }).catch(() => {});
    await page.waitForTimeout(200);
    await goBtn.last().click();
  }
  await page.waitForURL('**/yj/answer/**', { timeout: 20000 });
  await page.waitForTimeout(1500);
  step(3, `进入答题页 ${page.url()}`);

  // 4. 逐题渲染检查：单选/多选/判断/填空/简答
  const qnav = page.locator('.ant-anchor a, .yj-qnav button, .question-nav button');
  const navCount = await qnav.count();
  const radios = await page.locator('.ant-radio-wrapper').count();
  const checks = await page.locator('.ant-checkbox-wrapper').count();
  const areas = await page.locator('textarea').count();
  step(4, `题号导航=${navCount} 单选=${radios} 多选=${checks} 文本域=${areas}`);

  // 5. 点一道选择题，验证可选中 + 答题卡联动
  if (radios) {
    await page.locator('.ant-radio-wrapper').first().click();
    await page.waitForTimeout(400);
    const checked = await page.locator('.ant-radio-wrapper-checked, .ant-radio-input:checked').count();
    step(5, `点击选项后选中标记=${checked}`);
  }
  await page.screenshot({ path: `${OUT}/06-answer.png`, fullPage: true });

  const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const hasSave = /已保存|自动保存|保存于/.test(bodyText);
  step(6, `页面文本 ${bodyText.length} 字，含保存提示=${hasSave}`);

  const bad = errs.length;
  console.log(`\n控制台错误 ${bad} 条`);
  errs.slice(0, 6).forEach((e) => console.log('  !', e));
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(2); });
