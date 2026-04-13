"use client";

import type { DocumentRecord } from "@/components/WorkspaceLayout";

interface DocumentTabProps {
  document: DocumentRecord;
  ocrStatus: "idle" | "running" | "done" | "error";
  ocrError: string | null;
  onExtract: () => void;
  onGoTo: (tab: "manual" | "ai-analysis" | "questions") => void;
}

export default function DocumentTab({
  document,
  ocrStatus,
  ocrError,
  onExtract,
  onGoTo,
}: DocumentTabProps) {
  const hasText = !!document.extractedText;
  const hasAnalysis = !!document.analysisJson;

  return (
    <div className="flex h-full">
      {/* 왼쪽: 이미지 미리보기 */}
      <div className="flex flex-1 items-center justify-center overflow-hidden bg-gray-50 p-8 border-r border-gray-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={document.imageUrl}
          alt={document.title}
          className="max-h-full max-w-full rounded-md object-contain shadow-md"
        />
      </div>

      {/* 오른쪽: 단계별 컨트롤 */}
      <div className="flex w-[340px] shrink-0 flex-col gap-8 overflow-y-auto p-8">
        {/* 지문 정보 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{document.title}</h2>
          <p className="mt-1 text-sm text-gray-400">업로드된 지문 이미지</p>
        </div>

        {/* ── 1단계: 텍스트 추출 ──────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5E6AD2] text-xs font-bold text-white">
              1
            </span>
            <h3 className="text-base font-semibold text-gray-800">텍스트 추출</h3>
          </div>

          {ocrStatus === "done" ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="mb-2 flex items-center gap-1.5">
                <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-green-700">추출 완료</span>
              </div>
              <p className="line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-gray-600">
                {document.extractedText?.slice(0, 220)}
                {(document.extractedText?.length ?? 0) > 220 && "…"}
              </p>
              <button
                onClick={onExtract}
                className="mt-2 text-xs text-gray-400 underline hover:text-gray-600"
              >
                다시 추출
              </button>
            </div>
          ) : (
            <>
              {ocrError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {ocrError}
                </p>
              )}
              <button
                onClick={onExtract}
                disabled={ocrStatus === "running"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-base font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-60"
              >
                {ocrStatus === "running" ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    추출 중…
                  </>
                ) : (
                  "텍스트 추출"
                )}
              </button>
              <p className="text-xs text-gray-400">Claude Vision으로 이미지에서 원문을 추출합니다.</p>
            </>
          )}
        </section>

        {/* ── 2단계: 분석 방법 (텍스트 있을 때만) ─────── */}
        {hasText && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5E6AD2] text-xs font-bold text-white">
                2
              </span>
              <h3 className="text-base font-semibold text-gray-800">분석 방법 선택</h3>
            </div>

            {/* 직접 분석 */}
            <button
              onClick={() => onGoTo("manual")}
              className="group flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-[#5E6AD2]/50 hover:bg-[#5E6AD2]/5"
            >
              <div>
                <p className="text-sm font-semibold text-gray-800">직접 분석</p>
                <p className="mt-0.5 text-xs text-gray-400">이미지에 직접 그리거나 메모 작성</p>
              </div>
              <svg className="h-5 w-5 text-gray-400 transition-colors group-hover:text-[#5E6AD2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* AI 분석 */}
            <button
              onClick={() => onGoTo("ai-analysis")}
              className="group flex w-full items-center justify-between rounded-xl border border-[#5E6AD2]/30 bg-[#5E6AD2]/5 p-4 text-left transition-all hover:border-[#5E6AD2]/60 hover:bg-[#5E6AD2]/10"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#5E6AD2]">AI 분석</p>
                  {hasAnalysis && (
                    <span className="rounded-full bg-[#5E6AD2] px-1.5 py-0.5 text-[10px] font-medium text-white">
                      완료
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[#5E6AD2]/70">참고서 스타일 자동 분석</p>
              </div>
              <svg className="h-5 w-5 text-[#5E6AD2]/60 transition-colors group-hover:text-[#5E6AD2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </section>
        )}

        {/* ── 3단계: 문제 생성 (텍스트 있을 때만) ──────── */}
        {hasText && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5E6AD2] text-xs font-bold text-white">
                3
              </span>
              <h3 className="text-base font-semibold text-gray-800">문제 생성</h3>
            </div>
            <button
              onClick={() => onGoTo("questions")}
              className="group flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 hover:bg-gray-50"
            >
              <div>
                <p className="text-sm font-semibold text-gray-800">문제 생성</p>
                <p className="mt-0.5 text-xs text-gray-400">수능/내신 유형 자동 출제</p>
              </div>
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
