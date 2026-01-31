import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useSelector } from 'react-redux';
import { BaseCard } from '../core/BaseCard';
import { LessonPlan } from '../../services/geminiService';
import { mapLessonPlanToCardData } from '../../utils/lessonMapper';
import { PreviewMode, selectLanguage } from '../../store/slices/previewSlice';
import { useLocale } from '../../hooks/useLocale';
import { downloadService } from '../../services/downloadService';

interface LessonPlanCardProps {
  plan: LessonPlan;
  className?: string;
  mode?: PreviewMode;
  onRegenerate?: () => void;
  subject?: '英语' | '数学' | '语文';
  functionType?: '教案生成' | '阅读课' | '课堂活动' | '活动课' | '文学鉴赏' | '教材中心' | 'AI 组卷';
  onBookmark?: () => void;
  onShare?: () => void;
  isBookmarked?: boolean;
  onCollapse?: () => void;
  hideFooter?: boolean;
}

const formatList = (data: unknown): string => {
  if (Array.isArray(data)) {
    return data.join('\n');
  }
  return typeof data === 'string' ? data : '';
};

const containsLatex = (s: string) => /\$.*?\$|\\\(|\\\)|\\\[|\\\]|\\frac|\\sqrt|\\sum|\\int|\\alpha|\\beta|\\gamma|\\cdot|\\times/.test(s);
const ensureMathJax = async () => {
  if ((window as any).MathJax) return;
  await new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js';
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

const MDWithMath: React.FC<{ text: string }> = ({ text }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const work = async () => {
      if (!text || !containsLatex(text)) return;
      await ensureMathJax();
      const mj = (window as any).MathJax;
      if (mj && typeof mj.typesetPromise === 'function' && ref.current) {
        await mj.typesetPromise([ref.current]);
      }
    };
    work();
  }, [text]);
  return (
    <div ref={ref}>
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
};

export const LessonPlanCard: React.FC<LessonPlanCardProps> = ({ plan, className, mode, onRegenerate, subject, functionType, onBookmark, onShare, isBookmarked, onCollapse, hideFooter }) => {
  const locale = useLocale();
  const currentLanguage = useSelector(selectLanguage);
  
  // Use mapper to get safe props
  // Pass currentLanguage to support bilingual content switching
  const cardData = mapLessonPlanToCardData(plan, undefined, undefined, currentLanguage);
  const isMathActivityZh = currentLanguage === 'zh' && subject === '数学' && functionType === '课堂活动';
  const labelObjectivesTitle = isMathActivityZh ? '教学目标\nLearning Objectives' : locale.LABEL_OBJECTIVES_TITLE;
  const labelKeywordsTitle = isMathActivityZh ? '核心知识点 (Key Points)' : ((locale as any).LABEL_KEY_WORDS_TITLE || locale.LABEL_KEYWORDS);
  const labelSentencesTitle = ((locale as any).LABEL_SENTENCES_TITLE || (locale as any).sentenceStructures || 'Sentence Structures');
  
  const [copied, setCopied] = React.useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = React.useState(false);

  const handleCopy = async () => {
    try {
      const text = [
        `Title: ${cardData.title}`,
        `Duration: ${cardData.duration} min`,
        '',
        '--- Teaching Preparation ---',
        `${isMathActivityZh ? '教学目标 (Learning Objectives)' : 'Objectives'}:\n${formatList(cardData.teachingPreparation?.objectives)}`,
        `${isMathActivityZh ? '核心知识点 (Key Points)' : 'Key Words'}: ${formatList(cardData.teachingPreparation?.keyWords)}`,
        `${'Sentences'}: ${cardData.teachingPreparation?.sentenceStructures || 'None'}`,
        '',
        '--- Procedures ---',
        ...cardData.procedures.map(p => `${p.title}${p.duration ? ` (${p.duration} min)` : ''}\n${p.content}\n`)
      ].join('\n');

      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      // Fallback for older browsers or non-secure contexts if needed, but modern browsers support this.
    }
  };

  const handleShare = async () => {
    try {
      const data = JSON.stringify(plan, null, 2);
      await navigator.clipboard.writeText(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onShare) onShare();
    } catch (error) {
      console.error('Share failed:', error);
      alert('Share failed. Please try again.');
    }
  };
  const initiateDownload = async (type: 'docx' | 'pdf') => {
    setShowDownloadMenu(false);
    try {
      if (type === 'docx') {
        await downloadService.downloadDocx(plan as any);
      } else {
        await downloadService.downloadPdf(plan as any);
      }
    } catch (e) {
      console.error(e);
      alert('Download failed.');
    }
  };

  const renderFlow = () => (
    <div className="space-y-10">
      {/* Teaching Preparation Card */}
      <div 
        className="p-4 md:p-5 rounded-xl border shadow-sm transition-shadow"
        style={{ 
          backgroundColor: 'var(--card-bg)', 
          borderColor: 'var(--border-color)', 
          paddingLeft: '12px', 
          paddingRight: '12px',
          color: 'var(--text-primary)'
        }}
      >
        <h4 
          className="font-bold mb-4 flex items-center gap-2 border-b pb-2"
          style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
        >
          <span>📋</span> {locale.LABEL_TEACHING_PREPARATION}
        </h4>
          <div className="grid grid-cols-1 gap-4 text-sm">
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
            <span className="block font-semibold mb-2" style={{ color: 'var(--primary-color)' }}>{labelObjectivesTitle}</span> 
            <div 
              className="leading-relaxed md:pl-4 pl-1 md:border-l-2 border-l"
              style={{ color: 'var(--text-primary)', borderColor: 'var(--primary-color)' }}
            >
               <MDWithMath text={formatList(cardData.teachingPreparation?.objectives)} />
            </div>
          </div>
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div 
                 className="p-3 rounded-xl"
                style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
               >
                 <span className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{locale.LABEL_TEACHING_AIDS}</span> 
                 <p className="leading-relaxed" style={{ color: 'var(--text-primary)', lineHeight: 1.7 as any }}>{cardData.teachingPreparation?.teachingAids || 'None'}</p>
               </div>
               <div 
                 className="p-3 rounded-xl"
                 style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
               >
                 <span className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{locale.LABEL_STUDENT_ANALYSIS}</span> 
                 <p className="leading-relaxed" style={{ color: 'var(--text-primary)', lineHeight: 1.7 as any }}>{cardData.teachingPreparation?.studentAnalysis || 'None'}</p>
               </div>
            </div>
          </div>
        </div>

          {/* Procedures Flow */}
          {cardData.procedures.map((step, index) => {
            const popoverId = `proc-pop-${index}`;
            return (
            <div key={index} data-popover-id={popoverId} className="relative flex items-start group">
          {/* Timeline Connector */}
          {index !== cardData.procedures.length - 1 && (
            <div className="absolute top-10 left-5 bottom-[-24px] w-0.5 transition-colors" style={{ backgroundColor: 'var(--border-color)' }} />
          )}
          
          {/* Step Number Bubble */}
          <div 
            className="relative z-10 flex-shrink-0 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border-2 shadow-sm font-bold transition-colors"
            style={{ 
              backgroundColor: 'var(--bg-color)', 
              borderColor: 'var(--secondary-color)', 
              color: 'var(--primary-color)' 
            }}
          >
            {index + 1}
          </div>

          {/* Content Card */}
          <div 
            className="ml-0 flex-1 p-3 md:p-5 rounded-xl border shadow-sm transition-shadow"
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', maxWidth: '100%', margin: '0 auto', paddingLeft: '12px', paddingRight: '12px', color: 'var(--text-primary)' }}
          >
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-3">
              <h3 className="text-base md:text-lg font-bold text-center md:text-left" style={{ color: 'var(--text-primary)' }}>{step.title}</h3>
              {typeof step.duration === 'number' ? (
                <span 
                  className="px-2 py-1 text-xs font-medium rounded-full md:self-auto self-end mt-1"
                  style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-secondary)' }}
                >
                  {step.duration} min
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div 
                className="p-3 rounded-2xl prose prose-sm max-w-none"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}
              >
                <div 
                  className="flex items-center gap-2 mb-2 font-semibold text-sm not-prose"
                  style={{ color: 'var(--primary-color)' }}
                >
                  <span>🗣️</span> {locale.LABEL_TEACHING_PROCEDURES || 'Procedures'}
                </div>
                <div style={{ color: 'var(--text-primary)', lineHeight: 1.7 as any }}>
                  <MDWithMath text={step.content} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )})}
    </div>
  );

  const renderFooter = () => (
    <div className="flex justify-end items-center gap-4 relative px-2">
      <div className="flex items-center gap-3">
        {onBookmark && (
          <button
            onClick={onBookmark}
            className="p-2 rounded-full transition-colors focus:outline-none hover:bg-gray-100"
            title="Bookmark"
          >
            <svg
              className={`w-5 h-5 ${isBookmarked ? 'text-yellow-500' : 'text-gray-600'} drop-shadow-sm`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
            </svg>
          </button>
        )}
        <button
          onClick={handleShare}
          className="p-2 rounded-full transition-colors focus:outline-none hover:bg-gray-100"
          title="Share"
        >
          <svg className="w-5 h-5 text-gray-600 drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="6" cy="12" r="2" strokeWidth="2.2" />
            <circle cx="18" cy="5" r="2" strokeWidth="2.2" />
            <circle cx="18" cy="19" r="2" strokeWidth="2.2" />
            <path d="M8.5 11.2L15.5 6.8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8.5 12.8L15.5 17.2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={() => setShowDownloadMenu(v => !v)}
          className="p-2 rounded-full transition-colors focus:outline-none hover:bg-gray-100"
          title="Download"
        >
          <svg className="w-5 h-5 text-gray-600 drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" strokeWidth="2" />
            <path d="M12 4v10" strokeWidth="2" />
            <path d="M8 10l4 4 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="relative">
        {showDownloadMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowDownloadMenu(false)} />
            <div 
              className="absolute bottom-full right-0 mb-2 w-44 bg-white rounded-lg shadow-xl border overflow-hidden z-20"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            >
              <button
                onClick={() => initiateDownload('docx')}
                className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center gap-2 text-gray-700 text-sm transition-colors"
              >
                <span className="text-blue-600 text-lg">📄</span> 
                <span>{(locale as any).BUTTON_DOWNLOAD_WORD || 'Word (.docx)'}</span>
              </button>
              <button
                onClick={() => initiateDownload('pdf')}
                className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center gap-2 text-gray-700 text-sm border-t border-gray-50 transition-colors"
              >
                <span className="text-red-600 text-lg">📑</span> 
                <span>{(locale as any).BUTTON_DOWNLOAD_PDF || 'PDF (.pdf)'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <BaseCard 
      title={cardData.title} 
      className={`${className || ''} !p-0`}
      designIntent={locale.LABEL_INTERACTIVE_FLOW}
      grade={plan.grade as any}
      gradeLabel={plan.grade}
      duration={cardData.duration}
      isBookmarked={isBookmarked}
      footerContent={hideFooter ? <></> : renderFooter()}
    >
      {mode === 'flow' ? renderFlow() : (
        <div className="space-y-6">
          {/* Teaching Preparation in Table-like format */}
        <div 
          className="p-4 md:p-5 rounded-xl md:border md:shadow-sm"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', maxWidth: '100%', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '12px', paddingRight: '12px' }}
        >
          <h4 
            className="font-bold mb-4 flex items-center gap-2 border-b pb-2"
            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
          >
            <span>📋</span> {locale.LABEL_TEACHING_PREPARATION}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div 
              className="p-3 rounded-xl md:border"
              style={{ backgroundColor: 'var(--secondary-color)', borderColor: 'var(--border-color)' }}
            >
              <span className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{labelObjectivesTitle}</span>
              <div 
                className="leading-relaxed prose prose-sm max-w-none"
                style={{ color: 'var(--text-primary)', lineHeight: 1.7 as any }}
              >
                <MDWithMath text={formatList(cardData.teachingPreparation?.objectives)} />
              </div>
            </div>
            <div 
              className="p-3 rounded-xl md:border"
              style={{ backgroundColor: 'var(--secondary-color)', borderColor: 'var(--border-color)' }}
            >
              <span className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{labelKeywordsTitle}</span>
              <p className="leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)', lineHeight: 1.7 as any }}>{formatList(cardData.teachingPreparation?.keyWords)}</p>
            </div>
            {!isMathActivityZh && (
            <div 
              className="p-3 rounded-xl md:border"
              style={{ backgroundColor: 'var(--secondary-color)', borderColor: 'var(--border-color)' }}
            >
              <span className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{labelSentencesTitle}</span>
              <div className="leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)', lineHeight: 1.7 as any }}>
                <MDWithMath text={formatList(cardData.teachingPreparation?.sentenceStructures)} />
              </div>
            </div>
            )}
            <div 
              className="p-3 rounded-xl md:border"
              style={{ backgroundColor: 'var(--secondary-color)', borderColor: 'var(--border-color)' }}
            >
              <span className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{locale.LABEL_TEACHING_AIDS}</span>
              <p className="leading-relaxed" style={{ color: 'var(--text-primary)', lineHeight: 1.7 as any }}>{cardData.teachingPreparation?.teachingAids || 'None'}</p>
            </div>
              <div 
                className="md:col-span-2 p-3 rounded-xl md:border"
                style={{ backgroundColor: 'var(--secondary-color)', borderColor: 'var(--border-color)' }}
              >
                <span className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{locale.LABEL_STUDENT_ANALYSIS}</span>
                <p className="leading-relaxed" style={{ color: 'var(--text-primary)', lineHeight: 1.7 as any }}>{cardData.teachingPreparation?.studentAnalysis || 'None'}</p>
              </div>
            </div>
          </div>

      {/* Procedures in Table-like format */}
      <div 
        className="p-4 md:p-5 rounded-xl md:border md:shadow-sm"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', maxWidth: '100%', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '12px', paddingRight: '12px' }}
      >
          <h4 
            className="font-bold mb-4 flex items-center gap-2 border-b pb-2"
            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
          >
            <span>🚀</span> {locale.LABEL_TEACHING_PROCEDURES}
          </h4>
          <div className="space-y-4">
            {cardData.procedures.map((step, index) => {
              const popoverId = `proc-pop-table-${index}`;
              return (
              <div 
                key={index} 
                data-popover-id={popoverId}
                className="p-3 md:p-4 rounded-2xl md:border"
                style={{ backgroundColor: 'var(--secondary-color)', borderColor: 'var(--border-color)' }}
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-3">
                  <h3 className="text-sm md:text-md font-bold text-center md:text-left" style={{ color: 'var(--text-primary)' }}>{step.title}</h3>
                  {typeof step.duration === 'number' ? (
                    <span 
                      className="px-2 py-1 text-xs font-medium rounded-full md:self-auto self-end mt-1"
                      style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-secondary)' }}
                    >
                      {step.duration} min
                    </span>
                  ) : null}
                </div>
                <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-primary)', lineHeight: 1.7 as any }}>
                  <ReactMarkdown>{step.content}</ReactMarkdown>
                </div>
              </div>
            )})}
          </div>
          </div>
        </div>
      )}
    </BaseCard>
  );
};
