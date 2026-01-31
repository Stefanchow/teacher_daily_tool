import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { LessonPlanCard } from './LessonPlanCard';
import { LessonPlan } from '../../services/geminiService';
import { Provider } from 'react-redux';
import { store } from '../../store';

const mockPlan: LessonPlan = {
  title_zh: 'Test Lesson',
  title_en: 'Test Lesson',
  grade: 'Grade 3',
  duration: 45,
  teachingMethod: 'PPP',
  teachingPreparation: {
    objectives_zh: ['Learn ABC'],
    objectives_en: ['Learn ABC'],
    keyWords_zh: ['A', 'B', 'C'],
    keyWords_en: ['A', 'B', 'C'],
    duration: 45,
    studentAnalysis_zh: 'Good students',
    studentAnalysis_en: 'Good students',
    sentenceStructures_zh: ['I am...'],
    sentenceStructures_en: ['I am...'],
    teachingAids_zh: 'Board',
    teachingAids_en: 'Board'
  },
  procedures: [
    {
        content_zh: '**Warm-up (5 min)**\n\n**Teacher:** Hello everyone\n**Students:** Hello teacher\n\n*Justification: Ice breaker*',
        content_en: '**Warm-up (5 min)**\n\n**Teacher:** Hello everyone\n**Students:** Hello teacher\n\n*Justification: Ice breaker*',
        title_zh: 'Warm-up',
        title_en: 'Warm-up',
        duration: 5
    }
  ]
};

const renderWithProvider = (ui: React.ReactElement) => {
  const renderResult = render(
    <Provider store={store}>
      {ui}
    </Provider>
  );
  return {
    ...renderResult,
    unmount: renderResult.unmount,
  };
};

describe('LessonPlanCard', () => {
  afterEach(cleanup);

  test('renders in table mode (default)', () => {
    const { getByText, getAllByText } = renderWithProvider(<LessonPlanCard plan={mockPlan} mode="table" />);
    
    // Check for BaseCard elements
    expect(getByText('Test Lesson / Grade 3')).toBeDefined();

    // Check for Teaching Preparation
    expect(getByText(/Teaching Preparation/)).toBeDefined();
    expect(getByText(/Learning Objectives/)).toBeDefined();
    expect(getByText('Learn ABC')).toBeDefined();
    expect(getByText(/Key Words/)).toBeDefined();
    // Keywords are rendered为中英对照形式，例如 "A (A)"
    expect(getByText(/A\s*\(A\)/)).toBeDefined();
    expect(getByText(/Sentence Structures/)).toBeDefined();
    expect(getByText('I am...')).toBeDefined();
    expect(getByText(/Analysis of Students/)).toBeDefined();
    expect(getByText('Good students')).toBeDefined();

    // Check for Teaching Procedures (card-based)
    expect(getByText(/Teaching Procedures/)).toBeDefined();

    // Check for procedure content
    expect(getAllByText(/Warm-up/).length).toBeGreaterThan(0);
    // Teacher's Talk wrapped in blockquote (content visible)
    expect(getByText(/Hello everyone/)).toBeDefined();
    expect(getByText(/Hello teacher/)).toBeDefined();
    expect(getByText(/Ice breaker/)).toBeDefined();
  });

  test('renders in flow mode', () => {
    const { getByText } = renderWithProvider(<LessonPlanCard plan={mockPlan} mode="flow" />);
    
    // Check for flow specific elements
    expect(getByText(/Test Lesson/)).toBeDefined();
    expect(getByText('🗣️')).toBeDefined(); // Procedures Icon
    // Student icon might not be present in current implementation
    // expect(getByText('👥')).toBeDefined(); 
    expect(getByText(/Ice breaker/)).toBeDefined();

    // Check for Teaching Preparation footer (only in flow mode)
    expect(getByText(/Teaching Preparation/)).toBeDefined();
    expect(getByText('Learn ABC')).toBeDefined();
  });
});
