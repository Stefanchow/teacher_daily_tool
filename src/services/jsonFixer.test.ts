
import { describe, it, expect } from 'vitest';

function fixJson(input: string): any {
  // 1. Extract JSON candidate
  let candidate = input;
  const markdownMatch = input.match(/```json\s*([\s\S]*?)(```|$)/i);
  if (markdownMatch) {
    candidate = markdownMatch[1];
  } else {
    const firstBrace = input.indexOf('{');
    if (firstBrace !== -1) {
      candidate = input.substring(firstBrace);
    }
  }

  // 2. Remove trailing non-JSON characters (if any, after the last valid closing brace if possible, 
  // but since we assume truncation, we might just trim end)
  candidate = candidate.trim();

  // 3. Try parsing immediately
  try {
    return JSON.parse(candidate);
  } catch (e) {
    // Continue to fix
  }

  // 4. Auto-close brackets/braces
  // This is a simplified state machine to track open brackets/braces/quotes
  const stack: string[] = [];
  let inString = false;
  let isEscaped = false;
  
  // We need to clean up the candidate first? 
  // Sometimes there is garbage at the end like "..." or "Analysis:\n{"
  
  // Let's iterate through the string to build the stack
  for (let i = 0; i < candidate.length; i++) {
    const char = candidate[i];
    
    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') stack.push('}');
      else if (char === '[') stack.push(']');
      else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
  }

  // If we are still in a string at the end, close it
  if (inString) {
    candidate += '"';
  }

  // Close all open brackets/braces in reverse order
  while (stack.length > 0) {
    candidate += stack.pop();
  }

  // 5. Try parsing again
  try {
    return JSON.parse(candidate);
  } catch (e) {
    // 6. Last resort: Try to find the last valid comma and truncate there, then close
    // This handles cases where the content cuts off in the middle of a key or value
    // e.g. { "key": "val
    // We can't easily save "val", so maybe we sacrifice the last field.
    // However, for now, let's return null to indicate failure or try aggressive fix
    console.error("Fix failed", e);
    throw e;
  }
}

describe('JSON Fixer', () => {
  it('parses valid JSON', () => {
    const input = '{"a": 1}';
    expect(fixJson(input)).toEqual({a: 1});
  });

  it('extracts from markdown', () => {
    const input = 'Here is code:\n```json\n{"a": 1}\n```';
    expect(fixJson(input)).toEqual({a: 1});
  });

  it('fixes truncated JSON (missing brace)', () => {
    const input = '{"a": 1';
    expect(fixJson(input)).toEqual({a: 1});
  });

  it('fixes truncated JSON (nested)', () => {
    const input = '{"a": [1, 2, {"b": 3';
    expect(fixJson(input)).toEqual({a: [1, 2, {b: 3}]});
  });

  it('fixes truncated string', () => {
    const input = '{"a": "hello';
    expect(fixJson(input)).toEqual({a: "hello"});
  });
  
  it('fixes truncated string inside array', () => {
      const input = '{"list": ["item1", "item2';
      expect(fixJson(input)).toEqual({list: ["item1", "item2"]});
  });
  
  it('handles complex truncation', () => {
      // Input from a real scenario might look like:
      const input = `{"title": "Lesson", "procedures": [{"title": "Step 1", "content": "Doing something...`;
      const result = fixJson(input);
      expect(result.title).toBe("Lesson");
      expect(result.procedures[0].title).toBe("Step 1");
  });
});
