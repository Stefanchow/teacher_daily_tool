import { LessonPlan, BilingualProcedure } from '@/services/geminiService';
import { BaseCardProps } from '@/components/core/BaseCard.types';
import { formatTitle } from './formatters';

// Define UI-specific ProcedureStep interface
export interface ProcedureStep {
  content: string;
  title: string;
  studentsOutput: string;
  duration?: number;
}

export interface CardData extends Omit<BaseCardProps, 'children' | 'onClick'> {
  procedures: ProcedureStep[];
  teachingPreparation: any;
}

// Helper to parse Markdown strings into structured objects
export const parseMarkdownProcedures = (items: BilingualProcedure[] | string[], lang: string = 'zh'): ProcedureStep[] => {
  // console.log('parseMarkdownProcedures received items:', items, 'lang:', lang);
  
  // Duration extraction (simple fallback)
  const dRe = /(\d+)\s*(?:min|minutes|分钟)/i;

  return items.map(item => {
    let text = '';
    let duration: number | undefined = undefined;
    let title = 'Step';

    if (typeof item === 'string') {
        text = item;
    } else {
        const anyItem: any = item as any;
        const hasBilingual = typeof anyItem.title_zh === 'string' || typeof anyItem.title_en === 'string' || typeof anyItem.content_zh === 'string' || typeof anyItem.content_en === 'string';
        if (hasBilingual) {
            text = (lang === 'en' ? anyItem.content_en : anyItem.content_zh) || '';
            title = (lang === 'en' ? anyItem.title_en : anyItem.title_zh) || 'Step';
            duration = anyItem.duration;
            return {
                content: text,
                title: title,
                studentsOutput: "",
                duration
            };
        }
        const legacyTeachers = anyItem.teachersTalk || anyItem.teacher || anyItem.teachers || '';
        const legacyStudents = anyItem.studentsOutput || anyItem.students || '';
        const legacyJustification = anyItem.justification || anyItem.rationale || anyItem.design || '';
        title = anyItem.step || anyItem.title || 'Step';
        duration = anyItem.duration;
        const teacherLabel = lang === 'en' ? "Teacher's Actions" : "教师行为";
        const studentLabel = lang === 'en' ? "Students' Responses" : "学生反应";
        const justificationLabel = "Justification";
        const parts = [];
        if (legacyTeachers) parts.push(`**${teacherLabel}**: ${legacyTeachers}`);
        if (legacyStudents) parts.push(`**${studentLabel}**: ${legacyStudents}`);
        if (legacyJustification) {
            parts.push(`*${justificationLabel}*`);
            parts.push(`${legacyJustification}`);
        }
        text = parts.join('\n');
        return {
            content: text,
            title,
            studentsOutput: legacyStudents || "",
            duration
        };
    }

    // Legacy string parsing logic
    if (typeof text !== 'string') return { content: '', title: '', studentsOutput: '' };
    
    const allLines = text.split(/\r?\n/);
    const titleLineIndex = allLines.findIndex(l => l.trim().length > 0);
    
    let extractedTitle = 'Step';
    let extractedContent = text; // Default to full text
    
    if (titleLineIndex !== -1) {
        extractedTitle = allLines[titleLineIndex].trim().replace(/^\*\*|\*\*$/g, '');
        const rest = allLines.slice(titleLineIndex + 1);
        const joinedRest = rest.join('\n').trim();
        if (joinedRest.length > 0) {
            extractedContent = joinedRest;
        } else {
            // If no content after title, return just the title line to avoid empty content issues
            extractedContent = allLines[titleLineIndex]; 
        }
    }

    // Try to extract duration from title if not already present
    if (duration === undefined) {
        const titleDurationMatch = extractedTitle.match(dRe);
        if (titleDurationMatch) {
          duration = parseInt(titleDurationMatch[1], 10);
        }
    }
    
    return {
      content: extractedContent,
      title: extractedTitle,
      studentsOutput: "", 
      duration
    };
  });
};

export const mapLessonPlanToCardData = (
  plan: LessonPlan, 
  grade: BaseCardProps['grade'] = 'primary',
  gradeLabel: string = 'General',
  locale: string = 'zh'
): CardData => {
  if (!plan) {
    throw new Error('LessonPlan data is null or undefined');
  }

  // Handle Title
  let finalTitle = locale === 'en' ? plan.title_en : plan.title_zh;
  
  // Fallback to old field or other language if missing
   if (!finalTitle) {
       finalTitle = (plan as any).title || (locale === 'en' ? plan.title_zh : plan.title_en);
       
       if (!finalTitle) {
           finalTitle = locale === 'en' ? 'Untitled Lesson' : '未命名教案';
       }
   }

  let finalDuration = plan.duration;
  if (typeof finalDuration !== 'number') {
    console.warn('LessonPlan duration is missing, using default.');
    finalDuration = 45;
  }
  
  // Parse procedures
  const parsedProcedures = Array.isArray(plan.procedures) 
    ? parseMarkdownProcedures(plan.procedures, locale)
    : [];

  // Map Teaching Preparation based on locale
  const mappedTeachingPreparation = {
      objectives: locale === 'en' ? plan.teachingPreparation?.objectives_en : plan.teachingPreparation?.objectives_zh,
      keyWords: locale === 'en' ? plan.teachingPreparation?.keyWords_en : plan.teachingPreparation?.keyWords_zh,
      teachingAids: locale === 'en' ? plan.teachingPreparation?.teachingAids_en : plan.teachingPreparation?.teachingAids_zh,
      studentAnalysis: locale === 'en' ? plan.teachingPreparation?.studentAnalysis_en : plan.teachingPreparation?.studentAnalysis_zh,
      sentenceStructures: locale === 'en' ? plan.teachingPreparation?.sentenceStructures_en : plan.teachingPreparation?.sentenceStructures_zh,
      // Keep other fields if they are common or fallback
      ...plan.teachingPreparation
  };
  
  // Fallbacks for Teaching Preparation (if array is empty or undefined)
  if (!mappedTeachingPreparation.objectives || mappedTeachingPreparation.objectives.length === 0) {
      mappedTeachingPreparation.objectives = (plan.teachingPreparation as any)?.objectives || [];
  }
  if (!mappedTeachingPreparation.keyWords || mappedTeachingPreparation.keyWords.length === 0) {
      mappedTeachingPreparation.keyWords = (plan.teachingPreparation as any)?.keyWords || [];
  }
  if (locale === 'zh') {
      const zh = plan.teachingPreparation?.keyWords_zh;
      const en = plan.teachingPreparation?.keyWords_en;
      const zhList = Array.isArray(zh) ? zh : zh ? [zh] : [];
      const enList = Array.isArray(en) ? en : en ? [en] : [];
      const maxLength = Math.max(zhList.length, enList.length);
      if (maxLength) {
          const pairs: string[] = [];
          for (let i = 0; i < maxLength; i++) {
              const enWord = enList[i] || '';
              const zhWord = zhList[i] || '';
              if (enWord && zhWord) {
                  pairs.push(`${enWord} (${zhWord})`);
              } else if (enWord) {
                  pairs.push(enWord);
              } else if (zhWord) {
                  pairs.push(zhWord);
              }
          }
          mappedTeachingPreparation.keyWords = pairs;
      }
  }
   if (!mappedTeachingPreparation.teachingAids) {
      mappedTeachingPreparation.teachingAids = (plan.teachingPreparation as any)?.teachingAids || '';
  }
   if (!mappedTeachingPreparation.studentAnalysis) {
      mappedTeachingPreparation.studentAnalysis = (plan.teachingPreparation as any)?.studentAnalysis || '';
  }
   if (!mappedTeachingPreparation.sentenceStructures || mappedTeachingPreparation.sentenceStructures.length === 0) {
      mappedTeachingPreparation.sentenceStructures = (plan.teachingPreparation as any)?.sentenceStructures || [];
  }


  return {
    title: formatTitle(finalTitle, plan.grade),
    duration: finalDuration,
    grade: grade,
    gradeLabel: gradeLabel,
    procedures: parsedProcedures,
    teachingPreparation: mappedTeachingPreparation
  };
};
