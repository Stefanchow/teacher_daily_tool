# 英语学科 - 教案生成指令

## 概述

本指令定义了英语学科教案（Lesson Plan）的生成规则，严格遵循项目中的教案标准文档和提示词构建器规范。

## 学科核心素养

英语学科核心素养包括：
1. **语言能力** - 听说读写技能
2. **文化意识** - 跨文化交际能力
3. **思维品质** - 逻辑性、批判性、创新性思维
4. **学习能力** - 自主学习策略

## 教案结构标准

### 1. 基本信息

```typescript
interface LessonPlanMeta {
  title_zh: string;       // 中文标题
  title_en: string;       // 英文标题
  grade: string;          // 年级（如：Grade 3）
  duration: number;       // 教学时长（分钟）- 不包含作业时间
  teachingMethod: string; // 教学法（PPP/PWP/TBLT/TTT/project-based）
}
```

### 2. 教学准备 (teachingPreparation)

```typescript
interface TeachingPreparation {
  // 教学目标（双语数组）
  objectives_zh: string[];  // 如：["学生能够掌握5个家庭成员词汇", "学生能够用'This is my...'介绍家人"]
  objectives_en: string[];  // 如：["Students will be able to..."]
  
  // 核心词汇（双语数组）
  keyWords_zh: string[];    // 如：["爸爸", "妈妈", "哥哥"]
  keyWords_en: string[];    // 如：["father", "mother", "brother"]
  
  // 句型结构（双语数组）
  sentenceStructures_zh: string[];  // 如：["This is my...", "He/She is..."]
  sentenceStructures_en: string[];  // 如：["This is my...", "He/She is..."]
  
  // 教具（双语字符串）
  teachingAids_zh: string;  // 如："PPT, 家庭照片, 单词卡片"
  teachingAids_en: string;  // 如："PPT, family photos, word cards"
  
  // 学情分析（双语）
  studentAnalysis_zh: string;
  studentAnalysis_en: string;
  
  // 受众细分分析（可选）
  audienceAnalysis?: {
    type: string;         // 类型：visual(视觉型)/auditory(听觉型)/kinesthetic(动觉型)
    description: string;  // 描述
    ageRange: string;     // 年龄段
    proficiency: string;  // 熟练度
    learningStyle: string;// 学习风格
  }[];
}
```

### 3. 教学法选择与流程结构

根据课型选择不同的教学法：

#### 3.1 PPP (Presentation-Practice-Production)
**适用场景**：语法、词汇等准确性要求高的内容

```
流程结构：
- Presentation (呈现): 建立概念，教师演示新内容
- Practice (练习): 机械→意义练习，师生共同练习
- Production (产出): 自由运用，学生独立应用
```

#### 3.2 PWP (Pre-While-Post)
**适用场景**：阅读课、听力课

```
流程结构：
- Pre-reading/listening (前): 预测、背景激活、词汇预教
- While-reading/listening (中): 略读→扫读→精读/泛听→精听
- Post-reading/listening (后): 讨论、复述、评价、拓展
```

#### 3.3 TBLT (Task-Based Language Teaching) - 默认
**适用场景**：综合语言运用、真实交际任务

```
流程结构：
- Pre-task (任务前): 引入话题、语言准备、任务说明
- Task Cycle (任务环): 
  - Task (做任务): 学生执行任务
  - Planning (计划): 准备汇报
  - Report (报告): 展示成果
- Language Focus (语言聚焦): 分析、练习重点语言
```

#### 3.4 TTT (Test-Teach-Test)
**适用场景**：诊断性教学、查漏补缺

```
流程结构：
- Test 1 (测试1): 诊断学生现有水平和问题
- Teach (教学): 针对发现的问题进行精准教学
- Test 2 (测试2): 验证学习效果
```

#### 3.5 Project-based (项目式学习)
**适用场景**：跨学科主题、深度学习

```
流程结构：
- 项目启动: 明确任务、分组分工
- 探究过程: 信息收集、方案设计
- 成果制作: 整合信息、创建作品
- 展示评价: 汇报展示、反思评价
```

### 4. 教学步骤 (procedures)

#### 步骤数量要求
- **必须生成 10-15 个详细步骤**
- 对于PWP课型：将Pre-While-Post各阶段拆解为更细的子任务
  - 如：导入→词汇预教→预测→略读→扫读→细读第一段→细读第二段→批判性思维→复述

#### 步骤字段结构
```typescript
interface ProcedureStep {
  title_zh: string;      // 中文标题，如："步骤1：导入 (5分钟)"
  title_en: string;      // 英文标题，如："Step 1: Introduction (5 min)"
  duration: number;      // 时长（分钟）
  
  // 详细内容（Markdown格式，使用以下标题）
  content_zh: string;    // 中文内容
  content_en: string;    // 英文内容
}
```

#### content字段必须包含的标题

| 中文标题 | 英文标题 | 说明 |
|---------|---------|------|
| **教师行为** | **Teacher's Actions** | 教师的具体操作指令 |
| **教师话术** | **Teacher's Talk** | 教师说的话（必须生动幽默） |
| **学生反应** | **Students' Responses** | 预期学生的行为和回应 |
| **设计意图** | **Design Rationale** | 为什么这样设计（含心理学依据） |

**注意**：根据实际代码验证，以上4个字段是核心要求。关键提问和及时反馈可根据具体内容灵活添加。

**示例**：
```markdown
**教师行为**：播放一段关于家庭的短视频，引导学生关注视频中的人物关系。

**教师话术**："Alright detectives, look at this clue! Who can you see in this video?"

**学生反应**：学生观看视频，尝试说出看到的人物。

**设计意图**：通过视频激活学生的背景知识，激发学习兴趣。根据认知心理学，多感官输入有助于信息编码。
```

### 5. 时长分配规则

```typescript
// 教案总时长计算规则
const teachingDuration = params.duration || 45;  // 教学时长（用户输入）
const homeworkDuration = 2;                       // 作业时长（固定）
const totalDuration = teachingDuration + homeworkDuration;  // 总时长
```

- **教学步骤**：所有教学步骤的时长之和必须等于 `teachingDuration`
- **作业步骤**：最后一步必须是作业，固定为 **2分钟**
- **作业是额外的**：不包含在教学时长内
- **作业格式**：必须是分层作业（Foundation/Improvement/Challenge）

### 6. 创意引擎：流派化架构 (Genre-Based Architecture)

系统会随机选择一种流派来设计课程：

| 流派类型 | 名称 | 描述 | 适用 |
|---------|------|------|------|
| A | 沉浸式游戏化 | 森林冒险、超市大亨、外星人访问等主题 | 小学 |
| B | 悬疑解谜式 | 线索收集、字谜、演绎推理 | 初中 |
| C | 项目式学习(PBL) | 真实世界任务（如策划国际夏令营） | 高中 |
| D | 辩论与批判思维 | 立场选择、围绕主题构建论点 | 初高中 |
| E | 跨学科融合 | 与科学、艺术、历史等学科结合 | 全学段 |

**约束**：整个课程流程必须基于选定的流派设计。

### 7. 必须融合的教学要素

#### 7.1 CLIL (内容语言融合)
- 必须在教学过程中融入**跨学科**内容（科学、艺术、历史等）
- 必须融入**跨文化**内容

#### 7.2 KWL 模型（作为思维流程，非固定表格）
不要机械地创建单独的KWL表格，而是通过活动自然融入：

- **K (Know - 激活旧知)**：在导入/热身环节，通过提问、小任务或讨论唤起学生已有知识
- **W (Want - 想知)**：在早期环节，通过目标设定或引导性问题，引出学生想了解的内容
- **L (Learned - 新知)**：在总结/结束环节，通过复盘、分享或小结活动，帮助学生反思学到的内容

### 8. 创意铁律 (严禁项)

- **严禁 "Listen and repeat"**：改为 "Echo mimicry (影子跟读)" 或 "角色配音"
- **严禁 "Play a game"**：必须使用具体创意游戏名（如 "Word Bomb", "Mafia"）
- **严禁 "Read together"**：改为 "Running dictation" 或 "Reader's Theater"
- **非确定性**：即使参数相同，严禁复用超过20%的描述

### 9. 年级段精准调优

#### 小学段 (Grades 1-3)
- 增加视觉冲击力和肢体反馈（TPR）
- 减少枯燥的语法讲解
- 使用简单竞赛、色彩丰富的道具

#### 小学高段 (Grades 4-6)
- 侧重逻辑推理、团队策略
- 信息差活动 (Info Gap)
- 稍微复杂的角色扮演

#### 初中段
- 引入社交属性和团队竞赛
- 利用心理学规律设计挑战环节
- 悬疑解谜类活动

#### 高中段
- 强调深度思考、地道表达
- 现实世界连接
- 使用"苏格拉底提问法"

### 10. 归纳式教学原则

#### 词汇教学
- **严禁直接讲解或翻译单词**
- 遵循"语境呈现 → 引导觉察 → 学生推导"的路径

#### 句型教学
- **严禁直接展示或机械操练句型**
- 遵循"语境中呈现 → 学生觉察 → 引导推导 → 习得"的路径

### 11. 内容连贯性要求

- **过渡必须基于深层内容逻辑**，而非仅仅是过渡词
- 前一步骤的产出必须是下一步骤的直接输入或情境
- 确保活动之间有连续的叙事流程，逻辑上相互构建

**示例**：
```
不好："Now let's play a game."（只有过渡词，没有内容关联）
好："Using the vocabulary map we just created, let's now play a word association game to reinforce these connections."
```

## 生成提示词模板

```markdown
# Role
You are an expert ESL teacher trainer with CELTA and DELTA certifications.

# Task
Create a detailed lesson plan based on the following constraints.

# 🚀 Creative Engine: Genre-Based Architecture
**Selected Genre**: {selectedGenre.name}
**Description**: {selectedGenre.desc}
**Constraint**: You MUST design the entire lesson flow based on this genre.

# 🚫 Creative Constraints (Prohibited Items)
- **NO "Listen and repeat"**: Use "Echo mimicry" or "Dubbing".
- **NO "Play a game"**: Use specific creative names (e.g., "Word Bomb", "Mafia").
- **NO "Read together"**: Use "Running dictation" or "Reader's Theater".
- **Differentiation**: Even with same parameters, do NOT reuse >20% of descriptions.

# 🎓 Grade-Level Optimization
- **Primary**: Increase visual impact and TPR. Reduce boring grammar lectures.
- **Middle**: Introduce social attributes and team competitions. Use psychological hooks.
- **High**: Emphasize deep thinking, authentic expression, and real-world connections (Socratic Method).

# Inputs
- **Topic**: {topic}
- **Grade/Level**: {grade}
- **Duration**: {duration} minutes (teaching time, homework is extra)
- **Methodology**: {method} (e.g., PPP, TBLT, PWP)

# Content Supplementation Rule
- If the provided words/sentences/grammar are empty or insufficient, you MUST AUTO-GENERATE suitable content relevant to the topic.

# Requirements
1. **Objectives**: Use SWBAT format, specific and measurable.
2. **Teaching Aids**: Prioritize REAL OBJECTS (realia) whenever possible.
3. **Procedure**:
   - Generate **10-15 detailed steps** that sum up to exactly {duration} minutes.
   - For PWP: Break down Pre-While-Post into granular sub-tasks.
   - Specify Interaction patterns (T-S, S-S, Pair, Group).
   - Include vivid, humorous "Teacher's Talk" examples.
   - Transitions must be based on DEEP CONTENT LOGIC.
4. **Mandatory Methodological Elements**:
   - **CLIL Integration**: Cross-Curricular and Cross-Cultural elements.
   - **KWL Framework**: Embed K/W/L thinking naturally into activities.
5. **Inductive Teaching**: 
   - Vocabulary: Context → Notice → Deduce (NEVER direct translation)
   - Sentences: Context → Notice → Deduce → Acquire (NEVER direct drilling)
6. **Content Detail**: Each step MUST be STRICTLY at least 500 characters.
7. **Homework**: MUST be the LAST step with EXACTLY 2 minutes duration (extra time).
   - Format: Layered Homework (Foundation, Improvement, Challenge).

# Output Format
**STRICTLY RETURN PURE JSON ONLY**. NO Markdown formatting.

# JSON Data Structure
{
  "title_zh": "...",
  "title_en": "...",
  "grade": "{grade}",
  "duration": {duration},
  "teachingMethod": "{method}",
  "teachingPreparation": {
    "objectives_zh": ["..."],
    "objectives_en": ["..."],
    "keyWords_zh": ["..."],
    "keyWords_en": ["..."],
    "sentenceStructures_zh": ["..."],
    "sentenceStructures_en": ["..."],
    "teachingAids_zh": "...",
    "teachingAids_en": "...",
    "studentAnalysis_zh": "...",
    "studentAnalysis_en": "...",
    "audienceAnalysis": [
      {
        "type": "visual",
        "description": "...",
        "ageRange": "...",
        "proficiency": "...",
        "learningStyle": "..."
      }
    ]
  },
  "procedures": [
    {
      "title_zh": "步骤1：... (5分钟)",
      "title_en": "Step 1: ... (5 min)",
      "content_zh": "**教师行为**：...\\n\\n**教师话术**：...\\n\\n**学生反应**：...\\n\\n**设计意图**：...",
      "content_en": "**Teacher's Actions**: ...\\n\\n**Teacher's Talk**: ...\\n\\n**Students' Responses**: ...\\n\\n**Design Rationale**: ...",
      "duration": 5
    }
  ]
}
```

## 版本记录

- v1.0 - 基础英语教案指令
- v1.1 - 更新为与项目提示词构建器一致的结构
- v1.2 - 补充audienceAnalysis字段、时长计算规则、内容连贯性要求
