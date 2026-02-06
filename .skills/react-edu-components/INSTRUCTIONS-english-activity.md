# 英语学科 - 教学活动生成指令

## 概述

本指令定义了英语学科课堂活动（Classroom Activity）的设计规则，严格遵循项目中的提示词构建器规范。

## 活动设计原则

### 1. 核心设计准则

#### 以学生为中心
- `procedures` 内容必须描述**学生具体的活动**（游戏、互动、小组合作）
- **不是**教师的讲授步骤或通用教学流程
- **拒绝单纯做题与讲授**：严禁设计仅需填空的练习题、单纯的问答或教师的单向讲解

#### 高质量活动设计
- **严禁低幼、无脑的游戏**
- 即便是经典老游戏（如 Simon Says, Bingo），也必须经过精心改良
- 加入独特的规则变体、认知挑战或特定的语言聚焦
- 拒绝通用的描述，每个活动必须有清晰的机制、规则和明确的学习产出

### 2. 年级适配性

| 年级段 | 侧重点 | 活动示例 |
|-------|-------|---------|
| **低年级 (1-3年级)** | 肢体反应(TPR)、韵律口诀、简单竞赛、色彩丰富的道具互动 | Simon Says, Flashcard Games, Action Songs |
| **高年级 (4-6年级)** | 逻辑推理、团队策略、信息差(Info Gap)、稍微复杂的角色扮演 | Mystery Box, Information Gap, Role-play |
| **初高中/成人** | 批判性思维、辩论、真实场景模拟、社交互动 | Debate, Project, Presentation |

### 3. 活动数量与分布规则

#### 数量规则
- 如果用户请求的活动总数**小于 6 个**（或未指定），请**恰好生成 6 个**活动
- 如果用户请求的总数**大于 6 个**，请按用户要求的数量生成

#### 分布规则（默认6个活动）
| 类型 | 数量 | 说明 |
|------|------|------|
| 单词活动 | 2个 | 词汇认读、记忆、运用 |
| 句子活动 | 2个 | 句型操练、应用 |
| 语法活动 | 1个 | 语法点专项练习 |
| 产出型活动 | 1个 | 综合运用、真实交际 |

**超出6个时的分配规则**：
- 首先必须满足基础分布（词汇/句型/语法/产出）
- 对于**超出的活动**，必须智能分配，确保练习的平衡性
- 例如：增加产出/游戏环节，或巩固难点句型
- **严禁简单重复同类型活动**

### 4. 内容自动补充规则

- 如果用户提供的识别项目（词汇、句型、语法）为空或不足以支撑活动设计，**必须自动补充**与主题相关的合适语言素材
- 所有活动必须与这些（提供的或生成的）语言素材**紧密挂钩**

## 输出数据结构

### 基本信息字段
```typescript
interface ActivityPlan {
  grade: string;           // 如："Grade 3"
  duration: number;        // 总时长（分钟）
  teachingMethod: string;  // 教学法
  
  teachingPreparation: {
    objectives: string;        // 学习目标（知识、能力、情感）
    studentAnalysis: string;   // 学情分析（认知水平与兴趣）
    teachingAids: string;      // 教具列表（优先使用实物）
    keyWords: string[];        // 词汇数组（必须映射用户提供的词汇）
    sentenceStructures: string[]; // 句型数组（必须映射用户提供的句型）
    grammarPoints: string[];   // 语法点数组
  };
  
  procedures: ActivityStep[];  // 活动数组（6个或更多）
}
```

### 活动步骤字段
```typescript
interface ActivityStep {
  title_zh: string;    // 中文标题，如："活动1：单词炸弹"
  title_en: string;    // 英文标题，如："Activity 1: Word Bomb"
  duration: number;    // 时长（分钟）
  content_zh: string;  // 中文内容（游戏规则和互动流程）
  content_en: string;  // 英文内容（游戏规则和互动流程）
}
```

### content字段内容要求
- `content_zh` 和 `content_en` **必须描述游戏规则和互动流程**
- 不是教学步骤或教师讲解
- 必须包含：
  - 游戏机制说明
  - 参与方式
  - 规则细节
  - 互动流程
  - 胜负判定（如适用）

## 活动类型与示例

### 1. 词汇活动 (2个)

#### 示例1：Word Bomb (单词炸弹)
```typescript
{
  title_zh: "活动1：单词炸弹 (5分钟)",
  title_en: "Activity 1: Word Bomb (5 min)",
  duration: 5,
  content_zh: "**游戏规则**：教师准备一组单词卡片，其中混入几张'炸弹'卡。学生依次抽卡并读出单词。抽到炸弹卡时要快速说'Bomb!'并做躲避动作，反应慢者出局。最后剩下3名胜者。\\n\\n**互动流程**：1) 分组围坐 2) 轮流抽卡 3) 快速反应 4) 积分奖励",
  content_en: "**Game Rules**: Prepare word cards with some 'bomb' cards mixed in. Students draw cards and read aloud. When drawing a bomb, quickly say 'Bomb!' and dodge. Slow responders are out. Last 3 win.\\n\\n**Flow**: 1) Circle up 2) Draw cards 3) Quick response 4) Point rewards"
}
```

#### 示例2：What's Missing? (什么不见了)
```typescript
{
  title_zh: "活动2：记忆大挑战 (4分钟)",
  title_en: "Activity 2: Memory Challenge (4 min)",
  duration: 4,
  content_zh: "**游戏规则**：展示5-6张单词卡片，给学生10秒记忆。学生闭眼，教师藏起一张。睁眼后学生抢答'What's missing?'，答对得1分。\\n\\n**变式**：可增加难度，一次藏起两张，或打乱顺序让学生复原。",
  content_en: "**Game Rules**: Show 5-6 word cards for 10 seconds. Students close eyes, teacher hides one. Students race to answer 'What's missing?' Correct answer = 1 point.\\n\\n**Variations**: Hide two cards, or scramble order for restoration."
}
```

### 2. 句子活动 (2个)

#### 示例3：Sentence Chain (句子接龙)
```typescript
{
  title_zh: "活动3：句子接龙赛 (6分钟)",
  title_en: "Activity 3: Sentence Chain (6 min)",
  duration: 6,
  content_zh: "**游戏规则**：使用目标句型进行接龙。学生A说前半句，学生B完成后半句并开启新句，学生C继续。不能接龙或语法错误者出局。\\n\\n**示例**：A: I like apples. B: I like apples and bananas. I go to... C: I go to school by bus. I can...",
  content_en: "**Game Rules**: Chain sentences using target patterns. Student A starts, B completes and starts new, C continues. Cannot chain or grammar error = out.\\n\\n**Example**: A: I like apples. B: I like apples and bananas. I go to... C: I go to school by bus. I can..."
}
```

#### 示例4：Find Someone Who... (寻找有缘人)
```typescript
{
  title_zh: "活动4：班级小调查 (5分钟)",
  title_en: "Activity 4: Class Survey (5 min)",
  duration: 5,
  content_zh: "**游戏规则**：每位学生获得一张调查表，包含5-6个问题（如'Find someone who likes pizza'）。学生必须用'Do you like...?'询问同学，找到符合条件者在对应格签名。最先完成者获胜。\\n\\n**限制**：不能重复询问同一人，必须用完整句型提问。",
  content_en: "**Game Rules**: Each student gets a survey sheet with 5-6 items. Must ask classmates using 'Do you like...?' Find matches and get signatures. First to complete wins.\\n\\n**Constraints**: Cannot ask same person twice. Must use complete sentences."
}
```

### 3. 语法活动 (1个)

#### 示例5：Grammar Mafia (语法狼人杀)
```typescript
{
  title_zh: "活动5：语法侦探团 (7分钟)",
  title_en: "Activity 5: Grammar Detectives (7 min)",
  duration: 7,
  content_zh: "**游戏规则**：教师准备若干句子卡片，部分包含语法错误（'卧底'）。学生轮流抽卡朗读，其他学生判断对错。找出所有'卧底'并正确改正者获胜。\\n\\n**进阶**：可加入'侦探'角色，拥有质疑和检查权。",
  content_en: "**Game Rules**: Sentence cards with some grammar errors ('imposters'). Students draw and read aloud. Others judge correct/incorrect. Find all imposters and fix them to win.\\n\\n**Advanced**: Add 'detective' role with challenge power."
}
```

### 4. 产出型活动 (1个)

#### 示例6：Role-play Challenge (角色扮演挑战)
```typescript
{
  title_zh: "活动6：情境演绎秀 (8分钟)",
  title_en: "Activity 6: Situational Role-play (8 min)",
  duration: 8,
  content_zh: "**游戏规则**：设置真实情境（如餐厅点餐），学生分组抽取角色卡（顾客/服务员）。准备2分钟后进行2分钟即兴表演。其他学生作为评委从语言准确性、流利度、创意三个维度打分。\\n\\n**评分标准**：语言准确(40%) + 流利自然(30%) + 创意表现(30%)",
  content_en: "**Game Rules**: Real scenario (e.g., restaurant). Groups draw roles (customer/waiter). 2 min prep, 2 min improv performance. Others judge on accuracy(40%), fluency(30%), creativity(30%)."
}
```

## 创意改良原则

即使是经典游戏，也必须加入独特变体：

| 经典游戏 | 传统玩法 | 创意改良 |
|---------|---------|---------|
| Simon Says | 听指令做动作 | 加入'Reverse Simon'反向指令模式 |
| Bingo | 连线获胜 | 改为'Blackout Bingo'填满获胜，或'Pattern Bingo'特定图案 |
| Hot Potato | 传球问答 | 加入'Double Trouble'双球模式增加难度 |
| Memory Game | 配对翻牌 | 改为'Story Memory'按顺序翻牌讲故事 |

## 输出格式示例

```json
{
  "grade": "Grade 3",
  "duration": 35,
  "teachingMethod": "task-based",
  "teachingPreparation": {
    "objectives": "知识：掌握家庭成员词汇；能力：能用This is my...介绍家人；情感：增强家庭归属感",
    "studentAnalysis": "三年级学生已具备基础英语词汇，对游戏化学习感兴趣，注意力集中时间约15-20分钟",
    "teachingAids": "单词卡片、家庭照片、PPT、计时器",
    "keyWords": ["father", "mother", "brother", "sister", "grandpa", "grandma"],
    "sentenceStructures": ["This is my...", "He/She is..."],
    "grammarPoints": ["Possessive adjectives (my)"]
  },
  "procedures": [
    {
      "title_zh": "活动1：单词炸弹 (5分钟)",
      "title_en": "Activity 1: Word Bomb (5 min)",
      "duration": 5,
      "content_zh": "**游戏规则**：...",
      "content_en": "**Game Rules**: ..."
    }
    // ... 共6个活动
  ]
}
```

## 生成提示词模板

```markdown
# 用户活动需求
{用户输入的活动要求}

# 已识别项目
词汇：
{words}

句型：
{sentences}

语法：
{grammar}

# 内容自动补充规则
- 如果上述"已识别项目"为空或不足，必须自动补充与主题相关的语言素材
- 所有活动必须与这些（提供的或生成的）语言素材紧密挂钩

# 活动设计原则
- **以学生为中心**：procedures内容必须描述学生具体的活动（游戏、互动、小组合作）
- **拒绝单纯做题与讲授**：严禁填空练习、单纯问答或单向讲解
- **高质量活动设计**：即便是经典游戏也必须加入独特变体、认知挑战或语言聚焦
- **年级适配性**：
  - **当前年级：{grade}**
  - 低年级：侧重TPR、韵律、简单竞赛
  - 高年级：侧重逻辑推理、团队策略、信息差
  - 初高中：侧重批判性思维、辩论、真实场景

# 任务逻辑
1. 分析用户对活动数量的需求
2. **数量规则**：
   - 小于6个（或未指定）：恰好生成6个活动
   - 大于6个：按用户要求的数量生成
3. **分布规则**：
   - 默认6个：2词汇 + 2句子 + 1语法 + 1产出
   - 超出6个：智能分配，确保平衡，严禁重复

# 输出要求
返回一个单一JSON对象：
- grade: "{grade}", duration: {duration}, teachingMethod: "{mode}"
- teachingPreparation: 包含objectives, studentAnalysis, teachingAids, keyWords, sentenceStructures, grammarPoints
  - **映射规则**：必须将用户提供的"词汇"和"句型"完整映射到keyWords和sentenceStructures
- procedures: 活动数组
  - 每个活动必须包含：title_zh, title_en, duration
  - content_zh和content_en必须描述游戏规则和互动流程
```

## 版本记录

- v1.0 - 基础英语活动指令
- v1.1 - 更新为与项目提示词构建器一致的结构（数量规则、分布规则、内容要求、映射规则等）
