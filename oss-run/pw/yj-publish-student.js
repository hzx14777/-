// 学生端接收已发布考试：大厅 → 考试详情 → 在线作答
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/24243/Desktop/考试平台2/oss-run/shots/yj-publish';
fs.mkdirSync(OUT, { recursive: true });

const login = async (page, name) => {
  await page.goto('http://127.0.0.1/yj/login', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /统一认证中心登录/ }).click();
  await page.waitForSelector('a.b');
  await page.locator('a.b', { hasText: name }).click();
  await page.waitForURL('**/yj/hall', { timeout: 20000 });
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 940 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)); });

  await login(page, '李明轩');
  await page.goto('http://127.0.0.1/yj/hall', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/06-student-hall.png`, fullPage: true });

  const card = page.locator('.yj-exam-card', { hasText: '数据警务技术阶段考试（在线）' }).first();
  await card.getByRole('button', { name: '进入考试' }).click();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/07-student-detail.png`, fullPage: true });

  const start = page.getByRole('button', { name: /开始考试|继续答题/ }).first();
  if (await start.count()) {
    await start.click();
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${OUT}/08-student-answer.png`, fullPage: true });
    console.log('answer page url:', page.url());
  }

  console.log('errors:', errors.length ? errors.slice(0, 5) : 'none');
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
