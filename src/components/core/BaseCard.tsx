import React from 'react';
import { BaseCardProps } from './BaseCard.types';
import { Badge } from './Badge';
import { getThemeByGrade } from '../../styles/AppColors';
import styles from './BaseCard.module.css';
import { useLocale } from '../../hooks/useLocale';

/**
 * BaseCard Component
 * 
 * A fundamental card component that implements the "ClassCard" visual style.
 * Supports responsive layout and grade-based theming.
 */
export const BaseCard: React.FC<BaseCardProps> = ({
  grade = 'primary',
  title,
  gradeLabel,
  duration,
  children,
  onClick,
  onShare,
  onBookmark,
  onDelete,
  onDownload,
  isBookmarked,
  className = '',
  designIntent,
  justification = 'left',
  footerContent,
  isCollapsing = false,
  enableSwipe = true,
}) => {
  const theme = getThemeByGrade(grade);
  const locale = useLocale();
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [tx, setTx] = React.useState(0);
  const startXRef = React.useRef<number | null>(null);
  const draggingRef = React.useRef(false);

  // Format duration if it's a number
  const durationDisplay = typeof duration === 'number' 
    ? `${duration} min` 
    : duration;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!enableSwipe) return;
    startXRef.current = e.clientX;
    draggingRef.current = true;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!enableSwipe) return;
    if (!draggingRef.current || startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    const next = Math.min(0, Math.max(-160, dx));
    setTx(next);
  };
  const onPointerUp = () => {
    if (!enableSwipe) return;
    draggingRef.current = false;
    startXRef.current = null;
  };
  const reset = () => setTx(0);
  React.useEffect(() => {
    if (!enableSwipe) return;
    const handler = (ev: PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (tx === 0) return;
      if (!el.contains(ev.target as Node)) reset();
    };
    window.addEventListener('pointerdown', handler, { passive: true });
    return () => window.removeEventListener('pointerdown', handler as any);
  }, [tx, enableSwipe]);
  const [marked, setMarked] = React.useState(!!isBookmarked);
  React.useEffect(() => { setMarked(!!isBookmarked); }, [isBookmarked]);

  return (
    <div 
      ref={rootRef}
      className={`${styles.card} ${className}`}
      style={{
        transition: 'transform 300ms ease, opacity 280ms ease',
        transform: isCollapsing ? 'scale(0.92)' : undefined,
        opacity: isCollapsing ? 0 : 1
      }}
    >
        <div 
          ref={contentRef}
          className={styles['card-content']}
          onPointerDown={enableSwipe ? onPointerDown : undefined}
          onPointerMove={enableSwipe ? onPointerMove : undefined}
          onPointerUp={enableSwipe ? onPointerUp : undefined}
          style={{ transform: enableSwipe ? `translateX(${tx}px)` : undefined }}
        >
        <div className={styles.header}>
          <div className={styles.badge}>
            <Badge grade={grade} label={gradeLabel} />
          </div>
          <div 
            className={styles.title} 
            title={title}
            style={{ color: `var(--text-primary, #333)` }}
            onClick={onClick}
          >
            {title}
          </div>
          <div className={styles.duration}>
            <Badge grade={grade} label={durationDisplay} />
          </div>
        </div>
        {children && (
          <div className={styles.body} style={{ color: `var(--text-primary, #555)` }}>
            {children}
          </div>
        )}
        <div 
          className={styles.footer} 
          style={{ 
            padding: '0 24px 12px', 
            marginTop: '20px', 
            fontSize: '0.9em', 
            color: `var(--text-secondary, #555)`,
            textAlign: justification
          }}
        >
          <div
            style={{
              borderTop: `1px solid var(--border-color, ${theme.secondary})`,
              paddingTop: 12,
            }}
          >
            {footerContent ? (
              footerContent
            ) : (
              <>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: theme.primary }}>
                  {locale.LABEL_DESIGN_INTENT}
                </div>
                <div>
                  {designIntent || locale.LABEL_NO_INTENT}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {(onShare || onBookmark || onDelete) && (
        <div className={styles['card-buttons']}>
          {onDelete && (
            <button className={styles['card-button']} onClick={onDelete} title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 6h18M8 6v-2h8v2M6 6l1 14h10l1-14" strokeWidth="2"/>
              </svg>
            </button>
          )}
          {onBookmark && (
            <button className={styles['card-button']} onClick={() => { setMarked(v => !v); onBookmark(); }} title="Bookmark">
              <svg viewBox="0 0 24 24" fill="currentColor" className={marked ? 'text-yellow-500' : undefined}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
              </svg>
            </button>
          )}
          {onShare && (
            <button className={styles['card-button']} onClick={onShare} title="Share">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="6" cy="12" r="2" strokeWidth="2.5"/>
                <circle cx="18" cy="5" r="2" strokeWidth="2.5"/>
                <circle cx="18" cy="19" r="2" strokeWidth="2.5"/>
                <path d="M8.5 11.2L15.5 6.8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8.5 12.8L15.5 17.2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {onDownload && (
            <button className={styles['card-button']} onClick={onDownload} title="Download">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" strokeWidth="2"/>
                <path d="M12 4v10" strokeWidth="2"/>
                <path d="M8 10l4 4 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
