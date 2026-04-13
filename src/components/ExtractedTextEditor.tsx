'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ExtractedTextEditorProps {
  document: {
    id: string;
    extractedText: string | null;
  };
  onTextChange: (text: string) => void;
}

// How long to wait after the user stops typing before auto-saving (ms)
const AUTOSAVE_DEBOUNCE_MS = 1000;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ---------------------------------------------------------------------------
// Copy-to-clipboard button — isolated to avoid re-rendering the textarea
// ---------------------------------------------------------------------------

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS dev environment) — silently ignore
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="클립보드에 복사"
      className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
    >
      {copied ? (
        <>
          {/* Checkmark icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          복사됨
        </>
      ) : (
        <>
          {/* Copy icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          복사
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Save status indicator
// ---------------------------------------------------------------------------

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;

  const styles: Record<Exclude<SaveStatus, 'idle'>, string> = {
    saving: 'text-gray-400',
    saved: 'text-green-600',
    error: 'text-red-500',
  };

  const labels: Record<Exclude<SaveStatus, 'idle'>, string> = {
    saving: '저장 중...',
    saved: '저장됨',
    error: '저장 실패',
  };

  return (
    <span className={`text-xs ${styles[status as Exclude<SaveStatus, 'idle'>]}`}>
      {labels[status as Exclude<SaveStatus, 'idle'>]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ExtractedTextEditor({
  document,
  onTextChange,
}: ExtractedTextEditorProps) {
  const [text, setText] = useState(document.extractedText ?? '');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Keep a stable ref to the current text so the debounced save always
  // reads the latest value without being re-created on every keystroke.
  const textRef = useRef(text);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if the parent swaps the document entirely
  useEffect(() => {
    const incoming = document.extractedText ?? '';
    setText(incoming);
    textRef.current = incoming;
  }, [document.id, document.extractedText]);

  const saveToServer = useCallback(
    async (value: string) => {
      setSaveStatus('saving');
      try {
        const response = await fetch(`/api/documents/${document.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extractedText: value }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error ?? `저장 실패 (${response.status})`);
        }

        setSaveStatus('saved');
        // Reset status back to idle after a brief visual confirmation
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    },
    [document.id]
  );

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    setText(value);
    textRef.current = value;
    onTextChange(value);

    // Debounce: cancel any pending save and schedule a new one
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      saveToServer(textRef.current);
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  // Flush pending save on unmount so no changes are silently lost
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  if (document.extractedText === null) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="max-w-xs text-center text-sm leading-relaxed text-gray-400">
          AI 분석을 먼저 실행하면 텍스트가 자동 추출됩니다
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Editor
  // -------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2">
        <SaveStatusIndicator status={saveStatus} />
        <CopyButton getText={() => textRef.current} />
      </div>

      {/* Textarea — fills all remaining height */}
      <textarea
        value={text}
        onChange={handleChange}
        spellCheck={false}
        aria-label="추출된 텍스트 편집기"
        className="flex-1 resize-none overflow-y-auto px-4 py-4 text-base leading-relaxed text-gray-800 outline-none placeholder:text-gray-300 focus:ring-0"
        placeholder="추출된 텍스트가 여기에 표시됩니다."
      />
    </div>
  );
}
