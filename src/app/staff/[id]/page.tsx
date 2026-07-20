// S2: 상담 상세 / 요약 리포트 — 인쇄(print CSS)로 심층 상담 자료 출력 (설계서 §9)
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { markCounseled, revertCounseled, deleteConsultation } from "@/app/actions";
import { PrintButton } from "./print-button";
import { ConfirmButton } from "@/components/ConfirmButton";
import { fmtFull } from "@/lib/dates";
import type { ScoreItem } from "@/lib/engine";

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.consultation.findUnique({
    where: { id },
    include: {
      recommendations: { include: { listing: true }, orderBy: { rank: "asc" } },
      consents: true,
      videoViews: { include: { video: true } },
    },
  });
  if (!c || c.deletedAt) notFound();

  const row = "flex justify-between border-b border-slate-100 py-1.5 text-sm";
  const dt = "text-slate-400";

  return (
    <main className="mx-auto max-w-3xl p-6 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/staff" className="text-sm text-slate-400 hover:text-slate-600">← 대시보드</Link>
        <div className="flex items-center gap-2">
          <PrintButton />
          {c.status === "접수완료" && (
            <form action={markCounseled.bind(null, c.id)}>
              <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">심층 상담 완료 처리</button>
            </form>
          )}
          {c.status === "심층상담완료" && (
            <form action={revertCounseled.bind(null, c.id)}>
              <button className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-bold text-emerald-700">완료 취소 (접수완료로 되돌리기)</button>
            </form>
          )}
          <form action={deleteConsultation.bind(null, c.id)}>
            <ConfirmButton
              message={`${c.name}님의 상담 기록을 휴지통으로 이동할까요?\n(휴지통에서 복구할 수 있습니다)`}
              className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-bold text-rose-500 hover:bg-rose-50"
            >
              삭제
            </ConfirmButton>
          </form>
        </div>
      </div>

      {/* ── 리포트 본문 (인쇄 대상) ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-8 print:rounded-none print:border-0 print:p-2">
        <div className="border-b-2 border-slate-800 pb-3">
          <p className="text-xs font-bold tracking-widest text-slate-400">운수대통로지스 · 상담 요약 리포트</p>
          <h1 className="mt-1 text-2xl font-bold">
            {c.name}{" "}
            <span className="text-base font-normal text-slate-500">
              ({c.age}세 · <a href={`tel:${c.phone}`} className="text-blue-600 hover:underline print:text-slate-500">{c.phone}</a>)
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            접수: {fmtFull(c.createdAt)} · 상태: {c.status} · 동의: {c.consents.map((x) => `${x.consentType}(${x.policyVersion})`).join(", ")}
          </p>
        </div>

        <div className="mt-5 grid gap-8 sm:grid-cols-2 print:grid-cols-2">
          <section>
            <h2 className="mb-2 font-bold">👤 고객 정보</h2>
            <div className={row}><span className={dt}>거주지역</span><span>{c.residenceArea}</span></div>
            <div className={row}><span className={dt}>운전/화물 경력</span><span>{c.drivingYears}년 / {c.cargoYears}년</span></div>
            <div className={row}><span className={dt}>면허</span><span>{c.license}{c.hasCargoCert && " · 화물자격증 보유"}</span></div>
            <div className={row}><span className={dt}>차량</span><span>{c.hasVehicle ? "보유" : "미보유"} ({c.vehiclePreference || "-"})</span></div>
          </section>
          <section>
            <h2 className="mb-2 font-bold">🎯 희망 조건</h2>
            <div className={row}><span className={dt}>희망 수입</span><span>월 {c.desiredIncome}만원</span></div>
            <div className={row}><span className={dt}>지역/시간</span><span>{c.desiredRegion} · {c.shiftAvailability} {c.desiredWorkHours && `(${c.desiredWorkHours})`}</span></div>
            <div className={row}><span className={dt}>체력/자금</span><span>체력 {c.fitnessLevel}/5 · {c.initialCapital}만원</span></div>
            <div className={row}><span className={dt}>희망 브랜드</span><span>{c.desiredBrand || "무관"}</span></div>
          </section>
        </div>

        <section className="mt-6">
          <h2 className="mb-2 font-bold">🤖 AI 추천 결과</h2>
          {c.recommendations.map((r) => {
            const breakdown = JSON.parse(r.scoreBreakdown) as ScoreItem[];
            return (
              <div key={r.id} className="mb-3 rounded-lg border border-slate-200 p-4 print:break-inside-avoid">
                <div className="flex justify-between">
                  <b>{r.rank}순위 · {r.listing.brand} {r.listing.category}</b>
                  <span className="text-sm text-slate-500">적합도 {r.score}점 · 사유: {r.reasonSource === "openai" ? `AI(${r.modelId})` : "규칙 기반"}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed">{r.reasonText}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {breakdown.map((b) => `${b.label} ${b.points}/${b.max}`).join(" · ")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {r.listing.shift} {r.listing.workHours} · {r.listing.payStructure} · 실수령 {r.listing.incomeMin}~{r.listing.incomeMax}만원 · {r.listing.vehicleRequirement} · 넘버 {r.listing.numberPlates} · 선탑 {r.listing.sunTopAvailable ? "가능" : "불가"}
                </p>
              </div>
            );
          })}
        </section>

        <div className="mt-4 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
          <section>
            <h2 className="mb-2 font-bold">💬 고객 요청 사항</h2>
            <div className={row}><span className={dt}>관심 물량</span><span>{c.interestedIn || "-"}</span></div>
            <div className={row}><span className={dt}>궁금한 부분</span><span className="max-w-[60%] text-right">{c.questions || "-"}</span></div>
            <div className={row}><span className={dt}>선탑 희망 일정</span><span>{c.sunTopSchedule || "-"} <span className="text-xs text-slate-400">(확정은 다우 캘린더)</span></span></div>
            <div className={row}><span className={dt}>가족 동의</span><span>{c.familyConsent || "-"}</span></div>
            <div className={row}><span className={dt}>특이사항</span><span>{c.notes || "-"}</span></div>
            <div className={row}><span className={dt}>시청 영상</span><span>{c.videoViews.length ? c.videoViews.map((v) => v.video.title).join(", ") : "없음"}</span></div>
          </section>
          <section>
            <h2 className="mb-2 font-bold">📋 심층 상담 체크포인트</h2>
            <ul className="space-y-1.5 text-sm">
              {["추천 물량이 적합한 이유 설명", "고객 조건과 물량의 장단점 비교", "실제 근무시간 안내", "예상 실수령 구조 설명", "차량 준비 방향 협의", "넘버 방식 결정", "선탑 시 확인사항 안내", "계약 가능 여부 확인", "투입 가능 일정 협의"].map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="inline-block h-4 w-4 shrink-0 rounded border border-slate-400" /> {t}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
