import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LessonPlanCard } from '../components/LessonPlanCard/LessonPlanCard';
import { geminiService, LessonPlan, GeneratePlanParams } from '../services/geminiService';
import { GradeLevel } from '../styles/AppColors';

import { TEXT_ZH } from '../constants/locales';

// Wrapper component to handle AI logic and state
const AIParsedLessonDemo: React.FC<GeneratePlanParams & { autoGenerate?: boolean }> = ({ 
  topic, 
  level, 
  grade = 'Grade 3',
  duration, 
  mode,
  autoGenerate = false
}) => {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const result = await geminiService.generateLessonPlan({
        topic,
        level,
        grade,
        duration,
        mode
      });
      setPlan(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXT_ZH.ERROR_UNKNOWN);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on mount if requested
  React.useEffect(() => {
    if (autoGenerate) {
      generatePlan();
    }
  }, [autoGenerate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button 
          onClick={generatePlan}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            minWidth: '150px' // Ensure enough width for Chinese text
          }}
        >
          {loading ? TEXT_ZH.BUTTON_GENERATING : TEXT_ZH.BUTTON_GENERATE}
        </button>
        {loading && <span style={{ color: '#666' }}>{TEXT_ZH.LABEL_THINKING}</span>}
      </div>

      {error && (
        <div style={{ padding: '10px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', marginBottom: '1rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div style={{ 
          border: '1px dashed #ccc', 
          borderRadius: '8px', 
          padding: '40px', 
          textAlign: 'center',
          color: '#666',
          backgroundColor: '#f9f9f9'
        }}>
          <div className="loading-spinner" style={{ 
            display: 'inline-block',
            width: '30px', 
            height: '30px', 
            border: '3px solid rgba(0,0,0,0.1)', 
            borderRadius: '50%', 
            borderTopColor: '#4CAF50', 
            animation: 'spin 1s ease-in-out infinite',
            marginBottom: '10px'
          }} />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          <div>{TEXT_ZH.LABEL_THINKING}</div>
          <div style={{ fontSize: '0.8em', marginTop: '5px' }}>{TEXT_ZH.LABEL_GENERATING_FOR.replace('{topic}', topic)}</div>
        </div>
      )}

      {!loading && plan && (
        <LessonPlanCard plan={plan} />
      )}

      {!loading && !plan && !error && (
        <div style={{ color: '#888', fontStyle: 'italic' }}>
          {TEXT_ZH.HINT_START}
        </div>
      )}
    </div>
  );
};

const meta: Meta<typeof AIParsedLessonDemo> = {
  title: 'AI/AIParsedLesson',
  component: AIParsedLessonDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Demonstrates the integration of GeminiService with BaseCard to display an AI-generated lesson plan.',
      },
    },
  },
  argTypes: {
    mode: {
      control: { type: 'select' },
      options: ['PWP', 'PPP'],
      description: 'Teaching methodology mode',
    },
    level: {
      control: { type: 'text' },
      description: 'Target student level',
    },
    topic: {
      control: { type: 'text' },
      description: 'Lesson topic',
    },
    duration: {
      control: { type: 'number', min: 10, max: 120, step: 5 },
      description: 'Total lesson duration in minutes',
    },
    autoGenerate: {
      control: 'boolean',
      description: 'Automatically generate on load (for demo purposes)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof AIParsedLessonDemo>;

export const Default: Story = {
  args: {
    topic: 'Present Continuous Tense',
    level: 'Primary 3',
    duration: 45,
    mode: 'PPP',
    autoGenerate: false,
  },
};

export const LoadingState: Story = {
  args: {
    topic: 'Photosynthesis',
    level: 'Middle School',
    duration: 60,
    mode: 'PWP',
    autoGenerate: true,
  },
  render: (args) => {
    // We can simulate a persistent loading state or just let the autoGenerate trigger it.
    // However, since autoGenerate calls the real service (mock or real), it will finish eventually.
    // For visual testing of loading state specifically, we might want to mock the service delay to be very long, 
    // or just rely on the interactive behavior.
    return <AIParsedLessonDemo {...args} />;
  }
};
