// 通过侧边栏菜单逐页截图
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');

const OUT = 'C:/Users/24243/Desktop/考试平台2/oss-run/shots';
const REDIS = 'C:/yk-runtime/redis-7.4.0-windows-x64-msys2/redis-cli.exe';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

  let uuidResolve;
  const uuidP = new Promise(r => uuidResolve = r);
  page.on('response', async r => {
    if (r.url().includes('/auth/code')) { try { const j = await r.json(); uuidResolve(j.data.uuid); } catch (e) { } }
  });

  await page.goto('http://127.0.0.1/', { waitUntil: 'domcontentloaded' });
  const uuid = await Promise.race([uuidP, new Promise(r => setTimeout(() => r(null), 15000))]);
  const code = execFileSync(REDIS, ['-a', 'ruoyi123', 'get', 'global:captcha_codes:' + uuid], { encoding: 'utf8' }).trim().replace(/"/g, '');
  const inputs = page.locator('.el-form-item input');
  await inputs.nth(1).fill('admin');
  await inputs.nth(2).fill('admin123');
  await inputs.nth(3).fill(code);
  await page.locator('button.el-button--primary').first().click();
  await page.waitForTimeout(5000);
  console.log('登录后 =', page.url());

  const menus = ['试题管理', '试卷管理', '考试管理', '试卷中心', '考试统计', '阅卷管理', '错题本'];
  let i = 3;
  for (const m of menus) {
    const item = page.locator('.el-menu-item, .el-sub-menu__title', { hasText: m }).first();
    if (await item.count() === 0) { console.log('未找到菜单', m); continue; }
    await item.click();
    await page.waitForTimeout(3500);
    const txt = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 120);
    console.log(`[${m}] url=${page.url()} text=${txt}`);
    await page.screenshot({ path: `${OUT}/menu-${i}-${m}.png`, fullPage: false });
    i++;
  }
  await browser.close();
  console.log('done');
})();
