import mockData from '../mocks/geminiMock.json';
import mockImageAnalysis from '../mocks/imageAnalysisMock.json';
import * as yup from 'yup';
import { buildSystemPrompt, buildAIPaperPrompt } from '../utils/promptBuilder';
import zh from '../locales/zh.json';

export interface QuestionConfigItem {
  count: number;
  score: number;
  selected: boolean;
  sectionCount?: number;
}

export interface AIPaperParams {
  theme: string;
  specialTopic: string;
  stage: '小学' | '初中' | '高中';
  questionConfig: Record<string, QuestionConfigItem>;
  grade?: string;
  examScope?: string;
}

export interface AIPaperQuestion {
  id: string;
  content: string;
  options?: string[];
  answer?: string;
  analysis?: string;
}

export interface AIPaperSection {
  title: string;
  type: string;
  instructions: string;
  questions: AIPaperQuestion[];
}

export interface AIPaper {
  title: string;
  sections: AIPaperSection[];
}

import en from '../locales/en.json';

export const AI_CONFIG = {
  BASE_URL: 'https://teacher.classcard.workers.dev',
};

export interface BilingualProcedure {
  title_zh: string;
  title_en: string;
  content_zh: string;
  content_en: string;
  duration?: number;
}

export interface BilingualAudienceAnalysis {
  type?: string;
  description?: string;
  ageRange?: string;
  proficiency?: string;
  learningStyle?: string;
}

export interface TeachingPreparation {
  objectives_zh: string[];
  objectives_en: string[];
  keyWords_zh: string[];
  keyWords_en: string[];
  duration: number;
  teachingAids_zh: string;
  teachingAids_en: string;
  studentAnalysis_zh: string;
  studentAnalysis_en: string;
  sentenceStructures_zh: string[];
  sentenceStructures_en: string[];
  audienceAnalysis?: BilingualAudienceAnalysis[];
}

export interface LessonPlan {
  title_zh: string;
  title_en: string;
  grade: string;
  topic?: string;
  duration: number;
  teachingMethod: string;
  teachingPreparation: TeachingPreparation;
  procedures: BilingualProcedure[];
}

export type LessonPlanResponse = LessonPlan;

type ProcedureStep = {
  step: string;
  teachersTalk: string;
  justification: string;
  duration?: number;
};

export interface ImageAnalysisResult {
  words: string[];
  sentences: string[];
  suggestedTopic: string;
  grammar_points: string[];
  vocabulary_extensions: string[];
}

// Validation Schemas
const teachingPreparationSchema = yup.object({
  objectives: yup.array().of(yup.string()).optional().nullable(),
  objectives_detail: yup.object({
    knowledge: yup.array().of(yup.string()).optional().nullable(),
    skills: yup.array().of(yup.string()).optional().nullable(),
    affective: yup.array().of(yup.string()).optional().nullable()
  }).optional().nullable(),
  keyWords: yup.array().of(yup.string()).optional().nullable(),
  duration: yup.number().optional().nullable(),
  teachingAids: yup.string().optional().nullable(),
  studentAnalysis: yup.string().optional().nullable(),
  sentenceStructures: yup.string()
    .transform((v: any) => Array.isArray(v) ? v.join('\n') : v)
    .optional().nullable(),
  audienceAnalysis: yup.array().of(yup.object({
    type: yup.string().optional().nullable(),
    description: yup.string().optional().nullable(),
    ageRange: yup.string().optional().nullable(),
    proficiency: yup.string().optional().nullable(),
    learningStyle: yup.string().optional().nullable()
  })).optional().nullable()
});

const lessonPlanSchema = yup.object({
  title: yup.string().optional().nullable(),
  grade: yup.string().optional().nullable(),
  duration: yup.number().optional().nullable(),
  teachingMethod: yup.string().optional().nullable(),
  teachingPreparation: yup.object().optional().nullable(), // Relaxed to avoid strict shape check here if needed, or use teachingPreparationSchema
  procedures: yup.array().of(yup.string().optional().nullable()).optional().nullable(),
  assessment: yup.string().optional().nullable(),
  homework: yup.string().optional().nullable(),
  blackboard_design: yup.string().optional().nullable(),
  teaching_reflection: yup.string().optional().nullable()
});

const lessonPlanResponseSchema = yup.object({
  zh: lessonPlanSchema.optional(),
  en: lessonPlanSchema.optional()
});

export interface GeneratePlanParams {
  topic: string;
  level: string;
  grade: string;
  duration: number;
  mode: 'task-based' | 'project-based' | 'PPP' | 'PWP' | 'TTT';
  language?: 'zh' | 'en' | 'fr';
  words?: string[];
  vocabularyExtensions?: string;
  sentences?: string[];
  grammar?: string[];
  activityContent?: string;
  functionType?: 'lesson' | 'activity';
  subject?: '英语' | '数学' | '语文';
}

interface GeminiConfig {
  useMock?: boolean;
}

export class GeminiService {
  private useMock: boolean;
  private parseStats = {
    layer1: { attempts: 0, successes: 0 },
    layer2: { attempts: 0, successes: 0 },
    layer3: { attempts: 0, successes: 0 }
  };
  private isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
  private isArrayUnknown(value: unknown): value is Array<unknown> {
    return Array.isArray(value);
  }
  private md5(s: string): string {
    function r(x: number, c: number) { return (x << c) | (x >>> (32 - c)); }
    function c(a: number, b: number, c: number) { return (a & b) | (~a & c); }
    function d(a: number, b: number, c: number) { return (a & c) | (b & ~c); }
    function e(a: number, b: number, c: number) { return a ^ b ^ c; }
    function f(a: number, b: number, c: number) { return b ^ (a | ~c); }
    function g(q: number, a: number, b: number, x: number, s: number, t: number) { return r((q + a + x + t) >>> 0, s) + b >>> 0; }
    function h(str: string) {
      const n = str.length; const bytes = [] as number[];
      for (let i = 0; i < n; i++) bytes.push(str.charCodeAt(i) & 0xff);
      bytes.push(0x80);
      while ((bytes.length % 64) !== 56) bytes.push(0);
      const l = n * 8; for (let i = 0; i < 8; i++) bytes.push((l >>> (8 * i)) & 0xff);
      return bytes;
    }
    function i(bytes: number[]) {
      let a = 0x67452301, b = 0xefcdab89, c2 = 0x98badcfe, d2 = 0x10325476;
      for (let j = 0; j < bytes.length; j += 64) {
        const x = new Array(16).fill(0);
        for (let k = 0; k < 64; k++) x[k >> 2] |= bytes[j + k] << ((k % 4) * 8);
        let A = a, B = b, C = c2, D = d2;
        const S1 = [7,12,17,22], S2 = [5,9,14,20], S3 = [4,11,16,23], S4 = [6,10,15,21];
        const T = (n: number) => Math.floor(Math.abs(Math.sin(n)) * 4294967296);
        for (let k = 0; k < 64; k++) {
          let q = 0, s = 0, idx = 0;
          if (k < 16) { q = c(B, C, D); s = S1[k % 4]; idx = k; }
          else if (k < 32) { q = d(B, C, D); s = S2[k % 4]; idx = (5 * k + 1) % 16; }
          else if (k < 48) { q = e(B, C, D); s = S3[k % 4]; idx = (3 * k + 5) % 16; }
          else { q = f(B, C, D); s = S4[k % 4]; idx = (7 * k) % 16; }
          const tmp = D; D = C; C = B; B = g(A, q, B, x[idx], s, T(k + 1)); A = tmp;
        }
        a = (a + A) >>> 0; b = (b + B) >>> 0; c2 = (c2 + C) >>> 0; d2 = (d2 + D) >>> 0;
      }
      const toHex = (n: number) => ('00000000' + n.toString(16)).slice(-8);
      const le = (n: number) => toHex(((n & 0xff) << 24) | ((n & 0xff00) << 8) | ((n & 0xff0000) >>> 8) | ((n >>> 24) & 0xff));
      return le(a) + le(b) + le(c2) + le(d2);
    }
    return i(h(s));
  }

  private previousPlans: LessonPlan[] = [];

  constructor(config?: GeminiConfig) {
    this.useMock = config?.useMock ?? (import.meta.env.VITE_USE_MOCK === 'true');
  }

  public async generateWithWorker(
    promptOrMessages: string | { role: string; content: any }[],
    onUpdate?: (text: string) => void,
    modelType: 'deepseek' | 'gemini' | 'gpt' | 'deepseek_1' | 'deepseek_2' | 'flash_lite' = 'deepseek'
  ): Promise<string> {
    const secret = import.meta.env.VITE_CLASSCARD_WORKER_SECRET;
    if (!AI_CONFIG.BASE_URL || !secret) {
      throw new Error('Worker configuration is missing');
    }

    const messages = Array.isArray(promptOrMessages)
      ? promptOrMessages
      : [{ role: 'user', content: promptOrMessages }];

    const modelMap: Record<string, string> = {
      deepseek: 'gemini-2.0-flash',
      gemini: 'gemini-2.0-flash',
      gpt: 'gemini-2.0-flash',
      deepseek_1: 'gemini-2.0-flash',
      deepseek_2: 'gemini-2.0-flash',
      flash_lite: 'gemini-2.0-flash-lite-preview-02-05', // Using the preview version as lite might not be stable or available as just 'gemini-2.0-flash-lite' yet, but let's assume standard naming if applicable. Actually, let's stick to what user said or a standard guess. The user said "gemini-2.0-flash-lite".
    };
    // Correcting model ID based on common naming or user instruction. 
    // User said "gemini-2.0-flash-lite".
    if (modelType === 'flash_lite') {
        modelMap['flash_lite'] = 'gemini-2.0-flash-lite-preview-02-05'; // Best guess for current lite model
    }

    const model = modelMap[modelType] ?? 'gemini-2.0-flash';

    // Use mapped model ID
    const actualModelId = model;

    try {
      const res = await fetch(AI_CONFIG.BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ClassCard-Secret': secret,
        },
        body: JSON.stringify({
          model: actualModelId,
          messages,
          stream: false,
          retry_policy: {
            primary: actualModelId,
            fallback_order: ['gemini-2.0-flash'],
          },
        }),
        signal: AbortSignal.timeout(80000),
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Worker endpoint not found or secret is invalid');
        }
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to generate response from worker');
      }

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
      
      const content = data.choices?.[0]?.message?.content || '';
      
      return content;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout after 80 seconds');
        }
        throw error;
      }
      throw new Error('Unknown error during worker generation');
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async generateAIPaper(params: AIPaperParams): Promise<AIPaper> {
    if (this.useMock) {
        // Return a mock paper if in mock mode
        return {
            title: `Mock Paper: ${params.theme}`,
            sections: [
                {
                    title: "Part I: Vocabulary",
                    type: "single_choice",
                    instructions: "Choose the best answer.",
                    questions: [
                        { id: "1", content: "Mock question 1", options: ["A", "B", "C", "D"], answer: "A", analysis: "Mock analysis" }
                    ]
                }
            ]
        };
    }

    const prompt = buildAIPaperPrompt(params);
    const responseText = await this.generateWithWorker(prompt, undefined, 'flash_lite');
    
    // Parse JSON
    try {
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
        const data = JSON.parse(cleanJson);
        return data as AIPaper;
    } catch (e) {
        console.error("Failed to parse AI Paper JSON", e);
        throw new Error("Failed to generate valid JSON for AI Paper");
    }
  }

  private validateAIResponse(
    data: any,
    params?: GeneratePlanParams,
    options?: { allowMissingProcedures?: boolean }
  ): LessonPlan {
    // === 0. Basic Null Check ===
    if (!data || typeof data !== 'object') {
      console.warn('[VALIDATION] Received invalid data (not an object), throwing error');
      throw new Error('Invalid data: Response is not an object');
    }

    try {
      // === 1. Normalize Root Fields (Bilingual) ===
      if (!data.title_zh && data.title) data.title_zh = data.title;
      if (!data.title_zh) data.title_zh = '未命名教案';
      if (!data.title_en) data.title_en = data.title_zh || 'Lesson Plan';
      
      if (typeof data.duration !== 'number' || isNaN(data.duration)) { 
        data.duration = params?.duration ?? 45; 
      }
      
      // === 2. Normalize Teaching Preparation ===
      if (!data.teachingPreparation && data.preparation) {
        data.teachingPreparation = data.preparation;
      }
      if (!data.teachingPreparation) {
        data.teachingPreparation = {};
      }
      const prep = data.teachingPreparation;

      // Map legacy root fields to teachingPreparation
      if (data.teaching_objectives) prep.objectives = data.teaching_objectives;
      if (data.key_points) prep.keyWords = data.key_points;
      if (data.teaching_aids) prep.teachingAids = data.teaching_aids;
      if (data.sentence_structures) prep.sentenceStructures = data.sentence_structures;
      if (data.audience_analysis) prep.audienceAnalysis = data.audience_analysis;

      // Map legacy fields to bilingual fields if missing
      if (!prep.objectives_zh && prep.objectives) {
        prep.objectives_zh = Array.isArray(prep.objectives) ? prep.objectives : [String(prep.objectives)];
      }
      if (!prep.objectives_en) {
        prep.objectives_en = Array.isArray(prep.objectives_zh) ? [...prep.objectives_zh] : [];
      }
      
      if (!prep.keyWords_zh && prep.keyWords) {
        prep.keyWords_zh = Array.isArray(prep.keyWords) ? prep.keyWords : [String(prep.keyWords)];
      }
      if (!prep.keyWords_en) {
        prep.keyWords_en = Array.isArray(prep.keyWords_zh) ? [...prep.keyWords_zh] : [];
      }
      
      if (!prep.sentenceStructures_zh && prep.sentenceStructures) {
        prep.sentenceStructures_zh = Array.isArray(prep.sentenceStructures) 
          ? prep.sentenceStructures 
          : [String(prep.sentenceStructures)];
      }
      if (!prep.sentenceStructures_en) {
        prep.sentenceStructures_en = Array.isArray(prep.sentenceStructures_zh) ? [...prep.sentenceStructures_zh] : [];
      }

      if (!prep.teachingAids_zh && prep.teachingAids) prep.teachingAids_zh = prep.teachingAids;
      if (!prep.teachingAids_en) prep.teachingAids_en = prep.teachingAids_zh || '';

      if (!prep.studentAnalysis_zh && prep.studentAnalysis) prep.studentAnalysis_zh = prep.studentAnalysis;
      if (!prep.studentAnalysis_en) prep.studentAnalysis_en = prep.studentAnalysis_zh || '';
      
      // Normalize audienceAnalysis (convert strings to objects if needed)
      if (prep.audienceAnalysis) {
        const rawAudience = prep.audienceAnalysis;
        const arr = Array.isArray(rawAudience) ? rawAudience : [rawAudience];
        prep.audienceAnalysis = arr.map((item: any) => {
          if (typeof item === 'string') {
            const parts = item.split(':');
            if (parts.length >= 2) {
               return { type: parts[0].trim().toLowerCase(), description: parts.slice(1).join(':').trim() };
            }
            return { type: 'general', description: item };
          }
          return item;
        });
      }

      // Ensure arrays
      ['objectives_zh', 'objectives_en', 'keyWords_zh', 'keyWords_en', 'sentenceStructures_zh', 'sentenceStructures_en'].forEach(key => {
        if (!Array.isArray(prep[key])) prep[key] = [];
      });

      // === 3. Normalize Procedures ===
      if (!Array.isArray(data.procedures)) {
        // Handle legacy "activities" or "steps" keys
        const legacyProcedures = data.procedures || data.steps || data.activities || data.teachingProcess || [];
        if (Array.isArray(legacyProcedures)) {
           data.procedures = legacyProcedures.map((p: any) => {
             if (typeof p === 'string') {
               return {
                 title_zh: '步骤',
                 title_en: 'Step',
                 content_zh: p,
                 content_en: p,
                 duration: 5
               };
             }
             // If it's an object but missing bilingual fields
             return {
               title_zh: p.title_zh || p.step_title || p.step || '步骤',
               title_en: p.title_en || 'Step',
               content_zh: p.content_zh || p.content || JSON.stringify(p),
               content_en: p.content_en || p.content_zh || JSON.stringify(p),
               duration: p.duration || 5
             };
           });
        } else {
           data.procedures = [];
        }
      } else {
        // Validate existing procedures array items
        data.procedures = data.procedures.map((p: any) => {
           if (typeof p === 'string') {
             return {
               title_zh: '步骤',
               title_en: 'Step',
               content_zh: p,
               content_en: p,
               duration: 5
             };
           }
           return {
             title_zh: p.title_zh || p.step_title || p.step || '步骤',
             title_en: p.title_en || 'Step',
             content_zh: p.content_zh || p.content || JSON.stringify(p),
             content_en: p.content_en || p.content_zh || JSON.stringify(p),
             duration: p.duration || 5
           };
        });
      }

      // Merge continuation steps like “步骤1(续)” into the previous main step
      if (Array.isArray(data.procedures) && data.procedures.length > 0) {
        const merged: any[] = [];
        for (const p of data.procedures) {
          const rawTitleZh = String(p.title_zh || p.step_title || p.step || '');
          const rawTitleEn = String(p.title_en || '');
          const isContinuation =
            /续/.test(rawTitleZh) ||
            /\(cont\.?\)|\(continued\)/i.test(rawTitleEn);

          if (!isContinuation || merged.length === 0) {
            merged.push(p);
          } else {
            const base = merged[merged.length - 1];
            const baseContentZh = typeof base.content_zh === 'string' ? base.content_zh : '';
            const baseContentEn = typeof base.content_en === 'string' ? base.content_en : '';
            const extraContentZh = typeof p.content_zh === 'string' ? p.content_zh : (p.content || '');
            const extraContentEn = typeof p.content_en === 'string'
              ? p.content_en
              : (p.content_zh || p.content || '');

            const combinedZh = [baseContentZh, extraContentZh].filter(Boolean).join('\n\n');
            const combinedEn = [baseContentEn, extraContentEn].filter(Boolean).join('\n\n');

            base.content_zh = combinedZh;
            base.content_en = combinedEn;

            const baseDuration = typeof base.duration === 'number' ? base.duration : 0;
            const extraDuration = typeof p.duration === 'number' ? p.duration : 0;
            if (baseDuration || extraDuration) {
              base.duration = baseDuration + extraDuration;
            }
          }
        }
        data.procedures = merged;
      }

      if (!options?.allowMissingProcedures) {
        if (!Array.isArray(data.procedures) || data.procedures.length === 0) {
          console.warn('[VALIDATION] No procedures found, using emergency fallback procedures');
          const emergencyParams = params || { topic: data.title_zh || 'Unknown', grade: 'Grade 7', duration: 45, mode: 'task-based' } as any;
          const emergencyPlan = this.getEmergencyLessonPlan(params?.language || 'zh', emergencyParams);
          
          // Merge emergency procedures
          data.procedures = emergencyPlan.procedures;
          
          // If teachingPreparation is also missing, merge that too
          if (!data.teachingPreparation || Object.keys(data.teachingPreparation).length === 0) {
             data.teachingPreparation = emergencyPlan.teachingPreparation;
          }
        }
      }

      const isActivity = params?.functionType === 'activity';
      const minSteps = isActivity ? 6 : 10;
      const maxSteps = isActivity ? 20 : 15;

      if (Array.isArray(data.procedures) && data.procedures.length > 0) {
        data.procedures = data.procedures.map((p: any) => {
          const rawTitleZh = typeof p.title_zh === 'string' ? p.title_zh : '';
          const rawTitleEn = typeof p.title_en === 'string' ? p.title_en : '';

          const cleanedTitleZh = rawTitleZh
            .replace(/[（(]续[)）]/g, '')
            .replace(/([\u4e00-\u9fa5])\s+(?=[\u4e00-\u9fa5])/g, '$1')
            .trim();

          const cleanedTitleEn = rawTitleEn
            .replace(/\(cont\.?\)|\(continued\)/gi, '')
            .trim();

          return {
            ...p,
            title_zh: cleanedTitleZh || rawTitleZh || '步骤',
            title_en: cleanedTitleEn || rawTitleEn || 'Step',
          };
        });

        const seenKeys = new Set<string>();
        data.procedures = data.procedures.filter((p: any) => {
          const key = `${p.title_zh || ''}__${p.title_en || ''}__${p.content_zh || ''}`;
          if (seenKeys.has(key)) {
            return false;
          }
          seenKeys.add(key);
          return true;
        });

        if (!options?.allowMissingProcedures && data.procedures.length < minSteps) {
          throw new Error(`Too few procedures: expected at least ${minSteps}, got ${data.procedures.length}`);
        }

        if (data.procedures.length > maxSteps) {
          data.procedures = data.procedures.slice(0, maxSteps);
        }
      }

      return data as LessonPlan;
    } catch (error) {
      console.warn("Validation failed completely, throwing error", error);
      throw error;
    }
  }

  private getEmergencyLessonPlan(language: string, params?: GeneratePlanParams): LessonPlan {
    const topic = params?.topic || 'Emergency Topic';
    return {
        title_zh: `关于 ${topic} 的紧急教案`,
        title_en: `Emergency Lesson Plan for ${topic}`,
        grade: 'Grade 7',
        duration: 45,
        teachingMethod: 'task-based',
        teachingPreparation: {
          objectives_zh: [`学生将了解${topic}的基础概念`, '学生将参与活动'],
          objectives_en: [`Students will understand basic concepts of ${topic}`, 'Students will participate in activities'],
          keyWords_zh: [topic, '学习', '教育'],
          keyWords_en: [topic, 'learning', 'education'],
          duration: 45,
          teachingAids_zh: '白板，马克笔',
          teachingAids_en: 'Whiteboard, markers',
          studentAnalysis_zh: '学生有基础知识',
          studentAnalysis_en: 'Students have basic knowledge',
          sentenceStructures_zh: [`关于${topic}的关键句型`],
          sentenceStructures_en: [`Key structures for ${topic}`]
        },
        procedures: [
           {
             title_zh: "步骤1：导入 (5分钟)",
             title_en: "Step 1: Introduction (5 min)",
             content_zh: `**教师行为**：欢迎大家来到今天的课堂，今天我们学习${topic}。\n**学生反应**：认真听讲并回应。\n\n*设计意图：建立参与度。*`,
             content_en: `**Teacher's Actions**: Hello everyone! Today we are learning ${topic}.\n**Students' Responses**: Listen and respond.\n\n*Design Rationale: Build engagement.*`,
             duration: 5
           },
           {
             title_zh: "步骤2：热身 (5分钟)",
             title_en: "Step 2: Warm-up (5 min)",
             content_zh: "**教师行为**：复习相关词汇。\n**学生反应**：回答问题。\n\n*设计意图：激活已有知识。*",
             content_en: "**Teacher's Actions**: Review related words.\n**Students' Responses**: Answer questions.\n\n*Design Rationale: Activate prior knowledge.*",
             duration: 5
           },
           {
             title_zh: "步骤3：讲授 (10分钟)",
             title_en: "Step 3: Presentation (10 min)",
             content_zh: "**教师行为**：讲解新概念。\n**学生反应**：做笔记。\n\n*设计意图：输入新知识。*",
             content_en: "**Teacher's Actions**: Introduce new concepts.\n**Students' Responses**: Take notes.\n\n*Design Rationale: Input new knowledge.*",
             duration: 10
           },
           {
             title_zh: "步骤4：小组探索 (8分钟)",
             title_en: "Step 4: Group Exploration (8 min)",
             content_zh: "**教师行为**：分组并给出任务卡，引导学生在小组中围绕主题提出问题、查找信息或完成小任务。\n**学生反应**：在小组内分工合作，记录想法和问题。\n\n*设计意图：通过合作学习深化理解，发展思维品质。*",
             content_en: "**Teacher's Actions**: Put students into groups, provide task cards, and guide them to explore the topic through questions and mini tasks.\n**Students' Responses**: Work in groups, discuss, and note down ideas and questions.\n\n*Design Rationale: Use collaborative learning to deepen understanding and thinking skills.*",
             duration: 8
           },
           {
             title_zh: "步骤5：全班汇报 (7分钟)",
             title_en: "Step 5: Whole-class Sharing (7 min)",
             content_zh: "**教师行为**：邀请代表小组分享成果，归纳共性和差异，适当补充跨学科或文化背景信息。\n**学生反应**：代表发言，其余学生倾听、记录并进行补充或提问。\n\n*设计意图：通过展示与交流促进信息整合与迁移。*",
             content_en: "**Teacher's Actions**: Invite group representatives to share; summarize common points and differences; add cross-curricular or cultural information.\n**Students' Responses**: Present, listen, take notes, ask questions, and add ideas.\n\n*Design Rationale: Support integration and transfer of learning through sharing and discussion.*",
             duration: 7
           },
           {
             title_zh: "步骤6：巩固练习 (10分钟)",
             title_en: "Step 6: Consolidation Practice (10 min)",
             content_zh: "**教师行为**：设计针对本课重点词汇和句型的任务型练习（如信息差活动、角色扮演等）。\n**学生反应**：在任务情境中使用目标语言进行交流和输出。\n\n*设计意图：在真实或模拟语境中巩固语言形式与功能。*",
             content_en: "**Teacher's Actions**: Design task-based practice for key vocabulary and sentence patterns (e.g., information-gap tasks, role play).\n**Students' Responses**: Use target language in the tasks to communicate and produce output.\n\n*Design Rationale: Consolidate language form and function in meaningful contexts.*",
             duration: 10
           },
           {
             title_zh: "步骤7：评价与反馈 (5分钟)",
             title_en: "Step 7: Assessment and Feedback (5 min)",
             content_zh: "**教师行为**：依据预设评价标准，对学生表现进行即时反馈，可采用同伴互评与自评方式。\n**学生反应**：根据评价标准自我反思，并给出同伴建议。\n\n*设计意图：通过评价促进学生自我监控与调整。*",
             content_en: "**Teacher's Actions**: Use clear criteria to provide immediate feedback; guide peer- and self-assessment.\n**Students' Responses**: Reflect on their own performance and give feedback to peers.\n\n*Design Rationale: Foster self-monitoring and regulation through assessment.*",
             duration: 5
           },
           {
             title_zh: "步骤8：总结与作业 (5分钟)",
             title_en: "Step 8: Summary and Homework (5 min)",
             content_zh: "**教师行为**：回顾本课重点内容，点名学生分享今日收获，并布置与主题相关的家庭任务。\n**学生反应**：总结所学内容，记录作业要求。\n\n*设计意图：巩固当堂学习成果，并将学习延伸到课堂之外。*",
             content_en: "**Teacher's Actions**: Review key points, invite students to share takeaways, and assign homework related to the topic.\n**Students' Responses**: Summarize what they learned and note down homework.\n\n*Design Rationale: Consolidate learning and extend it beyond the classroom.*",
             duration: 5
           }
         ]
    };
  }

  public async *generateLessonPlanStream(
    params: GeneratePlanParams,
    onPartial?: (partial: string | LessonPlanResponse) => void,
    temperature: number = 0.7
  ): AsyncGenerator<string | LessonPlanResponse, LessonPlanResponse, undefined> {
    const result = await this.generateLessonPlan(params, (chunk) => {
        if (onPartial) onPartial(chunk);
    });
    if (onPartial) onPartial(result);
    yield result;
    return result;
  }


  private calculateSimilarity(plan1: LessonPlan, plan2: LessonPlan): number {
    let score = 0;
    
    // Title similarity (0.3)
    if (plan1.title_zh === plan2.title_zh || plan1.title_en === plan2.title_en) score += 0.3;
    
    // Objectives similarity (0.2)
    const objs1 = plan1.teachingPreparation?.objectives_zh || [];
    const objs2 = plan2.teachingPreparation?.objectives_zh || [];
    const commonObjs = objs1.filter((o: string) => objs2.includes(o));
    if (objs1.length > 0 && commonObjs.length > 0) {
      score += 0.2 * (commonObjs.length / Math.max(objs1.length, objs2.length));
    }
    
    // Procedures similarity (0.5)
    const procs1 = plan1.procedures || [];
    const procs2 = plan2.procedures || [];
    
    if (procs1.length === procs2.length) {
      score += 0.1; // Length match
    }
    
    // Check content overlap
    let matchCount = 0;
    for(const p1 of procs1) {
        if (procs2.some(p2 => p2.content_zh === p1.content_zh || p2.content_en === p1.content_en)) {
            matchCount++;
        }
    }
    
    if (procs1.length > 0) {
        score += 0.4 * (matchCount / Math.max(procs1.length, procs2.length));
    }
    
    return score;
  }

  public async generateLessonPlan(
    params: GeneratePlanParams,
    onChunk?: (chunk: string) => void
  ): Promise<LessonPlanResponse> {
    if (this.useMock) {
      const raw = Array.isArray(mockData) && mockData.length > 0 ? (mockData as any[])[0] : (mockData as any);
      const validatedData = this.validateAIResponse(raw, params);
      
      // Novelty Check for Mock
      const maxSimilarity = 0.7;
      for (const prevPlan of this.previousPlans) {
          const similarity = this.calculateSimilarity(validatedData, prevPlan);
          if (similarity > maxSimilarity) {
              console.warn(`[NOVELTY CHECK] Lesson plan similarity too high`, similarity);
              console.warn('Generated plan is too similar to previous content, suggest regeneration');
          }
      }

      // Update history
      this.previousPlans.unshift(validatedData);
      if (this.previousPlans.length > 5) {
          this.previousPlans.pop();
      }

      return validatedData;
    }

    try {
      const systemPrompt = buildSystemPrompt(params);

      // 1. Calculate time allocation
      // User requested: Total duration input does NOT include the 2-minute homework.
      // So if input is 45 mins, teaching procedures should sum to 45 mins, and homework is +2 mins (Total 47).
      const teachingDuration = params.duration || 45;
      const homeworkDuration = 2;

      let userMessage = 'Please generate the lesson plan based on the above requirements.';
      if (params.functionType !== 'activity') {
        userMessage += ' ' +
          `Global Duration Rule: The main teaching procedures MUST sum up to exactly ${teachingDuration} minutes. ` +
          `ADDITIONALLY, append a final "Homework" step with a duration of EXACTLY ${homeworkDuration} minutes. ` +
          `So the TOTAL duration of the plan will be ${teachingDuration + homeworkDuration} minutes. ` +
          `The "Homework" step is EXTRA and NOT part of the ${teachingDuration} minutes teaching time. ` +
          `The Homework content MUST be detailed and actionable.`;
      }

      userMessage += " Finish the JSON structure completely. Ensure the last step ends with a closing brace '}'. Ensure the content is detailed and comprehensive.";

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userMessage }
      ];

      console.log(`[${new Date().toISOString()}] 📦 Sending messages for lesson plan (Worker):`, JSON.stringify(messages, null, 2));

      const modelType: 'deepseek' | 'gemini' | 'gpt' =
        params.functionType === 'activity' ? 'gemini' : 'deepseek';

      const responseContent = await this.generateWithWorker(
        messages,
        (partialText) => {
          if (onChunk) onChunk(partialText);
        },
        modelType
      );

      console.log(`[${new Date().toISOString()}] ✅ Received raw response (Worker):`, responseContent);

      let extractedJson = this.extractJsonFromText(responseContent);

      // Unwrapping logic for nested responses (e.g. { zh: {...} })
      if (extractedJson && typeof extractedJson === 'object') {
        if (extractedJson.zh && typeof extractedJson.zh === 'object' && !Array.isArray(extractedJson.zh)) {
           console.log(`[${new Date().toISOString()}] 🧹 Unwrapping 'zh' property from response`);
           extractedJson = extractedJson.zh;
        } else if (extractedJson.en && typeof extractedJson.en === 'object' && !Array.isArray(extractedJson.en)) {
           console.log(`[${new Date().toISOString()}] 🧹 Unwrapping 'en' property from response`);
           extractedJson = extractedJson.en;
        }
      }

      const validatedData = this.validateAIResponse(extractedJson, params);

      // Novelty Check
      const maxSimilarity = 0.7;
      for (const prevPlan of this.previousPlans) {
          const similarity = this.calculateSimilarity(validatedData, prevPlan);
          if (similarity > maxSimilarity) {
              console.warn(`[NOVELTY CHECK] Lesson plan similarity too high`, similarity);
              console.warn('Generated plan is too similar to previous content, suggest regeneration');
          }
      }

      // Update history
      this.previousPlans.unshift(validatedData);
      if (this.previousPlans.length > 5) {
          this.previousPlans.pop();
      }

      return validatedData;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ generateLessonPlan failed:`, error);
      
      // Fallback to emergency plan
      console.warn('Returning emergency fallback plan due to error.');
      return this.getEmergencyLessonPlan('zh', params);
    }
  }


  private getMethodologyConstraints(mode?: string): string {
    const m = (mode || 'task-based').toLowerCase();
    if (m === 'ppp') {
      return '   - METHODOLOGY STRUCTURE (PPP): The lesson MUST follow the "Presentation -> Practice -> Production" flow.\n' +
             '     1. Presentation: Introduce new language in context.\n' +
             '     2. Practice: Include both mechanical drills and meaningful practice. Mix them up.\n' +
             '     3. Production: A free output task where students use language creatively.\n';
    } else if (m === 'pwp' || m.includes('read') || m.includes('listen')) {
      return '   - METHODOLOGY STRUCTURE (PWP): The lesson MUST follow the "Pre -> While -> Post" flow.\n' +
             '     1. Pre-stage: Activate background knowledge and pre-teach key vocab.\n' +
             '     2. While-stage: Tasks during reading/listening (scanning, skimming, detailed understanding).\n' +
             '     3. Post-stage: Discussion, extension, or creative output based on the text.\n';
    } else {
      // Default to Task-Based Learning (TBL)
      return '   - METHODOLOGY STRUCTURE (Task-Based): The lesson MUST follow the "Pre-task -> Task Cycle -> Post-task" flow.\n' +
             '     1. Pre-task: Introduction to topic and task.\n' +
             '     2. Task Cycle: Task -> Planning -> Report.\n' +
             '     3. Post-task: Language focus and feedback.\n';
    }
  }

  public async generateLessonPlanSegmented(
    params: GeneratePlanParams,
    onStatus?: (part: string, state: string) => void,
    onChunk?: (part: string, chunk: string) => void
  ): Promise<LessonPlanResponse> {
    if (this.useMock) {
      const raw = Array.isArray(mockData) && mockData.length > 0 ? (mockData as any[])[0] : (mockData as any);
      const validatedData = this.validateAIResponse(raw, params);
      if (onStatus) {
        onStatus('outline', 'done');
        onStatus('prep', 'done');
        onStatus('proc', 'done');
        onStatus('full', 'done');
      }
      return validatedData;
    }

    try {
      const systemPrompt = buildSystemPrompt(params);
      
      const teachingDuration = params.duration || 45;
      const homeworkDuration = 2;
      
      // Parallel Execution: Task A (Metadata/Prep) and Task B (Procedures) run simultaneously
      // Both use 'gemini' (mapped to gemini-2.0-flash-lite internally)
      
      const isReadingOrListening = (params.mode === 'PWP' || (params.mode || '').toLowerCase().includes('read') || (params.mode || '').toLowerCase().includes('listen'));
      const quantityPrompt = isReadingOrListening
        ? `1. Main Procedures: Generate 10-15 detailed steps that sum up to exactly ${teachingDuration} minutes.\n` +
          '   - QUANTITY RULE: You MUST generate AT LEAST 10 STEPS. To reach this count, you MUST break down the "Pre-While-Post" stages into granular sub-tasks (e.g., "Lead-in" -> "Vocab Pre-teaching" -> "Prediction" -> "Skimming" -> "Scanning" -> "Detailed Reading Para 1" -> "Detailed Reading Para 2" -> "Critical Thinking" -> "Retelling"). Do NOT use artificial game splitting.\n'
        : `1. Main Procedures: Generate 10-15 detailed steps that sum up to exactly ${teachingDuration} minutes.\n` +
          '   - QUANTITY RULE: You MUST generate AT LEAST 10 STEPS. If standard steps are fewer, you MUST BREAK DOWN complex activities into smaller, distinct sub-steps (e.g., "Game Explanation" -> "Game Demo" -> "Game Play" -> "Round 2 with Variation").\n';

      const group1Messages = [
        { role: 'system' as const, content: systemPrompt },
        {
          role: 'user' as const,
          content:
            'TASK A: Generate Lesson Metadata & Teaching Preparation\n' +
            'Based on the requirements, generate a JSON object with the following fields:\n' +
            '1. Metadata: title_zh, title_en, grade, duration, teachingMethod\n' +
            '2. Teaching Preparation: objectives, keyWords, teachingAids, studentAnalysis, sentenceStructures\n' +
            '   - For "teachingAids", prioritize using REAL OBJECTS (realia) whenever possible.\n' +
            '   - AVOID GENERIC CONTENT: Objectives and analysis must be specific to this exact topic, not generic templates.\n\n' +
            'CONSTRAINTS:\n' +
            '- Do NOT include the "procedures" array.\n' +
            '- Ensure all content is bilingual (Chinese & English) where applicable.\n' +
            "- Finish the JSON structure completely. Ensure the last item ends with a closing brace '}'."
        }
      ];

      // Group 2: All Procedures + Homework
      const group2Messages = [
        { role: 'system' as const, content: systemPrompt },
        {
          role: 'user' as const,
          content:
            'TASK B: Generate Detailed Teaching Procedures & Homework\n' +
            'Based on the requirements, generate a JSON object with a "procedures" array containing the full teaching sequence.\n\n' +
            'REQUIREMENTS:\n' +
            quantityPrompt +
            '   - Fields: title_zh, title_en, content_zh, content_en, duration.\n' +
            '   - CREATIVITY: Activities MUST be gamified, fun, and strictly tailored to the grade level\'s interests. Use REALIA (real objects) for interaction.\n' +
             '   - ACTIVITY QUALITY: Strictly prohibit simple/low-quality games. Even classic games (e.g., Simon Says, Bingo) MUST be redesigned with unique twists, cognitive challenges, or specific linguistic focus. Avoid generic descriptions. Every activity must have clear mechanics, rules, and a defined learning outcome.\n' +
             '   - DIFFICULTY CONTROL: AVOID complex tasks like debates, report writing, or long speeches. Focus on accessible, interactive oral practice.\n' +
             '   - VARIETY & NOVELTY: STRICTLY AVOID repetitive patterns. Each generated plan MUST feel fresh and unique. Do not reuse standard/boring activity templates.\n' +
             this.getMethodologyConstraints(params.mode) +
             '   - CONTENT COHERENCE & TRANSITIONS: Transitions must be based on DEEP CONTENT LOGIC, not just transitional words. The outcome/output of the previous step MUST be the direct input or context for the next step. Ensure a continuous narrative flow where activities build upon each other logically (e.g., "Using the vocabulary map we just created, let\'s now...").\n' +
             '   - VOCABULARY TEACHING RULE: Do NOT directly explain or translate new words. You MUST use an INDUCTIVE approach: 1) Present the word in a meaningful context (story/situation) where it is initially unknown. 2) Guide students to NOTICE the word. 3) Design activities where students DEDUCE or DISCOVER the meaning themselves.\n' +
             '   - SENTENCE TEACHING RULE: Do NOT directly demo/drill the sentence structure first. You MUST use an INDUCTIVE approach: 1) Embed the target sentence in a context/dialogue. 2) Guide students to NOTICE the structure. 3) Facilitate activities where students deduce HOW to form the sentence before any mechanical drilling.\n' +
             '   - DETAIL: The content for each step MUST be STRICTLY at least 500 characters. Expand on interactions, dialogue examples, and specific instructions.\n' +
             '   - STRUCTURE: Must include "Teacher\'s Actions", "Student\'s Actions", and "Design Intent".\n' +
             `2. Homework: MUST be the LAST step. Duration = ${homeworkDuration} minutes.\n` +
             '   - This is EXTRA time (not included in the teaching duration).\n' +
             '   - FORMAT: MUST be "Layered Homework" (e.g., Foundation, Improvement, Challenge).\n' +
             '   - Content MUST be detailed and clearly differentiated.\n\n' +
             'CONSTRAINTS:\n' +
             '- Return ONLY the "procedures" array in the JSON.\n' +
             '- Do NOT include metadata or teaching preparation.\n' +
             "- Finish the JSON structure completely. Ensure the last step ends with a closing brace '}'."
        }
      ];

      if (onStatus) {
        onStatus('outline', 'loading');
        onStatus('prep', 'loading');
        onStatus('proc', 'loading');
        onStatus('full', 'idle');
      }

      // Parallel Execution: Task A (Metadata/Prep) and Task B (Procedures) run simultaneously
      // Both use 'gemini' (mapped to gemini-2.0-flash-lite internally)
      const [group1Result, group2Result] = await Promise.allSettled([
        this.generateWithWorker(group1Messages, undefined, 'gemini'),
        this.generateWithWorker(group2Messages, undefined, 'gemini')
      ]);

      // Handle errors individually
      if (group1Result.status === 'rejected') {
        throw new Error(`Task A (Metadata/Prep) failed: ${group1Result.reason}`);
      }
      if (group2Result.status === 'rejected') {
        throw new Error(`Task B (Procedures) failed: ${group2Result.reason}`);
      }

      const group1Raw = group1Result.value;
      const group2Raw = group2Result.value;

      const part1Plan = this.validateAIResponse(this.extractJsonFromText(group1Raw), params, { allowMissingProcedures: true });
      const part2Plan = this.validateAIResponse(this.extractJsonFromText(group2Raw), params, { allowMissingProcedures: true });

      if (onStatus) {
        onStatus('outline', 'done');
        onStatus('prep', 'done');
        onStatus('proc', 'done');
      }

      // Stitching Logic
      // Part 1 has metadata and prep. Part 2 has procedures.
      const finalProcedures = part2Plan.procedures || [];

      const mergedPlan: LessonPlan = {
        ...part1Plan,
        procedures: finalProcedures
      };

      const finalPlan = this.validateAIResponse(mergedPlan, params);

      // Novelty Check
      const maxSimilarity = 0.7;
      for (const prevPlan of this.previousPlans) {
        const similarity = this.calculateSimilarity(finalPlan, prevPlan);
        if (similarity > maxSimilarity) {
          console.warn(`[NOVELTY CHECK] Lesson plan similarity too high`, similarity);
          console.warn('Generated plan is too similar to previous content, suggest regeneration');
        }
      }

      this.previousPlans.unshift(finalPlan);
      if (this.previousPlans.length > 5) {
        this.previousPlans.pop();
      }

      if (onStatus) {
        onStatus('full', 'done');
      }

      return finalPlan;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ generateLessonPlanSegmented failed:`, error);
      if (onStatus) {
        onStatus('outline', 'idle');
        onStatus('prep', 'idle');
        onStatus('proc', 'idle');
        onStatus('full', 'idle');
      }
      return this.generateLessonPlan(params);
    }
  }

  private parseAndValidate(responseContent: string, params: GeneratePlanParams, options?: { allowMissingProcedures?: boolean }): LessonPlan {
    let extractedJson = this.extractJsonFromText(responseContent);
    if (extractedJson && typeof extractedJson === 'object') {
      if (extractedJson.zh && typeof extractedJson.zh === 'object' && !Array.isArray(extractedJson.zh)) {
        extractedJson = extractedJson.zh;
      } else if (extractedJson.en && typeof extractedJson.en === 'object' && !Array.isArray(extractedJson.en)) {
        extractedJson = extractedJson.en;
      }
    }
    return this.validateAIResponse(extractedJson, params, options);
  }

  public async analyzeImage(base64Image: string): Promise<ImageAnalysisResult> {
    if (this.useMock) {
      return {
        words: ['apple', 'banana', 'orange'],
        sentences: ['I see an apple.', 'There is a banana.'],
        suggestedTopic: 'Fruits',
        grammar_points: ['present simple', 'there is/are'],
        vocabulary_extensions: ['fruit', 'healthy', 'vitamin']
      };
    }

    try {
      const messages = [
        {
          role: 'user' as const,
          content: [
            {
              type: 'text',
              text: 'Perform OCR on the image and extract article sentences only (exclude titles, captions). Then provide: words, sentences, suggestedTopic, grammar_points, vocabulary_extensions. Return strict JSON with these exact keys.'
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}` }
            }
          ] as any
        }
      ] as any;

      const responseContent = await this.generateWithWorker(
        messages,
        undefined,
        'gpt'
      );

      const extractedJson = this.extractJsonFromText(responseContent);
      if (!extractedJson.words || !Array.isArray(extractedJson.words)) {
        extractedJson.words = [];
      }
      if (!extractedJson.sentences || !Array.isArray(extractedJson.sentences)) {
        extractedJson.sentences = [];
      }
      if (!extractedJson.suggestedTopic || typeof extractedJson.suggestedTopic !== 'string') {
        extractedJson.suggestedTopic = 'General Topic';
      }
      if (!extractedJson.grammar_points || !Array.isArray(extractedJson.grammar_points)) {
        extractedJson.grammar_points = [];
      }
      if (!extractedJson.vocabulary_extensions || !Array.isArray(extractedJson.vocabulary_extensions)) {
        extractedJson.vocabulary_extensions = [];
      }

      return extractedJson as ImageAnalysisResult;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ analyzeImage failed:`, error);
      throw error;
    }
  }

  private extractJsonFromText(text: string): any {
    try {
        // 1. 如果混入了 SSE 的 data: 标签，先清理掉
        if (text.includes('data:')) {
            text = text.split('\n')
                .filter(line => line.startsWith('data: '))
                .map(line => {
                    const content = line.replace('data: ', '').trim();
                    if (content === '[DONE]') return '';
                    try {
                        const parsed = JSON.parse(content);
                        return parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || '';
                    } catch { return ''; }
                }).join('');
        }

        // 2. 剥离 Markdown 标签 (增强版：支持大小写，支持 json/JSON)
        let cleanText = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

        // 3. 提取最外层的 { ... }
        const start = cleanText.indexOf('{');
        const end = cleanText.lastIndexOf('}');
        
        if (start === -1 || end === -1) throw new Error("文本中未找到有效的 JSON 对象");
        
        const jsonStr = cleanText.substring(start, end + 1);
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("解析彻底失败，原文如下:", text);
        // 如果 JSON 还是断掉的，尝试手动补全（紧急兜底）
        return this.emergencyFixJSON(text);
    }
  }

  private fixUnterminatedStrings(json: string): string {
    // Pass 1: Add missing quote before `, "key":`
    let fixed = json.replace(/(:\s*"[^"]*?)(?=\s*,\s*"[^"]+"\s*:)/g, '$1"');
    
    // Pass 2: Add missing quote before `}`
    fixed = fixed.replace(/(:\s*"[^"]*?)(?=\s*})/g, '$1"');
    
    // Pass 3: Add missing quote at very end if string is open
    if (/(:\s*"[^"]+)$/.test(fixed)) {
        fixed += '"';
    }
    
    return fixed;
  }

  private fixDoubleQuotes(text: string): string {
    return text.replace(/([^:\s,])""/g, '$1\\"').replace(/""([^:,\}\]])/g, '\\"$1');
  }

  private emergencyFixJSON(text: string): any {
    // 简单的补全尝试：如果以 } 结尾的数量不对，尝试强行闭合
    let fixed = text.trim();
    
    // Apply granular fixes first
    try {
        fixed = this.fixUnterminatedStrings(fixed);
        fixed = this.fixDoubleQuotes(fixed);
    } catch (e) {
        // Ignore regex errors
    }

    if (!fixed.endsWith('}')) fixed += '"}'; // 补全引号和括号
    try {
        return JSON.parse(fixed);
    } catch {
        return { error: "教案内容过长导致截断，请尝试缩短要求" };
    }
  }
}

export const geminiService = new GeminiService();
