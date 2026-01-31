import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setPreviewMode, setScale, setIsExporting } from '../../store/slices/previewSlice';
import { selectGeneratedPlan } from '../../store/slices/lessonSlice';
import { LessonPlanCard } from '../LessonPlanCard/LessonPlanCard';

export const PreviewContainer: React.FC = () => {
  const dispatch = useDispatch();
  const { mode, scale, isExporting, language } = useSelector((state: RootState) => state.preview);
  const { rawContent } = useSelector((state: RootState) => state.lesson);
  const generatedPlan = useSelector(selectGeneratedPlan);

  const displayPlan = React.useMemo(() => {
    if (!generatedPlan) return null;
    if ('zh' in generatedPlan && 'en' in generatedPlan) {
      return (generatedPlan as any)[language];
    }
    return generatedPlan;
  }, [generatedPlan, language]);

  const handleZoomIn = () => dispatch(setScale(scale + 0.1));
  const handleZoomOut = () => dispatch(setScale(scale - 0.1));
  const handleShare = async () => {
    if (!generatedPlan) return;
    try {
      const data = JSON.stringify(generatedPlan, null, 2);
      await navigator.clipboard.writeText(data);
    } catch {}
  };
  const handleExport = () => {
    if (!generatedPlan) {
      alert('No data to export!');
      return;
    }
    dispatch(setIsExporting(true));
    // Simulate export process
    setTimeout(() => {
      alert(`Exported as ${mode === 'table' ? 'Excel' : 'Word'} successfully!`);
      dispatch(setIsExporting(false));
    }, 1000);
  };

  return (
    <div 
      className="flex flex-col h-full border rounded-lg overflow-hidden transition-colors"
      style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}
    >
      {/* Toolbar */}
      <div 
        className="flex items-center justify-between p-4 border-b shadow-sm z-10 transition-colors"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center space-x-4">
          <div className="flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => dispatch(setPreviewMode('table'))}
              className={`px-4 py-2 text-sm font-medium border rounded-l-lg transition-colors`}
              style={
                mode === 'table' 
                  ? { backgroundColor: 'var(--primary-color)', color: '#fff', borderColor: 'var(--primary-color)' }
                  : { backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }
              }
            >
              Excel View
            </button>
            <button
              type="button"
              onClick={() => dispatch(setPreviewMode('flow'))}
              className={`px-4 py-2 text-sm font-medium border rounded-r-lg transition-colors`}
              style={
                mode === 'flow' 
                  ? { backgroundColor: 'var(--primary-color)', color: '#fff', borderColor: 'var(--primary-color)' }
                  : { backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }
              }
            >
              Word View
            </button>
          </div>

          <div className="flex items-center space-x-2 border-l pl-4" style={{ borderColor: 'var(--border-color)' }}>
            <button 
              onClick={handleZoomOut}
              className="p-1 rounded hover:opacity-80 transition-opacity" 
              style={{ color: 'var(--text-primary)' }}
              title="Zoom Out"
            >
              ➖
            </button>
            <span className="text-sm w-12 text-center" style={{ color: 'var(--text-primary)' }}>{Math.round(scale * 100)}%</span>
            <button 
              onClick={handleZoomIn}
              className="p-1 rounded hover:opacity-80 transition-opacity" 
              style={{ color: 'var(--text-primary)' }}
              title="Zoom In"
            >
              ➕
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={!generatedPlan || isExporting}
            className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${
              !generatedPlan 
                ? 'opacity-50 cursor-not-allowed' 
                : isExporting 
                  ? 'cursor-wait' 
                  : 'hover:opacity-90'
            }`}
            style={{ 
              backgroundColor: !generatedPlan ? 'var(--text-secondary)' : 'var(--button-bg)',
              color: 'var(--button-text)'
            }}
            title="Download"
          >
            {isExporting ? 'Exporting...' : 'Export File'}
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 overflow-auto p-8 relative">
        <div className="min-h-full flex justify-center">
          {displayPlan ? (
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center', transition: 'transform 0.2s', width: '100%', maxWidth: '1024px' }}>
              <LessonPlanCard plan={displayPlan} mode={mode} />
            </div>
          ) : (
            rawContent ? (
              <div
                className="p-4 w-full max-w-3xl border rounded-lg bg-white/60 shadow-sm"
                style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
              >
                {rawContent}
              </div>
            ) : (
              <div className="p-4" style={{ color: 'var(--text-secondary)' }}>No data to display</div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
