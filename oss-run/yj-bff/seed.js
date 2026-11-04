/**
 * 警院智慧考试平台 · 演示数据种子
 * 场景：数据警务 / AI 实训 / 网络安全 三个专业的实训课程
 */
const { gradeAttempt, uid, seededShuffle } = require('./engine');

/* ================= 课程 · 章节 · 知识点 ================= */
const courses = [
  { id: 'c_py', name: 'Python 数据分析基础', code: 'PY101', teacher: 'u_tch', term: '2026 秋', catalog: '数据警务学院' },
  { id: 'c_dp', name: '数据警务技术', code: 'DP201', teacher: 'u_tch', term: '2026 秋', catalog: '数据警务学院' },
  { id: 'c_ns', name: '网络安全基础', code: 'NS110', teacher: 'u_tch', term: '2026 秋', catalog: '网络安全学院' }
];

const chapters = [
  {
    id: 'ch_py_1', courseId: 'c_py', order: 1, name: '变量、类型与表达式',
    kps: [
      { id: 'kp_py_11', name: '变量与命名规则', brief: '标识符由字母、数字、下划线组成，不能以数字开头，区分大小写' },
      { id: 'kp_py_12', name: '数值与字符串类型', brief: 'int 与 float 的运算规则，字符串不可变，支持切片' },
      { id: 'kp_py_13', name: '类型转换与运算优先级', brief: 'int()、float()、str() 显式转换，隐式提升发生在混合运算' }
    ],
    body: [
      'Python 的变量不需要声明类型，赋值即创建。标识符只能由字母、数字与下划线组成，且不能以数字开头，同时区分大小写，因此 Age 与 age 是两个不同的变量。',
      '数值类型分为整数 int 与浮点数 float，两者混合运算时结果自动提升为 float。字符串属于不可变序列，任何"修改"都会生成新对象，切片 s[1:4] 取出下标 1 到 3 的字符。'
    ]
  },
  {
    id: 'ch_py_2', courseId: 'c_py', order: 2, name: '列表、元组与字典',
    kps: [
      { id: 'kp_py_21', name: '序列的索引与切片', brief: '列表支持增删改，元组创建后不可修改' },
      { id: 'kp_py_22', name: '字典的键值映射', brief: '键必须可哈希，查找平均复杂度 O(1)' },
      { id: 'kp_py_23', name: '可变与不可变对象', brief: '列表、字典可变；元组、字符串、数字不可变' }
    ],
    body: [
      '列表用方括号定义，支持 append、insert、pop 等原地修改操作；元组用圆括号定义，一旦创建就不能增删元素，常用来表示不应被修改的记录。',
      '字典以键值对存储数据，键必须是可哈希的不可变对象，字符串与数字最常见。字典的查找、插入平均时间复杂度为 O(1)，适合做案件编号到记录的映射。'
    ]
  },
  {
    id: 'ch_py_3', courseId: 'c_py', order: 3, name: '函数与模块',
    kps: [
      { id: 'kp_py_31', name: '参数传递与默认值', brief: '位置参数、关键字参数、默认参数与可变参数' },
      { id: 'kp_py_32', name: '作用域与闭包', brief: 'LEGB 查找顺序，global 与 nonlocal 声明' },
      { id: 'kp_py_33', name: '模块导入机制', brief: 'import 与 from…import 的差异，模块只执行一次' }
    ],
    body: [
      '函数定义使用 def 关键字，参数可以有默认值，但默认参数只在定义时求值一次，因此不建议用可变对象做默认值。调用时可以用关键字参数指定实参，避免位置错乱。',
      '变量查找遵循 LEGB 顺序：局部、外层函数、全局、内置。模块被 import 时只执行一次，重复导入直接复用缓存中的模块对象。'
    ]
  },
  {
    id: 'ch_py_4', courseId: 'c_py', order: 4, name: '文件与异常处理',
    kps: [
      { id: 'kp_py_41', name: '文件读写模式', brief: 'r / w / a / b 模式，编码需显式指定' },
      { id: 'kp_py_42', name: '异常捕获与处理', brief: 'try…except…finally，捕获具体异常而非裸 except' },
      { id: 'kp_py_43', name: '上下文管理器', brief: 'with 语句保证资源释放' }
    ],
    body: [
      '打开文件必须指定模式，r 为只读、w 为覆盖写、a 为追加写，处理中文文本时应显式指定 encoding="utf-8"，否则在 Windows 上可能按 GBK 解码失败。',
      '异常处理使用 try…except…finally 结构，应捕获具体异常类型而不是笼统的 except，with 语句通过上下文管理器保证文件在离开代码块时自动关闭。'
    ]
  },
  {
    id: 'ch_py_5', courseId: 'c_py', order: 5, name: 'pandas 数据处理',
    kps: [
      { id: 'kp_py_51', name: 'DataFrame 结构', brief: '行索引与列标签，Series 为一维结构' },
      { id: 'kp_py_52', name: '缺失值处理', brief: 'isna 判断、dropna 删除、fillna 填充' },
      { id: 'kp_py_53', name: '分组聚合', brief: 'groupby 分组后配合 agg 聚合' }
    ],
    body: [
      'DataFrame 是带行列标签的二维表，每列是一个 Series。读取案件台账一般用 read_csv，配合 dtype 指定字段类型，避免编号被解析成数字而丢失前导零。',
      '缺失值用 isna() 判断，dropna() 删除，fillna() 填充。分组聚合使用 groupby("区域").agg({"案件数": "sum"})，可以快速得到各辖区的案件总量。'
    ]
  },
  {
    id: 'ch_dp_1', courseId: 'c_dp', order: 1, name: '警务数据结构与规范',
    kps: [
      { id: 'kp_dp_11', name: '案件字段规范', brief: '案件编号、发案时间、发案地点、案件类别为必填字段' },
      { id: 'kp_dp_12', name: '时空编码', brief: '时间统一为 ISO 8601，空间使用统一坐标与行政区划码' },
      { id: 'kp_dp_13', name: '数据分层', brief: '贴源层、明细层、汇总层三层结构' }
    ],
    body: [
      '警务数据的第一条规范是字段统一：案件编号全局唯一且不可复用，发案时间统一为 ISO 8601 格式，发案地点必须落到标准地址库与行政区划码，禁止自由文本填写。',
      '数据分层遵循贴源、明细、汇总三层：贴源层保持原始形态，明细层完成清洗与标准化，汇总层面向研判主题做聚合，任何跨层引用都必须可回溯到贴源记录。'
    ]
  },
  {
    id: 'ch_dp_2', courseId: 'c_dp', order: 2, name: '案件数据清洗',
    kps: [
      { id: 'kp_dp_21', name: '去重与主键对齐', brief: '以案件编号为准去重，保留更新时间最新的一条' },
      { id: 'kp_dp_22', name: '缺失与异常值处理', brief: '缺失率超过阈值的字段降级使用，异常值需回查原始卷宗' },
      { id: 'kp_dp_23', name: '脱敏与合规', brief: '身份证号、手机号、住址按规范脱敏后方可进入分析环境' }
    ],
    body: [
      '去重以案件编号为准，同一编号存在多条记录时保留更新时间最新的一条；主键冲突无法判定时不得随意覆盖，应转人工核验队列。',
      '缺失值处理要先看缺失机制：随机缺失可插补，系统性缺失往往意味着采集环节有问题。身份证号、手机号、详细住址属于敏感字段，进入分析环境前必须按规范脱敏。'
    ]
  },
  {
    id: 'ch_dp_3', courseId: 'c_dp', order: 3, name: '时空分析方法',
    kps: [
      { id: 'kp_dp_31', name: '时空立方体', brief: '以格网与时间片构成三维立方，支持时空切片查询' },
      { id: 'kp_dp_32', name: '时空聚类', brief: 'ST-DBSCAN 同时考虑空间邻域与时间邻域' },
      { id: 'kp_dp_33', name: '轨迹分析', brief: '停留点识别、路径还原与异常轨迹判定' }
    ],
    body: [
      '时空立方体把研究区域划分为规则格网，再把时间切成等长时间片，每个单元记录该时空范围内的案件数量，从而支持"某网格某时段"的切片查询。',
      'ST-DBSCAN 在 DBSCAN 的基础上增加时间维度，只有空间距离与时间距离同时落在邻域内才视为邻居，因此能识别出"同一区域连续多日"的系列案件。'
    ]
  },
  {
    id: 'ch_dp_4', courseId: 'c_dp', order: 4, name: '犯罪热点研判',
    kps: [
      { id: 'kp_dp_41', name: '热点识别方法', brief: '核密度估计与 Getis-Ord Gi* 是两类常用方法' },
      { id: 'kp_dp_42', name: '预警指标设计', brief: '同比、环比、案件密度三类指标组合' },
      { id: 'kp_dp_43', name: '研判报告结构', brief: '结论先行，数据支撑，处置建议可执行' }
    ],
    body: [
      '热点识别常用核密度估计刻画案件的空间聚集程度，Getis-Ord Gi* 则通过统计显著性判断高值聚集是否成立，二者结论应相互印证而非单独采信。',
      '研判报告遵循结论先行：先给判断，再给数据支撑，最后给可执行的处置建议。指标设计上，同比看趋势，环比看短期波动，案件密度看相对强度。'
    ]
  },
  {
    id: 'ch_ns_1', courseId: 'c_ns', order: 1, name: '密码学基础',
    kps: [
      { id: 'kp_ns_11', name: '对称加密', brief: '加解密使用同一密钥，AES 为典型算法' },
      { id: 'kp_ns_12', name: '非对称加密', brief: '公钥加密、私钥解密，RSA 与国密 SM2' },
      { id: 'kp_ns_13', name: '哈希与数字签名', brief: '哈希不可逆，签名同时保证完整性与不可否认' }
    ],
    body: [
      '对称加密的加解密使用同一把密钥，效率高但密钥分发困难，AES 是目前的主流算法，常配合分组模式使用。',
      '非对称加密用公钥加密、私钥解密，解决了密钥分发问题但速度慢，实际系统常用混合加密：用非对称算法协商会话密钥，再用对称算法加密数据。'
    ]
  },
  {
    id: 'ch_ns_2', courseId: 'c_ns', order: 2, name: 'Web 安全',
    kps: [
      { id: 'kp_ns_21', name: '注入类攻击', brief: 'SQL 注入源于拼接字符串，参数化查询可根治' },
      { id: 'kp_ns_22', name: '跨站脚本 XSS', brief: '存储型、反射型、DOM 型三类，输出编码是核心防御' },
      { id: 'kp_ns_23', name: '鉴权与越权缺陷', brief: '水平越权与垂直越权，服务端必须做二次校验' }
    ],
    body: [
      'SQL 注入的根因是把用户输入拼接进 SQL 语句，参数化查询让输入永远作为数据而非语句参与执行，是最彻底的防御手段。',
      'XSS 分为存储型、反射型与 DOM 型三类，共同点是恶意脚本在受害者浏览器中执行。输出编码与内容安全策略是两条主要防线，仅靠前端过滤不足以防御。'
    ]
  }
];

/* ================= 题库 ================= */
let qSeq = 0;
function Q(type, chapterId, kp, stem, options, answer, analysis, difficulty, extra = {}) {
  qSeq += 1;
  const ch = chapters.find((c) => c.id === chapterId);
  return {
    id: `q_${String(qSeq).padStart(3, '0')}`,
    type,
    courseId: ch.courseId,
    chapterId,
    kp,
    stem,
    options: options ? options.map((content, i) => ({ id: 'ABCDEF'[i], content })) : [],
    answer,
    analysis,
    difficulty,
    score: extra.score || 5,
    scorePoints: extra.scorePoints || [],
    sourceType: extra.sourceType || 'manual',
    sourceJobId: extra.sourceJobId || '',
    status: 'published',
    stats: { attempts: 0, correct: 0 },
    createdAt: '2026-09-12'
  };
}

const questions = [
  /* ---- 数据警务 · 准入卷 ---- */
  Q('single', 'ch_dp_1', ['kp_dp_11'], '警务数据规范中，对案件编号的要求是？',
    ['同一案件可重复编号', '全局唯一且不可复用', '按办案单位自行编号即可', '案件结案后可回收编号'],
    'B', '案件编号是案件数据的唯一主键，必须全局唯一且不可复用，结案后编号同样不得回收，否则历史数据无法回溯。', 'easy', { score: 7 }),
  Q('single', 'ch_dp_1', ['kp_dp_12'], '发案时间的推荐存储格式是？',
    ['2026年11月3日 下午3点', '20261103', 'ISO 8601 标准时间', '时间戳字符串，由各系统自定'],
    'C', '统一采用 ISO 8601（如 2026-11-03T15:00:00+08:00），可消除时区与格式歧义，便于跨系统比对。', 'easy', { score: 7 }),
  Q('judge', 'ch_dp_1', ['kp_dp_13'], '数据分层中，汇总层的数据必须能够回溯到贴源层记录。',
    null, 'T', '分层设计的核心价值在于可回溯：汇总结果一旦被质疑，必须能沿明细层追溯到贴源记录。', 'medium', { score: 6 }),

  Q('single', 'ch_dp_2', ['kp_dp_21'], '同一案件编号出现多条记录时，正确的处理方式是？',
    ['全部保留，交给研判环节判断', '任取一条即可', '保留更新时间最新的一条，冲突无法判定时转人工核验', '按记录行号保留最后一行'],
    'C', '去重规则以案件编号为准保留最新记录，但规则无法覆盖的冲突必须人工核验，避免误删有效信息。', 'medium', { score: 8 }),
  Q('multiple', 'ch_dp_2', ['kp_dp_22'], '关于缺失值处理，下列说法正确的有？',
    ['随机缺失可以采用插补方法', '系统性缺失通常提示采集环节存在问题', '所有缺失值一律填 0 最稳妥', '缺失率过高的字段应降级使用'],
    ['A', 'B', 'D'], '缺失机制决定处理方式。随机缺失可插补，系统性缺失要回查采集环节；缺失率过高的字段不宜作为研判主依据，应降级使用。', 'medium', { score: 8 }),
  Q('blank', 'ch_dp_2', ['kp_dp_23'], '案件数据进入分析环境前，身份证号、手机号、详细住址等敏感字段必须按规范进行 ____ 处理。',
    null, [['脱敏', '脱敏处理', '匿名化']], '敏感字段须脱敏后方可进入分析环境，这是数据合规的硬性要求。', 'easy', { score: 7 }),
  Q('essay', 'ch_dp_2', ['kp_dp_21', 'kp_dp_22'], '简述案件数据清洗中"去重"与"缺失值处理"各自的判断依据与注意事项。',
    null, null, '考查学生能否把清洗规则落到可执行判断上，而不是罗列名词。', 'hard', {
      score: 7,
      scorePoints: [
        { text: '去重以案件编号为主键，保留更新时间最新记录', keywords: ['案件编号', '主键', '最新'], weight: 0.3 },
        { text: '主键冲突无法判定时转人工核验，不得随意覆盖', keywords: ['人工核验', '人工', '不得覆盖'], weight: 0.25 },
        { text: '缺失值需区分随机缺失与系统性缺失', keywords: ['随机缺失', '系统性', '缺失机制'], weight: 0.25 },
        { text: '敏感字段脱敏后方可进入分析环境', keywords: ['脱敏', '合规'], weight: 0.2 }
      ]
    }),

  Q('single', 'ch_dp_3', ['kp_dp_31'], '时空立方体的基本构成单元是？',
    ['案件记录本身', '格网与时间片组合成的时空单元', '行政区划边界', '单个嫌疑人的轨迹点'],
    'B', '时空立方体由规则格网与等长时间片交叉构成，每个单元承载该时空范围内的案件计数。', 'medium', { score: 8 }),
  Q('multiple', 'ch_dp_3', ['kp_dp_32'], 'ST-DBSCAN 相比 DBSCAN 的关键差异包括？',
    ['增加时间邻域参数', '邻居判定需同时满足空间与时间距离', '不再需要空间半径参数', '能够识别同一区域连续多日的系列案件'],
    ['A', 'B', 'D'], 'ST-DBSCAN 引入时间维度，空间与时间邻域须同时满足，因此能捕捉时空邻近的系列案件；空间半径仍需要。', 'hard', { score: 8 }),
  Q('single', 'ch_dp_3', ['kp_dp_33'], '轨迹分析中，"停留点"通常指？',
    ['轨迹中出现频次最高的坐标', '对象在较小范围内持续停留超过时间阈值的位置', '轨迹的起点与终点', '速度最快的路段'],
    'B', '停留点由空间范围与停留时长共同定义，是还原活动规律、识别可疑落脚点的基础。', 'medium', { score: 7 }),
  Q('judge', 'ch_dp_3', ['kp_dp_31'], '时空立方体建成后，只能按整个时间范围查询，无法做单个时间片的切片查询。',
    null, 'F', '时空立方体的核心能力正是任意时空切片查询，可按格网、时间片或两者组合下钻。', 'easy', { score: 7 }),

  Q('single', 'ch_dp_4', ['kp_dp_41'], '关于热点识别的两种方法，下列说法正确的是？',
    ['核密度估计与 Getis-Ord Gi* 结论应相互印证', '核密度估计能给出统计显著性', 'Gi* 只能用于线状地物', '两种方法不可同时使用'],
    'A', '核密度刻画聚集强度但不给显著性，Gi* 提供统计显著性判断，两者互补，结论应相互印证。', 'hard', { score: 7 }),
  Q('blank', 'ch_dp_4', ['kp_dp_42'], '预警指标设计中，观察短期波动通常使用 ____ 指标，观察长期趋势通常使用 ____ 指标。',
    null, [['环比'], ['同比']], '环比反映相邻周期变化，适合看短期波动；同比消除季节因素，适合看长期趋势。', 'medium', { score: 7 }),
  Q('essay', 'ch_dp_4', ['kp_dp_43'], '一份犯罪热点研判报告应包含哪些部分？请说明各部分的写作要求。',
    null, null, '考查报告结构意识与"结论先行"的表达规范。', 'hard', {
      score: 6,
      scorePoints: [
        { text: '结论先行，先给出研判判断', keywords: ['结论先行', '先给', '结论'], weight: 0.3 },
        { text: '数据支撑，给出指标与依据', keywords: ['数据支撑', '指标', '依据', '支撑'], weight: 0.3 },
        { text: '处置建议可执行，落到责任与时限', keywords: ['处置建议', '可执行', '建议'], weight: 0.25 },
        { text: '说明数据来源与分析方法的局限', keywords: ['数据来源', '局限', '方法'], weight: 0.15 }
      ]
    }),

  /* ---- Python · 专项技能卷 ---- */
  Q('single', 'ch_py_1', ['kp_py_11'], '下列变量名中合法的是？',
    ['2case_id', 'case-id', 'caseId_2', 'case id'],
    'C', '标识符不能以数字开头、不能包含连字符与空格，caseId_2 符合命名规则。', 'easy', { score: 10 }),
  Q('single', 'ch_py_1', ['kp_py_12'], '执行 3 + 4 / 2 的结果类型是？',
    ['int', 'float', 'str', '报错'],
    'B', '除法 / 的结果恒为 float，因此 4/2 得 2.0，最终结果为 5.0。', 'easy', { score: 10 }),
  Q('multiple', 'ch_py_1', ['kp_py_13'], '关于类型转换，下列说法正确的有？',
    ['int("12") 得到整数 12', 'int("12.5") 可以直接得到 12', 'str(3.0) 得到 "3.0"', 'float("3.5") 得到 3.5'],
    ['A', 'C', 'D'], 'int("12.5") 会抛出 ValueError，必须先转 float 再取整，其余三项正确。', 'medium', { score: 10 }),
  Q('judge', 'ch_py_1', ['kp_py_12'], '字符串是可变对象，可以直接用下标修改其中某个字符。',
    null, 'F', '字符串不可变，s[0]="x" 会抛 TypeError，需要构造新字符串。', 'easy', { score: 10 }),

  Q('single', 'ch_py_2', ['kp_py_23'], '下列对象中，属于可变对象的是？',
    ['元组', '字符串', '列表', '整数'],
    'C', '列表与字典是可变对象，元组、字符串、数字不可变。', 'easy', { score: 10 }),
  Q('single', 'ch_py_2', ['kp_py_22'], '字典查找的平均时间复杂度是？',
    ['O(n)', 'O(log n)', 'O(1)', 'O(n log n)'],
    'C', '字典基于哈希表实现，平均查找复杂度为 O(1)，最坏情况退化到 O(n)。', 'medium', { score: 10 }),
  Q('blank', 'ch_py_2', ['kp_py_21'], '对列表 lst = [1, 2, 3, 4, 5] 执行 lst[1:4]，结果为 ____ 。',
    null, [['[2, 3, 4]', '[2,3,4]']], '切片左闭右开，取下标 1、2、3 三个元素，即 [2, 3, 4]。', 'medium', { score: 10 }),

  Q('single', 'ch_py_5', ['kp_py_51'], 'pandas 中 DataFrame 的一列本质上是一个？',
    ['list', 'dict', 'Series', 'ndarray 视图'],
    'C', 'DataFrame 每列是一个带索引的 Series，二者共享行索引。', 'medium', { score: 10 }),
  Q('multiple', 'ch_py_5', ['kp_py_52'], '处理缺失值时，下列做法合理的有？',
    ['用 isna() 判断缺失位置', '用 dropna() 直接删除含缺失的行', '把所有缺失统一填 0', '按业务含义选择 fillna 的填充值'],
    ['A', 'B', 'D'], '统一填 0 会把"未采集"与"取值为零"混为一谈，应按字段语义选择填充策略。', 'medium', { score: 10 }),
  Q('essay', 'ch_py_5', ['kp_py_53'], '说明用 pandas 统计各辖区案件总量的思路，并指出一个常见陷阱。',
    null, null, '考查分组聚合的实际使用与数据类型陷阱意识。', 'hard', {
      score: 10,
      scorePoints: [
        { text: '按辖区字段 groupby 分组', keywords: ['groupby', '分组'], weight: 0.3 },
        { text: '对案件数或编号计数聚合', keywords: ['agg', '聚合', '计数', 'sum', 'count'], weight: 0.3 },
        { text: '指出编号前导零或类型被推断导致的统计偏差', keywords: ['前导零', '类型', 'dtype', '编号'], weight: 0.25 },
        { text: '建议先做数据校验再聚合', keywords: ['校验', '清洗', '核对'], weight: 0.15 }
      ]
    }),

  /* ---- 网络安全 ---- */
  Q('single', 'ch_ns_1', ['kp_ns_11'], 'AES 属于哪一类算法？',
    ['非对称加密', '对称加密', '哈希算法', '编码算法'],
    'B', 'AES 加解密使用同一把密钥，属于对称加密；哈希不可逆，不属于加密。', 'easy', { score: 25 }),
  Q('single', 'ch_ns_2', ['kp_ns_21'], '防御 SQL 注入最彻底的手段是？',
    ['前端表单校验', '统一转义单引号', '参数化查询（预编译）', '隐藏报错信息'],
    'C', '参数化查询让输入永远以数据身份参与执行，从机制上消除注入，其余手段只是缓解。', 'medium', { score: 25 }),
  Q('multiple', 'ch_ns_2', ['kp_ns_22'], '关于 XSS，下列说法正确的有？',
    ['存储型 XSS 的恶意脚本保存在服务端', '输出编码是核心防御手段之一', '仅靠前端输入过滤即可完全防御', '内容安全策略 CSP 可降低利用面'],
    ['A', 'B', 'D'], '前端过滤可被绕过，服务端输出编码与 CSP 才是防线，仅靠前端过滤不能完全防御。', 'hard', { score: 25 }),
  Q('judge', 'ch_ns_2', ['kp_ns_23'], '接口只要在前端隐藏了按钮，就足以防止越权操作。',
    null, 'F', '前端隐藏只是体验优化，越权防御必须在服务端按权限点与数据范围二次校验。', 'easy', { score: 25 }),

  Q('single', 'ch_ns_1', ['kp_ns_12'], '下列属于非对称加密算法的是？',
    ['AES', 'DES', 'RSA', 'SHA-256'],
    'C', 'RSA 使用公钥加密、私钥解密，属于非对称加密；AES 与 DES 为对称算法，SHA-256 是哈希函数。', 'easy', { score: 25 }),
  Q('single', 'ch_ns_1', ['kp_ns_13'], '哈希函数最重要的性质是？',
    ['可逆，能还原原文', '输出长度随输入长度变化', '不可逆且抗碰撞', '加密速度比对称加密更快'],
    'C', '哈希是单向函数，无法由摘要还原原文，同时要求抗碰撞性，这两点是数字签名与完整性校验的基础。', 'medium', { score: 25 }),
  Q('judge', 'ch_ns_1', ['kp_ns_11'], '对称加密不需要考虑密钥分发问题。',
    null, 'F', '对称加密的加解密共用一把密钥，密钥如何安全分发给通信双方恰恰是它最大的工程难题。', 'easy', { score: 25 })
];

/* ================= 试卷 ================= */
function pick(chapterId, n) {
  return questions.filter((q) => q.chapterId === chapterId).slice(0, n);
}
const dpG1 = questions.filter((q) => q.chapterId === 'ch_dp_2');
const dpG2 = questions.filter((q) => q.chapterId === 'ch_dp_3');
const dpG3 = questions.filter((q) => q.chapterId === 'ch_dp_4');
const dpG4 = questions.filter((q) => q.chapterId === 'ch_dp_1');
const pyG1 = questions.filter((q) => ['ch_py_1', 'ch_py_2'].includes(q.chapterId)).slice(0, 4);
const pyG2 = questions.filter((q) => ['ch_py_2', 'ch_py_3'].includes(q.chapterId)).slice(0, 3);
const pyG3 = questions.filter((q) => q.chapterId === 'ch_py_5');
const nsQ = questions.filter((q) => q.courseId === 'c_ns');

const papers = [
  {
    id: 'p_dp_admission',
    title: '数据警务项目准入卷（A 卷）',
    courseId: 'c_dp',
    paperDesc: '面向「智慧警务数据研判工坊」的项目准入考核，四个知识点组全部达标方可获得准入资格。',
    totalScore: 100,
    passRate: 0.7,
    duration: 60,
    status: 'published',
    groups: [
      { id: 'g1', name: '案件数据清洗', chapterId: 'ch_dp_2', weight: 30, threshold: 0.6 },
      { id: 'g2', name: '时空分析', chapterId: 'ch_dp_3', weight: 30, threshold: 0.6 },
      { id: 'g3', name: '热点研判', chapterId: 'ch_dp_4', weight: 20, threshold: 0.6 },
      { id: 'g4', name: '数据规范', chapterId: 'ch_dp_1', weight: 20, threshold: 0.6 }
    ],
    items: [
      ...dpG1.map((q, i) => ({ qid: q.id, score: i < 2 ? 8 : 7, group: 'g1' })),
      ...dpG2.map((q, i) => ({ qid: q.id, score: i < 2 ? 8 : 7, group: 'g2' })),
      ...dpG3.map((q, i) => ({ qid: q.id, score: i < 2 ? 7 : 6, group: 'g3' })),
      ...dpG4.map((q, i) => ({ qid: q.id, score: i < 2 ? 7 : 6, group: 'g4' }))
    ]
  },
  {
    id: 'p_py_skill',
    title: 'Python 数据分析专项技能卷',
    courseId: 'c_py',
    paperDesc: '检验 Python 语法、容器与数据处理三项专项能力，可发放专项技能资格。',
    totalScore: 100,
    passRate: 0.7,
    duration: 45,
    status: 'published',
    groups: [
      { id: 'g1', name: '语法与容器', chapterId: 'ch_py_1', weight: 50, threshold: 0.6 },
      { id: 'g2', name: '数据处理', chapterId: 'ch_py_5', weight: 50, threshold: 0.6 }
    ],
    items: [
      ...pyG1.map((q, i) => ({ qid: q.id, score: 10, group: 'g1' })),
      ...pyG2.map((q, i) => ({ qid: q.id, score: 10, group: 'g2' })),
      ...pyG3.map((q, i) => ({ qid: q.id, score: 10, group: 'g2' }))
    ]
  },
  {
    id: 'p_py_ch1',
    title: '第一章随堂测 · 变量与类型',
    courseId: 'c_py',
    paperDesc: '章节学习完成后解锁，用于检验单章掌握情况，不发放准入资格。',
    totalScore: 100,
    passRate: 0.6,
    duration: 15,
    status: 'published',
    groups: [{ id: 'g1', name: '基础语法', chapterId: 'ch_py_1', weight: 100, threshold: 0.6 }],
    items: questions.filter((q) => q.chapterId === 'ch_py_1').map((q) => ({ qid: q.id, score: 25, group: 'g1' }))
  },
  {
    id: 'p_ns_ch1',
    title: '第一章随堂测 · 密码学基础',
    courseId: 'c_ns',
    paperDesc: '章节学习完成后解锁，检验对称与非对称加密的基本概念。',
    totalScore: 100,
    passRate: 0.6,
    duration: 15,
    status: 'published',
    groups: [{ id: 'g1', name: '密码学基础', chapterId: 'ch_ns_1', weight: 100, threshold: 0.6 }],
    items: questions.filter((q) => q.chapterId === 'ch_ns_1').map((q) => ({ qid: q.id, score: 25, group: 'g1' }))
  },
  {
    id: 'p_ns_skill',
    title: 'Web 安全专项技能卷',
    courseId: 'c_ns',
    paperDesc: '面向网络安全方向的专项能力考核，覆盖注入、XSS 与越权三类高频缺陷。',
    totalScore: 100,
    passRate: 0.7,
    duration: 40,
    status: 'published',
    groups: [
      { id: 'g1', name: '注入与 XSS', chapterId: 'ch_ns_2', weight: 70, threshold: 0.6 },
      { id: 'g2', name: '鉴权与越权', chapterId: 'ch_ns_2', weight: 30, threshold: 0.6 }
    ],
    items: [
      { qid: 'q_026', score: 45, group: 'g1' },
      { qid: 'q_027', score: 25, group: 'g1' },
      { qid: 'q_028', score: 30, group: 'g2' }
    ]
  }
];

/* ================= 考试 ================= */
const exams = [
  {
    id: 'e_dp_admission', title: '智慧警务数据研判工坊 · 项目准入卷', type: 'admission_exam', paperId: 'p_dp_admission',
    courseId: 'c_dp', chapterIds: ['ch_dp_2', 'ch_dp_3', 'ch_dp_4'], duration: 60,
    startAt: '2026-10-20T09:00:00+08:00', endAt: '2027-01-10T23:59:59+08:00',
    requireChapter: 'ch_dp_2', abilityScope: ['数据清洗', '时空分析', '热点研判'],
    allowBacktrack: true, shuffleQuestion: false, shuffleOption: true, cheatLevel: 'medium', answerPolicy: 'after_grading',
    status: 'published', remark: '工坊立项前须取得本卷准入资格，资格有效期 12 个月。'
  },
  {
    id: 'e_py_skill', title: 'Python 数据分析专项技能卷', type: 'skill_exam', paperId: 'p_py_skill',
    courseId: 'c_py', chapterIds: [], duration: 45,
    startAt: '2026-10-01T09:00:00+08:00', endAt: '2027-01-10T23:59:59+08:00',
    requireChapter: null, abilityScope: ['Python 语法', '数据处理'],
    allowBacktrack: true, shuffleQuestion: true, shuffleOption: true, cheatLevel: 'medium', answerPolicy: 'after_grading',
    status: 'published', remark: '自主报考，不限次数，取历次最高分。'
  },
  {
    id: 'e_py_ch1', title: 'Python 第一章随堂测', type: 'chapter_quiz', paperId: 'p_py_ch1',
    courseId: 'c_py', chapterIds: ['ch_py_1'], duration: 15,
    startAt: '2026-09-20T00:00:00+08:00', endAt: '2027-01-10T23:59:59+08:00',
    requireChapter: 'ch_py_1', abilityScope: [],
    allowBacktrack: false, shuffleQuestion: true, shuffleOption: true, cheatLevel: 'low', answerPolicy: 'after_submit',
    status: 'published', remark: '章节学习完成后解锁，成绩计入能力画像，不发放准入资格。'
  },
  {
    id: 'e_ns_ch1', title: '网络安全第一章随堂测', type: 'chapter_quiz', paperId: 'p_ns_ch1',
    courseId: 'c_ns', chapterIds: ['ch_ns_1'], duration: 15,
    startAt: '2026-09-25T00:00:00+08:00', endAt: '2027-01-10T23:59:59+08:00',
    requireChapter: 'ch_ns_1', abilityScope: [],
    allowBacktrack: false, shuffleQuestion: false, shuffleOption: true, cheatLevel: 'low', answerPolicy: 'after_submit',
    status: 'published', remark: '尚未完成章节学习时保持锁定状态。'
  },
  {
    id: 'e_ns_skill', title: 'Web 安全专项技能卷', type: 'skill_exam', paperId: 'p_ns_skill',
    courseId: 'c_ns', chapterIds: [], duration: 40,
    startAt: '2026-10-15T09:00:00+08:00', endAt: '2027-01-10T23:59:59+08:00',
    requireChapter: null, abilityScope: ['Web 安全'],
    allowBacktrack: true, shuffleQuestion: false, shuffleOption: true, cheatLevel: 'medium', answerPolicy: 'after_grading',
    status: 'published', remark: '专项能力量化，可用于能力画像。'
  }
];

/* ================= 用户 ================= */
/* §7.3 统一认证字段映射：studentNo / organizationId / classId 由认证中心提供，本地仅镜像 */
const users = [
  { id: 'u_stu1', account: '2023011', name: '张予安', role: 'student', dept: '数据警务学院 · 2023 级', avatarColor: '#1e5eff', completed: ['ch_py_1', 'ch_dp_1', 'ch_dp_2'], points: 0, studentNo: '2023011', organizationId: 'org_dp', classId: 'cls_2023_dp' },
  { id: 'u_stu2', account: '2023012', name: '李明轩', role: 'student', dept: '数据警务学院 · 2023 级', avatarColor: '#0f9d76', completed: ['ch_py_1', 'ch_dp_1', 'ch_dp_2', 'ch_dp_3'], points: 0, studentNo: '2023012', organizationId: 'org_dp', classId: 'cls_2023_dp' },
  { id: 'u_stu3', account: '2023013', name: '王思远', role: 'student', dept: '网络安全学院 · 2023 级', avatarColor: '#c2761b', completed: ['ch_py_1', 'ch_ns_1'], points: 0, studentNo: '2023013', organizationId: 'org_ns', classId: 'cls_2023_ns' },
  { id: 'u_tch', account: 'T1001', name: '陈立群', role: 'teacher', dept: '数据警务学院 · 教研室', avatarColor: '#6b46c1', completed: [], points: 0, studentNo: null, organizationId: 'org_dp', classId: null },
  { id: 'u_adm', account: 'admin', name: '平台管理员', role: 'admin', dept: '教务处', avatarColor: '#334155', completed: [], points: 0, studentNo: null, organizationId: 'org_jw', classId: null }
];

/* ================= 历史答卷（演示用） ================= */
function snapshot(paper, seed) {
  return paper.items.map((it) => {
    const q = questions.find((x) => x.id === it.qid);
    let options = q.options.map((o) => ({ ...o }));
    if (options.length) options = seededShuffle(options, seed + it.qid.length);
    return {
      qid: q.id, type: q.type, stem: q.stem, options, score: it.score, group: it.group,
      answer: q.answer, analysis: q.analysis, kp: q.kp, scorePoints: q.scorePoints, chapterId: q.chapterId
    };
  });
}

/** plan: { correct: 'all' | [qid], wrong: [qid], partial: [qid], essay: {qid: answerText} } */
function buildAnswers(snap, plan) {
  const answers = {};
  snap.forEach((item) => {
    if (item.type === 'essay') {
      answers[item.qid] = (plan.essay && plan.essay[item.qid]) || '';
      return;
    }
    const wrong = (plan.wrong || []).includes(item.qid);
    if (item.type === 'multiple') {
      if (wrong) answers[item.qid] = [item.answer[0]];
      else if (plan.partial && plan.partial.includes(item.qid)) answers[item.qid] = [item.answer[0]];
      else answers[item.qid] = item.answer.slice();
    } else if (item.type === 'blank') {
      answers[item.qid] = wrong ? ['未知'] : (item.answer[0] && (Array.isArray(item.answer[0]) ? item.answer[0][0] : item.answer[0])) || '';
    } else {
      if (wrong) {
        const other = item.options.find((o) => o.id !== item.answer);
        answers[item.qid] = other ? other.id : item.answer === 'T' ? 'F' : 'T';
      } else {
        answers[item.qid] = item.answer;
      }
    }
  });
  return answers;
}

const attempts = [];
function seedAttempt({ id, examId, userId, wrong = [], partial = [], essayText = {}, submittedAt, graded = false, eventCount = 0, reviewNote = '' }) {
  const exam = exams.find((e) => e.id === examId);
  const paper = papers.find((p) => p.id === exam.paperId);
  const snap = snapshot(paper, 7);
  const answers = buildAnswers(snap, { wrong, partial, essay: essayText });
  const result = gradeAttempt(paper, snap, answers);
  const att = {
    id, examId, paperId: paper.id, userId, status: graded ? 'graded' : 'submitted',
    startedAt: submittedAt, submittedAt, deadlineAt: submittedAt,
    snapshot: snap, answers, seed: 7,
    objectiveScore: result.objective, essayScore: result.essay, totalScore: result.total,
    groups: result.groups, dualPass: result.dualPass, totalPassed: result.totalPassed,
    failReason: result.failReason, failType: result.failType, level: result.level,
    details: result.details,
    events: Array.from({ length: eventCount }, (_, i) => ({
      type: ['blur', 'fullscreen_exit', 'paste'][i % 3],
      at: submittedAt
    })),
    reviews: graded ? result.details.filter((d) => d.type === 'essay').map((d) => ({ qid: d.qid, score: d.awarded, comment: reviewNote || '评分要点基本命中，确认。', confirmedBy: 'u_tch', confirmedAt: submittedAt })) : [],
    admissibility: null
  };
  attempts.push(att);
  return att;
}

const ESSAY_STRONG =
  '去重以案件编号为主键，同一编号保留更新时间最新的一条；主键冲突无法判定时转人工核验，不能随意覆盖。缺失值要先区分随机缺失与系统性缺失，随机缺失可以插补，系统性缺失要回查采集环节。敏感字段如身份证号、手机号必须脱敏后才能进入分析环境。';
const ESSAY_WEAK = '把重复的数据删掉，缺失的补上就可以了，注意不要出错。';
const ESSAY_REPORT = '结论先行，先给出热点判断；然后用案件密度和同环比数据做支撑；最后给出处置建议，明确责任单位和时限，并说明数据来源与方法的局限。';

seedAttempt({ id: 'att_seed_01', examId: 'e_py_ch1', userId: 'u_stu1', submittedAt: '2026-09-22T10:20:00+08:00', graded: true });
seedAttempt({ id: 'att_seed_02', examId: 'e_py_skill', userId: 'u_stu1', wrong: ['q_015'], submittedAt: '2026-10-08T14:05:00+08:00', graded: true, eventCount: 1, essayText: { q_024: '按辖区 groupby 分组，然后 agg 统计案件数量。注意编号前导零，读入时要指定 dtype 为字符串，否则会丢零。' } });
seedAttempt({ id: 'att_seed_03', examId: 'e_dp_admission', userId: 'u_stu1', wrong: ['q_009', 'q_010', 'q_011'], submittedAt: '2026-10-26T16:40:00+08:00', graded: true, eventCount: 2, essayText: { q_007: ESSAY_STRONG, q_014: ESSAY_REPORT } });
seedAttempt({ id: 'att_seed_04', examId: 'e_dp_admission', userId: 'u_stu2', submittedAt: '2026-10-27T09:15:00+08:00', graded: true, essayText: { q_007: ESSAY_STRONG, q_014: ESSAY_REPORT } });
seedAttempt({ id: 'att_seed_05', examId: 'e_dp_admission', userId: 'u_stu3', wrong: ['q_004', 'q_005', 'q_012'], submittedAt: '2026-10-28T11:00:00+08:00', graded: true, essayText: { q_007: ESSAY_WEAK, q_014: '先给结论，再给数据，最后给建议。' } });
seedAttempt({ id: 'att_seed_06', examId: 'e_py_skill', userId: 'u_stu2', partial: ['q_017'], submittedAt: '2026-10-09T15:30:00+08:00', graded: true, essayText: { q_024: '用 groupby 按辖区分组，再用 agg 求和。' } });
seedAttempt({ id: 'att_seed_07', examId: 'e_py_skill', userId: 'u_stu3', wrong: ['q_015', 'q_016'], submittedAt: '2026-10-12T10:10:00+08:00', graded: true, essayText: { q_024: '' } });
seedAttempt({ id: 'att_seed_08', examId: 'e_ns_skill', userId: 'u_stu3', partial: ['q_027'], submittedAt: '2026-10-18T13:45:00+08:00', graded: true });
/* 待阅卷：AI 初评完成、教师尚未确认 */
seedAttempt({ id: 'att_seed_09', examId: 'e_dp_admission', userId: 'u_stu3', wrong: ['q_009', 'q_010'], submittedAt: '2026-11-02T15:20:00+08:00', graded: false, essayText: { q_007: ESSAY_STRONG, q_014: '结论先行，数据支撑，处置建议。' } });
seedAttempt({ id: 'att_seed_10', examId: 'e_py_skill', userId: 'u_stu2', submittedAt: '2026-11-02T18:30:00+08:00', graded: false, essayText: { q_024: '按 groupby 分组聚合，注意 dtype。' } });

/* ================= 准入资格（由已生效答卷推导） ================= */
function buildAdmissions() {
  const list = [];
  attempts
    .filter((a) => a.status === 'graded' && a.dualPass)
    .forEach((a) => {
      const exam = exams.find((e) => e.id === a.examId);
      if (exam.type === 'chapter_quiz') return;
      const user = users.find((u) => u.id === a.userId);
      const exist = list.find((x) => x.userId === a.userId && x.examId === a.examId);
      if (exist) {
        if (a.totalScore > exist.score) {
          exist.score = a.totalScore;
          exist.level = a.level;
        }
        return;
      }
      const issued = new Date(a.submittedAt);
      const expire = new Date(issued);
      expire.setFullYear(expire.getFullYear() + 1);
      list.push({
        id: `adm_${a.id}`,
        userId: a.userId,
        userName: user.name,
        examId: a.examId,
        examTitle: exam.title,
        attemptId: a.id,
        abilityScope: exam.abilityScope || [],
        score: a.totalScore,
        level: a.level,
        issuedAt: a.submittedAt,
        expireAt: expire.toISOString(),
        status: 'active',
        revokedReason: ''
      });
    });
  return list;
}
const admissions = buildAdmissions();

/* 积分：首次通过按考试类型计分 */
const POINTS = { chapter_quiz: 5, skill_exam: 20, admission_exam: 30 };
admissions.forEach((a) => {
  const exam = exams.find((e) => e.id === a.examId);
  const u = users.find((x) => x.id === a.userId);
  u.points = (u.points || 0) + (POINTS[exam.type] || 0) + (a.score >= 85 ? 10 : 0);
});
users.find((u) => u.id === 'u_stu1').points += 5; // 随堂测首次通过

/* ================= 审计日志 ================= */
const audits = [
  { id: 'au_1', at: '2026-10-26T16:41:20+08:00', actor: '陈立群', role: 'teacher', action: '阅卷确认', target: 'att_seed_03', detail: '确认 2 道简答题得分，成绩生效' },
  { id: 'au_2', at: '2026-10-20T09:02:10+08:00', actor: '陈立群', role: 'teacher', action: '发布考试', target: 'e_dp_admission', detail: '发布「智慧警务数据研判工坊 · 项目准入卷」' },
  { id: 'au_3', at: '2026-10-19T20:12:00+08:00', actor: '陈立群', role: 'teacher', action: 'AI 命题入库', target: 'job_demo_01', detail: '生成 12 题，审核通过 9 题，淘汰 3 题（超出内容范围）' },
  { id: 'au_4', at: '2026-10-28T11:02:33+08:00', actor: '平台管理员', role: 'admin', action: '权限变更', target: 'u_stu3', detail: '开放「Web 安全专项技能卷」报考权限' }
];

module.exports = {
  build: () => ({
    meta: { version: 4, seededAt: new Date().toISOString(), title: '警院智慧考试平台' },
    courses, chapters, questions, papers, exams, users,
    attempts, admissions, audits,
    jobs: [],
    events: [],
    inbox: [],
    outbox: [],
    sessions: [],
    progress: users.reduce((acc, u) => ((acc[u.id] = u.completed.slice()), acc), {})
  })
};
