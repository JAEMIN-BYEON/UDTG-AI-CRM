import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "운수대통로지스 상담 AI",
  description: "내방 상담 접수 및 AI 물량 추천 시스템",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
