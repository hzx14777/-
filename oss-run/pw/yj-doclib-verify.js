// 验证文档库：教师选题组卷 / 导出，管理员分类与题目维护权限
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
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 200)));

  await login(page, '陈立群');
  console.log('menu:', JSON.stringify((await page.locator('.ant-menu-item').allInnerTexts()).map((s) => s.trim())));

  await page.getByRole('link', { name: '文档库' }).click();
  await page.waitForURL('**/yj/doclib', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/01-teacher-compose.png`, fullPage: true });

  // 教师视角：不应出现分类维护与题目维护按钮
  console.log('teacher tabs:', JSON.stringify((await page.locator('.ant-tabs-tab').allInnerTexts()).map((s) => s.trim())));
  console.log('teacher 新增题目:', await page.getByRole('button', { name: '新增题目' }).count());

  // 选分类
  await page.locator('.ant-tree-node-content-wrapper', { hasText: '数据警务技术' }).first().click();
  await page.waitForTimeout(900);
  console.log('filtered total:', (await page.locator('.ant-pagination-total-text').innerText()).trim());

  // 勾选前 3 题
  const boxes = page.locator('.ant-table-tbody tr.ant-table-row .ant-checkbox-input:not([disabled])');
  const n = Math.min(3, await boxes.count());
  for (let i = 0; i < n; i += 1) await boxes.nth(i).check();
  await page.waitForTimeout(300);
  console.log('selected label:', (await page.locator('.yj-section').last().innerText()).match(/已选 \d+ 题/)?.[0]);

  await page.getByRole('button', { name: '生成试卷' }).click();
  await page.waitForSelector('.ant-modal-content');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/02-compose-modal.png` });

  const title = `自动验收试卷 ${Date.now().toString().slice(-5)}`;
  const titleInput = page.locator('.ant-modal-content input').first();
  await titleInput.fill(title);
  await page.getByRole('button', { name: '生成并预览' }).click();
  await page.waitForSelector('.ant-drawer-content', { timeout: 15000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/03-preview.png` });
  console.log('preview header:', (await page.locator('.ant-drawer-header').innerText()).replace(/\s+/g, ' ').slice(0, 60));

  // 导出 HTML
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.locator('.ant-drawer-content').getByRole('button', { name: 'HTML' }).click()
  ]);
  console.log('download:', download.suggestedFilename());

  await page.locator('.ant-drawer-close').click();
  await page.waitForTimeout(400);
  await page.getByRole('tab', { name: /试卷 \/ 练习库/ }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/04-docs.png`, fullPage: true });
  console.log('docs total:', (await page.locator('.ant-pagination-total-text').last().innerText()).trim());

  // 管理员视角
  await page.getByText('退出', { exact: true }).click();
  await page.waitForTimeout(1200);
  await login(page, '平台管理员');
  await page.goto('http://127.0.0.1/yj/doclib', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  console.log('admin tabs:', JSON.stringify((await page.locator('.ant-tabs-tab').allInnerTexts()).map((s) => s.trim())));
  console.log('admin 新增题目:', await page.getByRole('button', { name: '新增题目' }).count());

  await page.getByRole('tab', { name: '分类维护' }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/05-admin-catalog.png`, fullPage: true });

  console.log('console errors:', errors.length ? JSON.stringify(errors) : 'none');
  await browser.close();
})().catch((e) => {
  console.error('VERIFY FAILED:', e.message);
  process.exit(1);
});
