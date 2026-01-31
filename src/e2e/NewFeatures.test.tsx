import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import App from '../App';
import lessonReducer from '../store/slices/lessonSlice';
import aiReducer from '../store/slices/aiSlice';
import previewReducer from '../store/slices/previewSlice';
import { geminiService } from '../services/geminiService';
import { downloadService } from '../services/downloadService';
import { TEXT_ZH } from '../constants/locales';

// Mocks
vi.mock('../services/geminiService');
vi.mock('../services/downloadService', () => ({
  downloadService: {
    downloadDocx: vi.fn(),
    downloadPdf: vi.fn()
  }
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

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

const renderApp = (preloadedState = {}) => {
  const store = configureStore({
    reducer: {
      lesson: lessonReducer,
      ai: aiReducer,
      preview: previewReducer,
    },
    preloadedState
  });

  return {
    ...render(
      <Provider store={store}>
        <App />
      </Provider>
    ),
    store
  };
};

describe('Comprehensive Feature Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('1. TTT Teaching Method', () => {
    it('generates TTT structured lesson plan', async () => {
      const mockPlan = {
        title: "TTT Lesson Demo",
        grade: "Grade 4",
        duration: 40,
        teachingPreparation: {
          objectives: ["Obj 1"],
          keyWords: ["Word 1"],
          sentenceStructures: ["Sentence 1"],
          teachingAids: ["Aid 1"]
        },
        procedures: [
          { step: "Test 1: Diagnostic", teachersTalk: "T1", studentsOutput: "S1", justification: "Check", duration: 10 },
          { step: "Teach: Instruction", teachersTalk: "T2", studentsOutput: "S2", justification: "Fill", duration: 20 },
          { step: "Test 2: Practice", teachersTalk: "T3", studentsOutput: "S3", justification: "Verify", duration: 10 }
        ]
      };

      (geminiService.generateLessonPlan as any).mockResolvedValue(mockPlan);

      renderApp();

      // 1. Fill Form
      fireEvent.change(screen.getByPlaceholderText(TEXT_ZH.PLACEHOLDER_TOPIC), { target: { value: 'TTT Demo' } });
      fireEvent.change(screen.getByPlaceholderText(TEXT_ZH.PLACEHOLDER_DURATION), { target: { value: '40' } });
      
      // 2. Select TTT
      const methodSelect = screen.getByRole('combobox');
      fireEvent.change(methodSelect, { target: { value: 'TTT' } });

      // 3. Generate
      // Button text might be dynamic based on loading, checking initial state
      const generateBtn = screen.getByText(TEXT_ZH.BUTTON_GENERATE);
      fireEvent.click(generateBtn);

      // 4. Verify Loading
      expect(screen.getByText(TEXT_ZH.BUTTON_GENERATING)).toBeInTheDocument();

      // 5. Verify Result
      await waitFor(() => {
        expect(screen.getByText('TTT Lesson Demo')).toBeInTheDocument();
      });

      expect(screen.getByText('Test 1: Diagnostic')).toBeInTheDocument();
      expect(screen.getByText('Teach: Instruction')).toBeInTheDocument();
      expect(screen.getByText('Test 2: Practice')).toBeInTheDocument();
    });
  });

  describe('2. Lesson Plan Completeness', () => {
    it('verifies all sections are present in generated plan', async () => {
       const mockPlan = {
        title: "Complete Lesson",
        grade: "Grade 5",
        duration: 45,
        teachingPreparation: {
          objectives: ["Learn X"],
          keyWords: ["Apple"],
          sentenceStructures: ["I like..."],
          teachingAids: ["Cards"]
        },
        procedures: [
          { step: "Step 1", teachersTalk: "Hi", studentsOutput: "Hello", justification: "Warm up", duration: 5 }
        ]
      };
      (geminiService.generateLessonPlan as any).mockResolvedValue(mockPlan);

      renderApp();
      
      // Trigger generation
      fireEvent.change(screen.getByPlaceholderText(TEXT_ZH.PLACEHOLDER_TOPIC), { target: { value: 'Test' } });
      fireEvent.click(screen.getByText(TEXT_ZH.BUTTON_GENERATE));

      await waitFor(() => expect(screen.getByText('Complete Lesson')).toBeInTheDocument());

      // Verify Sections
      // Note: Header text might depend on the implementation of LessonPlanCard/FlowView
      // Checking for content presence is safer if exact headers are dynamic or iconic
      expect(screen.getByText('Learn X')).toBeInTheDocument();
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText(/Warm up/i)).toBeInTheDocument(); // Justification
    });
  });

  describe('3. Download Functionality', () => {
    it('triggers Word and PDF download services', async () => {
      const mockPlan = {
        title: "Download Test",
        grade: "G1",
        duration: 45,
        teachingPreparation: {},
        procedures: []
      };
      
      // Pre-load state
      renderApp({
        lesson: {
          generatedPlan: mockPlan,
          topic: 'Test',
          duration: 45,
          grade: 'G1',
          teachingMethod: 'task-based',
          words: [],
          sentences: [],
          grammar: [],
          vocabularyExtensions: [],
          isLoading: false,
          error: null
        },
        preview: {
          mode: 'flow',
          scale: 1.0,
          currentPage: 1,
          totalPages: 1,
          isExporting: false,
          language: 'zh'
        }
      });

      // Find Download Button
      const downloadMenuBtn = screen.getByTitle('Download');
      fireEvent.click(downloadMenuBtn);

      // Check options visibility
      const wordOption = screen.getByText('Word版本');
      const pdfOption = screen.getByText('PDF版本');
      expect(wordOption).toBeInTheDocument();
      expect(pdfOption).toBeInTheDocument();

      // Test Word
      fireEvent.click(wordOption);
      expect(downloadService.downloadDocx).toHaveBeenCalledWith(mockPlan);

      // Wait for menu to close
      await waitFor(() => {
        expect(screen.queryByText('Word版本')).not.toBeInTheDocument();
      });

      // Re-open menu (it closes after click)
      fireEvent.click(downloadMenuBtn);
      
      // Test PDF
      const pdfOption2 = await screen.findByText('PDF版本');
      fireEvent.click(pdfOption2);
      expect(downloadService.downloadPdf).toHaveBeenCalledWith(mockPlan);
    });
  });

  describe('4. UI/UX Interactions', () => {
    it('toggles Bookmark button', () => {
       const mockPlan = { title: "UI Test", grade: "G1", duration: 45, procedures: [] };
       renderApp({
        lesson: { 
          generatedPlan: mockPlan, 
          isLoading: false, 
          error: null,
          words: [],
          sentences: [],
          grammar: [],
          vocabularyExtensions: [],
          topic: '',
          duration: 40,
          grade: '',
          teachingMethod: 'task-based'
        }
       });

       const bookmarkBtn = screen.getByTitle('Bookmark');
       
       fireEvent.click(bookmarkBtn);
       const bookmarkSvg = bookmarkBtn.querySelector('svg');
       expect(bookmarkSvg).toHaveClass('text-yellow-500');
    });

    it('validates dropdown menu interaction', () => {
        // Test dropdown functionality (Teaching Method Selector)
        renderApp();
        const select = screen.getByRole('combobox');
        
        // Verify default or initial state if needed
        
        // Change selection
        fireEvent.change(select, { target: { value: 'project-based' } });
        expect(select).toHaveValue('project-based');
    });
  });
});
