// K3: AI 추천 결과 — 추천 물량·사유 요약 → 소개서 학습 페이지(intro)로 이동
// 소개서를 모두 확인해야 상담 신청 가능 (학습 후 상담 → 상담 시간 단축)
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

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
        {consultation.recommendations.map((r, idx) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold">
                {medal[r.rank - 1]} {r.listing.brand} <span className="text-slate-400">·</span> {r.listing.category}
              </h2>
              {r.listing.sunTopAvailable && (
                <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">선탑 가능</span>
              )}
            </div>
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-lg leading-relaxed">{r.reasonText}</p>
            {/* 9.7 회의: 추천 물량을 눌러 해당 소개서를 바로 볼 수 있게 */}
            <Link
              href={`/consult/${consultation.id}/intro?i=${idx}`}
              className="mt-4 flex min-h-13 items-center justify-center rounded-xl border-2 border-blue-200 bg-blue-50 px-6 text-lg font-bold text-blue-700 transition hover:bg-blue-100"
            >
              📄 {r.listing.brand} 소개서 보기 →
            </Link>
          </div>
        ))}
      </div>

      {consultation.status === "추천완료" ? (
        <div className="mt-10">
          <Link
            href={`/consult/${consultation.id}/intro`}
            className="block w-full rounded-2xl bg-blue-600 px-8 py-6 text-center text-2xl font-bold text-white shadow-lg transition hover:bg-blue-700"
          >
            📄 센터 소개서 확인하기 →
          </Link>
          <p className="mt-3 text-center text-slate-400">
            추천 물량의 소개서를 모두 확인하신 후 상담 신청을 하실 수 있습니다.
          </p>
        </div>
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
