import type { Preview } from '@storybook/react-vite';
import React from 'react';
import { Provider } from 'react-redux';
import { store } from '../src/store';

import '../src/App.css'; // Global styles

const preview: Preview = {
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo'
    }
  },
};

export default preview;
