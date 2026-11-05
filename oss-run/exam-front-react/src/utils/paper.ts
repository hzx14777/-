/**
 * 试卷 / 练习导出：统一的排版与文件下载（HTML / Word / 打印）
 * 题型/难度的中文与颜色统一取自 constants/dictionary.ts，导出与页面展示同源。
 */
import { formatAnswer } from './format';

const SECTIONS: Record<string, string> = {
  single: '单项选择题', multiple: '多项选择题', judge: '判断题', blank: '填空题', essay: '简答题'
};
const CN = ['一', '二', '三', '四', '五', '六', '七', '八'];

const esc = (s: any) =>
  String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const fmtAnswer = (q: any) => {
  if (!q) return '';
  if (q.answer === null || q.answer === undefined) return '主观题（按评分点给分）';
  return formatAnswer(q.answer, q.type);
};

export const PAPER_CSS = `
.yj-paper{font-family:"SimSun","Songti SC",serif;color:#111;font-size:14px;line-height:1.9;background:#fff;padding:28px 34px}
.yj-paper h1{font-size:20px;text-align:center;margin:0 0 6px;font-weight:700;letter-spacing:1px}
.yj-paper .meta{text-align:center;color:#444;font-size:12.5px;margin-bottom:16px}
.yj-paper .fill{display:flex;gap:26px;font-size:13px;border-top:1px dashed #999;border-bottom:1px dashed #999;padding:9px 2px;margin-bottom:18px}
.yj-paper h2{font-size:15px;margin:22px 0 10px;border-left:4px solid #1e5eff;padding-left:9px}
.yj-paper h3{font-size:14px;margin:16px 0 7px;font-weight:700}
.yj-paper .q{margin-bottom:11px;page-break-inside:avoid}
.yj-paper .no{font-weight:700;margin-right:4px}
.yj-paper .score{color:#666;font-size:12px;margin-left:6px}
.yj-paper .opts{display:flex;flex-wrap:wrap;gap:2px 20px;margin:2px 0 0 20px}
.yj-paper .opt{min-width:44%;font-size:13.5px}
.yj-paper .answer-lines span{display:block;border-bottom:1px solid #bbb;height:26px}
.yj-paper .ans{margin-bottom:9px;font-size:13.5px}
.yj-paper .ana{color:#555;font-size:12.5px;margin-top:2px}
@media print{.yj-paper{padding:0}.yj-paper h2{page-break-after:avoid}.yj-paper .q{page-break-inside:avoid}}
`;

const JUDGE_OPTIONS = [{ id: 'T', content: '正确' }, { id: 'F', content: '错误' }];

/* 判断题题库态不带选项，导出时补齐“正确 / 错误” */
export const optionsOf = (q: any): any[] => {
  const list = Array.isArray(q?.options) ? q.options.filter((o: any) => o && o.id) : [];
  if (list.length) return list;
  if (q?.type === 'judge') return JUDGE_OPTIONS;
  return [];
};

export function paperBody(doc: any, withAnswer: boolean) {
  const items: any[] = doc?.items || [];
  const groups: { type: string; list: any[] }[] = [];
  ['single', 'multiple', 'judge', 'blank', 'essay'].forEach((t) => {
    const list = items.filter((i) => i.type === t);
    if (list.length) groups.push({ type: t, list });
  });

  let no = 0;
  const sections = groups.map((g, gi) => {
    const rows = g.list.map((it) => {
      no += 1;
      let s = `<div class="q"><div><span class="no">${no}.</span>${esc(it.stem)}<span class="score">（${it.score} 分）</span></div>`;
      const opts = optionsOf(it);
      if (opts.length) {
        const cells = opts.map((o: any) => `<div class="opt">${it.type === 'judge' ? '' : `<b>${esc(o.id)}.</b> `}${esc(o.content)}</div>`).join('');
        s += `<div class="opts">${cells}</div>`;
      }
      if (it.type === 'essay') s += `<div class="answer-lines"><span></span><span></span><span></span></div>`;
      return s + '</div>';
    }).join('');
    return `<h3>${CN[gi] || gi + 1}、${SECTIONS[g.type] || ''}</h3>${rows}`;
  }).join('');

  const answers = withAnswer
    ? `<h2>参考答案与解析</h2>${items.map((it, i) => `<div class="ans"><b>${i + 1}.</b> ${esc(fmtAnswer(it))}${it.analysis ? `<div class="ana">解析：${esc(it.analysis)}</div>` : ''}</div>`).join('')}`
    : '';

  const meta = [
    doc?.courseName || '',
    `共 ${doc?.questionCount || items.length} 题`,
    `满分 ${doc?.totalScore || 0} 分`,
    doc?.duration ? `建议时长 ${doc.duration} 分钟` : ''
  ].filter(Boolean).join(' · ');

  return `
    <h1>${esc(doc?.title || '')}</h1>
    <div class="meta">${esc(meta)}</div>
    <div class="fill"><span>姓名：____________</span><span>学号：____________</span><span>得分：________</span></div>
    ${sections}
    ${answers}
  `;
}

export function fullPaperHtml(doc: any, withAnswer: boolean) {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8" />
<title>${esc(doc?.title || '试卷')}</title><style>${PAPER_CSS}</style></head>
<body><div class="yj-paper">${paperBody(doc, withAnswer)}</div></body></html>`;
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob(['\ufeff' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[\\/:*?"<>|]/g, '_');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export function printPaper(doc: any, withAnswer: boolean) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return;
  w.document.write(fullPaperHtml(doc, withAnswer));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}
