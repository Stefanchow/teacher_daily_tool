import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserSettingsState {
  // Subscription & Account
  membershipStatus: 'free' | 'pro';
  wechatBound: boolean;
  wechatId: string | null;
  avatar: string | null;
  nickname: string | null;

  // Teaching Preferences
  teachingStage: 'primary' | 'middle' | 'high';
  // lessonStyle removed per request
  
  // Language Settings
  uiLanguage: 'zh' | 'en';      // Interface language
  outputLanguage: 'en' | 'bilingual';  // Content generation language (kept for compatibility)

  // Visual & Interaction
  // themeMode & themeColor removed per request
  enableMotion: boolean;

  // Data Management
  // exportFormat removed per request
  downloadPath: string | null;

  // Social Accounts
  socialAccounts: {
    phone: boolean;
    email: boolean;
    xiaohongshu: boolean;
    douyin: boolean;
  };

  // Custom Background
  customBackground: {
    type: 'default' | 'image' | 'gradient';
    value: string | null;
    blur: boolean;
  };
}

const initialState: UserSettingsState = {
  membershipStatus: 'free',
  wechatBound: false,
  wechatId: null,
  avatar: null,
  nickname: null,
  teachingStage: 'primary',
  uiLanguage: 'zh',
  outputLanguage: 'bilingual',
  enableMotion: true,
  downloadPath: null,
  socialAccounts: {
    phone: false,
    email: false,
    xiaohongshu: false,
    douyin: false,
  },
  customBackground: {
    type: 'default',
    value: null,
    blur: false,
  },
};

// Try to load from localStorage
const loadState = (): UserSettingsState => {
  try {
    const serializedState = localStorage.getItem('userSettings');
    if (serializedState === null) {
      return initialState;
    }
    return { ...initialState, ...JSON.parse(serializedState) };
  } catch (err) {
    return initialState;
  }
};

const userSettingsSlice = createSlice({
  name: 'userSettings',
  initialState: loadState(),
  reducers: {
    setMembershipStatus: (state, action: PayloadAction<'free' | 'pro'>) => {
      state.membershipStatus = action.payload;
    },
    bindWechat: (state, action: PayloadAction<string>) => {
      state.wechatBound = true;
      state.wechatId = action.payload;
    },
    unbindWechat: (state) => {
      state.wechatBound = false;
      state.wechatId = null;
    },
    setAvatar: (state, action: PayloadAction<string>) => {
      state.avatar = action.payload;
    },
    setNickname: (state, action: PayloadAction<string>) => {
      state.nickname = action.payload;
    },
    setTeachingStage: (state, action: PayloadAction<'primary' | 'middle' | 'high'>) => {
      state.teachingStage = action.payload;
    },
    setUiLanguage: (state, action: PayloadAction<'zh' | 'en'>) => {
      state.uiLanguage = action.payload;
    },
    setOutputLanguage: (state, action: PayloadAction<'en' | 'bilingual'>) => {
      state.outputLanguage = action.payload;
    },
    setEnableMotion: (state, action: PayloadAction<boolean>) => {
      state.enableMotion = action.payload;
    },
    setCustomBackground: (state, action: PayloadAction<{ type: 'default' | 'image' | 'gradient', value: string | null }>) => {
      state.customBackground.type = action.payload.type;
      state.customBackground.value = action.payload.value;
    },
    setBackgroundBlur: (state, action: PayloadAction<boolean>) => {
      state.customBackground.blur = action.payload;
    },
    setSocialAccountBound: (state, action: PayloadAction<{ platform: 'phone' | 'email' | 'xiaohongshu' | 'douyin', bound: boolean }>) => {
      state.socialAccounts[action.payload.platform] = action.payload.bound;
    },
    setDownloadPath: (state, action: PayloadAction<string | null>) => {
      state.downloadPath = action.payload;
    },
    clearCache: () => {
       // Logic to clear specific items will be handled in the component or thunk, 
       // but we might want to reset some state here if needed.
       // For now, this reducer might just be a signal or no-op if handled externally.
    }
  },
});

// Middleware to save to localStorage
export const settingsMiddleware = (store: any) => (next: any) => (action: any) => {
  const result = next(action);
  if (action.type.startsWith('userSettings/')) {
    try {
      const settings = store.getState().userSettings;
      localStorage.setItem('userSettings', JSON.stringify(settings));
    } catch (err) {
      console.error('Failed to save settings to localStorage:', err);
    }
  }
  return result;
};

export const {
  setMembershipStatus,
  bindWechat,
  unbindWechat,
  setAvatar,
  setNickname,
  setTeachingStage,
  setUiLanguage,
  setOutputLanguage,
  setEnableMotion,
  clearCache,
  setCustomBackground,
  setBackgroundBlur,
  setSocialAccountBound,
  setDownloadPath
} = userSettingsSlice.actions;

export default userSettingsSlice.reducer;
