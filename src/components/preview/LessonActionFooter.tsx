import React, { useState } from 'react';
import { LessonPlan } from '../../services/geminiService';
import { downloadService } from '../../services/downloadService';
import { DownloadPreviewModal } from './DownloadPreviewModal';
import { Toast } from '../common/Toast';

interface LessonActionFooterProps {
  plan: LessonPlan;
}

export const LessonActionFooter: React.FC<LessonActionFooterProps> = ({ plan }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [downloadType, setDownloadType] = useState<'docx' | 'pdf' | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const initiateDownload = (type: 'docx' | 'pdf') => {
    setDownloadType(type);
    setShowPreviewModal(true);
    setShowDownloadMenu(false);
  };

  const handleConfirmDownload = async () => {
    if (!downloadType) return;
    
    try {
      setIsDownloading(true);
      if (downloadType === 'docx') {
        await downloadService.downloadDocx(plan);
      } else {
        await downloadService.downloadPdf(plan);
      }
      setToast({ message: 'Download started successfully!', type: 'success' });
      setShowPreviewModal(false);
    } catch (error) {
      console.error('Download failed:', error);
      setToast({ message: 'Download failed. Please try again.', type: 'error' });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <DownloadPreviewModal
        plan={plan}
        type={downloadType}
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onConfirm={handleConfirmDownload}
        isDownloading={isDownloading}
      />

      <div className="flex justify-around items-center pt-4 mt-6 border-t border-gray-100 relative">
      {/* Like */}
      <button 
        onClick={() => setIsLiked(!isLiked)}
        className={`flex flex-col items-center gap-1 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <svg className="w-6 h-6" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span className="text-xs font-medium">Like</span>
      </button>

      {/* Bookmark */}
      <button 
        onClick={() => setIsBookmarked(!isBookmarked)}
        className={`flex flex-col items-center gap-1 transition-colors ${isBookmarked ? 'text-indigo-500' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <svg className="w-6 h-6" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <span className="text-xs font-medium">Bookmark</span>
      </button>

      {/* Download */}
      <div className="relative">
        <button 
          onClick={() => setShowDownloadMenu(!showDownloadMenu)}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="text-xs font-medium">Download</span>
        </button>

        {/* Dropdown Menu */}
        {showDownloadMenu && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDownloadMenu(false)}
            />
            <div 
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 rounded-lg shadow-xl border overflow-hidden z-20"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            >
              <button
                onClick={() => initiateDownload('docx')}
                className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center gap-2 text-gray-700 text-sm transition-colors"
                disabled={isDownloading}
              >
                <span className="text-blue-600 text-lg">📄</span> 
                <span>Word (.docx)</span>
              </button>
              <button
                onClick={() => initiateDownload('pdf')}
                className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center gap-2 text-gray-700 text-sm border-t border-gray-50 transition-colors"
                disabled={isDownloading}
              >
                <span className="text-red-600 text-lg">📑</span> 
                <span>PDF (.pdf)</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
};
