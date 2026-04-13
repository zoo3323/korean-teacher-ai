import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import WorkspaceLayout from "@/components/WorkspaceLayout";

interface PageProps {
  params: Promise<{ shareToken: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
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
    redirect("/");
  }

  // Prisma returns Date objects — serialize to string for client components
  const serialized = JSON.parse(JSON.stringify(project));

  return <WorkspaceLayout project={serialized} />;
}
