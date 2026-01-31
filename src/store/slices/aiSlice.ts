import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';

interface AIState {
  words: string[];
  sentences: string[];
  isAnalyzing: boolean;
  error: string | null;
}

const initialState: AIState = {
  words: [],
  sentences: [],
  isAnalyzing: false,
  error: null,
};

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    setAiWords(state, action: PayloadAction<string[]>) {
      state.words = action.payload;
    },
    setAiSentences(state, action: PayloadAction<string[]>) {
      state.sentences = action.payload;
    },
    setAnalyzing(state, action: PayloadAction<boolean>) {
      state.isAnalyzing = action.payload;
    },
    setAiError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setAiWords, setAiSentences, setAnalyzing, setAiError } = aiSlice.actions;

// Selectors
export const selectAiState = (state: RootState) => state.ai;
export const selectAiWords = (state: RootState) => state.ai.words;
export const selectAiSentences = (state: RootState) => state.ai.sentences;
export const selectIsAnalyzing = (state: RootState) => state.ai.isAnalyzing;

// Reselect selector for preview title calculation
// Optimizes performance by memoizing the result based on 'words' input
export const selectSuggestedTitle = createSelector(
  [selectAiWords],
  (words) => {
    if (!words || words.length === 0) return '';
    // Simple logic: Join first 3 words or use generic
    // In a real app, this might involve more complex NLP or logic
    return `Lesson about ${words.slice(0, 3).join(', ')}`;
  }
);

export default aiSlice.reducer;
