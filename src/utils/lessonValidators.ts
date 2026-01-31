import { LessonPlan } from '../services/geminiService';
import * as yup from 'yup';

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  score: number; // 0-100 completeness score
}

export const validateLessonPlan = (plan: LessonPlan): ValidationResult => {
  const missingFields: string[] = [];
  let score = 100;

  // Validate Title
  if (!plan.title_zh || !plan.title_en) {
    missingFields.push('Title');
    score -= 20;
  }

  // Validate Objectives
  if (
    (!plan.teachingPreparation?.objectives_zh || plan.teachingPreparation.objectives_zh.length === 0) ||
    (!plan.teachingPreparation?.objectives_en || plan.teachingPreparation.objectives_en.length === 0)
  ) {
    missingFields.push('Learning Objectives');
    score -= 20;
  }

  // Validate Procedures
  if (!plan.procedures || plan.procedures.length === 0) {
    missingFields.push('Teaching Procedures');
    score -= 30;
  } else {
    // Check procedure steps
    const hasIncompleteSteps = plan.procedures.some(
      (proc) => (!proc.title_zh || !proc.title_en) || (!proc.content_zh || !proc.content_en)
    );
    if (hasIncompleteSteps) {
      missingFields.push('Incomplete Procedure Details');
      score -= 10;
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    score: Math.max(0, score)
  };
};

// Relaxed schemas - everything optional/nullable
export const procedureSchema = yup.object().shape({
  content: yup.string().optional().nullable(),
  title: yup.string().optional().nullable(),
  studentsOutput: yup.string().optional().nullable(),
  duration: yup.number().optional().nullable(),
});

export const lessonPlanSchema = yup.object().shape({
  title: yup.string().optional().nullable(),
  grade: yup.string().optional().nullable(),
  duration: yup.number().optional().nullable(),
  procedures: yup.array().of(yup.mixed()).optional().nullable(), 
  teachingPreparation: yup.object().optional().nullable(),
});
