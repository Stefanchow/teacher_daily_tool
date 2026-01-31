# 业务逻辑与 AI 服务实现文档 (Implementation Documentation)

> **文档状态**：【已实现】
> **版本**：v1.0.0
> **创建日期**：2025-12-31
> **关联任务**：AI 大脑基础搭建、真实教学逻辑集成、业务逻辑联调

---

## 1. AI 服务层 (AI Service Layer)

位置：`src/services/geminiService.ts`

### 1.1 核心功能
实现了基于 Gemini 3 Pro 的教案生成服务，具备以下特性：
- **API 封装**：统一封装 `generateLessonPlan` 方法，屏蔽底层 API 细节。
- **Mock 模式**：通过环境变量 `VITE_USE_MOCK=true` 开启模拟模式，返回预设的高质量 JSON 数据。
- **智能重试**：实现了指数退避（Exponential Backoff）重试机制，最大重试 3 次，提高网络不稳时的成功率。
- **Prompt 管理**：使用 EJS 模板引擎管理 System Prompt (`src/templates/system_prompt.ejs`)，定义了 ESL 专家的角色和输出约束。

### 1.2 数据校验
实现了严格的运行时数据校验：
- 检查 JSON 格式的有效性。
- 验证 `title` (string), `duration` (number), `activities` (array) 等必须字段。
- 自动修正或拒绝不符合规范的数据。

---

## 2. 数据映射层 (Data Mapping Layer)

位置：`src/utils/lessonMapper.ts`

为了隔离 AI 返回的数据结构与 UI 组件的 Props 结构，引入了映射层。

### 2.1 映射逻辑
- **输入**：`LessonPlan` (AI 服务返回的原始数据)
- **输出**：`CardData` (适配 `BaseCard` 组件的数据结构)
- **转换规则**：
  - 提取 `title` 和 `duration`。
  - 格式化 `activities` 列表，保留 `name`, `duration`, `description`, `materials`。
  - 提供默认值处理，防止 `null` 或 `undefined` 导致崩溃。

### 2.2 类型安全
利用 TypeScript 接口定义 (`LessonPlan`, `Activity`, `CardData`) 确保编译期和运行时的类型安全。

---

## 3. UI 业务组件 (UI Integration)

### 3.1 业务卡片 (`src/components/business/LessonPlanCard.tsx`)
- 基于核心组件 `BaseCard` 封装。
- 负责渲染具体的教案内容，包括活动列表的样式化（序号、高亮、元数据展示）。

### 3.2 首页集成 (`src/App.tsx`)
- **状态管理**：使用 React `useState` 跟踪 `isLoading`, `error`, `lessonPlan` 状态。
- **交互流程**：
  1. 用户输入 Topic。
  2. 点击 "Generate Plan"。
  3. UI 进入 Loading 状态（按钮禁用，文案变更）。
  4. 调用 `geminiService`。
  5. 成功：展示 `LessonPlanCard`。
  6. 失败：展示红色错误提示框，包含错误信息和重试建议。

---

## 4. 测试策略 (Testing Strategy)

### 4.1 单元测试 (`src/utils/lessonMapper.test.ts`)
- 验证正常数据的映射准确性。
- 验证缺失字段时的错误抛出行为。
- 验证空数据的边界处理。

### 4.2 集成测试 (`src/App.test.tsx`)
- 验证 App 组件的完整生命周期：
  - 初始渲染。
  - 输入交互。
  - 生成按钮的启用/禁用逻辑。
  - Mock API 调用的成功与失败场景。
  - 错误信息的正确显示。
