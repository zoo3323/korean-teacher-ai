"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import ExtractedTextEditor from "@/components/ExtractedTextEditor";
import QuestionGenerator from "@/components/QuestionGenerator";
import ExportMenu from "@/components/ExportMenu";
import UploadZone from "@/components/UploadZone";
import DocumentTab from "@/components/DocumentTab";
import TextbookAnalysisView from "@/components/TextbookAnalysisView";
import type { TextbookAnalysisData } from "@/components/TextbookAnalysisView";

const CanvasEditor = dynamic(() => import("@/components/CanvasEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      캔버스 로딩 중…
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface DocumentRecord {
  id: string;
  projectId: string;
  title: string;
  imageUrl: string;
  extractedText: string | null;
  analysisJson: unknown | null;
  canvasState: unknown | null;
  createdAt: string;
  updatedAt: string;
  questionSets?: unknown[];
}

export interface ProjectRecord {
  id: string;
  shareToken: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  documents: DocumentRecord[];
}

type ActiveTab = "document" | "manual" | "ai-analysis" | "questions";
type ManualSubTab = "draw" | "memo";
type AsyncStatus = "idle" | "running" | "done" | "error";

const TABS: { id: ActiveTab; label: string }[] = [
  { id: "document",    label: "지문" },
  { id: "manual",      label: "직접 분석" },
  { id: "ai-analysis", label: "AI 분석" },
  { id: "questions",   label: "문제 생성" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WorkspaceLayout({ project }: { project: ProjectRecord }) {
  const [documents, setDocuments] = useState<DocumentRecord[]>(project.documents);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    project.documents[0]?.id ?? null
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("document");
  const [manualSubTab, setManualSubTab] = useState<ManualSubTab>("draw");

  // Async statuses — lifted here so tab switches don't cancel in-flight requests
  const [ocrStatus, setOcrStatus] = useState<AsyncStatus>("idle");
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AsyncStatus>("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);

  const canvasAreaRef = useRef<HTMLDivElement>(null);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) ?? null;

  // Reset statuses when the selected document changes
  useEffect(() => {
    setOcrStatus(selectedDoc?.extractedText ? "done" : "idle");
    setAiStatus(selectedDoc?.analysisJson ? "done" : "idle");
    setOcrError(null);
    setAiError(null);
    setActiveTab("document");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocId]);

  // ── Document mutations ──────────────────────────────────────────────────

  function handleDocumentAdded(doc: DocumentRecord) {
    setDocuments((prev) => [...prev, doc]);
    setSelectedDocId(doc.id);
    setActiveTab("document");
  }

  function handleDocumentUpdated(updated: Partial<DocumentRecord>) {
    setDocuments((prev) =>
      prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d))
    );
  }

  function handleDocumentDeleted(id: string) {
    setDocuments((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (selectedDocId === id) setSelectedDocId(next[0]?.id ?? null);
      return next;
    });
  }

  // ── Analysis editing ───────────────────────────────────────────────────

  async function handleAnalysisUpdate(updated: TextbookAnalysisData) {
    if (!selectedDoc) return;
    handleDocumentUpdated({ id: selectedDoc.id, analysisJson: updated });
    try {
      await fetch(`/api/documents/${selectedDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisJson: updated }),
      });
    } catch {
      // Non-critical — local state is already updated
    }
  }

  // ── Async actions (state persists across tab switches) ──────────────────

  async function handleExtract() {
    if (!selectedDoc) return;
    setOcrStatus("running");
    setOcrError(null);
    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}/extract`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "추출 실패");
      }
      handleDocumentUpdated(await res.json());
      setOcrStatus("done");
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : "오류 발생");
      setOcrStatus("error");
    }
  }

  async function handleAIAnalysis() {
    if (!selectedDoc) return;
    setAiStatus("running");
    setAiError(null);
    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}/analyze`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "분석 실패");
      }
      handleDocumentUpdated(await res.json());
      setAiStatus("done");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "오류 발생");
      setAiStatus("error");
    }
  }

  // ── Tab content ────────────────────────────────────────────────────────

  function renderTabContent() {
    if (!selectedDoc) {
      return <UploadZone projectId={project.id} onUploaded={handleDocumentAdded} />;
    }

    switch (activeTab) {
      // ── 지문 ──────────────────────────────────────────────────────────
      case "document":
        return (
          <DocumentTab
            document={selectedDoc}
            ocrStatus={ocrStatus}
            ocrError={ocrError}
            onExtract={handleExtract}
            onGoTo={(tab) => setActiveTab(tab)}
          />
        );

      // ── 직접 분석 ─────────────────────────────────────────────────────
      case "manual":
        return (
          <div className="flex h-full flex-col">
            {/* Sub-toggle */}
            <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 px-4 py-2">
              {(["draw", "memo"] as ManualSubTab[]).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setManualSubTab(sub)}
                  className={[
                    "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    manualSubTab === sub
                      ? "bg-[#5E6AD2] text-white"
                      : "text-gray-600 hover:bg-gray-100",
                  ].join(" ")}
                >
                  {sub === "draw" ? "그리기" : "메모"}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {manualSubTab === "draw" ? (
                <CanvasEditor
                  document={{
                    id: selectedDoc.id,
                    imageUrl: selectedDoc.imageUrl,
                    canvasState: selectedDoc.canvasState,
                  }}
                  onSave={(canvasState) =>
                    handleDocumentUpdated({ id: selectedDoc.id, canvasState })
                  }
                />
              ) : (
                <ExtractedTextEditor
                  document={{
                    id: selectedDoc.id,
                    extractedText: selectedDoc.extractedText,
                  }}
                  onTextChange={(extractedText) =>
                    handleDocumentUpdated({ id: selectedDoc.id, extractedText })
                  }
                />
              )}
            </div>
          </div>
        );

      // ── AI 분석 ───────────────────────────────────────────────────────
      case "ai-analysis": {
        const analysisData = selectedDoc.analysisJson as TextbookAnalysisData | null;

        if (aiStatus === "running") {
          return (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#5E6AD2]" />
              <p className="text-base text-gray-500">AI가 지문을 분석하고 있습니다…</p>
              <p className="text-sm text-gray-400">다른 탭으로 이동해도 분석이 계속됩니다.</p>
            </div>
          );
        }

        if ((aiStatus === "done" || aiStatus === "idle") && analysisData?.lines) {
          return (
            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-3">
                <span className="text-sm text-gray-500">AI 분석 결과</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingAnalysis((prev) => !prev)}
                    className={[
                      "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                      isEditingAnalysis
                        ? "border-[#5E6AD2] bg-[#5E6AD2]/10 text-[#5E6AD2]"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {isEditingAnalysis ? "편집 완료" : "편집"}
                  </button>
                  <button
                    onClick={handleAIAnalysis}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    재분석
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <TextbookAnalysisView
                  data={analysisData}
                  isEditing={isEditingAnalysis}
                  onUpdate={handleAnalysisUpdate}
                />
              </div>
            </div>
          );
        }

        // idle / error — show run button
        return (
          <div className="flex h-full flex-col items-center justify-center gap-5 p-8">
            {aiError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {aiError}
              </div>
            )}
            {!selectedDoc.extractedText ? (
              <div className="text-center">
                <p className="text-base text-gray-500">먼저 텍스트를 추출해야 합니다.</p>
                <button
                  onClick={() => setActiveTab("document")}
                  className="mt-3 text-sm text-[#5E6AD2] underline"
                >
                  지문 탭으로 이동 →
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={handleAIAnalysis}
                  className="rounded-xl bg-[#5E6AD2] px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-[#4B5BC4]"
                >
                  AI 분석 시작
                </button>
                <p className="text-sm text-gray-400 text-center leading-relaxed">
                  추출된 텍스트를 참고서 형식으로 분석합니다.<br />
                  행별 주석과 연결선으로 시각화됩니다.
                </p>
              </>
            )}
          </div>
        );
      }

      // ── 문제 생성 ─────────────────────────────────────────────────────
      case "questions":
        return (
          <QuestionGenerator
            document={{
              id: selectedDoc.id,
              extractedText: selectedDoc.extractedText,
              analysisJson: selectedDoc.analysisJson,
            }}
          />
        );
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden bg-white">
      {/* Sidebar */}
      <aside className="w-[280px] shrink-0 border-r border-gray-200">
        <Sidebar
          documents={documents}
          selectedDocId={selectedDocId}
          onSelect={(id) => setSelectedDocId(id)}
          projectId={project.id}
          onDocumentAdded={handleDocumentAdded}
          onDocumentDeleted={handleDocumentDeleted}
        />
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden" id="workspace-capture-target">
        {/* Tab bar */}
        {selectedDoc && (
          <header className="flex shrink-0 items-center gap-1 border-b border-gray-200 px-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "border-b-2 -mb-px px-4 py-4 text-base font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-[#5E6AD2] text-[#5E6AD2]"
                    : "border-transparent text-gray-500 hover:text-gray-900",
                ].join(" ")}
              >
                {tab.label}
                {/* Running indicators in tab labels */}
                {tab.id === "document" && ocrStatus === "running" && (
                  <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 align-middle" />
                )}
                {tab.id === "ai-analysis" && aiStatus === "running" && (
                  <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#5E6AD2] align-middle animate-pulse" />
                )}
              </button>
            ))}
            <div className="ml-auto">
              <ExportMenu
                document={{
                  id: selectedDoc.id,
                  title: selectedDoc.title,
                  imageUrl: selectedDoc.imageUrl,
                }}
              />
            </div>
          </header>
        )}

        {/* Content */}
        <main ref={canvasAreaRef} className="flex-1 overflow-auto">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}
