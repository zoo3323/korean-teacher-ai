import { redirect } from "next/navigation";
import WorkspaceLayout from "@/components/WorkspaceLayout";

// Inline types to avoid importing from Prisma on the client boundary
interface Document {
  id: string;
  projectId: string;
  title: string;
  imageUrl: string;
  extractedText: string | null;
  analysisJson: unknown | null;
  canvasState: unknown | null;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  shareToken: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  documents: Document[];
}

interface PageProps {
  params: Promise<{ shareToken: string }>;
}

async function fetchProject(shareToken: string): Promise<Project | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/projects/${shareToken}`,
      // Always get fresh data for server-rendered workspace
      { cache: "no-store" }
    );

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

export default async function ProjectPage({ params }: PageProps) {
  const { shareToken } = await params;
  const project = await fetchProject(shareToken);

  if (!project) {
    redirect("/");
  }

  return <WorkspaceLayout project={project} />;
}
