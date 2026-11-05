// 线上全路由冒烟：逐个访问页面，记录控制台错误与渲染状态
// 用法: node smoke-routes.js [BASE_URL] [角色姓名]
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = (process.argv[2] || 'http://8.134.60.240').replace(/\/$/, '');
const WHO = process.argv[3] || '陈立群';
const OUT = 'C:/Users/24243/Desktop/考试平台2/oss-run/shots/deploy';
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = ['/hall', '/wrong', '/admission', '/workbench', '/ai-bank', '/doclib', '/publish', '/grading', '/manage', '/audit'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  let bucket = [];
  page.on('console', (m) => { if (m.type() === 'error') bucket.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => bucket.push('PAGEERROR ' + e.message.slice(0, 140)));
  page.on('requestfailed', (r) => bucket.push(`REQFAIL ${r.url().slice(-50)}`));

  await page.goto(`${BASE}/yj/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByRole('button', { name: /统一认证中心登录/ }).click();
  await page.waitForSelector('a.b', { timeout: 20000 });
  await page.locator('a.b', { hasText: WHO }).click();
  await page.waitForURL('**/yj/hall', { timeout: 30000 });
  console.log(`登录角色：${WHO}\n`);

  let bad = 0;
  for (const r of ROUTES) {
    bucket = [];
    await page.goto(`${BASE}/yj${r}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(700);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
    const forbidden = /无权|403|没有权限/.test(text.slice(0, 200));
    const ok = text.length > 80 && !forbidden;
    const rows = await page.locator('.ant-table-row').count();
    const cards = await page.locator('.ant-card').count();
    if (!ok && !forbidden) {
      bad++;
      await page.screenshot({ path: `${OUT}/fail${r.replace(/\//g, '-')}.png`, fullPage: true });
    }
    const flag = forbidden ? '无权限(预期内)' : ok ? 'OK' : '异常';
    console.log(`${r.padEnd(12)} ${flag.padEnd(12)} 文本${String(text.length).padStart(4)}字 表格${String(rows).padStart(2)}行 卡片${String(cards).padStart(2)} 错误${bucket.length}`);
    if (bucket.length) bucket.slice(0, 3).forEach((e) => console.log(`             ! ${e}`));
  }

  await browser.close();
  console.log(`\n异常页面：${bad}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(2); });
