// 部署结果验收：用真实浏览器走一遍登录 → 大厅 → AI 题库（只读，不写数据）
// 用法: node verify-deploy.js [BASE_URL]   默认 http://8.134.60.240
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = (process.argv[2] || process.env.YJ_BASE || 'http://8.134.60.240').replace(/\/$/, '');
const OUT = 'C:/Users/24243/Desktop/考试平台2/oss-run/shots/deploy';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 160)));
  page.on('requestfailed', (r) => errors.push(`REQFAIL ${r.url().slice(-60)} ${r.failure()?.errorText || ''}`));

  const t0 = Date.now();

  // 1. 登录页
  await page.goto(`${BASE}/yj/login`, { waitUntil: 'networkidle', timeout: 30000 });
  const title = await page.title();
  const hasBtn = await page.getByRole('button', { name: /统一认证中心登录/ }).count();
  await page.screenshot({ path: `${OUT}/01-login.png` });
  console.log(`[1] 登录页 title="${title}" 登录按钮=${hasBtn}`);

  // 2. 走统一认证（mock）→ 回调 → 大厅
  await page.getByRole('button', { name: /统一认证中心登录/ }).click();
  await page.waitForSelector('a.b', { timeout: 20000 });
  await page.screenshot({ path: `${OUT}/02-sso.png` });
  await page.locator('a.b', { hasText: '陈立群' }).click();
  await page.waitForURL('**/yj/hall', { timeout: 30000 });
  await page.waitForTimeout(1200);
  const cards = await page.locator('.ant-card').count();
  const hallText = (await page.locator('body').innerText()).slice(0, 120).replace(/\s+/g, ' ');
  await page.screenshot({ path: `${OUT}/03-hall.png`, fullPage: true });
  console.log(`[2] 登录成功 → ${page.url()}  卡片数=${cards}`);

  // 3. 只读页面：AI 题库总数
  await page.goto(`${BASE}/yj/ai-bank`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(900);
  let bankTotal = 'n/a';
  try {
    bankTotal = (await page.locator('.ant-pagination-total-text').first().innerText()).trim();
  } catch (e) { /* 忽略 */ }
  await page.screenshot({ path: `${OUT}/04-ai-bank.png`, fullPage: true });
  console.log(`[3] AI 题库：${bankTotal}`);

  // 4. 接口层抽查
  const api = await page.evaluate(async () => {
    const hit = async (u) => {
      const r = await fetch(u, { headers: { Accept: 'application/json' } });
      return `${u} -> ${r.status}`;
    };
    return [await hit('/yjapi/api/v1/health'), await hit('/api/v1/health')];
  });
  console.log(`[4] 接口：${api.join(' | ')}`);

  const ms = Date.now() - t0;
  console.log(`耗时 ${ms} ms，控制台错误 ${errors.length} 条`);
  if (errors.length) errors.slice(0, 8).forEach((e) => console.log('   !', e));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(2); });
