"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white">
      🖨 리포트 인쇄
    </button>
  );
}
