# -*- coding: utf-8 -*-
"""生成《开源考试系统对标调研与选型报告》docx"""
import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_TAB_ALIGNMENT, WD_TAB_LEADER
import json
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from PIL import Image

BASE = r"C:\Users\24243\Desktop\考试平台2\output\oss-refs"
IMG = os.path.join(BASE, "img")
OUT = r"C:\Users\24243\Desktop\考试平台2\开源考试系统对标调研与选型报告.docx"

DARK = RGBColor(0x1F, 0x38, 0x64)
GRAY = RGBColor(0x59, 0x59, 0x59)
LIGHT = RGBColor(0x80, 0x80, 0x80)

PAGES = {}
_pj = os.path.join(BASE, "toc_pages.json")
if os.path.exists(_pj):
    PAGES = json.load(open(_pj, encoding="utf-8"))

doc = Document()

# ---------- 页面 ----------
sec = doc.sections[0]
sec.page_width = Cm(21.0)
sec.page_height = Cm(29.7)
sec.left_margin = Cm(2.4)
sec.right_margin = Cm(2.4)
sec.top_margin = Cm(2.4)
sec.bottom_margin = Cm(2.2)
CONTENT_W = 16.2


def set_cn_font(run, name="宋体", size=None, bold=None, color=None):
    run.font.name = name
    run._element.rPr.rFonts.set(qn("w:eastAsia"), name)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color is not None:
        run.font.color.rgb = color


def style_setup():
    normal = doc.styles["Normal"]
    normal.font.name = "宋体"
    normal.font.size = Pt(10.5)
    normal.element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    normal.paragraph_format.line_spacing = 1.45
    normal.paragraph_format.space_after = Pt(4)


style_setup()


def add_page_field(par):
    run = par.add_run()
    fld1 = OxmlElement("w:fldChar"); fld1.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText"); instr.set(qn("xml:space"), "preserve"); instr.text = " PAGE "
    fld2 = OxmlElement("w:fldChar"); fld2.set(qn("w:fldCharType"), "end")
    run._r.append(fld1); run._r.append(instr); run._r.append(fld2)
    run.font.size = Pt(9)
    run.font.color.rgb = LIGHT


def header_footer():
    hp = sec.header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = hp.add_run("开源考试系统对标调研与选型报告")
    set_cn_font(r, "宋体", 8.5, False, LIGHT)
    fp = sec.footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = fp.add_run("— ")
    set_cn_font(r, "宋体", 9, False, LIGHT)
    add_page_field(fp)
    r = fp.add_run(" —")
    set_cn_font(r, "宋体", 9, False, LIGHT)


header_footer()


# ---------- 基础块 ----------
def h1(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(20)
    p.paragraph_format.space_after = Pt(10)
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.page_break_before = True
    r = p.add_run(text)
    set_cn_font(r, "微软雅黑", 17, True, DARK)
    # 下边框
    pPr = p._p.get_or_add_pPr()
    pbdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single"); bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:space"), "3"); bottom.set(qn("w:color"), "1F3864")
    pbdr.append(bottom); pPr.append(pbdr)
    return p


def h2(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    set_cn_font(r, "微软雅黑", 13, True, RGBColor(0x2E, 0x54, 0x96))
    return p


def h3(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    set_cn_font(r, "微软雅黑", 11, True, RGBColor(0x33, 0x33, 0x33))
    return p


def para(text, size=10.5, indent=True, space_after=5, color=None, bold=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    if indent:
        p.paragraph_format.first_line_indent = Pt(21)
    r = p.add_run(text)
    set_cn_font(r, "宋体", size, bold, color)
    return p


def bullet(text, size=10.5, level=0):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Pt(21 + 18 * level)
    p.paragraph_format.first_line_indent = Pt(-10.5)
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run("· " if level == 0 else "– ")
    set_cn_font(r, "宋体", size, False, DARK)
    r2 = p.add_run(text)
    set_cn_font(r2, "宋体", size, False, None)
    return p


def shade(cell, color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear"); shd.set(qn("w:color"), "auto"); shd.set(qn("w:fill"), color)
    tcPr.append(shd)


def set_cell_margins(table, top=60, bottom=60, left=90, right=90):
    tblPr = table._tbl.tblPr
    mar = OxmlElement("w:tblCellMar")
    for k, v in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        e = OxmlElement(f"w:{k}")
        e.set(qn("w:w"), str(v)); e.set(qn("w:type"), "dxa")
        mar.append(e)
    tblPr.append(mar)


def table(rows, widths=None, header=True, font=9, first_col_bold=False, align_center=None):
    t = doc.add_table(rows=0, cols=len(rows[0]))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    set_cell_margins(t)
    for i, row in enumerate(rows):
        tr = t.add_row()
        trPr = tr._tr.get_or_add_trPr()
        cant = OxmlElement("w:cantSplit"); trPr.append(cant)
        if header and i == 0:
            th = OxmlElement("w:tblHeader"); trPr.append(th)
        cells = tr.cells
        for j, val in enumerate(row):
            cells[j].text = ""
            p = cells[j].paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15
            if align_center and j in align_center:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(str(val))
            is_head = header and i == 0
            set_cn_font(r, "宋体", font, True if is_head or (first_col_bold and j == 0) else False,
                        RGBColor(0xFF, 0xFF, 0xFF) if is_head else RGBColor(0x26, 0x26, 0x26))
            if is_head:
                shade(cells[j], "1F3864")
            elif i % 2 == 0:
                shade(cells[j], "F2F5FA")
    if widths:
        for j, w in enumerate(widths):
            for row in t.rows:
                row.cells[j].width = Cm(w)
    # 小表整体不跨页
    if len(rows) <= 8:
        for row in t.rows[:-1]:
            for cell in row.cells:
                for pp in cell.paragraphs:
                    pp.paragraph_format.keep_with_next = True
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t


def _normalize(path):
    """python-docx 不支持 webp，统一转为 png 副本"""
    if os.path.splitext(path)[1].lower() not in (".webp", ".gif", ".bmp"):
        return path
    conv_dir = os.path.join(BASE, "conv")
    os.makedirs(conv_dir, exist_ok=True)
    out = os.path.join(conv_dir, os.path.splitext(os.path.basename(path))[0] + ".png")
    if not os.path.exists(out):
        Image.open(path).convert("RGB").save(out)
    return out


def figure(no, path, caption, desc, func, source, how):
    path = _normalize(path)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    run = p.add_run()
    run.add_picture(path, width=Cm(14.6))

    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_after = Pt(3)
    r = cap.add_run(f"图 {no}　{caption}")
    set_cn_font(r, "宋体", 9, True, RGBColor(0x33, 0x33, 0x33))

    d = doc.add_paragraph()
    d.paragraph_format.space_after = Pt(2)
    d.paragraph_format.left_indent = Cm(0.3)
    r = d.add_run(desc)
    set_cn_font(r, "宋体", 9.5, False, RGBColor(0x40, 0x40, 0x40))

    info = doc.add_paragraph()
    info.paragraph_format.space_after = Pt(8)
    info.paragraph_format.left_indent = Cm(0.3)
    for label, text, last in (("对应功能点：", func, False), ("来源：", source, False), ("获取方式：", how, True)):
        r1 = info.add_run(label)
        set_cn_font(r1, "宋体", 8, True, LIGHT)
        r2 = info.add_run(text)
        set_cn_font(r2, "宋体", 8, False, LIGHT)
        if not last:
            r2.add_break()


def note_block(text):
    t = doc.add_table(rows=1, cols=1)
    t.style = "Table Grid"
    t.autofit = False
    cell = t.rows[0].cells[0]
    cell.width = Cm(CONTENT_W)
    shade(cell, "F4F7FB")
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(text)
    set_cn_font(r, "宋体", 9.5, False, RGBColor(0x2E, 0x54, 0x96))
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


# ==================== 封面 ====================
for _ in range(2):
    doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.LEFT
r = p.add_run("警院 WeChat 全生态五平台 · 考试平台")
set_cn_font(r, "微软雅黑", 10.5, False, RGBColor(0x7F, 0x7F, 0x7F))

p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(26)
r = p.add_run("开源考试系统\n对标调研与选型报告")
set_cn_font(r, "微软雅黑", 34, True, DARK)
p.paragraph_format.line_spacing = 1.05

p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(14)
r = p.add_run("面向《警院智慧考试平台需求规格说明书》的五个候选项目评估")
set_cn_font(r, "微软雅黑", 13, False, RGBColor(0x44, 0x54, 0x6A))

# 分隔线
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(10)
pPr = p._p.get_or_add_pPr()
pbdr = OxmlElement("w:pBdr")
bottom = OxmlElement("w:bottom")
bottom.set(qn("w:val"), "single"); bottom.set(qn("w:sz"), "18")
bottom.set(qn("w:space"), "1"); bottom.set(qn("w:color"), "1F3864")
pbdr.append(bottom); pPr.append(pbdr)

for _ in range(3):
    doc.add_paragraph()

meta = [
    ("文 档 版 本", "V1.0"),
    ("编 制 日 期", "2026 年 11 月 3 日"),
    ("关 联 文 档", "《警院智慧考试平台需求规格说明书》V1.0"),
    ("调 研 对 象", "5 个开源项目 / 20 张功能截图"),
    ("适 用 场 景", "技术选型、二次开发评估、参赛答辩佐证材料"),
]
t = doc.add_table(rows=0, cols=2)
t.autofit = False
for k, v in meta:
    cells = t.add_row().cells
    cells[0].width = Cm(3.6); cells[1].width = Cm(11.0)
    p0 = cells[0].paragraphs[0]; p1 = cells[1].paragraphs[0]
    p0.paragraph_format.space_after = Pt(2); p1.paragraph_format.space_after = Pt(2)
    r = p0.add_run(k); set_cn_font(r, "宋体", 9, False, LIGHT)
    r = p1.add_run(v); set_cn_font(r, "宋体", 9.5, False, RGBColor(0x33, 0x33, 0x33))

for _ in range(6):
    doc.add_paragraph()

p = doc.add_paragraph()
r = p.add_run("说明：本报告所有截图均于 2026-11-03 取自各项目官方仓库 README 所引用的原始图片地址，未做内容裁剪或修改，\n仅作技术调研引用；截图与代码版权归各项目作者，二次使用请遵循对应开源许可。")
set_cn_font(r, "宋体", 8.5, False, LIGHT)
p.paragraph_format.line_spacing = 1.4

doc.add_page_break()

p = doc.add_paragraph()
p.paragraph_format.space_after = Pt(14)
r = p.add_run("目　录")
set_cn_font(r, "微软雅黑", 18, True, DARK)

toc = [
    ("1  调研概述", 0),
    ("1.1  调研目的与结论先行", 1),
    ("1.2  需求基线：从文档中提炼的六个能力域", 1),
    ("1.3  筛选口径与评分规则", 1),
    ("1.4  候选池与入围结果", 1),
    ("2  五个项目一览", 0),
    ("2.1  基本信息与定位", 1),
    ("2.2  能力覆盖对照表", 1),
    ("3  项目一：砚考 exam-platform", 0),
    ("3.1  基本信息", 1),
    ("3.2  选择依据", 1),
    ("3.3  核心功能截图", 1),
    ("3.4  与本需求的差距", 1),
    ("4  项目二：学之思开源考试系统", 0),
    ("4.1  基本信息", 1),
    ("4.2  选择依据", 1),
    ("4.3  核心功能截图", 1),
    ("4.4  与本需求的差距", 1),
    ("5  项目三：SurveyKing", 0),
    ("5.1  基本信息", 1),
    ("5.2  选择依据", 1),
    ("5.3  核心功能截图", 1),
    ("5.4  与本需求的差距", 1),
    ("6  项目四：CBIT AutoExam", 0),
    ("6.1  基本信息", 1),
    ("6.2  选择依据", 1),
    ("6.3  核心功能截图", 1),
    ("6.4  与本需求的差距", 1),
    ("7  项目五：Frappe Learning", 0),
    ("7.1  基本信息", 1),
    ("7.2  选择依据", 1),
    ("7.3  核心功能截图", 1),
    ("7.4  与本需求的差距", 1),
    ("8  横向比较与选型建议", 0),
    ("8.1  五个项目的定位差异", 1),
    ("8.2  三条落地路线对比", 1),
    ("8.3  推荐路线", 1),
    ("8.4  对需求文档的六条修正建议", 1),
    ("9  截图来源、许可与使用说明", 0),
    ("附录 A  未入围项目及排除理由", 0),
    ("附录 B  本地素材清单", 0),
]
for text, lvl in toc:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(1)
    p.paragraph_format.line_spacing = 1.2
    p.paragraph_format.left_indent = Cm(0.4 + 0.7 * lvl)
    p.paragraph_format.tab_stops.add_tab_stop(Cm(15.7), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS)
    r = p.add_run(text)
    set_cn_font(r, "宋体", 10 if lvl == 0 else 9, lvl == 0,
                RGBColor(0x1F, 0x38, 0x64) if lvl == 0 else RGBColor(0x40, 0x40, 0x40))
    r2 = p.add_run("\t" + str(PAGES.get(text, "")))
    set_cn_font(r2, "宋体", 9, False, RGBColor(0x40, 0x40, 0x40))





# ==================== 1 调研概述 ====================
h1("1  调研概述")

h2("1.1  调研目的与结论先行")
para("本报告服务于《警院智慧考试平台需求规格说明书》的落地决策。要回答的问题很具体：这套系统里，哪些能力可以直接站在成熟开源项目上，哪些必须自己写；如果只选一个项目作为参照，应该选谁。")
para("调研遵循三条原则。第一，只评估真实存在、可直接访问仓库与演示界面的项目，不接受仅有宣传页的产品；第二，评估维度全部来自需求文档，而不是通用的“功能多不多”；第三，同时看许可协议与二次开发成本——比赛周期内改不动的项目，功能再全也没有意义。")
para("结论先行，共四点：")
bullet("没有任何一个开源项目与本需求完全同构。最接近的砚考（exam-platform）覆盖了“出题—组卷—考试—监考—阅卷—统计—发证—错题”整条链路，但仍缺双达标判定、跨平台事件与可用的 AI 命题，这三项恰好是本平台的原创点。", 10.5)
bullet("若目标是“六周内跑通闭环并讲得出故事”，推荐自研主干、按项目分工借鉴：题库与组卷参照砚考、练习与 AI 生成参照 SurveyKing、AI 命题参数参照 CBIT、课程章节绑定参照 Frappe Learning。", 10.5)
bullet("若团队 Java 功底强、且能承受微服务运维，砚考是唯一值得整体复用的底座（MIT 许可、领域模型完整），但需要重写前端以匹配需求文档的 React 技术栈。", 10.5)
bullet("学之思与 Frappe Learning 均为 AGPL-3.0，代码具有传染性。可作为交互与流程参照阅读，但不建议在其源码上直接修改后闭源交付。", 10.5)

h2("1.2  需求基线：从文档中提炼的六个能力域")
para("为使筛选有据可依，先把需求文档中的功能条款压缩为六个能力域。后续所有项目的“符合程度”均按这六项打分，而不是凭印象。")
table([
    ["能力域", "对应条款", "关键要求", "对选型的硬性含义"],
    ["A 题库与知识点", "5.6  FR-QB-001～007", "五种题型、知识点标签、难度分级、待审/发布/停用三态、题目正确率与区分度", "必须有独立题库实体与标签体系，题目不能只依附于某张试卷"],
    ["B 组卷", "5.7  FR-PA-001～005", "固定组卷 + 按知识点/题型/难度/分值随机抽题，知识点组权重，总分校验", "仅支持手工选题的项目不能满足，必须有规则抽题"],
    ["C 判分", "6.4  判分规则", "客观题自动判分、多选部分给分、填空规范化匹配、简答 AI 初评 + 教师确认", "判分引擎需可拆换，主观题必须有人工确认环节"],
    ["D 成绩与分析", "5.9  FR-ST-001～005", "成绩分布、知识点掌握雷达、题目正确率/区分度、班级对比", "需具备聚合统计能力，而非只列成绩单"],
    ["E 防作弊", "6.7  AC-01～08", "限时、题目/选项乱序、禁止回退、切屏检测、全屏监测、禁复制、心跳", "需前端事件采集 + 服务端留痕，且不自动判罚"],
    ["F 跨平台联动", "6.5 / 6.8 / 8.4", "SSO 登录、course.completed 解锁、exam.passed 事件、准入资格消费", "需开放 API 或明确扩展点，封闭系统需额外开发"],
], widths=[2.9, 3.4, 6.4, 3.5], font=8.5)
para("除功能之外，还有三条非功能约束直接影响选型：一是技术栈须为 React + TypeScript（需求文档 9.4 与 10 章已定），二是部署要能在普通笔记本上完成演示，三是许可协议允许参赛与后续校内使用。", 10.5)

h2("1.3  筛选口径与评分规则")
para("评分采用五项加权，总分 100。功能覆盖按上表 14 个细项逐条判定：● 记 1 分、◐ 记 0.5 分、○ 与 — 记 0 分，折算为 40 分制。")
table([
    ["指标", "权重", "判定方法", "为什么重要"],
    ["功能覆盖度", "40", "14 项能力逐条对照，按 ●/◐/○ 折算", "决定“能借鉴多少”，是本需求的核心"],
    ["可复用性", "25", "语言栈、架构复杂度、文档完备度、是否可单机部署", "决定团队能否在周期内改得动"],
    ["项目活跃度", "15", "Star 数、最近提交时间、Issue 响应、维护者数量", "决定踩坑时能否找到答案"],
    ["许可合规", "10", "MIT / Apache 为满分，GPL / AGPL 扣分，无许可证不得分", "决定能否安全用于参赛与校内上线"],
    ["素材可得性", "10", "是否有官方演示站、README 截图、可运行演示数据", "决定答辩材料与验收基准是否拿得到"],
], widths=[2.8, 1.6, 6.2, 5.6], font=8.5, align_center=[1])
para("需要说明：评分带有主观判断，仅用于排序与取舍，不作为对项目质量的评价。五个入围项目的工程质量都高于一般课程作业，差异主要在“与本需求的贴合方式”上。", 10)

h2("1.4  候选池与入围结果")
para("初筛共收集 11 个项目，覆盖国内教务型考试系统、国际 LMS、专业机考（CBA）与 AI 原生测评四类。按上述口径筛选后保留 5 个，其余 6 个的排除理由见附录 A。")
table([
    ["项目", "类型", "Star", "许可", "结论"],
    ["砚考 exam-platform", "国内教务型考试系统", "888", "MIT", "入围，匹配度最高"],
    ["学之思 xzs-mysql", "国内教务型考试系统", "3 603", "AGPL-3.0", "入围，交互与题型参照"],
    ["SurveyKing", "问卷 / 考试 / 题库三合一", "4 034", "MIT", "入围，练习与 AI 生成参照"],
    ["CBIT AutoExam", "AI 原生测评系统", "277", "README 声明 MIT", "入围，AI 命题与评分参照"],
    ["Frappe Learning", "国际开源 LMS", "3 366", "AGPL-3.0", "入围，课程章节绑定参照"],
    ["Moodle / TCExam / TAO 等 6 个", "LMS、CBA、毕设项目", "—", "—", "未入围，见附录 A"],
], widths=[4.6, 3.8, 1.6, 2.8, 3.4], font=8.5, align_center=[2])

# ==================== 2 五个项目一览 ====================
h1("2  五个项目一览")

h2("2.1  基本信息与定位")
para("先给一张总表，把五个项目的“身份”摆清楚。后文的每一章都按同一结构展开：基本信息、选择依据、功能截图、差距分析，便于横向对照。")
table([
    ["项目", "仓库地址", "技术栈", "许可", "一句话定位"],
    ["砚考\nexam-platform", "github.com/Alanosy/\nexam-platform", "Spring Boot 3.5 + JDK 17\nVue 3 + TS + Element Plus\n10 个微服务（Nacos/Dubbo）", "MIT", "把考试全链路做全的国产教务型系统，最接近本需求"],
    ["学之思\nxzs-mysql", "github.com/mindskip/\nxzs-mysql", "Java + Spring Boot\nVue（Web + 微信小程序）", "AGPL-3.0", "国内使用最广的轻量考试系统，题型与试卷形态齐全"],
    ["SurveyKing", "github.com/javahuang/\nSurveyKing", "Spring Boot 2.7 + MyBatis-Plus\nReact + Ant Design\nH2 / MySQL", "MIT", "由问卷长出来的考试与题库练习平台，AI 生成是特色"],
    ["CBIT\nAutoExam", "github.com/reneverland/\nCBIT-AiExam-plus", "Python 3.11 + Flask\nSQLAlchemy + SQLite/PostgreSQL", "MIT（仅 README\n声明，无 LICENSE 文件）", "AI 原生测评：AI 出题、AI 评分、多模型可切换"],
    ["Frappe\nLearning", "github.com/frappe/lms", "Frappe Framework（Python）\nVue / TypeScript + MariaDB", "AGPL-3.0", "课程—章节—测验—证书一体化的现代 LMS"],
], widths=[2.4, 4.4, 4.4, 2.0, 3.0], font=8)

h2("2.2  能力覆盖对照表")
para("下表把 14 项能力逐条对照。● 表示完整内置、开箱可用；◐ 表示部分支持或需配置；○ 表示需二次开发；— 表示不具备。")
rows = [
    ["能力项", "砚考", "学之思", "SurveyKing", "CBIT", "Frappe"],
    ["1 题库分类与题目维护", "●", "●", "●", "◐", "○"],
    ["2 多题型（含简答）", "●（9 种）", "●（5 种）", "●（8 种以上）", "◐（5 种）", "◐（3 种）"],
    ["3 固定组卷 / 手工选题", "●", "●", "●", "●", "○"],
    ["4 规则随机组卷", "●", "—", "●", "●", "—"],
    ["5 客观题自动判分", "●", "●", "●", "●", "●"],
    ["6 主观题人工阅卷与改分留痕", "●", "○", "◐", "◐", "◐"],
    ["7 成绩统计与题目分析", "●", "○", "●", "●", "◐"],
    ["8 知识点掌握分析", "●", "—", "◐", "◐", "—"],
    ["9 防作弊行为留痕", "●", "—", "—", "◐", "—"],
    ["10 课程章节绑定（学完即测）", "○", "◐", "—", "—", "●"],
    ["11 AI 命题（正文/标签驱动）", "◐（未接线）", "—", "◐（对话式）", "●", "—"],
    ["12 学生 / 教师 / 管理员三角色", "●", "●", "●", "●", "●"],
    ["13 证书或资格凭证", "●", "—", "—", "◐", "●"],
    ["14 对外 SSO / API / 事件", "○", "○", "○", "◐", "○"],
    ["加权得分（满分 100）", "88", "60", "66", "68", "58"],
]
table(rows, widths=[6.0, 2.2, 2.0, 2.2, 1.9, 1.9], font=8.5, align_center=[1, 2, 3, 4, 5])
note_block("一句话结论：砚考是唯一在“考试业务”上接近满配的项目，但它在“教考联动”和“跨平台联动”两栏是空的；Frappe 恰好相反，课程绑定最强、考试能力最弱。本平台的价值，正是把这两头接起来。")

# ==================== 3 砚考 ====================
h1("3  项目一：砚考 exam-platform")

h2("3.1  基本信息")
table([
    ["项目", "砚考（exam-platform）"],
    ["仓库地址", "https://github.com/Alanosy/exam-platform"],
    ["开源许可", "MIT（可商用、可闭源修改，仅需保留版权声明）"],
    ["技术栈", "后端 Spring Boot 3.5 + JDK 17/21，基于 RuoYi-Cloud-Plus 2.6.2 拆为 10 个微服务（考试、题库、试卷、答题、阅卷、统计、证书、练习、监考、AI），Nacos 注册发现 + Dubbo 调用；前端 Vue 3 + TypeScript + Element Plus + Vite"],
    ["项目规模", "888 Star / 93 Fork，主语言 Java，最近提交 2026-10-22"],
    ["角色设计", "学生、教师、管理员三角色，与本需求 3.1 节完全一致"],
    ["文档情况", "独立文档站 doc.alan.org.cn，README 逐模块列出功能边界与未完成项"],
], widths=[3.0, 12.8], font=8.5, header=False, first_col_bold=True)

h2("3.2  选择依据")
para("选择砚考作为第一参照，不是因为它的 Star 最多，而是因为它把本需求最难写的那部分——考试业务的领域模型——已经做对了。具体有四条依据。")
para("第一，业务链路与本需求 4.1 节的闭环几乎逐节点对应。它的 README 原话是“覆盖出题 → 组卷 → 考试 → 监考 → 阅卷 → 统计 → 发证 → 错题巩固的完整闭环”，而需求文档写的是“命题—组卷—作答—判分—成绩—资格—复盘”。两者的差别只在最后一环：砚考发的是证书，本需求发的是可被实训工坊消费的准入资格。这意味着数据模型可以大量借鉴，只需把“证书”实体扩展为“资格 + 事件”。")
para("第二，题型与判分规则覆盖了需求 6.4 节的超集。它支持单选、多选、判断、填空、简答、论述、代码、文件上传、匹配共 9 种题型，比本需求的 5 种多出 4 种；客观题交卷即判分并区分“正确 / 半对 / 错误”三态，恰好对应需求中“多选漏选得半分”的规则；主观题按“考试 → 答卷 → 逐题”三级人工阅卷，每次改分写审计日志，这正是需求 5.8 节 FR-MK-004 要求的留痕。")
para("第三，防作弊清单可以直接拿来当验收基准。需求 6.7 节列了 8 项监测（AC-01～08），砚考记录了 13 类行为：切屏离屏、窗口失焦、复制/剪切/粘贴、右键、进出全屏、多标签页、开发者工具、摄像头抓拍与拒权等，并且明确“达到上限时由服务端判定强制交卷，改前端绕不过去”。这条设计比原需求更进一步——原需求只写“记录不判罚”，而砚考给出了“记录 + 门限 + 服务端兜底”的完整链路，值得在需求文档中吸收。")
para("第四，统计口径与需求 5.9 节高度重合。它输出的分数段分布、逐题正确率/难度/区分度、选项分布与易错项、知识点掌握度与薄弱分级，几乎就是需求里“成绩分布 + 知识点雷达 + 题目分析”的完整实现；并且采用预计算汇总表 + 每 10 分钟定时重算的工程做法，对演示场景的响应速度很友好。")

h2("3.3  核心功能截图")
para("以下四张截图覆盖“考生入口—作答与监考—考试发布—错题复盘”四个关键节点，正好对应需求文档 5.2、5.3、5.7、5.4 四节。")

figure("3-1", os.path.join(IMG, "yk_1.png"),
       "考生工作台：一个页面收拢“要考什么、考得怎样、错在哪”",
       "页面顶部是六个指标卡（可参加考试、已完成、错题、今日新增错题、我的证书、累计参加），左侧是完整的功能菜单，右侧是近 7 天交卷趋势与及格率环形图。对考生而言，这个页面回答的是“我现在该做什么”；对答辩而言，它一张图就能讲清“平台不只是考试，还有复盘与凭证”。",
       "考试门户（5.2）、成绩概览与趋势（5.9 FR-ST-001）、错题入口（5.4）、证书/资格入口（5.10）",
       "项目 GitHub 仓库 README「项目展示」表格第 1 张，图片托管于作者图床 bucket.alan.org.cn",
       "打开 github.com/Alanosy/exam-platform，在 README 的「项目展示」表格中右键另存；或用 curl 直接下载 README 中 <img src> 指向的地址（2026-11-03 获取）")

figure("3-2", os.path.join(IMG, "yk_3.png"),
       "答题界面：题号导航与实时监考计数同屏",
       "左侧是题号导航（蓝底为已答、灰底为未答），中间是题干与选项，右上角固定显示剩余时长与答题进度，右下角是「考试监考」面板，实时累加切屏、粘贴、退出全屏、折叠等行为次数。这正好是需求 5.3 与 6.7 的组合形态：作答体验不被干扰，异常行为对考生透明可见。",
       "在线作答与题号导航（5.3）、限时（AC-01）、切屏检测（AC-05）、复制粘贴禁用（AC-07）、全屏监测（AC-06）",
       "同上，README「项目展示」第 3 张",
       "同上；该图为答题页实拍，含测试数据")

figure("3-3", os.path.join(IMG, "yk_4.png"),
       "考试发布：把“谁能考、怎么考、怎么防”拆成三段配置",
       "页面按「基本信息 → 参加方式与规则」两段式组织。参加方式支持白名单（按部门选人）与公开链接（加入码 + 密码 + 有效期）两种；考试规则可配置迟到入场、允许重考、答案展示时机、部分得分策略；下方单独一段配置防作弊。对本需求而言，这一段直接对应“准入卷只对特定学员开放”的场景。",
       "考试配置与发布（5.7 FR-PA-005/008）、考试类型绑定与参考范围（5.7 FR-PA-006）、重考策略（6.6）",
       "同上，README「项目展示」第 4 张",
       "同上；图中为「新增考试」配置页")

figure("3-4", os.path.join(IMG, "yk_5.png"),
       "错题重练：答错题自动归集，按轮次重做并可标记掌握",
       "界面把“我的作答”与“正确答案”并排标色（红错绿对），下方给出解析，右侧显示本轮范围与已答/未答统计，底部提供「标记为已掌握」。这与需求 5.4 节“错题按知识点累计、标记已掌握后移出待复习列表”的设计几乎一致，可直接作为交互参照。",
       "错题本与复盘（5.4）、解析开放策略（5.7 FR-PA-005）、掌握度标记（6.6 重考不重置错题本）",
       "同上，README「项目展示」第 6 张",
       "同上；图中为「错题重练」页面")

h2("3.4  与本需求的差距")
para("砚考把“考试”做透了，但它的边界止于单场考试。以下五点是与本需求的实质差距，也是自研工作量的来源。")
table([
    ["差距", "具体表现", "对本项目的影响"],
    ["无双达标判定", "只有总分及格线与知识点掌握度展示，没有“知识点组权重 + 组达标率阈值”的联合判定，也不区分“总分不足”与“专项不足”两种未通过", "需求 6.5 节的核心算法需完全自研，无法照搬"],
    ["无跨平台联动", "没有 SSO 对接方案，没有 exam.passed / exam.failed 事件，发的是站内证书而非可被外部消费的资格", "与论坛、工坊的联动层需自研，数据契约要另写"],
    ["AI 未真正接线", "Python Agent 已实现出题、阅卷、推荐、试卷分析四类能力，但 Java 侧网关未接通，README 明确“AI 阅卷会返回未接入”", "不能作为“AI 命题”的可用实现，只能参考其接口划分"],
    ["架构偏重", "10 个微服务 + Nacos + Dubbo，本地要跑通需同时启动注册中心、网关与多个服务", "5 人学生团队维护成本高，演示环境风险大"],
    ["前端技术栈不符", "Vue 3 + Element Plus，而需求文档 9.4 节已定 React + TypeScript + Ant Design", "若整体复用需重写前端，或放弃既定技术栈"],
], widths=[3.0, 8.0, 4.8], font=8.5, first_col_bold=True)
para("二次开发建议：若走“复用底座”路线，只取其后端领域模型与判分/统计服务，前端按 React 重写；同时把“证书”模块改造成“资格 + 事件”双写，避免污染原有逻辑。", 10)


# ==================== 4 学之思 ====================
h1("4  项目二：学之思开源考试系统")

h2("4.1  基本信息")
table([
    ["项目", "学之思开源考试系统（xzs-mysql）"],
    ["仓库地址", "https://github.com/mindskip/xzs-mysql"],
    ["开源许可", "AGPL-3.0（网络提供服务即触发开源义务，改动需回馈社区）"],
    ["技术栈", "Java + Spring Boot 后端，Vue 前端，前后端分离；提供 Web 端与微信小程序端，支持集成部署、分离部署与 Docker 部署"],
    ["项目规模", "3 603 Star / 591 Fork，主语言 JavaScript（前端），最近提交 2026-11-03，仍在活跃维护"],
    ["角色设计", "学生、教师（管理员）、超级管理员，权限粒度较粗但够用"],
    ["文档情况", "官网含演示站与视频教程，README 逐模块列出学生端、管理端、小程序端功能"],
], widths=[3.0, 12.8], font=8.5, header=False, first_col_bold=True)

h2("4.2  选择依据")
para("学之思是国内高校课程设计与企业内部考试里出现频率最高的开源考试系统之一，它的价值不在“先进”，而在“完整且朴素”——需求文档里最基础的那一层，它几乎都实现了。")
para("第一，题型与题目字段完全对齐需求 5.6 节。管理端支持单选、多选、判断、填空、简答五种题型，题干支持文本、图片、表格与数学公式；填空题支持多空、每空独立答案；每题可设分值、难度与解析。这正好是需求 FR-QB-001 要求的“五种题型编辑表单 + 富文本 + 图片”，连“多空填空按空计分”的细节都能对上。")
para("第二，试卷的三种形态可以直接映射本平台的三类考试。它把试卷分为固定试卷、时段试卷、任务试卷：固定卷可重复练习、自行批改；时段卷限定时间窗内可练；任务卷由管理员发布、每名学生只能做一次。这套划分虽然语义不同，但形态恰好对应本平台的“章节随堂测（固定卷）—专项技能卷（时段卷）—项目准入卷（任务卷，只能考一次）”。")
para("第三，学员侧闭环完整。考试记录可回看答卷与试卷信息，答错题目自动进入错题本并显示题目基本信息，另有消息中心接收通知。这三项对应需求 5.4 节的“成绩—复盘—通知”，是可以直接照抄的信息架构。")
para("第四，微信小程序端与项目定位契合。本项目的赛道名称是“WeChat 全生态”，学之思是全 Five 项目里少数自带小程序端的考试系统，其“登录自动绑定微信账号、登出解绑”的做法，可作为后续小程序扩展的参考。")

h2("4.3  核心功能截图")
figure("4-1", os.path.join(IMG, "xzs_student_1.png"),
       "学生首页：任务中心、固定试卷与时段试卷并列",
       "页面自上而下分为任务中心、固定试卷、时段试卷三段，每张试卷卡片标注名称与「开始做题」，时段卷额外显示起止时间，右上角固定「考试记录 / 错题本」入口。这张图直观说明了“以试卷类型组织门户”的信息架构，比按课程组织更简单，适合演示。",
       "考试门户（5.2）、考试类型划分（6.1）、考试记录与错题入口（5.4）",
       "项目 GitHub 仓库 README「系统展示」学生端第 1 张，图片托管于项目官网 mindskip.net",
       "打开 github.com/mindskip/xzs-mysql，在 README「系统展示」表格中获取图片地址；或用 curl 下载 www.mindskip.net/style/git/images/student/1.png（2026-11-03 获取）")

figure("4-2", os.path.join(IMG, "xzs_student_2.png"),
       "答题页：一份卷子里同时出现五种题型",
       "同一张试卷内依次出现单选、判断、填空（两个空）、简答（多行文本框）、多选五种题型，顶部固定剩余时间（19:59:59）与总分/考试时长，右侧为题号导航，底部为提交与取消。对开发而言，这张图确认了“题型渲染器 + 统一答题卡”的实现路径是可行的。",
       "作答与题型渲染（5.3）、限时（6.7 AC-01）、题号导航与交卷（5.3）",
       "同上，README「系统展示」学生端第 2 张",
       "同上；地址为 www.mindskip.net/style/git/images/student/2.png")

figure("4-3", os.path.join(IMG, "xzs_admin_3.png"),
       "试卷编辑：先定类型，再往里挂题",
       "编辑页顶部是年级、学科、试卷类型（任务试卷）、试卷名称，中部是已挂载的题目列表（可删除、可继续添加），底部是建议时长与提交按钮。表单结构简单到一眼能看懂，这正是需求 5.7 节“固定组卷”最朴素的形态。",
       "固定组卷与试卷编辑（5.7 FR-PA-001）、考试类型绑定（5.7 FR-PA-006）、时长配置（5.7 FR-PA-005）",
       "同上，管理端「试卷创编」页面截图（README 未单独展示，取自同一图集 admin/3.png）",
       "同上；地址为 www.mindskip.net/style/git/images/admin/3.png")

figure("4-4", os.path.join(IMG, "xzs_admin_2.png"),
       "题目编辑：多空填空、逐空答案、解析与难度",
       "表单包含年级、学科、题干（富文本编辑器，支持加粗/列表/图片/公式）、填空答案（第 1 空、第 2 空分别填写，各 2.0 分）、解析、总分与难度星级。这张图是需求 5.6 节“五种题型编辑表单 + 多空按空计分”最直接的实现参照。",
       "手工录题与富文本（5.6 FR-QB-001）、填空多空计分（6.4 判分规则）、难度与解析（5.6）",
       "同上，管理端题目编辑弹窗（admin/2.png）",
       "同上；地址为 www.mindskip.net/style/git/images/admin/2.png")

figure("4-5", os.path.join(IMG, "xzs_admin_1.png"),
       "管理后台首页：四类总量 + 两张趋势图",
       "顶部四个指标卡为试卷总数、题目总数、答卷总数、答题总数，下方是「用户活跃度」与「题目月数量」两张折线图，左侧菜单可见试卷管理、题目列表、任务管理、学科列表、消息中心、日志中心。它代表的是“基础统计”档位——有总量与趋势，但没有分数分布、正确率与区分度。",
       "管理端概览与基础统计（5.9 的降级形态）、题库与试卷管理入口（5.6/5.7）、操作日志（5.11）",
       "同上，管理端首页（admin/1.png）",
       "同上；地址为 www.mindskip.net/style/git/images/admin/1.png")

h2("4.4  与本需求的差距")
table([
    ["差距", "具体表现", "对本项目的影响"],
    ["无规则随机组卷", "只有固定卷、时段卷、任务卷三种形态，题目需逐题手工挂载，没有按知识点/题型/难度抽题的规则引擎", "需求 5.7 FR-PA-002 与 6.3 节“随机组卷降级策略”需自研"],
    ["无知识点体系", "以“学科”为最细分类，没有知识点标签，也没有知识点组权重与达标率", "双达标判定完全无从借鉴"],
    ["几乎无防作弊", "除限时外，没有乱序、切屏、禁复制、全屏等监测", "需求 6.7 的 8 项监测需从零实现"],
    ["统计能力弱", "仅首页总量与活跃度趋势，无成绩分布、题目正确率、区分度", "需求 5.9 的看板需自研"],
    ["无对外接口", "未提供 SSO 接入、事件推送或开放 API", "五平台联动层需完全自建"],
    ["技术债与许可", "Vue 2 + 较早的 Spring Boot 版本；AGPL-3.0 具传染性", "不适合作为闭源交付的二次开发底座"],
], widths=[3.2, 7.8, 4.8], font=8.5, first_col_bold=True)
para("结论：学之思适合“看”，不适合“改”。它的页面结构与字段设计可以直接借鉴，但代码不建议作为底座——AGPL 许可与技术债会同时成为负担。", 10)


# ==================== 5 SurveyKing ====================
h1("5  项目三：SurveyKing")

h2("5.1  基本信息")
table([
    ["项目", "SurveyKing"],
    ["仓库地址", "https://github.com/javahuang/SurveyKing"],
    ["开源许可", "MIT（可自由修改与商用，是五个项目中许可最宽松的之一）"],
    ["技术栈", "后端 Java + Spring Boot 2.7 + Spring Security + MyBatis-Plus；前端 React + Ant Design；数据库内置 H2，可切 MySQL"],
    ["项目规模", "4 034 Star / 606 Fork，最近提交 2026-08-26；提供官方在线演示 s.surveyking.cn 与 Docker 镜像"],
    ["角色设计", "管理员 / 普通用户两级，权限以项目与问卷为单位划分，比教务系统粗"],
    ["文档情况", "官网含快速开始、部署指南与帮助中心，README 提供三种工作流的对照说明"],
], widths=[3.0, 12.8], font=8.5, header=False, first_col_bold=True)

h2("5.2  选择依据")
para("SurveyKing 的起点是问卷，但它在 v1.13 已经把“考试”和“题库练习”做成了并列的一等工作流。对本项目而言，它的价值集中在两处：试卷编辑器做得极顺手，以及“练习—错题—AI 解析”这条自学补漏链路。")
para("第一，试卷编辑器的信息密度恰到好处。左侧是试卷结构与题型面板（单选、多选、判断、下拉、单行文本、多项填空、横向填空、简答共 8 类），中间是所见即所得的试卷正文，右侧是选中题目的设置面板（必填、计分方式、分值、答案解析）。需求 5.7 节的组卷页要同时容纳“题型分布、分值、总分校验”，这个三栏布局是目前看到的方案里最省点击的。")
para("第二，它把“考生信息”做成了可配置字段。姓名、手机、学号、工号、班级、部门、邮箱、身份证都能作为试卷的必填项，这对本平台很实用——准入卷可以先校验学号/班级，再做答题，等于在试卷层做了一次轻量身份核对。")
para("第三，练习模式直接对应需求 5.4 的复盘场景。练习支持顺序、随机、错题重练三种方式，答对连续若干题自动移出错题，每道题可「点击生成 AI 解析」，并支持收藏、笔记、标记。这比需求文档里写的“错题本 + 标记已掌握”更细，可以直接吸收。")
para("第四，AI 生成是对话式的，交互成本最低。截图中的「AI 智能创建」允许选择模型（如 deepseek），用自然语言描述“创建一个十道题的信息安全知识测试”，右侧实时预览生成结果。这为需求 5.5 的「命题工作台」提供了一个不同于表单配置的思路：先对话生成粗稿，再进结构化编辑。")
para("第五，落地成本最低。MIT 许可、单条 Docker 命令启动、自带 H2 数据库、有在线演示，这意味着答辩现场可以随时开一个干净实例做对比演示。")

h2("5.3  核心功能截图")
figure("5-1", os.path.join(IMG, "sk_exam-editor.webp"),
       "试卷编辑器：左结构、中正文、右设置的三栏布局",
       "左栏是试卷结构（可插入「随机问卷」）与题型面板，中栏是试卷正文并实时显示「总分 100 分」，右栏是当前题目的设置：必填开关、计分方式（全部答对才得分）、本题分值、答案解析。顶部还有「预览 / 题库」入口。这张图基本就是需求 5.7 组卷页的理想形态。",
       "组卷与分值设置（5.7 FR-PA-001/004）、题型分布（6.2）、判分方式配置（6.4）、答案解析（5.6）",
       "项目 GitHub 仓库 README「Product tour · Exams」章节，文件位于仓库 docs/readme/exam-editor.webp",
       "打开 github.com/javahuang/SurveyKing，在 README 的考试章节获取图片；或直接访问 raw.githubusercontent.com/javahuang/SurveyKing/master/docs/readme/exam-editor.webp（2026-11-03 获取）")

figure("5-2", os.path.join(IMG, "sk_exam-answer-ui.webp"),
       "考生答题页：题干、选项与封面图一体化呈现",
       "页面顶部是试卷封面图与说明（共 5 题、满分 100 分、提交后系统自动评分），下方按题号顺序排列单选与多选，选项前为圆形/方形控件以区分单选与多选。整体是移动优先的响应式布局，在手机浏览器上也能正常作答。",
       "作答界面（5.3）、五题型中的单选与多选（6.4）、移动端适配（9.4）",
       "同上，docs/readme/exam-answer-ui.webp",
       "同上；原始地址 raw.githubusercontent.com/javahuang/SurveyKing/master/docs/readme/exam-answer-ui.webp")

figure("5-3", os.path.join(IMG, "sk_practice-desktop.webp"),
       "练习模式：答题卡、错题自动移出与 AI 解析",
       "左栏是答题卡（已答/未答/标记三态）与「连续做对 N 次，自动移出错题」的设置，中间是题干与选项，答错后立即标红，下方是「AI 解析：点击生成」。这套设计把“刷题—纠错—讲解”压在一个页面里，是本项目最值得借鉴的交互。",
       "错题本与复盘（5.4）、掌握度判定（6.6）、AI 解析生成（5.5 的延伸能力）",
       "同上，docs/readme/practice-desktop.webp",
       "同上；原始地址 raw.githubusercontent.com/javahuang/SurveyKing/master/docs/readme/practice-desktop.webp")

figure("5-4", os.path.join(IMG, "sk_ai-create.webp"),
       "AI 智能创建：用一句话描述需求，右侧实时预览",
       "弹窗左侧是对话区，顶部可选择模型（图中为 deepseek-ai/DeepSeek），下方给出四个「快速开始」示例，其中就包括“创建一个十道题的信息安全知识测试”；右侧是实时预览区。这证明了“AI 生成试卷”在产品上可以做到多低的门槛。",
       "AI 命题中心（5.5 FR-AI-001/003/004）、生成参数（FR-AI-002）、结果预览（FR-AI-004）",
       "同上，docs/readme/ai-create.webp",
       "同上；原始地址 raw.githubusercontent.com/javahuang/SurveyKing/master/docs/readme/ai-create.webp")

h2("5.4  与本需求的差距")
table([
    ["差距", "具体表现", "对本项目的影响"],
    ["问卷基因，不是教务系统", "没有课程、章节、班级实体，考试是“一张独立的问卷”，无法与自学平台章节绑定", "需求 5.7 FR-PA-006 的“随堂测绑定章节”需另建关联"],
    ["无监考与严肃防作弊", "没有切屏、全屏、禁复制等监测，也没有监考中心", "需求 6.7 的防作弊体系需完全自研"],
    ["主观题无阅卷工作台", "简答题以文本题承载，没有“要点命中表 + 教师确认 + 改分留痕”的流程", "需求 5.8 的阅卷中心无法复用"],
    ["无知识点组与双达标", "统计以答卷与题目为单位，没有知识点权重与达标率概念", "核心判定算法仍需自研"],
    ["无对外事件与 SSO", "只有站内用户与权限，没有 OAuth/OIDC 接入与事件推送", "五平台联动层需自建"],
], widths=[3.4, 7.6, 4.8], font=8.5, first_col_bold=True)
para("结论：SurveyKing 不适合当“考试平台底座”，但极其适合当“练习与 AI 生成”这两个模块的参照物。如果只允许抄一个页面的交互，我会选它的练习模式。", 10)


# ==================== 6 CBIT ====================
h1("6  项目四：CBIT AutoExam")

h2("6.1  基本信息")
table([
    ["项目", "CBIT AutoExam（CBIT-AiExam-plus）"],
    ["仓库地址", "https://github.com/reneverland/CBIT-AiExam-plus"],
    ["开源许可", "README 声明 MIT，但仓库中未包含 LICENSE 文件，GitHub 许可证识别为“无”。正式使用前需向作者确认"],
    ["技术栈", "Python 3.11 + Flask + SQLAlchemy；SQLite（开发）/ PostgreSQL（生产）；前端原生 HTML/JS，可选 React/Vue；提供 Docker 与 docker-compose 部署"],
    ["项目规模", "277 Star / 30 Fork，最近提交 2025-09-28；README 自述已支撑 100+ 场考试、1 000+ 名考生"],
    ["角色设计", "管理员与考生两类，教师角色弱化，阅卷以管理员代行"],
    ["文档情况", "中英双语 README，逐模块说明功能与配置项，但缺少独立文档站"],
], widths=[3.0, 12.8], font=8.5, header=False, first_col_bold=True)

h2("6.2  选择依据")
para("CBIT 是五个项目里唯一把“AI”当作系统主轴而不是附加功能的。它对本项目最大的价值，不是代码，而是回答了一个关键问题：AI 出题和 AI 评分，在产品上到底应该暴露哪些参数。")
para("第一，AI 出题的参数维度与需求 5.5 节几乎一一对应。它允许按学科与子学科（数学、计算机、统计等）、难度层级（高中 / GRE / 本科 / 研究生 / 博士）、认知层级（理解 / 应用 / 综合）、题型（选择 / 填空 / 简答 / 编程 / 论述）来约束生成，并能“为每位考生生成差异化试卷”，题目、选项与顺序均可随机。需求文档 FR-AI-002 要求“题量、题型分布、难度分布、知识点覆盖”，CBIT 多出的“认知层级”是一个值得补进需求的维度。")
para("第二，AI 评分的分层设计值得借鉴。它采用“规则判分 + AI 语义匹配 + 关键词/知识点校验”三层，编程题再用公开用例与隐藏用例双层校验，并输出学科、知识点、难度、认知层级四个维度的反馈。这比需求文档 6.4 节“按评分要点逐点匹配”更工程化，尤其是“规则优先、AI 兜底”的顺序，可以显著降低 AI 判分的不可控性。")
para("第三，多模型适配与降级策略解决了演示环境的最大风险。它兼容 OpenAI、Claude、OpenRouter，未配置 API 时自动切换到手动模式，运行时可动态切换模型、按难度选择模型以控制成本。需求文档 6.2 节只写了“失败重试 3 次”，没有写“无模型时如何降级”，这一条应当补进去。")
para("第四，看板与风控的设计接近需求 5.9 与 6.7。管理看板包含报名到完成的漏斗、通过率、重考率、异常统计；教学洞察包含知识点对错率、题目区分度、考生画像与群组对比；考试侧有 IP/设备绑定、单会话、防重复考试、切屏检测与审计日志。")

h2("6.3  核心功能截图")
figure("6-1", os.path.join(IMG, "cbit_autotest_dashboard.jpg"),
       "管理控制台：四个总量指标 + 成绩分布 + 考试趋势",
       "顶部四张卡片为学生总数、活跃学生、考试总数、平均分；左侧环形图为成绩分布（优秀 90-100、良好 80-89、及格 60-79、不及格），右侧折线图为考试趋势，下方是最近活动流。这套布局几乎可以直接作为需求 5.9 看板的首页草图。",
       "数据看板（5.9 FR-ST-001/002）、成绩分布与平均分（5.9）、考试趋势（5.9）",
       "项目 GitHub 仓库 README「📊 管理控制台」章节，文件位于仓库 demopic/autotest_dashboard.jpg",
       "打开 github.com/reneverland/CBIT-AiExam-plus，在 README 截图章节获取；或访问 raw.githubusercontent.com/reneverland/CBIT-AiExam-plus/master/demopic/autotest_dashboard.jpg（2026-11-03 获取）")

figure("6-2", os.path.join(IMG, "cbit_autotest_examconfig.png"),
       "考试配置：题量、时长、及格分与题库筛选条件同屏",
       "左栏是配置名称、描述、题目数量（17）、时长（60 分钟）、选题模式（Filter Mode 自动筛选 / Manual Selection 手动选题）、及格分（60）、是否交卷后显示结果；右栏是筛选条件：科目（数学/物理/统计/计算机/工程）、难度（高中/本科基础/本科进阶/GRE/研究生/博士）、题型（多选/简答/编程/判断/填空/论述）。",
       "组卷规则与分值（5.7 FR-PA-002/004）、及格线（6.5）、题型覆盖（6.2）、答案展示策略（5.7 FR-PA-005）",
       "同上，demopic/autotest_examconfig.png",
       "同上；raw.githubusercontent.com/reneverland/CBIT-AiExam-plus/master/demopic/autotest_examconfig.png")

figure("6-3", os.path.join(IMG, "cbit_manualquestionselect.png"),
       "手动选题：按条件筛题、批量加入题篮、再统一确认",
       "弹窗左侧是筛选条件（科目、难度、题型、关键词）与「Random Selection」随机抽 5 题，右侧是候选题列表，每题带学科、难度、题型标签与分值，勾选后进入「Cart」题篮，最后一次性确认。这是“固定组卷”与“随机组卷”共存的典型实现。",
       "固定组卷与选题（5.7 FR-PA-001）、随机抽题（FR-PA-002）、题目难度与题型标签（5.6）",
       "同上，demopic/manualquestionselect.png",
       "同上；raw.githubusercontent.com/reneverland/CBIT-AiExam-plus/master/demopic/manualquestionselect.png")

figure("6-4", os.path.join(IMG, "cbit_inexam.png"),
       "答题界面：题号导航、倒计时与编程题编辑器",
       "左侧是 17 题的题号导航（绿色为已答、深蓝为当前题），顶部是剩余时间（59:38）与进度（1/17），中间题干带「计算机科学 / High School Level / Synthesis」三个标签，下方是 Python 代码编辑器，底部有标记、下一题与提前交卷。",
       "作答与题号导航（5.3）、编程题渲染（题型扩展）、限时与提前交卷（6.7 AC-01）、认知层级标签（AI 命题参数）",
       "同上，demopic/inexam.png",
       "同上；raw.githubusercontent.com/reneverland/CBIT-AiExam-plus/master/demopic/inexam.png")

figure("6-5", os.path.join(IMG, "cbit_llmconfig.png"),
       "AI 设置：供应商、模型与两项能力开关",
       "弹窗右栏是「AI API Settings」：可切换 OpenRouter / OpenAI / Anthropic，填写 API 密钥并验证，选择模型（图中为 Chatgpt-4o-latest），下方两个开关分别是「启用 AI 出题」与「启用 AI 智能评分」，并注明关闭评分时按关键词与结构检查判分。这正好回答了“AI 不可用时怎么办”。",
       "AI 命题与 AI 初评的开关设计（5.5、5.8）、模型配置与降级（6.2 失败重试）、评分要点校验（6.4）",
       "同上，demopic/llmconfig.png",
       "同上；raw.githubusercontent.com/reneverland/CBIT-AiExam-plus/master/demopic/llmconfig.png")

h2("6.4  与本需求的差距")
table([
    ["差距", "具体表现", "对本项目的影响"],
    ["无课程与知识点体系", "一切以“学科—难度—认知层级”组织，没有课程、章节、知识点标签", "无法直接支撑“随堂测绑定章节”与知识点组双达标"],
    ["无人工阅卷工作台", "AI 直接给分，缺少“AI 初评 → 教师确认 → 改分留痕”的确认环节", "需求 5.8 的阅卷中心需自研，可借鉴其评分维度设计"],
    ["无知识点组达标", "只有总分与及格线，没有分组权重与组达标率", "核心判定算法仍需自研"],
    ["许可存疑", "README 写 MIT，但仓库无 LICENSE 文件，GitHub 无法识别", "参赛与校内使用前须书面确认，否则只能参考设计不能复制代码"],
    ["工程成熟度有限", "单维护者、前端为原生 JS、测试与文档较薄", "不适合作为生产底座，适合作为 AI 模块的设计参照"],
], widths=[3.4, 7.6, 4.8], font=8.5, first_col_bold=True)
para("结论：CBIT 是“AI 命题中心”这一章的绝佳参考，但只能参考到参数与流程层。它证明了 AI 出题不需要多复杂的产品形态，几个下拉框加一个生成按钮就够了——真正难的是生成之后的质量把关。", 10)


# ==================== 7 Frappe ====================
h1("7  项目五：Frappe Learning")

h2("7.1  基本信息")
table([
    ["项目", "Frappe Learning（frappe/lms）"],
    ["仓库地址", "https://github.com/frappe/lms"],
    ["开源许可", "AGPL-3.0（与学之思相同，网络服务即触发开源义务）"],
    ["技术栈", "Frappe Framework（Python）+ Vue / TypeScript 前端，MariaDB 数据库，依赖 Frappe Bench 部署"],
    ["项目规模", "3 366 Star / 1 573 Fork，最近提交 2026-11-02，社区活跃、贡献者众多"],
    ["角色设计", "管理员、课程讲师、学员三类，按课程与班级授权"],
    ["文档情况", "官网 frappe.io/learning 与独立文档站 docs.frappe.io/learning，含课程搭建与测验配置说明"],
], widths=[3.0, 12.8], font=8.5, header=False, first_col_bold=True)

h2("7.2  选择依据")
para("把 Frappe Learning 放进候选，不是因为它能当考试系统用——它不能。它的价值在于，它是五个项目里唯一把“课程—章节—测验”做成原生结构的系统，而这正是本需求里“学完即测”那句话的产品形态。")
para("第一，三级课程结构天然适配“章节随堂测”。课程（Course）下分章节（Chapter），章节下分课节（Lesson），每一章可以挂一个 Quiz。学员在侧边栏看到的是一棵“章节树”，学完一节，下一节点就是测验。本需求 5.7 节 FR-PA-006 写的是“绑定为随堂测时须选择课程章节”，Frappe 把这个关系做成了结构本身，而不是外挂关联。")
para("第二，测验的通过条件是显式的。截图中明确写着“共 10 题，必须答对 100% 才能通过”，这说明它的通过判定是可配置的硬门槛，而不是“及格线以上算过”。本需求 6.5 节的双达标，本质上是把这个门槛从“整卷 100%”细化到“整卷及格 + 每组达标”，思路是同源的。")
para("第三，班级（Batch）与进度跟踪是现成的。它支持按课程与周期把学员编成班级，班级可以排直播课、统计完成率；证书按班级或课程发放。这对应本需求 5.9 节的“班级对比”与 5.10 节的“资格发放”，虽然粒度不同，但信息架构可以直接借。")
para("第四，界面是现代 LMS 的标杆。三栏布局（左侧全局导航、中间内容、右侧章节目录）非常克制，学习进度以百分比常驻右上角。本项目的页面清单如果要画线框图，这套布局比国内考试系统更值得参考。")

h2("7.3  核心功能截图")
figure("7-1", os.path.join(IMG, "flms_hero.png"),
       "课程章节页：视频、正文与章节目录同屏，测验挂在章节节点上",
       "中间是课节内容（视频 + 图文），右侧是章节树，每个章节下依次列出课节与对应的 Quiz（如“Chart of Accounts Quiz”“Quiz on Invoicing”），右上角常驻学习进度（22% completed）。这张图就是“学完即测”最直观的形态。",
       "课程章节绑定（5.7 FR-PA-006）、学习进度（5.2/5.10）、随堂测入口（6.1 章节随堂测）",
       "项目 GitHub 仓库 README 顶部 Hero 图，文件位于仓库 .github/hero.png",
       "打开 github.com/frappe/lms，在 README 顶部获取；或访问 raw.githubusercontent.com/frappe/lms/main/.github/hero.png（2026-11-03 获取）")

figure("7-2", os.path.join(IMG, "flms_quiz.png"),
       "章节测验：单题作答、进度可见、通过条件写在明处",
       "页面顶部直接写明“本测验共 10 题，必须全部答对才能通过”，题卡显示当前为第 1 题、单选、1 分，右下角「Check」提交本题；左侧是一级导航，右侧是章节目录与整体进度。把规则前置，是减少考后争议的有效做法。",
       "章节随堂测（6.1）、判分与通过条件（6.4/6.5）、作答进度（5.3）",
       "同上，.github/quiz.png",
       "同上；raw.githubusercontent.com/frappe/lms/main/.github/quiz.png")

figure("7-3", os.path.join(IMG, "flms_certificate.png"),
       "结业证书：姓名、课程、日期与签发方四要素",
       "证书以 PDF 形式呈现，包含学员姓名（Salim Mustafa）、课程名称（ERPNext V15）、完成日期、签发方与评证人，右上角为认证徽章。这正是本需求 5.10 节“准入资格”在视觉与字段上的参照——资格凭证必须能被第三方看懂并核验。",
       "准入资格与凭证（5.10）、资格有效期与签发信息（6.8）、跨平台核验（8.4）",
       "同上，.github/certificate.png",
       "同上；raw.githubusercontent.com/frappe/lms/main/.github/certificate.png")

h2("7.4  与本需求的差距")
table([
    ["差距", "具体表现", "对本项目的影响"],
    ["题库能力弱", "题目随测验创建，没有独立题库分类、难度、来源与状态管理，也没有按规则随机组卷", "需求 5.6/5.7 的题库与组卷几乎不能借鉴"],
    ["无严肃考试能力", "没有防作弊、监考、限时强制交卷、题目乱序等机制", "需求 6.7 完全需自研"],
    ["分析维度少", "只有完成率与测验得分，没有分数分布、题目区分度、知识点掌握", "需求 5.9 需自研"],
    ["部署门槛高", "依赖 Frappe Bench、MariaDB、Redis 等一整套运行时", "不适合作为比赛演示环境"],
    ["许可与生态", "AGPL-3.0；技术栈为 Python + Frappe 专有框架，团队学习成本高", "不建议二次开发，仅建议借鉴信息架构"],
], widths=[3.2, 7.8, 4.8], font=8.5, first_col_bold=True)
para("结论：Frappe Learning 回答的是“测验应该长在课程的哪里”，而不是“考试系统怎么做”。把它的章节—测验结构与砚考的考试引擎拼起来，才是本需求完整的产品形态。", 10)


# ==================== 8 横向比较 ====================
h1("8  横向比较与选型建议")

h2("8.1  五个项目的定位差异")
table([
    ["项目", "本质上是什么", "最强的地方", "最缺的地方", "建议借什么"],
    ["砚考", "单场考试的全流程管理系统", "判分、阅卷、监考、统计、证书的完整闭环", "教考联动、跨平台事件、AI 未接线", "领域模型、防作弊清单、统计口径"],
    ["学之思", "轻量课程考试系统", "五题型、试卷三形态、错题本、微信小程序", "随机组卷、知识点、防作弊、统计", "门户信息架构、题型编辑表单"],
    ["SurveyKing", "问卷平台长出的考试与练习", "试卷编辑器、练习模式、AI 对话式生成", "课程/班级、监考、阅卷工作台", "组卷页布局、练习与错题交互"],
    ["CBIT", "AI 原生测评系统", "AI 出题参数、AI 评分分层、多模型降级", "课程与知识点、人工阅卷、许可文件", "AI 参数维度、评分三层策略、降级方案"],
    ["Frappe", "现代 LMS", "课程—章节—测验结构、进度、证书", "题库、防作弊、分析", "章节挂测验的结构、证书字段"],
], widths=[2.0, 3.4, 3.6, 3.6, 3.6], font=8)

h2("8.2  三条落地路线对比")
para("把五个项目组合起来，实际可走的路线只有三条。这里的“工作量”以 5 人团队、以周为单位估算，仅作相对比较。")
table([
    ["路线", "做法", "技术栈匹配", "工作量", "主要风险", "适用情形"],
    ["A  复用砚考后端", "取其后端领域模型与判分/统计/监考服务，前端按 React 重写", "后端 Java 可用；前端需重写", "高", "10 个微服务运维复杂；AI 未接线；许可虽为 MIT 但需保留声明", "团队有 Java 与微服务经验，追求“先进架构”叙事"],
    ["B  改造 SurveyKing", "在 MIT 代码上补监考、知识点、阅卷工作台", "Java + React，与需求文档最接近", "中", "问卷基因改造难度被低估；补监考等于重写考试模块", "周期极紧，只需“能考试的问卷”"],
    ["C  自研+借鉴（推荐）", "按需求文档自研 React 前端与核心服务，五个项目只借设计与清单", "完全匹配（React + TS + AntD）", "中高", "所有核心能力都要自己写；需要严格控制范围", "参赛答辩为主、要讲原创性（推荐）"],
    ["D  改造学之思", "直接改 Vue 2 代码，补随机组卷与防作弊", "Vue 2 与既定 React 栈冲突", "中", "技术债重；AGPL 传染；缺的能力太多", "不推荐"],
    ["E  扩展 Frappe", "以 LMS 为底座，补考试与防作弊", "Python + Frappe，学习曲线陡", "高", "框架封闭；题库能力弱；AGPL", "不推荐（仅作结构参考）"],
], widths=[2.2, 3.8, 3.2, 1.4, 3.4, 2.2], font=8)

h2("8.3  推荐路线")
para("推荐路线 C：自研主干，五个项目按模块分工借鉴。理由有四条。")
bullet("技术栈一致。需求文档 9.4 节已锁定 React + TypeScript + Vite + Ant Design，路线 A、B、D、E 都要求改技术栈或重写前端，只有自研能保持一致性。", 10)
bullet("核心能力没有现成实现。双达标判定、准入资格事件、跨平台 SSO 这三项，五个项目全部为空。既然最难的部分无论如何都要自己写，整体自研比“改别人的半成品”更可控。", 10)
bullet("许可干净。自研不继承 AGPL，不依赖来源不明的代码，参赛材料与后续校内上线都不会有合规争议。", 10)
bullet("答辩叙事成立。评审最常问的是“哪些是你们做的”。自研 + 明确列出“借鉴了谁的设计、改进了什么”，比“基于某开源项目二次开发”更容易讲出价值。", 10)
para("若团队里有 Java 强手、且希望在前端之外少写后端，可把路线 A 作为备选：只复用砚考的后端服务，前端仍按 React 重写。此时需要额外承担 Nacos + Dubbo 的运维成本，演示环境建议只启动考试、题库、阅卷、统计四个服务。", 10)
para("按模块的借鉴分工建议如下：题库与组卷页照 SurveyKing 的三栏布局做，判分与阅卷照砚考的三级流程做，AI 命题照 CBIT 的参数维度做，课程章节绑定照 Frappe 的章节树做，错题与练习照 SurveyKing 的练习模式做，防作弊清单照砚考补齐。", 10)

h2("8.4  对需求文档的六条修正建议")
para("调研过程中发现需求文档有几处可以写得更严谨，建议在下一版修订时吸收。")
table([
    ["序号", "涉及条款", "现状", "建议修改为"],
    ["1", "6.5 双达标", "只定义了“总分 + 每组达标”的唯一判定", "补充降级规则：未划分知识点组时退化为单一总分判定；组权重之和不为 100% 时阻止发布"],
    ["2", "6.7 防作弊", "8 项监测，明确“只记录不判罚”", "增加“行为计数达到门限由服务端强制交卷”与“考生端可见计数”，把监测项扩到多标签页、开发者工具、失焦"],
    ["3", "5.8 阅卷中心", "AI 按评分要点逐点匹配，置信度低于 0.75 转人工", "明确“规则优先、AI 兜底”的三层顺序（精确匹配 → 关键词/要点命中 → 语义评分），并要求输出命中/缺失要点表"],
    ["4", "6.2 AI 命题", "只写失败重试 3 次", "增加“模型不可用或超时”的降级路径：转手工组卷或仅保留规则判分，不得阻塞考试发布"],
    ["5", "5.10 准入资格", "资格为数据库记录，工坊通过接口查询", "增加“资格编号 + 可核验二维码/短链”，支持线下与跨平台核验，同时便于答辩现场演示"],
    ["6", "5.7 考试类型绑定", "随堂测作为独立考试，绑定时选择课程章节", "改为“在章节节点上挂测验”（参照 Frappe），使学员在自学平台学完即见入口，减少一次跳转"],
], widths=[1.2, 3.0, 5.4, 6.2], font=8, align_center=[0])

# ==================== 9 来源说明 ====================
h1("9  截图来源、许可与使用说明")

h2("9.1  统一说明")
para("本报告共使用 20 张截图，全部于 2026 年 11 月 3 日从各项目官方 GitHub 仓库 README 所引用的原始图片地址下载，未做内容裁剪、拼接或修改，仅在排版时等比缩放。截图中的界面、文案、测试数据均属原项目，不代表本平台的设计。")
para("截图的著作权归各项目作者所有，本报告仅用于技术调研与方案论证，属于合理引用。若需在参赛展板、演示文稿或公开材料中再次使用，请遵循对应仓库的许可协议：MIT 项目（砚考、SurveyKing）限制最少；AGPL 项目（学之思、Frappe Learning）虽不限制截图引用，但其代码具有传染性，二次开发需谨慎；CBIT 仓库未包含 LICENSE 文件，建议先与作者确认。")
para("另需说明：开源项目迭代较快，界面可能随版本变化。若需复核，请以本报告标注的原始地址与获取日期为准。")

h2("9.2  各项目素材位置")
table([
    ["项目", "截图原始位置", "获取方式", "许可与限制"],
    ["砚考", "README「项目展示」表格，图片托管于 bucket.alan.org.cn", "打开仓库 README，右键另存；或 curl 下载 <img src> 地址", "MIT，引用与二次开发均友好"],
    ["学之思", "README「系统展示」，图片托管于 www.mindskip.net/style/git/images/", "按 student/1.png、admin/1.png 等路径直接访问", "AGPL-3.0，代码具传染性"],
    ["SurveyKing", "仓库 docs/readme/*.webp（exam-editor、exam-answer-ui、practice-desktop、ai-create）", "raw.githubusercontent.com/javahuang/SurveyKing/master/docs/readme/ 下按文件名下载", "MIT，最宽松"],
    ["CBIT", "仓库 demopic/ 目录（dashboard、examconfig、manualquestionselect、inexam、llmconfig）", "raw.githubusercontent.com/reneverland/CBIT-AiExam-plus/master/demopic/ 下按文件名下载", "README 声明 MIT，但无 LICENSE 文件，需确认"],
    ["Frappe Learning", "仓库 .github/ 目录（hero.png、quiz.png、certificate.png）", "raw.githubusercontent.com/frappe/lms/main/.github/ 下按文件名下载", "AGPL-3.0，代码具传染性"],
], widths=[2.6, 5.6, 4.8, 3.2], font=8)

# ==================== 附录 ====================
h1("附录 A  未入围项目及排除理由")
para("以下 6 个项目在初筛阶段被排除，理由均与“本需求 + 比赛周期”有关，不代表项目本身质量差。")
table([
    ["项目", "类型 / 规模", "排除理由"],
    ["Moodle", "国际 LMS，7 500+ Star", "Quiz 模块能力确实最全（题库分类、随机组卷、essay 人工评阅、题目统计），但它是 PHP 单体 + 插件生态，要理解 Quiz 必须连同课程、成绩册、角色权限一起理解；二次开发成本远超比赛周期。本报告仅将其作为能力上限的参照。"],
    ["TCExam", "专业机考（CBA），627 Star", "题目分类、随机组卷、评分、报表、考试安全设置齐全，但界面与架构停留在 2010 年代，无移动端适配，与“面向学员的现代 Web”定位冲突。"],
    ["TAO", "QTI 标准测评平台，核心仓库 64 Star", "专业度最高、符合 QTI 标准，但社区小、学习曲线陡、部署复杂，且中文资料极少，不适合作为学生团队的参照。"],
    ["Open edX / Canvas", "国际 LMS 平台", "部署与运维门槛过高（多服务 + 容器编排），本地演示困难，功能重心在课程交付而非考试判定。"],
    ["shuzhao11/quiz", "Java 毕设项目，394 Star", "功能形态其实很贴近（人工组题、随机组题、及格率统计），但仓库未声明任何开源许可，作者明确保留商业使用权利，不能作为可复用代码。"],
    ["xmky-exam", "国产在线考试系统，5 Star", "功能列表完整（题库、组卷、阅卷、统计、微信小程序），但仅 5 Star、单人维护、无许可证文件，工程可靠性无法评估。"],
], widths=[3.0, 4.4, 8.4], font=8.5, first_col_bold=True)

h1("附录 B  本地素材清单")
para("全部截图已随报告保存于本地目录 output/oss-refs/img/，文件名为报告内引用名，可直接用于答辩 PPT 或展板。")
table([
    ["图号", "项目", "文件名"],
    ["图 3-1 ～ 3-4", "砚考", "yk_1.png、yk_3.png、yk_4.png、yk_5.png"],
    ["图 4-1 ～ 4-5", "学之思", "xzs_student_1.png、xzs_student_2.png、xzs_admin_3.png、xzs_admin_2.png、xzs_admin_1.png"],
    ["图 5-1 ～ 5-4", "SurveyKing", "sk_exam-editor.webp、sk_exam-answer-ui.webp、sk_practice-desktop.webp、sk_ai-create.webp"],
    ["图 6-1 ～ 6-5", "CBIT", "cbit_autotest_dashboard.jpg、cbit_autotest_examconfig.png、cbit_manualquestionselect.png、cbit_inexam.png、cbit_llmconfig.png"],
    ["图 7-1 ～ 7-3", "Frappe Learning", "flms_hero.png、flms_quiz.png、flms_certificate.png"],
], widths=[3.2, 3.6, 9.0], font=8.5)

doc.save(OUT)
print("saved:", OUT)




