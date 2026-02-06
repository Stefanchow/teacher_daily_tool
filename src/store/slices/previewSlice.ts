import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type PreviewMode = 'table' | 'flow';

interface PreviewState {
  mode: PreviewMode;
  scale: number;
  currentPage: number;
  totalPages: number;
  isExporting: boolean;
  language: 'zh' | 'en';
}

const getInitialLanguage = (): 'zh' | 'en' => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const lang = localStorage.getItem('language');
      if (lang === 'zh' || lang === 'en') {
        return lang;
      }
    }
  } catch (e) {
    console.warn('Failed to read language from localStorage:', e);
  }
  return 'zh';
};

const initialState: PreviewState = {
  mode: 'flow',
  scale: 1.0,
  currentPage: 1,
  totalPages: 1,
  isExporting: false,
  language: getInitialLanguage(),
};

const previewSlice = createSlice({
  name: 'preview',
  initialState,
  reducers: {
    setPreviewMode(state, action: PayloadAction<PreviewMode>) {
      state.mode = action.payload;
    },
    setScale(state, action: PayloadAction<number>) {
      state.scale = Math.max(0.5, Math.min(2.0, action.payload));
    },
    setCurrentPage(state, action: PayloadAction<number>) {
      state.currentPage = Math.max(1, Math.min(state.totalPages, action.payload));
    },
    setTotalPages(state, action: PayloadAction<number>) {
      state.totalPages = action.payload;
      if (state.currentPage > state.totalPages) {
        state.currentPage = state.totalPages;
      }
    },
    setIsExporting(state, action: PayloadAction<boolean>) {
      state.isExporting = action.payload;
    },
    setLanguage(state, action: PayloadAction<'zh' | 'en'>) {
      state.language = action.payload;
    },
  },
});

export const { 
  setPreviewMode, 
  setScale, 
  setCurrentPage, 
  setTotalPages, 
  setIsExporting,
  setLanguage,
} = previewSlice.actions;

// Selectors
export const selectPreviewMode = (state: { preview: PreviewState }) => state.preview.mode;
export const selectPreviewScale = (state: { preview: PreviewState }) => state.preview.scale;
export const selectLanguage = (state: { preview: PreviewState }) => state.preview.language;

export default previewSlice.reducer;
