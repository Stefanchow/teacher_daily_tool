# 教案卡片与收藏功能开发日志（阶段总结）

> 更新日期：2026-01-16  
> 模块范围：教案生成预览区、堆叠教案卡片区、收藏中心、移动端交互

---

## 一、时间顺序概览

- 阶段一：堆叠卡片展开行为与动画优化  
- 阶段二：标题重命名、预览区域展示方式优化  
- 阶段三：按钮去重、生成教案自动收缩堆叠  
- 阶段四：移动端左滑、收藏中心联动、长内容展示  
- 阶段五：类型系统与小问题修复

---

## 二、阶段一：堆叠卡片展开行为与动画优化

**目标：**
- 禁止“点击卡片置顶”行为，改为“就地展开”，保持按时间从新到旧的顺序不变。
- 展开/收起有平滑动画，不叠加多余遮罩层。
- 按学科（英语/数学/语文）分别堆叠，只在各自区域内展示。
- 修改尽量不影响其他功能，模块之间相互独立。

**主要实现：**
- 在 [App.tsx](file:///d:/Flutter%20Project%20Files/teacher_daily_tool/src/App.tsx) 中：
  - 为 `recentPlans` 的每条记录补充 `subject` 元信息，类型定义后续在阶段五统一补全。
  - 修改 `setRecentPlans` 的写入逻辑，在保存近期教案时同时写入当前 `subject`。
  - 渲染堆叠卡片时按 `currentSubject` 过滤，只展示当前学科的教案，避免不同学科之间穿插。
  - 将“展开内容”改为在原位置就地展开，不再改变卡片顺序或重新排序。
  - 为展开区域增加 `maxHeight` 过渡动画，实现平滑展开/收起效果。

**结果：**
- 任意卡片展开后，其位置保持不变，整体顺序始终为“最新在上，最旧在下”。
- 展开区域与对应卡片始终对齐，不再出现位置错乱。
- 不同学科的教案只在对应学科区块内堆叠展示。

---

## 三、阶段二：标题重命名与预览展示优化

**目标：**
- 恢复“点击卡片标题进行重命名”的能力，同时又不触发展开/收起。
- 替换展开区域的简陋文本展示，改为与顶部预览一致的专业排版。

**主要实现：**
- 在堆叠列表中：
  - 将标题结构调整为：`h3` 外层为 `group`，内部文字包裹在 `span` 中，点击 `span` 进入编辑状态。
  - 使用 `stopPropagation()` 阻止标题点击冒泡，避免触发卡片展开逻辑。
  - 输入框 `onBlur` / `Enter` 时提交新标题，并更新 `recentPlans`。
- 在展开区域：
  - 将原先简单的文本内容，改为直接复用 `LessonPlanCard` 组件，使展开内容与顶部预览区域视觉风格保持一致。
  - 对 `LessonPlanCard` 新增 `hideFooter` 属性，在堆叠展开视图中隐藏多余的底部按钮（后续阶段三完善）。

**结果：**
- 用户可以直接点击标题重命名，不会干扰卡片展开行为。
- 展开后的教案内容与顶部预览布局一致，更专业、更易阅读。

---

## 四、阶段三：按钮去重与最新教案自动收缩

**目标：**
- 当用户点击下方旧教案卡片展开时，下方白色区域不再重复显示一组按钮，避免视觉和交互上的重复。
- 当用户点击“无”教案（堆叠中的某一项）时，当前顶部最新生成的教案应自动收缩，并堆叠回“生成的教案将显示在这里”提示下方。

**主要实现：**
- 在 [LessonPlanCard](file:///d:/Flutter%20Project%20Files/teacher_daily_tool/src/components/LessonPlanCard/LessonPlanCard.tsx) 中：
  - 增加 `hideFooter` 参数，通过 `footerContent={hideFooter ? undefined : renderFooter()}` 控制是否渲染底部按钮区域。
- 在 [App.tsx](file:///d:/Flutter%20Project%20Files/teacher_daily_tool/src/App.tsx) 中：
  - 堆叠展开区域使用 `LessonPlanCard` 时，传入 `hideFooter={!isMobileScreen}`，桌面端去掉底部重复按钮，移动端保留必要功能按钮。
  - 在点击堆叠卡片主区域时，除了切换 `expandedRecentId` 之外，同时调用 `dispatch(setGeneratedPlan(null))`：
    - 触发预览区的“收起”逻辑。
    - 利用已有 “generatedPlan 变为 null 时保存到 recentPlans” 的机制，实现“最新教案自动堆叠回顶部”的效果。

**结果：**
- 展开旧教案后，白色区域只展示教案内容，不再重复显示下载/分享/收藏/删除等按钮。
- 点击堆叠中的“无”教案时，顶部最新生成的教案会自动收缩并和其他教案一起堆叠展示。

---

## 五、阶段四：移动端左滑、收藏联动与长内容展示

**目标：**
- 恢复手机端堆叠教案卡片的左滑操作（显示快捷按钮），与收藏中心保持交互一致。
- 打通堆叠教案与收藏中心的状态联动，包括：
  - 收藏/取消收藏；
  - 标题重命名同步；
  - 在收藏中心删除后，堆叠卡片收藏状态自动更新。
- 在手机端，无论堆叠多少教案，点击第 10 个或更靠后的卡片时，内容都能完整展示，不被裁切。

**主要实现：**
- 在堆叠列表中（[App.tsx](file:///d:/Flutter%20Project%20Files/teacher_daily_tool/src/App.tsx#L2241-L2434)）：
  - 新增“Mobile Swipe Buttons Layer”，仅在 `isMobileScreen` 为真时渲染，位置为卡片内部的绝对定位层，右侧对齐：
    - 下载按钮：调用 `setDownloadMenuPlan` + `setShowGlobalDownloadMenu(true)`。
    - 分享按钮：调用 `openWeChatShare(item.plan)`。
    - 收藏按钮：基于 `computePlanKey(plan)` + `favorites` 判断是否收藏，并通过 `persistFavorites` 更新收藏列表。
    - 删除按钮：调用 `setRecentPlans` 过滤当前 `item.id`。
  - 将“主点击区域”改为可平移动画的内容层：
    - 当 `slidingRecentId === item.id` 且为移动端时，应用 `transform: translateX(-220px)`，露出右侧按钮。
    - 背景色设置为 `var(--card-bg)`，确保按钮层和内容层叠加时视觉正确。
  - 保留原有指针事件（pointer/touch）逻辑，继续通过左右滑动更新 `slidingRecentId`。
- 收藏联动逻辑：
  - 收藏按钮与标题重命名底层共用 `planKey` 机制：
    - 收藏时写入 `{ id, title, subject, content, savedAt, planKey }`。
    - 标题修改时，通过 `planKey` 和 `subject` 查找对应收藏项，并同步更新其 `title`。
  - 在收藏中心删除收藏后，`favorites` 状态更新，堆叠卡片通过 `isPlanBookmarked(plan)` 重新计算收藏状态，按钮随之刷新。
- 长内容展示：
  - 将堆叠展开区域的 `maxHeight` 从 `'2000px'` 提升为 `'8000px'`，并继续使用 `transition-all` 动画：
    - 足够容纳较长教案内容。
    - 保留原有的展开/收起动画体验。

**结果：**
- 手机端堆叠卡片恢复左滑操作，右侧出现下载、分享、收藏、删除四个快捷按钮。
- 堆叠教案与收藏中心在收藏状态、标题、删除操作上均可实时联动。
- 手机端展开第 10 个甚至更靠后的教案时，完整内容可以正常浏览。

---

## 六、阶段五：类型系统与小问题修复

**目标：**
- 修复由新字段和新逻辑带来的 TypeScript 报错，保持代码乾净、类型安全。

**主要实现：**
- 在 [App.tsx](file:///d:/Flutter%20Project%20Files/teacher_daily_tool/src/App.tsx#L108-L112) 中：
  - 将 `RecentItem` 类型定义从  
    `type RecentItem = { id: number; plan: LessonPlan; title: string; time: string };`  
    修改为  
    `type RecentItem = { id: number; plan: LessonPlan; title: string; time: string; subject?: string };`
  - 解决了 IDE 中 `RecentItem` 缺少 `subject` 属性导致的类型错误。

**结果：**
- TS 报错消失，编辑器提示正常，类型定义与实际使用场景保持一致。

---

## 七、后续可以考虑的方向（暂未实施，仅作为思路记录）

- 将堆叠卡片、收藏中心、预览区的公共逻辑（如 `planKey` 计算、收藏存储）封装为独立 hook 或工具函数，减少重复代码。
- 对移动端展开区域的高度控制进行进一步优化（如根据内容动态计算实际高度），在保持动画的前提下进一步提升性能。
- 为关键交互（收藏、删除、重命名等）补充自动化测试用例，避免未来迭代时出现回归问题。

