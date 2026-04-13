---
name: Korean Language Teacher Web App
description: Core project context — stack, data shapes, API surface, and design system conventions
type: project
---

Next.js 16 + React 19 app for Korean language teachers. SQLite (Prisma) in dev, Claude Vision API for analysis. Located at `/home/njkim/vibe-project`.

**Stack**
- Next.js 16.2.3, React 19, TypeScript strict mode, Tailwind CSS v4
- Prisma ORM with SQLite (dev) — schema at `prisma/schema.prisma`
- Claude claude-sonnet-4-6 via `@anthropic-ai/sdk` for analysis and question generation
- `jsx: "react-jsx"` — automatic JSX transform, no need to import React for JSX, but explicit imports needed for `RefObject` etc.

**Design system**
- Accent: `#5E6AD2` (hover: `#4B5BC4`, tint: `bg-[#5E6AD2]/10`)
- Borders: `border-gray-200`, corners: `rounded-lg`
- All components are `'use client'` directives at the top

**Key data models**
- `Document`: id, projectId, title, imageUrl, extractedText, analysisJson (JSON), canvasState, createdAt/updatedAt
- `QuestionSet`: id, documentId, questionType (MULTIPLE_CHOICE | SHORT_ANSWER | FILL_IN_BLANK | VOCABULARY), questionsJson, createdAt
- `Project`: id, shareToken, title, documents[]

**analysisJson shape** (from Claude Vision, defined in `src/lib/prompts.ts`):
```
{ extractedText, literaryDevices[{device,quote,explanation}],
  themes[{theme,evidence}], vocabulary[{word,definition,difficulty:'상'|'중'|'하'}],
  structure[{section,function,analysis}] }
```

**questionsJson shape** — either a flat array or `{questions:[...]}`. Each item:
- MULTIPLE_CHOICE: `{question, options:string[], answer:number(1-based), explanation}`
- Others: `{question, answer:string, explanation}`

**API surface**
- `POST /api/documents/[id]/analyze` — runs Claude Vision, returns updated Document
- `GET|POST /api/documents/[id]/questions` — list / generate QuestionSet
- `PATCH /api/documents/[id]` — partial update (extractedText, canvasState, title only)
- `POST /api/export/[id]` — `{format:"docx"}` returns binary; pdf/image are client-side

**Export conventions**
- PDF + image: client-side via dynamic `import('jspdf')` + `import('html2canvas')` to avoid SSR
- DOCX: server-side via `src/lib/export.ts` → `generateDocx()`
- Capture target element ID: `workspace-capture-target`
- Sanitize filenames: strip chars not in `[a-zA-Z0-9가-힣_\- ]`

**Why:** Needed to build four major UI panels (AnalysisPanel, ExtractedTextEditor, QuestionGenerator, ExportMenu) that plug into the WorkspaceLayout tab system.
**How to apply:** Use these shapes directly when writing new components — do not re-derive from Prisma unless the schema changes.
