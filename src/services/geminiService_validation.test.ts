import { describe, it, expect } from 'vitest';
import { GeminiService } from './geminiService';
import * as yup from 'yup';

describe('GeminiService Validation Logic', () => {
  const service = new GeminiService({ useMock: false });

  // Access private method via any
  const validate = (data: any) => (service as any).validateAIResponse(data, { language: 'en' });

  const validPlan = {
    title: "Test Plan",
    grade: "Grade 3",
    duration: 45,
    teachingPreparation: {
      objectives: ["Obj 1"],
      keyWords: ["Word 1"],
      duration: 45,
      teachingAids: "Aids",
      studentAnalysis: "Analysis",
      sentenceStructures: "Structures"
    },
    procedures: [
      { step: "Step 1", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 5 },
      { step: "Step 2", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
      { step: "Step 3", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
      { step: "Step 4", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
      { step: "Step 5", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
      { step: "Step 6", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
      { step: "Step 7", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
      { step: "Step 8", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 }
    ]
  };

  it('should validate a correct lesson plan with sufficient steps', () => {
    expect(() => validate(validPlan)).not.toThrow();
  });

  it('should reject lesson plan with too few steps', () => {
    const invalidPlan = {
      ...validPlan,
      procedures: validPlan.procedures.slice(0, 4)
    };
    expect(() => validate(invalidPlan)).toThrow('Too few procedures');
  });

  it('should accept optional fields', () => {
    const extendedPlan = {
      ...validPlan,
      assessment: "Assessment",
      homework: "Homework",
      teachingPreparation: {
        ...validPlan.teachingPreparation,
        objectives_detail: {
            knowledge: ["K"],
            skills: ["S"],
            affective: ["A"]
        }
      }
    };
    expect(() => validate(extendedPlan)).not.toThrow();
  });

  it('should validate emergency fallback structure', () => {
    const fallback = (service as any).getEmergencyLessonPlan('en');
    expect(() => validate(fallback)).not.toThrow();
    expect(fallback.procedures.length).toBeGreaterThan(4);
    expect(fallback.assessment).toBeUndefined(); // Emergency plan doesn't have assessment
  });
});
