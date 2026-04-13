'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CanvasDocument {
  id: string;
  imageUrl: string;
  canvasState: any;
}

interface CanvasEditorProps {
  document: CanvasDocument;
  onSave?: (canvasState: any) => void;
}

type DrawingTool = 'select' | 'pen' | 'highlighter' | 'eraser' | 'text';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLOR_PALETTE = [
  '#EF4444', // red
  '#3B82F6', // blue
  '#22C55E', // green
  '#EAB308', // yellow
  '#000000', // black
  '#8B5CF6', // purple
  '#F97316', // orange
];

const ERASER_COLOR = '#FFFFFF';
const ERASER_WIDTH = 20;
const AUTOSAVE_DELAY_MS = 2000;

const TOOL_LABELS: Record<DrawingTool, string> = {
  select: '선택',
  pen: '펜',
  highlighter: '형광펜',
  eraser: '지우개',
  text: '텍스트',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fabricColorWithOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ---------------------------------------------------------------------------
// Toolbar sub-component
// ---------------------------------------------------------------------------

interface ToolbarProps {
  activeTool: DrawingTool;
  activeColor: string;
  strokeWidth: number;
  saveStatus: 'idle' | 'saving' | 'saved';
  onToolChange: (tool: DrawingTool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onClear: () => void;
}

function Toolbar({
  activeTool,
  activeColor,
  strokeWidth,
  saveStatus,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onClear,
}: ToolbarProps) {
  const tools: DrawingTool[] = ['select', 'pen', 'highlighter', 'eraser', 'text'];

  return (
    <div className="bg-white border-b border-gray-200 p-3 flex items-center gap-3 flex-wrap">
      {/* Tool buttons */}
      <div className="flex items-center gap-1">
        {tools.map((tool) => (
          <button
            key={tool}
            onClick={() => onToolChange(tool)}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activeTool === tool
                ? 'bg-[#5E6AD2] text-white'
                : 'text-gray-600 hover:bg-gray-100',
            ].join(' ')}
          >
            {TOOL_LABELS[tool]}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-200 shrink-0" />

      {/* Color swatches */}
      <div className="flex items-center gap-1.5">
        {COLOR_PALETTE.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            title={color}
            style={{ backgroundColor: color }}
            className={[
              'w-5 h-5 rounded-full transition-all',
              activeColor === color
                ? 'ring-2 ring-offset-1 ring-gray-600 scale-110'
                : 'hover:scale-110',
            ].join(' ')}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-gray-200 shrink-0" />

      {/* Stroke width slider */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 whitespace-nowrap">굵기</span>
        <input
          type="range"
          min={1}
          max={20}
          value={strokeWidth}
          onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
          className="w-20 accent-[#5E6AD2]"
        />
        <span className="text-xs text-gray-500 w-4">{strokeWidth}</span>
      </div>

      <div className="w-px h-6 bg-gray-200 shrink-0" />

      {/* Action buttons */}
      <button
        onClick={onUndo}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
      >
        실행 취소
      </button>
      <button
        onClick={onClear}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
      >
        전체 지우기
      </button>

      {/* Save status indicator */}
      <div className="ml-auto text-xs text-gray-400">
        {saveStatus === 'saving' && '저장 중...'}
        {saveStatus === 'saved' && (
          <span className="text-green-600">저장됨</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CanvasEditor({ document, onSave }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // We store the fabric.Canvas instance in a ref so it doesn't trigger
  // re-renders and remains stable across effect calls.
  const fabricCanvasRef = useRef<any>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the previous document id to detect document switches.
  const prevDocIdRef = useRef<string | null>(null);

  const [activeTool, setActiveTool] = useState<DrawingTool>('pen');
  const [activeColor, setActiveColor] = useState(COLOR_PALETTE[4]); // black
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // -------------------------------------------------------------------------
  // Apply tool / color / stroke settings to the live fabric canvas.
  // Kept as a separate stable callback so it can be called both on first
  // render and whenever the user changes a setting.
  // -------------------------------------------------------------------------

  const applyToolSettings = useCallback(
    (canvas: any, tool: DrawingTool, color: string, width: number, fabric: any) => {
      // Always reset mouse:down handler before re-binding for the text tool.
      canvas.off('mouse:down');

      switch (tool) {
        case 'pen': {
          canvas.isDrawingMode = true;
          const brush = new fabric.PencilBrush(canvas);
          brush.width = width;
          brush.color = color;
          canvas.freeDrawingBrush = brush;
          break;
        }

        case 'highlighter': {
          canvas.isDrawingMode = true;
          const brush = new fabric.PencilBrush(canvas);
          brush.width = width * 3; // highlighters are naturally wider
          brush.color = fabricColorWithOpacity(color, 0.4);
          canvas.freeDrawingBrush = brush;
          break;
        }

        case 'eraser': {
          canvas.isDrawingMode = true;
          const brush = new fabric.PencilBrush(canvas);
          brush.width = ERASER_WIDTH;
          brush.color = ERASER_COLOR;
          canvas.freeDrawingBrush = brush;
          break;
        }

        case 'text': {
          canvas.isDrawingMode = false;
          canvas.on('mouse:down', (options: any) => {
            const pointer = canvas.getPointer(options.e);
            const textbox = new fabric.Textbox('', {
              left: pointer.x,
              top: pointer.y,
              width: 200,
              fontSize: 16,
              fill: color,
              editable: true,
            });
            canvas.add(textbox);
            canvas.setActiveObject(textbox);
            textbox.enterEditing();
            canvas.requestRenderAll();
          });
          break;
        }

        case 'select':
        default: {
          canvas.isDrawingMode = false;
          break;
        }
      }
    },
    []
  );

  // -------------------------------------------------------------------------
  // Auto-save: debounce canvas changes and PATCH the API.
  // -------------------------------------------------------------------------

  const scheduleAutosave = useCallback(
    (canvas: any, documentId: string) => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      autosaveTimerRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        const canvasState = canvas.toJSON();

        try {
          await fetch(`/api/documents/${documentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ canvasState }),
          });
          onSave?.(canvasState);
          setSaveStatus('saved');
        } catch {
          // Silently fail — the user can manually save if needed.
          setSaveStatus('idle');
        }
      }, AUTOSAVE_DELAY_MS);
    },
    [onSave]
  );

  // -------------------------------------------------------------------------
  // Initialise (or re-initialise) the fabric canvas.
  // Runs when the document switches.
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!canvasRef.current) return;

    // Detect document switch: dispose previous canvas instance first.
    if (
      fabricCanvasRef.current &&
      prevDocIdRef.current !== document.id
    ) {
      fabricCanvasRef.current.dispose();
      fabricCanvasRef.current = null;
    }

    prevDocIdRef.current = document.id;

    let isMounted = true;

    // Dynamic import to prevent SSR execution of browser-only fabric code.
    import('fabric').then((fabric) => {
      if (!isMounted || !canvasRef.current) return;

      const canvas = new fabric.Canvas(canvasRef.current);
      fabricCanvasRef.current = canvas;

      // Load background image and fit it to the container width.
      fabric.FabricImage.fromURL(
        document.imageUrl,
        { crossOrigin: 'anonymous' }
      ).then((img: any) => {
        if (!isMounted) return;

        const containerWidth =
          canvasRef.current?.parentElement?.clientWidth ?? 800;
        const scale = containerWidth / img.width!;
        const scaledHeight = img.height! * scale;

        canvas.setDimensions({ width: containerWidth, height: scaledHeight });

        img.set({
          scaleX: scale,
          scaleY: scale,
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
        });

        canvas.backgroundImage = img;
        canvas.requestRenderAll();

        // Restore saved state on top of the background image.
        if (document.canvasState && typeof document.canvasState === 'object') {
          // loadFromJSON replaces the entire canvas state, including
          // dimensions, so we re-apply our fitted size afterwards.
          canvas
            .loadFromJSON(document.canvasState)
            .then(() => {
              if (!isMounted) return;
              // Re-apply dimensions in case the saved state had different ones.
              canvas.setDimensions({ width: containerWidth, height: scaledHeight });
              canvas.backgroundImage = img;
              canvas.requestRenderAll();
            })
            .catch(() => {
              // If the saved state is corrupt, silently ignore it.
            });
        }
      });

      // Apply current tool settings immediately after canvas creation.
      applyToolSettings(canvas, activeTool, activeColor, strokeWidth, fabric);

      // Wire up auto-save on any modification.
      canvas.on('object:added', () => scheduleAutosave(canvas, document.id));
      canvas.on('object:modified', () => scheduleAutosave(canvas, document.id));
      canvas.on('object:removed', () => scheduleAutosave(canvas, document.id));
    });

    return () => {
      isMounted = false;
    };
    // We deliberately only re-run this effect when the document changes.
    // Tool/color/stroke changes are handled by a separate effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document.id, document.imageUrl]);

  // -------------------------------------------------------------------------
  // Re-apply tool settings whenever the tool, color, or stroke width changes.
  // -------------------------------------------------------------------------

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    import('fabric').then((fabric) => {
      if (!fabricCanvasRef.current) return;
      applyToolSettings(
        fabricCanvasRef.current,
        activeTool,
        activeColor,
        strokeWidth,
        fabric
      );
    });
  }, [activeTool, activeColor, strokeWidth, applyToolSettings]);

  // -------------------------------------------------------------------------
  // Toolbar action handlers
  // -------------------------------------------------------------------------

  function handleUndo() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    if (objects.length === 0) return;

    canvas.remove(objects[objects.length - 1]);
    canvas.requestRenderAll();
  }

  function handleClear() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const confirmed = window.confirm(
      '캔버스의 모든 필기를 지우시겠습니까? 이 작업은 되돌릴 수 없습니다.'
    );
    if (!confirmed) return;

    canvas.getObjects().forEach((obj: any) => canvas.remove(obj));
    canvas.requestRenderAll();
    scheduleAutosave(canvas, document.id);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        activeTool={activeTool}
        activeColor={activeColor}
        strokeWidth={strokeWidth}
        saveStatus={saveStatus}
        onToolChange={setActiveTool}
        onColorChange={setActiveColor}
        onStrokeWidthChange={setStrokeWidth}
        onUndo={handleUndo}
        onClear={handleClear}
      />
      <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center p-4">
        <canvas ref={canvasRef} className="shadow-lg" />
      </div>
    </div>
  );
}
