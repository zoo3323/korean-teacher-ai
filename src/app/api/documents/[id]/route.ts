import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// GET /api/documents/:id — fetch a single document with its question sets
// ---------------------------------------------------------------------------
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: { questionSets: { orderBy: { createdAt: "asc" } } },
    });

    if (!document) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("[GET /api/documents/:id]", error);
    return NextResponse.json({ error: "문서 조회에 실패했습니다." }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/documents/:id — partial update (extractedText, canvasState, title)
// ---------------------------------------------------------------------------
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Only pick recognised, updatable fields to prevent mass-assignment
    const allowedFields = ["extractedText", "canvasState", "title"] as const;
    type AllowedField = (typeof allowedFields)[number];

    const data: Partial<Record<AllowedField, unknown>> = {};
    for (const field of allowedFields) {
      if (field in body) {
        data[field] = body[field];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "변경할 필드가 없습니다." }, { status: 400 });
    }

    const updated = await prisma.document.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/documents/:id]", error);
    return NextResponse.json({ error: "문서 수정에 실패했습니다." }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/documents/:id — delete document (cascades questionSets via Prisma schema)
// ---------------------------------------------------------------------------
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.document.delete({ where: { id } });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/documents/:id]", error);
    return NextResponse.json({ error: "문서 삭제에 실패했습니다." }, { status: 500 });
  }
}
