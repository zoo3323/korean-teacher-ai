import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { getQuestionMessages } from "@/lib/prompts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Strip optional markdown code-fence wrapper that Claude sometimes adds
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : raw.trim();
}

// ---------------------------------------------------------------------------
// GET /api/documents/:id/questions — list all question sets for a document
// ---------------------------------------------------------------------------
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const questionSets = await prisma.questionSet.findMany({
      where: { documentId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(questionSets);
  } catch (error) {
    console.error("[GET /api/documents/:id/questions]", error);
    return NextResponse.json({ error: "문제 목록 조회에 실패했습니다." }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/documents/:id/questions — generate a new question set via Claude
// ---------------------------------------------------------------------------
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const questionType: string = body.questionType ?? "MULTIPLE_CHOICE";
    const count: number = Number(body.count) || 5;
    const analysisContext: string | undefined = typeof body.analysisContext === "string" ? body.analysisContext : undefined;

    // Load document — we need extractedText as the generation source
    const document = await prisma.document.findUnique({
      where: { id },
      select: { extractedText: true },
    });

    if (!document) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }
    if (!document.extractedText) {
      return NextResponse.json(
        { error: "먼저 문서를 분석해 주세요 (extractedText가 없습니다)." },
        { status: 422 }
      );
    }

    // Call Claude to generate questions
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: getQuestionMessages(document.extractedText, questionType, count, analysisContext),
    });

    const rawText = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    let questionsJson: unknown;
    try {
      questionsJson = JSON.parse(extractJson(rawText));
    } catch {
      return NextResponse.json(
        { error: "Claude 응답을 JSON으로 파싱하지 못했습니다.", raw: rawText },
        { status: 502 }
      );
    }

    // Persist the new question set
    const questionSet = await prisma.questionSet.create({
      data: {
        documentId: id,
        questionType,
        questionsJson: questionsJson as object,
      },
    });

    return NextResponse.json(questionSet, { status: 201 });
  } catch (error) {
    console.error("[POST /api/documents/:id/questions]", error);
    return NextResponse.json({ error: "문제 생성에 실패했습니다." }, { status: 500 });
  }
}
