# AI 试卷生成器开发指南

## 概述

本 Skill 涵盖了基于 React + Redux + TypeScript 构建 AI 试卷生成器的架构模式、组件设计和最佳实践。核心参考实现位于 `src/components/AIPaperGenerator.tsx`。

## 核心架构

### 1. 组件结构

```
AIPaperGenerator (主组件)
├── PaperRenderer (试卷渲染器) - 负责多模板试卷展示
├── ConfigPopover (配置弹窗) - 题目数量/分值配置
├── QuestionRow (题目行) - 已选题目的展示与编辑
└── DrawerItem (抽屉项) - 待选题目的添加
```

### 2. 数据流设计

```typescript
// Redux State 结构
interface AIPaperState {
  theme: string;              // 试卷主题（如：2024-2025学年度）
  specialTopic: string;       // 专项主题
  stage: '小学' | '初中' | '高中';
  paperType: string;          // 试卷类型（期中/期末/监测等）
  examScope: string;          // 考察范围
  questionConfig: Record<string, QuestionConfigItem>;
  generatedPaper: AIPaper | null;
  selectedTemplate: string;   // 模板选择
}

interface QuestionConfigItem {
  count: number;      // 题目数量
  score: number;      // 每题分值
  selected: boolean;  // 是否选中
  sectionCount?: number; // 分组数量
}
```

## 关键实现模式

### 模式 1: 预设配置系统

使用预设（Presets）快速配置常见试卷类型：

```typescript
const PRESETS: Record<string, PresetConfig> = {
  'final': {
    label: '试卷型',
    config: {
      '听音图片排序': { count: 5, score: 1, selected: true },
      '长对话选择': { count: 5, score: 1, selected: true },
      // ...
    }
  },
  'quiz': { label: '专项型', config: { /* ... */ } },
  'basic': { label: '进出门测', config: { /* ... */ } }
};
```

**最佳实践：**
- 预设应该覆盖 80% 的常见使用场景
- 允许用户在预设基础上进行自定义调整
- 预设切换时保留用户已做的自定义修改

### 模式 2: 多模板试卷渲染

支持多种试卷模板（小学A3、中考、高考等）：

```typescript
const getTemplateStyles = () => {
  switch (template) {
    case 'primary_a3': 
      return { container: "...", title: "...", sealedLine: true, ... };
    case 'zhongkao': 
      return { container: "...", headerInfo: true, ... };
    case 'haidian': 
      return { container: "...", columnCount: 2, ... };
    default: 
      return { container: "...", isPrimary: true, ... };
  }
};
```

**设计原则：**
- 每个模板定义完整的样式配置对象
- 使用条件渲染处理模板特有元素（如密封线、页眉信息）
- 保持数据结构一致，渲染逻辑模板无关

### 模式 3: 智能题目分组

按题型自动分组并编号：

```typescript
// 听力题和笔试题分开处理
const listeningSections = paper.sections.filter(s => s.type === 'listening');
const writingSections = paper.sections.filter(s => s.type === 'writing');

// 全局题号计数器
let globalQuestionIndex = 0;

// 渲染时递增
const renderQuestions = (section) => {
  return section.questions.map((q, i) => {
    globalQuestionIndex++;
    return <Question key={i} number={globalQuestionIndex} {...q} />;
  });
};
```

### 模式 4: 题目类型专用渲染

根据题型使用不同的渲染方式：

```typescript
const renderQuestions = (section: any) => {
  const qTypeMatch = Object.keys(QUESTION_TITLES).find(k => section.title.includes(k));

  // 1. 网格布局（图片排序、看图写词）
  if (qTypeMatch === '听音图片排序' || qTypeMatch === '看图写词') {
    return <GridLayout questions={section.questions} />;
  }

  // 2. 词库填空（带选项箱）
  if (qTypeMatch === '选词填空') {
    return <WordBankFill questions={section.questions} />;
  }

  // 3. 连词成句（横线作答区）
  if (qTypeMatch === '连词成句') {
    return <ReorderLines questions={section.questions} />;
  }

  // 4. 书面表达（作文格）
  if (qTypeMatch === '书面表达') {
    return <CompositionLines questions={section.questions} />;
  }

  // 5. 标准选择题（ABCD选项）
  return <StandardChoice questions={section.questions} />;
};
```

### 模式 5: 分数计算与校验

实时计算听力/笔试分数并给出视觉反馈：

```typescript
const listeningScore = useMemo(() => {
  return LISTENING_QUESTIONS.reduce((acc, key) => {
    const config = questionConfig[key];
    return acc + (config?.selected ? config.count * config.score * (config.sectionCount || 1) : 0);
  }, 0);
}, [questionConfig]);

// 总分校验
const totalScore = listeningScore + writingScore;
// 理想总分 100 分，视觉提示用户调整
```

### 模式 6: 生成规则强制约束

在生成前强制执行业务规则：

```typescript
const handleGenerate = () => {
  let finalConfig = { ...questionConfig };
  
  // 规则1: 4年级下学期及以上必须包含书面表达（10分）
  if (isGrade4Sem2Plus) {
    finalConfig['书面表达'] = { 
      ...finalConfig['书面表达'], 
      selected: true, count: 1, score: 10 
    };
  }

  // 规则2: 听力最后一题必须是短文类题型
  const hasLastOption = ['听短文判断', '听短文选择']
    .some(key => finalConfig[key]?.selected);
  
  if (!hasLastOption) {
    finalConfig['听短文选择'] = { count: 5, score: 2, selected: true };
  }

  dispatch(generateAIPaperThunk({ ...params, questionConfig: finalConfig }));
};
```

## 题型配置常量

```typescript
export const LISTENING_QUESTIONS = [
  '听音图片排序', '同类词选择', '听音选图', 
  '听问句选答语', '短对话判断', '短对话选择',
  '长对话选择', '听短文选择', '听短文判断'
];

export const WRITING_QUESTIONS = [
  '单项选择', '不同类单词', '连词成句', '句型转换',
  '补全句子', '完形填空', '首字母填词', '选词填空',
  '阅读理解', '看图写词', '翻译句子', '书面表达',
  '适当形式填词', '根据图片选词', '仿写句子'
];

// 题型标题（双语）
const QUESTION_TITLES: Record<string, { en: string; zh: string }> = {
  '听音图片排序': { en: 'Listen and Choose', zh: '听录音，给你所听到的图片排序，每题读两遍。' },
  '单项选择': { en: 'Choose the best answers.', zh: '单项选择。' },
  // ...
};
```

## 模板特有功能

### 小学 A3 模板 (primary_a3)

- A3 纸张竖版排版
- 密封线（左侧，包含姓名/班级/考号填写区）
- 考生须知
- 听力 + 笔试分区标题
- 分页页脚

### 中考模板 (zhongkao)

- A4 纸张标准排版
- 页眉信息栏（区/学校/姓名/考号）
- 双栏布局选项
- 简洁正式风格

### 海淀模板 (haidian)

- 高考模拟风格
- 双栏排版
- 密封线（左侧竖排）
- 专业印刷效果

## 文件上传处理

支持拖拽和点击上传教材/考点文件：

```typescript
const processFiles = (files: FileList) => {
  setIsAnalyzing(true);
  
  // 文本文件直接读取内容
  const txtFile = Array.from(files).find(f => f.type === 'text/plain');
  if (txtFile) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      dispatch(setAIPaperExamScope(content));
    };
    reader.readAsText(txtFile);
  } else {
    // 其他文件仅记录文件名
    const fileNames = Array.from(files).map(f => f.name).join(', ');
    dispatch(setAIPaperExamScope(`[已上传附件: ${fileNames}]`));
  }
};
```

## 性能优化建议

1. **useMemo 缓存计算**：分数计算、模板样式、年级转换等使用 useMemo
2. **虚拟滚动**：题目列表较长时考虑使用虚拟滚动
3. **懒加载模板**：不同模板代码分割，按需加载
4. **防抖输入**：主题输入等使用防抖减少重渲染

## 常见问题

### Q: 如何添加新的题型？

1. 在 `LISTENING_QUESTIONS` 或 `WRITING_QUESTIONS` 中添加题型名称
2. 在 `QUESTION_TITLES` 中添加双语标题配置
3. 在 `renderQuestions` 中添加该题型的专用渲染逻辑
4. 在 `PRESETS` 中可选地添加到预设配置

### Q: 如何添加新的试卷模板？

1. 在 `getTemplateStyles` 中添加新的 case
2. 定义完整的样式配置对象
3. 在 `updateTemplate` 函数中添加模板选择逻辑
4. 在 `PaperRenderer` 中处理模板特有的渲染逻辑

### Q: 如何处理图片题目？

使用 `isImageQuestion` 检测并渲染占位框：

```typescript
const isImageQuestion = q.content.includes('image') || 
  section.title.includes('图片') || 
  (q.options && q.options.some((o: string) => o.includes('image')));

// 渲染时显示占位框而非文字选项
{isImageQuestion && (
  <div className="w-16 h-16 border border-black rounded-sm" />
)}
```
