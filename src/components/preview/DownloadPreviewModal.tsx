import React, { useEffect, useState } from 'react';
import { LessonPlan } from '../../services/geminiService';
import { downloadService } from '../../services/downloadService';

interface DownloadPreviewModalProps {
  plan: LessonPlan;
  type: 'docx' | 'pdf' | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDownloading: boolean;
}

export const DownloadPreviewModal: React.FC<DownloadPreviewModalProps> = ({
  plan,
  type,
  isOpen,
  onClose,
  onConfirm,
  isDownloading
}) => {
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && plan) {
      // Generate PDF preview if type is PDF
      if (type === 'pdf') {
        // We need a way to get the blob URL without saving. 
        // downloadService.downloadPdf uses doc.save(). We might need to expose a generatePdfBlob method.
        // For now, let's just show the structure summary for both, or try to mock it.
        // Or better, update downloadService to support returning blob.
      }
    }
  }, [isOpen, plan, type]);

  if (!isOpen || !type) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 bg-green-100`}>
                 <span className="text-green-600 text-xl">✓</span>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  {type === 'docx' ? 'Word Document Preview' : 'PDF Document Preview'}
                </h3>
                
                {/* Content Summary */}
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Document Content:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex justify-between">
                      <span>Title:</span>
                      <span className="font-medium text-gray-900 truncate max-w-[200px]">{plan.title_zh}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Sections:</span>
                      <span className="font-medium text-gray-900">{plan.teachingPreparation ? 'Complete' : 'Missing'}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Procedures:</span>
                      <span className="font-medium text-gray-900">{plan.procedures?.length || 0} Steps</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none sm:ml-3 sm:w-auto sm:text-sm bg-indigo-600 hover:bg-indigo-700 ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={onConfirm}
              disabled={isDownloading}
            >
              {isDownloading ? 'Downloading...' : 'Confirm Download'}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
              disabled={isDownloading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
