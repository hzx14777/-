// 验证「命题 → 审核 → 入库 AI 题库」闭环：审核通过后自动跳转题库并可查到新题
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = 'C:/Users/24243/Desktop/考试平台2/oss-run/shots/yj-bank';
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
  await page.waitForSelector('a.b');
  await page.locator('a.b', { hasText: '陈立群' }).click();
  await page.waitForURL('**/yj/hall', { timeout: 20000 });

  // 题库基线
  await page.goto('http://127.0.0.1/yj/ai-bank', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const before = (await page.locator('.ant-pagination-total-text').innerText()).replace(/[^\d]/g, '');
  console.log('bank before:', before);

  await page.goto('http://127.0.0.1/yj/workbench', { waitUntil: 'networkidle' });
  await page.locator('.ant-select').first().click();
  await page.locator('.ant-select-item-option', { hasText: 'Python 数据分析基础' }).click();
  await page.locator('.ant-select').nth(1).click();
  await page.locator('.ant-select-item-option', { hasText: '列表、元组与字典' }).click();
  await page.waitForSelector('text=开始命题');
  await page.getByRole('button', { name: '开始命题' }).click();
  await page.waitForSelector('text=全部通过并入库', { timeout: 25000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/05-review.png`, fullPage: true });

  await page.getByRole('button', { name: /全部通过并入库/ }).click();
  await page.waitForURL('**/yj/ai-bank', { timeout: 20000 });
  await page.waitForTimeout(1200);
  const after = (await page.locator('.ant-pagination-total-text').innerText()).replace(/[^\d]/g, '');
  const toasts = await page.locator('.ant-message-notice-content').allInnerTexts();
  console.log('bank after:', after);
  console.log('toasts:', JSON.stringify(toasts));
  console.log('first rows:', (await page.locator('.ant-table-tbody tr.ant-table-row td').nth(0).innerText()).slice(0, 40));
  await page.screenshot({ path: `${OUT}/06-after-inbound.png`, fullPage: true });
  console.log('console errors:', errors.length ? JSON.stringify(errors) : 'none');
  await browser.close();
})().catch((e) => {
  console.error('VERIFY FAILED:', e.message);
  process.exit(1);
});
