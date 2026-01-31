import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import App from '../App';
import lessonReducer from '../store/slices/lessonSlice';
import previewReducer from '../store/slices/previewSlice';
import aiReducer from '../store/slices/aiSlice';
import { TEXT_ZH, TEXT_EN } from '../constants/locales';

// Mock geminiService to avoid network calls
vi.mock('../services/geminiService', () => ({
  geminiService: {
    analyzeImage: vi.fn(),
    generateLessonPlan: vi.fn(),
  },
  LessonPlan: {},
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const renderApp = (preloadedState = {}) => {
  const store = configureStore({
    reducer: {
      lesson: lessonReducer,
      preview: previewReducer,
      ai: aiReducer,
    },
    preloadedState,
  });

  return {
    ...render(
      <Provider store={store}>
        <App />
      </Provider>
    ),
    store,
  };
};

describe('Language Switching Integration Tests', () => {
  afterEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('1. 功能测试 (Functional Testing)', () => {
    it('测试开关切换是否流畅且文本正确切换', () => {
      renderApp();

      // Check Initial State (ZH)
      expect(screen.getByText(TEXT_ZH.APP_TITLE)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(TEXT_ZH.PLACEHOLDER_TOPIC)).toBeInTheDocument();
      
      const enButton = screen.getByRole('button', { name: 'English' });
      
      // Switch to EN
      fireEvent.click(enButton);
      
      // Verify Text Change
      expect(screen.getByText(TEXT_EN.APP_TITLE)).toBeInTheDocument();
      expect(screen.queryByText(TEXT_ZH.APP_TITLE)).not.toBeInTheDocument();
      
      // Verify Placeholder Change
      expect(screen.getByPlaceholderText(TEXT_EN.PLACEHOLDER_TOPIC)).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(TEXT_ZH.PLACEHOLDER_TOPIC)).not.toBeInTheDocument();
    });

    it('测试开关状态是否持久保存', () => {
      // 1. Start with ZH, switch to EN
      const { unmount } = renderApp();
      const enButton = screen.getByRole('button', { name: 'English' });
      fireEvent.click(enButton);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('language', 'en');
      
      unmount();

      // 2. Reload App simulation
      renderApp({
        preview: {
          mode: 'flow',
          scale: 1.0,
          currentPage: 1,
          totalPages: 1,
          isExporting: false,
          language: 'en'
        }
      });
      
      // Should be EN
      expect(screen.getByText(TEXT_EN.APP_TITLE)).toBeInTheDocument();
    });
  });

  describe('2. 边界测试 (Boundary Testing)', () => {
    it('快速多次切换开关', () => {
      const { store } = renderApp();
      const enButton = screen.getByRole('button', { name: 'English' });
      const zhButton = screen.getByRole('button', { name: '中文' });

      // Click 1 (ZH -> EN)
      fireEvent.click(enButton);
      expect(store.getState().preview.language).toBe('en');
      expect(screen.getByText(TEXT_EN.APP_TITLE)).toBeInTheDocument();

      // Click 2 (EN -> ZH)
      fireEvent.click(zhButton);
      expect(store.getState().preview.language).toBe('zh');
      expect(screen.getByText(TEXT_ZH.APP_TITLE)).toBeInTheDocument();
      
      // Click 3 (ZH -> EN)
      fireEvent.click(enButton);
      expect(store.getState().preview.language).toBe('en');
      expect(screen.getByText(TEXT_EN.APP_TITLE)).toBeInTheDocument();
    });

    it('测试在表单填写过程中切换语言', () => {
      renderApp();
      
      const topicInput = screen.getByPlaceholderText(TEXT_ZH.PLACEHOLDER_TOPIC);
      fireEvent.change(topicInput, { target: { value: 'My Lesson Topic' } });
      
      const enButton = screen.getByRole('button', { name: 'English' });
      fireEvent.click(enButton);
      
      // Verify language changed
      expect(screen.getByPlaceholderText(TEXT_EN.PLACEHOLDER_TOPIC)).toBeInTheDocument();
      
      // Verify value preserved
      expect(screen.getByDisplayValue('My Lesson Topic')).toBeInTheDocument();
    });
  });

  describe('3. 视觉测试 (Visual/Layout Testing)', () => {
    it('验证关键UI组件在不同语言下都存在', () => {
      const { rerender } = renderApp();
      
      const checkLayout = () => {
        const aiTexts = screen.getAllByText(/AI/);
        expect(aiTexts.length).toBeGreaterThan(0);
        const genButtons = screen.getAllByRole('button', { name: /Generate|生成/ });
        expect(genButtons.length).toBeGreaterThan(0);
        expect(screen.getByRole('combobox')).toBeInTheDocument(); // Teaching method selector
      };

      // Check ZH Layout
      checkLayout();
      
      // Switch to EN
      const enButton = screen.getByRole('button', { name: 'English' });
      fireEvent.click(enButton);
      
      // Check EN Layout
      checkLayout();
    });
  });
});
