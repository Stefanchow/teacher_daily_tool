import React from 'react';

export const Spinner = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <span className={`relative inline-flex items-center justify-center ${className}`} style={{ width: '1.5rem', height: '1.5rem', ...style }}>
    <svg className="absolute animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span
      className="absolute rounded-full border-2"
      style={{
        width: '1.1rem',
        height: '1.1rem',
        borderColor: 'rgba(255,255,255,0.9)',
        borderTopColor: 'transparent',
        animation: 'spin 0.9s linear infinite reverse',
      }}
    />
  </span>
);
