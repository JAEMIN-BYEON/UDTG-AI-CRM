// K3-2: 센터 소개서 학습 — 추천 물량의 소개서를 모두 확인한 후 상담 신청
// (소개서 학습 후 상담 진행 → 심층상담 시간 단축)
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { finalizeConsultation } from "@/app/actions";
import { FinalizeButton } from "../result/finalize-button";
import { IntroFrame } from "@/components/IntroFrame";
import { IntroPager } from "./intro-pager";

export default async function IntroPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ i?: string }> }) {
  const { id } = await params;
  const { i } = await searchParams;
  const initial = Number.isFinite(parseInt(i ?? "", 10)) ? parseInt(i!, 10) : 0;
  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: {
      recommendations: {
        include: { listing: { include: { quotes: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } } } } },
        orderBy: { rank: "asc" },
      },
    },
  });
  if (!consultation) notFound();

  const medal = ["🥇", "🥈", "🥉"];
  const recs = consultation.recommendations;

  const finalizeForm = (
    <form action={finalizeConsultation.bind(null, consultation.id)}>
      <FinalizeButton />
      <p className="mt-3 text-center text-slate-400">완료하시면 담당자에게 전달되어 심층 상담이 진행됩니다.</p>
    </form>
  );

  return (
    <main className="mx-auto max-w-3xl p-6 pb-24">
      <h1 className="text-3xl font-bold">추천 물량 <span className="text-blue-600">소개서 확인</span></h1>
      <p className="mt-2 text-lg text-slate-500">
        추천드린 물량의 소개서를 확인해 보세요. 미리 보고 오시면 상담이 훨씬 빨라집니다.
      </p>

      {consultation.status !== "추천완료" ? (
        <div className="mt-10 rounded-2xl bg-emerald-50 p-6 text-center">
          <p className="text-xl font-bold text-emerald-700">✅ 이미 상담 신청이 완료된 건입니다</p>
          <p className="mt-1 text-sm text-emerald-600">담당자에게 전달되어 있습니다. (현재 상태: {consultation.status})</p>
        </div>
      ) : recs.length === 0 ? (
        <div className="mt-10">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-8 text-lg">
            조건에 맞는 물량을 찾지 못했습니다. 상담을 신청하시면 담당자가 직접 도와드리겠습니다.
          </div>
          <div className="mt-8">{finalizeForm}</div>
        </div>
      ) : (
        <div className="mt-8">
          <IntroPager
            initial={initial}
            labels={recs.map((r) => `${medal[r.rank - 1]} ${r.listing.brand} · ${r.listing.category}`)}
            slides={recs.map((r) => (
              <div key={r.id}>
                {r.listing.quotes.length > 0 ? (
                  <IntroFrame src={`/api/intro/${r.listing.id}`} title={`${r.listing.brand} 센터 소개서`} />
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <p className="text-xl font-bold">{r.listing.brand} · {r.listing.category}</p>
                    <p className="mt-3 rounded-xl bg-slate-50 p-4 text-lg leading-relaxed">{r.reasonText}</p>
                    <p className="mt-3 text-sm text-slate-400">
                      {r.listing.shift} {r.listing.workHours} · 자세한 조건은 담당자가 상담에서 안내드립니다.
                    </p>
                  </div>
                )}
              </div>
            ))}
            cta={finalizeForm}
          />
        </div>
      )}

      <p className="mt-10 text-center">
        <Link href={`/consult/${consultation.id}/result`} className="text-sm text-slate-400 hover:text-slate-600">← 추천 결과로 돌아가기</Link>
      </p>
    </main>
  );
}
