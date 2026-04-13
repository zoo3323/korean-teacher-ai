"use client";

import { useCallback, useRef, useState } from "react";
import type { DocumentRecord } from "@/components/WorkspaceLayout";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface ImageUploaderProps {
  projectId: string;
  onUploaded: (doc: DocumentRecord) => void;
}

type UploadStatus = "idle" | "uploading" | "error";

export default function ImageUploader({ projectId, onUploaded }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // -------------------------------------------------------------------------
  // File validation
  // -------------------------------------------------------------------------

  function validateFile(file: File): string | null {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      return "JPEG, PNG, WebP, GIF 형식의 이미지만 업로드할 수 있습니다.";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `파일 크기는 ${MAX_FILE_SIZE_MB}MB 이하여야 합니다.`;
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // File selection — shared between click-to-browse and drag-and-drop
  // -------------------------------------------------------------------------

  function handleFileSelected(file: File) {
    setErrorMessage(null);

    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSelectedFile(file);

    // Generate a local object URL for the preview thumbnail
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploadStatus("idle");
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleFileSelected(file);
    // Reset input value so the same file can be re-selected after a cancel
    event.target.value = "";
  }

  // -------------------------------------------------------------------------
  // Drag-and-drop handlers
  // -------------------------------------------------------------------------

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDraggingOver(false);

    const file = event.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Upload
  // -------------------------------------------------------------------------

  async function handleUpload() {
    if (!selectedFile) return;

    setUploadStatus("uploading");
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("projectId", projectId);

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? `업로드 실패 (${response.status})`);
      }

      const doc: DocumentRecord = await response.json();
      onUploaded(doc);

      // Reset state after successful upload
      setSelectedFile(null);
      setPreview(null);
      setUploadStatus("idle");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setErrorMessage(message);
      setUploadStatus("error");
    }
  }

  function handleCancel() {
    setSelectedFile(null);
    setPreview(null);
    setUploadStatus("idle");
    setErrorMessage(null);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  // --- Preview + upload controls ---
  if (selectedFile && preview) {
    return (
      <div className="space-y-2">
        {/* Thumbnail */}
        <div className="relative overflow-hidden rounded-md border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="미리보기"
            className="h-24 w-full object-cover"
          />
        </div>

        {/* File name */}
        <p className="truncate text-xs text-gray-500" title={selectedFile.name}>
          {selectedFile.name}
        </p>

        {/* Error message */}
        {errorMessage && (
          <p className="text-xs text-red-500">{errorMessage}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={uploadStatus === "uploading"}
            className={[
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              uploadStatus === "uploading"
                ? "cursor-not-allowed bg-[#5E6AD2]/60 text-white"
                : "bg-[#5E6AD2] text-white hover:bg-[#4B5BC4]",
            ].join(" ")}
          >
            {uploadStatus === "uploading" ? (
              <>
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden="true"
                />
                업로드 중...
              </>
            ) : (
              "업로드"
            )}
          </button>

          <button
            onClick={handleCancel}
            disabled={uploadStatus === "uploading"}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  // --- Drop zone ---
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "flex w-full flex-col items-center gap-1.5 rounded-md border-2 border-dashed px-3 py-4 text-center transition-colors",
          isDraggingOver
            ? "border-[#5E6AD2] bg-[#5E6AD2]/5"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
        ].join(" ")}
      >
        {/* Upload icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 transition-colors ${isDraggingOver ? "text-[#5E6AD2]" : "text-gray-400"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>

        <span className="text-xs text-gray-500">
          {isDraggingOver ? "여기에 놓기" : "이미지 끌어다 놓기 또는 클릭"}
        </span>
        <span className="text-[11px] text-gray-400">
          JPEG · PNG · WebP · GIF · 최대 {MAX_FILE_SIZE_MB}MB
        </span>
      </button>

      {errorMessage && (
        <p className="text-xs text-red-500">{errorMessage}</p>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_MIME_TYPES.join(",")}
        onChange={handleInputChange}
        className="sr-only"
        aria-label="이미지 파일 선택"
      />
    </div>
  );
}
