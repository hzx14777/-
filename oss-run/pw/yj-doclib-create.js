// 管理员新增题目（CRUD 中的 Create）UI 验收
const { chromium } = require('playwright');

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
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)); });

  await login(page, '平台管理员');
  await page.goto('http://127.0.0.1/yj/doclib', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: '新增题目' }).click();
  await page.waitForSelector('.ant-modal-content');
  await page.waitForTimeout(300);

  // 章节
  await page.locator('.ant-modal-content .ant-select').first().click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
  await page.locator('.ant-modal-content textarea').first().fill('自动验收：以下哪项是 Python 中不可变类型？（验收后删除）');
  await page.getByPlaceholder('选项 A').fill('list');
  await page.getByPlaceholder('选项 B').fill('tuple');
  await page.getByPlaceholder('选项 C').fill('dict');
  await page.getByPlaceholder('选项 D').fill('set');
  // 正确答案选 B
  const answerSelect = page.locator('.ant-modal-content .ant-select').nth(3);
  await answerSelect.click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^B$/ }).first().click();
  await page.getByRole('button', { name: /保\s*存/ }).click();
  await page.waitForTimeout(1200);

  const toasts = await page.locator('.ant-message-notice-content').allInnerTexts();
  console.log('toasts:', JSON.stringify(toasts));
  const has = await page.locator('.ant-table-tbody').innerText();
  console.log('table contains new stem:', has.includes('自动验收'));
  console.log('errors:', errors.length ? JSON.stringify(errors) : 'none');
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
