# 系统核心架构设计文档 (System Core Architecture Design)

> **文档状态**：【草稿】  
> **版本**：v1.0.0  
> **创建日期**：2025-12-31  
> **依据**：[01_ALIGN.md](./01_ALIGN.md)

---

## 1. 架构概述 (Architecture Overview)

本阶段设计基于已确认的 `01_ALIGN.md` 需求对齐文档，旨在构建一个高效、灵活的自动化教案生成系统。

### 1.1 设计目标
核心目标是实现一个 **TimeEngine (时间引擎)**，该引擎能够根据用户输入的 **教学总时长** (30min / 45min) 和 **教学模式** (PWP / PPP)，动态生成符合教学法规范的时间分配方案，并支持智能微调。

### 1.2 核心功能范围
1.  **动态时长计算**：基于预设比例，自动计算各教学环节的基准时长。
2.  **模式适配**：严格遵循 PWP (Reading/Listening) 和 PPP (Grammar/Vocabulary) 的结构规范。
3.  **智能微调**：允许用户在约束范围内 (±2分钟) 调整环节时长，系统自动进行总时长平衡 (Rebalancing)。

---

## 2. TimeEngine 算法设计 (Algorithm Design)

TimeEngine 是本系统的核心组件，负责处理所有与时间分配相关的逻辑。

### 2.1 输入参数 (Inputs)
- `totalDuration` (int): 教学总时长，枚举值 `30` 或 `45`。
- `mode` (enum): 教学模式，枚举值 `PWP` 或 `PPP`。
- `ratios` (object): 各环节比例参数，引用自 `01_ALIGN.md` 的规范。

### 2.2 核心逻辑 (Core Logic)

#### 2.2.1 基准时长计算
系统首先根据总时长和各阶段的权重，计算出初始的基准时长。

**伪代码 (Pseudocode):**
```python
function calculateBaseline(totalDuration, mode):
    # 定义各模式的标准比例 (基于 45 分钟标准课)
    # PWP: Pre(15m) : While(20m) : Post(10m) -> 3:4:2
    # PPP: Pres(15m) : Prac(20m) : Prod(10m) -> 3:4:2
    
    ratios = getRatios(mode) 
    allocation = {}
    
    remainingTime = totalDuration
    
    for stage in ratios:
        # 向下取整，确保整数分钟
        time = floor(totalDuration * ratios[stage])
        allocation[stage] = time
        remainingTime -= time
        
    # 将剩余的余数时间分配给权重最大的环节 (通常是 While/Practice)
    allocation[getMaxWeightStage(mode)] += remainingTime
    
    return allocation
```

#### 2.2.2 时长微调与自动平衡 (Adjustment & Rebalancing)
当用户手动调整某个环节的时长时，系统必须保证总时长不变。

**策略**：
1.  **约束检查**：调整幅度限制在 ±2 分钟内，且环节最少时长不能低于 3 分钟。
2.  **自动补偿**：
    - 优先从**相邻且时长较长**的环节进行反向调整。
    - 如果相邻环节空间不足，则按比例从其他所有环节扣除/增加。

**伪代码 (Pseudocode):**
```python
function adjustStageTime(currentAllocation, targetStage, delta):
    # delta 为正表示增加时长，为负表示减少
    
    if abs(delta) > 2:
        throw Error("Adjustment exceeds ±2 minutes limit")
        
    newTime = currentAllocation[targetStage] + delta
    if newTime < 3:
        throw Error("Stage duration cannot be less than 3 minutes")
        
    # 寻找补偿环节 (简化逻辑：找最长的其他环节)
    donorStage = findStageWithMaxDuration(currentAllocation, exclude=[targetStage])
    
    # 检查补偿环节是否有足够空间
    if currentAllocation[donorStage] - delta < 3:
        throw Error("Cannot rebalance: donor stage too short")
        
    # 执行调整
    currentAllocation[targetStage] += delta
    currentAllocation[donorStage] -= delta
    
    return currentAllocation
```

### 2.3 输出 (Output)
TimeEngine 最终输出一个包含精确分钟数的时间分配对象。

```json
{
  "mode": "PWP",
  "total_duration": 45,
  "allocation": {
    "Pre": 15,
    "While": 20,
    "Post": 10
  }
}
```

---

## 3. 数据结构设计 (Data Structure Design)

为了支持前端渲染和 Markdown 生成，我们需要定义标准化的 JSON 数据模式。

### 3.1 教学环节模型 (Stage Model)

```json
{
  "stage_id": "string",       // 唯一标识，如 "pre_reading"
  "stage_name": "string",     // 显示名称，如 "Pre-Reading"
  "duration": "number",       // 分钟数
  "activities": [             // 该环节下的具体活动列表
    {
      "name": "string",       // 活动名称，如 "Brainstorming"
      "description": "string",// 具体活动描述
      "purpose": "string",    // 设计意图说明
      "interaction": "string" // 互动模式，如 "T-S", "S-S"
    }
  ]
}
```

### 3.2 完整教案对象 (Lesson Plan Object)

```json
{
  "meta": {
    "topic": "string",        // 教学主题
    "level": "string",        // 适用年级
    "duration": 45,           // 总时长
    "mode": "PWP"             // 教学模式
  },
  "timeline": [               // 有序的环节列表
    {
      "stage": "Pre-Stage",
      "duration": 15,
      "items": [
        {
          "activity": "激活背景知识",
          "content": "展示关于...的图片，引导学生讨论...",
          "duration_split": 5, // 子活动时长
          "purpose": "激发学生兴趣，建立图式"
        },
        // ... 其他活动
      ]
    },
    // ... While 和 Post 阶段
  ],
  "mindmap_data": {           // 用于生成思维导图的数据
     "root": "Topic",
     "children": [...]
  }
}
```

---

## 4. 系统流程图 (System Flowchart)

使用 Mermaid 语法描述从用户输入到教案生成的完整数据流向。

```mermaid
graph TD
    %% 定义样式
    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef process fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef output fill:#fff3e0,stroke:#ef6c00,stroke-width:2px;
    classDef user fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;

    %% 节点定义
    UserInput([用户输入层<br>时长/模式/主题]) --> Validator{参数校验}
    Validator -- 合法 --> TimeEngine
    Validator -- 非法 --> ErrorHandler[返回错误提示]
    
    subgraph CoreLayer [核心处理层 (TimeEngine)]
        TimeEngine[TimeEngine 算法]
        BaselineCalc[基准时长计算]
        ContentGen[AI 内容生成]
        
        TimeEngine --> BaselineCalc
        BaselineCalc --> ContentGen
    end
    
    ContentGen --> JSONOutput
    
    subgraph OutputLayer [数据输出层]
        JSONOutput[JSON 格式教案]
        MarkdownGen[Markdown 渲染]
        MindMapGen[Mermaid 导图生成]
        
        JSONOutput --> MarkdownGen
        JSONOutput --> MindMapGen
    end
    
    subgraph InteractionLayer [用户交互层 (微调)]
        UI_Review[预览界面]
        UI_Adjust[时长微调控件]
        Rebalancer[自动平衡逻辑]
        
        MarkdownGen --> UI_Review
        UI_Review --> UI_Adjust
        UI_Adjust --> Rebalancer
        Rebalancer -->|更新时长| JSONOutput
    end

    %% 样式应用
    class UserInput input;
    class TimeEngine,BaselineCalc,ContentGen,Rebalancer process;
    class JSONOutput,MarkdownGen,MindMapGen output;
    class UI_Review,UI_Adjust user;
```

---

## 5. AI 智能解析模块设计 (AI Analysis Module)

本模块负责深度解析教学素材（课文文本），利用 Gemini 3 的能力生成结构化数据，支撑思维导图构建和教学内容填充。

### 5.1 MindmapProcessor 模块
该模块是连接用户素材与系统生成的桥梁。

- **输入支持**：纯文本 (.txt) 或文档 (.docx) 格式的英语课文。
- **集成接口**：Gemini 3 Pro API。
- **核心流程**：
    1.  **词汇提取 (Vocabulary Extraction)**：
        - 自动识别 CEFR B2-C2 级别核心词汇。
        - 输出字段：词性 (POS)、英文释义 (Definition)、语境例句 (Example)。
    2.  **长难句分析 (Syntax Analysis)**：
        - 拆解复合句结构 (如定语从句、倒装句)。
        - 标注语法难点与修辞手法 (Metaphor, Simile etc.)。
    3.  **Mermaid 转换 (Mermaid Conversion)**：
        - 将非结构化文本转化为 Mermaid Mindmap 语法树。
        - **层级定义**：
            - `Root`: 课文标题
            - `Level 1`: 篇章结构 (Introduction / Body / Conclusion)
            - `Level 2`: 核心论点或情节转折点
            - `Leaf`: 支撑细节 (含关联的词汇和长难句)

### 5.2 Prompt 策略设计 (Prompt Engineering)

#### Reading Expert Prompt 模板
- **角色设定 (Persona)**: 
    > "You are an expert ESL curriculum designer with a background in cognitive psychology, specializing in CLIL (Content and Language Integrated Learning) methodologies."
- **输出要求 (Output Requirements)**:
    - **PWP 环节问题**：
        - `Pre-reading`: 预测题 (Prediction) - 激发兴趣。
        - `While-reading`: 细节题 (Detail) - 信息检索。
        - `Post-reading`: 引申题 (Inference/Critical Thinking) - 深度思考。
    - **理解检测题 (Quiz)**:
        - 5 道多项选择题。
        - 难度需覆盖 Bloom 分类法 L3 (应用) 至 L5 (评价) 级别。
- **约束条件 (Constraints)**:
    - 问题必须与思维导图的节点有明确的逻辑关联。
    - 遵循 CLIL 原则，兼顾内容理解与语言学习。

### 5.3 系统集成规范 (System Integration)

#### 输出数据结构 (Output Schema)
```json
{
  "mindmap": "mindmap\n  root((Title))\n    Introduction\n      Hook\n    Body\n      Point 1",
  "vocabulary": [
    {
      "word": "ubiquitous",
      "pos": "adj.",
      "definition": "present, appearing, or found everywhere.",
      "example": "His ubiquitous influence was felt by all the family."
    }
  ],
  "questions": {
    "pwp": {
      "pre": ["What do you think the title suggests about...?"],
      "while": ["Find three adjectives the author uses to describe..."],
      "post": ["How would the story change if...?"]
    },
    "quiz": [
      {
        "question": "...",
        "options": ["A", "B", "C", "D"],
        "answer": "B",
        "bloom_level": "L4"
      }
    ]
  }
}
```

#### API 对接
- **Endpoint**: `/api/v1/mindmap/process`
- **Method**: POST
- **Payload**: `{ "text": "...", "level": "B2" }`
- **SLA**: 响应时间 < 3s (流式传输首字节)

### 5.4 质量保证要求 (Quality Assurance)

- **准确率指标**：
    - 核心词汇提取准确率 ≥ 90% (人工抽检)。
    - 长难句分析正确率 ≥ 85%。
- **性能指标**：
    - 1000 词课文完整处理耗时 ≤ 15s。
- **兼容性**：
    - 支持与现有教案编辑器的版本控制系统 (Git-based) 无缝集成，确保 AI 生成内容的版本可追溯。

---

## 6. 设计决策与考量 (Design Decisions)

### 6.1 为什么选择基于比例的动态计算？
*   **决策**：不使用硬编码的固定分钟数，而是存储各环节的权重比例 (Ratio)。
*   **依据**：为了灵活支持 30min、40min、45min 等多种课时长度，比例算法具有更好的扩展性。

### 6.2 为什么限制微调范围为 ±2 分钟？
*   **决策**：用户单次调整幅度限制在 ±2 分钟。
*   **依据**：
    1.  **教学法规范**：过大的调整会破坏 PWP/PPP 的结构平衡（例如 Pre 阶段过长会导致练习时间不足）。
    2.  **算法稳定性**：小幅度调整更容易找到“补偿环节”，避免级联调整导致的时间崩塌。

### 6.3 数据结构为什么包含 `duration_split`？
*   **决策**：在 `items` 子活动层级也记录时长。
*   **依据**：为了生成精确的 Timeline 表格。虽然 `TimeEngine` 主要控制大环节 (Stage) 的时长，但最终展示需要细化到具体活动 (Activity)。

---
