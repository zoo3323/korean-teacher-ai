"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import AnalysisPanel from "@/components/AnalysisPanel";
import ExtractedTextEditor from "@/components/ExtractedTextEditor";
import QuestionGenerator from "@/components/QuestionGenerator";
import ExportMenu from "@/components/ExportMenu";
import UploadZone from "@/components/UploadZone";

const CanvasEditor = dynamic(() => import("@/components/CanvasEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      캔버스 로딩 중...
    </div>
  ),
});

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

type ActiveTab = "canvas" | "text" | "analysis" | "questions";

const TABS: { id: ActiveTab; label: string }[] = [
  { id: "canvas", label: "캔버스 필기" },
  { id: "text", label: "텍스트 편집" },
  { id: "analysis", label: "AI 분석" },
  { id: "questions", label: "문제 생성" },
];

interface WorkspaceLayoutProps {
  project: ProjectRecord;
}

export default function WorkspaceLayout({ project }: WorkspaceLayoutProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>(project.documents);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    project.documents[0]?.id ?? null
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("canvas");
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) ?? null;

  function handleDocumentAdded(doc: DocumentRecord) {
    setDocuments((prev) => [...prev, doc]);
    setSelectedDocId(doc.id);
    setActiveTab("canvas");
  }

  function handleDocumentUpdated(updated: Partial<DocumentRecord>) {
    setDocuments((prev) =>
      prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d))
    );
  }

  function renderTabContent() {
    if (!selectedDoc) {
      // 문서가 없으면 메인 영역에 큰 업로드 존 표시
      return (
        <UploadZone
          projectId={project.id}
          onUploaded={handleDocumentAdded}
        />
      );
    }

    switch (activeTab) {
      case "canvas":
        return (
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
        );
      case "text":
        return (
          <ExtractedTextEditor
            document={{
              id: selectedDoc.id,
              extractedText: selectedDoc.extractedText,
            }}
            onTextChange={(extractedText) =>
              handleDocumentUpdated({ id: selectedDoc.id, extractedText })
            }
          />
        );
      case "analysis":
        return (
          <AnalysisPanel
            document={{
              id: selectedDoc.id,
              analysisJson: selectedDoc.analysisJson,
              extractedText: selectedDoc.extractedText,
            }}
            onAnalysisComplete={(updatedDoc) => handleDocumentUpdated(updatedDoc)}
          />
        );
      case "questions":
        return (
          <QuestionGenerator
            document={{
              id: selectedDoc.id,
              extractedText: selectedDoc.extractedText,
            }}
          />
        );
    }
  }

  return (
    <div className="flex h-full overflow-hidden bg-white">
      {/* Sidebar */}
      <aside className="w-[240px] shrink-0 border-r border-gray-200">
        <Sidebar
          documents={documents}
          selectedDocId={selectedDocId}
          onSelect={(id) => {
            setSelectedDocId(id);
            setActiveTab("canvas");
          }}
          projectId={project.id}
          onDocumentAdded={handleDocumentAdded}
        />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden" id="workspace-capture-target">
        {/* Tab bar — 문서가 선택됐을 때만 표시 */}
        {selectedDoc && (
          <header className="flex shrink-0 items-center gap-1 border-b border-gray-200 px-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "px-3 py-3 text-sm font-medium transition-colors",
                  "border-b-2 -mb-px",
                  activeTab === tab.id
                    ? "border-[#5E6AD2] text-[#5E6AD2]"
                    : "border-transparent text-gray-500 hover:text-gray-900",
                ].join(" ")}
              >
                {tab.label}
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

        {/* Tab content */}
        <main ref={canvasAreaRef} className="flex-1 overflow-auto">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}
