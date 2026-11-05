/**
 * 效果图重渲染脚本（设计方案用，不参与生产构建）
 * 用法：node render.js
 * 依赖：本机 oss-run/pw/node_modules 中的 playwright
 */
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');

const HERE = __dirname;
const OUT = path.resolve(HERE, '..');

const JOBS = [
  ['mockup-1.html', { s1: '01-login.png', s2: '02-hall.png', s3: '03-answer.png' }],
  ['mockup-2.html', { s4: '04-result.png', s5: '05-grading.png', s6: '06-analytics.png', s7: '07-paper.png' }],
  ['mockup-3.html', { s8: '08-tokens.png' }]
];

(async () => {
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  for (const [file, map] of JOBS) {
    await page.goto(pathToFileURL(path.join(HERE, file)).href, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    for (const [id, out] of Object.entries(map)) {
      const el = page.locator('#' + id);
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      await el.screenshot({ path: path.join(OUT, out) });
      console.log('ok', out);
    }
  }
  await b.close();
})();
