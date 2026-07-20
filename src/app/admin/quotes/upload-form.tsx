"use client";

// 견적서 생성 폼 — PPTX 업로드 → 추출→AI보강→PDF 생성
import { useState } from "react";
import { useRouter } from "next/navigation";

export function QuoteUploadForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget as HTMLFormElement);
        const f = fd.get("file");
        if (!(f instanceof File) || !f.name) return setMsg("PPTX 파일을 선택하세요.");
        setBusy(true);
        setMsg(null);
        try {
          const r = await fetch("/api/quotes/generate", { method: "POST", body: fd });
          const j = await r.json();
          if (!r.ok) throw new Error(j.error ?? "생성 실패");
          setMsg(`✅ ${j.brand} ${j.center} 견적서 생성 완료${j.enriched ? " (AI 보강됨)" : " (AI 미사용 — 원본 그대로)"}`);
          router.refresh();
        } catch (err) {
          setMsg(`❌ ${err instanceof Error ? err.message : "생성 실패"}`);
        } finally {
          setBusy(false);
        }
      }}
    >
      <input type="file" name="file" accept=".pptx" className="text-sm" />
      <button disabled={busy} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "생성 중... (추출→AI 보강→렌더, 최대 1분)" : "견적서 생성"}
      </button>
      {msg && <span className="text-sm">{msg}</span>}
    </form>
  );
}
