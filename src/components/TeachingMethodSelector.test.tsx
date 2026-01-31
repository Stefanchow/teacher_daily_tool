import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { TeachingMethodSelector } from './TeachingMethodSelector';
import lessonReducer from '../store/slices/lessonSlice';
import previewReducer from '../store/slices/previewSlice';

// Helper to render with Redux
const renderWithRedux = (
  component: React.ReactElement,
  initialState = {}
) => {
  const store = configureStore({
    reducer: { 
      lesson: lessonReducer,
      preview: previewReducer
    },
    preloadedState: initialState
  });
  
  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store,
  };
};

describe("TeachingMethodSelector", () => {
  it("应正确显示五种教学法选项", () => {
    renderWithRedux(<TeachingMethodSelector />);
    
    expect(screen.getByText('任务式 (Task-based)')).toBeInTheDocument();
    expect(screen.getByText('项目式 (Project-based)')).toBeInTheDocument();
    expect(screen.getByText('TTT (Test-Teach-Test)')).toBeInTheDocument();
    expect(screen.getByText('PPP (Presentation-Practice-Production)')).toBeInTheDocument();
    expect(screen.getByText('PWP (Pre-While-Post)')).toBeInTheDocument();
  });

  it("changes teaching method when option is selected", () => {
    const { store } = renderWithRedux(<TeachingMethodSelector />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'TTT' } });
    
    expect(store.getState().lesson.teachingMethod).toBe('TTT');
  });
});
