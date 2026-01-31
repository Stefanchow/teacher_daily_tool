
const fs = require('fs');

class GeminiService {
  preprocessAIResponse(text) {
    return text;
  }
  
  md5(text) { return 'hash'; }
  saveSnapshot() {}
  isRecord(obj) { return typeof obj === 'object' && obj !== null && !Array.isArray(obj); }
  isArrayUnknown(obj) { return Array.isArray(obj); }

  sanitizeJSON(input) {
    if (this.isRecord(input) || this.isArrayUnknown(input)) return input;
    if (typeof input !== 'string') throw new Error('[Gemini-005] Invalid JSON format in response');

    let content = this.preprocessAIResponse(input);

    if (content.length < 1000000) {
        content = content.replace(/"\s*:\s*([^",\{\}\[\]]+)\s*\n\s*"/g, '": $1,\n"'); 
        content = content.replace(/("\s*:\s*"(?:[^"\\]|\\.)*")\s*\n\s*"/g, '$1,\n"');
        content = content.replace(/([^,\]\}])\s*\n\s*\]/g, '$1\n]'); 
        content = content.replace(/((?:true|false|null|[0-9]+|"(?:[^"\\]|\\.)*")|}|])\s*\n\s*"/g, '$1,\n"');
    }
   
    if (!content.includes('"procedures"')) { 
      const insertionPoint = content.lastIndexOf('}'); 
      if (insertionPoint !== -1) { 
        const defaultProcedures = `,"procedures":[{"step":"步骤1","teachersTalk":"教师用语","studentsOutput":"学生回应","justification":"设计意图","duration":5}]`; 
        content = content.slice(0, insertionPoint) + defaultProcedures + content.slice(insertionPoint); 
      } 
    } 
   
    if (!/["}\]0-9]$/.test(content.trim())) {
        content = content.replace(/"([^"]*)$/, '"$1"'); 
    }
   
    content = content.replace(/,\s*}/g, '}'); 
    content = content.replace(/,\s*]/g, ']');
    content = content.replace(/{\s*,/g, '{');

    let s = content.replace(/,(\s*[}\])])/g, '$1'); 
    s = s.replace(/[\x00-\x1F\x7F-\x9F]/g, ''); 

    const match = s.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    let candidate = "";

    if (match) {
        candidate = match[0];
    } else {
        const start = s.search(/[{[]/);
        if (start === -1) {
            throw new Error('[Gemini-005] Invalid JSON format in response');
        }
        candidate = s.slice(start);
    }

    try {
        const parsed = JSON.parse(candidate);
        return parsed;
    } catch (e) {
        throw new Error(`[Gemini-006] JSON parsing failed. Last error: ${e.message}. Candidate: ${candidate}`);
    }
  }
}

const service = new GeminiService();
let output = [];

// Test Case 1
const wrappedJson = 'NOTE: model generated extra notes before JSON. {"title":"Substr","list":[1]} \nEND FOOTER AFTER JSON';
try {
    const result = service.sanitizeJSON(wrappedJson);
    output.push("Test 1 Result: " + JSON.stringify(result));
} catch (e) {
    output.push("Test 1 Failed: " + e.message);
}

// Test Case 2
const dirtyJson = '{"title": "Dirty \u001F Plan"}';
try {
    const result = service.sanitizeJSON(dirtyJson);
    output.push("Test 2 Result: " + JSON.stringify(result));
} catch (e) {
    output.push("Test 2 Failed: " + e.message);
}

fs.writeFileSync('debug_output.txt', output.join('\n'));
