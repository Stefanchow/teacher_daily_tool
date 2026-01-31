import type { Meta, StoryObj } from '@storybook/react';
import { SyncInput } from '../components/editor/SyncInput';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import lessonReducer from '../store/slices/lessonSlice';
import aiReducer from '../store/slices/aiSlice';
import { userEvent, within, expect } from '@storybook/test';

// Mock store setup
const createMockStore = (initialState: any = {}) => configureStore({
  reducer: {
    lesson: lessonReducer,
    ai: aiReducer
  } as any, // Explicit cast to fix type mismatch with Reducer and UnknownAction
  preloadedState: initialState
});

const meta = {
  title: 'Editor/SyncInput',
  component: SyncInput,
  decorators: [
    (Story) => (
      <Provider store={createMockStore({
        lesson: {
          rawContent: '',
          generatedPlan: null,
          isLoading: false,
          error: null,
          // Initialize other required state
          topic: '',
          grade: 'Grade 3',
          duration: 45,
          words: [],
          sentences: [],
          grammar: [],
          vocabularyExtensions: ''
        }
      })}>
        <div style={{ padding: '20px', maxWidth: '500px' }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof SyncInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Check for localized placeholder
    const input = canvas.getByPlaceholderText(/Recognized text/i);
    await expect(input).toBeInTheDocument();
  },
};

export const WithContent: Story = {
  decorators: [
    (Story) => (
      <Provider store={createMockStore({
        lesson: {
          rawContent: 'Pre-filled content',
          generatedPlan: null,
          topic: '',
          grade: 'Grade 3',
          duration: 45,
          words: [],
          sentences: [],
          grammar: [],
          vocabularyExtensions: ''
        }
      })}>
        <div style={{ padding: '20px', maxWidth: '500px' }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByDisplayValue('Pre-filled content');
    await expect(input).toBeInTheDocument();
  }
};

export const SimulateOCR: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /Simulate Image Rec/i });
    await userEvent.click(button);
    
    // Check if content updated (simulating Redux update)
    const input = await canvas.findByDisplayValue(/Mathematics: Introduction/i);
    await expect(input).toBeInTheDocument();
  }
};
