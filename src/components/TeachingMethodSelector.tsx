import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setTeachingMethod } from '../store/slices/lessonSlice';
import { selectLanguage } from '../store/slices/previewSlice';
import { InputLabel } from './common/InputLabel';
import { SELECT_CLASSES } from '../constants/styles';
import { useTranslation } from '../hooks/useTranslation';

export const TeachingMethodSelector: React.FC = () => {
  const dispatch = useDispatch();
  const teachingMethod = useSelector((state: RootState) => state.lesson.teachingMethod);
  const language = useSelector(selectLanguage);
  const { t } = useTranslation();

  const getOptionLabel = (zhLabel: string, enLabel: string) => {
    return language === 'zh' ? zhLabel : enLabel;
  };

  return (
    <div className="form-group">
      <InputLabel
        label={t('LABEL_TEACHING_METHOD')}
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
              <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0zM22 10v6"/>
              <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
            </g>
          </svg>
        }
        hasValue={!!teachingMethod}
      />
      <select
        value={teachingMethod}
        onChange={(e) => dispatch(setTeachingMethod(e.target.value as any))}
        className={SELECT_CLASSES}
      >
        <option value="task-based">{getOptionLabel("任务式 (Task-based)", "Task-based")}</option>
        <option value="project-based">{getOptionLabel("项目式 (Project-based)", "Project-based")}</option>
        <option value="TTT">{getOptionLabel("TTT (Test-Teach-Test)", "TTT (Test-Teach-Test)")}</option>
        <option value="PWP">{getOptionLabel("PWP (Pre-While-Post)", "PWP (Pre-While-Post)")}</option>
        <option value="PPP">{getOptionLabel("PPP (Presentation-Practice-Production)", "PPP (Presentation-Practice-Production)")}</option>
      </select>
    </div>
  );
};
