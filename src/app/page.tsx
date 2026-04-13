"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const LOCAL_STORAGE_KEY = "korean_teacher_token";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (savedToken) {
      router.replace(`/project/${savedToken}`);
      return;
    }

    async function createProject() {
      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          throw new Error(`프로젝트 생성 실패: ${response.status}`);
        }

        const project = await response.json();
        localStorage.setItem(LOCAL_STORAGE_KEY, project.shareToken);
        router.replace(`/project/${project.shareToken}`);
      } catch (error) {
        console.error("프로젝트 생성 중 오류 발생:", error);
        // 재시도를 허용하기 위해 localStorage를 건드리지 않음
      }
    }

    createProject();
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        {/* Linear-style spinner */}
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#5E6AD2]"
          role="status"
          aria-label="로딩 중"
        />
        <p className="text-sm text-gray-500">프로젝트 불러오는 중...</p>
      </div>
    </div>
  );
}
