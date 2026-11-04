#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Stage 2：把 Markdown 转成 doc-formatter 契约要求的单文件 HTML（全部使用 design-token）。"""
import re, html

SRC = r"C:/Users/24243/Desktop/考试平台2/output/20261103-exam-req/stage1/final_draft.md"
OUT = r"C:/Users/24243/Desktop/考试平台2/output/20261103-exam-req/stage2/formatted-警院智慧考试平台需求规格说明书.html"

lines = open(SRC, encoding="utf-8").read().split("\n")


def inline(t: str) -> str:
    t = html.escape(t, quote=False)
    t = re.sub(r"`([^`]+)`", r'<span class="icode">\1</span>', t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', t)
    return t


def split_row(row: str):
    row = row.strip()
    if row.startswith("|"):
        row = row[1:]
    if row.endswith("|"):
        row = row[:-1]
    return [c.strip() for c in row.split("|")]


body, toc = [], []
h1_no = h2_no = 0
i = 0
title = ""

while i < len(lines):
    s = lines[i].strip()
    if not s:
        i += 1
        continue

    if s.startswith("```"):
        i += 1
        buf = []
        while i < len(lines) and not lines[i].strip().startswith("```"):
            buf.append(lines[i])
            i += 1
        i += 1
        body.append('<div class="codeblock"><pre>' + html.escape("\n".join(buf)) + "</pre></div>")
        continue

    if s.startswith("# ") and not s.startswith("## "):
        title = s[2:].strip()
        i += 1
        continue

    if s.startswith("## "):
        h1_no += 1
        h2_no = 0
        txt = s[3:].strip()
        sid = f"section-{h1_no}"
        body.append(f'<h1 id="{sid}" class="chapter">{inline(txt)}</h1>')
        toc.append((sid, txt, []))
        i += 1
        continue

    if s.startswith("### "):
        h2_no += 1
        txt = s[4:].strip()
        sid = f"section-{h1_no}-{h2_no}"
        body.append(f'<h2 id="{sid}" class="sec">{inline(txt)}</h2>')
        if toc:
            toc[-1][2].append((sid, txt))
        i += 1
        continue

    if s.startswith("#### "):
        txt = s[5:].strip()
        body.append(f'<h3 class="sub">{inline(txt)}</h3>')
        i += 1
        continue

    if s.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|?$", lines[i + 1].strip()):
        header = split_row(s)
        i += 2
        rows = []
        while i < len(lines) and lines[i].strip().startswith("|"):
            rows.append(split_row(lines[i].strip()))
            i += 1
        t = ['<table class="tb"><thead><tr>']
        t += [f"<th>{inline(h)}</th>" for h in header]
        t.append("</tr></thead><tbody>")
        for r in rows:
            t.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>")
        t.append("</tbody></table>")
        body.append("".join(t))
        continue

    if re.match(r"^\d+\.\s+", s):
        items = []
        while i < len(lines) and re.match(r"^\d+\.\s+", lines[i].strip()):
            items.append(re.sub(r"^\d+\.\s+", "", lines[i].strip()))
            i += 1
        body.append('<ol class="ol">' + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ol>")
        continue

    if s.startswith("- "):
        items = []
        while i < len(lines) and lines[i].strip().startswith("- "):
            items.append(lines[i].strip()[2:])
            i += 1
        body.append('<ul class="ul">' + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>")
        continue

    if s.startswith(">"):
        body.append(f'<p class="note">{inline(s.lstrip("> ").strip())}</p>')
        i += 1
        continue

    para = [s]
    i += 1
    while i < len(lines):
        nxt = lines[i].strip()
        if (not nxt or nxt.startswith("#") or nxt.startswith("|") or nxt.startswith("- ")
                or nxt.startswith(">") or nxt.startswith("```") or re.match(r"^\d+\.\s+", nxt)):
            break
        para.append(nxt)
        i += 1
    body.append(f'<p class="p">{inline("".join(para))}</p>')

toc_html = ['<nav class="doc-toc" aria-label="文档目录">', '<p class="toc-title">目 录</p>', '<ol class="toc-list">']
for sid, txt, subs in toc:
    toc_html.append(f'<li><a href="#{sid}">{html.escape(txt)}</a>')
    if subs:
        toc_html.append('<ol class="toc-sub">')
        for ssid, stxt in subs:
            toc_html.append(f'<li><a href="#{ssid}">{html.escape(stxt)}</a></li>')
        toc_html.append("</ol>")
    toc_html.append("</li>")
toc_html.append("</ol></nav>")

CSS = """
  @page {
    @bottom-center { content: "第 " counter(page) " 页"; }
  }
  @page cover {
    @bottom-center { content: none; }
  }
  section[role="cover"] { page: cover; }

  :root {
    --fs-body: 12pt;
    --fs-h1: 19pt;
    --fs-h2: 14pt;
    --fs-h3: 12pt;
    --fs-table: 9.5pt;
    --fs-code: 9pt;
    --fs-icode: 10pt;
    --fs-cover-title: 30pt;
    --fs-cover-sub: 14pt;
    --fs-cover-kicker: 12pt;
    --fs-cover-meta: 11pt;
    --fs-cover-note: 9.5pt;
    --fs-toc-title: 18pt;
    --fs-toc-1: 11pt;
    --fs-toc-2: 10pt;

    --ff-body: "SimSun", "宋体", serif;
    --ff-heading: "SimHei", "黑体", sans-serif;
    --ff-mono: "Consolas", "Courier New", monospace;

    --color-text: #1a1a1a;
    --color-primary: #1b3a6b;
    --color-deep: #12294d;
    --color-muted: #4a5a70;
    --color-faint: #7b8798;
    --color-border: #cfd8e5;
    --color-border-strong: #b9c6d8;
    --color-rule: #d3dae4;
    --color-bg: #ffffff;
    --color-highlight: #e8eef7;
    --color-row-alt: #fafbfd;
    --color-note-bg: #f2f5fa;
    --color-code-bg: #f6f8fa;
    --color-code-border: #dde4ec;
    --color-code-mark: #6b7f9c;

    --sp-0: 0;
    --sp-p: 0.55em;
    --sp-xs: 0.22em;
    --sp-s: 0.7em;
    --sp-m: 0.9em;
    --sp-l: 1.1em;
    --sp-cover: 3.2cm 2.6cm 2.4cm 2.6cm;
    --sp-toc: 2.2cm 2.6cm;
    --sp-body: 1.6cm 2.6cm 2.2cm 2.6cm;
    --sp-cell: 0.4em 0.55em;
    --sp-code: 0.55em 0.85em;
    --sp-note: 0.6em 0.9em;
    --sp-li: 2.2em;
    --sp-toc-sub: 0.18em 0 0.3em 1.5em;
    --sp-summary: 1em 1.2em;
    --sp-toc-1: 0.42em;
    --sp-toc-2: 0.14em;
    --sp-h1-pb: 0.28em;
    --sp-h2-b: 0.5em;
    --sp-h3-b: 0.4em;
    --sp-li-m: 0.3em;
    --sp-block-b: 0.5em;
  }

  body { margin: var(--sp-0); padding: var(--sp-0); background: var(--color-bg); color: var(--color-text); }
  section[role="cover"] { page-break-after: always; }

  .cover { padding: var(--sp-cover); min-height: 22cm; }
  .cover-rule { width: 4.2cm; height: 4px; background: var(--color-primary); margin: var(--sp-0) var(--sp-0) 1.4cm var(--sp-0); }
  .cover-kicker {
    font-family: var(--ff-heading); font-size: var(--fs-cover-kicker); color: var(--color-primary);
    letter-spacing: 0.18em; margin: var(--sp-0) var(--sp-0) 0.9cm var(--sp-0);
  }
  .cover-title {
    font-family: var(--ff-heading); font-size: var(--fs-cover-title); font-weight: 700;
    color: var(--color-deep); line-height: 1.35; margin: var(--sp-0) var(--sp-0) 0.5cm var(--sp-0);
  }
  .cover-sub { font-family: var(--ff-body); font-size: var(--fs-cover-sub); color: var(--color-muted); margin: var(--sp-0) var(--sp-0) 1.6cm var(--sp-0); }
  .cover-line { border-top: 1px solid var(--color-rule); margin: var(--sp-0) var(--sp-0) 0.5cm var(--sp-0); }
  .cover-meta { font-family: var(--ff-body); font-size: var(--fs-cover-meta); color: var(--color-muted); line-height: 2; }
  .cover-note { font-family: var(--ff-body); font-size: var(--fs-cover-note); color: var(--color-faint); line-height: 1.8; margin-top: 1.8cm; }

  .toc-wrap { padding: var(--sp-toc); }
  .toc-title {
    font-family: var(--ff-heading); font-size: var(--fs-toc-title); color: var(--color-deep);
    text-align: center; margin: var(--sp-0) var(--sp-0) 0.9cm var(--sp-0); letter-spacing: 0.3em;
  }
  .toc-list, .toc-list ol, .toc-list ul { list-style: none; list-style-type: none; padding-left: var(--sp-0); margin: var(--sp-0); }
  .toc-list > li { margin: var(--sp-toc-1) var(--sp-0); font-family: var(--ff-heading); font-size: var(--fs-toc-1); }
  .toc-list > li > a { color: var(--color-deep); text-decoration: none; }
  .toc-sub { margin: var(--sp-toc-sub); }
  .toc-sub > li { font-family: var(--ff-body); font-size: var(--fs-toc-2); margin: var(--sp-toc-2) var(--sp-0); }
  .toc-sub > li > a { color: var(--color-muted); text-decoration: none; }

  .body-wrap { padding: var(--sp-body); }

  .executive-summary {
    border-left: 4px solid var(--color-primary);
    background: var(--color-note-bg);
    padding: var(--sp-summary);
    margin: var(--sp-l) var(--sp-0) var(--sp-l) var(--sp-0);
  }
  .executive-summary .summary-title {
    font-family: var(--ff-heading); font-size: var(--fs-h2); font-weight: 700;
    color: var(--color-deep); margin: var(--sp-0) var(--sp-0) var(--sp-s) var(--sp-0);
  }

  h1.chapter {
    font-family: var(--ff-heading); font-size: var(--fs-h1); font-weight: 700; color: var(--color-deep);
    margin: var(--sp-l) var(--sp-0) var(--sp-s) var(--sp-0);
    padding-bottom: var(--sp-h1-pb); border-bottom: 2px solid var(--color-primary);
    page-break-after: avoid;
  }
  h2.sec {
    font-family: var(--ff-heading); font-size: var(--fs-h2); font-weight: 700; color: var(--color-primary);
    margin: var(--sp-l) var(--sp-0) var(--sp-h2-b) var(--sp-0); page-break-after: avoid;
  }
  h3.sub {
    font-family: var(--ff-heading); font-size: var(--fs-h3); font-weight: 700; color: var(--color-muted);
    margin: var(--sp-m) var(--sp-0) var(--sp-h3-b) var(--sp-0); page-break-after: avoid;
  }

  p.p { font-family: var(--ff-body); font-size: var(--fs-body); line-height: 1.75; text-indent: 2em; margin: var(--sp-0) var(--sp-0) var(--sp-p) var(--sp-0); text-align: justify; }
  p.summary { font-family: var(--ff-body); font-size: var(--fs-body); line-height: 1.7; text-indent: 2em; margin: var(--sp-0) var(--sp-0) var(--sp-p) var(--sp-0); }
  p.note {
    font-family: var(--ff-body); font-size: var(--fs-body); line-height: 1.7; color: var(--color-muted);
    background: var(--color-note-bg); border-left: 3px solid var(--color-primary);
    padding: var(--sp-note); margin: var(--sp-s) var(--sp-0) var(--sp-m) var(--sp-0); text-indent: var(--sp-0);
  }

  ol.ol, ul.ul { font-family: var(--ff-body); font-size: var(--fs-body); line-height: 1.7; margin: var(--sp-li-m) var(--sp-0) var(--sp-s) var(--sp-0); padding-left: var(--sp-li); }
  ol.ol li, ul.ul li { margin-bottom: var(--sp-xs); }

  table.tb { width: 100%; border-collapse: collapse; margin: var(--sp-block-b) var(--sp-0) var(--sp-m) var(--sp-0); font-family: var(--ff-body); font-size: var(--fs-table); line-height: 1.5; }
  table.tb th { background: var(--color-highlight); color: var(--color-deep); font-weight: 700; text-align: left; border: 1px solid var(--color-border-strong); padding: var(--sp-cell); }
  table.tb td { border: 1px solid var(--color-border); padding: var(--sp-cell); vertical-align: top; }
  table.tb tr:nth-child(even) td { background: var(--color-row-alt); }

  .codeblock { background: var(--color-code-bg); border: 1px solid var(--color-code-border); border-left: 3px solid var(--color-code-mark); padding: var(--sp-code); margin: var(--sp-block-b) var(--sp-0) var(--sp-m) var(--sp-0); page-break-inside: avoid; }
  .codeblock pre { font-family: var(--ff-mono); font-size: var(--fs-code); line-height: 1.55; margin: var(--sp-0); white-space: pre-wrap; word-wrap: break-word; }
  .icode { font-family: var(--ff-mono); font-size: var(--fs-icode); color: var(--color-deep); }
"""

SUMMARY = """
  <div class="executive-summary">
    <p class="summary-title">需求摘要</p>
    <p class="summary">考试平台是五平台闭环中的能力闸门，向上承接自学平台的课程与学习进度，向下为实训工坊提供项目准入凭据。其核心不是"组织考试"，而是把学习行为转换为可量化、可追溯、可跨平台消费的能力证明。</p>
    <p class="summary">本版需求确立四项关键设定。其一，命题方式改为 AI 主导：由课程正文与知识点标签驱动大模型生成试题，经教师审核后入库，保留手工录题作为兜底。其二，判定采用双达标：总分达到及格线且每个知识点组得分率不低于阈值，才发放准入资格，堵住"偏科拖过"的漏洞。其三，成绩须经人机共判：客观题自动判分，简答题由 AI 按评分要点初评、教师确认后方生效，置信度低于阈值的题目强制人工复核。其四，联动以事件为界：读取课程完成事件解锁考试，通过后推送通过事件与积分事件，全程不直连他库。</p>
    <p class="summary">交付范围覆盖三类考试（章节随堂测、专项技能卷、项目准入卷）、五种题型（单选、多选、判断、填空、简答）、十四个页面与十八个对外接口。开发按 M0 至 M3 四个里程碑推进，以主链路跑通为第一优先级。</p>
  </div>
"""

html_doc = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="docx-page-size" content="A4">
<title>{html.escape(title)}</title>
<style>{CSS}</style>
</head>
<body>
<section role="cover">
  <div class="cover">
    <div class="cover-rule" style="text-align: left;"></div>
    <p class="cover-kicker" style="text-align: left;">警院 WeChat 全生态 · 五平台体系</p>
    <p class="cover-title" style="text-align: left;">警院智慧考试平台<br>需求规格说明书</p>
    <p class="cover-sub" style="text-align: left;">Software Requirements Specification for the Smart Examination Platform</p>
    <div class="cover-line" style="text-align: left;"></div>
    <div class="cover-meta" style="text-align: left;">
      <p class="summary" style="text-align: left;">文档编号　EXAM-SRS-V1.0</p>
      <p class="summary" style="text-align: left;">文档版本　V1.0（需求冻结稿）</p>
      <p class="summary" style="text-align: left;">所属平台　考试平台（五平台之三）</p>
      <p class="summary" style="text-align: left;">编制日期　2026 年 11 月 3 日</p>
      <p class="summary" style="text-align: left;">项目赛道　警务校园教育实训</p>
    </div>
    <p class="cover-note" style="text-align: left;">本文档依据《警院 WeChat 全生态五平台整体方案》与《五平台前端与功能联动约束规范》编制。<br>
    平台采用论坛统一账号登录，遵循五平台统一的接口、角色、数据字典与业务事件规范。</p>
  </div>
</section>
<section role="cover">
  <div class="toc-wrap">
  {''.join(toc_html)}
  </div>
</section>
<section role="body" data-page-restart="1">
  <div class="body-wrap">
  {SUMMARY}
  {chr(10).join(body)}
  </div>
</section>
</body>
</html>
"""

open(OUT, "w", encoding="utf-8").write(html_doc)
print("wrote", OUT)
print("title:", title, "chapters:", h1_no, "tables:", html_doc.count('class="tb"'), "chars:", len(html_doc))
