# ClassCard Project Progress Report (Phase 1 & Phase 2)

> **Report Date**: 2025-12-31  
> **Reporter**: Trae AI Architect  
> **Status**: **Phase 2 Complete / Ready for Phase 3**

---

## 1. 核心逻辑结构化分析 (Core Logic Structural Analysis)

### 1.1 教学法引擎 (Pedagogical Engine)
该模块是系统的理论基石，负责定义和校验教学流程的规范性。

*   **双模驱动策略**：
    *   **PWP Mode** (Reading/Listening): 采用三段式结构 (Pre-While-Post)，侧重技能习得 (Skill Acquisition)。
    *   **PPP Mode** (Grammar/Vocabulary): 采用演绎式结构 (Presentation-Practice-Production)，侧重知识内化 (Knowledge Internalization)。
*   **标准化约束**：
    *   严格界定各阶段的活动类型（如 Pre 阶段必须包含 Schema Activation）。
    *   支持 CLIL (Content and Language Integrated Learning) 原则，强调内容与语言的双重目标。

### 1.2 时间引擎 (TimeEngine)
负责将抽象的教学法转化为具体的时间轴，是连接理论与实践的桥梁。

*   **动态比例算法 (Dynamic Ratio Algorithm)**：
    *   放弃固定时长，采用权重比例 (Weights) 进行计算，适配 30/45 分钟等不同总时长。
    *   PWP 基准比例：3:4:2 (Pre:While:Post)。
    *   PPP 基准比例：3:4:2 (Pres:Prac:Prod)。
*   **弹性调度机制 (Elastic Scheduling)**：
    *   支持用户微调 (Micro-adjustment)，限制幅度为 ±2 分钟。
    *   **自动平衡 (Rebalancing)**：引入补偿逻辑，确保总时长恒定 (Constant Duration)，优先从相邻长环节借调时间。

### 1.3 AI 解析流 (AI Analysis Pipeline)
利用 LLM 能力将非结构化课文转化为结构化教学数据。

*   **MindmapProcessor**：
    *   基于 Gemini 3 Pro 接口。
    *   执行 **ETL 流程**：Extract (词汇/长难句) -> Transform (Mermaid 语法树) -> Load (JSON Schema)。
*   **Prompt Engineering**：
    *   采用 Role-Playing (ESL Expert) + Chain-of-Thought 策略。
    *   输出 Bloom 分类法 (L3-L5) 的分级测试题。

---

## 2. 进度简报 (Progress Brief)

| 已达成设计决策 (Achieved Decisions) | 待解决技术难点 (Technical Challenges) |
| :--- | :--- |
| **教学法引擎基础框架**<br>- 决策依据：01_ALIGN.md 明确了 PWP/PPP 双模式。<br>- 负责人：System Architect<br>- 完成度：100% | **动态难度调节算法优化**<br>- 难点：如何根据学生反馈实时调整后续环节难度。<br>- 影响：自适应学习体验。<br>- 状态：调研中 |
| **时间切片机制 (Time Slicing)**<br>- 决策依据：采用 Duration Split 记录子活动时长。<br>- 负责人：Backend Lead<br>- 完成度：100% | **实时性保障方案**<br>- 难点：Gemini 长文本解析延迟可能 >15s。<br>- 影响：用户等待体验。<br>- 状态：需引入流式传输 (Streaming) |
| **AI 解析接口规范**<br>- 决策依据：定义了统一的 JSON Schema。<br>- 负责人：AI Engineer<br>- 完成度：95% | **多模态处理扩展**<br>- 难点：未来需支持图片/音频输入的解析。<br>- 影响：功能可扩展性。<br>- 状态：列入 Phase 3 预研 |
| **Mermaid 可视化方案**<br>- 决策依据：轻量级、Markdown 友好。<br>- 负责人：Frontend Lead<br>- 完成度：100% | **知识图谱构建方案**<br>- 难点：跨课时的知识点关联与复现。<br>- 影响：长期学习效果追踪。<br>- 状态：概念验证阶段 |

---

## 3. 文档导航 (Documentation Navigation)

> **Note**: 请参考根目录下的文档索引。

*   **[01_ALIGN.md](./01_ALIGN.md)** `Verified`
    *   *摘要*：定义了项目的核心业务需求、教学法规范及 MVP 功能边界。
    *   *Tags*: `#Requirements` `#Pedagogy` `#PWP/PPP`
*   **[02_DESIGN.md](./02_DESIGN.md)** `Draft`
    *   *摘要*：详述了系统架构、TimeEngine 算法逻辑、数据结构及 AI 模块设计。
    *   *Tags*: `#Architecture` `#TimeEngine` `#AI-Pipeline` `#Mermaid`
*   **[PROGRESS_REPORT.md](./PROGRESS_REPORT.md)** `Current`
    *   *摘要*：Phase 1 & 2 阶段的总结报告及技术难点盘点。
    *   *Tags*: `#Status` `#Risks`
*   **[NEXT_PHASE.md](./NEXT_PHASE.md)** `Planned`
    *   *摘要*：Phase 3 (Atomize) 的技术规划与预研清单。
    *   *Tags*: `#Roadmap` `#Microservices`

---
