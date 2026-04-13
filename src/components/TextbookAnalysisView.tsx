'use client';

import { Fragment, useState } from 'react';

export interface AnnotationCallout {
  id: string;
  text: string;
  type: 'literary' | 'meaning' | 'tip' | 'teacher';
}

export interface AnalysisLine {
  lineNum: number;
  text: string;
  callouts: AnnotationCallout[];
}

export interface StanzaBlock {
  id: string;
  label: string;
  lineStart: number;
  lineEnd: number;
  summary: string;
  analysis: string;
  mood?: string;
  color: 'blue' | 'green' | 'orange' | 'purple';
}

export interface TextbookAnalysisData {
  title: string;
  author: string;
  genre: string;
  period?: string;
  theme: string;
  lines: AnalysisLine[];
  stanzas: StanzaBlock[];
  formAnalysis: { category: string; value: string }[];
  literaryDevices: {
    id: string;
    device: string;
    quote: string;
    effect: string;
  }[];
  vocabulary: {
    id: string;
    word: string;
    definition: string;
    lineNum?: number;
  }[];
  summary: string;
}

interface TextbookAnalysisViewProps {
  data: TextbookAnalysisData;
  isEditing: boolean;
  onUpdate: (updated: TextbookAnalysisData) => void;
}

const CALLOUT_COLORS = {
  literary: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', label: '표현' },
  meaning:  { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', label: '의미' },
  tip:      { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', label: '핵심' },
  teacher:  { bg: '#F5F3FF', border: '#DDD6FE', text: '#7C3AED', label: '해설' },
} as const;

const STANZA_COLORS = {
  blue:   { bg: '#EFF6FF', border: '#BFDBFE', accent: '#1D4ED8' },
  green:  { bg: '#F0FDF4', border: '#BBF7D0', accent: '#15803D' },
  orange: { bg: '#FFFBEB', border: '#FDE68A', accent: '#D97706' },
  purple: { bg: '#F5F3FF', border: '#DDD6FE', accent: '#7C3AED' },
} as const;

const EDITABLE_FIELD_CLASS = 'bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1';

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── MetaChip ────────────────────────────────────────────────────────────────

interface MetaChipProps {
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (v: string) => void;
}

function MetaChip({ label, value, isEditing, onChange }: MetaChipProps) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs border border-[#DDD6FE]">
      <span className="text-[#7C3AED] font-semibold">{label}</span>
      <span className="text-gray-400">·</span>
      {isEditing ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-20 text-gray-700 ${EDITABLE_FIELD_CLASS}`}
          style={{ fontSize: '12px' }}
        />
      ) : (
        <span className="text-gray-700">{value}</span>
      )}
    </span>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

interface HeaderProps {
  data: TextbookAnalysisData;
  isEditing: boolean;
  onUpdate: (updated: TextbookAnalysisData) => void;
}

function Header({ data, isEditing, onUpdate }: HeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 px-6 py-4 bg-[#F5F3FF] border-b border-[#DDD6FE]">
      <div className="flex items-baseline gap-2">
        {isEditing ? (
          <input
            value={data.title}
            onChange={(e) => onUpdate({ ...data, title: e.target.value })}
            className={`font-bold text-xl text-[#7C3AED] border-b border-[#7C3AED] ${EDITABLE_FIELD_CLASS}`}
          />
        ) : (
          <span className="font-bold text-xl text-[#7C3AED]">{data.title}</span>
        )}
        {isEditing ? (
          <input
            value={data.author}
            onChange={(e) => onUpdate({ ...data, author: e.target.value })}
            className={`text-gray-500 text-sm border-b border-gray-300 ${EDITABLE_FIELD_CLASS}`}
          />
        ) : (
          <span className="text-gray-500 text-sm">{data.author}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <MetaChip
          label="갈래"
          value={data.genre}
          isEditing={isEditing}
          onChange={(v) => onUpdate({ ...data, genre: v })}
        />
        {(data.period || isEditing) && (
          <MetaChip
            label="연대"
            value={data.period ?? ''}
            isEditing={isEditing}
            onChange={(v) => onUpdate({ ...data, period: v })}
          />
        )}
      </div>
    </div>
  );
}

// ─── CalloutBadge ─────────────────────────────────────────────────────────────

interface CalloutBadgeProps {
  callout: AnnotationCallout;
  isEditing: boolean;
  onChange: (newText: string) => void;
  onDelete: () => void;
}

function CalloutBadge({ callout, isEditing, onChange, onDelete }: CalloutBadgeProps) {
  const colors = CALLOUT_COLORS[callout.type];

  return (
    <div
      className="rounded"
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderLeft: `3px solid ${colors.border}`,
        padding: '4px 6px',
      }}
    >
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <span
          className="inline-block rounded px-1 py-0"
          style={{
            fontSize: '9px',
            backgroundColor: colors.border,
            color: colors.text,
            fontWeight: 700,
            lineHeight: '16px',
          }}
        >
          {colors.label}
        </span>
        {isEditing && (
          <button
            onClick={onDelete}
            className="text-gray-300 hover:text-red-400 leading-none"
            style={{ fontSize: '10px' }}
            aria-label="주석 삭제"
          >
            ✕
          </button>
        )}
      </div>

      {isEditing ? (
        <input
          value={callout.text}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full text-gray-700 ${EDITABLE_FIELD_CLASS}`}
          style={{ fontSize: '11px', color: colors.text }}
          placeholder="주석 입력..."
        />
      ) : (
        <p style={{ fontSize: '11px', color: colors.text, lineHeight: '1.4' }}>
          {callout.text}
        </p>
      )}
    </div>
  );
}

// ─── TextGrid ────────────────────────────────────────────────────────────────

interface TextGridProps {
  lines: AnalysisLine[];
  isEditing: boolean;
  onUpdateLine: (lineNum: number, newText: string) => void;
  onUpdateCallout: (lineNum: number, calloutId: string, newText: string) => void;
  onDeleteCallout: (lineNum: number, calloutId: string) => void;
  onAddCallout: (lineNum: number) => void;
}

function TextGrid({
  lines,
  isEditing,
  onUpdateLine,
  onUpdateCallout,
  onDeleteCallout,
  onAddCallout,
}: TextGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '55% 45%', gap: '0' }}>
      {lines.map((line) => (
        <Fragment key={line.lineNum}>
          <div className="flex items-start gap-3 px-4 py-2 border-b border-gray-100">
            <span className="text-xs text-gray-400 w-6 text-right shrink-0 mt-1 select-none font-mono">
              {line.lineNum}
            </span>
            {isEditing ? (
              <input
                value={line.text}
                onChange={(e) => onUpdateLine(line.lineNum, e.target.value)}
                className={`text-sm leading-relaxed text-gray-900 font-serif flex-1 ${EDITABLE_FIELD_CLASS}`}
              />
            ) : (
              <span className="text-sm leading-relaxed text-gray-900 font-serif flex-1">
                {line.text}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1 px-3 py-2 border-b border-gray-100 border-l border-l-gray-100">
            {line.callouts.map((callout) => (
              <CalloutBadge
                key={callout.id}
                callout={callout}
                isEditing={isEditing}
                onChange={(newText) => onUpdateCallout(line.lineNum, callout.id, newText)}
                onDelete={() => onDeleteCallout(line.lineNum, callout.id)}
              />
            ))}
            {isEditing && (
              <button
                onClick={() => onAddCallout(line.lineNum)}
                className="mt-1 text-left rounded px-2 py-0.5 text-xs text-gray-400 border border-dashed border-gray-200 hover:border-blue-300 hover:text-blue-400 transition-colors"
              >
                + 주석 추가
              </button>
            )}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

// ─── StanzaCard ──────────────────────────────────────────────────────────────

interface StanzaCardProps {
  stanza: StanzaBlock;
  isEditing: boolean;
  onUpdate: (field: keyof StanzaBlock, value: string) => void;
}

function StanzaCard({ stanza, isEditing, onUpdate }: StanzaCardProps) {
  const colors = STANZA_COLORS[stanza.color];

  return (
    <div
      className="rounded-lg p-3 flex-1"
      style={{
        minWidth: '240px',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderLeft: `3px solid ${colors.accent}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="rounded px-1.5 py-0.5 font-bold"
          style={{ fontSize: '11px', backgroundColor: colors.border, color: colors.accent }}
        >
          {stanza.label}
        </span>
        {isEditing ? (
          <input
            value={stanza.summary}
            onChange={(e) => onUpdate('summary', e.target.value)}
            className={`font-bold text-gray-800 flex-1 ${EDITABLE_FIELD_CLASS}`}
            style={{ fontSize: '14px' }}
            placeholder="요약..."
          />
        ) : (
          <span className="font-bold text-gray-800" style={{ fontSize: '14px' }}>
            {stanza.summary}
          </span>
        )}
      </div>

      {isEditing ? (
        <textarea
          value={stanza.analysis}
          onChange={(e) => onUpdate('analysis', e.target.value)}
          rows={2}
          className={`w-full text-gray-600 resize-none ${EDITABLE_FIELD_CLASS}`}
          style={{ fontSize: '12px' }}
          placeholder="분석 설명..."
        />
      ) : (
        <p className="text-gray-600 leading-snug" style={{ fontSize: '12px' }}>
          {stanza.analysis}
        </p>
      )}

      {(stanza.mood || isEditing) && (
        <div className="mt-1.5">
          {isEditing ? (
            <input
              value={stanza.mood ?? ''}
              onChange={(e) => onUpdate('mood', e.target.value)}
              className={`text-xs ${EDITABLE_FIELD_CLASS}`}
              style={{ color: colors.accent }}
              placeholder="분위기..."
            />
          ) : stanza.mood ? (
            <span
              className="inline-block rounded-full px-2 py-0.5 text-xs"
              style={{ backgroundColor: colors.border, color: colors.accent }}
            >
              {stanza.mood}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── StanzaSection ───────────────────────────────────────────────────────────

interface StanzaSectionProps {
  stanzas: StanzaBlock[];
  isEditing: boolean;
  onUpdateStanza: (id: string, field: keyof StanzaBlock, value: string) => void;
}

function StanzaSection({ stanzas, isEditing, onUpdateStanza }: StanzaSectionProps) {
  if (stanzas.length === 0) return null;

  return (
    <div className="px-4 py-4 border-t border-gray-100">
      <h3 className="text-sm font-bold text-gray-700 mb-3">연 / 단락 분석</h3>
      <div className="flex flex-wrap gap-3">
        {stanzas.map((stanza) => (
          <StanzaCard
            key={stanza.id}
            stanza={stanza}
            isEditing={isEditing}
            onUpdate={(field, value) => onUpdateStanza(stanza.id, field, value)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── LiteraryDevicesSection ──────────────────────────────────────────────────

interface LiteraryDevice {
  id: string;
  device: string;
  quote: string;
  effect: string;
}

interface LiteraryDevicesSectionProps {
  devices: LiteraryDevice[];
  isEditing: boolean;
  onUpdate: (devices: LiteraryDevice[]) => void;
}

function LiteraryDevicesSection({ devices, isEditing, onUpdate }: LiteraryDevicesSectionProps) {
  if (devices.length === 0 && !isEditing) return null;

  function updateDevice(id: string, field: keyof LiteraryDevice, value: string) {
    onUpdate(devices.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  }

  function deleteDevice(id: string) {
    onUpdate(devices.filter((d) => d.id !== id));
  }

  function addDevice() {
    onUpdate([...devices, { id: generateId(), device: '', quote: '', effect: '' }]);
  }

  return (
    <div className="px-4 py-4 border-t border-gray-200">
      <h3 className="text-sm font-bold text-gray-700 mb-3">표현상의 특징</h3>

      <div className="flex flex-wrap gap-3">
        {devices.map((d) => (
          <div
            key={d.id}
            className="rounded-lg border border-gray-200 bg-white p-3"
            style={{ borderRadius: '8px', minWidth: '200px', maxWidth: '280px' }}
          >
            {isEditing ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <input
                    value={d.device}
                    onChange={(e) => updateDevice(d.id, 'device', e.target.value)}
                    className={`font-bold ${EDITABLE_FIELD_CLASS}`}
                    style={{ fontSize: '13px', color: '#1D4ED8' }}
                    placeholder="표현 기법..."
                  />
                  <button
                    onClick={() => deleteDevice(d.id)}
                    className="text-gray-300 hover:text-red-400 text-xs ml-1"
                    aria-label="삭제"
                  >
                    ✕
                  </button>
                </div>
                <input
                  value={d.quote}
                  onChange={(e) => updateDevice(d.id, 'quote', e.target.value)}
                  className={`italic text-gray-500 ${EDITABLE_FIELD_CLASS}`}
                  style={{ fontSize: '12px' }}
                  placeholder="인용구..."
                />
                <input
                  value={d.effect}
                  onChange={(e) => updateDevice(d.id, 'effect', e.target.value)}
                  className={`text-gray-600 ${EDITABLE_FIELD_CLASS}`}
                  style={{ fontSize: '11px' }}
                  placeholder="효과..."
                />
              </div>
            ) : (
              <>
                <p className="font-bold mb-1" style={{ fontSize: '13px', color: '#1D4ED8' }}>
                  {d.device}
                </p>
                <p className="italic text-gray-500 mb-1" style={{ fontSize: '12px' }}>
                  "{d.quote}"
                </p>
                <p className="text-gray-600" style={{ fontSize: '11px' }}>
                  {d.effect}
                </p>
              </>
            )}
          </div>
        ))}

        {isEditing && (
          <button
            onClick={addDevice}
            className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors"
            style={{ minWidth: '140px' }}
          >
            + 표현 기법 추가
          </button>
        )}
      </div>
    </div>
  );
}

// ─── FormAnalysisTable ───────────────────────────────────────────────────────

interface FormAnalysisTableProps {
  rows: { category: string; value: string }[];
  isEditing: boolean;
  onUpdate: (rows: { category: string; value: string }[]) => void;
}

function FormAnalysisTable({ rows, isEditing, onUpdate }: FormAnalysisTableProps) {
  if (rows.length === 0 && !isEditing) return null;

  function updateRow(index: number, field: 'category' | 'value', text: string) {
    const next = rows.map((r, i) => (i === index ? { ...r, [field]: text } : r));
    onUpdate(next);
  }

  return (
    <div>
      <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">형태 분석</h4>
      <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className={index < rows.length - 1 ? 'border-b border-gray-100' : ''}>
              <td className="px-3 py-2 bg-gray-50 font-medium text-gray-600 w-1/3">
                {isEditing ? (
                  <input
                    value={row.category}
                    onChange={(e) => updateRow(index, 'category', e.target.value)}
                    className={`w-full ${EDITABLE_FIELD_CLASS}`}
                    style={{ fontSize: '12px' }}
                  />
                ) : (
                  row.category
                )}
              </td>
              <td className="px-3 py-2 text-gray-800">
                {isEditing ? (
                  <input
                    value={row.value}
                    onChange={(e) => updateRow(index, 'value', e.target.value)}
                    className={`w-full ${EDITABLE_FIELD_CLASS}`}
                    style={{ fontSize: '12px' }}
                  />
                ) : (
                  row.value
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── VocabularyTable ─────────────────────────────────────────────────────────

interface VocabularyTableProps {
  items: TextbookAnalysisData['vocabulary'];
}

function VocabularyTable({ items }: VocabularyTableProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 hover:text-gray-700"
      >
        어휘 풀이 {isOpen ? '▴' : '▾'}
      </button>

      {isOpen && (
        <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs">어휘</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs">뜻풀이</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs w-12">행</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className={index < items.length - 1 ? 'border-b border-gray-100' : ''}>
                <td className="px-3 py-2 font-medium text-gray-900">{item.word}</td>
                <td className="px-3 py-2 text-gray-600">{item.definition}</td>
                <td className="px-3 py-2 text-gray-400 text-xs">{item.lineNum ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── ThemeSummarySection ─────────────────────────────────────────────────────

interface ThemeSummarySectionProps {
  theme: string;
  summary: string;
  isEditing: boolean;
  onUpdateTheme: (v: string) => void;
  onUpdateSummary: (v: string) => void;
}

function ThemeSummarySection({
  theme,
  summary,
  isEditing,
  onUpdateTheme,
  onUpdateSummary,
}: ThemeSummarySectionProps) {
  return (
    <div className="px-4 py-4 border-t border-gray-200 grid grid-cols-2 gap-4">
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE' }}
      >
        <p className="text-xs font-bold text-[#7C3AED] mb-2 uppercase tracking-wide">주제</p>
        {isEditing ? (
          <textarea
            value={theme}
            onChange={(e) => onUpdateTheme(e.target.value)}
            rows={2}
            className={`w-full font-semibold text-gray-800 leading-snug resize-none ${EDITABLE_FIELD_CLASS}`}
            style={{ fontSize: '15px' }}
          />
        ) : (
          <p className="font-semibold text-gray-800 leading-snug" style={{ fontSize: '15px' }}>
            {theme}
          </p>
        )}
      </div>

      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}
      >
        <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">작품 해설</p>
        {isEditing ? (
          <textarea
            value={summary}
            onChange={(e) => onUpdateSummary(e.target.value)}
            rows={3}
            className={`w-full text-gray-700 leading-relaxed resize-none ${EDITABLE_FIELD_CLASS}`}
            style={{ fontSize: '13px' }}
          />
        ) : (
          <p className="text-gray-700 leading-relaxed" style={{ fontSize: '13px' }}>
            {summary}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── TextbookAnalysisView ────────────────────────────────────────────────────

export default function TextbookAnalysisView({ data, isEditing, onUpdate }: TextbookAnalysisViewProps) {
  function updateLine(lineNum: number, newText: string) {
    onUpdate({
      ...data,
      lines: data.lines.map((l) => (l.lineNum === lineNum ? { ...l, text: newText } : l)),
    });
  }

  function updateCallout(lineNum: number, calloutId: string, newText: string) {
    onUpdate({
      ...data,
      lines: data.lines.map((l) =>
        l.lineNum === lineNum
          ? {
              ...l,
              callouts: l.callouts.map((c) =>
                c.id === calloutId ? { ...c, text: newText } : c
              ),
            }
          : l
      ),
    });
  }

  function deleteCallout(lineNum: number, calloutId: string) {
    onUpdate({
      ...data,
      lines: data.lines.map((l) =>
        l.lineNum === lineNum
          ? { ...l, callouts: l.callouts.filter((c) => c.id !== calloutId) }
          : l
      ),
    });
  }

  function addCallout(lineNum: number) {
    const newCallout: AnnotationCallout = { id: generateId(), text: '', type: 'tip' };
    onUpdate({
      ...data,
      lines: data.lines.map((l) =>
        l.lineNum === lineNum ? { ...l, callouts: [...l.callouts, newCallout] } : l
      ),
    });
  }

  function updateStanza(id: string, field: keyof StanzaBlock, value: string) {
    onUpdate({
      ...data,
      stanzas: data.stanzas.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    });
  }

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white overflow-hidden">
      <Header data={data} isEditing={isEditing} onUpdate={onUpdate} />

      <TextGrid
        lines={data.lines}
        isEditing={isEditing}
        onUpdateLine={updateLine}
        onUpdateCallout={updateCallout}
        onDeleteCallout={deleteCallout}
        onAddCallout={addCallout}
      />

      <StanzaSection
        stanzas={data.stanzas}
        isEditing={isEditing}
        onUpdateStanza={updateStanza}
      />

      <LiteraryDevicesSection
        devices={data.literaryDevices}
        isEditing={isEditing}
        onUpdate={(devices) => onUpdate({ ...data, literaryDevices: devices })}
      />

      <div className="px-4 py-4 border-t border-gray-200 grid grid-cols-2 gap-6">
        <FormAnalysisTable
          rows={data.formAnalysis}
          isEditing={isEditing}
          onUpdate={(rows) => onUpdate({ ...data, formAnalysis: rows })}
        />
        <VocabularyTable items={data.vocabulary} />
      </div>

      <ThemeSummarySection
        theme={data.theme}
        summary={data.summary}
        isEditing={isEditing}
        onUpdateTheme={(v) => onUpdate({ ...data, theme: v })}
        onUpdateSummary={(v) => onUpdate({ ...data, summary: v })}
      />
    </div>
  );
}
