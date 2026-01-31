export const formatTitle = (title: string, grade?: string): string => {
  let formattedTitle = title;
  if (!title) return '';

  const hasChinese = /[\u4e00-\u9fa5]/.test(title);
  if (hasChinese) {
    // Pattern 1: Chinese (English)
    const lastParenMatch = title.match(/\(([^)]+)\)$/);
    if (lastParenMatch && lastParenMatch[1]) {
      const contentInside = lastParenMatch[1];
      const contentOutside = title.substring(0, lastParenMatch.index) + title.substring(lastParenMatch.index! + lastParenMatch[0].length);
      
      if (!/[\u4e00-\u9fa5]/.test(contentInside) && /[\u4e00-\u9fa5]/.test(contentOutside)) {
        formattedTitle = contentInside.trim();
      }
    }

    // Pattern 2: English (Chinese)
    if (lastParenMatch && lastParenMatch[1]) {
      const contentInside = lastParenMatch[1];
      const contentOutside = title.substring(0, lastParenMatch.index);
      
      if (/[\u4e00-\u9fa5]/.test(contentInside) && !/[\u4e00-\u9fa5]/.test(contentOutside)) {
        formattedTitle = contentOutside.trim();
      }
    }
  }

  if (grade) {
    return `${formattedTitle} / ${grade}`;
  }

  return formattedTitle;
};
