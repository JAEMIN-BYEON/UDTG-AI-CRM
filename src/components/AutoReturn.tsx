"use client";

// 키오스크용 — 완료 화면에서 일정 시간 후 자동으로 처음 화면 복귀 (다음 고객 대비)
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AutoReturn({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    const t = setInterval(() => setLeft((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (left <= 0) router.push("/");
  }, [left, router]);

  return <p className="text-sm text-slate-400">{Math.max(0, left)}초 후 처음 화면으로 돌아갑니다</p>;
}
