// 물량 휴지통 — 복구 / 영구 삭제 (추천 이력이 있으면 영구 삭제 불가: 상담 기록 보존)
import Link from "next/link";
import { prisma } from "@/lib/db";
import { restoreListing, purgeListing } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { fmtDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ListingTrashPage() {
  const trashed = await prisma.listing.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    include: { _count: { select: { recommendations: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🗑 물량 휴지통</h1>
        <Link href="/admin/listings" className="text-sm text-slate-400 hover:text-slate-600">← 물량 관리</Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">브랜드 / 카테고리</th>
              <th className="px-4 py-3">지역</th>
              <th className="px-4 py-3">삭제 시각</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trashed.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3 font-semibold">{l.brand} <span className="font-normal text-slate-400">· {l.category}</span></td>
                <td className="px-4 py-3">{l.region}</td>
                <td className="px-4 py-3 text-slate-500">{l.deletedAt ? fmtDateTime(l.deletedAt) : "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <form action={restoreListing.bind(null, l.id)}>
                      <button className="font-semibold text-blue-600 hover:underline">복구</button>
                    </form>
                    {l._count.recommendations === 0 ? (
                      <form action={purgeListing.bind(null, l.id)}>
                        <ConfirmButton
                          message={`"${l.brand} ${l.category}" 물량을 영구 삭제할까요? 되돌릴 수 없습니다.`}
                          className="text-rose-500 hover:underline"
                        >
                          영구 삭제
                        </ConfirmButton>
                      </form>
                    ) : (
                      <span className="text-xs text-slate-400" title="이 물량으로 추천된 상담 기록이 있어 영구 삭제할 수 없습니다">
                        추천 이력 {l._count.recommendations}건 — 보존
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {trashed.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">휴지통이 비어 있습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
