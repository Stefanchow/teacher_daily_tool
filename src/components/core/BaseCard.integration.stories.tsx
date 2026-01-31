import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useEffect } from 'react';
import { BaseCard } from './BaseCard';
import { geminiService, LessonPlan } from '../../services/geminiService';
import { parseMarkdownProcedures, ProcedureStep } from '../../utils/lessonMapper';

const meta: Meta<typeof BaseCard> = {
  title: 'Integration/BaseCard',
  component: BaseCard,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof BaseCard>;

// Formatting helper component
const FormattedActivities: React.FC<{ procedures: ProcedureStep[] }> = ({ procedures }) => {
  if (!procedures || procedures.length === 0) return null;

  return (
    <div style={{ padding: '0 8px' }}>
      {procedures.map((proc, index) => (
        <div key={index} style={{ marginBottom: '16px', fontSize: '14px', lineHeight: '1.5' }}>
          {/* Activity Header: Number and Name */}
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: '4px',
            color: '#333'
          }}>
            {index + 1}. {proc.title} 
            <span style={{ 
              fontWeight: 'normal', 
              color: '#666', 
              fontSize: '0.9em',
              marginLeft: '8px'
            }}>
              ({proc.duration} min)
            </span>
          </div>

          {/* Teacher's Talk */}
          <div style={{ marginBottom: '4px', color: '#555' }}>
            {proc.content}
          </div>
        </div>
      ))}
    </div>
  );
};

// Integration Component wrapper
const BaseCardIntegration: React.FC = () => {
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Request specific topic "The Water Cycle"
        const result = await geminiService.generateLessonPlan({
          topic: 'The Water Cycle', // Matches mock data title
          level: 'A2',
          grade: 'Grade 3',
          duration: 45,
          mode: 'PPP'
        });
        setPlan(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <BaseCard 
        title="Loading Lesson Plan..." 
        gradeLabel="Loading..."
        duration="--"
      >
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          Generating plan...
        </div>
      </BaseCard>
    );
  }

  if (error) {
    return (
      <BaseCard 
        title="Error" 
        gradeLabel="Error"
        duration="--"
      >
        <div style={{ color: 'red' }}>{error}</div>
      </BaseCard>
    );
  }

  if (!plan) return null;

  return (
    <div style={{ width: '400px' }}>
      <BaseCard
        title={plan.title_en}
        grade="primary" // Assuming primary for this example
        gradeLabel="Science" // Or inferred from topic
        duration={plan.duration}
        designIntent={typeof plan.teachingPreparation.studentAnalysis_en === 'string' ? plan.teachingPreparation.studentAnalysis_en : JSON.stringify(plan.teachingPreparation.studentAnalysis_en)}
      >
        <FormattedActivities procedures={parseMarkdownProcedures(plan?.procedures || [])} />
      </BaseCard>
    </div>
  );
};

export const WaterCycleDemo: Story = {
  render: () => <BaseCardIntegration />,
};
