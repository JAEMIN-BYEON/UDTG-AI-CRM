"use client";

// 담당자 대시보드 자동 갱신 — 새 접수를 새로고침 없이 확인
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return <span className="text-xs text-slate-300">{seconds}초마다 자동 갱신</span>;
}
