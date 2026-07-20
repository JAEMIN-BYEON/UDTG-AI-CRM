// K3: AI 추천 결과 — 7.20 개편: 적합도 점수·세부 항목 제거, 센터 소개서로 대체
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { prisma } from "@/lib/db";
import { finalizeConsultation } from "@/app/actions";
import { FinalizeButton } from "./finalize-button";

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
            {/* 상단 센터 정보 (유지) */}
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold">
                {medal[r.rank - 1]} {r.listing.brand} <span className="text-slate-400">·</span> {r.listing.category}
              </h2>
              {r.listing.sunTopAvailable && (
                <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">선탑 가능</span>
              )}
            </div>

            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-lg leading-relaxed">{r.reasonText}</p>

            {/* 세부 항목은 센터 소개서로 대체 (7.20 회의) */}
            {r.listing.introMd ? (
              <div className="prose prose-slate mt-5 max-w-none rounded-xl border border-slate-100 p-5 prose-headings:mt-3 prose-headings:mb-2">
                <ReactMarkdown>{r.listing.introMd}</ReactMarkdown>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                {r.listing.shift} {r.listing.workHours} · 자세한 조건은 담당자가 상담에서 안내드립니다.
              </p>
            )}
          </div>
        ))}
      </div>

      {consultation.status === "추천완료" ? (
        <form action={finalizeConsultation.bind(null, consultation.id)} className="mt-10">
          <FinalizeButton />
          <p className="mt-3 text-center text-slate-400">완료하시면 담당자에게 전달되어 심층 상담이 진행됩니다.</p>
        </form>
      ) : (
        // 이미 접수된 건 — 고객 재접속(뒤로가기)이나 담당자 확인용 열람 시 중복 접수 방지
        <div className="mt-10 rounded-2xl bg-emerald-50 p-6 text-center">
          <p className="text-xl font-bold text-emerald-700">✅ 이미 상담 신청이 완료된 건입니다</p>
          <p className="mt-1 text-sm text-emerald-600">담당자에게 전달되어 있습니다. (현재 상태: {consultation.status})</p>
        </div>
      )}
    </main>
  );
}
