import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  text?: string;
  imgSrc?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10", showText = true, text = "ClassCard", imgSrc }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-10 h-10 rounded-full shadow-md overflow-hidden flex items-center justify-center" style={{ background: 'conic-gradient(from 180deg at 50% 50%, var(--primary-color), #A084FF, var(--primary-color))' }}>
        {imgSrc ? (
          <img src={imgSrc} alt="logo" className="w-full h-full object-cover" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" style={{ color: 'white' }}>
            <path d="M7 7h10M7 12h7M7 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      {showText && (
        <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {text}
        </span>
      )}
    </div>
  );
};
