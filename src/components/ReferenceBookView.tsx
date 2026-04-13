'use client';

import { useRef, useState, useLayoutEffect, useEffect, useCallback } from 'react';

export interface RefAnnotation {
  id: string;
  lineNumbers: number[];
  content: string;
  detail: string;
  type: 'literary' | 'theme' | 'vocabulary' | 'structure';
  side: 'left' | 'right';
  color: 'red' | 'blue' | 'green' | 'purple';
}

export interface ReferenceBookData {
  lines: string[];
  summary: string;
  annotations: RefAnnotation[];
  vocabulary: { word: string; definition: string; difficulty: string }[];
}

interface ReferenceBookViewProps {
  data: ReferenceBookData;
}

interface ConnLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

const COLOR_TOKENS = {
  red:    { stroke: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  blue:   { stroke: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  green:  { stroke: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
  purple: { stroke: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
} as const;

const TYPE_LABELS: Record<RefAnnotation['type'], string> = {
  literary:   '문학',
  theme:      '주제',
  vocabulary: '어휘',
  structure:  '구조',
};

const DIFFICULTY_STYLES: Record<string, string> = {
  '상': 'bg-red-100 text-red-700',
  '중': 'bg-yellow-100 text-yellow-700',
  '하': 'bg-green-100 text-green-700',
};

function AnnotationCard({
  annotation,
  refCallback,
}: {
  annotation: RefAnnotation;
  refCallback: (el: HTMLDivElement | null) => void;
}) {
  const tokens = COLOR_TOKENS[annotation.color];

  return (
    <div
      ref={refCallback}
      className="mb-2 rounded-lg p-2.5"
      style={{
        backgroundColor: tokens.bg,
        border: `1px solid ${tokens.border}`,
        borderLeft: `3px solid ${tokens.stroke}`,
        borderRadius: '8px',
      }}
    >
      <span
        className="mb-1 inline-block rounded px-1.5 py-0.5"
        style={{
          fontSize: '8px',
          backgroundColor: tokens.border,
          color: tokens.stroke,
          fontWeight: 600,
        }}
      >
        {TYPE_LABELS[annotation.type]}
      </span>
      <p className="font-bold leading-snug text-gray-800" style={{ fontSize: '13px' }}>
        {annotation.content}
      </p>
      <p className="mt-0.5 leading-snug text-gray-500" style={{ fontSize: '11px' }}>
        {annotation.detail}
      </p>
    </div>
  );
}

function VocabularySection({
  items,
}: {
  items: { word: string; definition: string; difficulty: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="border-t border-gray-200">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-1 px-4 py-3 text-left text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        어휘 풀이 {isOpen ? '▴' : '▾'}
      </button>

      {isOpen && (
        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2 text-left font-semibold text-gray-600">어휘</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">뜻풀이</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-600">난이도</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={index}
                  className={index < items.length - 1 ? 'border-b border-gray-100' : ''}
                >
                  <td className="px-4 py-2 font-medium text-gray-900">{item.word}</td>
                  <td className="px-4 py-2 leading-relaxed text-gray-600">{item.definition}</td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                        DIFFICULTY_STYLES[item.difficulty] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.difficulty}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ReferenceBookView({ data }: ReferenceBookViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<Map<number, HTMLElement | null>>(new Map());
  const annotationRefs = useRef<Map<string, HTMLElement | null>>(new Map());
  const [connections, setConnections] = useState<ConnLine[]>([]);

  const leftAnnotations = data.annotations.filter((a) => a.side === 'left');
  const rightAnnotations = data.annotations.filter((a) => a.side === 'right');

  const firstAnnotationColorByLine = new Map<number, RefAnnotation['color']>();
  for (const ann of data.annotations) {
    for (const lineNum of ann.lineNumbers) {
      if (!firstAnnotationColorByLine.has(lineNum)) {
        firstAnnotationColorByLine.set(lineNum, ann.color);
      }
    }
  }

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const nextConnections: ConnLine[] = [];

    for (const ann of data.annotations) {
      const cardEl = annotationRefs.current.get(ann.id);
      if (!cardEl) continue;

      const cardRect = cardEl.getBoundingClientRect();
      const tokens = COLOR_TOKENS[ann.color];

      for (const lineNum of ann.lineNumbers) {
        const lineEl = lineRefs.current.get(lineNum);
        if (!lineEl) continue;

        const lineRect = lineEl.getBoundingClientRect();

        const cardCenterY = cardRect.top - containerRect.top + cardRect.height / 2;
        const lineCenterY = lineRect.top - containerRect.top + lineRect.height / 2;

        if (ann.side === 'left') {
          const x1 = cardRect.right - containerRect.left;
          const y1 = cardCenterY;
          const x2 = lineRect.left - containerRect.left;
          const y2 = lineCenterY;

          nextConnections.push({
            id: `${ann.id}-line${lineNum}`,
            x1,
            y1,
            x2,
            y2,
            color: tokens.stroke,
          });
        } else {
          const x1 = lineRect.right - containerRect.left;
          const y1 = lineCenterY;
          const x2 = cardRect.left - containerRect.left;
          const y2 = cardCenterY;

          nextConnections.push({
            id: `${ann.id}-line${lineNum}`,
            x1,
            y1,
            x2,
            y2,
            color: tokens.stroke,
          });
        }
      }
    }

    setConnections(nextConnections);
  }, [data]);

  useLayoutEffect(() => {
    recalculate();
  }, [recalculate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(recalculate);
    observer.observe(container);
    return () => observer.disconnect();
  }, [recalculate]);

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white">
      <div
        className="mx-4 mt-4 mb-4 rounded-lg p-3"
        style={{
          backgroundColor: '#F5F3FF',
          border: '1px solid #DDD6FE',
          borderRadius: '8px',
        }}
      >
        <p className="mb-1 font-medium" style={{ fontSize: '11px', color: '#7C3AED' }}>
          작품 요약
        </p>
        <p className="leading-relaxed text-gray-700" style={{ fontSize: '14px' }}>
          {data.summary}
        </p>
      </div>

      <div ref={containerRef} className="relative mx-4 flex" style={{ minHeight: '200px' }}>
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'visible',
            zIndex: 10,
          }}
        >
          {connections.map((conn) => {
            const dx = conn.x2 - conn.x1;
            const cp1x = conn.x1 + dx * 0.4;
            const cp2x = conn.x2 - dx * 0.4;
            return (
              <path
                key={conn.id}
                d={`M ${conn.x1} ${conn.y1} C ${cp1x} ${conn.y1}, ${cp2x} ${conn.y2}, ${conn.x2} ${conn.y2}`}
                fill="none"
                stroke={conn.color}
                strokeWidth={1.5}
                opacity={0.6}
              />
            );
          })}
        </svg>

        <div className="overflow-y-auto py-2" style={{ width: '25%' }}>
          {leftAnnotations.map((ann) => (
            <AnnotationCard
              key={ann.id}
              annotation={ann}
              refCallback={(el) => { annotationRefs.current.set(ann.id, el); }}
            />
          ))}
        </div>

        <div className="overflow-y-auto bg-white py-2" style={{ width: '50%' }}>
          {data.lines.map((line, index) => {
            const lineNum = index + 1;
            const highlightColor = firstAnnotationColorByLine.get(lineNum);
            const borderStyle = highlightColor
              ? `2px solid ${COLOR_TOKENS[highlightColor].stroke}`
              : undefined;

            return (
              <div
                key={lineNum}
                ref={(el) => { lineRefs.current.set(lineNum, el); }}
                className="flex items-baseline gap-3 px-4 py-1.5"
                style={
                  borderStyle
                    ? { borderLeft: borderStyle, borderLeftColor: `${COLOR_TOKENS[highlightColor!].stroke}80` }
                    : undefined
                }
              >
                <span
                  className="w-6 shrink-0 select-none text-right text-gray-400"
                  style={{ fontSize: '12px' }}
                >
                  {lineNum}
                </span>
                <span className="font-serif text-sm leading-relaxed text-gray-800">{line}</span>
              </div>
            );
          })}
        </div>

        <div className="overflow-y-auto py-2" style={{ width: '25%' }}>
          {rightAnnotations.map((ann) => (
            <AnnotationCard
              key={ann.id}
              annotation={ann}
              refCallback={(el) => { annotationRefs.current.set(ann.id, el); }}
            />
          ))}
        </div>
      </div>

      <VocabularySection items={data.vocabulary} />
    </div>
  );
}
