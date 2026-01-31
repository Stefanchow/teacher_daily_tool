# Phase 3 Planning: Atomize & Scale

> **Status**: Planning  
> **Target Phase**: Phase 3 (Atomize)  
> **Focus**: Microservices, Componentization, Cross-Platform

---

## 1. 重点方向预研 (Key Research Areas)

### 1.1 微服务化改造方案 (Microservices Transformation)
随着系统功能的增加，单体架构将难以维护。Phase 3 将探索核心模块的微服务化。

*   **Service Mesh**: 考虑引入轻量级 Service Mesh (如 Linkerd) 管理服务间通信。
*   **拆分目标**:
    *   `Pedagogy Service`: 纯粹的教学法规则引擎。
    *   `Time Service`: 独立的时间计算与调度服务。
    *   `AI Gateway`: 统一管理 LLM 调用、Token 计费与缓存。

### 1.2 组件原子级拆分策略 (Atomic Component Strategy)
前端 UI 需要高度复用，以支持“积木式”教案搭建。

*   **Atomic Design**: 遵循 Atoms -> Molecules -> Organisms 的设计原则。
*   **Card UI**: 将每个教学活动封装为独立的 `ActivityCard` 组件，支持拖拽排序。
*   **Schema-Driven UI**: 组件渲染完全由 JSON Schema 驱动，实现后端控制前端布局。

### 1.3 跨平台适配路线图 (Cross-Platform Roadmap)
*   **Flutter Core**: 继续利用 Flutter 的跨平台优势，确保核心业务逻辑 (Dart Packages) 多端共享。
*   **Adaptive Layout**: 针对 Desktop (侧重编辑) 和 Tablet (侧重授课) 设计两套适配布局。

---

## 2. 技术预研清单 (Technical Research List)

### 2.1 微课时内容封装标准 (Micro-Lesson Encapsulation)
*   **目标**：定义一种标准格式，用于存储和交换 5-10 分钟的微课时数据。
*   **方案**：基于 IMS Global 标准进行简化，设计 `.mcl` (Micro Class Lesson) 文件格式 (Zip 压缩包，含 JSON + 资源文件)。

### 2.2 知识图谱构建方案 (Knowledge Graph Construction)
*   **目标**：追踪学生在不同课时中遇到的知识点 (Vocabulary/Grammar)，形成个人知识图谱。
*   **方案**：
    *   使用 Graph Database (如 Neo4j) 存储知识点关系。
    *   定义 `KnowledgeNode`：包含 ID、类型、难度、前置节点等属性。

### 2.3 边缘计算部署可行性 (Edge Computing Feasibility)
*   **目标**：在网络不稳定的教室环境中，保障核心教案功能的可用性。
*   **方案**：
    *   **Local-First Architecture**: 优先本地存储 (SQLite/Isar)，后台静默同步。
    *   **On-Device AI**: 探索使用小参数量模型 (如 Gemma 2B/Llama 3 8B) 在本地设备运行基础的文本处理任务。

---

## 3. 下一步行动 (Next Actions)

1.  **原型验证 (PoC)**: 搭建 `TimeEngine` 的独立微服务原型。
2.  **组件库搭建**: 启动 Flutter 原子组件库的开发。
3.  **数据标准草案**: 起草 `.mcl` 文件格式规范 v0.1。
