import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// 로컬 filesystem에 저장 (public/uploads/ — Next.js가 정적 파일로 서빙)
async function uploadImage(file: File, projectId: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", projectId);
  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  await writeFile(path.join(uploadDir, safeName), buffer);

  return `/api/uploads/${projectId}/${safeName}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const projectId = formData.get("projectId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }
    if (typeof projectId !== "string" || !projectId) {
      return NextResponse.json({ error: "projectId가 필요합니다." }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    const imageUrl = await uploadImage(file, projectId);

    const document = await prisma.document.create({
      data: {
        projectId,
        imageUrl,
        title: file.name.replace(/\.[^/.]+$/, ""),
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("[POST /api/documents]", error);
    return NextResponse.json({ error: "문서 업로드에 실패했습니다." }, { status: 500 });
  }
}
