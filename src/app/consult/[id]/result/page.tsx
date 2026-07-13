// K3: AI 추천 결과 — 추천 3건 카드 + 접수 완료
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { finalizeConsultation } from "@/app/actions";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: { recommendations: { include: { listing: true }, orderBy: { rank: "asc" } } },
  });
  if (!consultation) notFound();

  const medal = ["🥇", "🥈", "🥉"];

  return (
    <main className="mx-auto max-w-3xl p-6 pb-24">
      <h1 className="text-3xl font-bold">
        {consultation.name}님을 위한 <span className="text-blue-600">AI 추천 물량</span>
      </h1>
      <p className="mt-2 text-lg text-slate-500">입력하신 조건과 보유 물량을 비교해 가장 적합한 물량을 골랐습니다.</p>

      {consultation.recommendations.length === 0 && (
        <div className="mt-10 rounded-2xl border border-amber-300 bg-amber-50 p-8 text-lg">
          조건에 맞는 물량을 찾지 못했습니다. 담당자가 직접 상담을 도와드리겠습니다.
        </div>
      )}

      <div className="mt-8 space-y-6">
        {consultation.recommendations.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold">
                {medal[r.rank - 1]} {r.listing.brand} <span className="text-slate-400">·</span> {r.listing.category}
              </h2>
              <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                적합도 {r.score}점
              </span>
            </div>

            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-lg leading-relaxed">{r.reasonText}</p>

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-base sm:grid-cols-3">
              <div><dt className="text-sm text-slate-400">근무시간</dt><dd className="font-semibold">{r.listing.shift} {r.listing.workHours}</dd></div>
              <div><dt className="text-sm text-slate-400">운송료 구조</dt><dd className="font-semibold">{r.listing.payStructure}</dd></div>
              <div><dt className="text-sm text-slate-400">예상 실수령</dt><dd className="font-semibold">{r.listing.incomeMin}~{r.listing.incomeMax}만원</dd></div>
              <div><dt className="text-sm text-slate-400">상·하차 강도</dt><dd className="font-semibold">{"●".repeat(r.listing.physicalLoad)}{"○".repeat(5 - r.listing.physicalLoad)} ({r.listing.loadType})</dd></div>
              <div><dt className="text-sm text-slate-400">차량 조건</dt><dd className="font-semibold">{r.listing.vehicleRequirement}</dd></div>
              <div><dt className="text-sm text-slate-400">넘버 방식</dt><dd className="font-semibold">{r.listing.numberPlates}</dd></div>
            </dl>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <p className="rounded-lg bg-emerald-50 p-3 text-emerald-800"><b>장점</b> — {r.listing.pros}</p>
              <p className="rounded-lg bg-rose-50 p-3 text-rose-800"><b>유의점</b> — {r.listing.cons}</p>
            </div>

            {r.listing.sunTopAvailable && (
              <p className="mt-3 text-sm font-semibold text-blue-600">✓ 선탑(동승 체험) 가능한 물량입니다</p>
            )}
          </div>
        ))}
      </div>

      <form action={finalizeConsultation.bind(null, consultation.id)} className="mt-10">
        <button className="w-full rounded-2xl bg-blue-600 px-8 py-6 text-2xl font-bold text-white shadow-lg transition hover:bg-blue-700">
          이 내용으로 상담 신청 완료
        </button>
        <p className="mt-3 text-center text-slate-400">완료하시면 담당자에게 전달되어 심층 상담이 진행됩니다.</p>
      </form>
    </main>
  );
}
