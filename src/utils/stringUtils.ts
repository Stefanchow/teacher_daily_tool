/**
 * Removes Chinese characters and common Chinese punctuation from a string.
 */
export const removeChinese = (text: string): string => {
  if (!text) return text;
  // Remove Chinese characters
  let result = text.replace(/[\u4e00-\u9fa5]/g, '');
  
  // Remove Chinese punctuation
  result = result.replace(/[（）【】《》“”‘’；：，。？、]/g, '');
  
  // Remove empty parentheses that might result from removing Chinese inside them
  // e.g. "Title (标题)" -> "Title ()" -> "Title"
  result = result.replace(/\(\s*\)/g, '').replace(/\[\s*\]/g, '');
  
  // Clean up double spaces and trimming, but preserve newlines for Markdown structure
  // 1. Normalize line endings to \n
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // 2. Collapse horizontal whitespace (spaces, tabs) to single space
  result = result.replace(/[ \t]+/g, ' ');
  
  return result.trim();
};

/**
 * Deeply sanitizes an object by removing Chinese characters from all string values.
 * Useful for ensuring English-only content.
 */
export const sanitizeForEnglish = <T>(obj: T): T => {
  if (typeof obj === 'string') {
    return removeChinese(obj) as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForEnglish(item)) as unknown as T;
  }
  
  if (obj && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = sanitizeForEnglish((obj as any)[key]);
      }
    }
    return newObj as T;
  }
  
  return obj;
};
