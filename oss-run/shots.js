// 砚考前端页面截图与登录验证（Playwright）
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');

const OUT = 'C:/Users/24243/Desktop/考试平台2/oss-run/shots';
const REDIS = 'C:/yk-runtime/redis-7.4.0-windows-x64-msys2/redis-cli.exe';
fs.mkdirSync(OUT, { recursive: true });

const cap = c => ({
  capture: r => { if (r.url().includes('/auth/code')) cap.uuidPromise = r.json(); }
});

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });

  let uuidResolve;
  const uuidP = new Promise(r => uuidResolve = r);
  page.on('response', async r => {
    if (r.url().includes('/auth/code')) {
      try { const j = await r.json(); uuidResolve(j.data.uuid); } catch (e) { }
    }
  });

  await page.goto('http://127.0.0.1/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: OUT + '/01-login.png' });
  console.log('登录页标题 =', await page.title());

  const uuid = await Promise.race([uuidP, new Promise(r => setTimeout(() => r(null), 15000))]);
  let code = null;
  if (uuid) {
    code = execFileSync(REDIS, ['-a', 'ruoyi123', 'get', 'global:captcha_codes:' + uuid], { encoding: 'utf8' }).trim().replace(/"/g, '');
    console.log('uuid =', uuid, 'captcha =', code);
  }

  const inputs = page.locator('.el-form-item input');
  const n = await inputs.count();
  console.log('登录表单输入框数量 =', n);
  await inputs.nth(1).fill('admin');
  await inputs.nth(2).fill('admin123');
  if (n > 3 && code) await inputs.nth(3).fill(code);

  await page.locator('button.el-button--primary').first().click();
  await page.waitForTimeout(5000);
  console.log('登录后 URL =', page.url());
  await page.screenshot({ path: OUT + '/02-home.png' });

  // 逐页截图
  const routes = [
    ['03-exam-list', '/exam'],
    ['04-paper-center', '/exam/center'],
    ['05-records', '/exam/records'],
    ['06-wrong', '/exam/wrong'],
    ['07-certs', '/exam/certs']
  ];
  for (const [name, path] of routes) {
    await page.goto('http://127.0.0.1/#' + path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    console.log(name, '->', page.url(), '标题标题片段:', (await page.locator('body').innerText()).slice(0, 60).replace(/\s+/g, ' '));
    await page.screenshot({ path: OUT + `/${name}.png` });
  }

  await browser.close();
  console.log('done');
})();
