import { ReactNode } from 'react';
import { GradeLevel } from '@/styles/AppColors';

export interface BaseCardProps {
  /**
   * The grade level determines the color theme of the card.
   * @default 'primary'
   */
  grade?: GradeLevel;

  /**
   * Title text displayed in the header.
   */
  title: string;

  /**
   * Label for the grade badge (e.g., "Grade 3", "High School").
   */
  gradeLabel: string;

  /**
   * Duration in minutes or formatted string (e.g., "45 min").
   */
  duration: string | number;

  /**
   * Content to be rendered inside the card body.
   */
  children?: ReactNode;

  /**
   * Click handler for title editing.
   */
  onClick?: () => void;

  /**
   * Action handlers for underlying button group.
   */
  onShare?: () => void;
  onBookmark?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  isBookmarked?: boolean;

  /**
   * Additional CSS class names.
   */
  className?: string;

  /**
   * Design intent text to be displayed in the footer.
   */
  designIntent?: string;

  /**
   * Custom footer content to replace the default design intent footer.
   */
  footerContent?: ReactNode;

  /**
   * Alignment of the design intent/footer content.
   */
  justification?: 'left' | 'center' | 'right';

  /**
   * Collapse animation flag for the entire card.
   */
  isCollapsing?: boolean;

  /**
   * Whether swipe-to-reveal actions are enabled.
   * Defaults to true for most cards, but can be disabled for simple layouts.
   */
  enableSwipe?: boolean;
}

export type { BaseCardProps as default };
