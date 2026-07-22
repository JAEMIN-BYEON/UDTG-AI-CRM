"use client";

// 물량별 센터 소개서 업로드 — PPTX → 디자인 PDF/HTML 변환 후 이 물량에 연결
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { checkPptxFile, uploadErrorMessage } from "@/lib/upload";

export function IntroUpload({ listingId, hasIntro }: { listingId: string; hasIntro: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pptx"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const problem = checkPptxFile(f);
          if (problem) {
            alert(`❌ ${problem}`);
            if (inputRef.current) inputRef.current.value = "";
            return;
          }
          setBusy(true);
          try {
            const fd = new FormData();
            fd.append("file", f);
            fd.append("listingId", listingId);
            const r = await fetch("/api/quotes/generate", { method: "POST", body: fd });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error ?? "변환 실패");
            alert(`✅ 소개서 등록 완료 (${j.brand} ${j.center})${j.enriched ? " — AI 보강 적용" : ""}`);
            router.refresh();
          } catch (err) {
            alert(`❌ ${uploadErrorMessage(err)}`);
          } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = "";
          }
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
      >
        {busy ? "변환 중..." : hasIntro ? "PPT 교체" : "PPT 업로드"}
      </button>
    </>
  );
}
