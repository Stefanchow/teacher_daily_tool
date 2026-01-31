import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from './promptBuilder';
import { GeneratePlanParams } from '../services/geminiService';

describe('promptBuilder', () => {
  const baseParams: GeneratePlanParams = {
    topic: 'Travel',
    level: 'A2',
    grade: 'Grade 8',
    duration: 45,
    mode: 'task-based',
    language: 'en'
  };

  it('should generate English prompt correctly', () => {
    const prompt = buildSystemPrompt({ ...baseParams, language: 'en' });
    expect(prompt).toContain('Role');
    expect(prompt).toContain('You are an expert English teacher');
    expect(prompt).toContain('Task-based Language Teaching (TBLT)'); // Check method content
    expect(prompt).toContain('_zh'); // Check JSON structure requirements
    expect(prompt).toContain('_en');
    
    // Check for CLIL and KWL integration
    expect(prompt).toContain('CLIL Integration');
    expect(prompt).toContain('KWL Framework');
    expect(prompt).toContain('Cross-Curricular');
    expect(prompt).toContain('Cross-Cultural');
    expect(prompt).toContain('Activate prior knowledge');
  });

  it('should generate Chinese prompt correctly', () => {
    const prompt = buildSystemPrompt({ ...baseParams, language: 'zh' });
    expect(prompt).toContain('# 角色');
    expect(prompt).toContain('你是一位经验丰富的英语教师');
    expect(prompt).toContain('任务型教学 (TBLT)'); // Check method content
    expect(prompt).toContain('_zh');
    expect(prompt).toContain('_en');

    // Check for CLIL and KWL integration (Chinese)
    expect(prompt).toContain('CLIL (内容语言融合)');
    expect(prompt).toContain('KWL 模型');
    expect(prompt).toContain('跨学科');
    expect(prompt).toContain('跨文化');
    expect(prompt).toContain('激活旧知');
  });

  it('should include grammar points when provided', () => {
    const params: GeneratePlanParams = {
      ...baseParams,
      grammar: ['Past Simple', 'Present Perfect']
    };
    const prompt = buildSystemPrompt(params);
    expect(prompt).toContain('Key Grammar Requirements');
    expect(prompt).toContain('- Past Simple');
    expect(prompt).toContain('- Present Perfect');
  });

  it('should not include grammar section if empty', () => {
    const prompt = buildSystemPrompt(baseParams);
    expect(prompt).not.toContain('Key Grammar Requirements');
  });

  it('should include words and sentences', () => {
    const params: GeneratePlanParams = {
      ...baseParams,
      words: ['plane', 'ticket'],
      sentences: ['How much is it?']
    };
    const prompt = buildSystemPrompt(params);
    expect(prompt).toContain('Key Vocabulary');
    expect(prompt).toContain('- plane');
    expect(prompt).toContain('Key Sentences');
    expect(prompt).toContain('- How much is it?');
  });
});
