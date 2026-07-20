// 물동량 견적서(센터 소개서) 생성·관리 — 핸드오프 이식 (7.20)
import Link from "next/link";
import { prisma } from "@/lib/db";
import { fmtDateTime } from "@/lib/dates";
import { QuoteUploadForm } from "./upload-form";
import { deleteQuote } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, brand: true, center: true, enriched: true, modelId: true, createdAt: true },
  });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📄 물동량 견적서 <span className="text-sm font-normal text-slate-400">(소개서 생성)</span></h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/listings" className="text-sm text-slate-400 hover:text-slate-600">← 물량 관리</Link>
        </div>
      </div>

      <p className="mt-2 text-sm text-slate-500">
        화주사 견적서 PPTX(운수대통 표준 양식)를 올리면 브랜드 컬러·로고가 적용된 A4 1페이지 견적서를 생성합니다.
      </p>

      <div className="mt-5">
        <QuoteUploadForm />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">브랜드 / 센터</th>
              <th className="px-4 py-3">생성 시각</th>
              <th className="px-4 py-3">AI 보강</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quotes.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold">{q.brand} <span className="font-normal text-slate-400">· {q.center}</span></td>
                <td className="px-4 py-3 text-slate-500">{fmtDateTime(q.createdAt)}</td>
                <td className="px-4 py-3">{q.enriched ? <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">{q.modelId}</span> : <span className="text-xs text-slate-400">원본</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <a href={`/api/quotes/${q.id}/pdf`} target="_blank" className="font-semibold text-blue-600 hover:underline">PDF</a>
                    <a href={`/api/quotes/${q.id}/html`} target="_blank" className="font-semibold text-blue-600 hover:underline">HTML</a>
                    <form action={deleteQuote.bind(null, q.id)}>
                      <ConfirmButton message={`${q.brand} ${q.center} 견적서를 삭제할까요?`} className="text-slate-300 hover:text-rose-500">삭제</ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {quotes.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">아직 생성된 견적서가 없습니다. PPTX를 업로드해 보세요.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
