import React from 'react';

export interface EricStep {
  title: string;
  emoji?: string;
  teacherActivity?: string;
  studentActivity?: string;
  interaction?: string;
  duration?: number; // minutes
}

export interface EricPhase {
  title: string;
  duration: number;
  steps: EricStep[];
}

export interface EricLessonProps {
  phases: EricPhase[];
}

export const EricLessonRenderer: React.FC<EricLessonProps> = ({ phases }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {phases.map((phase, pIndex) => (
        <div key={pIndex} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Phase Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderBottom: '2px solid #E8F5E9',
            paddingBottom: '8px'
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '16px', 
              fontWeight: '700', 
              color: '#2E7D32',
              fontFamily: 'Noto Sans SC, sans-serif'
            }}>
              Phase {pIndex + 1}: {phase.title}
            </h3>
            <span style={{ 
              fontSize: '12px', 
              color: '#666', 
              backgroundColor: '#E8F5E9', 
              padding: '2px 8px', 
              borderRadius: '12px' 
            }}>
              {phase.duration} min
            </span>
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingLeft: '8px' }}>
            {phase.steps.map((step, sIndex) => (
              <div key={sIndex} style={{ display: 'flex', gap: '12px' }}>
                {/* Step Number/Emoji */}
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  backgroundColor: '#F1F8E9', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0
                }}>
                  {step.emoji || (sIndex + 1)}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <h4 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '15px', 
                    fontWeight: '600', 
                    color: '#333',
                    lineHeight: '1.4'
                  }}>
                    {step.title}
                    {step.duration && (
                      <span style={{ 
                        marginLeft: '8px', 
                        fontSize: '12px', 
                        fontWeight: 'normal', 
                        color: '#999' 
                      }}>
                        ({step.duration} min)
                      </span>
                    )}
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {step.teacherActivity && (
                      <div style={{ 
                        backgroundColor: '#FAFAFA', 
                        padding: '12px', 
                        borderRadius: '8px',
                        borderLeft: '3px solid #A5D6A7'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }}>
                          🧑‍🏫 Teacher Activity
                        </div>
                        <div style={{ fontSize: '14px', color: '#444', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                          {step.teacherActivity}
                        </div>
                      </div>
                    )}

                    {step.studentActivity && (
                      <div style={{ 
                        backgroundColor: '#F3F9F4', 
                        padding: '12px', 
                        borderRadius: '8px',
                        borderLeft: '3px solid #81C784'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }}>
                          👩‍🎓 Student Activity
                        </div>
                        <div style={{ fontSize: '14px', color: '#444', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                          {step.studentActivity}
                        </div>
                      </div>
                    )}

                    {step.interaction && (
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#666', 
                        fontStyle: 'italic',
                        marginTop: '4px',
                        display: 'flex',
                        gap: '8px'
                      }}>
                        <span>💬</span>
                        <span>{step.interaction}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
