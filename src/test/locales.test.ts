import { describe, it, expect } from 'vitest';
import zh from '../locales/zh.json';
import en from '../locales/en.json';

describe('Locales', () => {
  it('should have user requested keys in zh.json', () => {
    expect(zh).toHaveProperty('lessonTopic', '教学主题');
    expect(zh).toHaveProperty('grade', '年级 (Grade)');
    expect(zh).toHaveProperty('duration', '时长 (minute)');
    expect(zh).toHaveProperty('teachingMethod', '教学法 (Teaching Method)');
    expect(zh).toHaveProperty('keyWords', '核心词汇 (Key Words)');
    expect(zh).toHaveProperty('sentenceStructures', '句型结构 (Sentence Structures)');
    expect(zh).toHaveProperty('grammarPoints', '语法要点 (Grammar Points)');
    expect(zh).toHaveProperty('generateButton', '生成教案 (Generate)');
  });

  it('should have user requested keys in en.json', () => {
    expect(en).toHaveProperty('lessonTopic', 'Lesson Topic');
    expect(en).toHaveProperty('grade', 'Grade');
    expect(en).toHaveProperty('duration', 'Duration');
    expect(en).toHaveProperty('teachingMethod', 'Teaching Method');
    expect(en).toHaveProperty('keyWords', 'Key Words');
    expect(en).toHaveProperty('sentenceStructures', 'Sentence Structures');
    expect(en).toHaveProperty('grammarPoints', 'Grammar Points');
    expect(en).toHaveProperty('generateButton', 'Generate Lesson Plan');
  });
});
