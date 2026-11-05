/**
 * 改造后界面截图（视觉验收用，不参与生产构建）
 * 用法：node yj-ui-shots.js [outDir]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || 'C:/Users/24243/Desktop/考试平台2/output/ui-redesign/after';
const BASE = 'http://127.0.0.1';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  const shot = async (name, full = false) => {
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: full });
    console.log('shot', name, page.url());
  };

  const loginAs = async (who) => {
    await page.goto(BASE + '/yj/login', { waitUntil: 'load' });
    await page.waitForTimeout(500);
    await page.locator('button.ant-btn-primary').first().click();
    await page.waitForURL(/sso\/oauth\/authorize/, { timeout: 20000 });
    await page.locator(`a:has-text("${who}")`).first().click();
    await page.waitForURL(/\/yj\/(hall|login)/, { timeout: 20000 });
    await page.waitForTimeout(1200);
  };

  /* 1. 登录页（未登录状态） */
  await page.goto(BASE + '/yj/login', { waitUntil: 'load' });
  await shot('01-login');

  /* 2. 学生：大厅 */
  await loginAs('张予安');
  await shot('02-hall');

  /* 3. 学生：成绩单（种子 78.5 分，未达标，含知识点组） */
  await page.goto(BASE + '/yj/result/att_seed_03', { waitUntil: 'load' });
  await shot('03-result');

  /* 4. 学生：考试详情 */
  await page.goto(BASE + '/yj/exam/e_ns_skill', { waitUntil: 'load' });
  await shot('04-exam');

  /* 5. 学生：答题页（开始一场真实作答；会新增一条 attempt，默认不跑） */
  if (process.env.WITH_ANSWER === '1') {
    const btn = page.locator('button:has-text("开始考试"), button:has-text("重新开始")').first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForURL(/\/yj\/answer\//, { timeout: 20000 });
      await page.waitForTimeout(1200);
      // 答一题，让答题卡有状态差异
      const opts = page.locator('.yj-option');
      if (await opts.count()) {
        await opts.nth(1).click();
        await page.waitForTimeout(200);
      }
      await shot('05-answer');
    }
  }

  /* 6. 教师：阅卷中心 */
  await ctx.clearCookies();
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await loginAs('陈立群');
  await page.goto(BASE + '/yj/grading', { waitUntil: 'load' });
  await shot('06-grading');

  /* 7. 教师：分析看板 */
  await page.goto(BASE + '/yj/stats/e_ns_skill', { waitUntil: 'load' });
  await shot('07-stats');

  /* 8. 教师：考试发布 */
  await page.goto(BASE + '/yj/publish', { waitUntil: 'load' });
  await shot('08-publish');

  await browser.close();
})();
