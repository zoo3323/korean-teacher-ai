"use client";

import { useRef, useState } from "react";
import type { DocumentRecord } from "@/components/WorkspaceLayout";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

interface SidebarProps {
  documents: DocumentRecord[];
  selectedDocId: string | null;
  onSelect: (id: string) => void;
  projectId: string;
  onDocumentAdded: (doc: DocumentRecord) => void;
  onDocumentDeleted: (id: string) => void;
}

export default function Sidebar({
  documents, selectedDocId, onSelect, projectId, onDocumentAdded, onDocumentDeleted,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setError("JPEG, PNG, WebP, GIF만 가능합니다."); return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("20MB 이하 파일만 가능합니다."); return;
    }

    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("projectId", projectId);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "업로드 실패");
      }
      const doc: DocumentRecord = await res.json();
      onDocumentAdded(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!window.confirm("이 지문을 삭제하시겠습니까?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "삭제 실패");
      }
      onDocumentDeleted(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 오류");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* 브랜딩 헤더 */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5E6AD2]">
          <span className="text-sm font-bold text-white">국</span>
        </div>
        <span className="text-base font-semibold text-gray-900">국어 분석기</span>
      </div>

      {/* 문서 목록 */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {documents.length === 0 ? (
          <div className="px-2 py-10 text-center">
            <p className="text-sm text-gray-400 leading-relaxed">
              오른쪽 화면에서<br />지문 이미지를 업로드하세요.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {documents.map((doc) => {
              const isSelected = selectedDocId === doc.id;
              const isDeleting = deletingId === doc.id;
              return (
                <li key={doc.id}>
                  <button
                    onClick={() => onSelect(doc.id)}
                    title={doc.title}
                    className={[
                      "group relative w-full rounded-lg px-3 py-3 text-left transition-colors",
                      isSelected
                        ? "bg-[#5E6AD2]/10 text-[#5E6AD2] font-medium"
                        : "text-gray-700 hover:bg-gray-100",
                    ].join(" ")}
                  >
                    <span className="block truncate pr-7 text-sm">{doc.title}</span>

                    {/* 삭제 버튼 — hover 시 표시 */}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleDelete(e, doc.id)}
                      onKeyDown={(e) => e.key === "Enter" && handleDelete(e as unknown as React.MouseEvent, doc.id)}
                      title="삭제"
                      className={[
                        "absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md transition-all",
                        isDeleting
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100",
                        isSelected
                          ? "text-[#5E6AD2]/70 hover:bg-[#5E6AD2]/20 hover:text-[#5E6AD2]"
                          : "text-gray-400 hover:bg-red-100 hover:text-red-500",
                      ].join(" ")}
                    >
                      {isDeleting ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* 지문 추가 버튼 */}
      {documents.length > 0 && (
        <div className="border-t border-gray-200 p-3">
          {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-3 text-sm text-gray-500 transition-colors hover:border-[#5E6AD2]/60 hover:text-[#5E6AD2] disabled:opacity-60"
          >
            {uploading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#5E6AD2]" />
                업로드 중...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                지문 추가
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_MIME_TYPES.join(",")}
            onChange={handleFileChange}
            className="sr-only"
          />
        </div>
      )}
    </div>
  );
}
