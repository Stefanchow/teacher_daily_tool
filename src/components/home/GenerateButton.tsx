import React from 'react';
import styles from './GenerateButton.module.css';
import { WaveLoading } from '../ui/WaveLoading';

interface GenerateButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  onCancel?: () => void;
}

export const GenerateButton: React.FC<GenerateButtonProps> = ({ 
  isLoading = false, 
  onCancel, 
  className,
  ...props 
}) => {
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <WaveLoading />
          {onCancel && (
            <button 
              className={styles.cancelButton} 
              onClick={onCancel}
              aria-label="Cancel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button 
        className={`${styles.button} ${className || ''}`} 
        {...props}
      >
        生成教案
      </button>
    </div>
  );
};
