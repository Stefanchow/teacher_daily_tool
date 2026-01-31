/**
 * AppColors - Global Color Management System
 * 
 * Implements the Morandi color palette for different grade levels.
 * Design Spec: v2.3
 */

export const AppColors = {
  /**
   * Primary Grade (小学) - Morandi Theme
   */
  primarySchool: {
    /** Main action color: Morandi Green */
    primary: '#C5D8B5',
    /** Secondary accent: Morandi Blue */
    secondary: '#A5B4C5',
    /** Background tint: Morandi Pink (Soft) */
    background: '#F9F4F4', // Adjusted light tint of #D8B5B5
    /** Text color on primary background */
    textOnPrimary: '#333333',
  },

  /**
   * Morandi Palette Definitions (Global)
   */
  morandi: {
    blue: '#A5B4C5',
    pink: '#D8B5B5',
    green: '#C5D8B5',
  },

  /**
   * Middle School (初中) - Warm & Balanced
   */
  middleSchool: {
    /** Main action color: Morandi Blue */
    primary: '#A5B4C5',
    /** Secondary accent: Warm Grey */
    secondary: '#A8A8A8',
    /** Background tint */
    background: '#FDFBF7',
    /** Text color on primary background */
    textOnPrimary: '#FFFFFF',
  },

  /**
   * High School (高中) - Professional & Calm
   */
  highSchool: {
    /** Main action color: Morandi Pink */
    primary: '#D8B5B5',
    /** Secondary accent: Slate */
    secondary: '#5D6D7E',
    /** Background tint */
    background: '#F4F6F7',
    /** Text color on primary background */
    textOnPrimary: '#FFFFFF',
  },

  /**
   * Common Neutral Colors
   */
  neutral: {
    white: '#FFFFFF',
    textPrimary: '#333333',
    textSecondary: '#666666',
    border: '#E0E0E0',
    shadow: 'rgba(0, 0, 0, 0.08)',
  },
} as const;

/**
 * Helper to get color scheme by grade level string
 */
export type GradeLevel = 'primary' | 'middle' | 'high';

export const getThemeByGrade = (grade: GradeLevel) => {
  switch (grade) {
    case 'primary': return AppColors.primarySchool;
    case 'middle': return AppColors.middleSchool;
    case 'high': return AppColors.highSchool;
    default: return AppColors.primarySchool;
  }
};
