import { describe, it, expect } from 'vitest';
import { validateLessonPlan } from './lessonValidators';
import { LessonPlan } from '../services/geminiService';

describe('validateLessonPlan', () => {
  const completePlan: LessonPlan = {
    title_zh: 'Test Lesson',
    title_en: 'Test Lesson',
    grade: 'Grade 3',
    duration: 40,
    teachingMethod: 'PPP',
    teachingPreparation: {
      objectives_zh: ['Obj 1'],
      objectives_en: ['Obj 1'],
      keyWords_zh: ['Word 1'],
      keyWords_en: ['Word 1'],
      sentenceStructures_zh: ['SVO'],
      sentenceStructures_en: ['SVO'],
      duration: 40,
      teachingAids_zh: 'Board',
      teachingAids_en: 'Board',
      studentAnalysis_zh: 'Analysis',
      studentAnalysis_en: 'Analysis'
    },
    procedures: [
      { title_zh: 'Step 1', title_en: 'Step 1', content_zh: 'Content', content_en: 'Content', duration: 5 },
      { title_zh: 'Step 2', title_en: 'Step 2', content_zh: 'Content', content_en: 'Content', duration: 5 },
      { title_zh: 'Step 3', title_en: 'Step 3', content_zh: 'Content', content_en: 'Content', duration: 5 },
      { title_zh: 'Step 4', title_en: 'Step 4', content_zh: 'Content', content_en: 'Content', duration: 5 },
      { title_zh: 'Step 5', title_en: 'Step 5', content_zh: 'Content', content_en: 'Content', duration: 5 }
    ]
  };

  it('should validate a complete plan', () => {
    const result = validateLessonPlan(completePlan);
    expect(result.isValid).toBe(true);
    expect(result.score).toBe(100);
    expect(result.missingFields).toHaveLength(0);
  });

  it('should identify missing title', () => {
    const plan = { ...completePlan, title_zh: '' };
    const result = validateLessonPlan(plan);
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Title');
    expect(result.score).toBeLessThan(100);
  });

  it('should identify missing objectives', () => {
    const plan = { 
      ...completePlan, 
      teachingPreparation: { ...completePlan.teachingPreparation, objectives_zh: [] } 
    };
    const result = validateLessonPlan(plan);
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Learning Objectives');
  });

  it('should identify empty procedures', () => {
    const plan = { ...completePlan, procedures: [] };
    const result = validateLessonPlan(plan);
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Teaching Procedures');
  });

  it('should identify incomplete steps in procedures', () => {
    const plan = { 
      ...completePlan, 
      procedures: [
        { title_zh: '', title_en: '', content_zh: '', content_en: '', duration: 0 }
      ]
    };
    const result = validateLessonPlan(plan);
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Incomplete Procedure Details');
  });
});
