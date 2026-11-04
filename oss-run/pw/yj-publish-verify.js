// 考试发布模块验收：教师审核/发布界面 + 学生接收考试
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/24243/Desktop/考试平台2/oss-run/shots/yj-publish';
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
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 940 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)); });

  await login(page, '陈立群');
  await page.goto('http://127.0.0.1/yj/publish', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/01-review.png`, fullPage: true });
  console.log('rows:', await page.locator('.ant-table-row').count());

  // 文档预览
  await page.locator('.ant-table-row').first().locator('a').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/02-preview.png` });
  await page.locator('.ant-drawer-close').first().click().catch(()=>{});
  await page.waitForTimeout(600);

  // 打开发布弹窗（审核通过的文档）
  const pubBtn = page.getByRole('button', { name: /发布考试|重新发布/ }).first();
  if (await pubBtn.count()) {
    await pubBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/03-publish-modal.png` });
    await page.locator('.ant-modal-close').first().click().catch(()=>{});
    await page.waitForTimeout(500);
  }

  // 审核弹窗
  const rejectBtn = page.getByRole('button', { name: '驳回' }).first();
  if (await rejectBtn.count()) {
    await rejectBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/04-review-modal.png` });
    await page.locator('.ant-modal-footer button').first().click();
    await page.waitForTimeout(400);
  }

  // 已发布考试
  await page.getByRole('tab', { name: /已发布考试管理/ }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/05-exams.png`, fullPage: true });

  await page.getByText('退出', { exact: true }).click();
  await page.waitForTimeout(900);

  // 学生端
  await login(page, '张予安');
  await page.goto('http://127.0.0.1/yj/hall', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/06-student-hall.png`, fullPage: true });
  const card = page.locator('.yj-exam-card', { hasText: '数据警务技术阶段考试（在线）' }).first();
  console.log('student card:', await card.count());
  if (await card.count()) {
    await card.getByRole('button', { name: /进入考试|重考提分|继续答题|查看/ }).first().click();
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${OUT}/07-student-exam.png`, fullPage: true });
  }

  console.log('errors:', errors.length ? errors.slice(0, 6) : 'none');
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
