// 文档库最终截图（不产生数据）
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/24243/Desktop/考试平台2/oss-run/shots/yj-doclib';
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
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 150)));

  await login(page, '陈立群');
  await page.goto('http://127.0.0.1/yj/doclib', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/10-compose-final.png` });

  await page.locator('.ant-tree-node-content-wrapper', { hasText: '网络安全基础' }).first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/11-filtered.png` });

  await page.getByRole('tab', { name: /试卷 \/ 练习库/ }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/12-docs-final.png`, fullPage: true });

  await page.getByText('退出', { exact: true }).click();
  await page.waitForTimeout(1000);
  await login(page, '平台管理员');
  await page.goto('http://127.0.0.1/yj/doclib', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.getByRole('tab', { name: '分类维护' }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/13-catalog-final.png` });

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
