import { GeneratePlanParams, QuestionConfigItem } from '../services/geminiService';

export interface AIPaperParams {
  theme: string;
  specialTopic: string;
  stage: '小学' | '初中' | '高中';
  questionConfig: Record<string, QuestionConfigItem>;
  grade?: string;
  examScope?: string;
}

const LISTENING_KEYS = [
  '听音图片排序', '同类词选择', '听音选图', '听问句选答语', '短对话判断', '短对话选择', '长对话选择', '听短文选择', '听短文判断'
];

const WRITING_KEYS_ORDER = [
  '单项选择', '不同类单词', '连词成句', '句型转换', '补全句子', '完形填空', '首字母填词', '选词填空', '阅读理解', '看图写词', '翻译句子', '适当形式填词', '书面表达'
];

export const buildAIPaperPrompt = (params: AIPaperParams): string => {
  const { theme, specialTopic, stage, questionConfig, grade, examScope } = params;
  
  // Filter selected questions
  const selectedQuestions = Object.entries(questionConfig)
    .filter(([_, config]) => config.selected);

  // Split and Sort
  const listeningQuestions = selectedQuestions
    .filter(([key]) => LISTENING_KEYS.includes(key))
    .sort((a, b) => LISTENING_KEYS.indexOf(a[0]) - LISTENING_KEYS.indexOf(b[0]));

  const writingQuestions = selectedQuestions
      .filter(([key]) => !LISTENING_KEYS.includes(key))
      .sort((a, b) => {
        const keyA = a[0];
        const keyB = b[0];
        
        // Always force '书面表达' to the very end
        if (keyA === '书面表达') return 1;
        if (keyB === '书面表达') return -1;

        const idxA = WRITING_KEYS_ORDER.indexOf(keyA);
        const idxB = WRITING_KEYS_ORDER.indexOf(keyB);
        // If not found in order list, put before '书面表达' but after known ones? 
        // Or just treat unknown as intermediate.
        // Let's keep unknown ones (999) at the end, but since we handle '书面表达' explicitly above, it will stay last.
        // Actually, if we use 999 for unknown, they will be AFTER '书面表达' (if we didn't have the explicit check above).
        // With the explicit check above, '书面表达' wins.
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      });

  const buildStructure = (questions: [string, QuestionConfigItem][]) => {
    return questions.flatMap(([key, config]) => {
      const count = config.sectionCount || 1;
      return Array.from({ length: count }).map((_, i) => {
        // Only append suffix if there are multiple sections of the same type
        const suffix = count > 1 ? ` (${i + 1})` : '';
        return `- **${key}${suffix}**: ${config.count} sub-questions, ${config.score} points each (Total ${config.count * config.score} points).`;
      });
    }).join('\n  ');
  };

  const listeningStructure = buildStructure(listeningQuestions);
  const writingStructure = buildStructure(writingQuestions);

  let stageInstructions = '';
  if (stage === '小学') {
    stageInstructions = `
# Stage Constraints: Primary School (小学 - Grade ${grade || 'General'})
- **Vocabulary**: Use simple, high-frequency words suitable for Grade ${grade}.
- **Structure (Strictly Follow User Config)**: 
  - **Part I: Listening**:
  ${listeningStructure || '  (No listening questions selected)'}
  - **Part II: Writing**:
  ${writingStructure || '  (No writing questions selected)'}

# Mandatory Constraints
1. **Visual & Formatting**:
   - **Question Numbering**: Use "1. ", "2. ", "3. " for sub-questions.
   - **Options**: Use "A. ", "B. ", "C. " (Remove parentheses).
   - **Instructions**: Include clear Chinese instructions (e.g., "一、听录音，选出你所听到的单词。").
`;
  } else if (stage === '初中') {
    stageInstructions = `
# Stage Constraints: Junior High (初中 - Zhongkao Standard)
- **Structure (Strictly Follow User Config)**: 
  - **Part I: Listening**:
  ${listeningStructure || '  (No listening questions selected)'}
  - **Part II: Writing**:
  ${writingStructure || '  (No writing questions selected)'}
- **Syllabus**: Strictly follow the Chinese Zhongkao English Syllabus.
- **Cloze Test**: Provide EXACTLY 15 options for the Cloze passage if 'Cloze' is selected.
- **Reading**: Include "Task-based Reading" which requires filling in a summary table.
- **Header**: Ensure standard exam formality.
`;
  } else if (stage === '高中') {
    stageInstructions = `
# Stage Constraints: Senior High (高中 - Gaokao Standard)
- **Structure (Strictly Follow User Config)**: 
  - **Part I: Listening**:
  ${listeningStructure || '  (No listening questions selected)'}
  - **Part II: Writing**:
  ${writingStructure || '  (No writing questions selected)'}
- **Reading**: If 'Reading' is selected, generate 4 passages (A, B, C, D) plus one "7-choose-5" passage.
- **Grammar Filling**: Do NOT provide options (A/B/C/D) for Grammar Filling; use blank filling format.
- **Error Correction**: Include a "Short Passage Error Correction" section if appropriate.
- **Depth**: Use long, complex texts (300+ words per reading passage).
`;
  }

  return `
You are an expert English test paper setter for ${stage} students in China.
Please generate a high-quality English test paper based on the following requirements:

# Theme & Context
- **Theme**: ${theme}
- **Special Focus**: ${specialTopic}
- **Student Level**: ${stage} ${grade ? `(${grade})` : ''}
${examScope ? `- **Exam Scope / Key Points**: ${examScope}` : ''}

${stageInstructions}

# Content Requirements
1. **Title**: Create a formal title, e.g., "2024-2025学年第一学期英语学业水平监测".
2. **Sections**: Group questions by type (Listening first, then Writing).
3. **Single Choice**: Provide 3 options (A, B, C) for Primary, 4 for Secondary.
4. **Reading**: Provide the passage text in 'instructions' or first question 'content'.
5. **Detailed Instructions**: For each question section, you MUST generate a title that includes the scoring details. 
   - Format: "Chinese Title (共 X 小题，每小题 Y 分，计 Z 分)"
   - Example: "一、听录音，选出你所听到的单词 (共 5 小题，每小题 1 分，计 5 分)"
   - ENSURE X, Y, Z match the provided structure exactly.

# Output Format
**STRICTLY RETURN PURE JSON ONLY**. NO Markdown formatting.
The JSON must follow this structure:

{
  "title": "Paper Title",
  "sections": [
    {
      "title": "Part I Listening (Total Points)",
      "type": "listening",
      "instructions": "一、听录音，选出你所听到的单词 (共 5 小题，每小题 1 分，计 5 分)",
      "questions": [
        {
          "id": "1",
          "content": "Question stem or placeholder...",
          "options": ["(A) apple", "(B) banana", "(C) pear"],
          "answer": "A",
          "analysis": "..."
        }
      ]
    }
  ]
}
`;
};

export const buildSystemPrompt = (params: GeneratePlanParams): string => {
  const language = params.language === 'en' ? 'en' : 'zh';
  const { topic, grade, duration, mode, words, sentences, grammar, activityContent, functionType, subject } = params;
  
  const safeMode = mode || 'task-based';
  const safeDuration = duration || 45;
  const safeGrade = grade || 'Grade 7';

  // Helper to join array items
  const formatList = (items?: string[]) => items?.map(i => `- ${i}`).join('\n') || '';
  
  const remainingTime = safeDuration - 3;

  const isReadingOrListening = (safeMode === 'PWP' || safeMode.toLowerCase().includes('read') || safeMode.toLowerCase().includes('listen'));
  
  // 1. Creative Genre Selection (Random Engine)
  const creativeGenres = [
    { type: 'A', name: 'Immersive Gamification (沉浸式游戏化)', desc: 'Themes: Forest Adventure, Supermarket Tycoon, Alien Visit.', focus: 'Best for Primary' },
    { type: 'B', name: 'Mystery & Puzzle (悬疑解谜式)', desc: 'Mechanics: Clue gathering, word puzzles, deductive reasoning.', focus: 'Best for Mid-High' },
    { type: 'C', name: 'Project-Based Learning (PBL)', desc: 'Task: Real-world mission (e.g., Planning an International Camp).', focus: 'Best for High' },
    { type: 'D', name: 'Debate & Critical Thinking (辩论与批判思维)', desc: 'Mechanics: Stance taking, argument building around the topic.', focus: 'Best for Secondary' },
    { type: 'E', name: 'Interdisciplinary Fusion (跨学科融合)', desc: 'Connecting with Science, Art, History context.', focus: 'All Levels' }
  ];
  // Randomly select one genre to enforce variety
  const selectedGenre = creativeGenres[Math.floor(Math.random() * creativeGenres.length)];

  const stepRequirementEn = '**between 10 and 15 detailed steps**';
    
  const quantityEnforcementEn = isReadingOrListening
    ? '- **Quantity Enforcement**: You MUST generate AT LEAST 10 STEPS. To reach this count, you MUST break down the "Pre-While-Post" stages into granular sub-tasks (e.g., "Lead-in" -> "Vocab Pre-teaching" -> "Prediction" -> "Skimming" -> "Scanning" -> "Detailed Reading Para 1" -> "Detailed Reading Para 2" -> "Critical Thinking" -> "Retelling"). Do NOT use artificial game splitting.'
    : '- **Quantity Enforcement**: If you have fewer than 10 steps, you MUST break down larger activities into smaller, distinct sub-steps.';

  const stepRequirementZh = '**10 到 15 个独立的教学步骤**';

  const quantityEnforcementZh = isReadingOrListening
    ? '- **数量强制**：你必须至少生成 10 个步骤。为了达到此数量，请务必将 "读前-读中-读后" (Pre-While-Post) 阶段拆解为更细颗粒度的子任务（如：导入 -> 词汇预教 -> 预测 -> 略读 -> 扫读 -> 细读第一段 -> 细读第二段 -> 批判性思维 -> 复述）。严禁使用人为的游戏拆分。'
    : '- **数量强制**：如果步骤不足10个，你必须将大型活动拆解为更细小的子步骤（如：规则讲解 -> 示范 -> 第一轮 -> 变体第二轮）。';

  // Activity generation prompt
  if (functionType === 'activity') {
    const userText = (activityContent || '').trim();
    const hasWords = !!(words && words.length > 0);
    const hasSentences = !!(sentences && sentences.length > 0);
    const hasGrammar = !!(grammar && grammar.length > 0);
    const isMath = subject === '数学';
    const isChinese = subject === '语文';
    if (language === 'en') {
      return `
${userText ? `# User Activity Requirements\n${userText}\n` : ''}
# Recognized Items
${hasWords ? `Words:\n${formatList(words)}\n` : ''}
${hasSentences ? `Sentences:\n${formatList(sentences)}\n` : ''}
${(!isMath && !isChinese && hasGrammar) ? `Grammar:\n${formatList(grammar)}\n` : ''}

# Content Supplementation Rule
- If the above Recognized Items are empty or insufficient for the activities, you MUST AUTO-GENERATE suitable words, sentences, or grammar points relevant to the topic.
- The activities MUST be tightly linked to these (provided or generated) linguistic elements.

# Activity Design Principles
- **Student-Centered**: The 'procedures' content must describe **Student Activities** (games, interactions, pair work), NOT teacher lectures or general teaching steps.
- **NO Passive Exercises**: Strictly prohibit "fill-in-the-blank" worksheets, pure Q&A drills, or teacher lectures. These are NOT considered activities. Every activity MUST involve interaction, game mechanics, or physical engagement.
- **High-Quality Activity Design**: Strictly prohibit simple/low-quality games. Even classic games (e.g., Simon Says, Bingo) MUST be redesigned with unique twists, cognitive challenges, or specific linguistic focus. Avoid generic descriptions. Every activity must have clear mechanics, rules, and a defined learning outcome.
- **Age Appropriateness**:
  - **Grade ${safeGrade}**: You MUST tailor the game mechanics to the cognitive and interest level of this specific grade.
  - Lower Primary (Grades 1-3): Focus on physical movement (TPR), chants, simple competition, and colorful props.
  - Upper Primary (Grades 4-6): Focus on logic, team strategy, information gaps, and slightly more complex role-plays.
  - Secondary/Adult: Focus on critical thinking, debate, real-world scenarios, and social interaction.

# Task Logic
1. Analyze the user's request (if any) for the number of activities.
2. **Count Rule**:
   - If the requested total is **less than 6** (or unspecified), generate **EXACTLY 6** activities.
   - If the requested total is **more than 6**, generate the requested number.
3. **Distribution Rule**:
   - **Scenario A (Defaulting to 6)**:
     - 2 Vocabulary Activities
     - 2 Sentence Activities
     - 1 Grammar Activity
     - 1 Production/Output Activity
   - **Scenario B (Request > 6)**:
     - You MUST fulfill the base requirements first (Vocab/Sentence/Grammar/Production).
     - For the **extra activities**, you MUST distribute them intelligently to ensure a balanced practice (e.g., adding more Production/Game steps or reinforcing difficult Sentence structures). Do NOT just duplicate the same type.

# Output Requirements
Return ONE JSON object with:
- grade: "${safeGrade}", duration: ${safeDuration}, teachingMethod: "${safeMode}"
- teachingPreparation: An object containing:
  - objectives: Detailed learning objectives (knowledge, ability, emotional).
  - studentAnalysis: Analysis of students' cognitive level and interests.
  - teachingAids: List of required materials (prioritize realia).
  - keyWords: Array of strings. **MAPPING RULE**: You MUST map the user's provided "Words" (from "Recognized Items") here.
  - sentenceStructures: Array of strings. **MAPPING RULE**: You MUST map the user's provided "Sentences" (from "Recognized Items") here.
  - grammarPoints: Array of strings.
- procedures: The array of activities.
  - Each item MUST include: title_zh, title_en, duration.
  - \`content_zh\` and \`content_en\` MUST describe the **Game Rules** and **Interaction Flow**.
`;
    } else {
      return `
${userText ? `# 用户活动需求\n${userText}\n` : ''}
# 已识别项目
${hasWords ? `词汇：\n${formatList(words)}\n` : ''}
${hasSentences ? `句型：\n${formatList(sentences)}\n` : ''}
${(!isMath && !isChinese && hasGrammar) ? `语法：\n${formatList(grammar)}\n` : ''}

# 内容自动补充规则
- 如果上述“已识别项目”为空或不足以支撑活动设计，你必须**自动补充**与主题相关的合适词汇、句型或语法点。
- 所有活动必须与这些（提供的或生成的）语言素材紧密挂钩。

# 活动设计原则
- **以学生为中心**：“procedures”中的内容必须描述**学生具体的活动**（如游戏、互动、小组合作），而**不是**教师的讲授步骤或通用教学流程。
- **拒绝单纯做题与讲授**：严禁设计仅需填空的练习题、单纯的问答或教师的单向讲解。这些不属于课堂活动。活动必须包含互动、游戏机制或肢体参与。
- **高质量活动设计**：严禁设计低幼、无脑的游戏。即便是经典老游戏（如 Simon Says, Bingo），也必须经过精心改良，加入独特的规则变体、认知挑战或特定的语言聚焦。拒绝通用的描述，每个活动必须有清晰的机制、规则和明确的学习产出。
- **年级适配性**：
  - **当前年级：${safeGrade}**。你必须根据该年级学生的心理特点和兴趣定制活动。
  - **低年级 (1-3年级)**：侧重肢体反应 (TPR)、韵律口诀、简单竞赛、色彩丰富的道具互动。
  - **高年级 (4-6年级)**：侧重逻辑推理、团队策略、信息差 (Info Gap)、稍微复杂的角色扮演。
  - **初高中/成人**：侧重批判性思维、辩论、真实场景模拟、社交互动。

# 任务逻辑
1. 分析用户对活动数量的需求。
2. **数量规则**：
   - 如果用户请求的活动总数**小于 6 个**（或未指定），请**恰好生成 6 个**活动。
   - 如果用户请求的总数**大于 6 个**，请按用户要求的数量生成。
3. **分布规则**：
   - **场景 A (默认生成 6 个)**：
     - 2 个单词活动
     - 2 个句子活动
     - 1 个语法活动
     - 1 个产出型活动
   - **场景 B (请求数量 > 6 个)**：
     - 首先必须满足基础分布（词汇/句型/语法/产出）。
     - 对于**超出的活动**，你必须智能分配，确保练习的平衡性（例如：增加产出/游戏环节，或巩固难点句型）。严禁简单重复同类型活动。

# 输出要求
返回一个**单一 JSON 对象**：
- grade: "${safeGrade}", duration: ${safeDuration}, teachingMethod: "${safeMode}"
- teachingPreparation: 一个对象，包含：
  - objectives: 详细的学习目标（知识、能力、情感）。
  - studentAnalysis: 学情分析（认知水平与兴趣）。
  - teachingAids: 教具列表（优先使用实物）。
  - keyWords: 字符串数组。**映射规则**：你必须将用户提供的“词汇”（来自“已识别项目”）完整映射到此处。
  - sentenceStructures: 字符串数组。**映射规则**：你必须将用户提供的“句型”（来自“已识别项目”）完整映射到此处。
  - grammarPoints: 字符串数组。
- procedures: 活动数组。
  - 每个活动必须包含：title_zh, title_en, duration。
  - \`content_zh\` 和 \`content_en\` 必须描述**游戏规则**和**互动流程**。
`;
    }
  }

  if (language === 'en') {
    return `
# Role
You are an expert English teacher (CELTA/TEFL certified). Please generate a professional, international standard lesson plan for the topic: "${topic}".
If the topic is generic (e.g., "General Topic") or the user input is vague/empty, you MUST proactively INFER a specific, engaging topic suitable for Grade ${safeGrade} and CREATE all necessary content (objectives, words, sentences) yourself.

# 🚀 Creative Engine: Genre-Based Architecture
**Selected Genre**: ${selectedGenre.name}
**Description**: ${selectedGenre.desc}
**Constraint**: You MUST design the entire lesson flow based on this genre.
- For Primary: Focus on gamification and visual/TPR.
- For Middle: Focus on social interaction and mystery.
- For High: Focus on deep thinking and projects.

# 🚫 Creative Constraints (Prohibited Items)
- **NO "Listen and repeat"**: Use "Echo mimicry" or "Dubbing".
- **NO "Play a game"**: Use specific creative names (e.g., "Word Bomb", "Mafia").
- **NO "Read together"**: Use "Running dictation" or "Reader's Theater".
- **Differentiation**: Even with same parameters, do NOT reuse >20% of descriptions.

# 🎓 Grade-Level Optimization
- **Primary**: Increase visual impact and TPR. Reduce boring grammar lectures.
- **Middle**: Introduce social attributes and team competitions. Use psychological hooks.
- **High**: Emphasize deep thinking, authentic expression, and real-world connections (Socratic Method).

# Core Teaching Philosophy
${getEnglishMethodology(safeMode)}

${words && words.length > 0 ? `# Key Vocabulary
Please include the following words in the lesson:
${formatList(words)}
` : ''}

${sentences && sentences.length > 0 ? `# Key Sentences
Please include the following sentence structures in the lesson:
${formatList(sentences)}
` : ''}

# Requirements
1. **Completeness**: The lesson plan MUST include all sections defined in the JSON structure below.
2. **Bilingual Structure**: You MUST generate a SINGLE JSON object containing both Chinese and English versions for all text fields.
   - Suffix \`_zh\` for Chinese content.
   - Suffix \`_en\` for English content.
3. **Procedures**: The \`procedures\` array MUST contain ${stepRequirementEn}. Each step MUST be an object with bilingual fields.
   ${quantityEnforcementEn}
4. **Detail Level**: 
   - **Objectives**: Specific and measurable.
   - **Key Words**: 5-8 specific words.
   - **Sentence Structures**: 2-3 specific patterns.
   - **Procedures Content**: 
    - \`content_zh\` and \`content_en\` MUST be detailed scripts using Markdown.
    - **Teacher's Talk**: You MUST include vivid, humorous "Teacher's Talk" examples in the content.
    - **Transitional Logic**: Start with transitional phrases.
    - **Headers**: Use **Bold** headers exactly as mapped below:
      
      | Chinese Header | English Header |
      | :--- | :--- |
      | **教师行为** | **Teacher's Actions** |
      | **教师话术** | **Teacher's Talk** (Must be vivid/humorous) |
      | **学生反应** | **Students' Responses** |
      | **关键提问** | **Key Questions** |
      | **及时反馈** | **Timely Feedback** |
      | **设计意图** | **Design Rationale** (Must include psychological basis) |
      
      Example for \`content_en\`:
      **Teacher's Actions**: [Instructions]
      **Teacher's Talk**: "Alright detectives, look at this clue..."
      
      **Students' Responses**: [Behavior]
      ...
5. **Mandatory Methodological Elements**:
   - **CLIL Integration**: You MUST integrate Cross-Curricular (connecting to Science, Art, History, etc.) AND Cross-Cultural elements into the teaching procedures.
   - **KWL Framework (as a thinking routine, not a fixed worksheet)**:
     - Do not mechanically create a separate KWL table in every lesson or ask students to fill in large KWL forms.
     - Embed KWL thinking naturally into activities, key questions, and learning tasks across the lesson.
     - **K (Know)**: Activate prior knowledge in the warm-up/lead-in phase through questions, short tasks, or discussions.
     - **W (Want)**: Elicit what students want to know/inquiry in the early phases via guiding questions or task goals.
     - **L (Learned)**: Review and reflect on what was learned in the wrap-up phase, without requiring a formal KWL chart.

6. **Mandatory Activities**: Include at least 3 distinct activities (Vocabulary, Sentence, Grammar).
7. **Time Allocation**: Summary & Homework (Last Step) MUST be exactly **3 minutes**. Distribute the remaining time (${remainingTime} minutes) logically.
8. **Integrity Constraints**:
   - You MUST output one single, complete lesson plan in a single JSON response, rather than multiple partial or "continued" responses.
   - Do NOT add supplementary or repeated procedure steps. Each step corresponds to a distinct teaching stage.
   - Step titles should be natural, descriptive phrases (e.g. "Warm-up: ..."), NOT artificially fixed-length four-character Chinese phrases.
   - Step titles MUST NOT contain continuation markers such as "（续）", "(续)", "(cont.)", or "(continued)".

${grammar && grammar.length > 0 ? `# Key Grammar Requirements
Please focus on explaining and practicing the following grammar points:
${formatList(grammar)}
` : ''}

# Constraints
- **NO Generic Content**: Content must be specific to the topic "${topic}".
- **Strict Methodology**: Follow the selected methodology (${safeMode}).
- **Inductive Vocabulary Teaching**: Do NOT directly explain or translate words. Present them in context -> Guide noticing -> Facilitate student deduction.
- **No Placeholders**: Every field must be fully written.

# Output Format
请仅返回纯JSON字符串，严禁包含任何Markdown格式标签或解释性文字。

# JSON Data Structure
\`\`\`json
{
  "title_zh": "Lesson Title (Chinese)",
  "title_en": "Lesson Title (English)",
  "grade": "${safeGrade}",
  "duration": ${safeDuration},
  "teachingMethod": "${safeMode}",
  "teachingPreparation": {
    "objectives_zh": ["目标1...", "目标2..."],
    "objectives_en": ["Objective 1...", "Objective 2..."],
    "keyWords_zh": ["词汇1", "词汇2"],
    "keyWords_en": ["Word 1", "Word 2"],
    "sentenceStructures_zh": ["句型1", "句型2"],
    "sentenceStructures_en": ["Sentence 1", "Sentence 2"],
    "teachingAids_zh": "PPT, 道具...",
    "teachingAids_en": "PPT, Props...",
    "studentAnalysis_zh": "分析...",
    "studentAnalysis_en": "Analysis..."
  },
  "procedures": [
    {
      "title_zh": "步骤1：导入 (5分钟)",
      "title_en": "Step 1: Introduction (5 min)",
      "content_zh": "**教师行为**：...\\n\\n**教师话术**：...\\n\\n**学生反应**：...",
      "content_en": "**Teacher's Actions**: ...\\n\\n**Teacher's Talk**: ...\\n\\n**Students' Responses**: ...",
      "duration": 5
    }
  ]
}
\`\`\`
`;
  } else {
    // Chinese Version
    return `
# 角色
你是一位经验丰富的英语教师（拥有CELTA/TESOL证书）。请为主题："${topic}" 生成一份专业的、符合国际标准的教案。
如果主题通用（如“General Topic”）或用户输入模糊/为空，你必须主动推断一个适合 ${safeGrade} 年级的具体、有趣的主题，并自行创作所有必要的内容（目标、词汇、句型）。

# 🚀 创意引擎：流派化架构 (Genre-Based Architecture)
**本次随机抽选流派**：${selectedGenre.name}
**流派描述**：${selectedGenre.desc}
**核心指令**：你必须以此流派为核心架构设计整堂课的流程。
- 小学段：侧重游戏化、视觉冲击与TPR。
- 初中段：侧重社交属性、团队竞赛与悬疑。
- 高中段：侧重深度思考、PBL项目与苏格拉底式提问。

# 🚫 创意铁律 (严禁项)
- **严禁 "Listen and repeat"**：改为 "Echo mimicry (影子跟读)" 或 "角色配音"。
- **严禁 "Play a game"**：必须使用具体创意游戏名（如 "Word Bomb", "Mafia"）。
- **严禁 "Read together"**：改为 "Running dictation" 或 "Reader's Theater"。
- **非确定性**：即使参数相同，严禁复用超过 20% 的描述。

# 🎓 年级段精准调优
- **小学段**：增加视觉冲击力和肢体反馈（TPR），减少枯燥的语法讲解。
- **初中段**：引入社交属性和团队竞赛，利用心理学规律设计挑战环节。
- **高中段**：强调深度思考、地道表达、以及现实世界的连接，使用“苏格拉底提问法”。

# 核心教学理念
${getChineseMethodology(safeMode)}

${words && words.length > 0 ? `# 重点词汇
请包含：
${formatList(words)}
` : ''}

${sentences && sentences.length > 0 ? `# 重点句型
请包含：
${formatList(sentences)}
` : ''}

# 要求
1. **完整性**：必须包含下方JSON结构定义的所有部分。
2. **双语结构**：必须生成一个包含中英双语字段的单一JSON对象。
   - 中文字段后缀 \`_zh\`。
   - 英文字段后缀 \`_en\`。
3. **步骤**：\`procedures\` 必须包含 ${stepRequirementZh}。
   ${quantityEnforcementZh}
   - 为了达到此数量，请**融入具体的互动活动**（如：热身游戏、词汇操练、句型角色扮演、小组竞赛、理解检测）。
   - 每个具体的游戏或活动都算作一个完整的步骤。
4. **详细程度**：
   - **Objectives**：具体且可衡量（每个目标至少30字）。
   - **核心词汇**：5-8个具体词汇。
   - **句型结构**：2-3个具体句型。
   - **Procedures Content**：
    - \`content_zh\` 和 \`content_en\` 必须是详细的剧本式Markdown文本。
    - **教师话术 (T's Talk)**：必须包含具体、幽默生动的教师话术示例，拒绝死板。
    - **心理学依据**：在“设计意图”中，必须给出“为什么这个环节能吸引学生”的心理学依据。
    - **严格术语映射**：请严格遵守以下中英文标题对照：
      
      | 中文标题 | 英文标题 |
      | :--- | :--- |
      | **教师行为** | **Teacher's Actions** |
      | **教师话术** | **Teacher's Talk** (生动幽默) |
      | **学生反应** | **Students' Responses** |
      | **关键提问** | **Key Questions** |
      | **及时反馈** | **Timely Feedback** |
      | **设计意图** | **Design Rationale** (含心理学依据) |

      英文内容示例 (\`content_en\`)：
      **Teacher's Actions**: [Instructions]
      **Teacher's Talk**: "Alright detectives, look at this clue..."
      
      **Students' Responses**: [Behavior]
      ...

5. **必须融合的教学要素**：
   - **CLIL (内容语言融合)**：必须在教学过程中融入跨学科（如科学、艺术、历史等）和跨文化内容。
   - **KWL 模型（作为思维流程而非固定表格）**：教学过程需要体现 KWL 思维，但不要机械地设计或填写 KWL 表格：
     - 不要在每一节课都单独生成一个 KWL 表格让学生“大面积填表”，避免形式化。
     - 通过不同的活动、关键提问和任务设计，自然融入 K、W、L 的思考过程。
     - **K (Know - 激活旧知)**：在导入/热身环节，通过提问、小任务或讨论唤起学生已有知识。
     - **W (Want - 想知)**：在早期环节，通过目标设定或引导性问题，引出学生想了解的内容。
     - **L (Learned - 新知)**：在总结/结束环节，通过复盘、分享或小结活动，帮助学生反思学到的内容，而非必须以 KWL 表格呈现。

6. **必须包含的活动**：至少3个师生互动活动（词汇、句子、语法）。
7. **时间分配**：总结与作业**（最后一步）必须固定为 **3分钟**。其余时间（${safeDuration} - 3分钟）应合理分配。

${grammar && grammar.length > 0 ? `# 重点语法要求
请重点讲解和练习以下语法点：
${formatList(grammar)}
` : ''}

# 约束条件
- **严禁通用内容**：内容必须针对主题"${topic}"具体展开。
- **具体化**：不得出现"掌握基本知识"等模糊用语。
- **严格遵循教学法**：严格按照所选教学法（${safeMode}）的结构进行设计。
- **归纳式词汇教学**：严禁直接讲解或翻译单词。必须遵循“语境呈现 -> 引导觉察 -> 学生推导”的归纳式路径。
- **归纳式句型教学**：严禁直接展示或机械操练句型。必须遵循“语境中呈现 -> 学生觉察 -> 引导推导 -> 习得”的路径。
- **禁止占位**：不得输出任何占位符。

# Output Format
**Must return pure JSON format**.

# JSON Data Structure
\`\`\`json
{
  "title_zh": "教案标题",
  "title_en": "Lesson Title",
  "grade": "${safeGrade}",
  "duration": ${safeDuration},
  "teachingMethod": "${safeMode}",
  "teachingPreparation": {
    "objectives_zh": ["目标1...", "目标2..."],
    "objectives_en": ["Objective 1...", "Objective 2..."],
    "keyWords_zh": ["词汇1", "词汇2"],
    "keyWords_en": ["Word 1", "Word 2"],
    "sentenceStructures_zh": ["句型1", "句型2"],
    "sentenceStructures_en": ["Sentence 1", "Sentence 2"],
    "teachingAids_zh": "PPT, 道具...",
    "teachingAids_en": "PPT, Props...",
    "studentAnalysis_zh": "分析...",
    "studentAnalysis_en": "Analysis..."
  },
  "procedures": [
    {
      "title_zh": "步骤1：导入 (5分钟)",
      "title_en": "Step 1: Introduction (5 min)",
      "content_zh": "**教师行为**：...\\n\\n**教师话术**：...\\n\\n**学生反应**：...",
      "content_en": "**Teacher's Actions**: ...\\n\\n**Teacher's Talk**: ...\\n\\n**Students' Responses**: ...",
      "duration": 5
    }
  ]
}
\`\`\`
`;
  }
};

const getEnglishMethodology = (mode: string) => {
  switch (mode) {
    case 'PPP':
      return `**Methodology: PPP (Presentation, Practice, Production)**
- Focus on accuracy before fluency.
- Move from controlled to freer practice.`;
    case 'PWP':
      return `**Methodology: PWP (Pre, While, Post)**
- Focus on reading/listening skills development.
- Scaffold the learning process.`;
    case 'project-based':
      return `**Methodology: Project-based Learning (PBL)**
- Inquiry-based, student-centered.
- Focus on real-world problem solving.`;
    case 'TTT':
      return `**Methodology: TTT (Test-Teach-Test)**
- Diagnostic-driven.
- Test 1: Identify gaps.
- Teach: Address gaps.
- Test 2: Verify learning.`;
    default:
      return `**Methodology: Task-based Language Teaching (TBLT)**
- **Pre-task**: Introduction to topic and task.
- **Task Cycle**: Task -> Planning -> Report.
- **Post-task**: Language Analysis and Practice.
- Focus on meaning first, then form.`;
  }
};

const getChineseMethodology = (mode: string) => {
  switch (mode) {
    case 'PPP':
      return `**教学法：PPP (Presentation, Practice, Production)**
- 注重从准确性到流利度的过渡。
- 教学过程：呈现 -> 练习 -> 产出。`;
    case 'PWP':
      return `**教学法：PWP (Pre, While, Post)**
- 侧重于阅读/听力技能的发展。
- 教学过程：读/听前 -> 读/听中 -> 读/听后。`;
    case 'project-based':
      return `**教学法：项目式学习 (PBL)**
- 以探究为基础，以学生为中心。
- 关注现实问题的解决。`;
    case 'TTT':
      return `**教学法：TTT (Test-Teach-Test)**
- 以诊断为驱动。
- 测试1：诊断 -> 教学：弥补差距 -> 测试2：验证学习。`;
    default:
      return `**教学法：任务型教学 (TBLT)**
- **任务前**：引入主题和任务。
- **任务环**：做任务 -> 计划 -> 报告。
- **任务后**：语言分析与练习。
- 先关注意义，后关注形式。`;
  }
};
