import { describe, test, expect } from 'vitest';
import { formatTitle } from './formatters';

describe('formatTitle', () => {
  test('extracts English from Chinese (English) pattern', () => {
    const input = '校园大侦探：寻找失踪的金笔 (The Great School Mystery: Finding the Missing Golden Pen)';
    const expected = 'The Great School Mystery: Finding the Missing Golden Pen';
    expect(formatTitle(input)).toBe(expected);
  });

  test('extracts English from simple Chinese (English) pattern', () => {
    const input = '你好 (Hello)';
    const expected = 'Hello';
    expect(formatTitle(input)).toBe(expected);
  });

  test('returns original if no Chinese', () => {
    const input = 'Hello World';
    expect(formatTitle(input)).toBe('Hello World');
  });

  test('returns original if English only but has parens', () => {
    const input = 'Hello (World)';
    expect(formatTitle(input)).toBe('Hello (World)');
  });

  test('returns original if Chinese only', () => {
    const input = '你好世界';
    expect(formatTitle(input)).toBe('你好世界');
  });

  test('returns original if Chinese (Chinese)', () => {
    const input = '你好 (世界)';
    expect(formatTitle(input)).toBe('你好 (世界)');
  });

  test('extracts English if pattern is weird but last parens match', () => {
    const input = 'Title (Subtitle) - 中文 (English)';
    expect(formatTitle(input)).toBe('English');
  });
  
  test('handles empty input', () => {
    expect(formatTitle('')).toBe('');
  });
});
