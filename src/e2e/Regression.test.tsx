import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import App from '../App';
import lessonReducer from '../store/slices/lessonSlice';
import aiReducer from '../store/slices/aiSlice';
import previewReducer from '../store/slices/previewSlice';
import { geminiService } from '../services/geminiService';
import { downloadService } from '../services/downloadService';

// --- Mocks ---
vi.mock('../services/geminiService', () => ({
  geminiService: {
    generateLessonPlan: vi.fn(),
    generateLessonPlanSegmented: vi.fn(),
  },
  GeminiService: vi.fn()
}));
vi.mock('../services/downloadService', () => ({
  downloadService: {
    downloadDocx: vi.fn(),
    downloadPdf: vi.fn()
  }
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock clipboard for share/copy buttons
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
});

// --- Helpers ---
const defaultLessonState = {
  topic: '',
  duration: '',
  grade: 'Grade 3',
  words: [],
  sentences: [],
  grammar: [],
  vocabularyExtensions: '',
  teachingMethod: 'task-based',
  generatedPlan: null,
  isLoading: false,
  error: null,
  rawContent: '',
  lastSyncedAt: null,
};

const renderApp = (preloadedState: any = {}) => {
  const mergedState = {
    ...preloadedState,
    lesson: {
      ...defaultLessonState,
      ...(preloadedState.lesson || {})
    },
    // Also merge preview if needed, though simpler usually
    preview: {
      mode: 'flow',
      scale: 1.0,
      language: 'zh',
      ...(preloadedState.preview || {})
    }
  };

  const store = configureStore({
    reducer: {
      lesson: lessonReducer,
      ai: aiReducer,
      preview: previewReducer,
    } as any,
    preloadedState: mergedState
  });

  let utils: ReturnType<typeof render>;
  act(() => {
    utils = render(
      <Provider store={store}>
        <App />
      </Provider>
    );
  });
  return { ...utils!, store };
};

const createMockPlan = (topic: string) => ({
  title: `${topic} Lesson`,
  grade: "Grade 3",
  duration: 40,
  teachingMethod: "PPP",
  teachingPreparation: {
    objectives: ["Objective 1", "Objective 2"],
    keyWords: ["Word 1", "Word 2"],
    sentenceStructures: ["Sentence 1"],
    teachingAids: "Aids",
    studentAnalysis: "Analysis"
  },
  procedures: [
    `**Presentation (10 min)**\n\n**Teacher:** Teacher says hello\n**Students:** Students listen\n\n*Justification: Engage*`,
    `**Practice (15 min)**\n\n**Teacher:** Teacher guides\n**Students:** Students practice\n\n*Justification: Apply*`,
    `**Production (10 min)**\n\n**Teacher:** Teacher monitors\n**Students:** Students create\n\n*Justification: Consolidate*`,
    `**Review (5 min)**\n\n**Teacher:** Teacher reviews\n**Students:** Students answer\n\n*Justification: Check*`,
    `**Homework**\n\n**Teacher:** Assign homework\n**Students:** Note down\n\n*Justification: Extend*`
  ]
});

describe('Regression Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('1. Content Generation Quality & Stability', () => {
    it('successfully renders detailed plans for 10 different topics', async () => {
      const topics = [
        'Simple Past Tense', 'Present Continuous', 'Future Tense', 
        'Animals', 'Food and Drink', 'Travel', 'Hobbies', 
        'Family', 'School Life', 'Festivals'
      ];

      const { store } = renderApp();

      for (const topic of topics) {
        const mockPlan = createMockPlan(topic);

        await act(async () => {
          store.dispatch({
            type: 'lesson/generate/fulfilled',
            payload: mockPlan
          } as any);
        });

        try {
          await waitFor(() => {
            expect(screen.getByText(`${topic} Lesson`)).toBeInTheDocument();
            expect(screen.getByText("Teacher says hello", { exact: false })).toBeInTheDocument();
            expect(screen.getAllByText(/Teaching Preparation/).length).toBeGreaterThan(0);
          }, { timeout: 2000 });
        } catch (e) {
          console.log(`Failed for topic: ${topic}`);
          const errorMsg = screen.queryByText(/Error/i);
          if (errorMsg) console.log('Error found on screen:', errorMsg.textContent);
          throw e;
        }
      }
    });
  });

  describe('2. Language Switching', () => {
    it('verifies language switching and display formats', async () => {
      const mockPlan = createMockPlan('Language Test');
      (geminiService.generateLessonPlan as any).mockResolvedValue(mockPlan);

      renderApp({
        lesson: { generatedPlan: mockPlan },
        preview: { language: 'zh' } // Start with ZH
      });

      // 1. Verify ZH Mode (Bilingual Headers)
      // Use regex to match text that might be separated by <br/> or newlines
      expect(screen.getByText(/Teaching Preparation/)).toBeInTheDocument();
      expect(screen.getByText(/教学准备/)).toBeInTheDocument();
      expect(screen.getAllByText(/Learning Objectives/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/教学目标/).length).toBeGreaterThan(0);

      // 2. Switch to EN
    const langSwitch = screen.getByRole('switch', { name: /Toggle Language/i });
    fireEvent.click(langSwitch);

      // 3. Verify EN Mode (English Only)
      // In EN mode, "Teaching Preparation" is exact match
      expect(screen.getByText('Teaching Preparation')).toBeInTheDocument();
      // Chinese characters should be gone
      expect(screen.queryByText(/教学准备/)).not.toBeInTheDocument();
      
      // Check Objectives again - should be English only
      expect(screen.getByText('Learning Objectives')).toBeInTheDocument();
      expect(screen.queryByText(/教学目标/)).not.toBeInTheDocument();
    });
  });

  describe('3. Download Functionality Regression', () => {
    it('verifies Word and PDF download with correct data', async () => {
      const mockPlan = createMockPlan('Download Test');
      renderApp({
        lesson: { generatedPlan: mockPlan }
      });

      // Open Download Menu
      const downloadBtn = screen.getByTitle('Download');
      fireEvent.click(downloadBtn);

      // Download Word
      // Use exact text match for Chinese (default) to avoid matching "Key Words"
      const wordBtn = screen.getByText('Word版本');
      await act(async () => {
        fireEvent.click(wordBtn);
      });
      expect(downloadService.downloadDocx).toHaveBeenCalled();
      const docxArgs = (downloadService.downloadDocx as any).mock.calls[0];
      expect(docxArgs[0]).toEqual(mockPlan);

      // Re-open and Download PDF
      fireEvent.click(downloadBtn);
      const pdfBtn = await screen.findByText('PDF版本');
      await act(async () => {
        fireEvent.click(pdfBtn);
      });
      expect(downloadService.downloadPdf).toHaveBeenCalled();
      const pdfArgs = (downloadService.downloadPdf as any).mock.calls[0];
      expect(pdfArgs[0]).toEqual(mockPlan);
    });
  });

  describe('4. UI & Layout Regression', () => {
    it('verifies essential UI elements and cleanliness', async () => {
      const mockPlan = createMockPlan('UI Test');
      renderApp({
        lesson: { generatedPlan: mockPlan }
      });

      // 1. Verify Functional Area (Right Bottom)
      // The Like/Bookmark buttons have been removed/replaced in the new design.
      // 我们现在验证 Share 与 Download 按钮
      const copyBtn = screen.getByTitle('Share');
      const downloadBtn = screen.getByTitle('Download');

      expect(copyBtn).toBeInTheDocument();
      expect(downloadBtn).toBeInTheDocument();

      // 2. Test Interactions
      await act(async () => {
        fireEvent.click(copyBtn);
      });
      // We assume the copy functionality is triggered.
      
      // 3. Verify Layout Cleanliness
      // Ensure no "Debug" or "Test" buttons from development exist
      expect(screen.queryByText(/Debug/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Test Button/i)).not.toBeInTheDocument();

      // 4. Verify Teaching Method Selector exists
      expect(screen.getByRole('combobox')).toBeInTheDocument();

      // Check for bottom right action area (Generate button)
      const generateBtn = screen.getByText(/生成教案|Generate Lesson Plan/);
      expect(generateBtn).toBeInTheDocument();
      
      // Button is disabled by default if topic is empty
      expect(generateBtn).toBeDisabled();

      // Enable it by typing a topic
       const topicInput = screen.getByPlaceholderText(/全球的孩子们|Children in the world/);
       fireEvent.change(topicInput, { target: { value: 'Test Topic' } });
       expect(generateBtn).not.toBeDisabled();
 
       // Verify responsive layout classes exist (User Request: 验证响应式设计)
       // The main form container should have grid classes for mobile/desktop
       // We look for the container that holds the Topic input
       // Reuse topicInput from above
       const formContainer = topicInput.closest('.grid');
       expect(formContainer).toHaveClass('grid-cols-1');
       expect(formContainer).toHaveClass('md:grid-cols-2');
    });
  });
});
