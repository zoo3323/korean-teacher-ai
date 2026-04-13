'use client';

import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuestionType = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'FILL_IN_BLANK' | 'VOCABULARY';

interface MultipleChoiceQuestion {
  question: string;
  options: string[];
  answer: number; // 1-based index
  explanation: string;
}

interface OpenQuestion {
  question: string;
  answer: string;
  explanation: string;
}

type QuestionItem = MultipleChoiceQuestion | OpenQuestion;

interface QuestionSet {
  id: string;
  documentId: string;
  questionType: string;
  questionsJson: QuestionItem[] | { questions: QuestionItem[] };
  createdAt: string;
}

interface QuestionGeneratorProps {
  document: {
    id: string;
    extractedText: string | null;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'MULTIPLE_CHOICE', label: '객관식 5지선다' },
  { value: 'SHORT_ANSWER', label: '서술형/단답형' },
  { value: 'FILL_IN_BLANK', label: '빈칸 추론' },
  { value: 'VOCABULARY', label: '어휘·문법' },
];

const COUNT_OPTIONS = [3, 5, 10] as const;
type QuestionCount = (typeof COUNT_OPTIONS)[number];

// Korean circled numbers ①–⑤
const CIRCLED_NUMBERS = ['①', '②', '③', '④', '⑤'] as const;

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: '객관식',
  SHORT_ANSWER: '서술형',
  FILL_IN_BLANK: '빈칸',
  VOCABULARY: '어휘',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeQuestions(raw: QuestionSet['questionsJson']): QuestionItem[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && 'questions' in raw && Array.isArray(raw.questions)) {
    return raw.questions;
  }
  return [];
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isMultipleChoice(q: QuestionItem): q is MultipleChoiceQuestion {
  return Array.isArray((q as MultipleChoiceQuestion).options);
}

// ---------------------------------------------------------------------------
// Single question renderer
// ---------------------------------------------------------------------------

function QuestionCard({ question, index }: { question: QuestionItem; index: number }) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="mb-3 text-sm font-medium leading-relaxed text-gray-900">
        <span className="mr-1 font-bold text-[#5E6AD2]">{index + 1}.</span>
        {question.question}
      </p>

      {isMultipleChoice(question) && question.options.length > 0 && (
        <ol className="mb-3 space-y-1.5">
          {question.options.map((option, optIdx) => (
            <li key={optIdx} className="flex gap-2 text-sm text-gray-700">
              <span className="shrink-0 text-gray-400">{CIRCLED_NUMBERS[optIdx] ?? optIdx + 1}</span>
              <span className="leading-relaxed">{option}</span>
            </li>
          ))}
        </ol>
      )}

      <button
        onClick={() => setIsRevealed((prev) => !prev)}
        className="flex items-center gap-1 text-xs font-medium text-[#5E6AD2] hover:underline"
      >
        {isRevealed ? '정답/해설 숨기기' : '정답/해설 보기'}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3.5 w-3.5 transition-transform ${isRevealed ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isRevealed && (
        <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm">
          {isMultipleChoice(question) ? (
            <p className="mb-1 text-gray-800">
              <span className="font-semibold text-gray-900">정답: </span>
              {CIRCLED_NUMBERS[(question.answer ?? 1) - 1] ?? question.answer}
            </p>
          ) : (
            <p className="mb-1 text-gray-800">
              <span className="font-semibold text-gray-900">정답: </span>
              {(question as OpenQuestion).answer}
            </p>
          )}
          <p className="text-gray-600">
            <span className="font-semibold text-gray-900">해설: </span>
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question set card
// ---------------------------------------------------------------------------

interface QuestionSetCardProps {
  set: QuestionSet;
  onDelete: (id: string) => void;
  onRegenerate: (type: QuestionType, count: number) => void;
}

function QuestionSetCard({ set, onDelete, onRegenerate }: QuestionSetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const questions = normalizeQuestions(set.questionsJson);
  const typeLabel = QUESTION_TYPE_LABELS[set.questionType] ?? set.questionType;

  return (
    <div className="rounded-lg border border-gray-200">
      {/* Card header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-md bg-[#5E6AD2]/10 px-2 py-0.5 text-xs font-semibold text-[#5E6AD2]">
            {typeLabel}
          </span>
          <span className="truncate text-xs text-gray-400">{formatDate(set.createdAt)}</span>
          <span className="shrink-0 text-xs text-gray-400">· {questions.length}문항</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() =>
              onRegenerate(set.questionType as QuestionType, questions.length || 5)
            }
            title="재생성"
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            재생성
          </button>
          <button
            onClick={() => onDelete(set.id)}
            title="삭제"
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            삭제
          </button>
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? '접기' : '펼치기'}
            className="rounded-md border border-gray-200 p-1 text-gray-500 hover:bg-gray-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Question list */}
      {isExpanded && questions.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3">
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <QuestionCard key={idx} question={q} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function QuestionGenerator({ document }: QuestionGeneratorProps) {
  const [selectedType, setSelectedType] = useState<QuestionType>('MULTIPLE_CHOICE');
  const [selectedCount, setSelectedCount] = useState<QuestionCount>(5);
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing question sets on mount and whenever the document changes
  useEffect(() => {
    async function fetchQuestionSets() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetch(`/api/documents/${document.id}/questions`);
        if (!response.ok) {
          throw new Error(`문제 목록 조회 실패 (${response.status})`);
        }
        const data: QuestionSet[] = await response.json();
        setQuestionSets(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchQuestionSets();
  }, [document.id]);

  async function handleGenerate(type: QuestionType = selectedType, count: number = selectedCount) {
    if (!document.extractedText) {
      setErrorMessage('먼저 AI 분석을 실행하여 텍스트를 추출해 주세요.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/documents/${document.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionType: type, count }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? `문제 생성 실패 (${response.status})`);
      }

      const newSet: QuestionSet = await response.json();
      // Prepend so the freshest set appears at the top
      setQuestionSets((prev) => [newSet, ...prev]);
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDelete(setId: string) {
    // Optimistic removal — no dedicated delete endpoint exists yet, so we just
    // remove from local state. If a DELETE endpoint is added later, call it here.
    setQuestionSets((prev) => prev.filter((s) => s.id !== setId));
  }

  // -------------------------------------------------------------------------
  // Empty state — no extracted text
  // -------------------------------------------------------------------------

  if (!document.extractedText) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="max-w-xs text-center text-sm leading-relaxed text-gray-400">
          AI 분석을 먼저 실행하면 지문 텍스트가 추출되고, 이후 문제를 생성할 수 있습니다.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main UI
  // -------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Generation controls */}
      <div className="shrink-0 space-y-4 border-b border-gray-200 p-4">
        {/* Question type selector */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">문제 유형</p>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedType(option.value)}
                className={[
                  'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                  selectedType === option.value
                    ? 'border-[#5E6AD2] bg-[#5E6AD2]/10 text-[#5E6AD2]'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Count selector */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">문항 수</p>
          <div className="flex gap-2">
            {COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                onClick={() => setSelectedCount(count)}
                className={[
                  'rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors',
                  selectedCount === count
                    ? 'border-[#5E6AD2] bg-[#5E6AD2]/10 text-[#5E6AD2]'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                ].join(' ')}
              >
                {count}문항
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={() => handleGenerate()}
          disabled={isGenerating}
          className={[
            'flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white transition-colors',
            isGenerating
              ? 'cursor-not-allowed bg-[#5E6AD2]/60'
              : 'bg-[#5E6AD2] hover:bg-[#4B5BC4]',
          ].join(' ')}
        >
          {isGenerating ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
              문제 생성 중...
            </>
          ) : (
            '문제 생성'
          )}
        </button>
      </div>

      {/* Question sets list */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#5E6AD2]"
              aria-hidden="true"
            />
          </div>
        ) : questionSets.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">
            아직 생성된 문제가 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {questionSets.map((set) => (
              <QuestionSetCard
                key={set.id}
                set={set}
                onDelete={handleDelete}
                onRegenerate={(type, count) => handleGenerate(type, count)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
