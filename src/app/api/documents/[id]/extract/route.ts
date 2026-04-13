import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

function isSupportedMediaType(value: string): value is SupportedMediaType {
  return (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(value);
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    let imageBuffer: Buffer;
    let mediaType: string;
    try {
      const imageRes = await fetch(document.imageUrl);
      if (!imageRes.ok) throw new Error("fetch failed");
      imageBuffer = Buffer.from(await imageRes.arrayBuffer());
      mediaType = imageRes.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
    } catch {
      return NextResponse.json({ error: "이미지를 불러오지 못했습니다." }, { status: 502 });
    }

    if (!isSupportedMediaType(mediaType)) {
      return NextResponse.json(
        { error: `지원하지 않는 이미지 형식입니다: ${mediaType}` },
        { status: 422 }
      );
    }

    const imageBase64 = imageBuffer.toString("base64");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            {
              type: "text",
              text: `이미지에서 텍스트를 추출하세요.
시/소설/수필 등 문학 작품의 경우 행(줄) 구분을 정확히 유지하세요.
원문 그대로 추출하며, 설명이나 주석은 추가하지 마세요.
JSON 없이 추출된 텍스트만 반환하세요.`,
            },
          ],
        },
      ],
    });

    const extractedText = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    const updated = await prisma.document.update({
      where: { id },
      data: { extractedText },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[POST /api/documents/:id/extract]", error);
    return NextResponse.json({ error: "텍스트 추출에 실패했습니다." }, { status: 500 });
  }
}
