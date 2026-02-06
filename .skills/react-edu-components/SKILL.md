# 教育类 React 组件开发指南

## 概述

本 Skill 总结了在教育类 Web 应用中开发 React 组件的常用模式、交互设计和最佳实践。基于 `AIPaperGenerator.tsx` 及类似教育组件的实现经验。

## 核心数据类型

### 教案数据结构 (LessonPlan)

```typescript
interface LessonPlan {
  title_zh: string;           // 中文标题
  title_en: string;           // 英文标题
  grade: string;              // 年级 (如：Grade 3)
  duration: number;           // 教学时长（分钟）- 不包含作业时间
  teachingMethod: string;     // 教学法 (PPP/PWP/TBLT/TTT/project-based)
  
  teachingPreparation: {
    objectives_zh: string[];      // 中文教学目标
    objectives_en: string[];      // 英文教学目标
    keyWords_zh: string[];        // 中文核心词汇
    keyWords_en: string[];        // 英文核心词汇
    sentenceStructures_zh: string[];  // 中文句型
    sentenceStructures_en: string[];  // 英文句型
    teachingAids_zh: string;      // 中文教具
    teachingAids_en: string;      // 英文教具
    studentAnalysis_zh: string;   // 中文学情分析
    studentAnalysis_en: string;   // 英文学情分析
    audienceAnalysis?: {          // 受众细分分析
      type: string;               // 类型 (如：visual, auditory)
      description: string;        // 描述
      ageRange: string;           // 年龄段
      proficiency: string;        // 熟练度
      learningStyle: string;      // 学习风格
    }[];
  };
  
  procedures: {
    title_zh: string;         // 中文步骤标题
    title_en: string;         // 英文步骤标题
    content_zh: string;       // 中文内容 (Markdown格式)
    content_en: string;       // 英文内容 (Markdown格式)
    duration: number;         // 时长（分钟）
  }[];
}
```

### 活动数据结构 (ActivityPlan)

活动使用与教案相同的数据结构，但 `functionType` 为 `'activity'`：
- 活动步骤数量：**恰好6个**（2词汇+2句型+1语法+1产出）或用户指定数量
- 活动内容描述**游戏规则和互动流程**，而非教学步骤

## 设计原则

### 1. 渐进式配置

教育工具通常有复杂的配置需求，采用渐进式披露（Progressive Disclosure）设计：

```typescript
// 层级配置示例
Level 1: 学段选择（小学/初中/高中）- 必选项，显眼位置
Level 2: 试卷类型（期中/期末/单元测）- 根据学段动态变化
Level 2.5: 年级选择（仅小学显示）- 条件渲染
Level 3: 详细配置（题型/分数/范围）- 折叠面板或抽屉
```

### 2. 智能默认值

根据用户选择自动推断其他配置：

```typescript
// 根据学段自动选择默认模板
const updateTemplate = (stage: string, paperType: string) => {
  if (stage === '小学') {
    return paperType === 'monitor' ? 'primary_a3' : 'simple';
  } else if (stage === '初中') {
    return 'zhongkao';
  } else {
    return 'haidian';
  }
};
```

### 3. 实时反馈

- **分数统计**：实时显示听力/笔试/总分的进度
- **配置预览**：选择后立即展示预览效果
- **验证提示**：不符合规则时即时警告

## 常用交互模式

### 模式 1: 分段控制器（Segmented Control）

用于互斥选项的快速切换：

```typescript
const SegmentedControl = <T extends string>({
  options,
  value,
  onChange
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) => (
  <div className="flex p-1 bg-gray-100 rounded-xl">
    {options.map(({ id, label }) => (
      <button
        key={id}
        onClick={() => onChange(id)}
        className={`flex-1 py-2 rounded-lg text-sm transition-all ${
          value === id
            ? 'bg-white shadow font-bold text-primary'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);
```

### 模式 2: 标签云选择器

用于快速添加预设标签：

```typescript
const TagCloud = ({ 
  tags, 
  onSelect 
}: { 
  tags: string[]; 
  onSelect: (tag: string) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {tags.map((tag) => (
      <button
        key={tag}
        onClick={() => onSelect(tag)}
        className="px-2.5 py-1 text-xs rounded-full border border-gray-200 
                   bg-white text-gray-600 hover:border-primary hover:text-primary
                   hover:shadow transition-all duration-200"
      >
        {tag}
      </button>
    ))}
  </div>
);
```

### 模式 3: 可编辑列表项

带内联编辑功能的列表项：

```typescript
const EditableListItem = ({
  label,
  value,
  onChange,
  onRemove
}: EditableListItemProps) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="group flex items-center justify-between py-1.5 px-2 
                    hover:bg-gray-50 rounded-lg transition-colors">
      {/* 左侧：删除按钮 + 名称 */}
      <div className="flex items-center gap-2">
        <button 
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors 
                     opacity-0 group-hover:opacity-100"
        >
          <CloseIcon size={14} />
        </button>
        <span className="text-xs font-medium">{label}</span>
      </div>

      {/* 右侧：可点击编辑的数值 */}
      <button
        onClick={() => setIsEditing(true)}
        className="text-[10px] font-bold px-2 py-0.5 rounded-full 
                   bg-gray-50 border border-gray-200 text-gray-500
                   hover:border-primary hover:text-primary transition-all"
      >
        {value.count}题 / {value.score}分
      </button>

      {/* 编辑弹窗 */}
      {isEditing && (
        <EditPopover 
          value={value} 
          onChange={onChange}
          onClose={() => setIsEditing(false)}
        />
      )}
    </div>
  );
};
```

### 模式 4: 抽屉式选择器

从侧边滑出的选择面板：

```typescript
const DrawerSelector = ({
  isOpen,
  onClose,
  categories,
  onSelect
}: DrawerSelectorProps) => (
  <>
    {/* 遮罩层 */}
    {isOpen && (
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />
    )}
    
    {/* 抽屉面板 */}
    <div className={`fixed top-0 right-0 bottom-0 w-64 bg-white 
                    shadow-2xl z-50 p-4 transform transition-transform
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold">添加题型</h3>
        <button onClick={onClose}>
          <CloseIcon size={16} />
        </button>
      </div>
      
      {categories.map(({ title, items }) => (
        <div key={title}>
          <div className="text-[10px] font-bold text-primary uppercase mb-2">
            {title}
          </div>
          {items.map(item => (
            <DrawerItem 
              key={item} 
              label={item} 
              onClick={() => onSelect(item)}
            />
          ))}
        </div>
      ))}
    </div>
  </>
);
```

### 模式 5: 浮动状态栏

固定在底部的状态汇总：

```typescript
const FloatingStatusBar = ({
  listeningScore,
  writingScore
}: StatusBarProps) => {
  const totalScore = listeningScore + writingScore;
  const isPerfect = totalScore === 100;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 
                    py-2 px-4 rounded-full backdrop-blur-xl shadow-xl
                    flex items-center gap-4 text-xs font-bold z-10
                    border transition-all"
         style={{
           backgroundColor: 'rgba(255, 255, 255, 0.95)',
           borderColor: isPerfect ? 'var(--primary-color)' : 'var(--border-color)'
         }}>
      <ScoreItem label="听力" value={listeningScore} warning={listeningScore < 40} />
      <Divider />
      <ScoreItem label="笔试" value={writingScore} warning={writingScore < 60} />
      <Divider />
      <TotalScore value={totalScore} isPerfect={isPerfect} />
    </div>
  );
};
```

## 表单组件模式

### 复合输入框

将多个相关输入组合在一起：

```typescript
// 主题输入：地区 + 级别（市/区）+ 年份范围
const ThemeInput = () => {
  const [location, setLocation] = useState('');
  const [scope, setScope] = useState<'市' | '区'>('区');
  const [yearStart, setYearStart] = useState('2024');
  const [yearEnd, setYearEnd] = useState('2025');

  return (
    <div className="flex flex-col gap-2">
      {/* 第一行：地区 + 级别 */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="输入地区 (如: 朝阳)"
          className="flex-grow px-3 py-2 rounded-xl border text-center"
        />
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as '市' | '区')}
          className="w-24 px-3 py-2 rounded-xl border"
        >
          <option value="区">区级</option>
          <option value="市">市级</option>
        </select>
      </div>
      
      {/* 第二行：年份范围 */}
      <div className="flex items-center gap-2">
        <input type="text" value={yearStart} className="flex-1 text-center" />
        <span className="text-gray-400 font-bold">-</span>
        <input type="text" value={yearEnd} className="flex-1 text-center" />
        <span className="text-sm whitespace-nowrap">学年</span>
      </div>
    </div>
  );
};
```

### 带图标的输入标签

统一的标签样式：

```typescript
const InputLabel = ({
  label,
  icon,
  hasValue
}: InputLabelProps) => (
  <div className="flex items-center gap-2 mb-2">
    <span className={`transition-colors ${hasValue ? 'text-primary' : 'text-gray-500'}`}>
      {icon}
    </span>
    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
      {label}
    </span>
  </div>
);
```

## CSS 变量主题系统

使用 CSS 变量实现动态主题：

```css
:root {
  --primary-color: #4257B2;
  --primary-rgb: 66, 87, 178;
  
  --container-bg: rgba(255, 255, 255, 0.8);
  --input-bg: #ffffff;
  --input-border: rgba(0, 0, 0, 0.1);
  --border-color: #e5e7eb;
  
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  
  --input-glow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.dark {
  --container-bg: rgba(30, 30, 30, 0.8);
  --input-bg: rgba(255, 255, 255, 0.05);
  --text-primary: #f3f4f6;
  --text-secondary: #9ca3af;
}
```

## 动画效果

### 平滑过渡

```css
/* 按钮点击缩放 */
.btn-active {
  @apply transition-transform active:scale-95;
}

/* 悬停上浮效果 */
.hover-lift {
  @apply transition-all hover:-translate-y-0.5;
}

/* 渐变背景 */
.gradient-bg {
  background: linear-gradient(90deg, 
    rgba(var(--primary-rgb), 0.15) 0%, 
    rgba(var(--primary-rgb), 0.1) 100%
  );
}
```

### 进入动画

```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.3s ease-out;
}
```

## 辅助功能（Accessibility）

### 键盘导航

```typescript
// 确保所有交互元素可通过键盘访问
<button 
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  tabIndex={0}
  aria-label={label}
>
  {content}
</button>
```

### ARIA 标签

```typescript
// 进度指示
<div role="status" aria-live="polite">
  已选择 {selectedCount} 项
</div>

// 加载状态
<div role="progressbar" aria-busy={isLoading}>
  {isLoading && <Spinner />}
</div>
```

## 性能优化

### 1. 使用 useMemo 缓存计算

```typescript
const processedData = useMemo(() => {
  return rawData.map(item => expensiveTransform(item));
}, [rawData]);
```

### 2. 使用 useCallback 稳定回调

```typescript
const handleSelect = useCallback((id: string) => {
  dispatch(selectItem(id));
}, [dispatch]);
```

### 3. 虚拟列表（长列表）

```typescript
import { FixedSizeList as List } from 'react-window';

<List
  height={400}
  itemCount={items.length}
  itemSize={40}
>
  {({ index, style }) => (
    <div style={style}>{items[index]}</div>
  )}
</List>
```

## 测试建议

### 组件测试

```typescript
import { render, screen, fireEvent } from '@testing-library/react';

describe('SegmentedControl', () => {
  it('should call onChange when option clicked', () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={options} value="a" onChange={onChange} />);
    
    fireEvent.click(screen.getByText('Option B'));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
```

## 学科指令层

本 Skill 包含按学科细分的指令文件：

### 教案生成指令
- `INSTRUCTIONS-english-lesson.md` - 英语教案（✅ 完整）
- `INSTRUCTIONS-chinese-lesson.md` - 语文教案（📝 待优化）
- `INSTRUCTIONS-math-lesson.md` - 数学教案（📝 待优化）

### 活动生成指令
- `INSTRUCTIONS-english-activity.md` - 英语活动（✅ 完整）
- `INSTRUCTIONS-chinese-activity.md` - 语文活动（📝 待优化）
- `INSTRUCTIONS-math-activity.md` - 数学活动（📝 待优化）

**使用说明**：
- 英语板块已完成详细指令，严格遵循项目中的提示词构建器规范
- 语文和数学板块为占位文件，待后续教学法优化后更新

## 版本记录

- v1.0 - 基础组件开发指南
- v1.1 - 添加核心数据类型定义和学科指令层说明
