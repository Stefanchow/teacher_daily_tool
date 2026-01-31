
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiService } from './geminiService';

describe('GeminiService Verification - 3 Theme Test', () => {
  let service: GeminiService;

  beforeEach(() => {
    service = new GeminiService();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const themes = [
    { topic: 'Photosynthesis', grade: 'Grade 5', type: 'Science' },
    { topic: 'Ancient Rome', grade: 'Grade 7', type: 'History' },
    { topic: 'Linear Equations', grade: 'Grade 8', type: 'Math' }
  ];

  themes.forEach(({ topic, grade, type }) => {
    describe(`Theme: ${topic} (${type})`, () => {
      
      it('should construct prompt with strict quality requirements and correct topic', async () => {
        // Mock success response
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({
                  title_zh: topic,
                  title_en: topic,
                  grade: grade,
                  duration: 45,
                  teachingPreparation: {
                    objectives_zh: ["Learn about " + topic],
                    objectives_en: ["Learn about " + topic],
                    keyWords_zh: ["Key1"],
                    keyWords_en: ["Key1"],
                    duration: 45,
                    teachingAids_zh: "None",
                    teachingAids_en: "None",
                    studentAnalysis_zh: "Analysis",
                    studentAnalysis_en: "Analysis",
                    sentenceStructures_zh: ["SVO"],
                    sentenceStructures_en: ["SVO"],
                    audienceAnalysis: [{ description: "Desc" }]
                  },
                  procedures: [
                    { title_zh: "Step 1", title_en: "Step 1", content_zh: "Hi", content_en: "Hi", duration: 5 },
                    { title_zh: "Step 2", title_en: "Step 2", content_zh: "Content", content_en: "Content", duration: 10 },
                    { title_zh: "Step 3", title_en: "Step 3", content_zh: "Content", content_en: "Content", duration: 10 },
                    { title_zh: "Step 4", title_en: "Step 4", content_zh: "Content", content_en: "Content", duration: 10 },
                    { title_zh: "Step 5", title_en: "Step 5", content_zh: "Content", content_en: "Content", duration: 10 }
                  ]
                })
              }
            }],
            usage: { total_tokens: 100 }
          })
        });

        await service.generateLessonPlan({ topic, grade, duration: 45, level: 'B1', mode: 'task-based' });

        const fetchCall = (global.fetch as any).mock.calls[0];
        const body = JSON.parse(fetchCall[1].body);
        const systemMessage = body.messages.find((m: any) => m.role === 'system').content;
        const userMessage = body.messages.find((m: any) => m.role === 'user').content;

        // Verify Prompt Quality Constraints (in system prompt)
        expect(systemMessage).toContain('具体且可衡量');
        expect(systemMessage).toContain('剧本式Markdown文本');
        
        // Verify Topic Injection (in system prompt)
        expect(systemMessage).toContain(topic);
        expect(systemMessage).toContain(grade);
      });

      it('should return topic-specific emergency fallback when API fails', async () => {
        // Mock failure
        (global.fetch as any).mockRejectedValue(new Error('Network Error'));

        const result = await service.generateLessonPlan({ 
            topic, 
            grade, 
            duration: 45, 
            level: 'B1', 
            mode: 'task-based',
            language: 'en' // Use English to verify template string insertion easier
        });

        // Verify Fallback Content
        expect(result.title_en).toContain(topic);
        // Check if the topic is inserted into the teacher's talk in the first step
        // "Hello everyone! Today we are learning " + topic + "..."
        expect(result.procedures[0].content_en).toContain(topic);
        
        console.log(`[Verified] ${topic} fallback title: ${result.title_en}`);
        console.log(`[Verified] ${topic} fallback talk: ${result.procedures[0].content_en}`);
      });

    });
  });
});
