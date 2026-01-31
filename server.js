const express = require('express');
const cors = require('cors');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, Header, Footer, AlignmentType, PageNumber } = require('docx');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for PDF generation if needed

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
    justification: 'Justification'
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
    justification: 'Justification (设计意图)'
  }
};

function getLabels(lang) {
  return LABELS[lang] || LABELS.zh;
}


function buildProceduresByMode(mode) {
  const m = String(mode || '').toLowerCase();
  if (m === 'ppp') {
    return [
      { step: 'Presentation: New Knowledge', duration: 10, teachersTalk: 'Present core language. Students observe and answer.', justification: 'Input and Construction' },
      { step: 'Practice: Consolidation', duration: 20, teachersTalk: 'Guide practice. Students substitute sentences.', justification: 'Automation' },
      { step: 'Production: Application', duration: 15, teachersTalk: 'Set task. Students create dialogues.', justification: 'Transfer and Output' },
    ];
  }
  if (m === 'pwp') {
    return [
      { step: 'Pre-reading: Prediction', duration: 8, teachersTalk: 'Predict and discuss. Students share and associate.', justification: 'Lower difficulty' },
      { step: 'While-reading: Information', duration: 20, teachersTalk: 'Guide intensive reading. Students highlight and answer.', justification: 'Information extraction' },
      { step: 'Post-reading: Extension', duration: 12, teachersTalk: 'Organize discussion. Students summarize and retell.', justification: 'Deepen understanding' },
    ];
  }
  if (m === 'task-based') {
    return [
      { step: 'Pre-task: Preparation', duration: 10, teachersTalk: 'Provide vocabulary. Students prepare materials.', justification: 'Scaffolding' },
      { step: 'Task-cycle: Collaboration', duration: 20, teachersTalk: 'Explain task. Students collaborate.', justification: 'Real communication' },
      { step: 'Post-task: Presentation', duration: 15, teachersTalk: 'Feedback. Students present and reflect.', justification: 'Evaluation' },
    ];
  }
  if (m === 'project-based') {
    return [
      { step: 'Project Launch: Topic', duration: 10, teachersTalk: 'Clarify goals. Students choose topic and group.', justification: 'Direction' },
      { step: 'Project Implementation: Inquiry', duration: 20, teachersTalk: 'Guide methods. Students research and record.', justification: 'Inquiry learning' },
      { step: 'Project Presentation: Show', duration: 15, teachersTalk: 'Organize show. Students report and defend.', justification: 'Output' },
    ];
  }
  if (m === 'ttt') {
    return [
      { step: 'Test 1: Diagnostic', duration: 10, teachersTalk: 'Assign initial task. Students attempt task.', justification: 'Identify gaps' },
      { step: 'Teach: Focused Instruction', duration: 20, teachersTalk: 'Explain difficulties. Students listen and note.', justification: 'Fill gaps' },
      { step: 'Test 2: Consolidation', duration: 15, teachersTalk: 'Assign advanced task. Students apply new knowledge.', justification: 'Verify learning' },
    ];
  }
  return [
    { step: 'Warm-up: Activation', duration: 8, teachersTalk: 'Ask questions. Students interact.', justification: 'Activate background' },
    { step: 'Core Teaching: Presentation', duration: 22, teachersTalk: 'Explain and demonstrate. Students practice and answer.', justification: 'Understand' },
    { step: 'Summary: Consolidation', duration: 10, teachersTalk: 'Summarize. Students retell and apply.', justification: 'Reinforce' },
  ];
}

// Mock Generation API
app.post('/api/generate-lesson', (req, res) => {
  const simulate = req.query.simulate;
  if (simulate === '401') return res.status(401).json({ error: 'Unauthorized' });
  if (simulate === '403') return res.status(403).json({ error: 'Forbidden' });
  if (simulate === '500') return res.status(500).json({ error: 'Internal Server Error' });

  try {
    const params = req.body || {};
    const topic = params.topic || '未命名主题';
    const grade = params.grade || 'Grade';
    const duration = Number(params.duration || 45);
    const mode = params.mode || params.method || 'PPP';

    const lessonPlan = {
      title: `${topic} （${mode}）`,
      grade,
      duration,
      teachingPreparation: {
        objectives: ['清晰学习目标', '可衡量产出'],
        keyWords: ['核心词汇', '功能句型'],
        duration,
        teachingAids: '白板, 投影, 词卡',
        studentAnalysis: '基础水平与学习风格分析',
        sentenceStructures: '功能句型与语法点',
        audienceAnalysis: [ { description: '认知发展与语言水平', type: 'general' } ]
      },
      procedures: buildProceduresByMode(mode)
    };

    res.json(lessonPlan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download DOCX
app.post('/api/lesson-plans/:id/download/docx', async (req, res) => {
  try {
    const lessonPlan = req.body;
    const lang = req.body.language || 'zh'; // Default to Bilingual (zh)
    const labels = getLabels(lang);

    if (!lessonPlan) return res.status(400).json({ error: 'Missing lesson plan data' });

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
                  new TextRun({ text: "Teacher Daily Tool", color: "999999", size: 20 }),
                  new TextRun({ text: "\t" + new Date().toLocaleDateString(), color: "999999", size: 20 }),
                ],
                tabStops: [
                  { type: "right", position: 9000 }, // Approximate right align
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
                    color: "999999",
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
            text: lessonPlan.title || labels.title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: `${labels.grade}: ${lessonPlan.grade || 'N/A'}`, bold: true }),
              new TextRun({ text: ` | ${labels.duration}: ${lessonPlan.duration || 'N/A'} min` }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: labels.teachingPreparation,
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: labels.objectives + ':',
            bold: true,
          }),
          ...(lessonPlan.teachingPreparation?.objectives || []).map(obj => 
            new Paragraph({
              text: obj,
              bullet: { level: 0 }
            })
          ),
           new Paragraph({ text: '' }),
          new Paragraph({
            text: labels.procedures,
            heading: HeadingLevel.HEADING_2,
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: labels.step, bold: true })] }),
                  new TableCell({ children: [new Paragraph({ text: labels.time, bold: true })] }),
                  new TableCell({ children: [new Paragraph({ text: labels.procedures, bold: true })] }),
                ],
              }),
              ...(lessonPlan.procedures || []).map(proc => 
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(proc.step || '')] }),
                    new TableCell({ children: [new Paragraph(String(proc.duration || ''))] }),
                    new TableCell({ children: [new Paragraph(proc.teachersTalk || '')] }),
                  ],
                })
              ),
            ],
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Disposition', `attachment; filename=lesson-plan.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (error) {
    console.error('Docx generation error:', error);
    res.status(500).json({ error: 'Failed to generate DOCX' });
  }
});

// Download PDF
app.post('/api/lesson-plans/:id/download/pdf', async (req, res) => {
  try {
    const lessonPlan = req.body;
    const lang = req.body.language || 'zh'; // Default to Bilingual (zh)
    const labels = getLabels(lang);

    if (!lessonPlan) return res.status(400).json({ error: 'Missing lesson plan data' });

    // Simple HTML template for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap');
          body { 
            font-family: 'Noto Sans SC', 'Microsoft YaHei', 'SimSun', Arial, sans-serif; 
            padding: 40px; 
          }
          h1 { text-align: center; color: #333; }
          .meta { margin-bottom: 20px; color: #666; text-align: center; }
          .section { margin-bottom: 30px; }
          h2 { border-bottom: 2px solid #eee; padding-bottom: 10px; color: #444; }
          h3 { margin: 0 0 6px 0; font-size: 14px; color: #333; }
          ul { line-height: 1.6; margin: 0; padding-left: 18px; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid; }
          blockquote { background: #f5f5f5; border-left: 4px solid #ccc; margin: 8px 0; padding: 8px 12px; color: #333; }
          .badge { display: inline-block; background: #e6f0ff; color: #2b6cb0; padding: 2px 8px; border-radius: 999px; font-size: 11px; margin-left: 6px; }
        </style>
      </head>
      <body>
        <h1>${lessonPlan.title || labels.title}</h1>
        <div class="meta">
          <span>${labels.grade}: ${lessonPlan.grade || 'N/A'}</span> | 
          <span>${labels.duration}: ${lessonPlan.duration || 'N/A'} min</span>
        </div>

        <div class="section">
          <h2>${labels.teachingPreparation}</h2>
          <p><strong>${labels.objectives}:</strong></p>
          <ul>
            ${(lessonPlan.teachingPreparation?.objectives || []).map(obj => `<li>${obj}</li>`).join('')}
          </ul>
          <p><strong>${labels.keyWords}:</strong> ${(lessonPlan.teachingPreparation?.keyWords || []).join(', ')}</p>
          <p><strong>${labels.teachingAids}:</strong> ${lessonPlan.teachingPreparation?.teachingAids || ''}</p>
        </div>

        <div class="section">
          <h2>${labels.procedures}</h2>
          ${(lessonPlan.procedures || []).map(proc => {
            const justLines = String(proc.justification || '').split('\\n').filter(Boolean);
            return `
              <section class="card">
                <h3>${proc.step || ''}${proc.duration ? `<span class="badge">${proc.duration} min</span>` : ''}</h3>
                ${proc.teachersTalk ? `<blockquote>${proc.teachersTalk}</blockquote>` : ''}
                <ul>
                  ${justLines.map(s => `<li>${s}</li>`).join('')}
                </ul>
              </section>
            `;
          }).join('')}
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; color: #666; width: 100%; text-align: center; border-bottom: 1px solid #000; padding-bottom: 5px; margin: 0 20px; display: flex; justify-content: space-between; font-family: 'Microsoft YaHei', sans-serif;">
            <span>Teacher Daily Tool</span>
            <span>${new Date().toLocaleDateString()}</span>
        </div>`,
      footerTemplate: `
        <div style="font-size: 10px; color: #666; width: 100%; text-align: center; border-top: 1px solid #000; padding-top: 5px; margin: 0 20px; font-family: 'Microsoft YaHei', sans-serif;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>`,
      margin: { top: '80px', bottom: '80px', left: '40px', right: '40px' }
    });
    
    await browser.close();

    res.setHeader('Content-Disposition', `attachment; filename=lesson-plan.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Generic File Save API (for Smart Path feature)
app.post('/api/save-file', (req, res) => {
  try {
    const { path: targetDir, filename, data } = req.body;
    
    if (!targetDir || !filename || !data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Ensure directory exists
    if (!fs.existsSync(targetDir)) {
      try {
        fs.mkdirSync(targetDir, { recursive: true });
      } catch (e) {
        return res.status(500).json({ error: 'Failed to create directory' });
      }
    }

    const filePath = path.join(targetDir, filename);
    const buffer = Buffer.from(data, 'base64');
    
    fs.writeFileSync(filePath, buffer);
    console.log(`File saved silently to: ${filePath}`);
    
    res.json({ success: true, path: filePath });
  } catch (error) {
    console.error('Save file error:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});
