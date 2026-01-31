import type { Meta, StoryObj } from '@storybook/react';
import { AdvancedConfigPanel } from './AdvancedConfigPanel';

const meta: Meta<typeof AdvancedConfigPanel> = {
  title: 'Config/AdvancedConfigPanel',
  component: AdvancedConfigPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'light',
    },
  },
};

export default meta;
type Story = StoryObj<typeof AdvancedConfigPanel>;

export const Default: Story = {};

export const WithPreloadedData: Story = {
  decorators: [
    (Story) => {
      // Simulate existing local storage data
      localStorage.setItem('lesson_config_draft', JSON.stringify({
        subject: 'Ancient Civilizations',
        grade: 'middle-7',
        duration: 90,
        words: 'Pyramid, Pharaoh, Nile',
        sentences: 'The Nile River was essential for Egyptian agriculture.',
        layout: 'detailed'
      }));
      return <Story />;
    }
  ]
};
