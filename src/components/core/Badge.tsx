import React from 'react';
import { GradeLevel, getThemeByGrade } from '../../styles/AppColors';

export interface BadgeProps {
  /** The grade level determines the color scheme */
  grade: GradeLevel;
  /** Text content of the badge */
  label: string;
}

export const Badge: React.FC<BadgeProps> = ({ grade, label }) => {
  const style: React.CSSProperties = {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '12px',
    backgroundColor: 'var(--secondary-color)',
    color: 'var(--primary-color)',
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: 1,
  };

  return <span style={style}>{label}</span>;
};
