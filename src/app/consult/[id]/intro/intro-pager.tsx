"use client";

// 소개서 학습 페이저 — 추천 물량 소개서를 모두 확인해야 상담 신청 버튼이 나타난다
// (학습 후 상담 → 상담 시간 단축). 9.7 회의: 물량 탭을 눌러 원하는 소개서로 바로 이동 가능.
import { useState } from "react";

export function IntroPager({ labels, slides, cta, initial = 0 }: { labels: string[]; slides: React.ReactNode[]; cta: React.ReactNode; initial?: number }) {
  const start = Math.min(Math.max(initial, 0), slides.length - 1);
  const [idx, setIdx] = useState(start);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([start]));
  const last = slides.length - 1;
  const allSeen = visited.size >= slides.length;

  const go = (next: number) => {
    setIdx(next);
    setVisited((v) => new Set(v).add(next));
    window.scrollTo({ top: 0 });
  };

  return (
    <div>
      {/* 물량 탭 — 눌러서 원하는 소개서로 바로 이동 (확인한 물량은 ✓) */}
      <div className="mb-4 flex flex-wrap gap-2">
        {labels.map((l, i) => (
          <button
            key={l}
            type="button"
            onClick={() => go(i)}
            className={`rounded-xl border-2 px-4 py-2.5 text-base font-semibold transition ${
              i === idx ? "border-blue-600 bg-blue-600 text-white" : visited.has(i) ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            {l}{visited.has(i) && i !== idx ? " ✓" : ""}
          </button>
        ))}
        <span className="self-center rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-500">
          {visited.size} / {slides.length} 확인
        </span>
      </div>

      {slides.map((s, i) => (
        <div key={i} className={i === idx ? "" : "hidden"}>{s}</div>
      ))}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(Math.max(0, idx - 1))}
          className={`min-h-13 rounded-xl border-2 border-slate-300 px-6 text-lg font-semibold text-slate-600 ${idx === 0 ? "invisible" : ""}`}
        >
          ← 이전 소개서
        </button>
        {idx < last && (
          <button
            type="button"
            onClick={() => go(idx + 1)}
            className="min-h-13 rounded-xl bg-blue-600 px-8 text-lg font-bold text-white hover:bg-blue-700"
          >
            다음 소개서 →
          </button>
        )}
      </div>

      {/* 모든 소개서를 확인한 뒤에만 신청 버튼 노출 */}
      {allSeen ? (
        <div className="mt-8">{cta}</div>
      ) : (
        <p className="mt-8 rounded-xl bg-slate-50 p-4 text-center text-slate-400">
          소개서를 모두 확인하시면 상담 신청 버튼이 나타납니다. ({visited.size} / {slides.length} 확인)
        </p>
      )}
    </div>
  );
}
