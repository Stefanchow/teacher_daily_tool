export type UnitRecord = {
  id: string;
  title: string;
  pages: string;
  topic?: string;
  words?: string;
  grammar?: string;
};

export type TextbookRecord = {
  grades: string[];
  units: Record<string, UnitRecord[]>;
};

export const TEXTBOOK_DATABASE: Record<string, TextbookRecord> = {
  'join-in-3a': {
    grades: ['三年级上册', '三年级下册', '四年级上册', '四年级下册', '五年级上册', '五年级下册', '六年级上册', '六年级下册'],
    units: {
      '三年级上册': [
        { id: 'u1', title: 'Unit 1 Hello', pages: '2-7', topic: 'Greetings', words: 'Hi, Hello', grammar: 'Be verb' },
        { id: 'u2', title: 'Unit 2 Numbers', pages: '8-13', topic: 'Counting', words: 'One, Two', grammar: 'Plural nouns' }
      ],
      '三年级下册': [
        { id: 'u1', title: 'Unit 1 My Family', pages: '2-9', topic: 'Family', words: 'Dad, Mom', grammar: 'Possessives' }
      ]
    }
  },
  'pep-3a': {
    grades: ['三年级上册', '三年级下册', '四年级上册', '四年级下册', '五年级上册', '五年级下册', '六年级上册', '六年级下册'],
    units: {
      '三年级上册': [
        { id: 'u1', title: 'Unit 1 Hello', pages: '1-6', topic: 'Greetings', words: 'Hello, Hi', grammar: 'Be verb' },
        { id: 'u2', title: 'Unit 2 Colours', pages: '7-12', topic: 'Colours', words: 'red, blue, green', grammar: 'Adjectives' }
      ]
    }
  },
  'oxford-sh': {
    grades: ['三年级上册', '三年级下册', '四年级上册', '四年级下册', '五年级上册', '五年级下册', '六年级上册', '六年级下册'],
    units: {
      '三年级上册': [
        { id: 'u1', title: 'Unit 1 Hello', pages: '3-8', topic: 'Greetings', words: 'Hello, Hi', grammar: 'Be verb' }
      ]
    }
  }
};

export const versionToKey = (version: string): string => {
  const v = (version || '').toLowerCase();
  if (v.includes('pep') || v.includes('人教版(pep)')) return 'pep-3a';
  if (v.includes('牛津') || v.includes('上海版牛津')) return 'oxford-sh';
  if (v.includes('剑桥') || v.includes('join-in') || v.includes('剑桥版三年级起点')) return 'join-in-3a';
  return 'pep-3a';
};

export const parsePages = (pages: string): { start: number; end: number } | null => {
  const m = pages.match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  const start = Number(m[1]);
  const end = Number(m[2]);
  if (isNaN(start) || isNaN(end)) return null;
  return { start, end };
};
