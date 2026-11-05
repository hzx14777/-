/**
 * 交互态截图：答题页（草稿纸 / 移动端操作条 / 答题卡抽屉）+ 命题工作台第三步
 * 会创建一条作答记录与一个命题任务，跑完请恢复 db.json
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = 'C:/Users/24243/Desktop/考试平台2/output/ui-redesign/after';
const MOBILE = path.join(OUT, '_mobile');
const BASE = 'http://127.0.0.1';

const login = async (page, who) => {
  await page.goto(BASE + '/yj/login', { waitUntil: 'load' });
  await page.locator('button.ant-btn-primary').first().click();
  await page.waitForURL(/sso\/oauth\/authorize/);
  await page.locator(`a:has-text("${who}")`).first().click();
  await page.waitForURL(/\/yj\/(hall|login)/);
  await page.waitForTimeout(600);
};

(async () => {
  fs.mkdirSync(MOBILE, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  /* ---------- 桌面：答题页 + 草稿纸 ---------- */
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await login(page, '张予安');
  await page.goto(BASE + '/yj/exam/e_py_ch1', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const start = page.locator('button:has-text("开始考试"), button:has-text("重新开始"), button:has-text("继续作答")').first();
  if (await start.count()) {
    await start.click({ force: true });
    await page.waitForURL(/\/yj\/answer\//, { timeout: 20000 });
  }
  const answerUrl = page.url();
  await page.waitForTimeout(1400);
  /* 答两题 */
  const opts = page.locator('.yj-option');
  if (await opts.count()) await opts.first().click();
  await page.locator('.yj-qfoot button:has-text("下一题")').click().catch(() => {});
  await page.waitForTimeout(300);
  if (await opts.count()) await opts.nth(1).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '07-answer.png') });
  console.log('shot 07-answer');

  /* 草稿纸 */
  await page.locator('button:has-text("草稿")').first().click();
  await page.waitForTimeout(600);
  await page.locator('.ant-drawer textarea').fill('思路：先写出判定条件，再逐项代入验证；\n注意第 2 项与第 4 项互斥，不能同时选。');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '07b-answer-draft.png') });
  console.log('shot 07b-answer-draft');
  await page.keyboard.press('Escape');

  /* ---------- 移动端：答题页 ---------- */
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  await login(mp, '张予安');
  await mp.goto(answerUrl, { waitUntil: 'load' });
  await mp.waitForTimeout(1500);
  await mp.screenshot({ path: path.join(MOBILE, '05-answer.png') });
  console.log('shot mobile 05-answer');

  await mp.locator('.yj-mbar button:has-text("答题卡")').click();
  await mp.waitForTimeout(700);
  await mp.screenshot({ path: path.join(MOBILE, '06-answer-sheet.png') });
  console.log('shot mobile 06-answer-sheet');

  /* ---------- 桌面：命题工作台第三步 ---------- */
  const tctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const tp = await tctx.newPage();
  await login(tp, '陈立群');
  await tp.goto(BASE + '/yj/workbench', { waitUntil: 'load' });
  await tp.waitForTimeout(900);
  await tp.locator('.yj-course-card').first().click({ force: true });
  await tp.waitForTimeout(600);
  await tp.locator('.yj-chapter-item').first().click({ force: true });
  await tp.waitForTimeout(600);
  await tp.locator('button:has-text("下一步：配置参数")').click({ force: true });
  await tp.waitForTimeout(400);
  await tp.locator('.yj-stepper button[aria-label="减少题量"]').click();
  await tp.locator('.yj-stepper button[aria-label="减少题量"]').click();
  await tp.locator('button:has-text("开始命题")').click();
  await tp.waitForTimeout(2500);
  await tp.screenshot({ path: path.join(OUT, '03c-workbench-progress.png') });
  console.log('shot 03c-workbench-progress');
  /* 等待候选生成 */
  for (let i = 0; i < 40; i += 1) {
    const has = await tp.locator('.yj-cand').count();
    if (has > 0) break;
    await tp.waitForTimeout(1200);
  }
  await tp.waitForTimeout(800);
  await tp.screenshot({ path: path.join(OUT, '03d-workbench-review.png') });
  console.log('shot 03d-workbench-review');

  await browser.close();
})();
