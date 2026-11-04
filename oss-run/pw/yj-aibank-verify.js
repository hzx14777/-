// 验证 AI 题库模块：入口、检索、详情、状态管理
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

  const menu = await page.locator('.ant-menu-item').allInnerTexts();
  console.log('menu:', JSON.stringify(menu));

  await page.getByRole('link', { name: 'AI 题库' }).click();
  await page.waitForURL('**/yj/ai-bank', { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/01-bank.png`, fullPage: true });

  const stats = await page.locator('.ant-statistic').allInnerTexts();
  console.log('stats:', JSON.stringify(stats.map((s) => s.replace(/\s+/g, ' '))));
  console.log('rows on page 1:', await page.locator('.ant-table-tbody tr.ant-table-row').count());

  // 按学科筛选
  await page.locator('.ant-select', { hasText: '学科 / 课程' }).click();
  await page.locator('.ant-select-item-option', { hasText: '数据警务技术' }).click();
  await page.waitForTimeout(900);
  console.log('after course filter:', (await page.locator('.ant-pagination-total-text').innerText()).trim());
  await page.screenshot({ path: `${OUT}/02-filter.png`, fullPage: true });

  // 详情抽屉
  await page.locator('.ant-table-tbody tr.ant-table-row a').first().click();
  await page.waitForSelector('.ant-drawer-content');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/03-detail.png` });
  await page.locator('.ant-drawer-close').click();
  await page.waitForTimeout(400);

  // 下架 -> 上架
  await page.getByRole('button', { name: '下架' }).first().click();
  await page.waitForTimeout(900);
  console.log('offline tags:', await page.locator('.ant-tag-warning').count());
  await page.screenshot({ path: `${OUT}/04-offline.png`, fullPage: true });
  await page.getByRole('button', { name: '上架' }).first().click();
  await page.waitForTimeout(900);
  console.log('restored tags:', await page.locator('.ant-tag-warning').count());

  console.log('console errors:', errors.length ? JSON.stringify(errors) : 'none');
  await browser.close();
})().catch((e) => {
  console.error('VERIFY FAILED:', e.message);
  process.exit(1);
});
