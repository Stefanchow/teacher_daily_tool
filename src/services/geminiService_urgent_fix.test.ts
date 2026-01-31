import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiService } from './geminiService';

describe('GeminiService Urgent Fix Verification', () => {
  let service: GeminiService;

  beforeEach(() => {
    service = new GeminiService();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should construct prompt with strict duration and methodology constraints for Project-based (Env Protection)', async () => {
    const params = {
      topic: 'Environmental Protection',
      grade: 'Grade 6',
      duration: 45,
      mode: 'project-based' as const,
      language: 'zh' as const,
      words: ['Recycle', 'Reduce', 'Reuse'],
      sentences: ['We should protect the environment.']
    };

    // Mock successful response to avoid service error
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            zh: {
              title: "Environmental Protection Project",
              grade: "Grade 6",
              duration: 45,
              teachingMethod: "project-based",
              teachingPreparation: {
                  objectives: ["Students will understand..."],
                  keyWords: ["Recycle", "Reuse"],
                  duration: 45,
                  teachingAids: "PPT",
                  studentAnalysis: "Grade 6 students...",
                  sentenceStructures: "We should...",
                  audienceAnalysis: [{ description: "Active learners" }]
              },
              procedures: [
                { step: "Step 1", teachersTalk: "Talk", studentsOutput: "Output", justification: "J", duration: 10 },
                { step: "Step 2", teachersTalk: "Talk", studentsOutput: "Output", justification: "J", duration: 10 },
                { step: "Step 3", teachersTalk: "Talk", studentsOutput: "Output", justification: "J", duration: 10 },
                { step: "Step 4", teachersTalk: "Talk", studentsOutput: "Output", justification: "J", duration: 12 },
                { step: "Step 5: Summary", teachersTalk: "Talk", studentsOutput: "Output", justification: "J", duration: 3 }
              ]
            },
            en: {
              title: "Environmental Protection Project",
              grade: "Grade 6",
              duration: 45,
              teachingMethod: "project-based",
              teachingPreparation: {
                  objectives: ["Students will understand..."],
                  keyWords: ["Recycle", "Reuse"],
                  duration: 45,
                  teachingAids: "PPT",
                  studentAnalysis: "Grade 6 students...",
                  sentenceStructures: "We should...",
                  audienceAnalysis: [{ description: "Active learners" }]
              },
              procedures: [
                { step: "Step 1", teachersTalk: "Talk", studentsOutput: "Output", justification: "J", duration: 10 },
                { step: "Step 2", teachersTalk: "Talk", studentsOutput: "Output", justification: "J", duration: 10 },
                { step: "Step 3", teachersTalk: "Talk", studentsOutput: "Output", justification: "J", duration: 10 },
                { step: "Step 4", teachersTalk: "Talk", studentsOutput: "Output", justification: "J", duration: 12 },
                { step: "Step 5: Summary", teachersTalk: "Talk", studentsOutput: "Output", justification: "J", duration: 3 }
              ]
            }
          })
        }
      }],
      usage: { total_tokens: 100 }
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockResponse),
      json: async () => mockResponse
    });

    await service.generateLessonPlan(params as any);

    const fetchCall = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    const systemMessage = body.messages.find((m: any) => m.role === 'system').content;

    // Verify Duration Constraints
    expect(systemMessage).toContain('总结与作业**（最后一步）必须固定为 **3分钟**');
    expect(systemMessage).toContain('其余时间（45 - 3分钟）应合理分配');

    // Verify Methodology Constraints
    expect(systemMessage).toContain('严格按照所选教学法（project-based）的结构进行设计');
    expect(systemMessage).toContain('**教学法：项目式学习 (PBL)**');

    // Verify Anti-Generic Constraints
    expect(systemMessage).toContain('严禁通用内容');
    expect(systemMessage).toContain('不得出现"掌握基本知识"');
    
    // Verify Topic Specificity
    expect(systemMessage).toContain('内容必须针对主题"Environmental Protection"具体展开');

    // Verify Words and Sentences injection
    expect(systemMessage).toContain('Recycle');
    expect(systemMessage).toContain('Reduce');
    expect(systemMessage).toContain('Reuse');
    expect(systemMessage).toContain('We should protect the environment.');
  });

  it('should construct prompt correctly for Task-based (Simple Future Tense) with 80 mins', async () => {
    const params = {
      topic: 'Simple Future Tense',
      level: 'A2',
      grade: 'Grade 5',
      duration: 80,
      mode: 'task-based',
      language: 'zh'
    };

    // Mock successful response
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            zh: {
              title: "Future Plans",
              grade: "Grade 5",
              duration: 80,
              teachingMethod: "task-based",
              teachingPreparation: {
                  objectives: ["Students will be able to use 'will'"],
                  keyWords: ["will", "tomorrow"],
                  duration: 80,
                  teachingAids: "Cards",
                  studentAnalysis: "Beginners...",
                  sentenceStructures: "I will...",
                  audienceAnalysis: [{ description: "Visual learners" }]
              },
              procedures: [
                { step: "1", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
                { step: "2", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 20 },
                { step: "3", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 20 },
                { step: "4", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 27 },
                { step: "5", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 3 }
              ]
            },
            en: {
              title: "Future Plans",
              grade: "Grade 5",
              duration: 80,
              teachingMethod: "task-based",
              teachingPreparation: {
                  objectives: ["Students will be able to use 'will'"],
                  keyWords: ["will", "tomorrow"],
                  duration: 80,
                  teachingAids: "Cards",
                  studentAnalysis: "Beginners...",
                  sentenceStructures: "I will...",
                  audienceAnalysis: [{ description: "Visual learners" }]
              },
              procedures: [
                { step: "1", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
                { step: "2", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 20 },
                { step: "3", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 20 },
                { step: "4", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 27 },
                { step: "5", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 3 }
              ]
            }
          })
        }
      }]
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockResponse),
      json: async () => mockResponse
    });

    await service.generateLessonPlan(params as any);

    const fetchCall = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    const systemMessage = body.messages.find((m: any) => m.role === 'system').content;

    // Verify Duration
    expect(systemMessage).toContain('总结与作业**（最后一步）必须固定为 **3分钟**');
    expect(systemMessage).toContain('其余时间（80 - 3分钟）应合理分配');

    // Verify Methodology
    expect(systemMessage).toContain('严格按照所选教学法（task-based）');
    expect(systemMessage).toContain('**教学法：任务型教学 (TBLT)**');
  });
});
