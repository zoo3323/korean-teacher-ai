'use client';

import { useState } from 'react';

// ---------------------------------------------------------------------------
// Data shape types matching the JSON schema from /lib/prompts.ts
// ---------------------------------------------------------------------------

interface LiteraryDevice {
  device: string;
  quote: string;
  explanation: string;
}

interface Theme {
  theme: string;
  evidence: string;
}

interface VocabularyItem {
  word: string;
  definition: string;
  difficulty: '상' | '중' | '하';
}

interface StructureSection {
  section: string;
  function: string;
  analysis: string;
}

interface AnalysisData {
  extractedText?: string;
  literaryDevices?: LiteraryDevice[];
  themes?: Theme[];
  vocabulary?: VocabularyItem[];
  structure?: StructureSection[];
}

interface AnalysisPanelProps {
  document: {
    id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analysisJson: any;
    extractedText: string | null;
  };
  onAnalysisComplete: (updatedDoc: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type AnalysisTab = 'literary' | 'themes' | 'vocabulary' | 'structure';

interface TabDefinition {
  id: AnalysisTab;
  label: string;
}

const ANALYSIS_TABS: TabDefinition[] = [
  { id: 'literary', label: '문학 장치' },
  { id: 'themes', label: '주제' },
  { id: 'vocabulary', label: '어휘' },
  { id: 'structure', label: '구조' },
];

// ---------------------------------------------------------------------------
// Difficulty badge
// ---------------------------------------------------------------------------

const DIFFICULTY_STYLES: Record<string, string> = {
  '상': 'bg-red-100 text-red-700',
  '중': 'bg-yellow-100 text-yellow-700',
  '하': 'bg-green-100 text-green-700',
};

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const style = DIFFICULTY_STYLES[difficulty] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${style}`}>
      {difficulty}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tab content panels
// ---------------------------------------------------------------------------

function LiteraryDevicesTab({ items }: { items: LiteraryDevice[] }) {
  if (items.length === 0) {
    return <p className="py-10 text-center text-base text-gray-400">문학 장치 데이터가 없습니다.</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((item, index) => (
        <li key={index} className="rounded-xl border border-gray-200 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-md bg-[#5E6AD2]/10 px-3 py-1 text-sm font-semibold text-[#5E6AD2]">
              {item.device}
            </span>
          </div>
          {item.quote && (
            <blockquote className="mb-3 border-l-2 border-gray-200 pl-4 text-base italic text-gray-500">
              &ldquo;{item.quote}&rdquo;
            </blockquote>
          )}
          <p className="text-base leading-relaxed text-gray-700">{item.explanation}</p>
        </li>
      ))}
    </ul>
  );
}

function ThemesTab({ items }: { items: Theme[] }) {
  if (items.length === 0) {
    return <p className="py-10 text-center text-base text-gray-400">주제 데이터가 없습니다.</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((item, index) => (
        <li key={index} className="rounded-xl border border-gray-200 p-5">
          <h3 className="mb-2 text-base font-semibold text-gray-900">{item.theme}</h3>
          <p className="text-base leading-relaxed text-gray-600">{item.evidence}</p>
        </li>
      ))}
    </ul>
  );
}

function VocabularyTab({ items }: { items: VocabularyItem[] }) {
  if (items.length === 0) {
    return <p className="py-10 text-center text-base text-gray-400">어휘 데이터가 없습니다.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <table className="w-full text-base">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-5 py-3.5 text-left font-semibold text-gray-600">어휘</th>
            <th className="px-5 py-3.5 text-left font-semibold text-gray-600">뜻풀이</th>
            <th className="px-5 py-3.5 text-center font-semibold text-gray-600">난이도</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={index}
              className={index < items.length - 1 ? 'border-b border-gray-200' : ''}
            >
              <td className="px-5 py-4 font-medium text-gray-900">{item.word}</td>
              <td className="px-5 py-4 leading-relaxed text-gray-600">{item.definition}</td>
              <td className="px-5 py-4 text-center">
                <DifficultyBadge difficulty={item.difficulty} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StructureTab({ items }: { items: StructureSection[] }) {
  if (items.length === 0) {
    return <p className="py-10 text-center text-base text-gray-400">구조 데이터가 없습니다.</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((item, index) => (
        <li key={index} className="rounded-xl border border-gray-200 p-5">
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5E6AD2] text-sm font-bold text-white">
              {index + 1}
            </span>
            <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {item.section}
            </span>
          </div>
          <p className="mb-1.5 text-base font-medium text-gray-800">{item.function}</p>
          <p className="text-base leading-relaxed text-gray-600">{item.analysis}</p>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AnalysisPanel({ document, onAnalysisComplete }: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('literary');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const analysis = document.analysisJson as AnalysisData | null;

  async function runAnalysis() {
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/documents/${document.id}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? `분석 실패 (${response.status})`);
      }

      const updatedDoc = await response.json();
      onAnalysisComplete(updatedDoc);
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setErrorMessage(message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  // -------------------------------------------------------------------------
  // Empty state — no analysis yet
  // -------------------------------------------------------------------------

  if (!analysis) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        {errorMessage && (
          <div className="w-full max-w-sm rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className={[
            'flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors',
            isAnalyzing
              ? 'cursor-not-allowed bg-[#5E6AD2]/60'
              : 'bg-[#5E6AD2] hover:bg-[#4B5BC4]',
          ].join(' ')}
        >
          {isAnalyzing ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
              분석 중...
            </>
          ) : (
            'AI 분석 시작'
          )}
        </button>

        {!isAnalyzing && (
          <p className="text-sm text-gray-400 text-center leading-relaxed">
            Claude가 지문을 분석하고<br />
            이미지 위에 교사 필기 스타일로 주석을 그립니다.
          </p>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Analysis results
  // -------------------------------------------------------------------------

  const literaryDevices = analysis.literaryDevices ?? [];
  const themes = analysis.themes ?? [];
  const vocabulary = analysis.vocabulary ?? [];
  const structure = analysis.structure ?? [];

  function renderActiveTab() {
    switch (activeTab) {
      case 'literary':
        return <LiteraryDevicesTab items={literaryDevices} />;
      case 'themes':
        return <ThemesTab items={themes} />;
      case 'vocabulary':
        return <VocabularyTab items={vocabulary} />;
      case 'structure':
        return <StructureTab items={structure} />;
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header row with tab bar and re-analyze button */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4">
        <div className="flex gap-1">
          {ANALYSIS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'border-b-2 -mb-px px-4 py-4 text-base font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-[#5E6AD2] text-[#5E6AD2]'
                  : 'border-transparent text-gray-500 hover:text-gray-900',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className={[
            'flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium transition-colors',
            isAnalyzing
              ? 'cursor-not-allowed text-gray-300'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
          ].join(' ')}
        >
          {isAnalyzing ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"
                aria-hidden="true"
              />
              분석 중...
            </>
          ) : (
            '재분석'
          )}
        </button>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
          {errorMessage}
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-2 underline"
          >
            닫기
          </button>
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderActiveTab()}
      </div>
    </div>
  );
}
