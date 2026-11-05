/**
 * 规范整改后的前端一致性验收（约束规范 §16.4 前端一致性）
 * 覆盖：SSO 统一登录、菜单权限、各页面渲染、控制台无报错、统一 403/404、越界功能已下线
 *
 * 用法：node yj-spec-verify.js
 * 输出：oss-run/shots/yj-spec/*.png + 控制台结论
 */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://127.0.0.1';
const OUT = 'C:/Users/24243/Desktop/考试平台2/oss-run/shots/yj-spec';
const PAGES = [
  ['/yj/hall', '考试大厅', '考试大厅'],
  ['/yj/wrong', '错题本', '错题本'],
  ['/yj/admission', '准入资格', '项目准入资格'],
  ['/yj/workbench', 'AI 命题工作台', 'AI 命题工作台'],
  ['/yj/ai-bank', 'AI 题库', 'AI 题库'],
  ['/yj/doclib', '文档库', '文档库'],
  ['/yj/publish', '考试发布', '考试发布'],
  ['/yj/grading', '阅卷中心', '阅卷中心'],
  ['/yj/manage', '考试管理', '考试管理'],
  ['/yj/audit', '审计与事件', '审计与事件']
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1560, height: 940 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errs.push('[console] ' + m.text().slice(0, 160)));

  const report = [];

  /* 1. 统一登录：登录页 → Mock 认证中心 → 管理员授权 → 回到大厅 */
  await page.goto(BASE + '/yj/login', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '前往统一认证中心登录' }).click();
  await page.waitForURL(/\/sso\/oauth\/authorize/, { timeout: 15000 });
  await page.getByRole('link', { name: /平台管理员/ }).click();
  await page.waitForURL(/\/yj\/hall/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  report.push(['统一登录（SSO 授权码）', 'PASS']);

  /* 2. 菜单数量与权限点一致（管理员 10 项） */
  const menuCount = await page.locator('header .ant-menu-item').count();
  report.push([`顶部菜单项 ${menuCount} / 期望 10`, menuCount === 10 ? 'PASS' : 'FAIL']);

  /* 3. 逐页渲染 + 截图 */
  for (const [path, name, expectText] of PAGES) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const body = await page.locator('body').innerText();
    const ok = body.includes(expectText);
    const shot = `${OUT}/${path.split('/').pop()}.png`;
    await page.screenshot({ path: shot, fullPage: false });
    report.push([`${name} 渲染`, ok ? 'PASS' : 'FAIL']);
  }

  /* 4. 越界功能已下线：文档库不应出现「分类维护」，页面不应出现「学习积分」 */
  await page.goto(BASE + '/yj/doclib', { waitUntil: 'networkidle' });
  const doclibText = await page.locator('body').innerText();
  report.push(['文档库已无「分类维护」页签', doclibText.includes('分类维护') ? 'FAIL' : 'PASS']);
  report.push(['文档库提示课程目录由自学平台维护', doclibText.includes('自学平台') ? 'PASS' : 'FAIL']);

  await page.goto(BASE + '/yj/hall', { waitUntil: 'networkidle' });
  const hallText = await page.locator('body').innerText();
  report.push(['大厅已无「学习积分」', hallText.includes('学习积分') ? 'FAIL' : 'PASS']);

  /* 5. 统一 404 页 */
  await page.goto(BASE + '/yj/not-exist-page', { waitUntil: 'networkidle' });
  const notFound = await page.locator('body').innerText();
  report.push(['统一 404 页', notFound.includes('页面不存在') ? 'PASS' : 'FAIL']);

  /* 6. 权限点不足 → 统一 403 页（管理员访问仅超管可见路由不成立，改用模拟：登出后访问受保护页） */
  await ctx.clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '/yj/manage', { waitUntil: 'networkidle' });
  const redirectedToLogin = page.url().includes('/yj/login');
  report.push(['未登录访问受保护页 → 跳统一登录', redirectedToLogin ? 'PASS' : 'FAIL']);

  /* 7. 权限点不足 → 统一 403 页：教师访问仅管理员可见的「审计与事件」 */
  await page.goto(BASE + '/yj/login', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '前往统一认证中心登录' }).click();
  await page.waitForURL(/\/sso\/oauth\/authorize/);
  await page.getByRole('link', { name: /陈立群/ }).click();
  await page.waitForURL(/\/yj\/hall/);
  const teacherMenu = await page.locator('header .ant-menu-item').count();
  report.push([`教师菜单项 ${teacherMenu} / 期望 9（无审计与事件）`, teacherMenu === 9 ? 'PASS' : 'FAIL']);
  await page.goto(BASE + '/yj/audit', { waitUntil: 'networkidle' });
  const auditText = await page.locator('body').innerText();
  report.push(['教师越权访问审计页 → 统一 403', auditText.includes('403') ? 'PASS' : 'FAIL']);

  /* 8. 状态字典：管理页不得直接输出英文状态值 */
  await page.goto(BASE + '/yj/login', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '前往统一认证中心登录' }).click();
  await page.waitForURL(/\/sso\/oauth\/authorize/);
  await page.getByRole('link', { name: /平台管理员/ }).click();
  await page.waitForURL(/\/yj\/hall/);
  await page.goto(BASE + '/yj/manage', { waitUntil: 'networkidle' });
  const manageText = await page.locator('body').innerText();
  const rawStatus = /(^|\s)(published|archived|draft)(\s|$)/.test(manageText);
  report.push(['管理页状态已中文化（无裸英文状态）', rawStatus ? 'FAIL' : 'PASS']);

  console.log('\n===== 规范整改验收 =====');
  report.forEach(([k, v]) => console.log(`${v === 'PASS' ? '✔' : '✘'} ${k}  ${v}`));
  console.log('\n控制台错误（应为 0）：', errs.length);
  errs.slice(0, 10).forEach((e) => console.log('   ', e));
  console.log('\n截图目录：', OUT);

  await browser.close();
})();
