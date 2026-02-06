# 试卷模板系统设计指南

## 概述

本 Skill 介绍如何设计一个灵活、可扩展的试卷模板系统，支持多种试卷格式（A3/A4、单栏/双栏、不同学段风格）。参考实现基于 `AIPaperGenerator.tsx` 中的 `PaperRenderer` 组件。

## 核心概念

### 模板配置对象

每个模板由一个配置对象定义，包含所有渲染参数：

```typescript
interface TemplateStyles {
  // 容器样式
  container: string;
  inner?: string;
  
  // 头部样式
  title: string;
  meta: string;
  
  // 内容样式
  body: string;
  sectionTitle: string;
  question: string;
  
  // 特殊元素
  sealedLine?: boolean;    // 是否显示密封线
  footer?: boolean;        // 是否显示页脚
  headerInfo?: boolean;    // 是否显示页眉信息
  
  // 标记
  isPrimaryA3?: boolean;
  isPrimary?: boolean;
}

const getTemplateStyles = (template: string): TemplateStyles => {
  switch (template) {
    case 'primary_a3':
      return {
        container: "exam-page w-[210mm] min-h-[297mm] bg-white relative mx-auto",
        inner: "w-full h-full pl-[25mm] pr-[10mm] pt-[6mm] pb-[15mm]",
        title: "text-center font-bold mb-1 tracking-widest",
        meta: "text-center text-sm mb-6 border-b-2 border-black pb-2",
        body: "text-sm leading-relaxed",
        sectionTitle: "font-bold text-lg my-[1.5mm] flex items-center justify-center",
        question: "mb-4",
        sealedLine: true,
        footer: false,
        headerInfo: true,
        isPrimaryA3: true
      };
    // ... 其他模板
  }
};
```

## 模板类型

### 1. 小学 A3 监测模板 (primary_a3)

**规格：**
- 纸张：A3 竖版 (210mm × 297mm)
- 布局：单栏，左侧留密封线区域
- 风格：正式考试风格

**特有元素：**
```typescript
// 密封线（左侧竖排）
{styles.sealedLine && (
  <div className="absolute left-0 top-0 bottom-0 w-[20mm] border-r border-dashed">
    <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -rotate-90">
      姓名：________________
    </div>
    <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -rotate-90">
      班级：________________
    </div>
    <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -rotate-90">
      考号：________________
    </div>
  </div>
)}

// 考生须知
<div className="text-sm font-bold mb-0 mt-8 font-[KaiTi]">
  <div className="font-bold mb-1 text-lg text-center">考生须知</div>
  <div>1. 本试卷共 {totalPages} 页，满分 100 分，考试时间 60 分钟。</div>
  <div>2. 在答题卡上准确填写学校、姓名和考号。</div>
  <div>3. 试题答案一律填涂或书写在答题卡上。</div>
</div>
```

### 2. 中考模板 (zhongkao)

**规格：**
- 纸张：A4 竖版
- 布局：单栏（可根据内容调整为双栏）
- 风格：简洁正式

**特有元素：**
```typescript
// 页眉信息栏
{styles.headerInfo && (
  <div className="flex justify-between pb-0 mb-0 text-base px-1 border-b border-black">
    <span>区：__________</span>
    <span>学校：__________</span>
    <span>姓名：__________</span>
    <span>考号：__________</span>
  </div>
)}

// 双栏布局支持
const bodyStyle: React.CSSProperties = 
  template === 'zhongkao' 
    ? { columnCount: 1 } // 可切换为 2
    : {};
```

### 3. 海淀模板 (haidian)

**规格：**
- 纸张：A4 竖版
- 布局：双栏排版
- 风格：高考模拟，专业印刷

**特有元素：**
```typescript
// 双栏样式
const bodyStyle: React.CSSProperties =
  template === 'haidian'
    ? { 
        columnCount: 2, 
        columnGap: '2rem', 
        columnRule: '1px solid #e5e7eb' 
      }
    : {};

// 密封线（简约版）
{styles.sealedLine && (
  <div className="absolute left-0 top-0 bottom-0 w-[20mm] border-r border-dashed">
    <div className="h-full flex items-center justify-center">
      <div className="transform -rotate-90 whitespace-nowrap text-xs text-gray-500 tracking-[1em]">
        密封线内不要答题
      </div>
    </div>
  </div>
)}
```

### 4. 简洁模板 (simple)

**规格：**
- 纸张：A4 竖版
- 布局：单栏
- 风格：活泼、适合低年级

**特有元素：**
```typescript
{
  container: "max-w-[800px] font-sans",
  title: "text-center text-3xl font-bold font-[KaiTi] text-[#4257B2] mb-4",
  meta: "text-center text-lg mb-8 text-gray-500",
  body: "text-lg leading-[1.8]",
  sectionTitle: "font-bold text-xl mb-4 mt-8 text-[#4257B2] flex items-center gap-2",
  question: "mb-8 break-inside-avoid bg-blue-50/30 p-4 rounded-xl",
  isPrimary: true
}
```

## 试卷数据结构

### 标准试卷格式

```typescript
interface AIPaper {
  title: string;
  sections: Section[];
}

interface Section {
  title: string;        // 题型名称（如："听音图片排序"）
  type: 'listening' | 'writing';
  instructions?: string;
  questions: Question[];
}

interface Question {
  id: string;
  content: string;      // 题目内容
  options?: string[];   // 选项（选择题）
  answer?: string;      // 答案
  image?: string;       // 图片 URL
}
```

### 题型分类常量

```typescript
// 听力题型
export const LISTENING_QUESTIONS = [
  '听音图片排序',   // 图片排序
  '同类词选择',     // 听词选择
  '听音选图',       // 听音选图片
  '听问句选答语',   // 问答匹配
  '短对话判断',     // T/F判断
  '短对话选择',     // 短对话
  '长对话选择',     // 长对话
  '听短文选择',     // 短文理解（选择）
  '听短文判断'      // 短文理解（判断）
];

// 笔试题型
export const WRITING_QUESTIONS = [
  '单项选择',       // 单选
  '不同类单词',     // 词汇分类
  '连词成句',       // 句子排序
  '句型转换',       // 改写句子
  '补全句子',       // 填空
  '完形填空',       // 完形
  '首字母填词',     // 首字母填空
  '选词填空',       // 选词
  '阅读理解',       // 阅读
  '看图写词',       // 看图写词
  '翻译句子',       // 翻译
  '书面表达',       // 作文
  '适当形式填词',   // 语法填空
  '根据图片选词',   // 图词匹配
  '仿写句子'        // 仿写
];
```

## 题型渲染策略

### 策略模式

根据题型使用不同的渲染组件：

```typescript
const QuestionRenderer = ({ section }: { section: Section }) => {
  const qType = detectQuestionType(section.title);

  switch (qType) {
    case 'grid':      // 图片排序、看图写词
      return <GridQuestion section={section} />;
    case 'wordbank':  // 选词填空
      return <WordBankQuestion section={section} />;
    case 'reorder':   // 连词成句
      return <ReorderQuestion section={section} />;
    case 'composition': // 书面表达
      return <CompositionQuestion section={section} />;
    case 'standard':  // 标准选择/判断
    default:
      return <StandardQuestion section={section} />;
  }
};
```

### 1. 网格布局 (Grid)

适用于图片类题目：

```typescript
const GridQuestion = ({ section }: { section: Section }) => (
  <div className="flex flex-row justify-between mt-4 px-2">
    {section.questions.map((q, i) => (
      <div key={i} className="flex flex-col items-center w-[18%]">
        {/* 图片框 */}
        <div className="w-full aspect-square border border-black mb-2 relative">
          <span className="absolute top-0 right-0 bg-black text-white text-xs px-1">
            {String.fromCharCode(65 + i)}  {/* A, B, C... */}
          </span>
        </div>
        {/* 答题区 */}
        <div className="text-center">
          <span className="font-bold">{i + 1}.</span>
          <span className="inline-block w-12 border-b border-black"></span>
        </div>
      </div>
    ))}
  </div>
);
```

### 2. 词库填空 (Word Bank)

```typescript
const WordBankQuestion = ({ section }: { section: Section }) => {
  const words = section.questions[0]?.options || [];
  
  return (
    <div className="mt-4 px-2">
      {/* 词库箱 */}
      <div className="border border-black p-3 mb-4 flex flex-wrap gap-4 justify-center">
        {words.map((w, i) => (
          <span key={i}>
            <span className="font-bold">{String.fromCharCode(65 + i)}.</span> {w}
          </span>
        ))}
      </div>
      {/* 填空题 */}
      <div className="text-base leading-loose">
        {section.questions.map((q, i) => (
          <span key={i} className="mr-4">
            {i + 1}. {q.content.replace(/_+/g, ' ______ ')}
          </span>
        ))}
      </div>
    </div>
  );
};
```

### 3. 连词成句 (Reorder)

```typescript
const ReorderQuestion = ({ section }: { section: Section }) => (
  <div className="space-y-6 mt-4 ml-4">
    {section.questions.map((q, i) => (
      <div key={i}>
        <div className="mb-2 text-base">
          <span className="font-bold mr-2">{i + 1}.</span>
          {q.content}
        </div>
        <div className="w-full border-b border-black h-px"></div>
      </div>
    ))}
  </div>
);
```

### 4. 书面表达 (Composition)

```typescript
const CompositionQuestion = ({ section }: { section: Section }) => (
  <div className="mt-4 ml-4">
    {section.questions.map((q, i) => (
      <div key={i}>
        <div className="mb-2 font-bold">{q.content}</div>
        {/* 作文横线 */}
        <div className="space-y-3 mt-4">
          {Array(6).fill(0).map((_, lineIdx) => (
            <div key={lineIdx} className="w-full border-b border-black h-px"></div>
          ))}
        </div>
      </div>
    ))}
  </div>
);
```

### 5. 标准选择 (Standard)

```typescript
const StandardQuestion = ({ section }: { section: Section }) => {
  const isChoice = section.questions[0]?.options?.length > 0;
  const isJudgment = section.title.includes('判断');
  
  return (
    <div className="space-y-3 ml-4 mt-2">
      {section.questions.map((q, i) => (
        <div key={i} className="mb-4">
          <div className="flex gap-1 items-start">
            {/* 判断/选择题括号 */}
            {isChoice && <span className="mr-2">(&nbsp;&nbsp;&nbsp;)</span>}
            <span className="font-bold min-w-[1.5em]">{i + 1}.</span>
            <div className="flex-1">
              <div dangerouslySetInnerHTML={{ __html: q.content }} />
              
              {/* 选项 */}
              {isChoice && !isJudgment && (
                <div className="mt-1 flex flex-row flex-wrap gap-x-8 gap-y-2">
                  {q.options?.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

## 打印与导出

### 打印样式优化

```css
@media print {
  /* 隐藏非打印元素 */
  .no-print {
    display: none !important;
  }
  
  /* 移除阴影和背景 */
  .exam-page {
    box-shadow: none !important;
    background: white !important;
  }
  
  /* 强制分页 */
  .page-break {
    page-break-before: always;
  }
  
  /* 防止内容被截断 */
  .question {
    break-inside: avoid;
  }
  
  /* 密封线保持 */
  .sealed-line {
    display: block !important;
  }
}
```

### PDF 导出

```typescript
const downloadPDF = async () => {
  const element = document.getElementById('paper-preview');
  
  // 使用 html2canvas + jsPDF
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false
  });
  
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: template === 'primary_a3' ? 'portrait' : 'portrait',
    unit: 'mm',
    format: template === 'primary_a3' ? 'a3' : 'a4'
  });
  
  pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
  pdf.save(`paper_${Date.now()}.pdf`);
};
```

### Word 导出

```typescript
const downloadWord = () => {
  const content = document.getElementById('paper-preview')?.innerHTML;
  
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'></head><body>
  `;
  const footer = '</body></html>';
  
  const blob = new Blob([header + content + footer], {
    type: 'application/msword'
  });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `paper_${Date.now()}.doc`;
  link.click();
};
```

## 扩展新模板

### 步骤

1. **添加模板配置**

```typescript
case 'new_template':
  return {
    container: "...",
    title: "...",
    // ... 其他样式
    sealedLine: false,
    footer: true,
    headerInfo: true
  };
```

2. **更新模板选择逻辑**

```typescript
const updateTemplate = (stage: string, paperType: string) => {
  if (stage === '小学' && paperType === 'new_type') {
    return 'new_template';
  }
  // ...
};
```

3. **添加特有渲染逻辑（如有需要）**

```typescript
{styles.isNewTemplate && (
  <NewTemplateSpecificElement />
)}
```

4. **更新类型定义**

```typescript
type TemplateType = 'primary_a3' | 'zhongkao' | 'haidian' | 'simple' | 'new_template';
```

## 最佳实践

1. **保持数据结构统一**：所有模板使用相同的试卷数据结构
2. **样式与数据分离**：模板只负责样式，不涉及数据处理
3. **渐进增强**：基础模板功能完整，高级模板添加视觉效果
4. **打印优先**：设计时始终考虑打印效果
5. **响应式思考**：即使是固定尺寸（A3/A4），也要考虑屏幕预览的适配
