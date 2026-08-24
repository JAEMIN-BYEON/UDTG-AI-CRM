"use client";

// CSV 가져오기 클라이언트 — 미리보기 → 검수 → 반영
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ImportPlan } from "@/lib/importListings";

type Preview = { plans: ImportPlan[]; aiUsed: boolean; missing: { id: string; brand: string; center: string }[] };

export function ImportClient() {
  const router = useRouter();
  const directRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [trashMissing, setTrashMissing] = useState(false);

  // 파일 → 분석 API 호출 (미리보기·바로 업로드 공용)
  async function analyzeFile(f: File): Promise<Preview> {
    const fd = new FormData();
    fd.append("file", f);
    const r = await fetch("/api/listings/import", { method: "POST", body: fd });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? "분석 실패");
    return j as Preview;
  }

  // 바로 업로드: 탐색기에서 파일을 고르면 분석 → 확인창 → 즉시 반영
  async function directUpload(f: File) {
    setMsg(null);
    setPreview(null);
    setBusy("분석 후 바로 반영하는 중... (최대 2분)");
    try {
      const p = await analyzeFile(f);
      const creates = p.plans.filter((x) => x.action === "create").length;
      const updates = p.plans.length - creates;
      const missingNote = p.missing.length > 0 ? `\n※ 파일에 없는 기존 연동 물량 ${p.missing.length}건은 그대로 둡니다 (정리가 필요하면 미리보기 경로를 이용하세요).` : "";
      if (!confirm(`총 ${p.plans.length}건을 바로 반영할까요?\n신규 ${creates}건(비활성·검수 대기) · 갱신 ${updates}건${missingNote}`)) return;
      const r = await fetch("/api/listings/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plans: p.plans, trashMissingIds: [] }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "반영 실패");
      setMsg(`✅ 업로드 완료 — 신규 ${j.created}건 등록(비활성), 기존 ${j.updated}건 잔여 대수 갱신`);
      router.refresh();
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "업로드 실패"}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <form
        className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget as HTMLFormElement).get("file");
          if (!(f instanceof File) || !f.name) return setMsg("CSV 또는 엑셀(.xlsx) 파일을 선택하세요.");
          setBusy("AI가 물량 데이터를 구조화하고 있습니다... (최대 2분)");
          setMsg(null);
          setPreview(null);
          try {
            setPreview(await analyzeFile(f));
          } catch (err) {
            setMsg(`❌ ${err instanceof Error ? err.message : "미리보기 실패"}`);
          } finally {
            setBusy(null);
          }
        }}
      >
        <input type="file" name="file" accept=".csv,.xlsx" className="text-sm" />
        <button disabled={!!busy} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          미리보기 생성
        </button>
        {/* 바로 업로드 전용 숨은 파일 입력 — 버튼 클릭 즉시 탐색기 팝업 */}
        <input
          ref={directRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) directUpload(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={!!busy}
          onClick={() => directRef.current?.click()}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          ⬆ 파일 업로드 (바로 반영)
        </button>
        {busy && <span className="text-sm text-slate-500">{busy}</span>}
        {msg && <span className="text-sm">{msg}</span>}
      </form>

      {preview && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              총 <b>{preview.plans.length}</b>건 — 신규 {preview.plans.filter((p) => p.action === "create").length} ·
              갱신 {preview.plans.filter((p) => p.action === "update").length} ·
              AI 구조화 {preview.aiUsed ? "적용됨" : "미적용(원본 그대로)"}
            </p>
            <button
              disabled={!!busy}
              onClick={async () => {
                const extra = trashMissing && preview.missing.length > 0 ? `\n※ 파일에 없는 기존 연동 물량 ${preview.missing.length}건은 휴지통으로 이동합니다.` : "";
                if (!confirm(`${preview.plans.length}건을 반영할까요?\n신규 물량은 비활성(검수 대기)으로 등록됩니다.${extra}`)) return;
                setBusy("반영 중...");
                try {
                  const r = await fetch("/api/listings/import/commit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      plans: preview.plans,
                      trashMissingIds: trashMissing ? preview.missing.map((m) => m.id) : [],
                    }),
                  });
                  const j = await r.json();
                  if (!r.ok) throw new Error(j.error ?? "반영 실패");
                  setMsg(`✅ 반영 완료 — 신규 ${j.created}건 등록(비활성), 기존 ${j.updated}건 잔여 대수 갱신${j.trashed ? `, 구 연동 물량 ${j.trashed}건 휴지통 이동` : ""}`);
                  setPreview(null);
                  router.refresh();
                } catch (err) {
                  setMsg(`❌ ${err instanceof Error ? err.message : "반영 실패"}`);
                } finally {
                  setBusy(null);
                }
              }}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ?? "이대로 반영"}
            </button>
          </div>

          {preview.missing.length > 0 && (
            <div className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              ⚠ 이번 파일에 없는 기존 연동 물량 <b>{preview.missing.length}건</b> —{" "}
              {preview.missing.slice(0, 12).map((m) => `${m.brand}(${m.center || "-"})`).join(", ")}
              {preview.missing.length > 12 ? ` 외 ${preview.missing.length - 12}건` : ""}
              <label className="mt-2 flex cursor-pointer items-center gap-2 font-semibold">
                <input type="checkbox" checked={trashMissing} onChange={(e) => setTrashMissing(e.target.checked)} className="h-4 w-4" />
                반영할 때 이 {preview.missing.length}건을 휴지통으로 이동 (다우 보드를 새로 만들어 ID가 바뀐 경우 체크 — 중복 방지, 휴지통에서 복구 가능)
              </label>
            </div>
          )}

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2">구분</th>
                  <th className="px-3 py-2">브랜드 / 센터</th>
                  <th className="px-3 py-2">카테고리</th>
                  <th className="px-3 py-2">지역</th>
                  <th className="px-3 py-2">근무</th>
                  <th className="px-3 py-2">운송료(만원)</th>
                  <th className="px-3 py-2">차량</th>
                  <th className="px-3 py-2">잔여</th>
                  <th className="px-3 py-2">확인 필요</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.plans.map((p) => (
                  <tr key={p.externalId} className={p.action === "update" ? "bg-blue-50/40" : ""}>
                    <td className="px-3 py-2">
                      {p.action === "create"
                        ? <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-600">신규</span>
                        : <span className="rounded bg-blue-50 px-1.5 py-0.5 font-bold text-blue-600">갱신</span>}
                    </td>
                    <td className="px-3 py-2 font-semibold">{p.brand} <span className="font-normal text-slate-400">{p.center}</span></td>
                    <td className="px-3 py-2">{p.category}</td>
                    <td className="px-3 py-2 max-w-40 truncate" title={p.region}>{p.region}</td>
                    <td className="px-3 py-2">{p.shift} {p.workHours}</td>
                    <td className="px-3 py-2">{p.incomeMin || p.incomeMax ? `${p.incomeMin}~${p.incomeMax}` : <span className="text-slate-300">-</span>}</td>
                    <td className="px-3 py-2 max-w-36 truncate" title={p.vehicleRequirement}>{p.vehicleRequirement}</td>
                    <td className="px-3 py-2 font-bold">{p.slotCount === 0 ? <span className="text-rose-500">0</span> : p.slotCount}</td>
                    <td className="px-3 py-2 text-slate-400 max-w-52 truncate" title={p.reviewNote}>{p.reviewNote || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
