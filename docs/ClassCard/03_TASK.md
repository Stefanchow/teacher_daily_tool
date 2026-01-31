# Phase 3: Atomize - Technical Implementation Plan

> **Phase Goal**: 将系统设计转化为可执行的原子级开发任务，构建高内聚、低耦合的核心模块。  
> **Status**: Planning  
> **Start Date**: 2025-12-31

---

## 1. 交付标准与规范 (General Standards)

所有子任务必须严格遵循以下交付标准：

*   **代码规范**: 
    *   通过 ESLint (TS/JS) 或 flutter_lints (Dart) 校验。
    *   代码格式化遵循 Prettier (TS/JS) 或 dart format (Dart) 标准。
*   **测试覆盖**: 
    *   核心逻辑单元测试覆盖率 (Unit Test Coverage) ≥ 80%。
    *   提供关键路径的集成测试用例。
*   **文档与演示**: 
    *   每个模块需包含 README.md 说明技术实现路径。
    *   产出物需包含可独立运行的 Demo 示例 (Widgetbook 或 Storybook)。

---

## 2. 原子任务拆解 (Atomic Task Breakdown)

### 【Task 1: 核心 UI 框架】(Core UI Framework)

**目标**: 构建 ClassCard 的基础视觉组件与布局系统，确保多端适配与风格统一。

#### 1.1 输入需求 (Inputs)
*   `02_DESIGN.md` 中的布局设计规范。
*   **配色系统**: 各学段莫兰迪色值参数表 (Morandi Color Palette)。
*   **响应式规则**: 定义 Mobile / Tablet / Desktop 的断点 (Breakpoints)。

#### 1.2 预期产出 (Deliverables)
1.  **ClassCard 组件架构**: 封装 `ClassCard` 容器组件，支持插槽式内容注入。
2.  **自适应布局系统**: 实现 `ResponsiveLayoutBuilder`，根据屏幕宽度自动切换布局策略。
3.  **主题配置模块**: `AppTheme` 单例，支持动态切换配色方案 (Primary/Secondary/Accent Colors)。

#### 1.3 技术实现路径 (Technical Implementation Path)
1.  **Theme System**:
    *   定义 `AppColors` 类，通过 `Map<GradeLevel, ColorScheme>` 管理不同学段配色。
    *   利用 Flutter `ThemeExtension` 扩展自定义颜色属性。
2.  **Layout Engine**:
    *   使用 `LayoutBuilder` 获取约束。
    *   定义断点常量: `kMobileBreakpoint = 600`, `kTabletBreakpoint = 1200`.
    *   实现 Grid 系统：移动端 1 列，平板 2 列，桌面 3+ 列。
3.  **Component Encapsulation**:
    *   `BaseCard`: 统一的圆角、阴影、Padding 封装。
    *   `CardHeader`: 包含 Tag、Title、Duration 的标准头。

#### 1.4 测试用例 (Test Cases)
*   [ ] **TC-UI-01**: 在 375px (iPhone), 800px (iPad), 1440px (Desktop) 宽度下，验证 Grid 列数是否分别为 1, 2, 3。
*   [ ] **TC-UI-02**: 切换学段（小学->高中），验证 `CardHeader` 背景色是否正确变更且符合莫兰迪色系。
*   [ ] **TC-UI-03**: 构建 Release 包，检查组件库 tree-shaking 后体积增量 ≤ 15KB。

---

### 【Task 2: TimeEngine 核心算法库】(TimeEngine Core Algo)

**目标**: 实现高精度的教案时间调度算法，支持缩放与自动平衡。

#### 2.1 输入需求 (Inputs)
*   **算法核心**: 时间比例缩放算法白皮书 (基于 Ratio 的计算逻辑)。
*   **参数配置**: 负载平衡阈值 (Rebalance Thresholds)。
*   **类型规范**: TypeScript/Dart 类型定义规范 (Type Definitions)。

#### 2.2 预期产出 (Deliverables)
1.  **缩放算法**: `scaleTimeline(factor)` 函数，支持 `scaleRatio` ∈ [0.1, 5.0]。
2.  **自动平衡调度器**: `rebalance(stageId, delta)`，在保持总时长不变的前提下调整相邻环节。
3.  **性能报告**: 算法复杂度分析与基准测试报告。

#### 2.3 技术实现路径 (Technical Implementation Path)
1.  **Data Structure**:
    *   定义 `TimelineNode` 结构：包含 `baseDuration`, `weight`, `minDuration`, `maxDuration`。
2.  **Scaling Logic**:
    *   `currentDuration = baseDuration * scaleRatio`。
    *   实现 `clamp` 逻辑，确保缩放后不低于 `minDuration`。
3.  **Rebalancing Strategy**:
    *   **Chain of Responsibility**: 尝试调整 `NextNode` -> 尝试调整 `PrevNode` -> 全局加权分摊。
    *   **Transaction**: 所有的调整操作需具备原子性，失败则回滚。

#### 2.4 测试用例 (Test Cases)
*   [ ] **TC-TE-01**: 输入 `scaleRatio = 0.1` 和 `5.0`，验证计算结果是否未抛出异常且所有环节时长 ≥ 最小阈值。
*   [ ] **TC-TE-02**: 模拟用户以 50ms 间隔连续拖拽滑块（1000次/分钟），验证 UI 帧率无明显掉帧 (Jank Free)。
*   [ ] **TC-TE-03**: 执行 Heapdump 分析，对比 1000 次重计算前后的内存快照，确认无对象泄漏。

---

### 【Task 3: AI 解析模组集成】(AI Integration Module)

**目标**: 集成 LLM 能力，将非结构化文本精准转化为结构化教学数据。

#### 3.1 输入需求 (Inputs)
*   **API**: Gemini 3 API 文档与 Key 管理策略。
*   **Schema**: Mermaid Mindmap 语法规范 v9.2。
*   **验收标准**: 核心实体提取准确率 ≥ 98%。

#### 3.2 预期产出 (Deliverables)
1.  **API 鉴权模块**: 安全的 API Key 轮询与注入机制。
2.  **Syntax Converter**: `TextToMermaidConverter`，包含容错处理。
3.  **质量评估报告**: 针对测试集的准确率与响应时间统计。

#### 3.3 技术实现路径 (Technical Implementation Path)
1.  **Prompt Chain**:
    *   设计 `SystemPrompt` 强制输出 JSON 格式。
    *   包含 `Few-Shot` 示例，演示如何处理长难句。
2.  **Parser Logic**:
    *   **Regex Pre-processing**: 清洗 Markdown 代码块标记。
    *   **JSON Validation**: 使用 `try-catch` 解析，失败时触发 `RepairPrompt` 进行自动修复。
3.  **Mermaid Generation**:
    *   构建 `MindmapBuilder` 类，通过递归遍历 JSON 树生成 Mermaid 字符串。
    *   校验生成的 Mermaid 语法是否包含非法字符（如括号需转义）。

#### 3.4 测试用例 (Test Cases)
*   [ ] **TC-AI-01**: 输入包含 50+ 节点的复杂课文，验证生成的 Mermaid 字符串在渲染引擎中无报错。
*   [ ] **TC-AI-02**: 模拟 API 返回截断或格式错误的 JSON，验证系统能否触发重试或降级处理。
*   [ ] **TC-AI-03**: 模拟 QPS = 50 的并发请求，验证 API 鉴权模块的限流处理 (Rate Limiting) 是否生效。

---
