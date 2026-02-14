import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { 
  setAIPaperTheme, 
  setAIPaperSpecialTopic, 
  setAIPaperStage, 
  setAIPaperQuestionConfig,
  updateQuestionConfigItem,
  setAIPaperSelectedTemplate,
  setAIPaperType,
  setAIPaperExamScope,
  setListeningOrder,
  setWritingOrder,
  updateGeneratedPaperQuestion,
  updateGeneratedPaperQuestionOption,
  generateAIPaperThunk,
  LISTENING_QUESTIONS,
  WRITING_QUESTIONS,
  QuestionConfigItem
} from '../store/slices/lessonSlice';
import { useTranslation } from '../hooks/useTranslation';
import { downloadService } from '../services/downloadService';
import { Spinner } from '@/components/common/Spinner';
import { InputLabel } from '@/components/common/InputLabel';
import { AIPaper } from '../services/geminiService';

// --- Constants ---
const QUESTION_TITLES: Record<string, { en: string; zh: string; suffix?: string }> = {
  // Listening
  '图片排序': { en: 'Listen and Choose', zh: '听录音，给你所听到的图片排序，每题读两遍。' },
  '同类词选择': { en: 'Listen and Choose', zh: '听录音，选出你所听到的单词，每题读两遍。' },
  '听音选图': { en: 'Listen and Choose', zh: '听录音，选出你所听到的图片，每题读两遍。' },
  '听问句选答语': { en: 'Listen and Choose', zh: '听录音，选出最合适的应答语，每题读两遍。' },
  '短对话判断': { en: 'Listen and Judge', zh: '听录音，判断正误，对的写“T”，不对的写“F”，每题读两遍。' },
  '短对话选择': { en: 'Listen and Choose', zh: '听录音，选出最佳答案，每题读两遍。' },
  '长对话选择': { en: 'Listen and Choose', zh: '听录音，选出最佳答案，每题读两遍。' },
  '听短文选择': { en: 'Listen and Choose', zh: '听短文，选出最佳答案，短文读两遍。' },
  '听短文判断': { en: 'Listen and Judge', zh: '听短文，判断正误，对的写“T”，不对的写“F”，短文读两遍。' },
  
  // Writing
  '单项选择': { en: 'Choose the best answers.', zh: '单项选择。' },
  '不同类单词': { en: 'Choose the odd one out.', zh: '选出不同类的单词。' },
  '连词成句': { en: 'Reorder the words to make sentences.', zh: '连词成句。' },
  '句型转换': { en: 'Rewrite the sentences.', zh: '句型转换。' },
  '补全句子': { en: 'Complete the sentences.', zh: '补全句子。' },
  '完形填空': { en: 'Cloze.', zh: '完形填空。' },
  '首字母填词': { en: 'Fill in the blanks with the first letters.', zh: '首字母填空。' },
  '选词填空': { en: 'Select words to fill in the blanks.', zh: '选词填空。' },
  '阅读理解': { en: 'Reading Comprehension.', zh: '阅读理解。' },
  '看图写词': { en: 'Look and write.', zh: '看图写单词。' },
  '翻译句子': { en: 'Translate the sentences.', zh: '句子翻译。' },
  '书面表达': { en: 'Composition.', zh: '书面表达。' },
  '适当形式填词': { en: 'Fill in the blanks with the proper forms.', zh: '用单词的适当形式填空。' },
  '根据图片选词': { en: 'Look and choose.', zh: '看图选词。' },
  '仿写句子': { en: 'Write sentences.', zh: '仿写句子。' },
};

// --- Paper Renderer Component ---
const PaperRenderer: React.FC<{ paper: AIPaper; template: string; isMock?: boolean; isPreview?: boolean; displayTitle?: string; grade?: string; paperType?: string; isEditing?: boolean; dispatch?: any; questionConfig?: Record<string, QuestionConfigItem> }> = ({ paper, template, isMock = false, isPreview = false, displayTitle, grade = '6', paperType = 'final', isEditing = false, dispatch, questionConfig }) => {
  const { t } = useTranslation();
  
  // Dynamic Page Count Logic
  const [totalPages, setTotalPages] = useState(1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Grade Conversion Logic
  const chineseGrade = useMemo(() => {
    const num = grade.replace(/[^0-9]/g, '');
    const map: Record<string, string> = { '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六', '7': '七', '8': '八', '9': '九', '10': '十', '11': '十一', '12': '十二' };
    return map[num] || '六';
  }, [grade]);

  // Semester Logic
  const semester = useMemo(() => {
    if (grade.includes('上')) return t('semester_1');
    if (grade.includes('下')) return t('semester_2');
    return t('semester_1'); // Default to First Semester
  }, [grade, t]);

  // Dynamic Title Logic
  const headerTitle = useMemo(() => {
    // Parse theme components from displayTitle
    let loc = '';
    let scp = '';
    let start = '';
    let end = '';

    if (displayTitle) {
      // Support both "学年" and "学年度" and handle empty years
      // Format from updateTheme: `${loc}${scp}${start}-${end}学年`
      const match = displayTitle.match(/^(.*?)(市|区)(.*)-(.*)学年度?/);
      if (match) {
        loc = match[1] || '';
        scp = match[2] || '';
        start = match[3] || '';
        end = match[4] || '';
      }
    }
    
    // Build title only with available components
    let titleParts: string[] = [];
    
    // Add location + scope if location exists
    if (loc.trim()) {
      titleParts.push(`${loc}${scp}`);
    }
    
    // Add year range if both years exist
    if (start.trim() && end.trim()) {
      titleParts.push(`${start}-${end}学年`);
    }
    
    // Add semester and exam type
    let typeStr = '';
    if (paperType === 'midterm') typeStr = '期中';
    else if (paperType === 'final') typeStr = '期末';
    else if (paperType === 'monitor') typeStr = '';
    
    if (semester || typeStr) {
      titleParts.push(`${semester}${typeStr}质量监测`);
    }
    
    // If no valid parts, return default based on paper type
    if (titleParts.length === 0) {
      // Fallback: just show semester + type, avoid placeholders
      return `${semester}质量监测`;
    }
    
    return titleParts.join('');
  }, [displayTitle, semester, paperType, t]);

  useEffect(() => {
    if (containerRef.current) {
      const contentHeight = containerRef.current.scrollHeight;
      const pageHeight = 1123; 
      const pages = Math.max(1, Math.ceil(contentHeight / pageHeight));
      setTotalPages(pages);
    }
  }, [paper, template, isMock, displayTitle]);

  // Common Styles
  const baseStyle = "w-full min-h-[1123px] bg-white p-12 shadow-sm relative text-black print:shadow-none mx-auto";
  
  // Template Specific Styles
  const getTemplateStyles = () => {
    switch (template) {
      case 'primary_a3': // Primary School A3 Monitoring Template
        return {
          container: "exam-page w-[210mm] min-h-[297mm] bg-white relative mx-auto text-black font-[SimSun] overflow-hidden", 
          inner: "w-full h-full pl-[25mm] pr-[10mm] pt-[6mm] pb-[15mm] relative", // Left padding accommodates sealed line
          title: "text-center font-bold mb-1 tracking-widest shrink-0",
          meta: "text-center text-sm mb-6 border-b-2 border-black pb-2 shrink-0 font-[SimSun]",
          body: "text-sm leading-relaxed",
          sectionTitle: "font-bold text-lg my-[1.5mm] flex items-center justify-center font-[SimSun]",
          question: "mb-4",
          sealedLine: true,
          footer: false,
          isPrimaryA3: true,
          headerInfo: true
        };
      case 'haidian': // Senior High (Template C - Professional Black)
        return {
          container: `${baseStyle} max-w-[900px] font-serif`,
          title: "text-center text-2xl font-bold font-[SimSun] mb-2",
          meta: "text-center text-sm mb-8 border-b-2 border-black pb-4",
          body: "column-count-2 column-gap-8 text-justify text-sm leading-relaxed",
          sectionTitle: "font-bold text-base mb-2 mt-4 bg-gray-100 px-2 py-1 block break-after-avoid",
          question: "mb-4 break-inside-avoid",
          sealedLine: true,
          footer: true
        };
      case 'zhongkao': // Junior High (Template B - Simple Gray)
        return {
          container: `${baseStyle} max-w-[800px] font-serif`,
          title: "text-center text-2xl font-bold font-[SimSun] mb-6",
          meta: "text-center mb-6 border-b border-gray-400 pb-4 flex justify-center gap-8 text-sm",
          body: "text-base leading-relaxed", // Single column
          sectionTitle: "font-bold text-lg mb-3 mt-6 border-l-4 border-gray-600 pl-3",
          question: "mb-6 break-inside-avoid",
          sealedLine: false,
          footer: false,
          headerInfo: true
        };
      case 'simple': // Primary School (Template A - Blue/Lively)
      default:
        return {
          container: `${baseStyle} max-w-[800px] font-sans`,
          title: "text-center text-3xl font-bold font-[KaiTi] text-[#4257B2] mb-4",
          meta: "text-center text-lg mb-8 text-gray-500",
          body: "text-lg leading-[1.8]",
          sectionTitle: "font-bold text-xl mb-4 mt-8 text-[#4257B2] flex items-center gap-2",
          question: "mb-8 break-inside-avoid bg-blue-50/30 p-4 rounded-xl",
          sealedLine: false,
          footer: false,
          isPrimary: true
        };
    }
  };

  const styles: any = getTemplateStyles();

  const bodyStyle: React.CSSProperties =
    template === 'haidian'
      ? { columnCount: 2, columnGap: '2rem', columnRule: '1px solid #e5e7eb' }
      : {};

  const containerStyle: React.CSSProperties =
    template === 'primary_a3'
      ? { 
          width: '210mm', 
          minHeight: '297mm',
          backgroundColor: '#fff', 
          padding: 0,
          margin: '0 auto',
        }
      : {};

  // Helper for Chinese Numbers
  const toChineseNum = (num: number) => {
    const map = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
    return map[num] || num.toString();
  };

  // Group and Sort Sections
  const listeningSections = paper.sections.filter(s => s.type === 'listening');
  const writingSections = paper.sections.filter(s => s.type === 'writing');

  // Global Small Question Counter
  let globalQuestionIndex = 0;

  // Helper: Render Questions based on Type
  const renderQuestions = (section: any) => {
    const qTypeMatch = Object.keys(QUESTION_TITLES).find(k => section.title.includes(k));

    // 1. Grid Layout (Sequencing / Look & Write)
    if (qTypeMatch === '图片排序' || qTypeMatch === '看图写词') {
      return (
        <div className="mt-4 px-2 font-[Arial]">
          {qTypeMatch === '图片排序' ? (
            // 图片排序：5个图片框一排，下面有横线和题号
            <div className="flex flex-row justify-between">
              {section.questions.map((q: any, i: number) => {
                globalQuestionIndex++;
                return (
                  <div key={i} className="flex flex-col items-center w-[18%]">
                    {/* Image Box */}
                    <div className="w-full aspect-square border border-black mb-2 relative flex items-center justify-center bg-transparent">
                       {/* Label A-E */}
                       <span className="absolute top-0 right-0 bg-black text-white text-xs px-1 font-[Arial]">
                          {String.fromCharCode(65 + i)}
                       </span>
                    </div>
                    {/* Answer Area with Question Number - 括号内空4字符 */}
                    <div className="w-full text-center">
                       <span className="font-bold mr-1">(&nbsp;&nbsp;&nbsp;&nbsp;){globalQuestionIndex}.</span>
                       <span className="inline-block w-12 border-b border-black"></span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // 看图写词：原有布局
            <div className="flex flex-row justify-between">
              {section.questions.map((q: any, i: number) => {
                globalQuestionIndex++;
                return (
                  <div key={i} className="flex flex-col items-center w-[18%]">
                    {/* Image Box */}
                    <div className="w-full aspect-square border border-black mb-2 relative flex items-center justify-center bg-transparent">
                       <span className="absolute top-0 right-0 bg-black text-white text-xs px-1 font-[Arial]">
                          {String.fromCharCode(65 + i)}
                       </span>
                    </div>
                    {/* Answer Area with 4 Lines */}
                    <div className="w-full h-12 relative flex flex-col justify-between py-1">
                       <div className="w-full border-b border-black opacity-60"></div>
                       <div className="w-full border-b border-pink-400 opacity-60"></div>
                       <div className="w-full border-b border-pink-400 opacity-60"></div>
                       <div className="w-full border-b border-black opacity-60"></div>
                       <span className="absolute left-0 top-1/2 -translate-y-1/2 text-sm font-[Arial] font-bold">(&nbsp;&nbsp;&nbsp;&nbsp;){globalQuestionIndex}.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // 2. Word Bank Fill (Box + Text)
    if (qTypeMatch === '选词填空') {
       const words = ['apple', 'book', 'cat', 'dog', 'egg', 'fish', 'girl']; 
       return (
          <div className="mt-4 px-2 font-[Arial]">
             <div className="border border-black p-3 mb-4 flex flex-wrap gap-4 justify-center text-sm">
                {words.map((w, i) => (
                   <span key={i}><span className="font-bold">{String.fromCharCode(65+i)}.</span> {w}</span>
                ))}
             </div>
             <div className="text-base leading-loose text-justify">
                {section.questions.map((q: any, i: number) => {
                   globalQuestionIndex++;
                   // Replace underscores or just append blank
                   const content = q.content.includes('_') 
                      ? q.content.replace(/_+/g, `____ (&nbsp;&nbsp;&nbsp;&nbsp;)${globalQuestionIndex} ____`) 
                      : `(&nbsp;&nbsp;&nbsp;&nbsp;)${globalQuestionIndex}. ${q.content} ______`;
                   // Clean unwanted text
                   const cleanContent = content.replace(/image\s*options?/gi, '');
                   return (
                      <div key={i} className="mb-2 inline-block mr-4">
                         <span dangerouslySetInnerHTML={{__html: cleanContent}} />
                      </div>
                   );
                })}
             </div>
          </div>
       );
    }

    // 3. Reorder (Lines)
    if (qTypeMatch === '连词成句') {
       return (
          <div className="space-y-6 mt-4 ml-4 font-[Arial]">
             {section.questions.map((q: any, i: number) => {
                globalQuestionIndex++;
                const cleanContent = q.content.replace(/image\s*options?/gi, '');
                return (
                   <div key={i}>
                      <div className="mb-2 text-base">
                         <span className="font-bold mr-2">(&nbsp;&nbsp;&nbsp;&nbsp;){globalQuestionIndex}.</span>
                         {cleanContent}
                      </div>
                      <div className="w-full border-b border-black h-px"></div>
                   </div>
                );
             })}
          </div>
       );
    }

    // 4. Composition (Lines)
    if (qTypeMatch === '书面表达' || section.title.includes('Composition')) {
        return (
            <div className="mt-4 ml-4 font-[Arial]">
                {section.questions.map((q: any, i: number) => {
                    globalQuestionIndex++; 
                    const cleanContent = q.content.replace(/image\s*options?/gi, '');
                    return (
                        <div key={i}>
                            <div className="mb-2 font-bold">{cleanContent}</div>
                            <div className="space-y-3 mt-4">
                                {Array(6).fill(0).map((_, lineIdx) => (
                                    <div key={lineIdx} className="w-full border-b border-black h-px"></div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    // 5. Standard Choice / Judgment / Others
    return (
      <div className="space-y-3 ml-4 mt-2 font-[Arial]">
        {section.questions.map((q: any, i: number) => {
          globalQuestionIndex++;
          return (
            <div key={i} className={styles.question}>
              <div className="flex gap-1 items-start">
                <span className="font-bold min-w-[1.5em] font-[Arial]">(&nbsp;&nbsp;&nbsp;&nbsp;){globalQuestionIndex}.</span>
                <div className="flex-1">
                  <div className="font-[Arial]" dangerouslySetInnerHTML={{__html: q.content.replace(/image\s*options?/gi, '')}} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div id="paper-preview" ref={containerRef} className={styles.container} style={containerStyle}>
          {/* Sealed Line (Senior & Primary A3) */}
      {(styles.sealedLine || styles.isPrimaryA3) && (
        <div className="absolute left-0 top-0 bottom-0 w-[20mm] border-r border-dashed border-black select-none overflow-hidden" style={{ borderRightWidth: '0.5px' }}>
           {template === 'primary_a3' ? (
                 <>
                    <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 transform -rotate-90 whitespace-nowrap text-xs font-[SimSun] tracking-widest origin-center pointer-events-none">
                       {t('paper_info_name')}：________________
                    </div>
                    <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 transform -rotate-90 whitespace-nowrap text-xs font-[SimSun] tracking-widest origin-center pointer-events-none">
                       {t('paper_info_class')}：________________
                    </div>
                    <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 transform -rotate-90 whitespace-nowrap text-xs font-[SimSun] tracking-widest origin-center pointer-events-none">
                       {t('paper_info_id')}：________________
                    </div>
                    <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 -translate-y-1/2 transform -rotate-90 whitespace-nowrap text-xs font-[SimSun] tracking-[4px] font-bold origin-center pointer-events-none">
                       {t('paper_sealed_line_instruction')}
                    </div>
                 </>
              ) : (
             <div className="h-full flex items-center justify-center">
               <div className="transform -rotate-90 whitespace-nowrap text-xs text-gray-500 tracking-[1em] font-bold" style={{ writingMode: 'vertical-rl' }}>
                 {t('paper_sealed_line_text')}
               </div>
             </div>
           )}
        </div>
      )}

      {/* Header Info (Junior & Primary A3) */}
      {styles.headerInfo && (
        <div className={`mb-0 text-center ${template === 'primary_a3' ? 'font-[SimSun]' : 'font-[SongTi]'}`}>
          <div className={`flex justify-between pb-0 mb-0 text-base px-1 ${template !== 'primary_a3' ? 'border-b border-black' : ''}`}>
             {template === 'primary_a3' ? (
               <div className="w-full text-center mt-12 relative left-[8mm]">
                 <h1 className="text-2xl font-bold font-[SimHei] mb-2 tracking-wide leading-tight text-center">
                    {headerTitle}<br/>
                    <span className="text-3xl mt-2 block">{chineseGrade}年级英语试卷</span>
                  </h1>
                 <div className="text-sm font-bold mb-0 mt-8 font-[KaiTi] leading-relaxed mx-auto w-fit text-left">
                      <div className="font-bold mb-1 text-lg text-center">{t('paper_candidate_note_title')}</div>
                      <div>{t('paper_candidate_note_1', { totalPages })}</div>
                      <div>{t('paper_candidate_note_2')}</div>
                      <div>{t('paper_candidate_note_3')}</div>
                   </div>
               </div>
             ) : (
               <>
                 <span>{t('paper_info_district')}：__________</span>
                 <span>{t('paper_info_school')}：__________</span>
                 <span>{t('paper_info_name')}：__________</span>
                 <span>{t('paper_info_id')}：__________</span>
               </>
             )}
          </div>
        </div>
      )}

      <div className={styles.inner || ''}>
        
        {template !== 'primary_a3' && (
           <div
             className={styles.title}
             style={
               template === 'primary_a3'
                 ? { fontFamily: 'FangZhengXiaoBiaoSong, SimHei, sans-serif' }
                 : undefined
             }
           >
             {displayTitle || paper.title}
           </div>
        )}
        
        {template !== 'primary_a3' && (
           <div className={styles.meta}>
             {template === 'primary_a3' ? t('paper_meta_title').replace('学年度', '学年') : `2025-2026${t('paper_title_suffix').replace('学年度', '学年')}`}
           </div>
        )}

        {/* Content Body */}
        <div className={styles.body} style={bodyStyle}>
          
          {/* Part I: Listening */}
          <div className="text-center font-bold text-xl my-4 font-[SimHei] tracking-widest">听力部分</div>

          {listeningSections.map((section, idx) => {
             // Determine Title (Bilingual)
             const qTypeMatch = Object.keys(QUESTION_TITLES).find(k => section.title.includes(k));
             const titleConfig = qTypeMatch ? QUESTION_TITLES[qTypeMatch] : null;
             
             // Calculate Score (Use Config or fallback)
             let scoreNum = 10;
             if (questionConfig && qTypeMatch && questionConfig[qTypeMatch]) {
                 const { count, score } = questionConfig[qTypeMatch];
                 scoreNum = count * score; // Display score per section
             }
             
             const scoreElement = (
               <span className="font-[SimSun]">
                  <span className="font-[Arial] mx-0.5">({scoreNum}</span>分<span className="font-[Arial]">)</span>
               </span>
             );

             return (
              <div key={`listening-${idx}`} className="mb-6 break-inside-avoid">
                <div className="font-bold text-base mb-2">
                  <span className="font-[SimSun]">{toChineseNum(idx + 1)}、</span>
                  <span className="font-[Arial] mr-2">{titleConfig ? (titleConfig.en.endsWith('.') ? titleConfig.en : titleConfig.en + '.') : (section.title.split(' ')[0] || 'Listen.')}</span>
                  <span className="font-[SimSun]">
                    {titleConfig ? titleConfig.zh : section.title}
                    {scoreElement}
                  </span>
                </div>
                
                <div className="space-y-4 ml-2">
                  {section.questions.map((q, qIdx) => {
                    globalQuestionIndex++;
                    const isImageQuestion = q.content.includes('image') || section.title.includes('图片') || section.title.includes('Pictures') || (q.options && q.options.some((o: string) => o.includes('image')));
                    
                    const cleanContent = q.content.replace(/image\s*options?/gi, '');
                    
                    // Logic to Hide Listening Content (Script)
                    const isJudge = section.title.includes('判断') || section.title.includes('True or False') || section.title.includes('Judge');
                    const hasOptions = q.options && q.options.length > 0;
                    const shouldHideContent = !isJudge && (hasOptions || isImageQuestion) && !isMock;

                    return (
                      <div key={qIdx} className={styles.question}>
                        <div className="flex gap-2 items-start">
                          <span className="font-bold min-w-[1.5em] font-[Arial] pt-1">(&nbsp;&nbsp;&nbsp;&nbsp;){globalQuestionIndex}.</span>
                          <div className="flex-1">
                             {isMock ? (
                                <div className="border border-dashed border-gray-300 p-2 text-gray-400 text-sm">{cleanContent}</div>
                             ) : (
                                shouldHideContent ? null : (
                                    <div 
                                      className="font-[Arial] text-base"
                                      dangerouslySetInnerHTML={{__html: cleanContent.replace(/\n/g, '<br/>')}}
                                    />
                                )
                             )}
                          </div>
                        </div>

                        {/* Options */}
                        {q.options && q.options.length > 0 && (
                          <div className="mt-2 ml-8 flex flex-row flex-wrap gap-x-8 gap-y-2 font-[Arial]">
                             {q.options.map((opt, oIdx) => {
                               const label = String.fromCharCode(65 + oIdx);
                               const cleanOpt = opt.replace(/^\s*\(?[A-Z]\)?[\.\s]*/, '').replace(/image\s*options?/gi, '');
                               
                               if (isImageQuestion) {
                                  return (
                                    <div key={oIdx} className="flex items-center gap-2">
                                       <span className="font-bold">{label}.</span>
                                       <div className="w-16 h-16 border border-black rounded-sm bg-transparent"></div>
                                    </div>
                                  );
                               }

                               return (
                                 <div key={oIdx} className="flex items-center gap-2">
                                    <span className="font-bold">{label}.</span>
                                    <span>{cleanOpt}</span>
                                 </div>
                               );
                             })}
                          </div>
                        )}
                        {/* Fallback Image Placeholders if no options but is Image Question */}
                        {(!q.options || q.options.length === 0) && isImageQuestion && (
                            <div className="mt-2 ml-8 flex flex-row flex-wrap gap-x-8 gap-y-2 font-[Arial]">
                               {['A', 'B', 'C'].map((label, oIdx) => (
                                  <div key={oIdx} className="flex items-center gap-2">
                                     <span className="font-bold">{label}.</span>
                                     <div className="w-16 h-16 border border-black rounded-sm bg-transparent"></div>
                                  </div>
                               ))}
                            </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
             );
          })}

          {/* Part II: Writing */}
          <div className="text-center font-bold text-xl my-6 font-[SimHei] tracking-widest">笔试部分</div>

          {writingSections.map((section, idx) => {
             const qTypeMatch = Object.keys(QUESTION_TITLES).find(k => section.title.includes(k));
             const titleConfig = qTypeMatch ? QUESTION_TITLES[qTypeMatch] : null;
             
             let scoreNum = 10;
             if (questionConfig && qTypeMatch && questionConfig[qTypeMatch]) {
                 const { count, score } = questionConfig[qTypeMatch];
                 scoreNum = count * score; // Display score per section
             }
             
             const scoreElement = (
               <span className="font-[SimSun]">
                  <span className="font-[Arial] mx-0.5">({scoreNum}</span>分<span className="font-[Arial]">)</span>
               </span>
             );

             return (
              <div key={`writing-${idx}`} className="mb-6 break-inside-avoid">
                <div className="font-bold text-base mb-2">
                  <span className="font-[SimSun]">{toChineseNum(listeningSections.length + idx + 1)}、</span>
                  <span className="font-[Arial] mr-2">{titleConfig ? (titleConfig.en.endsWith('.') ? titleConfig.en : titleConfig.en + '.') : section.title}</span>
                  <span className="font-[SimSun]">
                    {titleConfig ? titleConfig.zh : section.title}
                    {scoreElement}
                  </span>
                </div>
                
                <div className="space-y-4 ml-2">
                  {section.questions.map((q, qIdx) => {
                    globalQuestionIndex++;
                    const isComposition = section.title.includes('书面表达') || section.title.includes('Composition');
                    const isImageQuestion = q.content.includes('image') || section.title.includes('图片') || section.title.includes('Pictures') || (q.options && q.options.some((o: string) => o.includes('image')));
                    
                    const cleanContent = q.content.replace(/image\s*options?/gi, '');

                    return (
                      <div key={qIdx} className={styles.question}>
                        <div className="flex gap-2 items-start">
                          <span className="font-bold min-w-[1.5em] font-[Arial] pt-1">(&nbsp;&nbsp;&nbsp;&nbsp;){globalQuestionIndex}.</span>
                          <div className="flex-1">
                             {isMock ? (
                                <div className="border border-dashed border-gray-300 p-2 text-gray-400 text-sm">{cleanContent}</div>
                             ) : (
                                <div 
                                  className="font-[Arial] text-base"
                                  dangerouslySetInnerHTML={{__html: cleanContent.replace(/\n/g, '<br/>')}}
                                />
                             )}
                             
                             {/* Composition Lines */}
                             {isComposition && (
                                <div className="mt-4 space-y-3">
                                   {Array(6).fill(0).map((_, i) => (
                                     <div key={i} className="w-full border-b border-black h-1"></div>
                                   ))}
                                </div>
                             )}
                          </div>
                        </div>

                        {/* Options */}
                        {q.options && q.options.length > 0 && !isComposition && (
                          <div className="mt-2 ml-8 flex flex-row flex-wrap gap-x-8 gap-y-2 font-[Arial]">
                             {q.options.map((opt, oIdx) => {
                               const label = String.fromCharCode(65 + oIdx);
                               const cleanOpt = opt.replace(/^\s*\(?[A-Z]\)?[\.\s]*/, '').replace(/image\s*options?/gi, '');
                               
                               if (isImageQuestion) {
                                  return (
                                    <div key={oIdx} className="flex items-center gap-2">
                                       <span className="font-bold">{label}.</span>
                                       <div className="w-16 h-16 border border-black rounded-sm bg-transparent"></div>
                                    </div>
                                  );
                               }

                               return (
                                 <div key={oIdx} className="flex items-center gap-2">
                                    <span className="font-bold">{label}.</span>
                                    <span>{cleanOpt}</span>
                                 </div>
                               );
                             })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
             );
          })}
        </div>

          {/* Appendix: Listening Materials & Answer Key */}
          {!isMock && (
            <div className="break-before-page mt-12 pt-8 border-t-2 border-dashed border-gray-300 font-[SongTi]" style={{ pageBreakBefore: 'always' }}>
                <h1 className="text-center text-xl font-bold mb-8 font-[SimHei]">听力材料及参考答案</h1>
                
                {/* Listening Scripts */}
                {listeningSections.length > 0 && (
                  <div className="mb-8">
                    <h2 className="font-bold text-lg mb-4 border-l-4 border-black pl-2">一、听力材料</h2>
                    {listeningSections.map((section, i) => (
                       <div key={i} className="mb-4">
                          <div className="font-bold mb-2 font-[SimHei]">{toChineseNum(i+1)}、{section.title}</div>
                          {section.questions.map((q, j) => {
                             const cleanContent = q.content.replace(/image\s*options?/gi, '');
                             return (
                               <div key={j} className="mb-1 text-sm pl-4">
                                  <span className="font-bold mr-2 font-[Arial]">{j+1}.</span>
                                  <span dangerouslySetInnerHTML={{__html: cleanContent}} />
                               </div>
                             );
                          })}
                       </div>
                    ))}
                  </div>
                )}

                {/* Answer Key */}
                <div className="mb-8">
                   <h2 className="font-bold text-lg mb-4 border-l-4 border-black pl-2">二、参考答案</h2>
                   <div className="grid grid-cols-5 gap-4">
                      {[...listeningSections, ...writingSections].map((section, i) => (
                         <div key={i} className="mb-2">
                            <div className="font-bold text-sm mb-1 font-[SimHei]">{toChineseNum(i+1)}、{section.title.split(' ')[0]}</div>
                            <div className="text-sm pl-2 font-[Arial]">
                               {section.questions.map((q, j) => (
                                  <span key={j} className="mr-2">{j+1}. {q.answer || (q.options ? String.fromCharCode(65 + (Math.floor(Math.random() * q.options.length))) : 'T')}</span>
                               ))}
                            </div>
                         </div>
                      ))}
                   </div>
                </div>

                {/* Analysis */}
                <div>
                   <h2 className="font-bold text-lg mb-4 border-l-4 border-black pl-2">三、解析</h2>
                   <div className="space-y-4">
                      {[...listeningSections, ...writingSections].map((section, i) => (
                         <div key={i} className="mb-4">
                            <div className="font-bold text-sm mb-2 font-[SimHei]">{toChineseNum(i+1)}、{section.title.split(' ')[0]}</div>
                            <div className="text-sm pl-2 font-[Arial] space-y-1">
                               {section.questions.map((q, j) => (
                                  <div key={j} className="mb-1">
                                     <span className="font-bold mr-1">{j+1}.</span>
                                     <span className="text-gray-700">{q.analysis || '略'}</span>
                                  </div>
                               ))}
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
            </div>
          )}

        {/* Footer for A3 Vertical */}
        {styles.isPrimaryA3 && (
           <div className="absolute bottom-6 left-0 right-0 text-center text-xs font-[SimSun] pointer-events-none">
             {t('paper_page_footer', { current: 1, total: totalPages })}
           </div>
        )}

        {/* Footer (Senior Only) */}
        {styles.footer && (
          <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-gray-500 export-footer">
            {t('paper_footer_page')}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Helper Components & Constants ---

// 1. Presets Definition
interface PresetConfig {
  label: string;
  config: Partial<Record<string, { count: number; score: number; selected: boolean; sectionCount?: number }>>;
}

const PRESETS: Record<string, PresetConfig> = {
  'final': {
    label: '试卷型',
    config: {
      // 听力
      '图片排序': { count: 5, score: 1, selected: true },
      '长对话选择': { count: 5, score: 1, selected: true },
      '短对话判断': { count: 5, score: 1, selected: true },
      '听短文选择': { count: 5, score: 2, selected: true },
      // 笔试
      '单项选择': { count: 10, score: 1, selected: true },
      '选词填空': { count: 5, score: 2, selected: true },
      '阅读理解': { count: 5, score: 2, selected: true },
      '书面表达': { count: 1, score: 10, selected: true },
    }
  },
  'quiz': {
    label: '专项型',
    config: {
      '选词填空': { count: 5, score: 2, selected: true },
      '完形填空': { count: 10, score: 1, selected: true },
      '连词成句': { count: 5, score: 2, selected: true },
    }
  },
  'basic': {
    label: '进出门测',
    config: {
      '听音选图': { count: 5, score: 1, selected: true },
      '听短文选择': { count: 5, score: 2, selected: true },
      '单项选择': { count: 5, score: 1, selected: true },
      '阅读理解': { count: 5, score: 2, selected: true },
      '书面表达': { count: 1, score: 10, selected: true },
    }
  }
};

// 2. Config Popover (Reused & Simplified)
const ConfigPopover = ({ config, dispatch, qKey, onClose, anchorRect }: { config: QuestionConfigItem, dispatch: any, qKey: string, onClose: () => void, anchorRect?: DOMRect }) => {
  const [position, setPosition] = React.useState<{top: number, left: number}>({ top: 0, left: 0 });

  React.useLayoutEffect(() => {
    if (anchorRect) {
      // Calculate position: default to bottom-center of anchor, shift if overflowing
      const popoverWidth = 220; // Approx width
      const popoverHeight = 140; // Approx height
      let top = anchorRect.bottom + 8;
      let left = anchorRect.left + (anchorRect.width / 2) - (popoverWidth / 2);

      // Boundary checks
      if (left < 10) left = 10;
      if (left + popoverWidth > window.innerWidth - 10) left = window.innerWidth - popoverWidth - 10;
      if (top + popoverHeight > window.innerHeight - 10) top = anchorRect.top - popoverHeight - 8; // Flip to top if bottom overflows

      setPosition({ top, left });
    }
  }, [anchorRect]);

  return createPortal(
    <div 
      className="fixed z-[9999] w-56 p-4 rounded-xl animate-in fade-in zoom-in duration-200 flex flex-col gap-4"
      style={{ 
        top: anchorRect ? position.top : '50%', 
        left: anchorRect ? position.left : '50%', 
        transform: anchorRect ? 'none' : 'translate(-50%, -50%)',
        backgroundColor: 'var(--container-bg)', 
        border: '1px solid var(--input-border)',
        boxShadow: 'var(--input-glow)',
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* Count Control */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold w-8" style={{ color: 'var(--text-secondary)' }}>数量</span>
        <div className="flex-1 flex items-center gap-3">
           <input 
            type="range" 
            min="1" 
            max="20" 
            step="1"
            value={config.count}
            onChange={(e) => dispatch(updateQuestionConfigItem({ key: qKey, changes: { count: parseInt(e.target.value) } }))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer transition-all"
            style={{
              backgroundColor: 'var(--border-color)', // Track color
              accentColor: 'var(--primary-color)' // Fallback
            }}
          />
          {/* Custom style for slider thumb is tricky inline, keeping simple accent-color or relying on global CSS if possible. 
              But to be safe and match user request, I'll use a style block or just accentColor which works in modern browsers. 
              The previous code used tailwind [&::-webkit-slider-thumb]. I will use accentColor and standard appearance.
          */}
          <style dangerouslySetInnerHTML={{__html: `
            input[type=range]::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: var(--primary-color);
              cursor: pointer;
              margin-top: -5px; /* Adjust for track height if needed, but appearance-none resets it */
            }
            input[type=range]::-webkit-slider-runnable-track {
              height: 6px;
              background: var(--border-color);
              border-radius: 3px;
            }
          `}} />
          <span className="text-sm font-bold min-w-[20px] text-right" style={{ color: 'var(--primary-color)' }}>{config.count}</span>
        </div>
      </div>
      
      {/* Score Control */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold w-8" style={{ color: 'var(--text-secondary)' }}>分值</span>
        <div className="flex-1 flex gap-2">
          {[1, 2].map(score => (
            <button
              key={score}
              onClick={() => dispatch(updateQuestionConfigItem({ key: qKey, changes: { score: score } }))}
              className="flex-1 h-7 text-xs font-bold rounded-lg transition-all border"
              style={config.score === score ? {
                backgroundColor: 'var(--primary-color)',
                borderColor: 'var(--primary-color)',
                color: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              } : {
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)'
              }}
            >
              {score}
            </button>
          ))}
          <button
            onClick={onClose}
            className="flex-1 h-7 text-xs font-bold rounded-lg transition-all border"
            style={{
              backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
              borderColor: 'rgba(var(--primary-rgb), 0.2)',
              color: 'var(--primary-color)'
            }}
          >
            确定
          </button>
        </div>
      </div>

      {/* Close Overlay */}
      <div className="fixed inset-0 z-[-1]" onClick={onClose}></div>
    </div>,
    document.body
  );
};

// 3. Question Row (Compact)
const QuestionRow = ({ qKey, config, dispatch, activePopover, setActivePopover }: { qKey: string, config: QuestionConfigItem, dispatch: any, activePopover: { key: string, rect: DOMRect } | null, setActivePopover: (state: { key: string, rect: DOMRect } | null) => void }) => {
  const isPopoverOpen = activePopover?.key === qKey;
  const sectionCount = config.sectionCount || 1;

  const handleStatsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isPopoverOpen) {
      setActivePopover(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setActivePopover({ key: qKey, rect });
    }
  };

  return (
    <div className="group flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-gray-100">
      {/* Left: Checkbox (Remove) & Name */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => dispatch(updateQuestionConfigItem({ key: qKey, changes: { selected: false } }))}
          className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          title="移除"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{qKey}</span>
          
          {/* Multiplier Controls (Plus/Minus) - Visible on Hover */}
          <div className="hidden group-hover:flex items-center gap-1 ml-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-0.5 border border-gray-200 dark:border-gray-700 shadow-sm">
             <button
               onClick={(e) => {
                  e.stopPropagation();
                  if (sectionCount > 1) {
                    dispatch(updateQuestionConfigItem({ key: qKey, changes: { sectionCount: sectionCount - 1 } }));
                  }
               }}
               className="w-5 h-5 flex items-center justify-center rounded hover:bg-white dark:hover:bg-gray-700 text-gray-500 hover:text-red-500 transition-colors"
               title="减少题量"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                 <line x1="5" y1="12" x2="19" y2="12"></line>
               </svg>
             </button>
             
             <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 min-w-[1.2em] text-center select-none">
               {sectionCount > 1 ? `×${sectionCount}` : '×1'}
             </span>

             <button
               onClick={(e) => {
                  e.stopPropagation();
                  dispatch(updateQuestionConfigItem({ key: qKey, changes: { sectionCount: sectionCount + 1 } }));
               }}
               className="w-5 h-5 flex items-center justify-center rounded hover:bg-white dark:hover:bg-gray-700 text-gray-500 hover:text-green-500 transition-colors"
               title="增加题量"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                 <line x1="12" y1="5" x2="12" y2="19"></line>
                 <line x1="5" y1="12" x2="19" y2="12"></line>
               </svg>
             </button>
          </div>

          {/* Static Indicator (Hidden on Hover, only show if > 1) */}
          {sectionCount > 1 && (
             <span className="group-hover:hidden ml-1 text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-md">×{sectionCount}</span>
          )}
        </div>
      </div>

      {/* Right: Controls & Stats */}
      <div className="flex items-center gap-3">
        {/* Section Count Controls Removed per Compact UI rule */}

        {/* Stats (Click to Edit) */}
        <div className="relative">
          <button
            onClick={handleStatsClick}
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${isPopoverOpen ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600'}`}
          >
            {config.count}题 / {config.score}pt
          </button>
          {isPopoverOpen && (
            <ConfigPopover config={config} dispatch={dispatch} qKey={qKey} onClose={() => setActivePopover(null)} anchorRect={activePopover.rect} />
          )}
        </div>
      </div>
    </div>
  );
};

// 4. Drawer Item
const DrawerItem = ({ qKey, onAdd }: { qKey: string, onAdd: () => void }) => (
  <button 
    onClick={onAdd}
    className="w-full flex items-center justify-between p-2 hover:bg-indigo-50 dark:hover:bg-white/5 rounded-lg group transition-all border border-transparent hover:border-indigo-100"
  >
    <span className="text-xs text-gray-600 dark:text-gray-300">{qKey}</span>
    <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </div>
  </button>
);

export const AIPaperGenerator: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<any>();
  const { 
    theme, 
    specialTopic, 
    stage, 
    paperType,
    examScope,
    questionConfig, 
    generatedPaper, 
    isLoading, 
    selectedTemplate,
    listeningOrder,
    writingOrder
  } = useSelector((state: RootState) => state.lesson.aiPaper);

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('basic');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activePopover, setActivePopover] = useState<{ key: string, rect: DOMRect } | null>(null);
  const [grade, setGrade] = useState('3上');
  const [isEditing, setIsEditing] = useState(false);
  // const [examScope, setExamScope] = useState(''); // Moved to Redux
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState<{ key: string, type: 'listening' | 'writing' } | null>(null);

  const handleQuestionDragStart = (e: React.DragEvent, key: string, type: 'listening' | 'writing') => {
    setDraggedItem({ key, type });
    e.dataTransfer.effectAllowed = 'move';
    // Optional: Set ghost image or data
    e.dataTransfer.setData('text/plain', key);
  };

  const handleQuestionDragOver = (e: React.DragEvent, targetKey: string, type: 'listening' | 'writing') => {
    e.preventDefault();
    if (!draggedItem || draggedItem.type !== type || draggedItem.key === targetKey) return;
    e.dataTransfer.dropEffect = 'move';
  };

  const handleQuestionDrop = (e: React.DragEvent, targetKey: string, type: 'listening' | 'writing') => {
    e.preventDefault();
    if (!draggedItem || draggedItem.type !== type || draggedItem.key === targetKey) {
      setDraggedItem(null);
      return;
    }

    const currentOrder = type === 'listening' ? listeningOrder : writingOrder;
    const newOrder = [...currentOrder];
    const fromIndex = newOrder.indexOf(draggedItem.key);
    const toIndex = newOrder.indexOf(targetKey);

    if (fromIndex !== -1 && toIndex !== -1) {
      newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, draggedItem.key);
      
      if (type === 'listening') {
        dispatch(setListeningOrder(newOrder));
      } else {
        dispatch(setWritingOrder(newOrder));
      }
    }
    setDraggedItem(null);
  };

  // Handle Preset Selection
  const handlePresetSelect = (presetKey: string) => {
    setActivePreset(presetKey);
    const preset = PRESETS[presetKey];
    if (preset) {
      const newConfig: Record<string, QuestionConfigItem> = {};
      [...LISTENING_QUESTIONS, ...WRITING_QUESTIONS].forEach(key => {
        const presetItem = preset.config[key];
        if (presetItem) {
           newConfig[key] = { ...presetItem };
        } else {
           // Reset to default if not in preset
           newConfig[key] = { count: 5, score: 1, selected: false };
        }
      });
      dispatch(setAIPaperQuestionConfig(newConfig));
    }
  };

  // Score Calculation
  const listeningScore = useMemo(() => {
    return LISTENING_QUESTIONS.reduce((acc, key) => {
      const config = questionConfig[key];
      return acc + (config?.selected ? config.count * config.score * (config.sectionCount || 1) : 0);
    }, 0);
  }, [questionConfig]);

  const writingScore = useMemo(() => {
    return WRITING_QUESTIONS.reduce((acc, key) => {
      const config = questionConfig[key];
      return acc + (config?.selected ? config.count * config.score * (config.sectionCount || 1) : 0);
    }, 0);
  }, [questionConfig]);

  const totalScore = listeningScore + writingScore;

  // Theme Composition State
  const [themeLocation, setThemeLocation] = useState('');
  const [themeScope, setThemeScope] = useState('区');
  const [themeYearStart, setThemeYearStart] = useState('');
  const [themeYearEnd, setThemeYearEnd] = useState('');

  // Initialize local state from Redux theme if applicable
  useEffect(() => {
    if (theme) {
       const match = theme.match(/^(.*)(市|区)(\d{4})-(\d{4})学年度?/);
       if (match) {
          setThemeLocation(match[1]);
          setThemeScope(match[2]);
          setThemeYearStart(match[3]);
          setThemeYearEnd(match[4]);
       }
    }
  }, []);

  const updateTheme = (loc: string, scp: string, start: string, end: string) => {
    const newTheme = `${loc}${scp}${start}-${end}学年`;
    dispatch(setAIPaperTheme(newTheme));
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  // Handle File Upload (PDF/Word/Text)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  // Handle Camera/Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const processFiles = (files: FileList) => {
    setIsAnalyzing(true);
    // Simulate processing time
    setTimeout(() => {
      const fileNames = Array.from(files).map(f => f.name).join(', ');
      // For text files, we could read content. For now, we append file names as reference.
      // If it's a text file, try to read it
      const txtFile = Array.from(files).find(f => f.type === 'text/plain');
      if (txtFile) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          const newContent = `${examScope || ''}\n\n[已读取文本: ${txtFile.name}]\n${content.substring(0, 200)}...`;
          dispatch(setAIPaperExamScope(newContent));
          setIsAnalyzing(false);
        };
        reader.readAsText(txtFile);
      } else {
        const newContent = `${examScope || ''}\n\n[已上传附件: ${fileNames}]`;
        dispatch(setAIPaperExamScope(newContent));
        setIsAnalyzing(false);
      }
    }, 1000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Scope Tags Map
  const scopeTagsMap: Record<string, string[]> = {
    '3上': ['字母', '颜色', '数字', '文具'],
    '3下': ['动物', '水果', '家庭', '身体部位'],
    '4上': ['教室', '职业', '食物', '蔬菜'],
    '4下': ['天气', '时间', '衣服', '农场'],
    '5上': ['周末活动', '饮食习惯', '能力', '自然公园'],
    '5下': ['季节', '现在进行时', '节日', '顺序'],
    '6上': ['交通方式', '地点', '计划', '爱好'],
    '6下': ['过去式', '比较级', '环境与自然', '职业与梦想'],
    '7': ['一般现在时', '日常习惯', '问路', '邀请'],
    '8': ['现在完成时', '旅行经历', '友谊', '建议'],
    '9': ['被动语态', '定语从句', '科技', '文化交流'],
    'default': ['词汇', '语法', '阅读', '写作']
  };

  // Mock Paper Generation Logic
  const mockPaper = useMemo(() => {
    // Only generate mock for A3 Monitor template or similar
    if (selectedTemplate === 'primary_a3' || paperType === 'monitor' || paperType.includes('xiaoshengchu')) {
       return {
         title: "2024-2025学年度第一学期英语学业水平监测",
         sections: [
           {
             title: "图片排序",
             type: "listening",
             instructions: "Listen and number.",
             questions: Array(5).fill(0).map((_, i) => ({ 
               id: `${i+1}`, 
               content: `Image ${i+1}`, 
               options: [] 
             }))
           },
           {
             title: "听音选图",
             type: "listening",
             instructions: "Listen and choose.",
             questions: Array(5).fill(0).map((_, i) => ({ 
               id: `${i+6}`, 
               content: `Question ${i+6}`, 
               options: ['A', 'B', 'C']
             }))
           },
           {
             title: "短对话判断",
             type: "listening",
             instructions: "True or False.",
             questions: Array(5).fill(0).map((_, i) => ({ 
               id: `${i+11}`, 
               content: `Statement ${i+11}: Tom is a boy.`, 
               options: []
             }))
           },
           {
             title: "不同类单词",
             type: "writing",
             instructions: "Choose the odd one out.",
             questions: Array(5).fill(0).map((_, i) => ({ 
               id: `${i+16}`, 
               content: ``, 
               options: ['apple', 'banana', 'car'] 
             }))
           },
           {
             title: "连词成句",
             type: "writing",
             instructions: "Reorder words.",
             questions: Array(2).fill(0).map((_, i) => ({ 
               id: `${i+21}`, 
               content: `is, my, This, book`, 
               options: [] 
             }))
           },
           {
             title: "选词填空",
             type: "writing",
             instructions: "Select words.",
             questions: Array(5).fill(0).map((_, i) => ({ 
               id: `${i+23}`, 
               content: `I like ____${i+23}____.`, 
               options: [] 
             }))
           },
           {
             title: "看图写词",
             type: "writing",
             instructions: "Look and write.",
             questions: Array(5).fill(0).map((_, i) => ({ 
               id: `${i+28}`, 
               content: `Img`, 
               options: [] 
             }))
           },
           {
             title: "书面表达",
             type: "writing",
             instructions: "Composition.",
             questions: [{ 
               id: `${33}`, 
               content: `Write a short passage about your weekend.`, 
               options: [] 
             }]
           }
         ]
       } as AIPaper;
    }
    return null;
  }, [selectedTemplate, paperType]);

  // Define Paper Types based on Stage
  const paperTypes = useMemo(() => {
    const common = [
      { id: 'unit', label: t('ai_paper_type_unit') },
      { id: 'midterm', label: t('ai_paper_type_midterm') },
      { id: 'final', label: t('ai_paper_type_final') },
      { id: 'monitor', label: t('ai_paper_type_monitor') },
      { id: 'special', label: t('ai_paper_type_special') }
    ];

    if (stage === '小学') {
      return [
        ...common,
        { id: 'xiaoshengchu_yuandiao', label: t('ai_paper_type_xiaoshengchu_yuandiao') },
        { id: 'xiaoshengchu_april', label: t('ai_paper_type_xiaoshengchu_april') }
      ];
    } else if (stage === '初中') {
      return [
        ...common,
        { id: 'chushenggao_yuandiao', label: t('ai_paper_type_chushenggao_yuandiao') },
        { id: 'chushenggao_april', label: t('ai_paper_type_chushenggao_april') }
      ];
    } else { // Senior
      return [
        ...common,
        { id: 'mock_gaokao', label: t('ai_paper_type_mock_gaokao') }
      ];
    }
  }, [stage, t]);

  const updateTemplate = (currentStage: string, currentType: string) => {
    let nextTemplate = 'simple'; // Default to A4 Simple
    
    // Logic for Template Mapping
    if (currentStage === '小学') {
      // Primary Monitor & Mock -> A3
      if (currentType === 'monitor' || currentType === 'midterm' || currentType === 'final') {
        nextTemplate = 'primary_a3';
      } else {
        nextTemplate = 'simple';
      }
    } else if (currentStage === '初中') {
      nextTemplate = 'zhongkao';
    } else {
      nextTemplate = 'haidian';
    }
    
    dispatch(setAIPaperSelectedTemplate(nextTemplate));
  };

  const handleStageSelect = (id: '小学' | '初中' | '高中') => {
    dispatch(setAIPaperStage(id));
    // Default to 'unit' when switching stage
    const defaultType = 'unit';
    dispatch(setAIPaperType(defaultType));
    updateTemplate(id, defaultType);
  };

  const handleTypeSelect = (typeId: string) => {
    dispatch(setAIPaperType(typeId));
    updateTemplate(stage, typeId);
  };

  // Subject chips integrated into Stage section (UI only)
  const [paperSubject, setPaperSubject] = useState<'英语' | '数学' | '语文'>('英语');

  const handleGenerate = () => {
    // Enforce Highest Priority Rules
    let finalConfig = { ...questionConfig };
    const gradeNum = parseInt(grade.replace(/[^0-9]/g, '')) || 0;

    // Rule 1: Grade 4+ Writing Last Question must be Composition (10 marks)
    // "4下及以上年级" -> Grade 4 Semester 2 or Grade > 4
    const isGrade4Sem2Plus = (gradeNum === 4 && grade.includes('下')) || gradeNum > 4;
    
    if (isGrade4Sem2Plus) {
      if (!finalConfig['书面表达']) {
         // Force enable if missing
         finalConfig['书面表达'] = { count: 1, score: 10, selected: true };
      } else {
         finalConfig['书面表达'] = { 
           ...finalConfig['书面表达'], 
           selected: true, 
           count: 1, 
           score: 10 
         };
      }
    }

    // Rule 2: Listening Last Question Constraint
    // Must be "听短文判断" or "听短文选择"
    const listeningLastOptions = ['听短文判断', '听短文选择'];
    const hasLastOption = listeningLastOptions.some(key => finalConfig[key]?.selected);
    
    if (!hasLastOption) {
       // Force enable '听短文选择' if neither is selected
       // Use existing config if present, or create new
       if (finalConfig['听短文选择']) {
          finalConfig['听短文选择'] = { ...finalConfig['听短文选择'], selected: true };
       } else {
          finalConfig['听短文选择'] = { count: 5, score: 2, selected: true };
       }
    }

    dispatch(generateAIPaperThunk({
      theme,
      specialTopic: paperType === 'special' ? specialTopic : paperType, // Use paperType as topic unless it's 'special'
      stage,
      questionConfig: finalConfig,
      grade,
      examScope,
      listeningOrder,
      writingOrder
    }));
  };

  const handleDownload = () => {
    if (generatedPaper) {
      downloadService.exportAIPaperToPDF(generatedPaper, selectedTemplate);
    }
  };

  const handleDownloadDocx = () => {
    if (!generatedPaper) return;
    const content = document.getElementById('paper-preview')?.innerHTML;
    if (!content) return;
    
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header+content+footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `paper_${Date.now()}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  // Ensure paperType is initialized
  useEffect(() => {
    if (!paperType) {
      dispatch(setAIPaperType('unit'));
    }
  }, [paperType, dispatch]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full">
      {/* Left Panel: Configuration Form */}
      <div 
        className="w-full lg:w-[320px] shrink-0 px-6 pb-6 pt-2 rounded-2xl transition-all duration-300 h-fit relative"
        style={{ 
          backgroundColor: 'var(--container-bg)', 
          border: '1px solid var(--input-border)',
          boxShadow: 'var(--input-glow)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div className="py-2">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span className="w-1.5 h-6 bg-[#4257B2] rounded-full"></span>
            {t('ai_paper_params')}
          </h2>
          
          <div className="space-y-8">
            {/* Level 1: Stage (Tabs - Flex Layout) */}
            <div>
              <InputLabel 
                label={t('ai_paper_stage')} 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                    </g>
                  </svg>
                }
                hasValue={!!stage}
              />
              <div className="flex justify-between items-center gap-2 p-1">
                {([
                  { id: '小学', label: t('ai_paper_stage_primary') }, 
                  { id: '初中', label: t('ai_paper_stage_junior') }, 
                  { id: '高中', label: t('ai_paper_stage_senior') }
                ] as const).map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => handleStageSelect(id)}
                    className={`flex-1 h-8 min-w-[72px] rounded-xl text-xs font-semibold transition-all border-0 ${
                      stage === id
                        ? 'font-bold active:scale-95 shadow-sm'
                        : 'bg-[#F3F4F6] text-gray-500 hover:bg-[#E5E7EB] dark:bg-white/5 dark:hover:bg-white/10'
                    }`}
                    style={stage === id ? { 
                      background: 'linear-gradient(90deg, rgba(var(--primary-rgb), 0.15) 0%, rgba(var(--primary-rgb), 0.1) 100%)',
                      color: 'var(--primary-color)',
                      boxShadow: '0 2px 4px rgba(var(--primary-rgb), 0.15)'
                    } : { 
                      color: 'var(--text-secondary)' 
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex justify-between items-center gap-2 p-1 mt-2">
                {(['英语','数学','语文'] as const).map((subj) => (
                  <button
                    key={subj}
                    onClick={() => setPaperSubject(subj)}
                    className={`flex-1 h-8 min-w-[72px] rounded-xl text-xs font-semibold transition-all border-0 ${
                      paperSubject === subj
                        ? 'font-bold active:scale-95 shadow-sm'
                        : 'bg-[#F3F4F6] text-gray-500 hover:bg-[#E5E7EB] dark:bg-white/5 dark:hover:bg-white/10'
                    }`}
                    style={paperSubject === subj ? { 
                      background: 'linear-gradient(90deg, rgba(var(--primary-rgb), 0.15) 0%, rgba(var(--primary-rgb), 0.1) 100%)',
                      color: 'var(--primary-color)',
                      boxShadow: '0 2px 4px rgba(var(--primary-rgb), 0.15)'
                    } : { 
                      color: 'var(--text-secondary)' 
                    }}
                  >
                    {subj}
                  </button>
                ))}
              </div>
              
            </div>

            {/* Level 2: Paper Type (Flex Layout) */}
            <div>
              <InputLabel 
                label={t('ai_paper_template_select')} 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </g>
                  </svg>
                }
                hasValue={!!paperType}
              />
              <div className="flex flex-wrap gap-3">
                {paperTypes.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => handleTypeSelect(id)}
                    className={`px-4 py-2.5 rounded-xl text-xs transition-all border-0 text-center flex-grow md:flex-grow-0 ${
                      paperType === id
                        ? 'font-bold active:scale-95 shadow-sm'
                        : 'bg-[#F3F4F6] text-gray-600 hover:bg-[#E5E7EB] dark:bg-white/5 dark:hover:bg-white/10'
                    }`}
                    style={paperType === id ? {
                      background: 'linear-gradient(90deg, rgba(var(--primary-rgb), 0.15) 0%, rgba(var(--primary-rgb), 0.1) 100%)',
                      color: 'var(--primary-color)',
                      boxShadow: '0 2px 4px rgba(var(--primary-rgb), 0.15)'
                    } : { 
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Special Topic Sub-selection (Only if 'special' is selected) */}
            {paperType === 'special' && (
              <div className="animate-expand">
                <InputLabel 
                  label={t('ai_paper_special_topic')} 
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <path d="M4 6h16M4 12h16M4 18h16"/>
                      </g>
                    </svg>
                  }
                  hasValue={!!specialTopic}
                />
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: '语法填空', label: t('ai_paper_type_grammar') },
                    { id: '阅读理解', label: t('ai_paper_type_reading') },
                    { id: '完形填空', label: t('ai_paper_type_cloze') },
                    { id: '全真模拟', label: t('ai_paper_type_mock') }
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => dispatch(setAIPaperSpecialTopic(id))}
                      className={`px-4 py-2 rounded-xl text-xs transition-all border-0 ${
                        specialTopic === id
                          ? 'font-bold active:scale-95'
                          : 'bg-[#F3F4F6] text-gray-600 hover:bg-[#E5E7EB] dark:bg-white/5 dark:hover:bg-white/10'
                      }`}
                      style={specialTopic === id ? {
                        background: 'linear-gradient(90deg, rgba(var(--primary-rgb), 0.1) 0%, rgba(var(--primary-rgb), 0.05) 100%)',
                        color: 'var(--primary-color)'
                      } : { 
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Theme Input - Moved & Refactored */}
            <div>
              <InputLabel 
                label={t('ai_paper_theme')} 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <circle cx="12" cy="12" r="6"/>
                      <circle cx="12" cy="12" r="2"/>
                    </g>
                  </svg>
                }
                hasValue={!!theme.trim()}
              />
              <div className="flex flex-col gap-2">
                {/* Row 1: Location & Scope */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={themeLocation}
                    onChange={(e) => {
                        setThemeLocation(e.target.value);
                        updateTheme(e.target.value, themeScope, themeYearStart, themeYearEnd);
                    }}
                    placeholder="输入地区 (如: 朝阳)"
                    className="flex-grow min-w-0 px-3 py-2 rounded-xl border focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm font-medium text-center"
                    style={{ 
                      backgroundColor: 'var(--input-bg)', 
                      borderColor: 'var(--border-color)',
                      color: 'var(--input-field-text-color)'
                    }}
                  />
                  <div className="relative shrink-0 w-24">
                      <select
                        value={themeScope}
                        onChange={(e) => {
                            setThemeScope(e.target.value);
                            updateTheme(themeLocation, e.target.value, themeYearStart, themeYearEnd);
                        }}
                        className="w-full appearance-none px-3 py-2 pr-8 rounded-xl border focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm font-medium bg-no-repeat cursor-pointer"
                        style={{ 
                          backgroundColor: 'var(--input-bg)', 
                          borderColor: 'var(--border-color)',
                          color: 'var(--input-field-text-color)',
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundSize: '1.2em 1.2em'
                        }}
                      >
                        <option value="区">区级</option>
                        <option value="市">市级</option>
                      </select>
                  </div>
                </div>

                {/* Row 2: Years */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={themeYearStart}
                    onChange={(e) => {
                        setThemeYearStart(e.target.value);
                        updateTheme(themeLocation, themeScope, e.target.value, themeYearEnd);
                    }}
                    className="flex-1 min-w-0 px-2 py-2 rounded-xl border focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm font-medium text-center"
                    style={{ 
                      backgroundColor: 'var(--input-bg)', 
                      borderColor: 'var(--border-color)',
                      color: 'var(--input-field-text-color)'
                    }}
                  />
                  <span className="text-gray-400 font-bold shrink-0">-</span>
                  <input
                    type="text"
                    value={themeYearEnd}
                    onChange={(e) => {
                        setThemeYearEnd(e.target.value);
                        updateTheme(themeLocation, themeScope, themeYearStart, e.target.value);
                    }}
                    className="flex-1 min-w-0 px-2 py-2 rounded-xl border focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm font-medium text-center"
                    style={{ 
                      backgroundColor: 'var(--input-bg)', 
                      borderColor: 'var(--border-color)',
                      color: 'var(--input-field-text-color)'
                    }}
                  />
                  <span className="text-sm font-medium shrink-0 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>学年</span>
                </div>
              </div>
            </div>

            {/* Level 1.5: Grade (Only for Primary) */}
            {stage === '小学' && (
              <div>
                 <InputLabel 
                   label="适用年级 (Grade)" 
                   icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                      </g>
                    </svg>
                   }
                   hasValue={true} 
                 />
                 <div className="grid grid-cols-4 gap-2">
                   {['3上', '3下', '4上', '4下', '5上', '5下', '6上', '6下'].map(g => (
                     <button
                       key={g}
                       onClick={() => setGrade(g)}
                       className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                         grade === g
                           ? 'bg-[#4257B2] text-white shadow-md'
                           : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                       }`}
                     >
                       {g}
                     </button>
                   ))}
                 </div>
              </div>
            )}

            {/* Question Selection Module (Preset & Drawer Refactor) */}
            <div>
              <InputLabel 
                label="题型选择" 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                      <path d="M3 6h18M3 12h18M3 18h18"/>
                    </g>
                  </svg>
                }
                hasValue={Object.values(questionConfig).some((c) => c?.selected)}
              />
              <div className="relative mt-2">
                {/* Preset Tabs */}
                <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-xl mb-2">
                   {Object.entries(PRESETS).map(([key, p]) => (
                      <button
                        key={key}
                        onClick={() => handlePresetSelect(key)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activePreset === key ? 'bg-white shadow text-[var(--primary-color)]' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        {p.label}
                      </button>
                   ))}
                </div>
    
                {/* Selected Questions List (Compact & Scrollable) */}
            <div 
              className="space-y-1 mb-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-track-transparent pr-1"
              style={{
                '--scrollbar-thumb': 'var(--primary-color)',
                'scrollbarColor': 'var(--primary-color) transparent'
              } as React.CSSProperties}
            >
               {/* Listening */}
               {listeningOrder.some(q => questionConfig[q]?.selected) && (
                 <div className="text-[10px] font-bold text-gray-400 tracking-wider mb-1 px-2">听力</div>
               )}
               {listeningOrder.filter(q => questionConfig[q]?.selected).map(q => (
                  <div
                    key={q}
                    draggable
                    onDragStart={(e) => handleQuestionDragStart(e, q, 'listening')}
                    onDragOver={(e) => handleQuestionDragOver(e, q, 'listening')}
                    onDrop={(e) => handleQuestionDrop(e, q, 'listening')}
                    className={`transition-all cursor-move ${draggedItem?.key === q ? 'opacity-50 scale-95' : 'hover:scale-[1.01]'}`}
                  >
                    <QuestionRow qKey={q} config={questionConfig[q]} dispatch={dispatch} activePopover={activePopover} setActivePopover={setActivePopover} />
                  </div>
               ))}
               
               {/* Writing */}
              {writingOrder.some(q => questionConfig[q]?.selected) && (
                 <div className="text-[10px] font-bold text-gray-400 mt-3 mb-1 px-2">笔试</div>
               )}
              {writingOrder.filter(q => questionConfig[q]?.selected).map(q => (
                  <div
                    key={q}
                    draggable
                    onDragStart={(e) => handleQuestionDragStart(e, q, 'writing')}
                    onDragOver={(e) => handleQuestionDragOver(e, q, 'writing')}
                    onDrop={(e) => handleQuestionDrop(e, q, 'writing')}
                    className={`transition-all cursor-move ${draggedItem?.key === q ? 'opacity-50 scale-95' : 'hover:scale-[1.01]'}`}
                  >
                    <QuestionRow qKey={q} config={questionConfig[q]} dispatch={dispatch} activePopover={activePopover} setActivePopover={setActivePopover} />
                  </div>
               ))}
            </div>
                
                {/* Add More Button */}
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="w-full py-1.5 border-2 border-dashed border-gray-200 hover:border-[var(--primary-color)] rounded-xl text-xs font-bold text-gray-400 hover:text-[var(--primary-color)] transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  添加更多题型
                </button>
    
                {/* Score Status Bar (Optimized & Localized) */}
                <div 
                  className="sticky bottom-4 mx-auto mt-4 py-2 px-4 rounded-full backdrop-blur-xl shadow-xl flex items-center justify-between text-xs font-bold z-10 border transition-all gap-4 w-fit animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{
                     backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                     borderColor: totalScore === 100 ? 'var(--primary-color)' : 'var(--border-color)',
                     boxShadow: totalScore === 100 ? '0 8px 32px rgba(66, 87, 178, 0.2)' : '0 8px 32px rgba(31, 38, 135, 0.15)',
                  }}
                >
                   <div className="flex items-center gap-1.5">
                      <span className="text-[10px] tracking-wider font-extrabold text-gray-400">听力</span>
                      <span className={`text-sm font-black ${listeningScore < 40 ? 'text-orange-500' : 'text-gray-800 dark:text-gray-900'}`}>{listeningScore}</span>
                   </div>
                   
                   <div className="w-px h-3 bg-gray-300"></div>

                   <div className="flex items-center gap-1.5">
                      <span className="text-[10px] tracking-wider font-extrabold text-gray-400">笔试</span>
                      <span className={`text-sm font-black ${writingScore < 60 ? 'text-orange-500' : 'text-gray-800 dark:text-gray-900'}`}>{writingScore}</span>
                   </div>

                   <div className="w-px h-3 bg-gray-300"></div>

                   <div className="flex items-center gap-1.5">
                      <span className="text-[10px] tracking-wider font-extrabold text-gray-400">总分</span>
                      <div className="flex items-baseline gap-0.5">
                        <span className={`text-base font-black ${totalScore === 100 ? 'text-[#4257B2]' : 'text-orange-500'}`}>
                          {totalScore}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">/100</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Exam Scope Configuration */}
            <div>
              <InputLabel 
                label="考察范围 (Scope)" 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                      <path d="M5 11l7-7 7 7M5 13l7 7 7-7"/>
                    </g>
                  </svg>
                }
                hasValue={!!examScope}
              />
              <div className="relative group">
                <textarea
                  value={examScope || ''}
                  onChange={(e) => dispatch(setAIPaperExamScope(e.target.value))}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  placeholder="手动输入考点，或点击右侧图标拍照/上传教材内容"
                  className="w-full h-24 px-4 py-3 rounded-xl border border-gray-200 bg-white/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-4 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all duration-200 resize-none placeholder:text-gray-400"
                  style={{ 
                    color: 'var(--input-field-text-color)'
                  }}
                />
                {/* Icons inside Textarea */}
                <div className="absolute right-3 bottom-3 flex gap-2">
                  <input 
                    type="file" 
                    ref={cameraInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload} 
                  />
                  <button 
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[var(--primary-color)] transition-colors" 
                    title="拍照/相册"
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <div className="w-[18px] h-[18px] border-2 border-gray-300 border-t-[var(--primary-color)] rounded-full animate-spin"></div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                    )}
                  </button>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.txt"
                    multiple
                    onChange={handleFileUpload} 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[var(--primary-color)] transition-colors" 
                    title="上传教材/文件"
                    disabled={isAnalyzing}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Quick Theme Chips */}
              <div className="flex flex-wrap gap-2 mt-3">
                {(scopeTagsMap[grade] || scopeTagsMap['default']).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      const newValue = examScope ? `${examScope} #${tag}` : `#${tag}`;
                      dispatch(setAIPaperExamScope(newValue));
                    }}
                    className="px-2.5 py-1 text-xs rounded-full border border-gray-200 bg-white text-gray-600 hover:border-[var(--primary-color)] hover:text-[var(--primary-color)] hover:shadow-[0_0_10px_var(--primary-color)] hover:opacity-90 hover:ring-1 hover:ring-[var(--primary-color)] transition-all duration-200"
                    style={{ '--primary-rgb': '99, 102, 241' } as React.CSSProperties}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>



            {/* Question Selection moved above; duplicate removed */}

            <button
              onClick={handleGenerate}
              disabled={isLoading || !theme.trim()}
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 mt-4 ${
                isLoading || !theme.trim()
                  ? 'bg-gray-300 cursor-not-allowed shadow-none'
                  : 'bg-[#4257B2] hover:bg-[#36499A] hover:-translate-y-0.5'
              }`}
            >
              {isLoading ? <Spinner className="w-5 h-5 text-white" /> : t('ai_paper_start_generate')}
            </button>
          </div>
      </div>

      {/* Drawer Overlay (Moved to Panel Level) */}
      {isDrawerOpen && (
        <>
          <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm rounded-2xl" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="absolute top-0 right-0 bottom-0 w-64 bg-white dark:bg-gray-800 shadow-2xl z-30 p-4 rounded-r-2xl overflow-y-auto animate-in slide-in-from-right duration-200 border-l border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold">添加题型</h3>
                <button onClick={() => setIsDrawerOpen(false)} className="p-1 hover:bg-gray-100 rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-1 h-3 rounded-full bg-[var(--primary-color)]"></div>
                   <div className="text-[10px] font-bold text-[var(--primary-color)] uppercase tracking-wider">待选听力</div>
                </div>
                {LISTENING_QUESTIONS.filter(q => !questionConfig[q]?.selected).map(q => (
                    <DrawerItem key={q} qKey={q} onAdd={() => dispatch(updateQuestionConfigItem({ key: q, changes: { selected: true } }))} />
                ))}
                
                <div className="pt-6 pb-2">
                  <div className="w-full h-px bg-gray-100 dark:bg-white/10 mb-4"></div>
                  <div className="flex items-center gap-2 mb-2">
                     <div className="w-1 h-3 rounded-full" style={{ backgroundColor: 'var(--primary-color)', filter: 'hue-rotate(120deg)' }}></div>
                     <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--primary-color)', filter: 'hue-rotate(120deg)' }}>待选笔试</div>
                  </div>
                </div>
                {WRITING_QUESTIONS.filter(q => !questionConfig[q]?.selected).map(q => (
                    <DrawerItem key={q} qKey={q} onAdd={() => dispatch(updateQuestionConfigItem({ key: q, changes: { selected: true } }))} />
                ))}
              </div>
          </div>
        </>
      )}
      </div>

      {/* Right Panel: Preview (Independent) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Title & Actions */}
        <div className="py-2 mb-4 flex justify-between items-center mt-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span className="w-1.5 h-6 bg-[#4257B2] rounded-full"></span>
              {t('ai_paper_preview')}
            </h2>
             {generatedPaper && (
               <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">Generated</span>
             )}
          </div>
          {generatedPaper && (
             <div className="flex gap-2">
               <button
                 onClick={() => setIsEditing(!isEditing)}
                 className={`px-4 py-2 text-sm font-bold rounded-lg shadow-md transition-all flex items-center gap-2 ${isEditing ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20'}`}
               >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                 </svg>
                 {isEditing ? '完成编辑' : '编辑试卷'}
               </button>
               <button
                 onClick={handleDownloadDocx}
                 className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-lg shadow-md hover:bg-blue-600 transition-all flex items-center gap-2"
               >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
                 Word
               </button>
               <button
                 onClick={handleDownload}
                 className="px-4 py-2 bg-[#4257B2] text-white text-sm font-bold rounded-lg shadow-md hover:bg-[#36499A] transition-all flex items-center gap-2"
               >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                 </svg>
                 PDF
               </button>
             </div>
           )}
        </div>

        {/* Paper Preview Area - Scrollable Dark Container */}
        <div 
          className={`w-full h-[calc(100vh-32px)] overflow-auto rounded-xl border relative scrollbar-thin scrollbar-track-transparent ${selectedTemplate === 'primary_a3' ? 'p-8 flex justify-center' : ''}`} 
          style={{
             backgroundColor: 'var(--container-bg)', 
             borderColor: 'var(--input-border)',
             boxShadow: 'var(--input-glow)',
             backdropFilter: 'blur(10px)',
             scrollbarColor: 'var(--primary-color) transparent'
          }}
        >
          <div className={selectedTemplate === 'primary_a3' ? 'h-fit' : 'p-8 min-h-full'}>
            {isLoading ? (
               <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                 <Spinner className="w-12 h-12 text-[#4257B2]" />
                 <p className="animate-pulse font-medium" style={{ color: 'var(--text-primary)' }}>{t('ai_paper_generating_hint')}</p>
               </div>
            ) : generatedPaper ? (
               <PaperRenderer paper={generatedPaper} template={selectedTemplate} isPreview={true} displayTitle={theme} grade={grade} paperType={paperType} isEditing={isEditing} dispatch={dispatch} questionConfig={questionConfig} />
            ) : mockPaper ? (
               <PaperRenderer paper={mockPaper} template={selectedTemplate} isMock={true} isPreview={true} displayTitle={theme} grade={grade} paperType={paperType} questionConfig={questionConfig} />
            ) : (
               <div className="flex flex-col items-center justify-center h-full">
                 {/* A3 Placeholder Visualization */}
                 <div className="w-[300px] h-[1260px] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-4 mb-4 opacity-60" style={{ borderColor: 'rgba(var(--primary-rgb), 0.3)' }}>
                    <div className="w-full h-full flex flex-col gap-8">
                      {/* A3 Front */}
                      <div className="flex-1 w-full flex flex-col gap-2">
                        <div className="w-full text-center text-[10px] text-gray-400 font-medium">A3 Front (Questions)</div>
                        <div className="flex-1 w-full flex gap-4">
                          <div className="flex-1 bg-gray-100 rounded" style={{ backgroundColor: 'var(--card-bg)' }}></div>
                          <div className="flex-1 bg-gray-100 rounded" style={{ backgroundColor: 'var(--card-bg)' }}></div>
                          <div className="flex-1 bg-gray-100 rounded" style={{ backgroundColor: 'var(--card-bg)' }}></div>
                        </div>
                      </div>
                      
                      {/* A3 Back */}
                      <div className="flex-1 w-full flex flex-col gap-2">
                        <div className="w-full text-center text-[10px] text-gray-400 font-medium">A3 Back (Questions)</div>
                        <div className="flex-1 w-full flex gap-4">
                          <div className="flex-1 bg-gray-100 rounded" style={{ backgroundColor: 'var(--card-bg)' }}></div>
                          <div className="flex-1 bg-gray-100 rounded" style={{ backgroundColor: 'var(--card-bg)' }}></div>
                          <div className="flex-1 bg-gray-100 rounded" style={{ backgroundColor: 'var(--card-bg)' }}></div>
                        </div>
                      </div>

                      {/* A4 Answers */}
                      <div className="flex-1 w-full flex flex-col gap-2">
                        <div className="w-full text-center text-[10px] text-gray-400 font-medium">A4 (Answers & Essay)</div>
                        <div className="flex-1 w-full bg-gray-100 rounded flex flex-col p-3 gap-3" style={{ backgroundColor: 'var(--card-bg)' }}>
                           <div className="w-1/2 h-4 bg-gray-200 rounded opacity-50"></div>
                           <div className="w-full h-2 bg-gray-200 rounded opacity-30"></div>
                           <div className="w-full h-2 bg-gray-200 rounded opacity-30"></div>
                           <div className="w-3/4 h-2 bg-gray-200 rounded opacity-30"></div>
                           <div className="flex-1 border-t border-dashed border-gray-300 mt-2 pt-2">
                              <div className="w-1/3 h-4 bg-gray-200 rounded opacity-50 mb-2"></div>
                              <div className="w-full h-full border border-gray-200 rounded opacity-30"></div>
                           </div>
                        </div>
                      </div>
                    </div>
                    <span className="mt-4 text-xs font-bold text-gray-400">A3 Monitor Template + A4 Answer Sheet</span>
                 </div>
                 
                 <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                   {t('ai_paper_empty_hint')}
                 </p>
                 <p className="text-sm mt-2 opacity-70" style={{ color: 'var(--text-secondary)' }}>
                   当前已选：{stage} - {paperTypes.find(t => t.id === paperType)?.label || paperType} 标准模板
                 </p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
