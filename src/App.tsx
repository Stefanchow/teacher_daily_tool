import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { APP_LOGO_BASE64 } from './constants/assets';
import { RootState, AppDispatch } from './store';
import { 
  setTopic, 
  setDuration,
  setGrade,
  setDiscourseType,
  setTextType,
  setWordCount,
  setArticleContent,
  setActivityContent,
  setWords,
  setSentences,
  setGrammar,
  setVocabularyExtensions,
  setGeneratedPlan, 
  setLoading, 
  setError,
  setTeachingMethod,
  updateRawContent,
  cancelGeneration,
  generateLessonPlanThunk
} from './store/slices/lessonSlice';
import { 
  setAiWords, 
  setAiSentences, 
  setAnalyzing, 
  setAiError, 
  selectAiWords, 
  selectSuggestedTitle,
  selectIsAnalyzing
} from './store/slices/aiSlice';
import { geminiService, LessonPlan } from './services/geminiService';
import { useTranslation } from './hooks/useTranslation';
import { SyncInput } from './components/editor/SyncInput';
import { PreviewContainer } from './components/preview/PreviewContainer';
import { LessonPlanCard } from './components/LessonPlanCard/LessonPlanCard';
import { TeachingMethodSelector } from './components/TeachingMethodSelector';
import { LanguageSegmentedControl } from './components/LanguageSegmentedControl';
import { selectLanguage, setLanguage } from './store/slices/previewSlice';
import { setUiLanguage } from './store/slices/userSettingsSlice';
import { Toast } from './components/common/Toast';
import { INPUT_CLASSES, TEXTAREA_CLASSES, LABEL_CLASSES } from './constants/styles';
import './App.css';
import { TEXTBOOK_DATABASE, versionToKey, parsePages } from './data/textbookData';

import { sanitizeForEnglish } from './utils/stringUtils';
import { InputLabel } from './components/common/InputLabel';
import { themes, ThemeType, getThemeWithWeeklyVariation, getThemeByWeek } from './theme/themes';
import { downloadService } from './services/downloadService';
import { adjustBrightness, hexToRgba, getAverageColor, isLightColor } from './utils/themeColorUtils';
import { AIPaperGenerator } from './components/AIPaperGenerator';
import { Sidebar } from './components/layout/Sidebar';
import { MembershipPage } from './components/membership/MembershipPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { FavoritesPage } from './components/favorites/FavoritesPage';

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    topic, 
    duration,
    grade,
    discourseType,
    textType,
    wordCount,
    articleContent,
    activityContent,
    words,
    sentences,
    grammar,
    vocabularyExtensions,
    teachingMethod,
    isLoading, 
    error 
  } = useSelector((state: RootState) => state.lesson);
  const segmentedStatus = useSelector((state: RootState) => state.lesson.segmentedStatus);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const docInputRef = React.useRef<HTMLInputElement>(null);
  const allInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadOptionsOpen, setIsUploadOptionsOpen] = React.useState(false);
  const [activeAITool, setActiveAITool] = React.useState<'camera' | 'upload' | 'voice' | null>(null);
  const [previewFiles, setPreviewFiles] = React.useState<File[]>([]);
  const isMobile = React.useMemo(() => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent), []);
  const isAnalyzing = useSelector(selectIsAnalyzing);
  const { t, language } = useTranslation();
  const userSettings = useSelector((state: RootState) => state.userSettings);
  const favoritesImportRef = React.useRef<HTMLInputElement>(null);
  const [currentTheme, setCurrentTheme] = React.useState<ThemeType>('default');
  const [overlayRotation, setOverlayRotation] = React.useState<number>(0);

  // Sync User Settings to Lesson State
  // React.useEffect(() => {
  //   if (userSettings.teachingStage) {
  //     const gradeMap: Record<string, string> = { 
  //       primary: t('STAGE_PRIMARY'), 
  //       middle: t('STAGE_JUNIOR'), 
  //       high: t('STAGE_SENIOR') 
  //     };
  //     dispatch(setGrade(gradeMap[userSettings.teachingStage] || t('STAGE_PRIMARY')));
  //   }
  // }, [userSettings.teachingStage, dispatch, t]);

  // Apply Custom Background & Dynamic Theme Colors
  React.useEffect(() => {
    const applyTheme = async () => {
      const root = document.documentElement;
      const { customBackground } = userSettings;
      const theme = themes[currentTheme];
      // Fallback primary color
      const primaryColor = theme.colors['--primary-color'] || '#6366f1';

      let baseColor = primaryColor;
      
      // Apply base theme colors first
      Object.entries(theme.colors).forEach(([key, val]) => {
        root.style.setProperty(key, val);
      });

      // Handle Custom Background
      const body = document.body;
      if (customBackground?.type === 'image' && customBackground.value) {
        body.style.backgroundImage = `url(${customBackground.value})`;
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundAttachment = 'fixed';
        body.style.backgroundRepeat = 'no-repeat';
        body.classList.add('has-custom-bg');
        
        // Extract average color for dynamic theming
        try {
           const avg = await getAverageColor(customBackground.value);
           if (avg && avg !== '#ffffff') baseColor = avg;
        } catch (e) {
           console.warn('Failed to extract color', e);
        }
      } else if (customBackground?.type === 'gradient' && customBackground.value) {
        body.style.background = customBackground.value;
        body.style.backgroundAttachment = 'fixed';
        body.classList.add('has-custom-bg');
      } else {
        body.style.backgroundImage = '';
        body.style.background = ''; // Clear gradient
        body.classList.remove('has-custom-bg');
        // Reset baseColor to theme primary
        baseColor = primaryColor;
      }

      // --- Dynamic Overrides based on User Requirements ---
      
      // 1. Sidebar: Use theme defined color
      // root.style.setProperty('--sidebar-bg', sidebarBg);

      // 2. Header: Use theme defined color
      // root.style.setProperty('--header-bg', headerBg);

      // 3. Input Container: Use theme defined color
      // root.style.setProperty('--container-bg', containerBg);
      
      // Calculate RGB values for rgba usage
      const hexToRgbString = (hex: string) => {
        try {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `${r}, ${g}, ${b}`;
        } catch (e) {
          return '99, 102, 241'; // Fallback
        }
      };
      const rgbValues = hexToRgbString(baseColor);
      root.style.setProperty('--primary-rgb', rgbValues);
      root.style.setProperty('--theme-rgb', rgbValues);

      root.style.setProperty('--input-border', baseColor);
      root.style.setProperty('--input-glow', `0 0 15px ${hexToRgba(baseColor, 0.4)}`);
      
      // Card Texture Variables
      root.style.setProperty('--card-shadow', '0 8px 32px 0 rgba(31, 38, 135, 0.37)');
      root.style.setProperty('--glass-border', '1px solid rgba(255, 255, 255, 0.18)');
      
      // Text Color Adjustments for Input Container
      // User Req: "Input text, icons, checkboxes must follow theme color"
      // We check if the defined input background (from theme) is light or dark to ensure contrast.
      const inputBgFromTheme = theme.colors['--input-bg'] || '#ffffff';
      const isInputBgLight = isLightColor(inputBgFromTheme);

      let inputText;
      if (isInputBgLight) {
          // Input is light -> Text should be dark (darkened baseColor for theme consistency)
          // We use a significant darkening factor to ensure readability on white
          inputText = adjustBrightness(baseColor, -0.6); 
      } else {
          // Input is dark -> Text should be light
          inputText = adjustBrightness(baseColor, 0.9);
      }

      root.style.setProperty('--input-text-color', inputText);
      
      // Force input text color to #6366F1 (Indigo-500) as explicitly requested by user
      // regardless of theme background lightness
      const inputFieldText = '#6366F1';
      root.style.setProperty('--input-field-text-color', inputFieldText);

      root.style.setProperty('--input-placeholder-color', hexToRgba(inputText, 0.5));

      // Header Text Color
      // Use theme defined text color
      // root.style.setProperty('--header-text-color', headerTextColor);
      
      // Set accent-color for checkboxes/radios
      root.style.setProperty('accent-color', baseColor);
    };

    applyTheme();
  }, [userSettings.customBackground, currentTheme]);

  const [currentView, setCurrentView] = React.useState<'lesson-center' | 'membership' | 'settings' | 'favorites'>('lesson-center');
  const [previousView, setPreviousView] = React.useState<'lesson-center' | 'membership' | 'favorites'>('lesson-center');
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  // Clear Resources Logic
  const handleClearResources = async () => {
    // Calculate size of recentPlans (approximate)
    const json = JSON.stringify(recentPlans);
    const bytes = new TextEncoder().encode(json).length;
    const mb = bytes / (1024 * 1024);
    
    // Clear recentPlans
    setRecentPlans([]);
    localStorage.removeItem('recentPlans_v1');
    
    return mb;
  };

  const handleClearAllFavorites = () => {
    setFavorites([]);
    localStorage.removeItem('favorites');
  };

  // Import Favorites Logic
  const handleImportFavorites = (file: File) => {
    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'doc' || extension === 'docx' || extension === 'pdf') {
      alert(t('import_doc_pdf_not_supported') || '目前仅支持 JSON 格式的教案备份文件导入。Word 和 PDF 导入功能正在开发中。');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          // Validate items
          const validItems = parsed.filter((item: any) => item.id && item.title && item.content);
          if (validItems.length > 0) {
            // Merge or Replace? "Import" usually adds.
            // Check for duplicates by ID
            const existingIds = new Set(favorites.map(f => f.id));
            const newItems = validItems.filter((item: any) => !existingIds.has(item.id));
            
            if (newItems.length > 0) {
              const updated = [...newItems, ...favorites];
              setFavorites(updated);
              localStorage.setItem('favorites', JSON.stringify(updated));
              alert(t('toast_imported', { count: newItems.length }));
            } else {
              alert(t('toast_import_no_new'));
            }
          } else {
             alert(t('toast_import_failed'));
          }
        }
      } catch (err) {
        console.error(err);
        alert(t('toast_import_failed'));
      }
    };
    reader.readAsText(file);
  };

  const handleViewChange = (view: 'lesson-center' | 'membership' | 'settings' | 'favorites') => {
    setCurrentView(view);
  };

  const viewToRender = currentView;

  const tabsScrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [hasAnalyzedOnce, setHasAnalyzedOnce] = React.useState(false);
  type FavoriteItem = { id: number; title: string; subject: string; content: any; savedAt: string; planKey: string };
  const [favorites, setFavorites] = React.useState<FavoriteItem[]>([]);
  const sortedFavorites = React.useMemo(
    () => [...favorites].sort((a, b) => {
      const ta = a.savedAt ? new Date(a.savedAt).getTime() : 0;
      const tb = b.savedAt ? new Date(b.savedAt).getTime() : 0;
      return tb - ta;
    }),
    [favorites]
  );
  const [activeActionId, setActiveActionId] = React.useState<number | null>(null);
  const [deletingRecentId, setDeletingRecentId] = React.useState<number | null>(null);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editingTitle, setEditingTitle] = React.useState<string>('');
  const [isWeChatShareOpen, setIsWeChatShareOpen] = React.useState(false);
  const [sharePlan, setSharePlan] = React.useState<LessonPlan | null>(null);
  type WeChatFriend = { id: number; name: string; avatar?: string };
  const [weChatFriends] = React.useState<WeChatFriend[]>([
    { id: 1, name: '张老师' },
    { id: 2, name: '李老师' },
    { id: 3, name: '王老师' },
    { id: 4, name: '赵老师' },
    { id: 5, name: '陈老师' }
  ]);
  const [selectedFriends, setSelectedFriends] = React.useState<number[]>([]);
  type MiniCardItem = { id: number; plan: LessonPlan; to: number[]; time: string };
  const [miniCards, setMiniCards] = React.useState<MiniCardItem[]>([]);
  type RecentItem = { id: number; plan: LessonPlan; title: string; time: string; subject?: string };
  const [recentPlans, setRecentPlans] = React.useState<RecentItem[]>([]);
  const lastPlanRef = React.useRef<LessonPlan | null>(null);
  const [slidingRecentId, setSlidingRecentId] = React.useState<number | null>(null);
  const [downloadMenuPlan, setDownloadMenuPlan] = React.useState<LessonPlan | null>(null);
  const [showGlobalDownloadMenu, setShowGlobalDownloadMenu] = React.useState(false);
  const [hoverTitleId, setHoverTitleId] = React.useState<number | null>(null);
  const [savingFavorite, setSavingFavorite] = React.useState<boolean>(false);
  const [isLoadingOverlay, setIsLoadingOverlay] = React.useState<boolean>(false);
  const [previewTransition, setPreviewTransition] = React.useState<boolean>(false);
  const [expandedRecentId, setExpandedRecentId] = React.useState<number | null>(null);
  const [expandedFavId, setExpandedFavId] = React.useState<number | null>(null);
  const recentListRef = React.useRef<HTMLDivElement | null>(null);
  const currentPlanOriginRef = React.useRef<{ type: 'generated' | 'favorite'; savedAt: string } | null>(null);
  const isGeneratingRef = React.useRef(false);

  const [windowWidth, setWindowWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobileScreen = windowWidth <= 1024;

  // Close sliding cards when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setSlidingRecentId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (expandedRecentId === null) return;
    const handler = (e: MouseEvent) => {
      const list = recentListRef.current;
      if (!list) return;
      if (!list.contains(e.target as Node)) {
        setExpandedRecentId(null);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [expandedRecentId]);

  // Textbook Center (state declared after navigation state to avoid use-before-declare)

  const TEXTBOOK_CENTER_ENABLED = false;

  // Navigation State
  type Subject = '英语' | '数学' | '语文';
  type FunctionItem = '教案生成' | '阅读课' | '课堂活动' | '活动课' | '文学鉴赏' | '教材中心' | 'AI 组卷';

  const [currentSubject, setCurrentSubject] = React.useState<Subject>(() => {
    const day = new Date().getDay();
    // Monday(1), Thursday(4) -> English
    if (day === 1 || day === 4) return '英语';
    // Tuesday(2), Friday(5) -> Math
    if (day === 2 || day === 5) return '数学';
    // Wednesday(3), Weekend -> Chinese
    return '语文';
  });
  const [currentFunction, setCurrentFunction] = React.useState<FunctionItem>('教案生成');

  const SUBJECT_FUNCTIONS: Record<Subject, FunctionItem[]> = {
    '英语': TEXTBOOK_CENTER_ENABLED
      ? ['教案生成', '阅读课', '课堂活动', '教材中心', 'AI 组卷']
      : ['教案生成', '阅读课', '课堂活动', 'AI 组卷'],
    '数学': TEXTBOOK_CENTER_ENABLED
      ? ['教案生成', '课堂活动', '教材中心', 'AI 组卷']
      : ['教案生成', '课堂活动', 'AI 组卷'],
    '语文': TEXTBOOK_CENTER_ENABLED
      ? ['教案生成', '文学鉴赏', '课堂活动', '教材中心', 'AI 组卷']
      : ['教案生成', '文学鉴赏', '课堂活动', 'AI 组卷']
  };

  // Textbook Center
  type Textbook = { id: number; name: string; version: string; coverImage?: string };
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [hideOthers, setHideOthers] = React.useState(false);
  const textbooks: Textbook[] = React.useMemo(() => {
    if (currentSubject !== '英语') return [];
    const list: string[] = [
      '人教版(PEP)',
      '外研版三年级起点',
      '外研版一年级起点',
      '北师大版',
      '上海版牛津',
      '牛津译林版',
      '人教版(go for it)',
      '外研版(初中)',
      '冀教版',
      '人教版(新课标)',
      '外研版(高中)',
      '北师大版(高中)'
    ];
      return list.map((v, idx) => {
        const name = v.replace(/\(.*?\)/, '').trim();
        const coverImage = '';
        return { id: idx + 1, name, version: v, coverImage };
      });
  }, [currentSubject]);
  const textbookGroups: Record<'小学' | '初中' | '高中', Textbook[]> = React.useMemo(() => {
    const primary = textbooks.filter(t => /(PEP|外研版一年级起点|外研版三年级起点|剑桥版三年级起点|北师大版$|上海版牛津|牛津译林版)/i.test(t.version));
    const junior = textbooks.filter(t => /(go for it|外研版\(初中\)|冀教版)/i.test(t.version));
    const senior = textbooks.filter(t => /(新课标|外研版\(高中\)|北师大版\(高中\))/i.test(t.version));
    return { '小学': primary, '初中': junior, '高中': senior };
  }, [textbooks]);
  const [textbookVolume, setTextbookVolume] = React.useState<string>('');
  const [textbookUnit, setTextbookUnit] = React.useState<string>('');
  const [textbookPageStart, setTextbookPageStart] = React.useState<number | ''>('');
  const [textbookPageEnd, setTextbookPageEnd] = React.useState<number | ''>('');
  const getVolumeOptions = React.useCallback((version: string) => {
    const vols: string[] = [];
    const key = versionToKey(version);
    const db = TEXTBOOK_DATABASE[key];
    if (db?.grades?.length) return db.grades;
    if (/一年级起点/i.test(version)) {
      for (let grade = 1; grade <= 6; grade++) {
        vols.push(`${grade}年级上册`, `${grade}年级下册`);
      }
      return vols;
    }
    if (/(三年级起点|PEP|上海版牛津|牛津译林|剑桥版三年级起点|北师大版$)/i.test(version)) {
      for (let grade = 3; grade <= 6; grade++) {
        vols.push(`${grade}年级上册`, `${grade}年级下册`);
      }
      return vols;
    }
    if (/(go for it|初中|外研版\(初中\)|冀教版)/i.test(version)) {
      return ['七年级上册','七年级下册','八年级上册','八年级下册','九年级上册','九年级下册'];
    }
    if (/(高中|新课标|外研版\(高中\)|北师大版\(高中\))/i.test(version)) {
      return ['高一上册','高一下册','高二上册','高二下册','高三上册','高三下册'];
    }
    for (let grade = 3; grade <= 6; grade++) {
      vols.push(`${grade}年级上册`, `${grade}年级下册`);
    }
    return vols;
  }, []);
  type UnitInfo = { id: string; title: string; startPage: number; endPage: number };
  const getUnitsForVolume = React.useCallback((version: string, volume: string): UnitInfo[] => {
    const key = versionToKey(version);
    const db = TEXTBOOK_DATABASE[key];
    if (db?.units?.[volume]?.length) {
      return db.units[volume].map(u => {
        const parsed = parsePages(u.pages);
        return {
          id: u.id,
          title: u.title,
          startPage: parsed?.start ?? 1,
          endPage: parsed?.end ?? (parsed?.start ?? 1)
        };
      });
    }
    const baseTitlesPrimary = ['Hello','My Family','Colours','Numbers','Animals','Food'];
    const baseTitlesJunior = ['Friendship','Hobbies','School Life','Healthy Living','Culture','Environment'];
    const baseTitlesSenior = ['Reading','Writing','Listening & Speaking','Grammar & Usage','Vocabulary','Project'];
    let titles = baseTitlesPrimary;
    if (/(go for it|初中|外研版\(初中\)|冀教版)/i.test(version)) titles = baseTitlesJunior;
    if (/(高中|新课标|外研版\(高中\)|北师大版\(高中\))/i.test(version)) titles = baseTitlesSenior;
    const base: UnitInfo[] = titles.map((t, idx) => ({
      id: `U${idx + 1}`,
      title: `Unit ${idx + 1} ${t}`,
      startPage: 1,
      endPage: 1
    }));
    if (/一年级起点/i.test(version)) {
      return base.map((u, idx) => ({ ...u, startPage: idx * 8 + 1, endPage: idx * 8 + 8 }));
    }
    if (/(go for it|初中|外研版\(初中\)|冀教版)/i.test(version)) {
      return base.map((u, idx) => ({ ...u, startPage: idx * 10 + 1, endPage: idx * 10 + 10 }));
    }
    if (/(高中|新课标|外研版\(高中\)|北师大版\(高中\))/i.test(version)) {
      return base.map((u, idx) => ({ ...u, startPage: idx * 12 + 1, endPage: idx * 12 + 12 }));
    }
    return base.map((u, idx) => ({ ...u, startPage: idx * 6 + 1, endPage: idx * 6 + 6 }));
  }, []);
  React.useEffect(() => {
    setTextbookVolume('');
    setTextbookUnit('');
    setTextbookPageStart('');
    setTextbookPageEnd('');
  }, [selectedId]);
  React.useEffect(() => {
    if (!textbookVolume) {
      setTextbookUnit('');
      setTextbookPageStart('');
      setTextbookPageEnd('');
    }
  }, [textbookVolume]);
  const unitsForCurrent = React.useMemo(() => {
    const target = textbooks.find(t => t.id === selectedId);
    if (!target || !textbookVolume) return [];
    return getUnitsForVolume(target.version, textbookVolume);
  }, [selectedId, textbooks, textbookVolume, getUnitsForVolume]);
  React.useEffect(() => {
    if (!textbookUnit) return;
    const target = textbooks.find(t => t.id === selectedId);
    const key = versionToKey(target?.version || '');
    const db = TEXTBOOK_DATABASE[key];
    const units = db?.units?.[textbookVolume] || [];
    const unitRec = units.find((u: any) => u.id === textbookUnit);
    if (unitRec) {
      const pagesParsed = parsePages(unitRec.pages);
      if (pagesParsed) {
        setTextbookPageStart(pagesParsed.start);
        setTextbookPageEnd(pagesParsed.end);
      }
      const newTopic = unitRec.topic || unitRec.title;
      dispatch(setTopic(newTopic || ''));
      const kw = (unitRec.words || '').split(/[,，\s]+/).filter(Boolean);
      if (kw.length) dispatch(setWords(kw));
      const gm = (unitRec.grammar || '').split(/[,，\n]+/).map(s => s.trim()).filter(Boolean).map((rule, idx) => ({ id: `${idx}`, rule }));
      if (gm.length) dispatch(setGrammar(gm));
    } else {
      const info = unitsForCurrent.find(u => u.id === textbookUnit);
      if (!info) return;
      setTextbookPageStart(info.startPage);
      setTextbookPageEnd(info.endPage);
      const topicText = `${info.title}`;
      if (!topic.trim()) {
        dispatch(setTopic(topicText));
      }
    }
  }, [textbookUnit]);
  React.useEffect(() => {
    const valid = typeof textbookPageStart === 'number' && typeof textbookPageEnd === 'number' && textbookPageStart > 0 && textbookPageEnd >= textbookPageStart;
    if (!valid) return;
    const target = textbooks.find(t => t.id === selectedId);
    const unit = unitsForCurrent.find(u => u.id === textbookUnit);
    if (!unit || unit.startPage !== textbookPageStart || unit.endPage !== textbookPageEnd) {
      setTextbookUnit('');
    }
    const basis = `${target?.name || ''} ${textbookVolume || ''} ${unit ? unit.title : ''}`.trim();
    if (!topic.trim()) {
      dispatch(setTopic(basis));
    }
    const kw = (unit ? unit.title : 'Lesson').toLowerCase().split(/\s+/).filter(Boolean);
    if (Array.isArray(words) ? words.length === 0 : true) {
      dispatch(setWords(Array.from(new Set(kw)).slice(0, 6)));
    }
    const stc = [
      'I can describe',
      'Ask and answer about',
      'Use there is/are',
    ];
    if (sentences.length === 0) {
      dispatch(setSentences(stc));
    }
    const gm = ['Simple Present', 'There is/There are', 'Noun Plurals'].map((rule, idx) => ({ id: `${idx}`, rule }));
    if (grammar.length === 0) {
      dispatch(setGrammar(gm));
    }
  }, [textbookPageStart, textbookPageEnd]);

  const handleSubjectChange = (subject: Subject) => {
    saveCurrentPageToCache();
    setCurrentSubject(subject);
    const defaultFunc = SUBJECT_FUNCTIONS[subject][0];
    setCurrentFunction(defaultFunc);
    restorePageFromCache(subject, defaultFunc);
    dispatch(setGeneratedPlan(null));
    dispatch(setError(null));
    console.log(`当前路径：${subject} > ${defaultFunc}`);
  };

  const handleFunctionChange = (func: FunctionItem) => {
    saveCurrentPageToCache();
    setCurrentFunction(func);
    restorePageFromCache(currentSubject, func);
    dispatch(setGeneratedPlan(null));
    dispatch(setError(null));
    console.log(`当前路径：${currentSubject} > ${func}`);
  };
  
  React.useEffect(() => {
    setHasAnalyzedOnce(false);
  }, [currentSubject, currentFunction]);

  React.useEffect(() => {
    document.body.classList.remove('theme-英语', 'theme-数学', 'theme-语文');
    document.body.classList.add(`theme-${currentSubject}`);
  }, [currentSubject]);

  const computePlanKey = React.useCallback((plan: LessonPlan | null) => {
    if (!plan) return '';
    const s = JSON.stringify(plan);
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return String(h);
  }, []);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('favorites');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const migrated = arr.map((f: any) => {
            if (!f.planKey && f.content) {
              const s = JSON.stringify(f.content);
              let h = 0;
              for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
              f.planKey = String(h);
            }
            return f;
          });
          setFavorites(migrated);
        }
      }
    } catch {}
  }, []);
  const isSameDay = (iso: string, now: Date = new Date()) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
  };
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('recentPlans_v1');
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      const now = new Date();
      const filtered = arr.filter((item: any) => typeof item?.time === 'string' && isSameDay(item.time, now));
      setRecentPlans(filtered);
    } catch {}
  }, []);
  React.useEffect(() => {
    try {
      if (!recentPlans.length) {
        localStorage.removeItem('recentPlans_v1');
      } else {
        localStorage.setItem('recentPlans_v1', JSON.stringify(recentPlans));
      }
    } catch {}
  }, [recentPlans]);
  React.useEffect(() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const ms = next.getTime() - now.getTime();
    const timer = window.setTimeout(() => {
      setRecentPlans([]);
      try {
        localStorage.removeItem('recentPlans_v1');
      } catch {}
    }, ms);
    return () => window.clearTimeout(timer);
  }, []);
  const persistFavorites = (arr: FavoriteItem[]) => {
    setSavingFavorite(true);
    setFavorites(arr);
    try { localStorage.setItem('favorites', JSON.stringify(arr)); } catch {}
    setTimeout(() => setSavingFavorite(false), 300);
  };
  const getPlanTitle = (plan: LessonPlan | null) => {
    if (!plan) return '';
    return (plan as any).title_zh || (plan as any).title_en || (plan as any).title || '';
  };
  const isPlanBookmarked = (plan: LessonPlan | null) => {
    const key = computePlanKey(plan);
    if (!key) return false;
    return favorites.some(f => f.subject === currentSubject && f.planKey === key);
  };
  const pushPlanToRecentIfNeeded = (plan: LessonPlan | null, origin: { type: 'generated' | 'favorite'; savedAt: string } | null) => {
    if (!plan) return;
    const prev = plan as any;
    const prevKey = computePlanKey(prev);
    const now = new Date();
    if (origin && origin.type === 'favorite' && !isSameDay(origin.savedAt, now)) {
      return;
    }
    let time = now.toISOString();
    if (origin && origin.type === 'favorite' && isSameDay(origin.savedAt, now)) {
      time = origin.savedAt;
    } else {
      const favForPlan = favorites.find(f => f.subject === currentSubject && f.planKey === prevKey);
      if (favForPlan && isSameDay(favForPlan.savedAt, now)) {
        time = favForPlan.savedAt;
      }
    }
    setRecentPlans((curr) => {
      const filtered = curr.filter(r => isSameDay(r.time, now));
      if (filtered.some(r => computePlanKey(r.plan) === prevKey)) return filtered;
      return [{ id: Date.now(), plan: prev, title: getPlanTitle(prev) || '教案', time, subject: currentSubject }, ...filtered].slice(0, 50);
    });
  };
  React.useEffect(() => {
    if (isAnalyzing) {
      setIsLoadingOverlay(true);
    } else {
      setIsLoadingOverlay(false);
    }
  }, [isAnalyzing]);
  React.useEffect(() => {
    if (!isLoading) {
      isGeneratingRef.current = false;
    }
  }, [isLoading]);
  const handleToggleFavorite = () => {
    if (!generatedPlan) return;
    const title = getPlanTitle(generatedPlan) || '教案';
    const planKey = computePlanKey(generatedPlan);
    const exists = favorites.find(f => f.subject === currentSubject && f.planKey === planKey);
    if (exists) {
      const next = favorites.filter(f => !(f.subject === currentSubject && f.planKey === planKey));
      persistFavorites(next);
      return;
    }
    const existingRecent = recentPlans.find(r => computePlanKey(r.plan) === planKey);
    const savedAt = existingRecent?.time || new Date().toISOString();
    const item: FavoriteItem = { id: Date.now(), title, subject: currentSubject, content: generatedPlan, savedAt, planKey };
    const next = [item, ...favorites];
    persistFavorites(next);
  };
  const handleCollapsePreview = () => {
    if (lastPlanRef.current) {
      pushPlanToRecentIfNeeded(lastPlanRef.current, currentPlanOriginRef.current);
      lastPlanRef.current = null;
      currentPlanOriginRef.current = null;
    }
    setGeneratedPlanLocal(null);
    dispatch(setGeneratedPlan(null));
    setTimeout(() => {
      recentListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 320);
  };
  const commitRename = (id: number) => {
    const val = editingTitle.trim();
    let targetKey: string | null = null;
    const next = favorites.map(f => {
      if (f.id === id) {
        const newTitle = val || f.title;
        targetKey = f.planKey;
        return { ...f, title: newTitle };
      }
      return f;
    });
    persistFavorites(next);
    if (targetKey) {
      setRecentPlans(rs => rs.map(r => 
        computePlanKey(r.plan) === targetKey ? { ...r, title: val || r.title } : r
      ));
    }
    setEditingId(null);
    setEditingTitle('');
  };
  const loadFavorite = (fav: FavoriteItem) => {
    if (lastPlanRef.current) {
      pushPlanToRecentIfNeeded(lastPlanRef.current, currentPlanOriginRef.current);
    }
    currentPlanOriginRef.current = { type: 'favorite', savedAt: fav.savedAt };
    dispatch(setGeneratedPlan(fav.content));
  };
  const removeFavorite = (id: number) => {
    const next = favorites.filter(f => f.id !== id);
    persistFavorites(next);
  };
  const shareFavorite = async (fav: FavoriteItem) => {
    try {
      const data = JSON.stringify(fav.content, null, 2);
      if ((navigator as any).share) {
        await (navigator as any).share({ title: fav.title, text: data });
      } else {
        await navigator.clipboard.writeText(data);
        alert(t('TOAST_COPIED'));
      }
    } catch {}
  };
  const openWeChatShare = (plan: LessonPlan) => {
    setSharePlan(plan);
    setSelectedFriends([]);
    setIsWeChatShareOpen(true);
  };
  const confirmWeChatSend = () => {
    if (!sharePlan || selectedFriends.length === 0) return;
    const item: MiniCardItem = { id: Date.now(), plan: sharePlan, to: selectedFriends.slice(), time: new Date().toISOString() };
    setMiniCards([item, ...miniCards]);
    setIsWeChatShareOpen(false);
  };
  const removeMiniCard = (id: number) => {
    setMiniCards(miniCards.filter(m => m.id !== id));
  };

  const toggleTheme = () => {
    const themeKeys: ThemeType[] = [
      'default', 
      'memphis', 
      'cyberpunk', 
      'klein', 
      'morandi', 
      'bauhaus', 
      'dopamine',
      'movie_scifi',
      'movie_fantasy',
      'anime_ghibli',
      'anime_pastel',
      'game_pixel',
      'game_zelda'
    ];
    const currentIndex = themeKeys.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    setCurrentTheme(themeKeys[nextIndex]);
    const weekly = getThemeByWeek();
    setOverlayRotation((r) => (weekly.colors.length ? (r + 1) % weekly.colors.length : 0));
  };

  React.useEffect(() => {
    const baseTheme = themes[currentTheme];
    const theme = getThemeWithWeeklyVariation(baseTheme);
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    try {
      let bgImg = theme.colors['--bg-image'];
      let bgColor = theme.colors['--bg-color'];
      let blurAmount = '10px';

      // Custom Background Logic
      if (userSettings.customBackground?.type === 'image' && userSettings.customBackground.value) {
        bgImg = `url(${userSettings.customBackground.value})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
        blurAmount = '15px';
      } else if (userSettings.customBackground?.type === 'gradient' && userSettings.customBackground.value) {
        bgImg = userSettings.customBackground.value;
        document.body.style.backgroundSize = 'auto';
        document.body.style.backgroundPosition = 'initial';
        document.body.style.backgroundAttachment = 'initial';
        blurAmount = '15px';
      } else {
        // Reset to theme defaults
        document.body.style.backgroundSize = '';
        document.body.style.backgroundPosition = '';
        document.body.style.backgroundAttachment = '';
      }

      document.body.style.backgroundImage = bgImg;
      document.body.style.backgroundColor = bgColor;
      root.style.setProperty('--card-gradient', bgImg);
      root.style.setProperty('--glass-blur-amount', blurAmount);
      
      // Force high contrast input text color
      root.style.setProperty('--input-field-text-color', '#6366F1');
    } catch {}
  }, [currentTheme, userSettings.customBackground]);

  const weeklyScheme = React.useMemo(() => getThemeByWeek(), []);
  const rotatedColors = React.useMemo(() => {
    const arr = weeklyScheme.colors.slice();
    if (arr.length === 0) return ['transparent', 'transparent', 'transparent', 'transparent'];
    const rot = overlayRotation % arr.length;
    return [...arr.slice(rot), ...arr.slice(0, rot)].concat(Array(Math.max(0, 4 - arr.length)).fill(arr[0])).slice(0, 4);
  }, [weeklyScheme.colors, overlayRotation]);

  const updateTabScrollIndicators = React.useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const left = el.scrollLeft > 0;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth;
    setCanScrollLeft(left);
    setCanScrollRight(right);
  }, []);

  const scrollTabsBy = React.useCallback((dx: number) => {
    const el = tabsScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dx, behavior: 'smooth' });
  }, []);

  React.useEffect(() => {
    updateTabScrollIndicators();
    const el = tabsScrollRef.current;
    if (!el) return;
    const handler = () => updateTabScrollIndicators();
    el.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);
    return () => {
      el.removeEventListener('scroll', handler);
      window.removeEventListener('resize', handler);
    };
  }, [updateTabScrollIndicators]);

  // Persist language preference
  React.useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const analyzeImageFile = async (file: File) => {
    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      const cleanBase64 = base64String.split(',')[1] || base64String;
      const result = await geminiService.analyzeImage(cleanBase64);
      if (result.suggestedTopic) dispatch(setTopic(result.suggestedTopic));
      if (result.words?.length) dispatch(setWords(result.words));
      if (result.vocabulary_extensions?.length) dispatch(setVocabularyExtensions(result.vocabulary_extensions.join(', ')));
      if (currentSubject === '英语' && currentFunction === '阅读课') {
        const filtered = filterArticleSentences(result.sentences || []);
        const article = (filtered && filtered.length)
          ? filtered.join(' ')
          : ((result.sentences && result.sentences.length) ? result.sentences.join(' ') : (result.suggestedTopic || ''));
        const wc = article.split(/\s+/).filter(Boolean).length;
        dispatch(setArticleContent(article));
        if (wc >= 0) {
          dispatch(setWordCount(wc));
        }
        const heuristic = (txt: string) => txt.toLowerCase();
        const h = heuristic(article + ' ' + (result.suggestedTopic || ''));
        let dType = t('TEXT_TYPE_EXPOSITORY');
        let tType = t('TEXT_TYPE_POPULAR_SCIENCE');
        if (/story|once upon|dialogue|conversation|narrative|故事|对话|叙述/.test(h)) {
          dType = t('TEXT_TYPE_NARRATIVE');
          tType = t('TEXT_TYPE_STORY');
        } else if (/news|report|报道|新闻/.test(h)) {
          dType = language === 'zh' ? '说明文' : 'Expository';
          tType = language === 'zh' ? '新闻报道' : 'News Report';
        }
        dispatch(setDiscourseType(dType));
        dispatch(setTextType(tType));
        setHasAnalyzedOnce(true);
      } else if (currentSubject === '英语' && currentFunction === '教案生成') {
        const picked = selectKeySentences(result.sentences || []);
        dispatch(setSentences(picked));
        if (result.grammar_points?.length) {
          dispatch(setGrammar(result.grammar_points.map((rule, idx) => ({ id: `${idx}`, rule }))));
        }
      } else {
        if (result.sentences?.length) dispatch(setSentences(result.sentences));
        if (result.grammar_points?.length) dispatch(setGrammar(result.grammar_points.map((rule, idx) => ({ id: `${idx}`, rule }))));
      }
    } catch (err) {
      console.error('Image analysis failed:', err);
      dispatch(setError('Image analysis failed. Please try again.'));
    }
  };
  const handleFilesSelected = async (files: FileList | File[]) => {
    const arr: File[] = Array.from(files as any);
    setPreviewFiles(arr);
    if (arr.some(f => f.type.startsWith('image/'))) {
      setActiveAITool('camera');
    } else {
      setActiveAITool('upload');
    }
    try {
      dispatch(setAnalyzing(true));
    } catch {}
    
    // Minimal delay to ensure loading state is visible for all file types
    const minDelay = new Promise(resolve => setTimeout(resolve, 1500));
    const processPromise = (async () => {
      for (const file of arr) {
        if (file.type.startsWith('image/')) {
          await analyzeImageFile(file);
        } else if (file.type === 'text/plain' || /\.txt$/i.test(file.name)) {
          const text = await file.text();
          if (currentFunction === '阅读课') {
            dispatch(setArticleContent(text));
          } else {
            dispatch(setActivityContent(text));
          }
        } else if (/\.pdf$/i.test(file.name) || /\.docx?$/i.test(file.name)) {
          const sizeMB = file.size / (1024 * 1024);
          if (sizeMB > 20) {
            dispatch(setError(t('ERROR_FILE_TOO_LARGE')));
          }
          // Note: Actual PDF/Docx parsing would go here. 
          // Currently we just simulate processing to show the UI state as requested.
        } else {
          alert(t('ERROR_UNSUPPORTED_FILE_TYPE'));
        }
      }
    })();

    await Promise.all([processPromise, minDelay]);

    if (docInputRef.current) docInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
    try {
      dispatch(setAnalyzing(false));
    } catch {}
  };

  const handleDurationBlur = () => {
    if (duration === '' || duration === undefined) {
      // If empty, leave it empty or set default? 
      // User requirement: "Initial state ... empty placeholder".
      // User requirement: "If input value < 25, force set 25".
      // If we treat empty as 0, it becomes 25.
      // Let's assume empty stays empty until Generate is clicked, OR we set default 45 if user leaves it.
      // But wait, "When user completes input (onBlur)... If input < 25... set 25".
      // If I type nothing and blur, value is ''. Comparison '' < 25 is false (or true depending on coercion).
      // Let's coerce to number. Number('') is 0. 0 < 25 => 25.
      // So if user leaves it empty, it becomes 25? That seems aggressive.
      // Let's assume if user entered SOMETHING and it's invalid, fix it. If completely empty, maybe leave it?
      // But "ensure initial is empty" implies we want user to fill it.
      // Let's check if it's a valid number.
      if (duration === '') return; // Allow empty on blur? Or force default? 
      // If I type "10", onBlur -> 25. Correct.
      // If I type "200", onBlur -> 120. Correct.
      // If I type "", onBlur -> ?
      // If I leave it empty, it might be fine until generation.
      // However, if I treat '' as 0, it becomes 25.
      // Let's only validate if it is a number.
    } else {
      let val = Number(duration);
      if (val < 25) val = 25;
      if (val > 60) val = 60;
      if (val !== duration) {
        dispatch(setDuration(val));
      }
    }
  };

  const handleGenerate = () => {
    if (isLoading) {
      dispatch(cancelGeneration());
      return;
    }
    if (isGeneratingRef.current) {
      return;
    }
    isGeneratingRef.current = true;
    currentPlanOriginRef.current = null;
    if (currentSubject === '英语' && currentFunction === '阅读课' && !topic.trim() && (localArticleContent || '').trim()) {
      const base = (localArticleContent || '').trim().replace(/\s+/g, ' ');
      const derived = base.length > 24 ? base.slice(0, 24) : base;
      dispatch(setTopic(derived));
    }
    if (currentSubject === '英语' && currentFunction === '课堂活动' && !topic.trim() && (localActivityContent || '').trim()) {
      const base = (localActivityContent || '').trim().replace(/\s+/g, ' ');
      const derived = base.length > 24 ? base.slice(0, 24) : base;
      dispatch(setTopic(derived));
    }
    if (currentSubject === '英语' && currentFunction === '阅读课') {
      if (!grade.trim()) {
        dispatch(setGrade(t('DEFAULT_GRADE')));
      }
      if (wordCount === '' || Number(wordCount) <= 0) {
        const def = getDefaultWordCount(grade);
        dispatch(setWordCount(clampWordCount(def) as number));
      }
      const userStrategies = sentences.map(s => s.trim()).filter(s => s);
      const finalStrategies = pickStrategies(localArticleContent || '', discourseType, language as 'zh' | 'en', userStrategies);
      if (JSON.stringify(finalStrategies) !== JSON.stringify(sentences)) {
        dispatch(setSentences(finalStrategies));
      }
    }
    dispatch(generateLessonPlanThunk({ functionType: currentFunction === '课堂活动' ? 'activity' : 'lesson', subject: currentSubject }));
  };

  const [generatedPlan, setGeneratedPlanLocal] = React.useState<LessonPlan | null>(null);
  
  // Local state for words input to allow flexible typing (spaces, etc.)
  const [localWords, setLocalWords] = React.useState(Array.isArray(words) ? words.join(', ') : '');

  // Local state for sentences
  const [localSentences, setLocalSentences] = React.useState(Array.isArray(sentences) ? sentences.join('\n') : '');

  // Local state for grammar
  const [localGrammar, setLocalGrammar] = React.useState(Array.isArray(grammar) ? grammar.map(g => g.rule).join('\n') : '');
  const [localArticleContent, setLocalArticleContent] = React.useState(articleContent || '');
  const [localActivityContent, setLocalActivityContent] = React.useState(activityContent || '');

  // Sync localWords when words in Redux changes (e.g. from Image Analysis), 
  // but avoid overwriting if the change originated from local typing.
  React.useEffect(() => {
    const currentParsed = localWords.split(/[,，\s]+/).filter(w => w.trim() !== '');
    const isDifferent = JSON.stringify(currentParsed) !== JSON.stringify(words);
    
    // Also update if the length is significantly different (e.g. cleared)
    // or if it's the first load (localWords empty but words not)
    if (isDifferent) {
       // Only update if they are semantically different. 
       // This prevents "apple " (local) vs "apple" (redux) causing overwrite.
       // However, if we just rely on the fact that dispatching the SAME array to Redux won't trigger this effect if Redux checks equality...
       // But Redux Toolkit usually creates new reference.
       // So checking semantic equality is safer.
       setLocalWords(words.join(', '));
    }
  }, [words]);

  React.useEffect(() => {
    if (localArticleContent !== articleContent) {
      setLocalArticleContent(articleContent || '');
    }
  }, [articleContent]);
  React.useEffect(() => {
    if (localActivityContent !== activityContent) {
      setLocalActivityContent(activityContent || '');
    }
  }, [activityContent]);

  React.useEffect(() => {
    const currentParsed = localSentences.split('\n').map(s => s.trim()).filter(s => s !== '');
    const isDifferent = JSON.stringify(currentParsed) !== JSON.stringify(sentences);
    if (isDifferent) {
      setLocalSentences(sentences.join('\n'));
    }
  }, [sentences]);

  React.useEffect(() => {
    const currentParsed = localGrammar.split('\n').map(s => s.trim()).filter(s => s !== '');
    const currentGrammarRules = grammar.map(g => g.rule);
    const isDifferent = JSON.stringify(currentParsed) !== JSON.stringify(currentGrammarRules);
    if (isDifferent) {
      setLocalGrammar(grammar.map(g => g.rule).join('\n'));
    }
  }, [grammar]);

  const handleWordsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalWords(value);
    
    // Parse words: allow comma, Chinese comma, or whitespace as separators
    const newWords = value.split(/[,，\s]+/).filter(word => word.trim() !== '');
    
    // Avoid dispatching if the result hasn't changed to reduce re-renders/updates
    if (JSON.stringify(newWords) !== JSON.stringify(words)) {
      dispatch(setWords(newWords));
    }
  };

  const handleArticleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalArticleContent(value);
    dispatch(setArticleContent(value));
    const count = value.trim() ? value.trim().split(/\s+/).filter(Boolean).length : 0;
    dispatch(setWordCount(count));
  };
  const handleActivityContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalActivityContent(value);
    dispatch(setActivityContent(value));
  };

  const handleSentencesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalSentences(value);
    
    const newSentences = value.split('\n').map(s => s.trim()).filter(s => s !== '');
    
    if (JSON.stringify(newSentences) !== JSON.stringify(sentences)) {
      dispatch(setSentences(newSentences));
    }
  };

  const handleGrammarChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalGrammar(value);

    const items = value
      .split('\n')
      .map(g => g.trim())
      .filter(g => g !== '')
      .map((rule, idx) => ({ id: `${idx}`, rule }));
    
    // Check deep equality manually since objects have new IDs? 
    // Actually ID depends on index, so if length same and content same, IDs same.
    const currentRules = grammar.map(g => g.rule);
    const newRules = items.map(g => g.rule);

    if (JSON.stringify(newRules) !== JSON.stringify(currentRules)) {
      dispatch(setGrammar(items));
    }
  };
  
  // Use useEffect to sync redux state to local state if needed, or just select it
  const reduxGeneratedPlan = useSelector((state: RootState) => state.lesson.generatedPlan);
  
  React.useEffect(() => {
    if (reduxGeneratedPlan) {
      // Check if it's a dual language response
      if ('zh' in reduxGeneratedPlan && 'en' in reduxGeneratedPlan) {
        const plan = (reduxGeneratedPlan as any)[language];
        setGeneratedPlanLocal(plan);
        lastPlanRef.current = plan;
      } else {
        // Fallback for legacy/single plan
        setGeneratedPlanLocal(reduxGeneratedPlan as any);
        lastPlanRef.current = reduxGeneratedPlan as any;
      }
    } else {
      setGeneratedPlanLocal(null);
    }
  }, [reduxGeneratedPlan, language]);

  React.useEffect(() => {
    if (reduxGeneratedPlan !== null) return;
    if (!lastPlanRef.current) return;
    const origin = currentPlanOriginRef.current;
    const prev = lastPlanRef.current as any;
    pushPlanToRecentIfNeeded(prev, origin || null);
    lastPlanRef.current = null;
    currentPlanOriginRef.current = null;
  }, [reduxGeneratedPlan]);

  const Spinner = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <span className={`relative inline-flex items-center justify-center ${className}`} style={{ width: '1.5rem', height: '1.5rem', ...style }}>
      <svg className="absolute animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span
        className="absolute rounded-full border-2"
        style={{
          width: '1.1rem',
          height: '1.1rem',
          borderColor: 'rgba(255,255,255,0.9)',
          borderTopColor: 'transparent',
          animation: 'spin 0.9s linear infinite reverse',
        }}
      />
    </span>
  );

  const getSubjectLabel = (subject: Subject) => {
    switch(subject) {
      case '英语': return t('subject_english');
      case '数学': return t('subject_math');
      case '语文': return t('subject_chinese');
      default: return subject;
    }
  };

  const getFunctionLabel = (func: FunctionItem) => {
    switch(func) {
      case '教案生成': return t('func_lesson_gen');
      case '阅读课': return t('func_reading');
      case '课堂活动': return t('func_activity');
      case '活动课': return t('func_activity_course');
      case '文学鉴赏': return t('func_literature');
      case '教材中心': return t('func_textbook');
      case 'AI 组卷': return t('func_ai_paper');
      default: return func;
    }
  };

  const discourseOptions = React.useMemo(() => {
    return [
      t('TEXT_TYPE_NARRATIVE'),
      t('TEXT_TYPE_EXPOSITORY'),
      t('TEXT_TYPE_ARGUMENTATIVE'),
      t('TEXT_TYPE_PROSE'),
      t('TEXT_TYPE_NOVEL'),
      t('TEXT_TYPE_NEWS'),
      t('TEXT_TYPE_POETRY'),
      t('TEXT_TYPE_DRAMA'),
      t('TEXT_TYPE_FABLE'),
      t('TEXT_TYPE_MYTH'),
      t('TEXT_TYPE_BIOGRAPHY'),
      t('TEXT_TYPE_TRAVELOGUE'),
      t('TEXT_TYPE_POPULAR_SCIENCE'),
      t('TEXT_TYPE_GUIDE'),
      t('TEXT_TYPE_REPORT'),
      t('TEXT_TYPE_LETTER')
    ];
  }, [t, language]);

  const textTypeOptions = React.useMemo(() => {
    return [
      t('TEXT_TYPE_NEWS_REPORT'),
      t('TEXT_TYPE_POPULAR_SCIENCE'),
      t('TEXT_TYPE_STORY'),
      t('TEXT_TYPE_GUIDE'),
      t('TEXT_TYPE_ADVERTISEMENT'),
      t('TEXT_TYPE_EMAIL'),
      t('TEXT_TYPE_SPEECH'),
      t('TEXT_TYPE_DIALOGUE'),
      t('TEXT_TYPE_POETRY'),
      t('TEXT_TYPE_SCRIPT'),
      t('TEXT_TYPE_EDITORIAL'),
      t('TEXT_TYPE_BLOG'),
      t('TEXT_TYPE_NOTICE'),
      t('TEXT_TYPE_MANUAL'),
      t('TEXT_TYPE_REVIEW'),
      t('TEXT_TYPE_INTERVIEW')
    ];
  }, [t, language]);

  const [openDiscourse, setOpenDiscourse] = React.useState(false);
  const [openTextType, setOpenTextType] = React.useState(false);
  const [discourseQuery, setDiscourseQuery] = React.useState('');
  const [textTypeQuery, setTextTypeQuery] = React.useState('');
  const discourseContainerRef = React.useRef<HTMLDivElement>(null);
  const textTypeContainerRef = React.useRef<HTMLDivElement>(null);
  const [discourseHover, setDiscourseHover] = React.useState(false);
  const [textTypeHover, setTextTypeHover] = React.useState(false);

  type PageSnapshot = {
    topic: string;
    grade: string;
    duration: number | '';
    teachingMethod: typeof teachingMethod;
    words: string[];
    sentences: string[];
    grammar: typeof grammar;
    discourseType: string | undefined;
    textType: string | undefined;
    wordCount: number | '' | undefined;
    articleContent: string | undefined;
    activityContent: string | undefined;
  };
  const pageCacheRef = React.useRef<Record<string, PageSnapshot>>({});
  const getPageKey = (subject: Subject, func: FunctionItem) => `${subject}::${func}`;

  const saveCurrentPageToCache = () => {
    const key = getPageKey(currentSubject, currentFunction);
    pageCacheRef.current[key] = {
      topic,
      grade,
      duration,
      teachingMethod,
      words,
      sentences,
      grammar,
      discourseType,
      textType,
      wordCount,
      articleContent,
      activityContent,
    };
  };

  const restorePageFromCache = (subject: Subject, func: FunctionItem) => {
    const key = getPageKey(subject, func);
    const snap = pageCacheRef.current[key];
    if (snap) {
      dispatch(setTopic(snap.topic || ''));
      dispatch(setGrade(snap.grade || ''));
      dispatch(setDuration(snap.duration === undefined ? '' : snap.duration));
      dispatch(setTeachingMethod(snap.teachingMethod));
      dispatch(setWords(snap.words || []));
      dispatch(setSentences(snap.sentences || []));
      dispatch(setGrammar(snap.grammar || []));
      dispatch(setDiscourseType(snap.discourseType || ''));
      dispatch(setTextType(snap.textType || ''));
      dispatch(setWordCount(snap.wordCount === undefined ? '' : snap.wordCount));
      dispatch(setArticleContent(snap.articleContent || ''));
      dispatch(setActivityContent(snap.activityContent || ''));
    } else {
      if (func === '阅读课') {
        dispatch(setTopic(''));
        dispatch(setDiscourseType(''));
        dispatch(setTextType(''));
        dispatch(setWordCount(''));
        dispatch(setArticleContent(''));
        dispatch(setActivityContent(''));
        dispatch(setWords([]));
        dispatch(setSentences([]));
        dispatch(setGrammar([]));
      } else {
        dispatch(setTopic(''));
        dispatch(setWords([]));
        dispatch(setSentences([]));
        dispatch(setGrammar([]));
        dispatch(setDiscourseType(''));
        dispatch(setTextType(''));
        dispatch(setWordCount(''));
        dispatch(setArticleContent(''));
        dispatch(setActivityContent(''));
      }
    }
  };

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inDiscourse = discourseContainerRef.current?.contains(target);
      const inTextType = textTypeContainerRef.current?.contains(target);
      if (!inDiscourse) setOpenDiscourse(false);
      if (!inTextType) setOpenTextType(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const clampWordCount = (val: number) => {
    if (isNaN(val)) return '';
    if (val < 40) return 40;
    if (val > 1200) return 1200;
    return val;
  };
  
  const selectKeySentences = (arr: string[]) => {
    const cleaned = filterArticleSentences(arr || []);
    const scored = cleaned.map(s => {
      const t = s.trim();
      const words = t.split(/\s+/).filter(Boolean).length;
      const hasPunct = /[.!?。！？]$/.test(t) ? 1 : 0;
      const lengthScore = Math.max(0, 1 - Math.abs(words - 18) / 18);
      return { s: t, score: lengthScore + hasPunct * 0.5 };
    });
    scored.sort((a, b) => b.score - a.score);
    const target = 5 + Math.floor(Math.random() * 2);
    return scored.slice(0, target).map(x => x.s);
  };
  
  const filterArticleSentences = (arr: string[]) => {
    const isLikelyHeading = (s: string) => {
      const t = s.trim();
      if (!t) return true;
      const words = t.split(/\s+/);
      const noEndPunct = !/[.!?。！？]$/.test(t);
      const allUpper = /^[A-Z\s]+$/.test(t) && t.length > 3;
      const hasHeadingKeywords = /(unit|lesson|chapter|section|part|练习|标题|目录|导入|活动|作者)/i.test(t);
      const veryShortCn = /[\u4e00-\u9fa5]/.test(t) && t.length <= 6 && noEndPunct;
      const veryShortEn = words.length <= 4 && noEndPunct;
      const looksNumbering = /^\s*\d+(\.|、|\))\s*/.test(t);
      return allUpper || hasHeadingKeywords || veryShortCn || veryShortEn || looksNumbering;
    };
    return arr.filter(s => {
      const t = s.trim();
      if (!t) return false;
      if (isLikelyHeading(t)) return false;
      // Exclude captions or figure/table references
      if (/(figure|图表|插图|表格)/i.test(t)) return false;
      // Exclude page markers
      if (/^page\s*\d+/i.test(t)) return false;
      return true;
    });
  };
  
  const pickStrategies = (content: string, dType: string | undefined, lang: 'zh' | 'en', user: string[]) => {
    const zhList = [
      '略读 (Skimming)','扫读/寻读 (Scanning)','预测 (Predicting)','推断 (Inferring)',
      '通过上下文猜测词义 (Guessing Meaning from Context)','总结/概括 (Summarizing)','识别主旨大意 (Identifying Main Ideas)',
      '寻找细节信息 (Finding Specific Details)','语篇分析 (Discourse Analysis)','识别作者观点/态度 (Identifying Author\'s Viewpoint / Attitude)',
      '因果逻辑映射 (Cause and Effect Mapping)','对比分析 (Comparison and Contrast)','识别信号词 (Identifying Signal Words)',
      '批判性思考 (Critical Thinking)','可视化绘图 (Visualizing / Graphic Organizing)','复述 (Retelling)',
      '问题求解分析 (Problem-solving Analysis)','文本结构分析 (Text Structure Analysis)'
    ];
    const enList = [
      'Skimming','Scanning','Predicting','Inferring','Guessing Meaning from Context','Summarizing',
      'Identifying Main Ideas','Finding Specific Details','Discourse Analysis','Identifying Author\'s Viewpoint / Attitude',
      'Cause and Effect Mapping','Comparison and Contrast','Identifying Signal Words','Critical Thinking',
      'Visualizing / Graphic Organizing','Retelling','Problem-solving Analysis','Text Structure Analysis'
    ];
    const base = lang === 'zh' ? zhList : enList;
    if (user.length > 0) return user;
    const txt = (content || '').toLowerCase();
    const out: string[] = [];
    const push = (s: string) => { if (!out.includes(s) && out.length < 6) out.push(s); };
    // Heuristics
    if (/story|once upon|dialogue|conversation|故事|叙述|对话/.test(txt) || /记叙文|narrative/i.test(dType || '')) {
      push(base[0]); // Skimming
      push(base[2]); // Predicting
      push(base[3]); // Inferring
      push(base[15]); // Retelling
    }
    if (/news|report|数据|统计|说明|科普/.test(txt) || /说明文|expository|科普/i.test(dType || '')) {
      push(base[6]); // Identifying Main Ideas
      push(base[5]); // Summarizing
      push(base[12]); // Identifying Signal Words
      push(base[10]); // Cause and Effect Mapping
    }
    if (/\d|\%|year|date|具体|细节|数字/.test(txt)) {
      push(base[1]); // Scanning
      push(base[7]); // Finding Specific Details
    }
    if (/however|but|although|然而|但是|虽然/.test(txt)) {
      push(base[11]); // Comparison and Contrast
    }
    if (/because|therefore|since|因为|因此/.test(txt)) {
      push(base[10]); // Cause and Effect Mapping
    }
    // Fill up to 5-6
    const target = 5 + Math.floor(Math.random() * 2);
    for (const s of base) {
      if (out.length >= target) break;
      if (!out.includes(s)) out.push(s);
    }
    return out;
  };

  const getDefaultWordCount = (gradeStr: string) => {
    const g = (gradeStr || '').trim();
    const mappingZh: Record<string, number> = {
      '一年级': 200,
      '二年级': 200,
      '三年级': 250,
      '四年级': 300,
      '五年级': 300,
      '六年级': 350,
      '七年级': 350,
      '八年级': 400,
      '九年级': 450,
      '高一': 500,
      '高二': 600,
      '高三': 600,
    };
    for (const key of Object.keys(mappingZh)) {
      if (g.includes(key)) return mappingZh[key];
    }
    const matchEn = g.match(/grade\s*(\d+)/i);
    if (matchEn) {
      const n = Number(matchEn[1]);
      if (n === 1) return 200;
      if (n === 2) return 200;
      if (n === 3) return 250;
      if (n === 4) return 300;
      if (n === 5) return 300;
      if (n === 6) return 350;
      if (n === 7) return 350;
      if (n === 8) return 400;
      if (n === 9) return 450;
    }
    if (/senior\s*1/i.test(g)) return 500;
    if (/senior\s*2/i.test(g)) return 600;
    if (/senior\s*3/i.test(g)) return 600;
    return 300;
  };

  const hasAnyInput = React.useMemo(() => {
    return !!topic.trim() || 
      !!grade.trim() || 
      (duration !== '' && Number(duration) > 0) || 
      !!localWords.trim() || 
      !!localSentences.trim() || 
      !!localGrammar.trim() ||
      (currentSubject === '英语' && currentFunction === '阅读课' && !!(localArticleContent || '').trim());
  }, [topic, grade, duration, localWords, localSentences, localGrammar, currentSubject, currentFunction, localArticleContent]);

  const isGenerateDisabled = !isLoading && currentFunction !== '课堂活动' && !hasAnyInput;

  return (
    <div className="min-h-screen font-sans transition-colors duration-300 relative flex overflow-hidden" style={{ backgroundColor: 'var(--bg-color)', backgroundImage: 'var(--bg-image)', color: 'var(--text-primary)' }}>
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div
          className="aurora-bg"
          aria-hidden="true"
          style={{
            ['--aurora-c1' as any]: rotatedColors[0],
            ['--aurora-c2' as any]: rotatedColors[1],
            ['--aurora-c3' as any]: rotatedColors[2],
            ['--aurora-c4' as any]: rotatedColors[3],
            ['--aurora-duration' as any]: weeklyScheme.duration,
          }}
        />
        <div
          className="scan-lines"
          aria-hidden="true"
          style={{
            ['--scan-color' as any]: weeklyScheme.lineColor,
            ['--scan-duration' as any]: weeklyScheme.duration,
            ['--scan-opacity' as any]: 0.12,
          }}
        />
      </div>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        currentView={currentView} 
        onViewChange={handleViewChange} 
        isMobile={isMobileScreen}
        currentTheme={currentTheme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 relative overflow-y-auto h-screen scrollbar-hide">
        <div className="min-h-full transition-all duration-300 px-4 min-[1100px]:px-8 py-8">

        {viewToRender === 'lesson-center' && (
          <>
            {error && <Toast message={error} type="error" onClose={() => dispatch(setError(null))} />}
            <div className="w-full mx-auto rounded-[24px] shadow-sm p-4 min-[1100px]:p-8 transition-colors duration-300 glass-panel" style={{ color: 'var(--text-primary)' }}>
        <div 
          className="flex items-center justify-between mb-6 gap-4 flex-wrap p-4 rounded-2xl backdrop-blur-md transition-colors duration-300 border border-white/20 shadow-sm"
          style={{ backgroundColor: 'var(--header-bg)' }}
        >
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg shadow-md overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 animate-pulse-slow">
              <img 
                src={APP_LOGO_BASE64} 
                alt="Logo" 
                className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
              />
            </div>
            <h1 className="text-3xl font-bold transition-colors duration-300" style={{ color: 'var(--header-text-color)' }}>{t('APP_TITLE')}</h1>
          </div>

          <div className="flex items-center gap-2">

            {/* Language Switch (Precision Style) */}
            <div className="relative flex items-center justify-center p-2">
              <div className="flex items-center gap-6 relative z-10">
                {['zh', 'en', 'fr'].map((langCode) => {
                  const isActive = language === langCode;
                  const label = langCode === 'zh' ? '中' : langCode === 'en' ? 'EN' : 'FR';
                  return (
                    <button
                      key={langCode}
                      onClick={() => {
                        dispatch(setUiLanguage(langCode as any));
                        dispatch(setLanguage(langCode as any));
                      }}
                      className="group relative flex flex-col items-center justify-center focus:outline-none w-12 h-12"
                    >
                      {isActive && (
                        <div 
                          className="absolute inset-0 rounded-full bg-[var(--primary-color)] animate-pulse-slow"
                          style={{ 
                            opacity: 0.5,
                            boxShadow: '0 0 30px rgba(var(--primary-rgb), 0.8)',
                            filter: 'blur(6px)'
                          }}
                        />
                      )}
                      <span 
                        className={`text-[18px] font-bold transition-all duration-300 relative z-10 ${
                          isActive 
                            ? 'text-[var(--text-primary)] scale-110' 
                            : 'text-gray-400 hover:text-gray-300'
                        }`}
                        style={{
                          textShadow: isActive ? '0 0 20px rgba(var(--primary-rgb), 0.8)' : 'none'
                        }}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-2">
          {/* Level 1: Subjects (Quizlet Segments Control Style) */}
          <div className="w-full p-[6px] rounded-2xl bg-[#F1F2F6] flex items-center relative z-0">
            {(Object.keys(SUBJECT_FUNCTIONS) as Subject[]).map((subject) => {
              const isActive = currentSubject === subject;
              return (
                <button
                  key={subject}
                  onClick={() => handleSubjectChange(subject)}
                  className={`
                    relative flex-1 py-3 rounded-[12px] text-[18px] font-semibold transition-all duration-300
                    flex items-center justify-center
                    ${isActive ? 'bg-white text-gray-800 shadow-[0_4px_10px_rgba(0,0,0,0.1)] z-10 scale-[1.02]' : 'text-gray-400 hover:text-gray-600 hover:bg-black/5'}
                  `}
                >
                  {getSubjectLabel(subject)}
                </button>
              );
            })}
          </div>

          {/* Level 2: Functions (De-weighted Style) */}
          <div className="mt-6 relative lg:overflow-visible overflow-x-hidden overflow-y-visible z-10">
            {/* Arrows (indicators) on mobile */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollTabsBy(-160)}
                className="absolute left-0 top-1/2 -translate-y-1/2 lg:hidden z-20 bg-transparent p-1"
                aria-label="Scroll tabs left"
              >
                <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
                  <path d="M8 2 L2 8 L8 14" stroke="var(--border-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollTabsBy(160)}
                className="absolute right-0 top-1/2 -translate-y-1/2 lg:hidden z-20 bg-transparent p-1"
                aria-label="Scroll tabs right"
              >
                <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
                  <path d="M2 2 L8 8 L2 14" stroke="var(--border-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <div
              ref={tabsScrollRef}
              className="flex lg:justify-center lg:flex-wrap pb-2 px-1 lg:overflow-visible overflow-x-auto overflow-y-visible tabs-scroll gap-x-12"
            >
            {SUBJECT_FUNCTIONS[currentSubject].map((func) => {
              const isActive = currentFunction === func;
              return (
                <button
                  key={func}
                  onClick={() => handleFunctionChange(func)}
                  className={`
                    relative py-2 text-[18px] font-semibold
                    transition-all duration-300 whitespace-nowrap focus:outline-none flex items-center justify-center
                    ${isActive 
                      ? 'text-[var(--primary-color)] after:content-[""] after:absolute after:-bottom-[6px] after:left-0 after:w-full after:h-[2px] after:bg-[var(--primary-color)] after:rounded-full after:shadow-[0_2px_4px_rgba(var(--primary-rgb),0.2)]' 
                      : 'text-gray-400 hover:text-gray-600'}
                  `}
                  style={{
                    backgroundColor: 'transparent',
                    boxShadow: 'none'
                  }}
                >
                  {getFunctionLabel(func)}
                </button>
              );
            })}
            </div>
          </div>
        </div>
      </div>

      <div className={`w-full mx-auto mt-6 ${currentFunction === 'AI 组卷' ? '' : 'flex flex-col lg:flex-row gap-6'}`}>
          
          <div 
             className={`${currentFunction === 'AI 组卷' ? 'w-full bg-transparent border-none shadow-none p-0' : 'w-full lg:w-1/4 p-6 rounded-2xl h-fit'}`}
             style={{
               backgroundColor: currentFunction === 'AI 组卷' ? 'transparent' : 'var(--container-bg)',
               // For AI Paper, we handle border via Tailwind classes for transparency
               border: currentFunction === 'AI 组卷' ? 'none' : '1px solid var(--input-border)',
               boxShadow: currentFunction === 'AI 组卷' ? 'none' : 'var(--input-glow)',
               backdropFilter: currentFunction === 'AI 组卷' ? 'none' : 'blur(10px)',
               color: 'var(--text-primary)'
             }}
           >

        {(((currentSubject === '英语') && (currentFunction === '教案生成' || currentFunction === '阅读课')) || currentFunction === '课堂活动') ? (
        <div className="space-y-6">
          {/* Hidden Inputs for AI Upload */}
          <div className="hidden">
              <input ref={docInputRef} type="file" accept=".txt,.pdf,.doc,.docx" multiple onChange={(e) => e.target.files && handleFilesSelected(e.target.files)} />
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => e.target.files && handleFilesSelected(e.target.files)} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => e.target.files && handleFilesSelected(e.target.files)} />
              <input ref={allInputRef} type="file" accept="image/*,.txt,.pdf,.doc,.docx" multiple onChange={(e) => e.target.files && handleFilesSelected(e.target.files)} />
          </div>
          {isUploadOptionsOpen && (
              <>
                <div className="fixed inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 10000 }} onClick={() => setIsUploadOptionsOpen(false)} />
                <div className="fixed left-1/2 bottom-8 -translate-x-1/2 w-[92vw] max-w-xl rounded-2xl shadow-2xl border p-5 z-[10001]" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                  <div className="text-center font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{t('LABEL_CHOOSE_UPLOAD_METHOD')}</div>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => { setIsUploadOptionsOpen(false); cameraInputRef.current?.click(); }} className="px-4 py-3 rounded-xl border text-sm font-semibold" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}>{t('BUTTON_TAKE_PHOTO')}</button>
                    <button onClick={() => { setIsUploadOptionsOpen(false); fileInputRef.current?.click(); }} className="px-4 py-3 rounded-xl border text-sm font-semibold" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}>{t('BUTTON_CHOOSE_FROM_GALLERY')}</button>
                    <button onClick={() => { setIsUploadOptionsOpen(false); docInputRef.current?.click(); }} className="px-4 py-3 rounded-xl border text-sm font-semibold" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}>{t('BUTTON_UPLOAD_DOCS')}</button>
                  </div>
                </div>
              </>
          )}

          {/* AI Assisted Input - Refactored */}
          <div className="flex flex-col gap-2 mb-2">
            <div className="flex items-center gap-2">
               <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>{t('SECTION_AI_INPUT')}</span>
            </div>
            
            <div className="flex items-center gap-3 py-2">
               {/* Camera */}
               <div className="relative group flex flex-col items-center gap-1 cursor-pointer" onClick={() => cameraInputRef.current?.click()}>
                  <div className={`w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_0_20px_var(--primary-color)] group-hover:border-[var(--primary-color)] ${activeAITool === 'camera' ? 'border-[var(--primary-color)] shadow-[0_0_20px_var(--primary-color)]' : ''}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}>
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                     </svg>
                  </div>
               </div>

               {/* Upload */}
               <div className="relative group flex flex-col items-center gap-1 cursor-pointer" onClick={() => allInputRef.current?.click()}>
                  <div className={`w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_0_20px_var(--primary-color)] group-hover:border-[var(--primary-color)] ${activeAITool === 'upload' ? 'border-[var(--primary-color)] shadow-[0_0_20px_var(--primary-color)]' : ''}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}>
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                     </svg>
                  </div>
               </div>

               {/* Voice */}
               <div className="relative group flex flex-col items-center gap-1 cursor-pointer" onClick={() => setActiveAITool(activeAITool === 'voice' ? null : 'voice')}>
                  <div className={`w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_0_20px_var(--primary-color)] group-hover:border-[var(--primary-color)] ${activeAITool === 'voice' ? 'border-[var(--primary-color)] shadow-[0_0_20px_var(--primary-color)]' : ''}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}>
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                     </svg>
                  </div>
               </div>
            </div>

            {/* Micro-operation Area */}
            <div className={`transition-all duration-300 overflow-hidden ${activeAITool ? 'max-h-60 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
               <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/30 backdrop-blur-sm flex items-center gap-3 overflow-x-auto">
                   {activeAITool === 'voice' ? (
                       <div className="flex items-center gap-3 w-full justify-center py-2">
                           <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                           <span className="text-sm text-gray-600">正在聆听... (Listening...)</span>
                       </div>
                   ) : (
                       previewFiles.length > 0 ? (
                           previewFiles.map((file, idx) => (
                               <div key={idx} className="relative w-16 h-16 rounded-lg border border-gray-200 bg-white overflow-hidden flex-shrink-0">
                                   {file.type.startsWith('image/') ? (
                                       <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                   ) : (
                                       <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500 bg-gray-50 p-1 text-center break-all">
                                           {file.name.slice(-10)}
                                       </div>
                                   )}
                               </div>
                           ))
                       ) : (
                           <div className="text-xs text-gray-400 italic w-full text-center">
                               {activeAITool === 'camera' ? '请拍摄照片...' : '请选择文件...'}
                           </div>
                       )
                   )}
               </div>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${currentFunction === '阅读课' ? 'md:grid-cols-2' : (currentFunction === '教案生成' ? 'md:grid-cols-2' : (currentFunction === '课堂活动' ? 'md:grid-cols-2' : 'md:grid-cols-2'))} lg:grid-cols-1 gap-6`}>
            {currentFunction === '教案生成' && (
              <div className="col-span-1 relative">
                <InputLabel 
                  label={t('LABEL_TOPIC')} 
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <circle cx="12" cy="12" r="6"/>
                        <circle cx="12" cy="12" r="2"/>
                      </g>
                    </svg>
                  } 
                  hasValue={!!topic.trim()} 
                />
                <div className="relative">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => dispatch(setTopic(e.target.value))}
                    placeholder={t('PLACEHOLDER_TOPIC')}
                    className={`${INPUT_CLASSES} ${topic.trim() ? 'border-indigo-500 bg-indigo-50/10' : ''} placeholder-gray-500 pr-20`}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                    {isAnalyzing && (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentFunction === '课堂活动' && (
              <div className="col-span-1 md:col-span-2 lg:col-span-1 relative">
                <InputLabel 
                  label={t('LABEL_ACTIVITY_CONTENT')} 
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </g>
                    </svg>
                  } 
                  hasValue={localActivityContent.trim().length > 0} 
                />
                <div className="relative">
                  <textarea
                    value={localActivityContent}
                    onChange={handleActivityContentChange}
                    placeholder={t('PLACEHOLDER_ACTIVITY_CONTENT')}
                    className={`${TEXTAREA_CLASSES} ${localActivityContent.trim() ? 'border-indigo-500 bg-indigo-50/10' : ''} placeholder-gray-500 pr-20`}
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1 z-10">
                    {isAnalyzing && (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Grade */}
            <div className="col-span-1 w-full">
                <InputLabel 
                label={t('LABEL_GRADE')} 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                    </g>
                  </svg>
                } 
                hasValue={!!grade.trim()} 
              />
              {currentFunction === '课堂活动' ? (
                <textarea
                  value={grade}
                  onChange={(e) => dispatch(setGrade(e.target.value))}
                  placeholder={t('PLACEHOLDER_GRADE_RANGE')}
                  className={`${TEXTAREA_CLASSES} ${grade.trim() ? 'border-indigo-500 bg-indigo-50/10' : ''} placeholder-gray-500 w-full`}
                />
              ) : (
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => dispatch(setGrade(e.target.value))}
                  placeholder={t('PLACEHOLDER_GRADE_RANGE')}
                  className={`${INPUT_CLASSES} ${grade.trim() ? 'border-indigo-500 bg-indigo-50/10' : ''} placeholder-gray-500 w-full`}
                />
              )}
              </div>

              {/* Duration */}
              {currentFunction !== '课堂活动' && currentFunction !== '阅读课' && (
              <div className="col-span-1 w-full">
                <InputLabel  
                  label={t('LABEL_DURATION')} 
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </g>
                    </svg>
                  } 
                  hasValue={duration !== '' && Number(duration) > 0} 
                />
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      dispatch(setDuration(''));
                    } else {
                      dispatch(setDuration(Number(val)));
                    }
                  }}
                  onBlur={handleDurationBlur}
                  placeholder={t('PLACEHOLDER_DURATION')}
                  className={`${INPUT_CLASSES} ${duration !== '' ? 'border-indigo-500 bg-indigo-50/10' : ''} placeholder-gray-500 w-full`}
                  style={{ color: '#6366F1' }}
                />
              </div>
              )}

              {/* Teaching Method */}
              {currentFunction !== '课堂活动' && currentFunction !== '阅读课' && (
                <div className="col-span-1 w-full">
                  <TeachingMethodSelector />
                </div>
              )}

            {currentFunction === '阅读课' && (
              <>
                <div ref={discourseContainerRef} className="col-span-1 form-group relative">
                  <InputLabel 
                    label={t('LABEL_DISCOURSE_TYPE')} 
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                          <path d="M4 6h16M4 12h16M4 18h16"/>
                        </g>
                      </svg>
                    } 
                    hasValue={!!(discourseType || '').trim()} 
                  />
                  <input
                    type="text"
                    value={discourseType || ''}
                    onFocus={() => setOpenDiscourse(true)}
                    onChange={(e) => {
                      setDiscourseQuery(e.target.value);
                      dispatch(setDiscourseType(e.target.value));
                    }}
                    placeholder={t('PLACEHOLDER_SEARCH')}
                    className={`${INPUT_CLASSES} ${discourseType ? 'border-indigo-500 bg-indigo-50/10' : ''} placeholder-gray-500`}
                    style={{
                      borderColor: (openDiscourse || discourseHover) ? 'var(--primary-color)' : undefined,
                      boxShadow: (openDiscourse || discourseHover) ? '0 0 0 2px rgba(99,102,241,0.3)' : undefined
                    }}
                  />
                  {openDiscourse && (
                    <div
                      className="absolute z-10 mt-2 rounded-xl border shadow-lg p-3 grid grid-cols-3 gap-2"
                      style={{
                        backgroundColor: 'var(--card-bg)',
                        borderColor: 'var(--border-color)',
                        width: 'max(100%, 40rem)',
                        minWidth: '40rem',
                        maxWidth: '52rem',
                        maxHeight: '26rem',
                        overflowX: 'auto',
                        overflowY: 'auto',
                        touchAction: 'pan-x pan-y'
                      }}
                      onMouseEnter={() => setDiscourseHover(true)}
                      onMouseLeave={() => setDiscourseHover(false)}
                    >
                      {discourseOptions.filter(o => (discourseQuery || '').trim() ? o.toLowerCase().includes(discourseQuery.trim().toLowerCase()) : true).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className="px-3 py-2 rounded border text-sm hover:bg-indigo-100 hover:border-indigo-500 hover:text-indigo-700"
                          style={{
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)',
                            minWidth: '8rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          onClick={() => {
                            dispatch(setDiscourseType(opt));
                            setDiscourseQuery('');
                            setOpenDiscourse(false);
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div ref={textTypeContainerRef} className="col-span-1 form-group relative">
                  <InputLabel 
                    label={t('LABEL_TEXT_TYPE')} 
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                          <path d="M6 4h12l-2 16H8z"/>
                        </g>
                      </svg>
                    } 
                    hasValue={!!(textType || '').trim()} 
                  />
                  <input
                    type="text"
                    value={textType || ''}
                    onFocus={() => setOpenTextType(true)}
                    onChange={(e) => {
                      setTextTypeQuery(e.target.value);
                      dispatch(setTextType(e.target.value));
                    }}
                    placeholder={t('PLACEHOLDER_SEARCH')}
                    className={`${INPUT_CLASSES} ${textType ? 'border-indigo-500 bg-indigo-50/10' : ''} placeholder-gray-500`}
                    style={{
                      borderColor: (openTextType || textTypeHover) ? 'var(--primary-color)' : undefined,
                      boxShadow: (openTextType || textTypeHover) ? '0 0 0 2px rgba(99,102,241,0.3)' : undefined
                    }}
                  />
                  {openTextType && (
                    <div
                      className="absolute z-10 mt-2 rounded-xl border shadow-lg p-3 grid grid-cols-3 gap-2"
                      style={{
                        backgroundColor: 'var(--card-bg)',
                        borderColor: 'var(--border-color)',
                        width: 'max(100%, 40rem)',
                        minWidth: '40rem',
                        maxWidth: '52rem',
                        maxHeight: '26rem',
                        overflowX: 'auto',
                        overflowY: 'auto',
                        touchAction: 'pan-x pan-y'
                      }}
                      onMouseEnter={() => setTextTypeHover(true)}
                      onMouseLeave={() => setTextTypeHover(false)}
                    >
                      {textTypeOptions.filter(o => (textTypeQuery || '').trim() ? o.toLowerCase().includes(textTypeQuery.trim().toLowerCase()) : true).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className="px-3 py-2 rounded border text-sm hover:bg-indigo-100 hover:border-indigo-500 hover:text-indigo-700"
                          style={{
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)',
                            minWidth: '8rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          onClick={() => {
                            dispatch(setTextType(opt));
                            setTextTypeQuery('');
                            setOpenTextType(false);
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="col-span-1 form-group">
                  <InputLabel 
                    label={t('LABEL_WORD_COUNT')} 
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M8 12h8"/>
                        </g>
                      </svg>
                    } 
                    hasValue={wordCount !== '' && Number(wordCount) > 0} 
                  />
                  <input
                    type="number"
                    value={wordCount === '' ? '' : Number(wordCount)}
                    readOnly
                    placeholder={t('PLACEHOLDER_AUTO_COUNTED')}
                    className={`${INPUT_CLASSES} ${wordCount !== '' ? 'border-indigo-500 bg-indigo-50/10' : ''} placeholder-gray-500`}
                  />
                </div>
              </>
            )}

            {currentFunction === '阅读课' ? (
              <div className="col-span-1 relative">
                <InputLabel 
                  label={t('LABEL_ARTICLE_CONTENT')} 
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </g>
                    </svg>
                  } 
                  hasValue={localArticleContent.trim().length > 0} 
                  rightContent={
                    (() => {
                      const count = (localArticleContent || '').trim().split(/\s+/).filter(Boolean).length;
                      const text = `${t('LABEL_WORD_COUNT_PREFIX')}${count}`;
                      return <span style={{ color: 'var(--text-secondary)' }}>{text}</span>;
                    })()
                  }
                />
                <div className="relative">
                  <textarea
                    value={localArticleContent}
                    onChange={handleArticleContentChange}
                    placeholder={t('PLACEHOLDER_ARTICLE_CONTENT')}
                    className={`${TEXTAREA_CLASSES} ${localArticleContent.trim() ? 'border-indigo-500 bg-indigo-50/10' : ''} placeholder-gray-500 pr-20`}
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1 z-10">
                    {isAnalyzing ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>
                    ) : (
                      <>
                        <button 
                          onClick={() => {
                            if (isMobile) setIsUploadOptionsOpen(true);
                            else cameraInputRef.current?.click();
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[var(--primary-color)] transition-colors"
                          title={t('BUTTON_TAKE_PHOTO')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                          </svg>
                        </button>
                        <button 
                          onClick={() => {
                            if (isMobile) setIsUploadOptionsOpen(true);
                            else allInputRef.current?.click();
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[var(--primary-color)] transition-colors"
                          title={t('BUTTON_UPLOAD_DOCS')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`col-span-1 ${currentFunction === '教案生成' ? 'md:col-span-2' : ''} lg:col-span-1`}>
                <InputLabel 
                  label={
                    currentFunction === '课堂活动'
                      ? (
                        currentSubject === '数学'
                          ? t('LABEL_KEY_POINTS')
                          : currentSubject === '语文'
                            ? t('LABEL_CORE_PHRASES')
                            : t('LABEL_KEYWORDS')
                        )
                      : t('LABEL_KEYWORDS')
                  } 
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </g>
                    </svg>
                  } 
                  hasValue={localWords.trim().length > 0} 
                />
                <textarea
                  value={localWords}
                  onChange={handleWordsChange}
                  placeholder={
                    currentFunction === '课堂活动'
                      ? (
                        currentSubject === '数学'
                          ? t('PLACEHOLDER_MATH_EXAMPLE')
                          : currentSubject === '语文'
                            ? t('PLACEHOLDER_CHINESE_EXAMPLE')
                            : t('PLACEHOLDER_KEYWORDS')
                        )
                      : t('PLACEHOLDER_KEYWORDS')
                  }
                  className={`${TEXTAREA_CLASSES} ${localWords.trim() ? 'border-[var(--primary-color)] bg-[var(--shadow-color)]' : ''} placeholder-gray-500`}
                />
              </div>
            )}

            {/* Sentences / Reading Strategy */}
            {!(currentFunction === '课堂活动' && currentSubject === '数学') && (
            <div className={`col-span-1 ${currentFunction === '阅读课' ? '' : 'md:col-span-2'} lg:col-span-1`}>
              <InputLabel 
                label={
                  currentFunction === '阅读课' 
                    ? t('LABEL_READING_STRATEGY')
                    : (currentFunction === '课堂活动' && currentSubject === '语文'
                        ? t('LABEL_SENTENCE_STRUCTURES')
                        : t('LABEL_SENTENCES'))
                } 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </g>
                  </svg>
                } 
                hasValue={sentences.length > 0 && sentences[0] !== ''} 
              />
              <textarea
                value={localSentences}
                onChange={handleSentencesChange}
                placeholder={
                  currentFunction === '阅读课' 
                    ? t('PLACEHOLDER_READING_STRATEGY')
                    : (
                      currentFunction === '课堂活动' && currentSubject === '语文'
                          ? t('PLACEHOLDER_SENTENCE_STRUCTURES_EXAMPLE')
                          : t('PLACEHOLDER_SENTENCES')
                      )
                }
                className={`${TEXTAREA_CLASSES} ${localSentences.trim().length > 0 ? 'border-[var(--primary-color)] bg-[var(--shadow-color)]' : ''} placeholder-gray-500`}
              />
            </div>
            )}

            {(currentFunction !== '阅读课') && !(currentFunction === '课堂活动' && (currentSubject === '数学' || currentSubject === '语文')) && (
              <div className="col-span-1 md:col-span-2 lg:col-span-1">
                <InputLabel 
                  label={t('LABEL_GRAMMAR')} 
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
                      </g>
                    </svg>
                  } 
                  hasValue={grammar.length > 0} 
                />
                <textarea
                  value={localGrammar}
                  onChange={handleGrammarChange}
                  placeholder={t('PLACEHOLDER_GRAMMAR')}
                  className={`${TEXTAREA_CLASSES} ${localGrammar.trim().length > 0 ? 'border-[var(--primary-color)] bg-[var(--shadow-color)]' : ''} placeholder-gray-500`}
                />
              </div>
            )}
          </div>

          {/* Action Button */}
          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerateDisabled}
            className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center text-lg ${
              isGenerateDisabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                : error 
                  ? 'bg-orange-500 hover:bg-orange-600 text-white transform hover:-translate-y-0.5' 
                  : 'transform hover:-translate-y-0.5'
            }`}
            style={
              !isGenerateDisabled && !error
                ? { backgroundColor: 'var(--button-bg)', color: 'var(--button-text)' }
                : {}
            }
            title={isLoading ? t('ACTION_CANCEL_GENERATION') : ''}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <span className="relative mr-3 inline-flex items-center justify-center">
                  <Spinner className="h-5 w-5" style={{ color: 'var(--button-text)' }} />
                  <span 
                    className="absolute rounded-full border-2 animate-spin" 
                    style={{ 
                      width: '1.75rem', 
                      height: '1.75rem', 
                      borderColor: 'rgba(99,102,241,0.4)', 
                      borderTopColor: 'transparent' 
                    }} 
                  />
                </span>
                <span className="flex items-center gap-2">
                  <span>{t('BUTTON_GENERATING')}</span>
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full"
                    style={{ border: '2px solid var(--button-text)', backgroundColor: 'rgba(15,23,42,0.08)', color: 'var(--button-text)' }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <rect x="6" y="6" width="12" height="12" rx="2" ry="2" fill="currentColor" />
                    </svg>
                  </span>
                </span>
              </span>
            ) : error ? (
              "人太多啦？重试一下吧"
            ) : (
              currentFunction === '课堂活动' ? t('BUTTON_GENERATE_ACTIVITY') : t('BUTTON_GENERATE')
            )}
          </button>
          {isLoading && segmentedStatus && (
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                {segmentedStatus.outline === 'done' ? (
                  <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <Spinner className="h-4 w-4" style={{ color: 'var(--primary-color)' }} />
                )}
                <span>大纲与元数据</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                {segmentedStatus.prep === 'done' ? (
                  <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <Spinner className="h-4 w-4" style={{ color: 'var(--primary-color)' }} />
                )}
                <span>教学准备</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                {segmentedStatus.proc === 'done' ? (
                  <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <Spinner className="h-4 w-4" style={{ color: 'var(--primary-color)' }} />
                )}
                <span>教学环节 (Steps)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                {segmentedStatus.full === 'done' ? (
                  <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <Spinner className="h-4 w-4" style={{ color: 'var(--primary-color)' }} />
                )}
                <span>完整整合</span>
              </div>
            </div>
          )}
        </div>
        ) : (currentFunction === 'AI 组卷') ? (
          <div className="w-full mx-auto">
            <AIPaperGenerator />
          </div>
        ) : (TEXTBOOK_CENTER_ENABLED && currentFunction === '教材中心') ? (
          <div className="space-y-6">
            <div className="mb-4 flex items-center justify-end"></div>
            {!selectedId ? (
              <div className={`space-y-8 transition-opacity duration-300 ${selectedId ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {(['小学','初中','高中'] as const).map(level => (
                  <div key={level} className="space-y-3">
                    <div className="flex items-center">
                      <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{level}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {textbookGroups[level].map(tb => (
                        <button
                          key={tb.id}
                          onClick={() => {
                            setSelectedId(tb.id);
                            setTimeout(() => setHideOthers(true), 300);
                          }}
                          className="relative rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] border"
                          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}
                        >
                          <div className="h-32 flex items-center justify-center text-2xl font-bold"
                            style={{ backgroundImage: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(16,185,129,0.15))', color: 'var(--text-primary)' }}>
                            {tb.name.slice(0, 6)}
                          </div>
                          <div className="p-3 text-left" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {textbooks.map(tb => {
                  const isSelected = tb.id === selectedId;
                  if (!isSelected && hideOthers) return null;
                  const getGradesForVersion = (v: string) => {
                    if (/PEP|外研版一年级起点|外研版三年级起点|剑桥版三年级起点|北师大版$|上海版牛津|牛津译林版/.test(v)) return t('STAGE_PRIMARY');
                    if (/go for it|外研版\(初中\)|冀教版/.test(v)) return t('STAGE_JUNIOR');
                    if (/新课标|外研版\(高中\)|北师大版\(高中\)/.test(v)) return t('STAGE_SENIOR');
                    return t('STAGE_RANGE_ALL');
                  };
                  const getFocusForVersion = (v: string) => {
                    if (/PEP|go for it/.test(v)) return t('FOCUS_TIERED_VOCAB_SHORT');
                    if (/外研版/.test(v)) return t('FOCUS_UNIT_THEMES');
                    if (/牛津|译林/.test(v)) return t('FOCUS_FUNCTIONAL');
                    if (/北师大/.test(v)) return t('FOCUS_CORE_LITERACY');
                    return t('FOCUS_TIERED_VOCAB');
                  };
                  return (
                    <div
                      data-popover-id={`tb-pop-${tb.id}`}
                      key={tb.id}
                      className={`transition-all duration-300`}
                      style={{
                        opacity: isSelected ? 1 : 0,
                        transform: isSelected ? 'scale(1.0)' : 'scale(0.8)',
                      }}
                    >
                      <div className="rounded-2xl overflow-hidden border shadow-md relative" style={{ borderColor: isSelected ? 'var(--primary-color)' : 'var(--border-color)', backgroundColor: 'var(--card-bg)', boxShadow: isSelected ? '0 0 0 2px rgba(99,102,241,0.35), 0 10px 20px rgba(0,0,0,0.15)' : '0 4px 10px rgba(0,0,0,0.08)' }}>
                        
                        <div className="h-48 relative flex items-center justify-center text-3xl font-bold"
                          style={{ backgroundImage: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(16,185,129,0.2))', color: 'var(--text-primary)' }}>
                          {isSelected && (
                            <img
                              src={`/covers/${versionToKey(tb.version)}.webp`}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="absolute inset-0 w-full h-full object-cover opacity-20"
                            />
                          )}
                          <span className="relative">{tb.name}</span>
                          {isSelected && (
                            <button
                              onClick={() => { setSelectedId(null); setHideOthers(false); setTextbookVolume(''); setTextbookUnit(''); setTextbookPageStart(''); setTextbookPageEnd(''); }}
                              className="absolute top-3 right-3 px-3 py-1 rounded-lg font-semibold text-sm active:scale-95"
                              style={{ 
                                backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 40%, #e2e8f0 100%)',
                                color: 'var(--primary-color)',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 10px rgba(0,0,0,0.12)',
                                border: '1px solid var(--border-color)'
                              }}
                            >
                              {t('LABEL_RESELECT_TEXTBOOK')}
                            </button>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('LABEL_VERSION')} {tb.version}</div>
                          <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {t('LABEL_APPLICABLE_GRADES') + getGradesForVersion(tb.version)}
                          </div>
                          <div className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {t('LABEL_TEACHING_FOCUS') + getFocusForVersion(tb.version)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 transition-opacity duration-300 space-y-4">
                        <div className="space-y-3">
                          <div className="form-group">
                            <InputLabel label={t('LABEL_TEXTBOOK_VOLUME')} icon={
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></g></svg>
                            } hasValue={!!textbookVolume} />
                            <select
                              value={textbookVolume}
                              onChange={(e) => setTextbookVolume(e.target.value)}
                              className={`${INPUT_CLASSES} ${textbookVolume ? 'border-indigo-500 bg-indigo-50/10' : ''}`}
                            >
                              <option value="">{t('LABEL_SELECT_OPTION')}</option>
                              {getVolumeOptions(tb.version).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <InputLabel label={t('LABEL_UNIT')} icon={
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></g></svg>
                            } hasValue={!!textbookUnit} />
                            <select
                              value={textbookUnit}
                              onChange={(e) => setTextbookUnit(e.target.value)}
                              disabled={!textbookVolume}
                              className={`${INPUT_CLASSES} ${textbookUnit ? 'border-indigo-500 bg-indigo-50/10' : ''}`}
                            >
                              <option value="">{t('LABEL_SELECT_OPTION')}</option>
                              {unitsForCurrent.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="form-group">
                            <InputLabel label={t('LABEL_PAGES')} icon={
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></g></svg>
                            } hasValue={typeof textbookPageStart === 'number' && typeof textbookPageEnd === 'number'} />
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={textbookPageStart === '' ? '' : Number(textbookPageStart)}
                                onChange={(e) => setTextbookPageStart(e.target.value === '' ? '' : Number(e.target.value))}
                                className={`${INPUT_CLASSES} flex-1`}
                                placeholder={t('PLACEHOLDER_START_PAGE')}
                              />
                              <span>-</span>
                              <input
                                type="number"
                                value={textbookPageEnd === '' ? '' : Number(textbookPageEnd)}
                                onChange={(e) => setTextbookPageEnd(e.target.value === '' ? '' : Number(e.target.value))}
                                className={`${INPUT_CLASSES} flex-1`}
                                placeholder={t('PLACEHOLDER_END_PAGE')}
                              />
                            </div>
                          </div>
                          <div className="form-group">
                            <InputLabel label={t('LABEL_DURATION')} icon={
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></g></svg>
                            } hasValue={duration !== '' && Number(duration) > 0} />
                            <input
                              type="number"
                              value={duration}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') dispatch(setDuration(''));
                                else dispatch(setDuration(Number(val)));
                              }}
                              onBlur={handleDurationBlur}
                              placeholder={t('PLACEHOLDER_DURATION')}
                              className={`${INPUT_CLASSES} ${duration !== '' ? 'border-indigo-500 bg-indigo-50/10' : ''} placeholder-gray-500`}
                            />
                          </div>
                          <div className="form-group">
                            <TeachingMethodSelector />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="form-group md:col-span-2">
                            <InputLabel label={t('LABEL_TOPIC')} icon={
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></g></svg>
                            } hasValue={!!topic.trim()} />
                            <input
                              type="text"
                              value={topic}
                              onChange={(e) => dispatch(setTopic(e.target.value))}
                              placeholder={t('PLACEHOLDER_TOPIC')}
                              className={`${INPUT_CLASSES} ${topic.trim() ? 'border-indigo-500 bg-indigo-50/10' : ''} placeholder-gray-500`}
                            />
                          </div>
                          <div className="form-group md:col-span-2">
                            <InputLabel label={t('LABEL_KEYWORDS')} icon={
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></g></svg>
                            } hasValue={(Array.isArray(words) ? words.join(', ') : '').trim().length > 0} />
                            <textarea
                              value={Array.isArray(words) ? words.join(', ') : ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                const arr = v.split(/[,，\s]+/).filter(w => w.trim() !== '');
                                dispatch(setWords(arr));
                              }}
                              placeholder={t('PLACEHOLDER_KEYWORDS')}
                              className={`${TEXTAREA_CLASSES} ${words.length ? 'border-indigo-500 bg-indigo-50/10' : ''} placeholder-gray-500`}
                            />
                          </div>
                          <div className="form-group md:col-span-2">
                            <InputLabel label={t('LABEL_SENTENCES')} icon={
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></g></svg>
                            } hasValue={sentences.length > 0} />
                            <textarea
                              value={Array.isArray(sentences) ? sentences.join('\n') : ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                const arr = v.split('\n').map(s => s.trim()).filter(s => s);
                                dispatch(setSentences(arr));
                              }}
                              placeholder={t('PLACEHOLDER_SENTENCES')}
                              className={`${TEXTAREA_CLASSES} ${sentences.length ? 'border-indigo-500 bg-indigo-50/10' : ''} placeholder-gray-500`}
                            />
                          </div>
                          <div className="form-group md:col-span-2">
                            <InputLabel label={t('LABEL_GRAMMAR')} icon={
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></g></svg>
                            } hasValue={grammar.length > 0} />
                            <textarea
                              value={Array.isArray(grammar) ? grammar.map(g => g.rule).join('\n') : ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                const arr = v.split('\n').map(s => s.trim()).filter(s => s).map((rule, idx) => ({ id: `${idx}`, rule }));
                                dispatch(setGrammar(arr));
                              }}
                              placeholder={t('PLACEHOLDER_GRAMMAR')}
                              className={`${TEXTAREA_CLASSES} ${grammar.length ? 'border-indigo-500 bg-indigo-50/10' : ''} placeholder-gray-500`}
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleGenerate}
                          disabled={isLoading || !topic.trim()}
                          className={`w-full font-bold py-4 rounded-[24px] shadow-lg transition-all active:scale-95 flex items-center justify-center text-lg quizlet-button ${
                            isLoading || !topic.trim()
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                              : 'transform hover:scale-102'
                          }`}
                          style={
                            !(isLoading || !topic.trim())
                              ? { backgroundColor: 'var(--button-bg)', color: 'var(--button-text)' }
                              : {}
                          }
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center">
                              <span className="relative mr-3 inline-flex items-center justify-center">
                                <Spinner className="h-5 w-5" style={{ color: 'var(--button-text)' }} />
                                <span className="absolute rounded-full border-2 animate-spin" style={{ width: '1.75rem', height: '1.75rem', borderColor: 'rgba(99,102,241,0.4)', borderTopColor: 'transparent' }} />
                              </span>
                              {t('BUTTON_GENERATING')}
                            </span>
                          ) : (
                            t('BUTTON_GENERATE')
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-center" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
            <div className="text-6xl mb-4">🚧</div>
            <h3 className="text-xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              {getFunctionLabel(currentFunction)}
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              {t('TAB_PLACEHOLDER_DEV').replace('{subject}', getSubjectLabel(currentSubject)).replace('{function}', getFunctionLabel(currentFunction))}
            </p>
          </div>
        )}
      </div>

      {currentFunction !== 'AI 组卷' && (
      <div className="w-full lg:w-3/4">
        {generatedPlan ? (
          <>
              <div className="flex justify-between items-center mb-4 md:mb-6 border-b pb-3" style={{ borderColor: 'var(--border-color)', transform: previewTransition ? 'scale(0.98)' : 'none', transition: 'transform 280ms ease' }} data-preview-header>
              <h2 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('LABEL_PREVIEW')}</h2>
              <div className="text-xs md:text-sm px-2 md:px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-secondary)' }}>
                {getPlanTitle(generatedPlan)}
              </div>
            </div>
            <LessonPlanCard 
              plan={generatedPlan} 
              onRegenerate={handleGenerate} 
              subject={currentSubject} 
              functionType={currentFunction}
              onBookmark={handleToggleFavorite}
              onShare={() => openWeChatShare(generatedPlan)}
              isBookmarked={isPlanBookmarked(generatedPlan)}
              onCollapse={handleCollapsePreview}
            />
          </>
        ) : (
          <>
            {(currentFunction !== '教材中心' || !!selectedId) && (
              <div className="mt-12 border-2 border-dashed rounded-2xl p-12 text-center text-gray-400"
                   style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">{t('LABEL_PREVIEW_PLACEHOLDER')}</p>
              </div>
            )}
          </>
        )}
        {recentPlans.length > 0 && (
          <div className="mt-6 space-y-3" ref={recentListRef}>
                {recentPlans.filter(item => item.subject === currentSubject || (!item.subject && currentSubject === '英语')).map(item => (
                  <div
                    key={item.id}
                    className="relative rounded-xl shadow-sm overflow-hidden border border-transparent hover:border-indigo-100 transition-all"
                    style={{ 
                      backgroundColor: 'var(--card-bg)', 
                      opacity: deletingRecentId === item.id ? 0 : 1,
                    }}
                  >
                    {/* Mobile Swipe Buttons Layer */}
                    <div className="absolute top-0 right-0 h-full flex items-center justify-end gap-2 pr-4 z-0" style={{ width: '100%' }}>
                         <button 
                           onClick={(e) => { e.stopPropagation(); setDownloadMenuPlan(item.plan); setShowGlobalDownloadMenu(true); }}
                           className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                           style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                         >
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                         </button>
                         <button 
                           onClick={(e) => { e.stopPropagation(); openWeChatShare(item.plan); }}
                           className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                           style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
                         >
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                         </button>
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             const plan = item.plan;
                             const planKey = computePlanKey(plan);
                             const isMarked = favorites.some(f => f.subject === currentSubject && f.planKey === planKey);
                             if (isMarked) {
                                const next = favorites.filter(f => !(f.subject === currentSubject && f.planKey === planKey));
                                persistFavorites(next);
                             } else {
                                const title = getPlanTitle(plan) || item.title;
                                const fav: FavoriteItem = { id: Date.now(), title, subject: currentSubject, content: plan, savedAt: item.time, planKey };
                                persistFavorites([fav, ...favorites]);
                             }
                           }}
                           className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                           style={{ 
                             backgroundColor: isPlanBookmarked(item.plan as LessonPlan) ? 'rgba(234,179,8,0.1)' : 'rgba(156,163,175,0.1)', 
                             color: isPlanBookmarked(item.plan as LessonPlan) ? '#eab308' : '#9ca3af' 
                           }}
                         >
                           <svg className="w-5 h-5" fill={isPlanBookmarked(item.plan as LessonPlan) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                         </button>
                         <button
                           onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(t('CONFIRM_DELETE'))) {
                                 setRecentPlans(rs => rs.filter(r => r.id !== item.id));
                              }
                           }}
                           className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                           style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                         >
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m3-3h8m-7 3v12m4-12v12" /></svg>
                         </button>
                      </div>
                    {/* Main Clickable Area */}
                    <div
                      className="p-4 cursor-pointer relative z-10 transition-transform duration-300 ease-out"
                      style={{ 
                        backgroundColor: 'var(--card-bg)',
                        transform: slidingRecentId === item.id ? 'translateX(-220px)' : 'translateX(0)',
                      }}
                      onClick={(e) => {
                        if (slidingRecentId === item.id) {
                          e.stopPropagation();
                          setSlidingRecentId(null);
                          return;
                        }
                        setExpandedRecentId(prev => prev === item.id ? null : item.id);
                        dispatch(setGeneratedPlan(null));
                      }}
                      onPointerDown={(e) => {
                        if (!isMobileScreen || generatedPlan || expandedRecentId) return;
                        const t: any = e.currentTarget;
                        t._sx = e.clientX;
                      }}
                      onPointerMove={(e) => {
                        const t: any = e.currentTarget;
                        const sx = t._sx;
                        if (sx !== 0 && !sx) return;
                        const dx = e.clientX - sx;
                        if (dx < -40) setSlidingRecentId(item.id);
                        else if (dx > 40 && slidingRecentId === item.id) setSlidingRecentId(null);
                      }}
                      onPointerUp={(e) => {
                        const t: any = e.currentTarget;
                        delete t._sx;
                      }}
                      onTouchStart={(e) => {
                        if (!isMobileScreen || generatedPlan || expandedRecentId) return;
                        const t: any = e.currentTarget;
                        t._sx = e.touches[0].clientX;
                      }}
                      onTouchMove={(e) => {
                        const t: any = e.currentTarget;
                        const sx = t._sx;
                        if (!sx && sx !== 0) return;
                        const dx = e.touches[0].clientX - sx;
                        if (dx < -40) setSlidingRecentId(item.id);
                        else if (dx > 40 && slidingRecentId === item.id) setSlidingRecentId(null);
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                         <div className="flex-1">
                            <h3 className="font-semibold text-lg flex items-center gap-2 group" style={{ color: 'var(--text-primary)' }}>
                               {editingId === item.id ? (
                                  <div onClick={e => e.stopPropagation()} className="flex-1">
                                    <input 
                                      value={editingTitle} 
                                      onChange={e => setEditingTitle(e.target.value)}
                                      onBlur={() => {
                                        const newTitle = editingTitle.trim() || item.title;
                                        setRecentPlans(rs => rs.map(r => r.id === item.id ? { ...r, title: newTitle } : r));
                                        const planKey = computePlanKey(item.plan);
                                        const nextFavorites = favorites.map(f => 
                                          f.subject === currentSubject && f.planKey === planKey
                                            ? { ...f, title: newTitle }
                                            : f
                                        );
                                        persistFavorites(nextFavorites);
                                         setEditingId(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                           const newTitle = editingTitle.trim() || item.title;
                                           setRecentPlans(rs => rs.map(r => r.id === item.id ? { ...r, title: newTitle } : r));
                                           const planKey = computePlanKey(item.plan);
                                           const nextFavorites = favorites.map(f => 
                                             f.subject === currentSubject && f.planKey === planKey
                                               ? { ...f, title: newTitle }
                                               : f
                                           );
                                           persistFavorites(nextFavorites);
                                           setEditingId(null);
                                        }
                                      }}
                                      className="border rounded px-2 py-1 text-sm w-full"
                                      autoFocus
                                    />
                                  </div>
                               ) : (
                                  <>
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingId(item.id);
                                        setEditingTitle(item.title);
                                      }}
                                      style={{ cursor: 'text' }}
                                    >
                                      {item.title}
                                    </span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditingTitle(item.title); }}
                                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded text-gray-400 transition-opacity"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                  </>
                               )}
                            </h3>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                              {new Date(item.time).toLocaleString()}
                            </p>
                         </div>
                         
                         {/* Desktop Buttons (Always visible on desktop) */}
                         {!isMobileScreen && (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                               <button 
                                 onClick={() => { setDownloadMenuPlan(item.plan); setShowGlobalDownloadMenu(true); }}
                                 className="p-2 rounded-full hover:bg-blue-50 text-blue-500 transition-colors"
                                 title={t('ACTION_DOWNLOAD')}
                               >
                                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                               </button>
                               <button 
                                 onClick={() => openWeChatShare(item.plan)}
                                 className="p-2 rounded-full hover:bg-green-50 text-green-500 transition-colors"
                                 title={t('ACTION_SHARE')}
                               >
                                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                               </button>
                               <button 
                                 onClick={() => {
                                   const plan = item.plan;
                                   const planKey = computePlanKey(plan);
                                   const isMarked = favorites.some(f => f.subject === currentSubject && f.planKey === planKey);
                                   if (isMarked) {
                                      const next = favorites.filter(f => !(f.subject === currentSubject && f.planKey === planKey));
                                      persistFavorites(next);
                                   } else {
                                      const title = getPlanTitle(plan) || item.title;
                                      const fav: FavoriteItem = { id: Date.now(), title, subject: currentSubject, content: plan, savedAt: item.time, planKey };
                                      persistFavorites([fav, ...favorites]);
                                   }
                                 }}
                                 className={`p-2 rounded-full transition-colors ${isPlanBookmarked(item.plan as LessonPlan) ? 'bg-yellow-50 text-yellow-500' : 'hover:bg-yellow-50 text-gray-400 hover:text-yellow-500'}`}
                                 title={t('ACTION_FAVORITE')}
                               >
                                 <svg className="w-5 h-5" fill={isPlanBookmarked(item.plan as LessonPlan) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                               </button>
                               <button 
                                 onClick={() => {
                                    if (window.confirm(t('CONFIRM_DELETE'))) {
                                       setRecentPlans(rs => rs.filter(r => r.id !== item.id));
                                    }
                                 }}
                                 className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"
                                 title={t('ACTION_DELETE')}
                               >
                                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m3-3h8m-7 3v12m4-12v12" /></svg>
                               </button>
                            </div>
                         )}
                      </div>
                    </div>
                    
                    {/* Expanded Content */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out bg-gray-50/50 relative z-20`}
                      style={{ 
                        maxHeight: expandedRecentId === item.id ? '8000px' : '0px',
                        borderTop: expandedRecentId === item.id ? '1px solid var(--border-color)' : 'none'
                      }}
                    >
                      <div className="p-4">
                        <LessonPlanCard
                          plan={item.plan as any}
                          subject={(item.subject as Subject) || currentSubject}
                          functionType={currentFunction}
                          hideFooter={true}
                        />
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        )}
      </div>
      )}
      </div>

        </>
      )}

      {viewToRender === 'membership' && (
         <div className="w-full h-full">
           <MembershipPage />
         </div>
      )}

      {viewToRender === 'settings' && (
        <div className="w-full h-full overflow-y-auto">
          <SettingsPage 
            onNavigate={(view) => setCurrentView(view as any)} 
            onClearResources={handleClearResources}
          />
        </div>
      )}

      {viewToRender === 'favorites' && (
        <div className="w-full h-full p-4 min-[1100px]:p-8 overflow-y-auto">
           <FavoritesPage
              favorites={favorites}
              onRemove={removeFavorite}
              onClearAll={handleClearAllFavorites}
              onLoad={(item) => {
                loadFavorite(item);
                setCurrentView('lesson-center');
              }}
              onImport={() => favoritesImportRef.current?.click()}
              windowWidth={windowWidth}
           />
        </div>
      )}

      </div>
      </main>

      <button
        onClick={() => setIsSidebarOpen(prev => !prev)}
        className="fixed bottom-5 right-5 w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
        style={{
          backgroundColor: 'var(--primary-color)',
          color: '#fff',
          transition: 'transform 300ms',
          zIndex: 9000
        }}
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isWeChatShareOpen && (
        <>
          <div
            className="fixed inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 10000 }}
            onClick={() => setIsWeChatShareOpen(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-xl rounded-2xl shadow-2xl border p-5"
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', zIndex: 10001 }}
          >
            <div className="flex items-center justify-between mb-3" style={{ color: 'var(--text-primary)' }}>
              <span className="text-lg font-bold">{t('TITLE_SELECT_WECHAT_FRIENDS')}</span>
              <button onClick={() => setIsWeChatShareOpen(false)} className="px-3 py-1 rounded" style={{ backgroundColor: 'var(--secondary-color)', color: 'var(--primary-color)' }}>
                {t('ACTION_CLOSE')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {weChatFriends.map(f => {
                const checked = selectedFriends.includes(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSelectedFriends(prev => checked ? prev.filter(x => x !== f.id) : [...prev, f.id]);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition ${checked ? 'ring-2 ring-indigo-500' : ''}`}
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: 'var(--secondary-color)', color: 'var(--primary-color)' }}>{f.name.slice(0,1)}</div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-semibold">{f.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{checked ? t('STATUS_SELECTED') : t('STATUS_UNSELECTED')}</div>
                    </div>
                    <input type="checkbox" readOnly checked={checked} />
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedFriends([])}
                className="px-4 py-2 rounded font-medium"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
              >{t('ACTION_CLEAR_SELECTION')}</button>
              <button
                onClick={confirmWeChatSend}
                disabled={selectedFriends.length === 0}
                className={`px-4 py-2 rounded font-bold ${selectedFriends.length === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                style={{ backgroundColor: 'var(--secondary-color)', color: 'var(--primary-color)' }}
              >{t('ACTION_SEND')}</button>
            </div>
          </div>
        </>
      )}
      {miniCards.length > 0 && (
        <div className="fixed bottom-5 left-5 space-y-3 z-[10002]">
          {miniCards.map(m => (
            <div key={m.id} className="w-64 rounded-2xl shadow-xl border overflow-hidden"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                <div className="text-sm font-semibold">{t('LABEL_MINI_APP')}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {t('sent_to')}{m.to.map(id => weChatFriends.find(f => f.id === id)?.name || '').filter(Boolean).join('、')}
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{m.plan.title_zh || m.plan.title_en}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(m.time).toLocaleString()}</div>
              </div>
              <div className="px-4 py-3 flex justify-between items-center border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  onClick={() => {
                    dispatch(setGeneratedPlan(m.plan as any));
                    const ok = confirm(t('confirm_add_desktop'));
                    if (ok) {
                      alert(t('hint_add_desktop'));
                    }
                  }}
                  className="px-2 py-1 rounded text-sm"
                  style={{ backgroundColor: 'var(--secondary-color)', color: 'var(--primary-color)' }}
                >{t('ACTION_VIEW')}</button>
                <button
                  onClick={() => {
                    setSharePlan(m.plan);
                    setSelectedFriends([]);
                    setIsWeChatShareOpen(true);
                  }}
                  className="px-2 py-1 rounded text-sm text-white"
                  style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}
                >{t('ACTION_SHARE')}</button>
                <button
                  onClick={() => removeMiniCard(m.id)}
                  className="px-2 py-1 rounded text-sm text-white"
                  style={{ background: 'linear-gradient(135deg,#ef4444,#b91c1c)' }}
                >{t('ACTION_DELETE')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showGlobalDownloadMenu && downloadMenuPlan && (
        <>
          <div
            className="fixed inset-0 z-[11000]"
            onClick={() => {
              setShowGlobalDownloadMenu(false);
              setDownloadMenuPlan(null);
            }}
            style={{ backgroundColor: 'rgba(15,23,42,0.35)' }}
          />
          <div className="fixed inset-0 z-[11001] flex items-center justify-center px-4">
            <div
              className="w-full max-w-xs rounded-2xl shadow-xl border p-4 space-y-3"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t('title_download_format')}
                </div>
                <button
                  onClick={() => {
                    setShowGlobalDownloadMenu(false);
                    setDownloadMenuPlan(null);
                  }}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)'
                  }}
                  aria-label={t('action_close_download')}
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="w-3 h-3"
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M4 4l8 8" />
                    <path d="M12 4l-8 8" />
                  </svg>
                </button>
              </div>
              <button
                onClick={async () => {
                  try {
                    await downloadService.downloadDocx(downloadMenuPlan as any);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setShowGlobalDownloadMenu(false);
                    setDownloadMenuPlan(null);
                  }
                }}
                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              >
                <span className="text-blue-600 text-xl">📄</span>
                <span>{t('format_docx')}</span>
              </button>
              <button
                onClick={async () => {
                  try {
                    await downloadService.downloadPdf(downloadMenuPlan as any);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setShowGlobalDownloadMenu(false);
                    setDownloadMenuPlan(null);
                  }
                }}
                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              >
                <span className="text-red-600 text-xl">📑</span>
                <span>{t('format_pdf')}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {isLoadingOverlay && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 10001, backgroundColor: 'rgba(0,0,0,0.12)' }}
        >
          <div
            className="w-11/12 max-w-md rounded-2xl shadow-2xl border px-6 py-8 flex flex-col items-center justify-center"
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
          >
            <span className="relative inline-flex items-center justify-center mb-4">
              <Spinner className="h-10 w-10" style={{ color: 'var(--primary-color)' }} />
              <span
                className="absolute rounded-full border-2 animate-spin"
                style={{
                  width: '2.8rem',
                  height: '2.8rem',
                  borderColor: 'rgba(99,102,241,0.45)',
                  borderTopColor: 'transparent'
                }}
              />
            </span>
            <span className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('loading_title')}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('loading_subtitle')}
            </span>
          </div>
        </div>
      )}
      <input
        type="file"
        ref={favoritesImportRef}
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleImportFavorites(e.target.files[0]);
            e.target.value = '';
          }
        }}
        accept=".json,.doc,.docx,.pdf"
      />
    </div>
  );
};

export default App;
