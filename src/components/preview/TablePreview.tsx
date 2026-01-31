import React from 'react';
import { LessonPlan } from '../../services/geminiService';
import { parseMarkdownProcedures, ProcedureStep } from '../../utils/lessonMapper';

import ReactMarkdown from 'react-markdown';

const containsLatex = (s: string) => /\$.*?\$|\\\(|\\\)|\\\[|\\\]|\\frac|\\sqrt|\\sum|\\int|\\alpha|\\beta|\\gamma|\\cdot|\\times/.test(s);
const ensureMathJax = async () => {
  if ((window as any).MathJax) return;
  await new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js';
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

const MDWithMath: React.FC<{ text: string }> = ({ text }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const work = async () => {
      if (!text || !containsLatex(text)) return;
      await ensureMathJax();
      const mj = (window as any).MathJax;
      if (mj && typeof mj.typesetPromise === 'function' && ref.current) {
        await mj.typesetPromise([ref.current]);
      }
    };
    work();
  }, [text]);
  return (
    <div ref={ref}>
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
};

interface TablePreviewProps {
  data: LessonPlan | null;
  scale: number;
}

export const TablePreview: React.FC<TablePreviewProps> = ({ data, scale }) => {
  if (!data) return <div className="p-4 text-gray-500">No data to display</div>;

  // Parse markdown procedures to UI format
  const parsedProcedures = parseMarkdownProcedures(data.procedures);

  const buildKeywordsDisplay = () => {
    const zh = data.teachingPreparation?.keyWords_zh;
    const en = data.teachingPreparation?.keyWords_en;
    const zhList = Array.isArray(zh) ? zh : zh ? [zh] : [];
    const enList = Array.isArray(en) ? en : en ? [en] : [];
    const maxLength = Math.max(zhList.length, enList.length);
    if (!maxLength) return '';
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
    return pairs.join(', ');
  };

  return (
    <div 
      className="origin-top-left transition-transform duration-200 bg-white shadow-lg mx-auto"
      style={{ 
        transform: `scale(${scale})`, 
        width: '210mm', 
        minHeight: '297mm',
        padding: '10mm',
        boxSizing: 'border-box'
      }}
    >
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold">Teaching Plan 教学计划</h1>
      </div>

      {/* Header Info */}
      <div className="bg-yellow-300 p-1 text-center font-bold border border-black text-sm">Teaching Preparation 教学准备</div>
      <table className="w-full border-collapse border border-black text-xs mb-4">
        <tbody>
          <tr>
            <td className="border border-black p-1 bg-gray-100 w-24 font-bold">Unit</td>
            <td className="border border-black p-1">Title: {data.title_zh}</td>
            <td className="border border-black p-1 bg-gray-100 w-24 font-bold">Ages: {data.grade}</td>
            <td className="border border-black p-1">Time: {data.duration} min</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-gray-50">Learning Objectives<br/>教学目标</td>
            <td className="border border-black p-2" colSpan={3}>
              <pre className="whitespace-pre-wrap font-sans">{Array.isArray(data.teachingPreparation?.objectives_zh) ? data.teachingPreparation?.objectives_zh.join('\n') : data.teachingPreparation?.objectives_zh}</pre>
            </td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-gray-50">Key Words<br/>主单词</td>
            <td className="border border-black p-2">
              <pre className="whitespace-pre-wrap font-sans">{buildKeywordsDisplay()}</pre>
            </td>
            <td className="border border-black p-2 font-bold bg-gray-50">Sentence Structures<br/>句型</td>
            <td className="border border-black p-2">
              <div className="whitespace-pre-wrap font-sans">
                <MDWithMath text={Array.isArray(data.teachingPreparation?.sentenceStructures_zh) ? data.teachingPreparation?.sentenceStructures_zh.join('\n') : (data.teachingPreparation?.sentenceStructures_zh || '')} />
              </div>
            </td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-gray-50">Teaching Aids<br/>教具</td>
            <td className="border border-black p-2" colSpan={3}>
               <pre className="whitespace-pre-wrap font-sans">{data.teachingPreparation?.teachingAids_zh}</pre>
            </td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-gray-50">Analysis of Students<br/>学情分析</td>
            <td className="border border-black p-2" colSpan={3}>
              <pre className="whitespace-pre-wrap font-sans">{data.teachingPreparation?.studentAnalysis_zh}</pre>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Procedures: Card-based list */}
      <div className="bg-yellow-300 p-1 text-center font-bold border border-black text-sm">Teaching Procedures 教学过程</div>
      <div className="space-y-3 mt-2">
        {parsedProcedures.map((proc: ProcedureStep, idx: number) => {
          return (
            <section
              key={idx}
              className="border border-gray-300 rounded-md p-3 shadow-sm"
              style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
            >
              <h3 className="text-sm font-bold text-gray-800 mb-1">
                {proc.title}
                {typeof proc.duration === 'number' ? (
                  <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                    {proc.duration} min
                  </span>
                ) : null}
              </h3>
              {/* Main Content Rendered as Markdown */}
              <div className="prose prose-sm max-w-none text-xs text-gray-800">
                <MDWithMath text={proc.content} />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
