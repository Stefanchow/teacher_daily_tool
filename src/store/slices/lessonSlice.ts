import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { LessonPlan, LessonPlanResponse, geminiService, AIPaper, AIPaperParams } from '../../services/geminiService';
import { RootState } from '../index';

export interface GrammarRule {
  id: string;
  rule: string;
  example?: string;
}

export interface LessonState {
  topic: string;
  duration: number | '';
  grade: string;
  words: string[];
  sentences: string[];
  grammar: GrammarRule[];
  vocabularyExtensions: string;
  teachingMethod: 'task-based' | 'project-based' | 'PWP' | 'PPP' | 'TTT';
  discourseType?: string;
  textType?: string;
  wordCount?: number | '';
  articleContent?: string;
  activityContent?: string;
  
  generatedPlan: LessonPlan | LessonPlanResponse | null;
  isLoading: boolean;
  error: string | null;
  rawContent: string; 
  lastSyncedAt: number | null;
  segmentedStatus?: {
    outline: 'idle' | 'loading' | 'done';
    prep: 'idle' | 'loading' | 'done';
    proc: 'idle' | 'loading' | 'done';
    full: 'idle' | 'loading' | 'done';
  };
  
  aiPaper: {
    theme: string;
    specialTopic: string;
    stage: '小学' | '初中' | '高中';
    paperType: string;
    examScope: string;
    questionConfig: Record<string, QuestionConfigItem>;
    listeningOrder: string[];
    writingOrder: string[];
    generatedPaper: AIPaper | null;
    isLoading: boolean;
    error: string | null;
    selectedTemplate: string;
  };
}

export interface QuestionConfigItem {
  count: number;
  score: number;
  selected: boolean;
  sectionCount?: number;
}

export const LISTENING_QUESTIONS = [
  '图片排序', '同类词选择', '听音选图', '听问句选答语', '短对话判断', '短对话选择', '长对话选择', '听短文选择', '听短文判断'
];

export const WRITING_QUESTIONS = [
  '单项选择', '不同类单词', '连词成句', '句型转换', '补全句子', '完形填空', '首字母填词', '选词填空', '阅读理解', '看图写词', '翻译句子', '适当形式填词', '书面表达'
];

const initialQuestionConfig: Record<string, QuestionConfigItem> = {};

// Initialize defaults
[...LISTENING_QUESTIONS, ...WRITING_QUESTIONS].forEach(key => {
  let defaultCount = 5;
  let defaultScore: number = 1;
  
  // Specific defaults
  if (key === '书面表达') {
    defaultCount = 1;
    defaultScore = 10;
  } else if (['听短文选择', '选词填空', '阅读理解', '看图写词', '完形填空', '听短文判断'].includes(key)) {
    defaultScore = 2;
  }
  
  // Default selection state - select some common ones initially
  const isSelected = ['听音选图', '听短文选择', '单项选择', '阅读理解', '书面表达'].includes(key);

  initialQuestionConfig[key] = {
    count: defaultCount,
    score: defaultScore,
    selected: isSelected,
    sectionCount: 1
  };
});

const initialState: LessonState = {
  topic: '',
  duration: '',
  grade: '',
  words: [],
  sentences: [],
  grammar: [],
  vocabularyExtensions: '',
  teachingMethod: 'task-based',
  discourseType: '',
  textType: '',
  wordCount: '',
  articleContent: '',
  activityContent: '',
  
  generatedPlan: null,
  isLoading: false,
  error: null,
  rawContent: '',
  lastSyncedAt: null,
  segmentedStatus: undefined,
  
  aiPaper: {
    theme: '',
    specialTopic: '全真模拟',
    stage: '初中',
    paperType: 'unit',
    examScope: '',
    questionConfig: initialQuestionConfig,
    listeningOrder: [...LISTENING_QUESTIONS],
    writingOrder: [...WRITING_QUESTIONS],
    generatedPaper: null,
    isLoading: false,
    error: null,
    selectedTemplate: 'default'
  }
};

export const generateAIPaperThunk = createAsyncThunk(
  'lesson/generateAIPaper',
  async (params: AIPaperParams, { rejectWithValue }) => {
    try {
      const paper = await geminiService.generateAIPaper(params);
      return paper;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Generation failed');
    }
  }
);

export const generateLessonPlanThunk = createAsyncThunk(
  'lesson/generate',
  async (payload: { functionType?: 'lesson' | 'activity'; subject?: '英语' | '数学' | '语文' } | undefined, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const { 
      topic, 
      grade, 
      duration, 
      words, 
      sentences, 
      grammar, 
      vocabularyExtensions, 
      teachingMethod,
      activityContent 
    } = state.lesson;
    const { language } = state.preview;

    if ((payload?.functionType || 'lesson') !== 'activity') {
      // Relaxed validation: Allow generation even if topic is missing/empty, 
      // provided there is SOME content to work with (though the UI usually enforces topic).
      // However, the user requirement is "User can input ANY content in the box... if empty... auto-supplement".
      // This implies we should NOT reject if topic is empty, but rather set a default topic or let the backend handle it.
      // But `topic` field in Redux comes from the input box.
      // If the input box is empty, `topic` is empty.
      // We should allow it and set a placeholder topic if needed.
      if (!topic.trim()) {
         // Instead of rejecting, we can warn or just proceed with a default topic
         // But `topic` is used in prompts.
         // Let's set a default topic in the params construction below if it's empty.
         // So we remove this strict check.
      }
    }

    // Validate Duration
    let finalDuration = typeof duration === 'number' ? duration : 45;
    if (duration === '') finalDuration = 45;
    
    // Ensure 25-60 range
    if (finalDuration < 25) finalDuration = 25;
    if (finalDuration > 60) finalDuration = 60;

    // Dispatch update if duration changed to keep UI in sync
    if (finalDuration !== duration) {
       dispatch(lessonSlice.actions.setDuration(finalDuration));
    }

    try {
      if (import.meta.env.DEV) {
        console.log('🚀 Generating plan with params:', {
          topic,
          grade,
          duration: finalDuration,
          mode: teachingMethod,
          language,
          words,
          sentences,
          grammar: grammar.map(g => g.rule)
        });
      }

      dispatch(lessonSlice.actions.setSegmentedPartStatus({ part: 'outline', state: 'loading' }));
      dispatch(lessonSlice.actions.setSegmentedPartStatus({ part: 'prep', state: 'idle' }));
      dispatch(lessonSlice.actions.setSegmentedPartStatus({ part: 'proc', state: 'idle' }));
      dispatch(lessonSlice.actions.setSegmentedPartStatus({ part: 'full', state: 'idle' }));

      const baseParams = {
        topic: topic.trim() || 'General Topic', // Fallback for empty topic
        level: 'A2',
        grade,
        duration: finalDuration,
        mode: teachingMethod,
        language: language,
        words,
        vocabularyExtensions,
        sentences,
        grammar: grammar.map(g => g.rule),
        activityContent,
        functionType: payload?.functionType || 'lesson',
        subject: payload?.subject
      };
      const lastChunkLengths: Record<string, number> = {};
      const mode = (import.meta as any).env?.MODE;
      // Use segmented generation ONLY for lesson plans, not activities
      const useSegmented = mode !== 'test' && baseParams.functionType !== 'activity';

      const plan = useSegmented
        ? await geminiService.generateLessonPlanSegmented(
            baseParams,
            (part: any, state: any) => {
              dispatch(lessonSlice.actions.setSegmentedPartStatus({ part, state }));
            },
            (part: any, chunk: string) => {
              dispatch(lessonSlice.actions.setSegmentedPartStatus({ part, state: 'loading' }));
              const text = typeof chunk === 'string' ? chunk : (chunk != null ? String(chunk) : '');
              const previousLength = lastChunkLengths[part] || 0;
              if (text.length <= previousLength) return;
              const delta = text.slice(previousLength);
              lastChunkLengths[part] = text.length;
              const tag = previousLength === 0 ? `[${part}] ` : '';
              const currentState = getState() as RootState;
              const previous = currentState.lesson.rawContent || '';
              const next = previous
                ? `${previous}${delta}`
                : `${tag}${delta}`;
              dispatch(lessonSlice.actions.updateRawContent(next));
            }
          )
        : await geminiService.generateLessonPlan(baseParams);
      return plan;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Generation failed');
    }
  }
);

const lessonSlice = createSlice({
  name: 'lesson',
  initialState,
  reducers: {
    setTopic(state, action: PayloadAction<string>) {
      state.topic = action.payload;
    },
    setDuration(state, action: PayloadAction<number | ''>) {
      state.duration = action.payload;
    },
    setGrade(state, action: PayloadAction<string>) {
      state.grade = action.payload;
    },
    setDiscourseType(state, action: PayloadAction<string>) {
      state.discourseType = action.payload;
    },
    setTextType(state, action: PayloadAction<string>) {
      state.textType = action.payload;
    },
    setWordCount(state, action: PayloadAction<number | ''>) {
      state.wordCount = action.payload;
    },
    setArticleContent(state, action: PayloadAction<string>) {
      state.articleContent = action.payload;
    },
    setActivityContent(state, action: PayloadAction<string>) {
      state.activityContent = action.payload;
    },
    setWords(state, action: PayloadAction<string[]>) {
      state.words = action.payload;
    },
    setSentences(state, action: PayloadAction<string[]>) {
      state.sentences = action.payload;
    },
    setGrammar(state, action: PayloadAction<GrammarRule[]>) {
      state.grammar = action.payload;
    },
    setVocabularyExtensions(state, action: PayloadAction<string>) {
      state.vocabularyExtensions = action.payload;
    },
    setTeachingMethod(state, action: PayloadAction<'task-based' | 'project-based' | 'PWP' | 'PPP' | 'TTT'>) {
      state.teachingMethod = action.payload;
    },
    setGeneratedPlan(state, action: PayloadAction<LessonPlan | LessonPlanResponse | null>) {
      state.generatedPlan = action.payload;
      state.error = null;
      try {
        state.rawContent = action.payload ? JSON.stringify(action.payload, null, 2) : '';
      } catch (err) {
        console.error('Failed to stringify plan:', err);
        state.rawContent = '';
        state.error = 'Failed to process lesson plan data';
      }
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    cancelGeneration(state) {
      state.isLoading = false;
      state.segmentedStatus = { outline: 'idle', prep: 'idle', proc: 'idle', full: 'idle' };
    },
    updateRawContent(state, action: PayloadAction<string>) {
      state.rawContent = action.payload;
      state.lastSyncedAt = Date.now();
    },
    setSegmentedPartStatus(state, action: PayloadAction<{ part: 'outline'|'prep'|'proc'|'full', state: 'idle'|'loading'|'done' }>) {
      const { part, state: st } = action.payload;
      if (!state.segmentedStatus) state.segmentedStatus = { outline: 'idle', prep: 'idle', proc: 'idle', full: 'idle' };
      (state.segmentedStatus as any)[part] = st;
    },
    
    // AI Paper Reducers
    setAIPaperTheme(state, action: PayloadAction<string>) {
      state.aiPaper.theme = action.payload;
    },
    setAIPaperSpecialTopic(state, action: PayloadAction<string>) {
      state.aiPaper.specialTopic = action.payload;
    },
    setAIPaperStage(state, action: PayloadAction<'小学' | '初中' | '高中'>) {
      state.aiPaper.stage = action.payload;
    },
    setAIPaperType(state, action: PayloadAction<string>) {
      state.aiPaper.paperType = action.payload;
    },
    setAIPaperExamScope(state, action: PayloadAction<string>) {
      state.aiPaper.examScope = action.payload;
    },
    updateGeneratedPaperQuestion(state, action: PayloadAction<{ sectionIndex: number; questionIndex: number; content: string }>) {
      if (state.aiPaper.generatedPaper?.sections) {
        const { sectionIndex, questionIndex, content } = action.payload;
        const section = state.aiPaper.generatedPaper.sections[sectionIndex];
        if (section?.questions?.[questionIndex]) {
          section.questions[questionIndex].content = content;
        }
      }
    },
    updateGeneratedPaperQuestionOption(state, action: PayloadAction<{ sectionIndex: number; questionIndex: number; optionIndex: number; value: string }>) {
      if (state.aiPaper.generatedPaper?.sections) {
        const { sectionIndex, questionIndex, optionIndex, value } = action.payload;
        const section = state.aiPaper.generatedPaper.sections[sectionIndex];
        if (section?.questions?.[questionIndex]?.options?.[optionIndex] !== undefined) {
          section.questions[questionIndex].options![optionIndex] = value;
        }
      }
    },
    setAIPaperQuestionConfig(state, action: PayloadAction<Record<string, QuestionConfigItem>>) {
      state.aiPaper.questionConfig = action.payload;
    },
    updateQuestionConfigItem(state, action: PayloadAction<{ key: string; changes: Partial<QuestionConfigItem> }>) {
      const { key, changes } = action.payload;
      if (state.aiPaper.questionConfig[key]) {
        state.aiPaper.questionConfig[key] = { ...state.aiPaper.questionConfig[key], ...changes };
      }
    },
    setListeningOrder(state, action: PayloadAction<string[]>) {
      state.aiPaper.listeningOrder = action.payload;
    },
    setWritingOrder(state, action: PayloadAction<string[]>) {
      state.aiPaper.writingOrder = action.payload;
    },
    setAIPaperSelectedTemplate(state, action: PayloadAction<string>) {
      state.aiPaper.selectedTemplate = action.payload;
    },
    clearAIPaper(state) {
      state.aiPaper.generatedPaper = null;
      state.aiPaper.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // AI Paper Async Actions
      .addCase(generateAIPaperThunk.pending, (state) => {
        state.aiPaper.isLoading = true;
        state.aiPaper.error = null;
        state.aiPaper.generatedPaper = null;
      })
      .addCase(generateAIPaperThunk.fulfilled, (state, action) => {
        state.aiPaper.isLoading = false;
        state.aiPaper.generatedPaper = action.payload;
        state.aiPaper.error = null;
      })
      .addCase(generateAIPaperThunk.rejected, (state, action) => {
        state.aiPaper.isLoading = false;
        state.aiPaper.error = action.payload as string;
      })

      .addCase(generateLessonPlanThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.generatedPlan = null; // Clear previous plan
        state.segmentedStatus = { outline: 'idle', prep: 'idle', proc: 'idle', full: 'idle' };
      })
      .addCase(generateLessonPlanThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.generatedPlan = action.payload;
        state.error = null;
        try {
          state.rawContent = JSON.stringify(action.payload, null, 2);
        } catch (err) {
          console.error('Failed to stringify plan:', err);
          state.rawContent = '';
          state.error = 'Failed to process generated plan';
        }
        state.segmentedStatus = { outline: 'done', prep: 'done', proc: 'done', full: 'done' };
      })
      .addCase(generateLessonPlanThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.segmentedStatus = { outline: 'idle', prep: 'idle', proc: 'idle', full: 'idle' };
      });
  },
});

export const { 
  setTopic, 
  setDuration,
  setGrade,
  setWords,
  setSentences,
  setGrammar,
  setVocabularyExtensions,
  setTeachingMethod,
  setDiscourseType,
  setTextType,
  setWordCount,
  setArticleContent,
  setActivityContent,
  setGeneratedPlan, 
  setLoading, 
  setError,
  cancelGeneration,
  updateRawContent,
  setSegmentedPartStatus,
  setAIPaperTheme,
  setAIPaperSpecialTopic,
  setAIPaperStage,
  setAIPaperType,
  setAIPaperQuestionConfig,
  updateQuestionConfigItem,
  setListeningOrder,
  setWritingOrder,
  setAIPaperSelectedTemplate,
  setAIPaperExamScope,
  updateGeneratedPaperQuestion,
  updateGeneratedPaperQuestionOption,
  clearAIPaper
} = lessonSlice.actions;

// Selectors
export const selectLessonState = (state: { lesson: LessonState }) => state.lesson;
export const selectGeneratedPlan = (state: { lesson: LessonState }) => state.lesson.generatedPlan;
export const selectIsLoading = (state: { lesson: LessonState }) => state.lesson.isLoading;
export const selectAIPaperState = (state: { lesson: LessonState }) => state.lesson.aiPaper;

export default lessonSlice.reducer;
