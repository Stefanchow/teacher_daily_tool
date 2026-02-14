import { configureStore } from '@reduxjs/toolkit';
import lessonReducer from './slices/lessonSlice';
import previewReducer from './slices/previewSlice';
import aiReducer from './slices/aiSlice';
import userSettingsReducer, { settingsMiddleware } from './slices/userSettingsSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    lesson: lessonReducer,
    preview: previewReducer,
    ai: aiReducer,
    userSettings: userSettingsReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(settingsMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
