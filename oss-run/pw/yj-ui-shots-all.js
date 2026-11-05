/**
 * 全量页面截图（桌面 1440×900 + 移动 390×844），用于改造后的视觉回归
 * 用法：node yj-ui-shots-all.js
 * 顺序按登录身份分组，避免跨身份访问导致 403。
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = 'C:/Users/24243/Desktop/考试平台2/output/ui-redesign/after';
const MOBILE = path.join(OUT, '_mobile');
const BASE = 'http://127.0.0.1';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(MOBILE, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const loginAs = async (who) => {
    await page.goto(BASE + '/yj/login', { waitUntil: 'load' });
    await page.locator('button.ant-btn-primary').first().click();
    await page.waitForURL(/sso\/oauth\/authorize/);
    await page.locator(`a:has-text("${who}")`).first().click();
    await page.waitForURL(/\/yj\/(hall|login)/);
    await page.waitForTimeout(700);
  };
  const relogin = async (who) => {
    await ctx.clearCookies();
    await page.evaluate(() => localStorage.clear()).catch(() => {});
    await loginAs(who);
  };
  const save = async (name) => {
    await page.screenshot({ path: path.join(OUT, name + '.png') });
    console.log('shot', name);
  };
  const go = async (url, wait = 1100) => {
    await page.goto(BASE + url, { waitUntil: 'load' });
    await page.waitForTimeout(wait);
  };

  /* ---------- 学生身份 ---------- */
  await loginAs('张予安');
  await go('/yj/wrong');
  await save('01-wrong');
  await go('/yj/admission');
  await save('02-admission');

  /* ---------- 教师身份：工作台 / 文档库 ---------- */
  await relogin('陈立群');

  /* 工作台第一步（课程网格） */
  await go('/yj/workbench');
  await save('03-workbench');

  /* 工作台第二步（章节 + 参数） */
  await page.locator('.yj-course-card').first().click();
  await page.waitForTimeout(700);
  await page.locator('.yj-chapter-item').first().click();
  await page.waitForTimeout(700);
  await page.locator('button:has-text("下一步：配置参数")').click();
  await page.waitForTimeout(900);
  await save('03b-workbench-step1');

  /* 文档库：题库页签 */
  await go('/yj/doclib', 1400);
  await save('04-doclib');

  /* 文档库：试卷 / 练习库页签 */
  await page.locator('.ant-tabs-tab:has-text("试卷 / 练习库")').click();
  await page.waitForTimeout(900);
  await save('04c-doclib-docs');

  /* 文档库：勾选两题后的组卷篮 */
  await go('/yj/doclib', 1300);
  const boxes = page.locator('.ant-table-tbody .ant-checkbox-input');
  if (await boxes.count()) {
    await boxes.nth(0).check();
    await boxes.nth(1).check();
    await page.waitForTimeout(350);
    await save('04b-doclib-basket');
  }

  /* ---------- 管理员身份：考试管理 / 审计 ---------- */
  await relogin('平台管理员');
  await go('/yj/manage');
  await save('05-manage');
  await go('/yj/audit');
  await save('06-audit');

  /* 审计：跨平台事件页签 */
  await page.locator('.ant-tabs-tab:has-text("跨平台事件")').click();
  await page.waitForTimeout(700);
  await save('06b-audit-events');

  /* ---------- 移动端 ---------- */
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const mp = await mctx.newPage();
  await mp.goto(BASE + '/yj/login', { waitUntil: 'load' });
  await mp.locator('button.ant-btn-primary').first().click();
  await mp.waitForURL(/sso\/oauth\/authorize/);
  await mp.locator('a:has-text("张予安")').first().click();
  await mp.waitForURL(/\/yj\/(hall|login)/);
  await mp.waitForTimeout(800);

  await mp.screenshot({ path: path.join(MOBILE, '01-hall.png') });
  await mp.goto(BASE + '/yj/wrong', { waitUntil: 'load' });
  await mp.waitForTimeout(900);
  await mp.screenshot({ path: path.join(MOBILE, '02-wrong.png') });
  await mp.goto(BASE + '/yj/admission', { waitUntil: 'load' });
  await mp.waitForTimeout(900);
  await mp.screenshot({ path: path.join(MOBILE, '03-admission.png') });
  await mp.getByLabel('打开导航').click().catch(() => {});
  await mp.waitForTimeout(600);
  await mp.screenshot({ path: path.join(MOBILE, '04-nav.png') });
  console.log('mobile shots done');

  await browser.close();
})();
