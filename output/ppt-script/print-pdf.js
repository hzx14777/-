/**
 * 生成答辩脚本 PDF
 * 用法：node print-pdf.js
 * 依赖：复用 oss-run/pw 下已安装的 Playwright（无需额外安装）
 */
const path = require('path');
const fs = require('fs');

const HTML = path.join(__dirname, 'exam-ppt-script.html');
const PDF = path.join(__dirname, '警院智慧考试平台_答辩PPT脚本_10页.pdf');
const PW = path.join(__dirname, '../../oss-run/pw/node_modules/playwright');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  ({ chromium } = require(PW));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1122, height: 793 }, deviceScaleFactor: 2 });
  await page.goto('file://' + HTML.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(400);

  // 溢出检查：逐页比对内容高度，超出即告警
  const overflow = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.page').forEach((p, i) => {
      if (p.scrollHeight > p.clientHeight + 1) out.push({ page: i + 1, scrollHeight: p.scrollHeight, clientHeight: p.clientHeight });
    });
    return { pages: document.querySelectorAll('.page').length, overflow: out };
  });
  console.log(`页面数：${overflow.pages}`);
  if (overflow.overflow.length) console.log('内容溢出：', JSON.stringify(overflow.overflow));
  else console.log('内容溢出：无');

  await page.pdf({
    path: PDF,
    format: 'A4',
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  await browser.close();
  const kb = (fs.statSync(PDF).size / 1024).toFixed(0);
  console.log(`已生成：${PDF}（${kb} KB）`);
})();
