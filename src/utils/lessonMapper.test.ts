import { describe, it, expect } from 'vitest';
import { parseMarkdownProcedures, mapLessonPlanToCardData } from './lessonMapper';
import { LessonPlan } from '../services/geminiService';

describe('lessonMapper', () => {
  describe('mapLessonPlanToCardData', () => {
    it('should handle immutable/frozen input objects without throwing', () => {
      const immutablePlan = Object.freeze({
        // Missing title and duration to trigger default logic
        procedures: [],
        grade: 'primary',
        teachingPreparation: 'None'
      } as unknown as LessonPlan);

      expect(() => {
        mapLessonPlanToCardData(immutablePlan);
      }).not.toThrow();

      const result = mapLessonPlanToCardData(immutablePlan);
      // formatTitle appends grade: "Title / Grade"
      expect(result.title).toBe('未命名教案 / primary');
      expect(result.duration).toBe(45);
    });

    it('should use provided values when present', () => {
      const plan: LessonPlan = {
        title: 'My Lesson',
        duration: 60,
        procedures: [],
        grade: 'primary',
        teachingPreparation: 'Prep'
      } as any;

      const result = mapLessonPlanToCardData(plan);
      expect(result.title).toBe('My Lesson / primary');
      expect(result.duration).toBe(60);
    });
  });

  describe('parseMarkdownProcedures', () => {
    it('should separate title and content correctly', () => {
      const input = [
        '**Step 1: Warm-up**\n\nTeacher says hello.\nStudents say hello back.'
      ];
      
      const result = parseMarkdownProcedures(input);
      
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Step 1: Warm-up');
      expect(result[0].content).toBe('Teacher says hello.\nStudents say hello back.');
    });

    it('should handle title only', () => {
      const input = ['**Step 1**'];
      const result = parseMarkdownProcedures(input);
      expect(result[0].title).toBe('Step 1');
      expect(result[0].content).toBe('**Step 1**'); // Fallback to full text if no content
    });

    it('should handle missing title line', () => {
        // This case is tricky as we assume first line is title. 
        // If there is no newline, it treats the whole thing as title (and content fallback).
        const input = ['Just content'];
        const result = parseMarkdownProcedures(input);
        expect(result[0].title).toBe('Just content');
        expect(result[0].content).toBe('Just content');
    });

    it('should handle complex markdown', () => {
      const input = [
        '**Step 1**\n\n* Note 1\n* Note 2\n\n> Quote'
      ];
      const result = parseMarkdownProcedures(input);
      expect(result[0].title).toBe('Step 1');
      expect(result[0].content).toBe('* Note 1\n* Note 2\n\n> Quote');
    });

    it('should preserve Chinese headers if they exist', () => {
      const input = [
        '**Step 1: Introduction (5 min)**\n\n**教师行为**: Teacher does X.\n**学生反应**: Student does Y.'
      ];
      const result = parseMarkdownProcedures(input, 'en');
      expect(result[0].content).toContain('**教师行为**: Teacher does X.');
      expect(result[0].content).toContain('**学生反应**: Student does Y.');
    });
  
    it('should preserve English headers', () => {
      const input = [
        '**Step 1: Introduction (5 min)**\n\n**Teacher\'s Actions**: Teacher does X.\n**Students\' Responses**: Student does Y.'
      ];
      const result = parseMarkdownProcedures(input, 'en');
      expect(result[0].content).toContain('**Teacher\'s Actions**: Teacher does X.');
      expect(result[0].content).toContain('**Students\' Responses**: Student does Y.');
    });

    it('should handle BilingualProcedure input for English', () => {
        const input = [{
            title_zh: '步骤1',
            title_en: 'Step 1',
            content_zh: '中文内容',
            content_en: 'English Content',
            duration: 5
        }];
        const result = parseMarkdownProcedures(input, 'en');
        expect(result[0].title).toBe('Step 1');
        expect(result[0].content).toBe('English Content');
        expect(result[0].duration).toBe(5);
    });

    it('should handle BilingualProcedure input for Chinese', () => {
        const input = [{
            title_zh: '步骤1',
            title_en: 'Step 1',
            content_zh: '中文内容',
            content_en: 'English Content',
            duration: 5
        }];
        const result = parseMarkdownProcedures(input, 'zh');
        expect(result[0].title).toBe('步骤1');
        expect(result[0].content).toBe('中文内容');
        expect(result[0].duration).toBe(5);
    });
  });
});
