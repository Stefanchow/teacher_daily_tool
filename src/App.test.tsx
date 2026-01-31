import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import './test/setup';
import App from './App';
import { 
  default as lessonReducer,
  setGeneratedPlan,
} from './store/slices/lessonSlice';
import previewReducer from './store/slices/previewSlice';
import aiReducer from './store/slices/aiSlice';
import { geminiService } from './services/geminiService';
import { TEXT_ZH } from './constants/locales';

// Mock geminiService
vi.mock('./services/geminiService', () => {
  const mockGenerateLessonPlan = vi.fn();
  const mockAnalyzeImage = vi.fn();
  const mockUpdateModel = vi.fn();
  const mockFillTemplate = vi.fn();

  class MockGeminiService {
    model = 'gemini-1.5-flash-latest';
    generateLessonPlan = mockGenerateLessonPlan;
    analyzeImage = mockAnalyzeImage;
    updateModel = mockUpdateModel;
    fillTemplate = mockFillTemplate;
  }

  return {
    GeminiService: MockGeminiService,
    geminiService: new MockGeminiService(),
  };
});

// Mock ResizeObserver
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Safe Text Access Helper
const getSafeText = (key: string) => {
  try {
    return TEXT_ZH[key as keyof typeof TEXT_ZH] || key;
  } catch {
    return key;
  }
};

// Helper to render with Redux
const renderWithRedux = (component: React.ReactElement) => {
  const store = configureStore({
    reducer: {
      lesson: lessonReducer,
      preview: previewReducer,
      ai: aiReducer,
    },
  });
  let utils: ReturnType<typeof render>;
  act(() => {
    utils = render(<Provider store={store}>{component}</Provider>);
  });
  return { ...utils!, store };
};

describe('App Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    cleanup();
  });

  test('renders initial layout elements', () => {
    renderWithRedux(<App />);
    
    expect(screen.getByText(getSafeText('APP_TITLE'))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(getSafeText('PLACEHOLDER_TOPIC'))).toBeInTheDocument();
    expect(screen.getByText(getSafeText('BUTTON_GENERATE'))).toBeInTheDocument();
    // AI section is always present
    expect(screen.getByText('AI 辅助输入')).toBeInTheDocument();
  });

  test('switches language correctly', async () => {
    renderWithRedux(<App />);

    // Initial State (ZH)
    expect(screen.getByText('年级 (Grade)')).toBeInTheDocument();
    expect(screen.getByText('中文')).toBeInTheDocument(); // Segmented control label

    // Switch to EN
    const enButton = screen.getByRole('button', { name: 'English' });
    fireEvent.click(enButton);

    // Verify EN state
    expect(screen.getByText('Grade')).toBeInTheDocument();
    expect(screen.getByText('Lesson Topic')).toBeInTheDocument();
    
    // Switch back to ZH
    const zhButton = screen.getByRole('button', { name: '中文' });
    fireEvent.click(zhButton);
    expect(screen.getByText('年级 (Grade)')).toBeInTheDocument();
  });

  test('switches theme and updates background image', async () => {
    renderWithRedux(<App />);

    // Initial State (Default Theme)
    const themeBtn = screen.getByRole('button', { name: /Switch Theme/i });
    expect(themeBtn).toBeInTheDocument();
    expect(themeBtn).toHaveAttribute('title', expect.stringMatching(/默认 \(Default\)/));

    // Verify initial CSS variable (Default theme bg image)
    expect(document.documentElement.style.getPropertyValue('--bg-image')).toContain('linear-gradient');

    // Click to switch theme (Default -> Memphis)
    fireEvent.click(themeBtn);

    // Verify button text update
    await waitFor(() => {
      expect(themeBtn).toHaveAttribute('title', expect.stringMatching(/孟菲斯 \(Memphis\)/));
    });

    // Verify CSS variable update (Memphis theme applies weekly gradient variation)
    const bgImage = document.documentElement.style.getPropertyValue('--bg-image');
    expect(bgImage).toContain('gradient');
  });

  test('handles generate flow successfully', async () => {
    const mockPlan = {
      title: 'Mock Lesson',
      grade: 'Grade 3',
      duration: 45,
      teachingPreparation: {
        objectives: ['Test Obj'],
        keyWords: ['Test Words'],
        teachingAids: 'Test Aids',
        studentAnalysis: 'Test Analysis',
        sentenceStructures: 'Test Structures',
        audienceAnalysis: [{ ageRange: '8-9' }],
        duration: 45
      },
      procedures: [
        { 
          step: 'Step 1', 
          teachersTalk: 'Hello', 
          studentsOutput: 'Hi', 
          justification: 'Greeting', 
          duration: 5 
        }
      ]
    };
    
    (geminiService.generateLessonPlan as any).mockResolvedValue(mockPlan);

    renderWithRedux(<App />);
    
    const input = screen.getByPlaceholderText(getSafeText('PLACEHOLDER_TOPIC'));
    fireEvent.change(input, { target: { value: 'Test Topic' } });
    
    const button = screen.getByText(getSafeText('BUTTON_GENERATE'));
    fireEvent.click(button);
    
    expect(screen.getByText(getSafeText('BUTTON_GENERATING'))).toBeInTheDocument();
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(getSafeText('BUTTON_GENERATING'))).not.toBeInTheDocument();
    });

    // Check for elements that appear in the Professional View (LessonPlanCard)
    // BaseCard renders title combined with grade
    const titles = await screen.findAllByText(/Mock Lesson/, { exact: false });
    expect(titles[0]).toBeInTheDocument();
    expect(await screen.findByText(/Teaching Preparation/)).toBeInTheDocument();
  });
});
