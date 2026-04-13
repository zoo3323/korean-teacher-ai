import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDocx } from "@/lib/export";

interface RouteParams {
  params: Promise<{ id: string }>;
}

type ExportFormat = "pdf" | "docx" | "image";

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const format: ExportFormat = body.format;

    if (!["pdf", "docx", "image"].includes(format)) {
      return NextResponse.json(
        { error: "지원하지 않는 형식입니다. pdf | docx | image 중 하나를 선택하세요." },
        { status: 400 }
      );
    }

    // pdf / image exports are rendered on the client side
    if (format === "pdf" || format === "image") {
      return NextResponse.json({ message: "클라이언트에서 생성됩니다" });
    }

    // docx — server-side generation
    const document = await prisma.document.findUnique({
      where: { id },
      include: { questionSets: { orderBy: { createdAt: "asc" } } },
    });

    if (!document) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    const { questionSets, ...documentFields } = document;
    const buffer = await generateDocx(documentFields, questionSets);

    const safeTitle = document.title.replace(/[^a-zA-Z0-9가-힣_\- ]/g, "").trim() || id;
    const filename = `${safeTitle}.docx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("[POST /api/export/:id]", error);
    return NextResponse.json({ error: "내보내기에 실패했습니다." }, { status: 500 });
  }
}
