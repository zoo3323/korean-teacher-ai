'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';

interface ExportMenuProps {
  document: {
    id: string;
    title: string;
    imageUrl: string;
  };
  canvasRef?: RefObject<HTMLCanvasElement | null>;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExportAction = 'pdf' | 'docx' | 'image' | 'hwp-info';

interface MenuItem {
  id: ExportAction;
  label: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'pdf', label: 'PDF로 저장' },
  { id: 'docx', label: 'Word (DOCX)로 저장' },
  { id: 'hwp-info', label: 'HWP 안내' },
  { id: 'image', label: '이미지로 저장' },
];

// The workspace container to capture for PDF / image exports
const WORKSPACE_ELEMENT_ID = 'workspace-capture-target';

// ---------------------------------------------------------------------------
// HWP info modal
// ---------------------------------------------------------------------------

function HwpInfoModal({ onClose }: { onClose: () => void }) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-sm font-semibold text-gray-900">HWP로 저장하는 방법</h2>
        <p className="mb-4 text-sm leading-relaxed text-gray-600">
          DOCX 파일을 다운로드한 후 한글 프로그램에서 열어 HWP로 저장하세요.
        </p>
        <ol className="mb-5 space-y-1.5 text-sm text-gray-600">
          <li>1. &apos;Word (DOCX)로 저장&apos; 메뉴를 클릭하여 파일을 내려받습니다.</li>
          <li>2. 한글 프로그램을 열고 해당 DOCX 파일을 불러옵니다.</li>
          <li>3. 파일 &rarr; 다른 이름으로 저장 &rarr; HWP 형식을 선택합니다.</li>
        </ol>
        <button
          onClick={onClose}
          className="w-full rounded-lg bg-[#5E6AD2] py-2 text-sm font-medium text-white hover:bg-[#4B5BC4]"
        >
          확인
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility: trigger a browser download from a Blob or data-URL
// ---------------------------------------------------------------------------

function triggerDownload(source: Blob | string, filename: string) {
  const url = source instanceof Blob ? URL.createObjectURL(source) : source;
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  if (source instanceof Blob) {
    URL.revokeObjectURL(url);
  }
}

// Safe filename: keep Korean chars, alphanumerics, spaces, hyphens, underscores
function sanitizeFilename(title: string): string {
  return title.replace(/[^a-zA-Z0-9가-힣_\- ]/g, '').trim() || 'export';
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ExportMenu({ document, canvasRef }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<ExportAction | null>(null);
  const [showHwpModal, setShowHwpModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      window.document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => window.document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // -------------------------------------------------------------------------
  // Export handlers
  // -------------------------------------------------------------------------

  async function handleExportPdf() {
    setLoadingAction('pdf');
    setErrorMessage(null);
    try {
      // Dynamic imports keep jspdf / html2canvas out of the initial bundle
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const target =
        window.document.getElementById(WORKSPACE_ELEMENT_ID) ?? window.document.body;

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${sanitizeFilename(document.title)}.pdf`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PDF 생성에 실패했습니다.';
      setErrorMessage(message);
    } finally {
      setLoadingAction(null);
      setIsOpen(false);
    }
  }

  async function handleExportDocx() {
    setLoadingAction('docx');
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/export/${document.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'docx' }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? `DOCX 내보내기 실패 (${response.status})`);
      }

      const blob = await response.blob();
      triggerDownload(blob, `${sanitizeFilename(document.title)}.docx`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'DOCX 생성에 실패했습니다.';
      setErrorMessage(message);
    } finally {
      setLoadingAction(null);
      setIsOpen(false);
    }
  }

  async function handleExportImage() {
    setLoadingAction('image');
    setErrorMessage(null);
    try {
      const filename = `${sanitizeFilename(document.title)}.png`;

      // Prefer the provided canvas ref when available
      if (canvasRef?.current) {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        triggerDownload(dataUrl, filename);
        return;
      }

      // Fall back to capturing the workspace div with html2canvas
      const { default: html2canvas } = await import('html2canvas');
      const target =
        window.document.getElementById(WORKSPACE_ELEMENT_ID) ?? window.document.body;

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
      });

      triggerDownload(canvas.toDataURL('image/png'), filename);
    } catch (err) {
      const message = err instanceof Error ? err.message : '이미지 저장에 실패했습니다.';
      setErrorMessage(message);
    } finally {
      setLoadingAction(null);
      setIsOpen(false);
    }
  }

  function handleMenuItemClick(action: ExportAction) {
    if (loadingAction) return; // Block concurrent exports

    switch (action) {
      case 'pdf':
        handleExportPdf();
        break;
      case 'docx':
        handleExportDocx();
        break;
      case 'image':
        handleExportImage();
        break;
      case 'hwp-info':
        setShowHwpModal(true);
        setIsOpen(false);
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <div ref={menuRef} className="relative">
        {/* Trigger button */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={loadingAction !== null}
          className={[
            'flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium transition-colors',
            loadingAction !== null
              ? 'cursor-not-allowed text-gray-300'
              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
          ].join(' ')}
        >
          {loadingAction !== null ? (
            <>
              <span
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"
                aria-hidden="true"
              />
              내보내는 중...
            </>
          ) : (
            <>
              내보내기
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute right-0 top-full z-40 mt-1 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleMenuItemClick(item.id)}
                disabled={loadingAction !== null}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <MenuItemIcon id={item.id} />
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error toast — sits below the button */}
      {errorMessage && (
        <div className="absolute right-0 top-full z-40 mt-10 w-64 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-sm">
          {errorMessage}
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-1 underline"
          >
            닫기
          </button>
        </div>
      )}

      {/* HWP info modal */}
      {showHwpModal && <HwpInfoModal onClose={() => setShowHwpModal(false)} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Icon per menu item — keeps JSX in the main component clean
// ---------------------------------------------------------------------------

function MenuItemIcon({ id }: { id: ExportAction }) {
  const baseClass = 'h-4 w-4 shrink-0 text-gray-400';

  switch (id) {
    case 'pdf':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case 'docx':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case 'hwp-info':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      );
    case 'image':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      );
  }
}
