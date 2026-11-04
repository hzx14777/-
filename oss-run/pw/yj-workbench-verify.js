// 验证 AI 命题工作台修复效果（登录 -> 选章节 -> 命题 -> 审核候选题）
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = 'C:/Users/24243/Desktop/考试平台2/oss-run/shots/yj-fix';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 200)));

  await page.goto('http://127.0.0.1/yj/login', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /统一认证中心登录/ }).click();
  await page.waitForSelector('a.b', { timeout: 15000 });
  await page.locator('a.b', { hasText: '陈立群' }).click();
  await page.waitForURL('**/yj/hall', { timeout: 20000 });
  console.log('login ok as teacher');

  await page.goto('http://127.0.0.1/yj/workbench', { waitUntil: 'networkidle' });
  await page.locator('.ant-select').first().click();
  await page.locator('.ant-select-item-option', { hasText: 'Python 数据分析基础' }).click();
  await page.locator('.ant-select').nth(1).click();
  await page.locator('.ant-select-item-option', { hasText: '变量、类型与表达式' }).click();
  await page.waitForSelector('text=开始命题', { timeout: 10000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/01-params.png` });

  await page.getByRole('button', { name: '开始命题' }).click();
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/02-progress.png` });
  const stageText = await page.locator('.yj-section').innerText();
  console.log('progress panel:', stageText.replace(/\s+/g, ' ').slice(0, 120));

  await page.waitForSelector('text=全部通过并入库', { timeout: 20000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/03-result.png`, fullPage: true });
  const body = await page.locator('.yj-section').innerText();
  console.log('result panel:', body.replace(/\s+/g, ' ').slice(0, 160));

  const toasts = await page.locator('.ant-message-notice-content').allInnerTexts().catch(() => []);
  console.log('toasts:', JSON.stringify(toasts));
  console.log('console errors:', errors.length ? JSON.stringify(errors) : 'none');

  await browser.close();
})().catch((e) => {
  console.error('VERIFY FAILED:', e.message);
  process.exit(1);
});
