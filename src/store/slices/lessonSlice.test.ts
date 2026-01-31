import { describe, test, expect } from 'vitest';
import lessonReducer, { setTopic, setGeneratedPlan, updateRawContent } from './lessonSlice';
import { LessonPlan } from '@/services/geminiService';

describe('lessonSlice', () => {
  const initialState = lessonReducer(undefined, { type: '@@INIT' } as any);

  test('should handle initial state', () => {
    expect(lessonReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  test('should handle setTopic', () => {
    const actual = lessonReducer(initialState, setTopic('New Topic'));
    expect(actual.topic).toEqual('New Topic');
  });

  test('should handle setGeneratedPlan', () => {
    const plan: LessonPlan = { 
      title_zh: 'Test', 
      title_en: 'Test',
      grade: 'Grade 3',
      duration: 45, 
      teachingMethod: 'task-based',
      teachingPreparation: {
        objectives_zh: [], objectives_en: [],
        keyWords_zh: [], keyWords_en: [],
        sentenceStructures_zh: [], sentenceStructures_en: [],
        teachingAids_zh: '', teachingAids_en: '',
        studentAnalysis_zh: '', studentAnalysis_en: '',
        duration: 45
      },
      procedures: [] 
    };
    const actual = lessonReducer(initialState, setGeneratedPlan(plan));
    expect(actual.generatedPlan).toEqual(plan);
    expect(actual.error).toBeNull();
  });

  test('should handle updateRawContent', () => {
    const actual = lessonReducer(initialState, updateRawContent('OCR Text'));
    expect(actual.rawContent).toEqual('OCR Text');
    expect(actual.lastSyncedAt).not.toBeNull();
  });
});
