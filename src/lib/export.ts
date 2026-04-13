/**
 * Server-side export utilities.
 * Requires: npm install docx
 *
 * Run this module in Next.js API routes or Server Actions only.
 * Never import it on the client side.
 */

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  SectionType,
  TextRun,
  UnderlineType,
} from "docx";

// ---------------------------------------------------------------------------
// Input types — plain objects, no Prisma imports
// ---------------------------------------------------------------------------

interface LiteraryDevice {
  device: string;
  quote: string;
  explanation: string;
}

interface Theme {
  theme: string;
  evidence: string;
}

interface VocabularyEntry {
  word: string;
  definition: string;
  difficulty?: string;
}

interface StructureEntry {
  section: string;
  function: string;
  analysis: string;
}

interface AnalysisJson {
  literaryDevices?: LiteraryDevice[];
  themes?: Theme[];
  vocabulary?: VocabularyEntry[];
  structure?: StructureEntry[];
}

interface Question {
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
}

interface QuestionSetInput {
  questionType: string;
  questionsJson: Question[] | unknown;
}

export interface DocumentInput {
  title: string;
  extractedText?: string | null;
  analysisJson?: AnalysisJson | unknown | null;
  questionSets?: QuestionSetInput[];
}

// ---------------------------------------------------------------------------
// Paragraph helpers
// ---------------------------------------------------------------------------

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  return new Paragraph({ text, heading: level });
}

function body(text: string, bold = false): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 80 },
  });
}

function spacer(): Paragraph {
  return new Paragraph({ text: "" });
}

function sectionLabel(label: string): Paragraph[] {
  return [
    spacer(),
    new Paragraph({
      children: [
        new TextRun({
          text: label,
          bold: true,
          underline: { type: UnderlineType.SINGLE },
          size: 24,
        }),
      ],
      spacing: { after: 120 },
    }),
  ];
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

// ---------------------------------------------------------------------------
// Analysis section builders
// ---------------------------------------------------------------------------

function buildLiteraryDevices(devices: LiteraryDevice[]): Paragraph[] {
  if (devices.length === 0) return [];
  return [
    ...sectionLabel("표현 기법"),
    ...devices.flatMap((d, i) => [
      new Paragraph({
        children: [new TextRun({ text: `${i + 1}. ${d.device}`, bold: true })],
      }),
      body(`  인용: "${d.quote}"`),
      body(`  설명: ${d.explanation}`),
      spacer(),
    ]),
  ];
}

function buildThemes(themes: Theme[]): Paragraph[] {
  if (themes.length === 0) return [];
  return [
    ...sectionLabel("주제 및 핵심 개념"),
    ...themes.flatMap((t, i) => [
      new Paragraph({
        children: [new TextRun({ text: `${i + 1}. ${t.theme}`, bold: true })],
      }),
      body(`  근거: ${t.evidence}`),
      spacer(),
    ]),
  ];
}

function buildVocabulary(vocabulary: VocabularyEntry[]): Paragraph[] {
  if (vocabulary.length === 0) return [];
  return [
    ...sectionLabel("어휘 정리"),
    ...vocabulary.map(
      (v) =>
        new Paragraph({
          children: [
            new TextRun({ text: `${v.word}`, bold: true }),
            new TextRun({
              text: `  —  ${v.definition}${v.difficulty ? `  [난이도: ${v.difficulty}]` : ""}`,
            }),
          ],
          spacing: { after: 80 },
        })
    ),
    spacer(),
  ];
}

function buildStructure(structure: StructureEntry[]): Paragraph[] {
  if (structure.length === 0) return [];
  return [
    ...sectionLabel("구조 분석"),
    ...structure.flatMap((s, i) => [
      new Paragraph({
        children: [
          new TextRun({
            text: `${i + 1}. [${s.section}]  ${s.function}`,
            bold: true,
          }),
        ],
      }),
      body(`  ${s.analysis}`),
      spacer(),
    ]),
  ];
}

// ---------------------------------------------------------------------------
// Question set builder
// ---------------------------------------------------------------------------

function buildQuestionSet(set: QuestionSetInput, setIndex: number): Paragraph[] {
  const questions = safeArray<Question>(set.questionsJson);
  if (questions.length === 0) return [];

  const typeLabel = set.questionType.replace(/_/g, " ");

  return [
    ...sectionLabel(`문제 세트 ${setIndex + 1}  (${typeLabel})`),
    ...questions.flatMap((q, qi) => {
      const paragraphs: Paragraph[] = [
        new Paragraph({
          children: [new TextRun({ text: `${qi + 1}. ${q.question}`, bold: true, size: 24 })],
          spacing: { before: 200, after: 80 },
        }),
      ];

      if (Array.isArray(q.options)) {
        q.options.forEach((opt, oi) => {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: `  ${oi + 1}) ${opt}` })],
              spacing: { after: 60 },
            })
          );
        });
      }

      paragraphs.push(
        body(`  정답: ${q.answer}`, true),
        new Paragraph({
          children: [
            new TextRun({
              text: `  해설: ${q.explanation}`,
              italics: true,
              color: "555555",
            }),
          ],
          spacing: { before: 80, after: 160 },
        })
      );

      return paragraphs;
    }),
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a DOCX buffer from a document and its associated question sets.
 *
 * @example
 * const buffer = await generateDocx(doc);
 * res.setHeader(
 *   "Content-Type",
 *   "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
 * );
 * res.send(buffer);
 */
export async function generateDocx(document: DocumentInput, extraQuestionSets?: QuestionSetInput[]): Promise<Buffer> {
  const analysis = (document.analysisJson ?? {}) as AnalysisJson;
  const questionSets = extraQuestionSets ?? document.questionSets ?? [];

  const children: Paragraph[] = [
    // Title
    new Paragraph({
      text: document.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    spacer(),

    // Extracted text
    ...sectionLabel("원문 텍스트"),
    ...(document.extractedText
      ? document.extractedText.split("\n").map((line) => body(line || " "))
      : [body("(텍스트 없음)")]),

    // Analysis
    spacer(),
    heading("지문 분석", HeadingLevel.HEADING_1),
    ...buildLiteraryDevices(safeArray<LiteraryDevice>(analysis.literaryDevices)),
    ...buildThemes(safeArray<Theme>(analysis.themes)),
    ...buildVocabulary(safeArray<VocabularyEntry>(analysis.vocabulary)),
    ...buildStructure(safeArray<StructureEntry>(analysis.structure)),

    // Question sets
    ...(questionSets.length > 0
      ? [spacer(), heading("문제", HeadingLevel.HEADING_1)]
      : []),
    ...questionSets.flatMap((set, i) => buildQuestionSet(set, i)),
  ];

  const doc = new Document({
    sections: [{ properties: { type: SectionType.CONTINUOUS }, children }],
  });

  return Packer.toBuffer(doc);
}
