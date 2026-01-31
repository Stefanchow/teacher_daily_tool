import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { downloadService } from '../../services/downloadService';
import { LessonPlan } from '../../services/geminiService';
import { LessonPlanCard } from '../LessonPlanCard/LessonPlanCard';

export interface FavoriteItem {
  id: number;
  title: string;
  subject: string;
  content: any;
  savedAt: string;
  planKey: string;
}

interface FavoritesPageProps {
  favorites: FavoriteItem[];
  onRemove: (id: number) => void;
  onClearAll: () => void;
  onLoad: (item: FavoriteItem) => void;
  onImport: () => void;
  windowWidth: number;
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ 
  favorites, 
  onRemove, 
  onClearAll, 
  onLoad,
  onImport,
  windowWidth 
}) => {
  const { t, language } = useTranslation();
  const [expandedFavId, setExpandedFavId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{current: number, total: number} | null>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showSparkle, setShowSparkle] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const MAX_SELECTION = 50;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortedFavorites = useMemo(() => {
    return [...favorites].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }, [favorites]);

  const triggerSparkle = () => {
    setShowSparkle(true);
    setTimeout(() => setShowSparkle(false), 2000);
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (newSelected.size >= MAX_SELECTION) {
        alert(t('fav_max_selection_reached').replace('{max}', String(MAX_SELECTION)));
        return;
      }
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === favorites.length) {
      // If all are selected (or effectively all visible ones), deselect all
      setSelectedIds(new Set());
    } else {
      // Select up to MAX_SELECTION
      const allIds = favorites.map(f => f.id);
      if (allIds.length > MAX_SELECTION) {
        // Only select first N
        const allowedIds = allIds.slice(0, MAX_SELECTION);
        setSelectedIds(new Set(allowedIds));
        alert(t('fav_max_selection_reached').replace('{max}', String(MAX_SELECTION)));
      } else {
        setSelectedIds(new Set(allIds));
      }
    }
  };

  const getSubjectLabel = (subject: string) => {
    switch(subject) {
      case 'math': return t('subject_math');
      case 'english': return t('subject_english');
      case 'chinese': return t('subject_chinese');
      case '数学': return t('subject_math');
      case '英语': return t('subject_english');
      case '语文': return t('subject_chinese');
      default: return subject;
    }
  };

  // ... (rest of code)

  const executeExport = async (plans: LessonPlan[], format: 'docx' | 'pdf') => {
    setIsExporting(true);
    setExportStatus('idle');
    setExportMenuOpen(false); // Close menu immediately to show feedback on main button
    setExportProgress({ current: 0, total: plans.length });
    
    try {
      const onProgress = (current: number, total: number) => {
         setExportProgress({ current, total });
      };

      if (format === 'docx') {
        await downloadService.downloadBatchDocx(plans, language as any, onProgress);
      } else {
        await downloadService.downloadBatchPdf(plans, language as any, onProgress);
      }
      setExportStatus('success');
      setTimeout(() => setExportStatus('idle'), 3000);
    } catch (error) {
      console.error('Export failed', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 3000);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      // User requested to stay in selection mode
      // if (isSelectionMode) {
      //   setIsSelectionMode(false);
      //   setSelectedIds(new Set());
      // }
    }
  };

  const handleBatchExport = (format: 'docx' | 'pdf') => {
    const targetPlans = isSelectionMode
      ? favorites.filter(f => selectedIds.has(f.id)).map(f => f.content as LessonPlan)
      : []; // Should not happen if button is disabled when empty
    
    if (targetPlans.length === 0) return;
    executeExport(targetPlans, format);
  };

  const handleSingleExport = (fav: FavoriteItem) => {
     // Default to DOCX for single download button for now, or could show menu
     // For simplicity and speed as requested, let's just do DOCX
     if (fav.content) {
        executeExport([fav.content as LessonPlan], 'docx');
     }
  };

  const handleClearAllConfirm = () => {
    onClearAll();
    setShowDeleteConfirm(false);
    triggerSparkle();
  };

  // Grid Logic
  const cols = windowWidth >= 1280 ? 3 : (windowWidth >= 768 ? 2 : 1);
  const items: JSX.Element[] = [];

  for (let i = 0; i < sortedFavorites.length; i++) {
    const fav = sortedFavorites[i];
    const isExpanded = expandedFavId === fav.id;
    
    // Use theme-aware colors via CSS variables
    const cardStyle = {
      backgroundColor: 'var(--card-bg)',
      borderColor: 'var(--border-color)',
    };

    const tagStyle = {
      backgroundColor: 'var(--secondary-color)',
      color: 'var(--primary-color)',
    };
    
    // Selection state uses primary color
    const selectionStyle = {
      borderColor: 'var(--primary-color)',
      backgroundColor: 'var(--secondary-color)',
    };

    items.push(
       <div 
         key={fav.id}
         onClick={(e) => {
            e.stopPropagation();
            if (isSelectionMode) {
               toggleSelection(fav.id);
            } else {
               setExpandedFavId(expandedFavId === fav.id ? null : fav.id);
            }
         }}
         className={`
           relative group cursor-pointer transition-all duration-300 ease-out
           rounded-2xl border hover:shadow-xl hover:-translate-y-1 min-h-[200px]
           ${isExpanded ? 'ring-2 shadow-lg scale-[1.02] z-10' : 'shadow-sm'}
           ${isSelectionMode && selectedIds.has(fav.id) ? 'ring-2' : ''}
         `}
         style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: isSelectionMode && selectedIds.has(fav.id) ? 'var(--primary-color)' : 'var(--border-color)',
            '--tw-ring-color': 'var(--primary-color)'
         } as React.CSSProperties}
       >
          {/* Selection Circle - Theme Aware */}
          {isSelectionMode && (
             <div className="absolute top-4 right-4 z-20">
               <div 
                 className={`
                   w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
                   ${selectedIds.has(fav.id) 
                     ? 'scale-110 shadow-[0_0_10px_rgba(0,0,0,0.1)]' 
                     : 'hover:border-[2.5px] hover:scale-105'}
                 `}
                 style={{
                    backgroundColor: selectedIds.has(fav.id) ? 'var(--primary-color)' : 'transparent',
                    borderColor: 'var(--primary-color)',
                 }}
               >
                 {selectedIds.has(fav.id) && (
                   <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                   </svg>
                 )}
               </div>
             </div>
          )}

          <div className="p-5 h-full flex flex-col">
             <div className="flex justify-between items-start mb-4 pr-8">
                <span 
                  className="px-3 py-1 rounded-full text-xs font-bold tracking-wide"
                  style={tagStyle}
                >
                   {getSubjectLabel(fav.subject)}
                </span>
                <span className="text-xs font-medium font-mono" style={{ color: 'var(--text-secondary)' }}>
                   {new Date(fav.savedAt).toLocaleDateString()}
                </span>
             </div>

             <h3 
               className="font-bold text-lg mb-2 line-clamp-2 leading-snug transition-colors"
               style={{ color: 'var(--text-primary)' }}
             >
                {fav.title}
             </h3>

             <div className="mt-auto pt-4 flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  {/* Download Button */}
                  <button
                    onClick={(e) => {
                       e.stopPropagation();
                       handleSingleExport(fav);
                    }}
                    className="p-2 rounded-full hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-500 transition-colors"
                    title={t('fav_download')}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                       e.stopPropagation();
                       if (confirm(t('favorites_delete_confirm_single'))) onRemove(fav.id);
                    }}
                    className="p-2 rounded-full hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
                    title={t('ACTION_DELETE')}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
               </div>
               
               <div className="flex items-center gap-3">
                 {/* Turn to PPT Button */}
                 <button
                    onClick={(e) => {
                       e.stopPropagation();
                       // Feature pending
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    style={{ 
                        backgroundColor: 'var(--secondary-color)', 
                        color: 'var(--primary-color)' 
                    }}
                 >
                    {t('fav_ppt')}
                 </button>

                 <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    style={{
                        backgroundColor: isExpanded ? 'var(--secondary-color)' : 'var(--bg-secondary)',
                        color: isExpanded ? 'var(--primary-color)' : 'var(--text-secondary)'
                    }}
                 >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                 </div>
               </div>
             </div>
          </div>
       </div>
    );

    // Expanded Panel Logic
    const expandedIndex = sortedFavorites.findIndex(f => f.id === expandedFavId);
    if (expandedIndex !== -1) {
       const expandedRow = Math.floor(expandedIndex / cols);
       const currentRow = Math.floor(i / cols);
       const isLastInRow = (i + 1) % cols === 0;
       const isLastItem = i === sortedFavorites.length - 1;

       if (expandedRow === currentRow && (isLastInRow || isLastItem)) {
          const expandedFav = sortedFavorites[expandedIndex];
          items.push(
            <div key={`expanded-${expandedFav.id}`} className="col-span-1 md:col-span-2 xl:col-span-3 w-full my-4">
               <div 
                  className="rounded-2xl shadow-xl border overflow-hidden animate-expand"
                  onClick={(e) => e.stopPropagation()}
                  style={{ 
                    backgroundColor: 'var(--card-bg)',
                    borderColor: 'var(--border-color)' 
                  }}
               >
                  <div 
                    className="flex items-center justify-between px-6 py-4 border-b"
                    style={{ 
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)'
                    }}
                  >
                     <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                        {expandedFav.title}
                     </h3>
                     <button 
                        onClick={() => setExpandedFavId(null)}
                        className="p-2 rounded-full transition-colors hover:bg-opacity-80"
                        style={{ color: 'var(--text-secondary)' }}
                     >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                     </button>
                  </div>
                  
                  {/* Content Full View */}
                  <div className="p-6 overflow-y-auto custom-scrollbar" style={{ maxHeight: '600px' }}>
                     <LessonPlanCard 
                        plan={expandedFav.content} 
                        hideFooter={true} 
                        className="!shadow-none !border-0"
                     />
                  </div>

                  {/* Actions Footer (Optional: keep empty or add share actions if needed) */}
                  {/* Removed Load Full Plan button */}
               </div>
            </div>
          );
       }
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-300 relative">
      
      {/* Sparkle Effect */}
      {showSparkle && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div 
                key={i}
                className="absolute w-2 h-2 bg-yellow-300 rounded-full shadow-[0_0_10px_rgba(253,224,71,0.8)]"
                style={{
                  top: '-10%',
                  left: `${Math.random() * 100}%`,
                  animation: `fall ${1.5 + Math.random()}s linear forwards ${Math.random() * 0.5}s`
                }}
            />
          ))}
          <style>{`
            @keyframes fall {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
              {t('fav_title')}
              <span className="text-sm font-normal px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                 {favorites.length}
              </span>
           </h1>
           <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>{t('fav_subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           {/* Batch Operation / Export Toggle */}
           {!isSelectionMode ? (
             <button 
               onClick={() => setIsSelectionMode(true)}
               disabled={favorites.length === 0}
               className="px-5 py-3 border font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
               style={{ 
                  backgroundColor: 'var(--card-bg)', 
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
               }}
             >
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
               {t('fav_batch_op')}
             </button>
           ) : (
             <>
               <button 
                 onClick={handleSelectAll}
                 className="px-5 py-3 border font-bold rounded-xl transition-all shadow-sm"
                 style={{ 
                    backgroundColor: 'var(--card-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                 }}
               >
                 {selectedIds.size === favorites.length && favorites.length > 0 ? t('fav_deselect_all') : t('fav_select_all')}
               </button>

               <button 
                 onClick={() => {
                   setIsSelectionMode(false);
                   setSelectedIds(new Set());
                 }}
                 className="px-5 py-3 border font-bold rounded-xl transition-all shadow-sm"
                 style={{ 
                    backgroundColor: 'var(--card-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
               >
                 {t('fav_cancel')}
               </button>
               
               <div className="relative" ref={exportMenuRef}>
                  <button 
                     onClick={() => {
                        if (exportStatus === 'idle' && !isExporting) {
                           setExportMenuOpen(!exportMenuOpen);
                        }
                     }}
                     disabled={selectedIds.size === 0 || isExporting}
                     className={`
                        px-5 py-3 font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:shadow-none
                        ${exportStatus === 'success' 
                           ? 'bg-green-500 text-white shadow-green-200 hover:bg-green-600' 
                           : exportStatus === 'error'
                              ? 'bg-red-500 text-white shadow-red-200 hover:bg-red-600'
                              : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'
                        }
                     `}
                  >
                     {isExporting ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                     ) : exportStatus === 'success' ? (
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                     ) : exportStatus === 'error' ? (
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                     ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                     )}
                     
                     {isExporting 
                        ? (exportProgress 
                            ? (language === 'zh' ? `正在导出 ${exportProgress.current}/${exportProgress.total}...` : `Exporting ${exportProgress.current}/${exportProgress.total}...`)
                            : (language === 'zh' ? '导出中...' : 'Exporting...'))
                        : exportStatus === 'success'
                           ? (language === 'zh' ? '导出成功' : 'Success')
                           : exportStatus === 'error'
                              ? (language === 'zh' ? '导出失败' : 'Failed')
                              : `${t('fav_export')} (${selectedIds.size})`
                     }
                     
                     {!isExporting && exportStatus === 'idle' && (
                        <svg className={`w-4 h-4 transition-transform duration-200 ${exportMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                     )}
                  </button>
                  
                  {exportMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        onClick={() => handleBatchExport('docx')}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <span className="font-mono text-xs border border-blue-500 text-blue-600 px-1.5 py-0.5 rounded bg-blue-50">DOCX</span>
                        <span className="text-sm font-medium text-gray-700">Word 文档</span>
                      </button>
                      <div className="h-px bg-gray-50 mx-2"></div>
                      <button
                        onClick={() => handleBatchExport('pdf')}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <span className="font-mono text-xs border border-red-500 text-red-600 px-1.5 py-0.5 rounded bg-red-50">PDF</span>
                        <span className="text-sm font-medium text-gray-700">PDF 文档</span>
                      </button>
                    </div>
                  )}
               </div>
             </>
           )}
           
           {!isSelectionMode && (
             <>
               <button 
                  onClick={onImport}
                  className="px-5 py-3 border font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                  style={{ 
                     backgroundColor: 'var(--card-bg)', 
                     borderColor: 'var(--border-color)',
                     color: 'var(--text-primary)'
                  }}
               >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  {t('fav_import')}
               </button>
               
               <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={favorites.length === 0}
                  className="px-5 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  {t('fav_delete_all')}
               </button>
             </>
           )}
        </div>
      </div>

      {/* Empty State */}
      {favorites.length === 0 ? (
        <div className="py-24 text-center rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50">
          <svg className="w-20 h-20 mx-auto mb-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <p className="text-xl text-gray-500 font-medium">{t('fav_empty')}</p>
          <p className="text-gray-400 mt-2">{t('fav_empty_desc')}</p>
        </div>
      ) : (
        <div 
          className="w-full"
          onClick={() => setExpandedFavId(null)}
        >
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {items}
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 space-y-6 scale-100 animate-in zoom-in-95 duration-200">
             <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-500">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900">{t('fav_confirm_delete_title')}</h3>
                <p className="text-gray-500 mt-2">{t('fav_confirm_delete_desc', { count: favorites.length })}</p>
             </div>
             <div className="flex gap-4">
                <button 
                   onClick={() => setShowDeleteConfirm(false)}
                   className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                   {t('fav_cancel')}
                </button>
                <button 
                   onClick={handleClearAllConfirm}
                   className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-200 transition-all"
                >
                   {t('fav_confirm')}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
