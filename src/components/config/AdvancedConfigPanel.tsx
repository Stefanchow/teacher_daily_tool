import React, { useState, useEffect } from 'react';
import styles from './AdvancedConfigPanel.module.css';

interface ConfigData {
  subject: string;
  grade: string;
  duration: number;
  words: string;
  sentences: string;
  grammar: string;
  layout: 'detailed' | 'simple';
  image?: File | null;
}

const STORAGE_KEY = 'lesson_config_draft';

export const AdvancedConfigPanel: React.FC = () => {
  const [formData, setFormData] = useState<ConfigData>({
    subject: '',
    grade: '',
    duration: 45,
    words: '',
    sentences: '',
    grammar: '',
    layout: 'detailed',
    image: null
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ConfigData, string>>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Exclude image from restoration as File objects can't be JSON serialized
        setFormData(prev => ({ ...prev, ...parsed, image: null }));
      } catch (e) {
        console.error('Failed to load draft', e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    const toSave = { ...formData, image: undefined }; // Don't save image file
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [formData]);

  const validateField = (name: keyof ConfigData, value: any) => {
    let error = '';
    if (name === 'subject' && !value) error = '请输入主题';
    if (name === 'grade' && !value) error = '请选择年级';
    if (name === 'duration' && (value < 15 || value > 120)) error = '时长需在15-120分钟之间';
    
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleChange = (field: keyof ConfigData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过10MB');
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.grid}>
        {/* Left Form Section */}
        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>基础信息</h3>
          
          <div className={styles.fieldGroup}>
            <label className={styles.label}>主题 (Subject) *</label>
            <input
              className={styles.input}
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              placeholder="例如：Water Cycle"
              maxLength={100}
            />
            {errors.subject && <span className={styles.error}>{errors.subject}</span>}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>年级 (Grade) *</label>
            <select
              className={styles.select}
              value={formData.grade}
              onChange={(e) => handleChange('grade', e.target.value)}
            >
              <option value="">请选择年级</option>
              <optgroup label="小学">
                {[1, 2, 3, 4, 5, 6].map(i => <option key={`p${i}`} value={`primary-${i}`}>{i}年级</option>)}
              </optgroup>
              <optgroup label="初中">
                {[7, 8, 9].map(i => <option key={`m${i}`} value={`middle-${i}`}>{i-6}年级</option>)}
              </optgroup>
              <optgroup label="高中">
                {[10, 11, 12].map(i => <option key={`h${i}`} value={`high-${i}`}>{i-9}年级</option>)}
              </optgroup>
            </select>
            {errors.grade && <span className={styles.error}>{errors.grade}</span>}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>时长 (Minutes)</label>
            <input
              type="number"
              className={styles.input}
              value={formData.duration}
              onChange={(e) => handleChange('duration', parseInt(e.target.value))}
              min={15}
              max={120}
            />
            {errors.duration && <span className={styles.error}>{errors.duration}</span>}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>目标词汇 (Target Words)</label>
            <textarea
              className={styles.textarea}
              value={formData.words}
              onChange={(e) => handleChange('words', e.target.value)}
              placeholder="请输入目标词汇，换行分隔"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>目标句型 (Target Sentences)</label>
            <textarea
              className={styles.textarea}
              value={formData.sentences}
              onChange={(e) => handleChange('sentences', e.target.value)}
              placeholder="请输入目标句型，换行分隔"
            />
          </div>

          <div className={styles.grammarInput}>
            <label>重点语法 (Key Grammar)</label>
            <textarea
              value={formData.grammar}
              onChange={(e) => handleChange('grammar', e.target.value)}
              placeholder="请输入重点语法，换行分隔"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className={styles.rightSection}>
          
          {/* Layout Toggle */}
          <div>
            <h3 className={styles.sectionTitle}>版式选择</h3>
            <div className={styles.toggleContainer} onClick={() => handleChange('layout', formData.layout === 'detailed' ? 'simple' : 'detailed')}>
              <div className={`${styles.toggleSlider} ${formData.layout === 'simple' ? styles.right : ''}`} />
              <div className={`${styles.toggleOption} ${formData.layout === 'detailed' ? styles.active : ''}`}>
                专业详案版
              </div>
              <div className={`${styles.toggleOption} ${formData.layout === 'simple' ? styles.active : ''}`}>
                精简流程版
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div>
            <h3 className={styles.sectionTitle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              课本上传
            </h3>
            
            {!previewUrl ? (
              <label className={styles.uploadArea}>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png" 
                  hidden 
                  onChange={handleImageUpload}
                />
                <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className={styles.uploadText}>点击或拖拽上传课本<br/>支持 JPG/PNG (Max 10MB)</span>
              </label>
            ) : (
              <div className={styles.previewContainer}>
                <img src={previewUrl} alt="Preview" className={styles.previewImage} />
                <button className={styles.deleteButton} onClick={removeImage}>×</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
