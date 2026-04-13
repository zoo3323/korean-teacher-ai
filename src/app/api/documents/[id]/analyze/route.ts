import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { getAnalysisMessages } from "@/lib/prompts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Allowlist of MIME types Claude Vision accepts
const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

function isSupportedMediaType(value: string): value is SupportedMediaType {
  return (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(value);
}

// Strip optional markdown code-fence wrapper that Claude sometimes adds
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : raw.trim();
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 1. Load document to get image URL
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    // 2. Fetch image and convert to base64
    const imageResponse = await fetch(document.imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ error: "이미지를 불러오지 못했습니다." }, { status: 502 });
    }

    const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
    // Strip any charset suffix (e.g. "image/jpeg; charset=...")
    const mediaType = contentType.split(";")[0].trim();

    if (!isSupportedMediaType(mediaType)) {
      return NextResponse.json(
        { error: `지원하지 않는 이미지 형식입니다: ${mediaType}` },
        { status: 422 }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");

    // 3. Call Claude Vision
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: getAnalysisMessages(imageBase64, mediaType),
    });

    const rawText = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    // 4. Parse JSON (handle optional markdown code fences)
    let analysisJson: unknown;
    try {
      analysisJson = JSON.parse(extractJson(rawText));
    } catch {
      return NextResponse.json(
        { error: "Claude 응답을 JSON으로 파싱하지 못했습니다.", raw: rawText },
        { status: 502 }
      );
    }

    const extractedText =
      typeof analysisJson === "object" &&
      analysisJson !== null &&
      "extractedText" in analysisJson
        ? String((analysisJson as Record<string, unknown>).extractedText)
        : rawText;

    // 5. Persist analysis results
    const updated = await prisma.document.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { analysisJson: analysisJson as any, extractedText },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[POST /api/documents/:id/analyze]", error);
    return NextResponse.json({ error: "분석에 실패했습니다." }, { status: 500 });
  }
}
