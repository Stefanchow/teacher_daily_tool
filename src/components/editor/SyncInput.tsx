import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { updateRawContent, setGeneratedPlan } from '../../store/slices/lessonSlice';
import { LessonPlan } from '../../services/geminiService';
import { useLocale } from '../../hooks/useLocale';

export const SyncInput: React.FC = () => {
  const dispatch = useDispatch();
  const locale = useLocale();
  const { rawContent, generatedPlan } = useSelector((state: RootState) => state.lesson);
  const [localValue, setLocalValue] = useState(rawContent);

  // Sync local state with Redux state (in case Redux updates from elsewhere, e.g. OCR)
  useEffect(() => {
    setLocalValue(rawContent);
  }, [rawContent]);

  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== rawContent) {
        dispatch(updateRawContent(localValue));
        
        // Feature: Synchronously update preview view (Mocking intelligence)
        // In a real app, this might trigger a re-parse or partial update
        if (generatedPlan) {
          const newTitle = localValue.length > 0 ? localValue.split('\n')[0] : '';
          const updatedPlan: LessonPlan = {
            ...generatedPlan,
            title_zh: newTitle || generatedPlan.title_zh,
            title_en: newTitle || generatedPlan.title_en
          };
          dispatch(setGeneratedPlan(updatedPlan));
        }
      }
    }, 300); // 300ms delay

    return () => clearTimeout(handler);
  }, [localValue, rawContent, dispatch, generatedPlan]);

  const handleSimulateOCR = () => {
    const mockOCRText = "Mathematics: Introduction to Algebra\nDuration: 45\n\n1. Warm-up (5 min)\n2. Core Concept (15 min)\n3. Practice (20 min)";
    setLocalValue(mockOCRText); // This will trigger the effect
  };

  return (
    <div className="flex flex-col h-full bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-4">
        <label className="text-sm font-bold text-gray-700">
          Source Content / OCR Input
        </label>
        <button
          onClick={handleSimulateOCR}
          className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100"
        >
          ⚡ Simulate Image Rec.
        </button>
      </div>
      
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="flex-1 w-full p-3 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-[var(--input-field-text-color)]"
        placeholder={locale.PLACEHOLDER_RAW_CONTENT}
      />
      
      <div className="mt-2 text-xs text-gray-400 flex justify-between">
        <span>Status: {localValue === rawContent ? 'Synced' : 'Typing...'}</span>
        <span>{localValue.length} chars</span>
      </div>
    </div>
  );
};
