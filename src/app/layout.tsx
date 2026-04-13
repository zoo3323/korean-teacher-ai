import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "국어 지문 분석기",
  description: "국어 지문을 업로드하고 AI로 분석하며 문제를 생성하는 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="h-full bg-white text-gray-900">{children}</body>
    </html>
  );
}
