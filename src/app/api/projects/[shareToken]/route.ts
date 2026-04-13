import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ shareToken: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { shareToken } = await params;

    const project = await prisma.project.findUnique({
      where: { shareToken },
      include: {
        documents: {
          orderBy: { createdAt: "asc" },
          include: {
            questionSets: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("[GET /api/projects/:shareToken]", error);
    return NextResponse.json({ error: "프로젝트 조회에 실패했습니다." }, { status: 500 });
  }
}
