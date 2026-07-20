"use client";

// 처리 중 전체 화면 오버레이 — 단계 문구가 순환하며 "일하고 있음"을 보여준다
import { useEffect, useState } from "react";

export function LoadingOverlay({ steps, title }: { steps: string[]; title: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % steps.length), 1400);
    return () => clearInterval(t);
  }, [steps.length]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/70 backdrop-blur-sm">
      <div className="flex w-80 flex-col items-center gap-5 rounded-3xl bg-white p-8 shadow-2xl">
        {/* 스피너 */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🤖</div>
        </div>
        <p className="text-xl font-bold text-slate-800">{title}</p>
        <p key={i} className="animate-pulse text-center text-base text-blue-600">{steps[i]}</p>
        <div className="flex gap-1.5">
          {steps.map((_, d) => (
            <span key={d} className={`h-2 w-2 rounded-full transition ${d === i ? "bg-blue-600" : "bg-slate-200"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
