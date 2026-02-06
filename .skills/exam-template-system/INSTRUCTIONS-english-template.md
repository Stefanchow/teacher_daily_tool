# 英语学科 - 试卷模板指令

## 概述

本指令定义了英语学科试卷的模板渲染规则，包括布局、样式和学科特有元素。

## 模板选择规则

### 1. 小学 A3 监测模板 (primary_a3)

**适用场景**：
- 学期期末考试
- 区级/市级质量监测
- 4年级下学期及以上（必须包含书面表达）

**学科特定配置**：
```typescript
const ENGLISH_PRIMARY_A3_CONFIG = {
  // 密封线信息
  sealedLineFields: ['姓名', '班级', '考号'],
  
  // 考生须知
  studentNotice: {
    title: '考生须知',
    items: [
      '本试卷共 {totalPages} 页，满分 100 分，考试时间 60 分钟。',
      '在答题卡上准确填写学校、姓名和考号。',
      '试题答案一律填涂或书写在答题卡上。',
      '听力部分请在播放录音时作答。'
    ]
  },
  
  // 分区标题
  sectionTitles: {
    listening: { zh: '第一部分 听力理解', en: 'Listening' },
    writing: { zh: '第二部分 笔试', en: 'Writing' }
  },
  
  // 听力特有的答题说明
  listeningInstructions: '听力部分共有四大题，每小题读两遍。'
};
```

**布局特点**：
- A3 纸张竖版
- 左侧密封线区域（25mm）
- 听力/笔试分区明确
- 作文格为英语书写格（四线三格）

### 2. 中考模板 (zhongkao)

**适用场景**：
- 初中毕业学业考试
- 中考模拟考试

**学科特定配置**：
```typescript
const ENGLISH_ZHONGKAO_CONFIG = {
  headerInfo: {
    fields: ['区', '学校', '姓名', '考号'],
    alignment: 'space-between'
  },
  
  // 中考英语题型分区
  sections: [
    { id: 'listening', title: '听力', score: 30 },
    { id: 'grammar', title: '语法选择', score: 15 },
    { id: 'cloze', title: '完形填空', score: 10 },
    { id: 'reading', title: '阅读理解', score: 30 },
    { id: 'writing', title: '写作', score: 15 }
  ],
  
  // 双栏布局设置
  columnLayout: {
    enabled: true,
    count: 2,
    gap: '2rem'
  }
};
```

### 3. 海淀/高考模拟模板 (haidian)

**适用场景**：
- 高中英语考试
- 高考模拟

**学科特定配置**：
```typescript
const ENGLISH_HAIDIAN_CONFIG = {
  sealedLine: {
    enabled: true,
    text: '密封线内不要答题',
    position: 'left'
  },
  
  // 高考英语题型
  sections: [
    { id: 'listening', title: '听力', score: 30 },
    { id: 'reading', title: '阅读理解', score: 50 },
    { id: 'language', title: '语言知识运用', score: 30 },
    { id: 'writing', title: '写作', score: 40 }
  ]
};
```

### 4. 简洁模板 (simple)

**适用场景**：
- 日常单元测试
- 低年级（1-2年级）
- 专项练习

**学科特定配置**：
```typescript
const ENGLISH_SIMPLE_CONFIG = {
  colors: {
    primary: '#4257B2',
    background: 'bg-blue-50/30'
  },
  
  // 适合低龄学生的设计
  features: {
    largeFont: true,        // 大号字体
    moreSpacing: true,      // 更大行距
    pictureFriendly: true,  // 预留图片空间
    noSealedLine: true      // 无密封线
  }
};
```

## 题型渲染规则

### 英语特有题型渲染

#### 1. 听音图片排序
```typescript
renderGridLayout({
  columns: 5,
  itemWidth: '18%',
  showLetter: true,  // 显示 A/B/C/D/E
  answerArea: 'underline'  // 下划线答题区
});
```

#### 2. 选词填空 (Word Bank)
```typescript
renderWordBank({
  bankPosition: 'top',  // 词库置于顶部
  bankStyle: 'boxed',   // 带边框的词库箱
  format: 'A. word  B. word  C. word...'
});
```

#### 3. 连词成句
```typescript
renderReorderLines({
  lineStyle: 'horizontal',  // 横线作答
  lineCount: 1,             // 每题一条横线
  hint: '将所给单词连成正确的句子。'
});
```

#### 4. 书面表达 (Composition)
```typescript
renderCompositionArea({
  gridType: 'four-line',  // 英语四线三格
  lineCount: 6,           // 默认6行
  minHeight: '200px',
  showWordCount: true     // 显示字数提示
});
```

## 打印优化

### 英语试卷打印样式

```css
@media print {
  /* 四线三格保持 */
  .english-grid {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  
  /* 听力部分标注 */
  .listening-section {
    page-break-inside: avoid;
  }
  
  /* 作文区域预留 */
  .composition-area {
    min-height: 200px;
    border: 1px solid #ccc;
  }
}
```

## 多语言支持

### 双语标题配置

```typescript
const BILINGUAL_TITLES: Record<string, { zh: string; en: string }> = {
  '听音图片排序': {
    zh: '听录音，给你所听到的图片排序，每题读两遍。',
    en: 'Listen and number the pictures according to what you hear. Each recording will be played twice.'
  },
  '单项选择': {
    zh: '单项选择。',
    en: 'Choose the best answer for each question.'
  },
  '书面表达': {
    zh: '书面表达。根据要求写一篇短文。',
    en: 'Writing. Write a composition according to the requirements.'
  }
};
```

## 模板选择决策树

```
学段?
├── 小学
│   └── 年级 >= 4 且 学期 == 2 ?
│       ├── 是 → primary_a3 (必须书面表达)
│       └── 否 → simple / primary_a3
├── 初中 → zhongkao
└── 高中 → haidian

试卷类型?
├── 期末/监测 → primary_a3 / zhongkao / haidian
├── 单元测试 → simple
└── 专项练习 → simple
```

## 版本记录

- v1.0 - 英语试卷模板指令（当前版本）
