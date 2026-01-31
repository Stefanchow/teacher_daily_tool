import React from 'react';

interface InputLabelProps {
  label: string;
  icon: React.ReactNode;
  hasValue: boolean;
  rightContent?: React.ReactNode;
}

export const InputLabel: React.FC<InputLabelProps> = ({ label, icon, hasValue, rightContent }) => (
  <div className="flex items-center justify-between mb-2">
    <label className="flex items-center gap-2 text-sm font-bold tracking-wide transition-colors force-text-primary">
      <span className="text-lg flex items-center justify-center transition-colors force-text-primary">{icon}</span>
      {label}
    </label>
    {rightContent ? (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border">
        {rightContent}
      </span>
    ) : hasValue && (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-fade-in border" style={{ color: '#059669', backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }}>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
        Ready
      </span>
    )}
  </div>
);
