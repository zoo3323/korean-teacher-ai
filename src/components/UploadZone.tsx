"use client";

import { useCallback, useRef, useState } from "react";
import type { DocumentRecord } from "@/components/WorkspaceLayout";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface UploadZoneProps {
  projectId: string;
  onUploaded: (doc: DocumentRecord) => void;
}

export default function UploadZone({ projectId, onUploaded }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateFile(file: File): string | null {
    if (!ACCEPTED_MIME_TYPES.includes(file.type))
      return "JPEG, PNG, WebP, GIF 형식만 지원합니다.";
    if (file.size > MAX_FILE_SIZE_BYTES)
      return `파일 크기는 ${MAX_FILE_SIZE_MB}MB 이하여야 합니다.`;
    return null;
  }

  function selectFile(file: File) {
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setError(null);
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) selectFile(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("projectId", projectId);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `업로드 실패 (${res.status})`);
      }
      const doc: DocumentRecord = await res.json();
      onUploaded(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setUploading(false);
    }
  }

  // 파일 선택 후 미리보기 상태
  if (selectedFile && preview) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
        <div className="w-full max-w-lg">
          {/* 미리보기 */}
          <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="미리보기" className="max-h-64 w-full object-contain bg-gray-50" />
          </div>

          {/* 파일명 */}
          <p className="mt-3 truncate text-center text-sm text-gray-600" title={selectedFile.name}>
            {selectedFile.name}
            <span className="ml-2 text-gray-400">
              ({(selectedFile.size / 1024 / 1024).toFixed(1)}MB)
            </span>
          </p>

          {/* 오류 */}
          {error && (
            <p className="mt-2 text-center text-sm text-red-500">{error}</p>
          )}

          {/* 버튼 */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#5E6AD2] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4B5BC4] disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  업로드 중...
                </>
              ) : "업로드하기"}
            </button>
            <button
              onClick={() => { setSelectedFile(null); setPreview(null); setError(null); }}
              disabled={uploading}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
            >
              다시 선택
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 드롭 존
  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "flex w-full max-w-lg flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-all",
          isDragging
            ? "border-[#5E6AD2] bg-[#5E6AD2]/5 scale-[1.01]"
            : "border-gray-300 hover:border-[#5E6AD2]/60 hover:bg-gray-50",
        ].join(" ")}
      >
        {/* 아이콘 */}
        <div className={`rounded-full p-4 transition-colors ${isDragging ? "bg-[#5E6AD2]/10" : "bg-gray-100"}`}>
          <svg
            className={`h-8 w-8 transition-colors ${isDragging ? "text-[#5E6AD2]" : "text-gray-400"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12h.008v.008H13.5V12zm0 0h.008v.008H13.5V12zm-3 2.25h.008v.008H10.5V14.25zm0 0h.008v.008H10.5V14.25zM6.75 6h.008v.008H6.75V6zM3 3h18" />
          </svg>
        </div>

        <div>
          <p className="text-base font-medium text-gray-700">
            {isDragging ? "여기에 놓으세요!" : "지문 이미지를 업로드하세요"}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            드래그 & 드롭 또는 클릭하여 파일 선택
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            JPEG · PNG · WebP · GIF · 최대 {MAX_FILE_SIZE_MB}MB
          </p>
        </div>

        <div className="rounded-lg border border-[#5E6AD2]/30 bg-[#5E6AD2]/5 px-4 py-2 text-xs text-[#5E6AD2]">
          교재 지문, 시, 소설, 수필 이미지를 업로드하면 AI가 자동 분석합니다
        </div>
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-500">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_MIME_TYPES.join(",")}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); e.target.value = ""; }}
        className="sr-only"
      />
    </div>
  );
}
