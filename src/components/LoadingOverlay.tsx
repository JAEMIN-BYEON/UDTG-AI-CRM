"use client";

// 처리 중 전체 화면 오버레이 — 단계가 순서대로 완료 표시되고 진행 바·경과 시간이
// 계속 움직여 "시스템이 살아있음"을 분명하게 보여준다 (멈춘 화면 오인 방지)
import { useEffect, useState } from "react";

export function LoadingOverlay({ steps, title }: { steps: string[]; title: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // 단계는 4초 간격으로 완료 처리, 마지막 단계는 끝날 때까지 진행 중 유지
  const current = Math.min(Math.floor(elapsed / 4), steps.length - 1);
  // 진행 바: 45초에 걸쳐 95%까지 천천히 차오름 (완료는 화면 전환으로 대체)
  const pct = Math.min(95, Math.round((1 - Math.exp(-elapsed / 18)) * 100));

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/70 backdrop-blur-sm">
      <div className="flex w-96 max-w-[92vw] flex-col items-center gap-5 rounded-3xl bg-white p-8 shadow-2xl">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🤖</div>
        </div>
        <p className="text-xl font-bold text-slate-800">{title}</p>

        {/* 진행 바 */}
        <div className="w-full">
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600 transition-all duration-1000" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>{pct}%</span>
            <span>{elapsed}초 경과</span>
          </div>
        </div>

        {/* 단계 체크리스트 */}
        <ul className="w-full space-y-2 text-base">
          {steps.map((s, i) => (
            <li key={s} className={`flex items-center gap-2 ${i < current ? "text-slate-400" : i === current ? "font-semibold text-blue-700" : "text-slate-300"}`}>
              {i < current ? (
                <span className="text-emerald-500">✔</span>
              ) : i === current ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-blue-600" />
              ) : (
                <span className="inline-block h-4 w-4 rounded-full border-2 border-slate-200" />
              )}
              {s}
            </li>
          ))}
        </ul>

        <p className="text-center text-sm text-slate-400">
          AI 분석에 <b>최대 1분</b> 정도 걸릴 수 있습니다.<br />화면을 누르거나 새로고침하지 말고 잠시만 기다려 주세요.
        </p>
      </div>
    </div>
  );
}
