import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { getAnalysisMessages } from "@/lib/prompts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Strip optional markdown code-fence wrapper that Claude sometimes adds
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : raw.trim();
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    if (!document.extractedText) {
      return NextResponse.json({ error: "먼저 텍스트를 추출해주세요." }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: getAnalysisMessages(document.extractedText),
    });

    const rawText = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    let analysisJson: unknown;
    try {
      analysisJson = JSON.parse(extractJson(rawText));
    } catch {
      return NextResponse.json(
        { error: "Claude 응답을 JSON으로 파싱하지 못했습니다.", raw: rawText },
        { status: 502 }
      );
    }

    const updated = await prisma.document.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { analysisJson: analysisJson as any },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[POST /api/documents/:id/analyze]", error);
    return NextResponse.json({ error: "분석에 실패했습니다." }, { status: 500 });
  }
}
