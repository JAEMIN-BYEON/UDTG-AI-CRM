"use client";

// 소개서 학습 페이저 — 추천 물량 소개서를 한 장씩 넘겨 모두 확인해야
// 마지막에 상담 신청 버튼이 나타난다 (학습 후 상담 → 상담 시간 단축)
import { useState } from "react";

export function IntroPager({ labels, slides, cta }: { labels: string[]; slides: React.ReactNode[]; cta: React.ReactNode }) {
  const [idx, setIdx] = useState(0);
  const [seen, setSeen] = useState(1); // 확인한 최대 페이지 수
  const last = slides.length - 1;

  return (
    <div>
      {/* 페이지 표시 */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-lg font-bold text-slate-700">{labels[idx]}</p>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-500">
          {idx + 1} / {slides.length}
        </span>
      </div>

      {slides.map((s, i) => (
        <div key={i} className={i === idx ? "" : "hidden"}>{s}</div>
      ))}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIdx((v) => Math.max(0, v - 1))}
          className={`rounded-xl border border-slate-300 px-6 py-4 text-lg font-semibold ${idx === 0 ? "invisible" : ""}`}
        >
          ← 이전 소개서
        </button>
        {idx < last && (
          <button
            type="button"
            onClick={() => {
              const next = idx + 1;
              setIdx(next);
              setSeen((v) => Math.max(v, next + 1));
              window.scrollTo({ top: 0 });
            }}
            className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-bold text-white hover:bg-blue-700"
          >
            다음 소개서 →
          </button>
        )}
      </div>

      {/* 모든 소개서를 확인한 뒤에만 신청 버튼 노출 */}
      {seen >= slides.length && idx === last ? (
        <div className="mt-8">{cta}</div>
      ) : (
        <p className="mt-8 rounded-xl bg-slate-50 p-4 text-center text-slate-400">
          소개서를 모두 확인하시면 상담 신청 버튼이 나타납니다. ({seen} / {slides.length} 확인)
        </p>
      )}
    </div>
  );
}
