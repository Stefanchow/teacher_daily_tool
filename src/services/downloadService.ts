import { saveAs } from 'file-saver';
import { store } from '../store';
import { LessonPlan, AIPaper } from './geminiService';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, Header, Footer, AlignmentType, PageNumber, TabStopType } from 'docx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const API_BASE_URL = 'http://localhost:3000/api';

interface ExportTheme {
  primary: string;
  secondary: string;
  textPrimary: string;
  textSecondary: string;
  bgColor: string;
  cardBg: string;
  borderColor: string;
}

const stripHash = (color: string) => {
  const c = color.trim();
  return c.startsWith('#') ? c.slice(1) : c;
};

function getExportTheme(): ExportTheme {
  const fallback: ExportTheme = {
    primary: '#6366f1',
    secondary: '#eef2ff',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    bgColor: '#f8fafc',
    cardBg: '#ffffff',
    borderColor: '#cbd5e1',
  };
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fallback;
  }
  try {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const readVar = (name: string, fb: string) => {
      const v = styles.getPropertyValue(name).trim();
      return v || fb;
    };
    return {
      primary: readVar('--primary-color', fallback.primary),
      secondary: readVar('--secondary-color', fallback.secondary),
      textPrimary: readVar('--text-primary', fallback.textPrimary),
      textSecondary: readVar('--text-secondary', fallback.textSecondary),
      bgColor: readVar('--bg-color', fallback.bgColor),
      cardBg: readVar('--card-bg', fallback.cardBg),
      borderColor: readVar('--border-color', fallback.borderColor),
    };
  } catch {
    return fallback;
  }
}

const LABELS = {
  en: {
    title: 'Lesson Plan',
    grade: 'Grade',
    duration: 'Duration',
    teachingPreparation: 'Teaching Preparation',
    objectives: 'Objectives',
    keyWords: 'Key Words',
    teachingAids: 'Teaching Aids',
    procedures: 'Procedures',
    step: 'Step',
    time: 'Time',
    teacherActivity: 'Teacher Activity',
    studentActivity: 'Student Activity',
    justification: 'Justification',
    studentAnalysis: 'Student Analysis',
    sentenceStructures: 'Sentence Structures'
  },
  zh: {
    title: 'Lesson Plan (教案)',
    grade: 'Grade (年级)',
    duration: 'Duration (时长)',
    teachingPreparation: 'Teaching Preparation (教学准备)',
    objectives: 'Objectives (教学目标)',
    keyWords: 'Key Words (核心词汇)',
    teachingAids: 'Teaching Aids (教学用具)',
    procedures: 'Procedures (教学过程)',
    step: 'Step (步骤)',
    time: 'Time (时间)',
    teacherActivity: 'Teacher Activity (教师活动)',
    studentActivity: 'Student Activity (学生活动)',
    justification: 'Justification (设计意图)',
    studentAnalysis: 'Student Analysis (学情分析)',
    sentenceStructures: 'Sentence Structures (句型结构)'
  }
};

function getLabels(lang: 'en' | 'zh') {
  return LABELS[lang] || LABELS.en;
}

function formatTitle(title: string, grade?: string): string {
  if (!title) return "Lesson Plan";
  // Remove markdown symbols if any
  return title.replace(/[*_#]/g, '');
}

async function generateDocxBlob(plan: LessonPlan, language: 'en' | 'zh'): Promise<Blob> {
  try {
    const labels = getLabels(language);
    const titleText = language === 'zh' ? plan.title_zh : plan.title_en;
    const title = formatTitle(titleText || "Lesson Plan");
    const theme = getExportTheme();

    const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: {
              ascii: "Times New Roman",
              eastAsia: "Microsoft YaHei",
              hAnsi: "Times New Roman",
              cs: "Times New Roman",
            },
            size: 24, // 12pt
          },
        },
      },
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: {
            font: {
              ascii: "Times New Roman",
              eastAsia: "Microsoft YaHei",
              hAnsi: "Times New Roman",
              cs: "Times New Roman",
            },
          },
        },
      ],
    },
    sections: [{
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Teacher Daily Tool", color: stripHash(theme.textSecondary), size: 20 }),
                new TextRun({ text: "\t" + new Date().toLocaleDateString(), color: stripHash(theme.textSecondary), size: 20 }),
              ],
              tabStops: [
                { type: TabStopType.RIGHT, position: 9000 },
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
                  color: stripHash(theme.textSecondary),
                  size: 20,
                }),
              ],
            }),
          ],
        }),
      },
      properties: {},
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: title,
              bold: true,
              color: stripHash(theme.primary),
            }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: `${labels.grade}: ${plan.grade || 'N/A'}`, bold: true, color: stripHash(theme.textPrimary) }),
            new TextRun({ text: ` | ${labels.duration}: ${plan.duration || 'N/A'} min`, color: stripHash(theme.textSecondary) }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: '' }),
        
        // Teaching Preparation
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: labels.teachingPreparation,
              bold: true,
              color: stripHash(theme.primary),
            }),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ text: labels.objectives + ':', bold: true, color: stripHash(theme.textPrimary) })],
        }),
        ...((language === 'zh' ? plan.teachingPreparation?.objectives_zh : plan.teachingPreparation?.objectives_en) || []).map(obj => 
          new Paragraph({
            children: [
              new TextRun({
                text: obj,
                color: stripHash(theme.textPrimary),
              }),
            ],
            bullet: { level: 0 }
          })
        ),
        new Paragraph({
          children: [
            new TextRun({ text: labels.keyWords + ': ', bold: true, color: stripHash(theme.textPrimary) }),
            new TextRun({ text: ((language === 'zh' ? plan.teachingPreparation?.keyWords_zh : plan.teachingPreparation?.keyWords_en) || []).join(', '), color: stripHash(theme.textSecondary) })
          ],
          spacing: { before: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: labels.sentenceStructures + ': ', bold: true, color: stripHash(theme.textPrimary) }),
            new TextRun({ text: (language === 'zh' ? plan.teachingPreparation?.sentenceStructures_zh : plan.teachingPreparation?.sentenceStructures_en)?.join(', ') || 'None', color: stripHash(theme.textSecondary) })
          ],
          spacing: { before: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: labels.teachingAids + ': ', bold: true, color: stripHash(theme.textPrimary) }),
            new TextRun({ text: (language === 'zh' ? plan.teachingPreparation?.teachingAids_zh : plan.teachingPreparation?.teachingAids_en) || 'None', color: stripHash(theme.textSecondary) })
          ],
          spacing: { before: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: labels.studentAnalysis + ': ', bold: true, color: stripHash(theme.textPrimary) }),
            new TextRun({ text: (language === 'zh' ? plan.teachingPreparation?.studentAnalysis_zh : plan.teachingPreparation?.studentAnalysis_en) || 'None', color: stripHash(theme.textSecondary) })
          ],
          spacing: { before: 200 }
        }),
        new Paragraph({ text: '' }),

        // Procedures
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: labels.procedures,
              bold: true,
              color: stripHash(theme.primary),
            }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ 
                  children: [
                    new Paragraph({ 
                      children: [new TextRun({ text: labels.step, bold: true, color: stripHash(theme.textPrimary) })] 
                    }),
                  ],
                  shading: { fill: stripHash(theme.secondary) },
                }),
                new TableCell({ 
                  children: [
                    new Paragraph({ 
                      children: [new TextRun({ text: labels.time, bold: true, color: stripHash(theme.textPrimary) })] 
                    }),
                  ],
                  shading: { fill: stripHash(theme.secondary) },
                }),
                new TableCell({ 
                  children: [
                    new Paragraph({ 
                      children: [new TextRun({ text: labels.procedures, bold: true, color: stripHash(theme.textPrimary) })] 
                    }),
                  ],
                  shading: { fill: stripHash(theme.secondary) },
                }),
              ],
            }),
            ...(plan.procedures || []).map((proc, index) => 
              new TableRow({
                children: [
                  new TableCell({ 
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: language === 'en' ? proc.title_en : proc.title_zh,
                            color: stripHash(theme.textPrimary),
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({ 
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: String(proc.duration || 5) + ' min',
                            color: stripHash(theme.textSecondary),
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({ 
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: language === 'en' ? proc.content_en : proc.content_zh,
                            color: stripHash(theme.textPrimary),
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              })
            ),
          ],
        }),
      ],
    }],
    });

    return await Packer.toBlob(doc);
  } catch (error) {
    console.error('Failed to generate DOCX blob:', error);
    throw new Error(`DOCX generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function generateLessonPlanHtml(plan: LessonPlan, language: 'en' | 'zh', theme: ExportTheme, mode: 'full' | 'scoped' = 'full'): string {
  const labels = getLabels(language);
  const titleText = language === 'zh' ? plan.title_zh : plan.title_en;
  const title = formatTitle(titleText || labels.title);
  
  const objectives = (language === 'zh' ? plan.teachingPreparation?.objectives_zh : plan.teachingPreparation?.objectives_en) || [];
  const keyWords = (language === 'zh' ? plan.teachingPreparation?.keyWords_zh : plan.teachingPreparation?.keyWords_en) || [];
  const sentenceStructures = (language === 'zh' ? plan.teachingPreparation?.sentenceStructures_zh : plan.teachingPreparation?.sentenceStructures_en)?.join(', ') || 'None';
  const teachingAids = (language === 'zh' ? plan.teachingPreparation?.teachingAids_zh : plan.teachingPreparation?.teachingAids_en) || 'None';
  const studentAnalysis = (language === 'zh' ? plan.teachingPreparation?.studentAnalysis_zh : plan.teachingPreparation?.studentAnalysis_en) || 'None';

  const css = `
    ${mode === 'scoped' ? '.pdf-scope' : 'body'} { font-family: 'Microsoft YaHei', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: ${theme.bgColor}; color: ${theme.textPrimary}; }
    ${mode === 'scoped' ? '.pdf-scope ' : ''}h1 { text-align: center; color: ${theme.primary}; }
    ${mode === 'scoped' ? '.pdf-scope ' : ''}.meta { margin-bottom: 20px; color: ${theme.textSecondary}; text-align: center; }
    ${mode === 'scoped' ? '.pdf-scope ' : ''}.section { margin-bottom: 30px; background: ${theme.cardBg}; border-radius: 12px; padding: 16px; border: 1px solid ${theme.borderColor}; }
    ${mode === 'scoped' ? '.pdf-scope ' : ''}h2 { border-bottom: 2px solid ${theme.borderColor}; padding-bottom: 10px; color: ${theme.primary}; }
    ${mode === 'scoped' ? '.pdf-scope ' : ''}h3 { margin: 0 0 6px 0; font-size: 14px; color: ${theme.textPrimary}; }
    ${mode === 'scoped' ? '.pdf-scope ' : ''}ul { line-height: 1.6; margin: 0; padding-left: 18px; }
    ${mode === 'scoped' ? '.pdf-scope ' : ''}.card { border: 1px solid ${theme.borderColor}; border-radius: 8px; padding: 12px; margin-bottom: 12px; break-inside: avoid; background: ${theme.cardBg}; }
    ${mode === 'scoped' ? '.pdf-scope ' : ''}blockquote { background: ${theme.secondary}; border-left: 4px solid ${theme.primary}; margin: 8px 0; padding: 8px 12px; color: ${theme.textPrimary}; }
    ${mode === 'scoped' ? '.pdf-scope ' : ''}.badge { display: inline-block; background: ${theme.secondary}; color: ${theme.primary}; padding: 2px 8px; border-radius: 999px; font-size: 11px; margin-left: 6px; }
    ${mode === 'full' ? `@media print {
      body { padding: 0; }
      .no-print { display: none; }
    }` : ''}
  `;

  const content = `
      <h1>${title}</h1>
      <div class="meta">
        <span>${labels.grade}: ${plan.grade || 'N/A'}</span> | 
        <span>${labels.duration}: ${plan.duration || 'N/A'} min</span>
      </div>

      <div class="section">
        <h2>${labels.teachingPreparation}</h2>
        <p><strong>${labels.objectives}:</strong></p>
        <ul>
          ${objectives.map(obj => `<li>${obj}</li>`).join('')}
        </ul>
        <p><strong>${labels.keyWords}:</strong> ${keyWords.join(', ')}</p>
        <p><strong>${labels.sentenceStructures}:</strong> ${sentenceStructures}</p>
        <p><strong>${labels.teachingAids}:</strong> ${teachingAids}</p>
        <p><strong>${labels.studentAnalysis}:</strong> ${studentAnalysis}</p>
      </div>

      <div class="section">
        <h2>${labels.procedures}</h2>
        ${(plan.procedures || []).map((proc, index) => `
          <section class="card">
            <h3>${language === 'en' ? proc.title_en : proc.title_zh} (${proc.duration || 5} min)</h3>
            <div style="white-space: pre-wrap;">${language === 'en' ? proc.content_en : proc.content_zh}</div>
          </section>
        `).join('')}
      </div>
  `;

  if (mode === 'scoped') {
    return `
      <style>${css}</style>
      <div class="pdf-scope">
        ${content}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>${css}</style>
    </head>
    <body>
      ${content}
      <script>
        window.onload = () => { window.print(); };
      </script>
    </body>
    </html>
  `;
}

async function generatePdfBlobFromPlan(plan: LessonPlan, language: 'en' | 'zh'): Promise<Blob> {
  const theme = getExportTheme();
  // Use scoped mode to prevent global style leaks and ensure correct element selection
  const html = generateLessonPlanHtml(plan, language, theme, 'scoped');
  
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px'; 
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const doc = new jsPDF('p', 'pt', 'a4');
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('PDF generation timed out'));
      }, 30000); 

      try {
        const element = container.querySelector('.pdf-scope') as HTMLElement;
        if (!element) {
          throw new Error('PDF content element not found');
        }

        doc.html(element, {
          callback: (doc) => {
            clearTimeout(timeoutId);
            resolve();
          },
          x: margin,
          y: margin,
          width: pageWidth - 2 * margin,
          windowWidth: 800,
          autoPaging: 'text',
          html2canvas: { scale: 2, logging: false, useCORS: true }
        });
      } catch (err) {
        clearTimeout(timeoutId);
        reject(err);
      }
    });
    
    return doc.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}

export const downloadService = {
  async downloadDocx(plan: LessonPlan, language: 'en' | 'zh' = 'zh') {
    try {
      const blob = await generateDocxBlob(plan, language);
      const titleText = language === 'zh' ? plan.title_zh : plan.title_en;
      const title = formatTitle(titleText || "Lesson Plan");
      this.triggerBrowserDownload(blob, `${title}.docx`);
    } catch (error) {
      console.error('Download DOCX error:', error);
      alert('Failed to generate DOCX.');
    }
  },

  async downloadPdf(plan: LessonPlan, language: 'en' | 'zh' = 'zh') {
    try {
      // Try server first for high-quality PDF
      const titleText = language === 'zh' ? plan.title_zh : plan.title_en;
      const title = formatTitle(titleText || "Lesson Plan");
      
      try {
        const response = await fetch(`${API_BASE_URL}/lesson-plans/current/download/pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...plan, language }),
          signal: AbortSignal.timeout(5000) // 5s timeout for server
        });
        
        if (response.ok) {
          const blob = await response.blob();
          this.triggerBrowserDownload(blob, `${title}.pdf`);
          return;
        }
      } catch (e) {
        // Server failed or timed out, proceed to client-side generation
        console.warn('Server PDF download failed, falling back to client generation', e);
      }

      // Fallback to Client-side Generation (No Print Preview)
      const blob = await generatePdfBlobFromPlan(plan, language);
      this.triggerBrowserDownload(blob, `${title}.pdf`);
      
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('PDF export failed. Please try again.');
    }
  },

  async exportAIPaperToPDF(paper: AIPaper, template: string) {
    const original = document.getElementById('paper-preview');
    if (!original) {
      alert('Cannot find paper preview. Please try again.');
      return;
    }

    // Capture Sealed Line separately if needed (Senior template)
    let sealedLineImg: string | null = null;
    const sealedLineEl = original.querySelector('.export-sealed-line') as HTMLElement;
    if (sealedLineEl) {
      try {
        const canvas = await html2canvas(sealedLineEl, { backgroundColor: null });
        sealedLineImg = canvas.toDataURL('image/png');
      } catch (e) {
        console.warn('Failed to capture sealed line', e);
      }
    }

    // Clone and prepare for PDF
    const element = original.cloneNode(true) as HTMLElement;
    
    // Remove fixed/absolute elements that we will re-add manually
    const sl = element.querySelector('.export-sealed-line');
    if (sl) sl.remove();
    const ft = element.querySelector('.export-footer');
    if (ft) ft.remove();

    // Force single column for PDF safety (avoid broken text across pages)
    // and reset max-width to fill the PDF
    if (template !== 'primary_a3') {
      element.style.columnCount = 'auto';
    }
    element.style.maxWidth = 'none';
    element.style.width = '100%';
    element.style.height = 'auto';
    element.style.margin = '0';
    element.style.padding = '20px';
    element.style.background = '#fff';

    // Create a temporary container off-screen
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    const isA3 = template === 'primary_a3';

    const doc = new jsPDF(isA3 ? 'l' : 'p', 'pt', isA3 ? 'a3' : 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;

    container.style.width = `${pageWidth}pt`;
    container.style.top = '0';
    container.appendChild(element);
    document.body.appendChild(container);

    try {
      await doc.html(element, {
        callback: async (doc) => {
          const pageCount = doc.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            // Add Sealed Line (Senior)
            if (template === 'haidian' && sealedLineImg) {
              doc.addImage(sealedLineImg, 'PNG', 10, 0, 30, pageHeight);
            }

            // Add Footer Page Numbers (Senior)
            if (template === 'haidian') {
              doc.setFontSize(10);
              doc.setTextColor(100);
              const text = `英语试卷 第 ${i} 页（共 ${pageCount} 页）`;
              const textWidth = doc.getTextWidth(text);
              doc.text(text, (pageWidth - textWidth) / 2, pageHeight - 20);
            }
          }
          const blob = doc.output('blob');
          const filename = `${paper.title}.pdf`;
          
          // Try Smart Save -> Fallback to Browser Download
          const saved = await downloadService.trySmartSave(blob, filename);
          if (!saved) {
             downloadService.triggerBrowserDownload(blob, filename);
          }
        },
        x: margin,
        y: margin,
        width: pageWidth - 2 * margin,
        windowWidth: 800, // Simulate browser width
        autoPaging: 'text',
        html2canvas: { scale: 2, useCORS: true, logging: false }
      });
    } catch (e) {
      console.error('PDF Generation Error', e);
      alert('PDF导出失败，请重试');
    } finally {
      document.body.removeChild(container);
    }
  },

  // Helper for pure browser download without File System API
  triggerBrowserDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Helper to convert Blob to Base64
  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // remove "data:application/xxx;base64," prefix
        const base64 = result.split(',')[1]; 
        resolve(base64);
      };
      reader.onerror = reject;
      reader.onabort = () => reject(new Error('File reading aborted'));
      reader.readAsDataURL(blob);
    });
  },

  // Smart Save: Try local server save first, return true if success
  async trySmartSave(blob: Blob, filename: string): Promise<boolean> {
    try {
      const state = store.getState();
      const downloadPath = state.userSettings?.downloadPath;

      if (!downloadPath) return false;

      const base64 = await this.blobToBase64(blob);
      
      const response = await fetch(`${API_BASE_URL}/save-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          path: downloadPath, 
          filename, 
          data: base64 
        }),
        signal: AbortSignal.timeout(3000) // 3s timeout for check
      });

      if (response.ok) {
        console.log('Smart Save successful:', filename);
        return true;
      }
    } catch (e) {
      console.warn('Smart Save failed (server not reachable or error), falling back to browser download', e);
    }
    return false;
  },

  async downloadBatchDocx(plans: LessonPlan[], language: 'en' | 'zh' = 'zh', onProgress?: (current: number, total: number) => void) {
    let count = 0;
    const usedNames = new Set<string>();
    const total = plans.length;
    
    try {
      for (const plan of plans) {
        try {
          const blob = await generateDocxBlob(plan, language);
          const titleText = language === 'zh' ? plan.title_zh : plan.title_en;
          let title = formatTitle(titleText || `Lesson Plan ${count + 1}`);
          
          // Ensure unique filename
          let baseTitle = title;
          let index = 1;
          while (usedNames.has(title)) {
            title = `${baseTitle} (${index})`;
            index++;
          }
          usedNames.add(title);
          
          const filename = `${title}.docx`;

          // Try Smart Save (Server) -> Fallback to Browser Download
          const saved = await this.trySmartSave(blob, filename);
          if (!saved) {
            this.triggerBrowserDownload(blob, filename);
             // Add delay to prevent browser blocking multiple downloads ONLY if using browser download
            if (plans.length > 1) await new Promise(resolve => setTimeout(resolve, 800));
          } else {
            // If smart saved, we can go faster, but a small delay is still good for server stability
             if (plans.length > 1) await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          count++;
          onProgress?.(count, total);
        } catch (e) {
          console.error(`Failed to generate docx for ${plan.title_en}`, e);
          count++;
          onProgress?.(count, total);
        }
      }
    } catch (e) {
      console.error('Batch export failed', e);
      // Removed throw e to allow batch download to continue processing remaining files
    }
  },

  async downloadBatchPdf(plans: LessonPlan[], language: 'en' | 'zh' = 'zh', onProgress?: (current: number, total: number) => void) {
    let count = 0;
    const usedNames = new Set<string>();
    const total = plans.length;
    
    try {
      for (const plan of plans) {
         try {
           const blob = await generatePdfBlobFromPlan(plan, language);
           const titleText = language === 'zh' ? plan.title_zh : plan.title_en;
           let title = formatTitle(titleText || `Lesson Plan ${count + 1}`);
           
           let baseTitle = title;
           let index = 1;
           while (usedNames.has(title)) {
             title = `${baseTitle} (${index})`;
             index++;
           }
           usedNames.add(title);
           
           const filename = `${title}.pdf`;

           // Try Smart Save (Server) -> Fallback to Browser Download
           const saved = await this.trySmartSave(blob, filename);
           if (!saved) {
             this.triggerBrowserDownload(blob, filename);
             // Add delay to prevent browser blocking multiple downloads
             if (plans.length > 1) await new Promise(resolve => setTimeout(resolve, 800));
           } else {
             if (plans.length > 1) await new Promise(resolve => setTimeout(resolve, 100));
           }
           
           count++;
           onProgress?.(count, total);
         } catch (e) {
           console.error(`Failed to generate PDF for ${plan.title_en}`, e);
           count++;
           onProgress?.(count, total);
         }
      }
    } catch (e) {
      console.error('Batch PDF export failed', e);
      // Removed throw e to allow batch download to continue processing remaining files
    }
  }
};
