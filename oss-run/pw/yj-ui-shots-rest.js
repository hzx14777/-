/**
 * 其余一级页面的回归截图（检查新令牌下是否有排版破损）
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = 'C:/Users/24243/Desktop/考试平台2/output/ui-redesign/after/_rest';
const BASE = 'http://127.0.0.1';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const loginAs = async (who) => {
    await page.goto(BASE + '/yj/login', { waitUntil: 'load' });
    await page.locator('button.ant-btn-primary').first().click();
    await page.waitForURL(/sso\/oauth\/authorize/);
    await page.locator(`a:has-text("${who}")`).first().click();
    await page.waitForURL(/\/yj\/(hall|login)/);
    await page.waitForTimeout(800);
  };

  const pages = [
    ['01-wrong', '/yj/wrong'],
    ['02-admission', '/yj/admission'],
    ['03-workbench', '/yj/workbench'],
    ['04-aibank', '/yj/ai-bank'],
    ['05-doclib', '/yj/doclib'],
    ['06-manage', '/yj/manage'],
    ['07-audit', '/yj/audit']
  ];

  await loginAs('张予安');
  await page.goto(BASE + '/yj/wrong', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, '01-wrong.png') });
  await page.goto(BASE + '/yj/admission', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, '02-admission.png') });

  await ctx.clearCookies();
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await loginAs('陈立群');
  for (const [name, url] of pages.slice(2)) {
    await page.goto(BASE + url, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, name + '.png') });
    console.log('shot', name);
  }

  /* 发布页（表格列宽修复后） */
  await page.goto(BASE + '/yj/publish', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, '08-publish.png') });

  await browser.close();
})();
