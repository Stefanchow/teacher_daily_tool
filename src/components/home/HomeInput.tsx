import React from 'react';
import styles from './HomeInput.module.css';

interface HomeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Extend standard input props
}

export const HomeInput: React.FC<HomeInputProps> = (props) => {
  return (
    <div className={styles.container}>
      <input
        className={styles.input}
        placeholder="输入您的教学主题或课文..."
        {...props}
      />
    </div>
  );
};
