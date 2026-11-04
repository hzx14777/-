/**
 * 判断题选项渲染与交互验收
 * 覆盖：判断题选项补齐、单选/填空/简答不受影响、选择后答题卡与自动保存
 */
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = 'C:/Users/24243/Desktop/考试平台2/oss-run/shots/yj-judge';
const ATTEMPT = process.argv[2] || 'att_mw1ny2w05d81';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 140)); });

  await page.goto('http://127.0.0.1/yj/login', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /统一认证中心登录/ }).click();
  await page.waitForSelector('a.b');
  await page.locator('a.b', { hasText: '陈立群' }).click();
  await page.waitForURL('**/yj/hall');

  await page.goto(`http://127.0.0.1/yj/answer/${ATTEMPT}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const readQ = async () => page.evaluate(() => {
    const stem = document.querySelector('.yj-q-stem')?.innerText || '';
    const opts = [...document.querySelectorAll('.yj-option')].map((el) => ({
      text: el.innerText.replace(/\n/g, ' ').trim(),
      active: el.classList.contains('active'),
      hasRadio: !!el.querySelector('input[type=radio]'),
      checked: !!el.querySelector('input[type=radio]:checked')
    }));
    return { stem: stem.replace(/\n/g, ' ').slice(0, 80), opts };
  });

  // 1. 第 1 题：单选
  const single = await readQ();
  console.log('Q1 单选 ->', JSON.stringify(single, null, 0));
  await page.screenshot({ path: `${OUT}/01-single.png`, fullPage: false });

  // 2. 跳到第 4 题：判断题
  await page.locator('.yj-answer-cell', { hasText: /^4$/ }).click();
  await page.waitForTimeout(500);
  const judge = await readQ();
  console.log('Q4 判断 ->', JSON.stringify(judge, null, 0));
  await page.screenshot({ path: `${OUT}/02-judge-before.png`, fullPage: false });

  // 3. 选择“正确”
  const correctOpt = page.locator('.yj-option', { hasText: '正确' }).first();
  await correctOpt.click();
  await page.waitForTimeout(400);
  const picked = await readQ();
  console.log('Q4 选择后 ->', JSON.stringify(picked.opts, null, 0));
  await page.screenshot({ path: `${OUT}/03-judge-picked.png`, fullPage: false });

  // 4. 第 5 题判断题（交互独立性）
  await page.getByRole('button', { name: '下一题' }).click();
  await page.waitForTimeout(500);
  const q5 = await readQ();
  const q5cell = await page.locator('.yj-answer-cell').nth(4).getAttribute('class');
  console.log('Q5 判断 ->', JSON.stringify(q5, null, 0), '| 答题卡5:', q5cell);
  await page.locator('.yj-option', { hasText: '错误' }).first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/04-judge-second.png`, fullPage: false });

  // 5. 切回第 4 题确认选中态保留
  await page.locator('.yj-answer-cell', { hasText: /^4$/ }).click();
  await page.waitForTimeout(400);
  const back = await readQ();
  console.log('Q4 回看 ->', JSON.stringify(back.opts, null, 0));

  // 6. 填空题 / 简答题渲染不受影响
  await page.locator('.yj-answer-cell', { hasText: /^7$/ }).click();
  await page.waitForTimeout(400);
  const blank = await page.evaluate(() => ({
    inputs: document.querySelectorAll('.yj-q-item input[type=text], .yj-q-item input:not([type])').length,
    placeholders: [...document.querySelectorAll('.yj-q-item input')].map((i) => i.getAttribute('placeholder'))
  }));
  console.log('Q7 填空 ->', JSON.stringify(blank));
  await page.screenshot({ path: `${OUT}/05-blank.png`, fullPage: false });

  await page.locator('.yj-answer-cell', { hasText: /^9$/ }).click();
  await page.waitForTimeout(400);
  const essay = await page.evaluate(() => !!document.querySelector('.yj-q-item textarea'));
  console.log('Q9 简答 textarea ->', essay);
  await page.screenshot({ path: `${OUT}/06-essay.png`, fullPage: false });

  console.log('errors:', errs.length ? errs : 'none');
  fs.writeFileSync(`${OUT}/result.json`, JSON.stringify({ single, judge, picked, q5, back, blank, essay, errs }, null, 2));
  await browser.close();
})();
