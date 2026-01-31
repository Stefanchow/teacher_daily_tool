import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { HomeInput } from './HomeInput';
import { GenerateButton } from './GenerateButton';

// Wrapper component to demonstrate interaction
const HomeInteractionDemo = () => {
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleGenerate = () => {
    if (!inputValue.trim()) return;
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 3000);
  };

  const handleCancel = () => {
    setLoading(false);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <HomeInput 
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={loading}
      />
      <GenerateButton 
        isLoading={loading} 
        onClick={handleGenerate}
        onCancel={handleCancel}
        disabled={!inputValue.trim()}
      />
    </div>
  );
};

const meta: Meta = {
  title: 'Home/Interaction',
  component: HomeInteractionDemo,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const InteractiveDemo: Story = {};

export const InputStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <HomeInput placeholder="Default State" />
      <HomeInput placeholder="Disabled State" disabled />
      <HomeInput value="Focused State (Simulated)" autoFocus />
    </div>
  )
};

export const ButtonStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <GenerateButton>Default</GenerateButton>
      <GenerateButton disabled>Disabled</GenerateButton>
      <GenerateButton isLoading onCancel={() => alert('Cancelled')}>Loading</GenerateButton>
    </div>
  )
};
