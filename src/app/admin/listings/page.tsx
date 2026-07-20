// S3: 물량 관리 (운영본부) — 추천 품질의 원천 데이터
import Link from "next/link";
import { prisma } from "@/lib/db";
import { toggleListing, deleteListing, adjustSlot } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { fmtDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

const STALE_DAYS = 30; // 설계서 §15: 30일 초과 미갱신 경고

export default async function ListingsPage() {
  const listings = await prisma.listing.findMany({ where: { deletedAt: null }, orderBy: [{ isActive: "desc" }, { brand: "asc" }] });
  const now = Date.now();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">물량 관리 <span className="text-sm font-normal text-slate-400">(운영본부)</span></h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/listings/trash" className="text-sm text-slate-400 hover:text-slate-600">🗑 휴지통</Link>
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">← 홈</Link>
          <Link href="/admin/listings/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">+ 물량 등록</Link>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">브랜드 / 카테고리</th>
              <th className="px-4 py-3">지역</th>
              <th className="px-4 py-3">근무</th>
              <th className="px-4 py-3">실수령</th>
              <th className="px-4 py-3">잔여 대수</th>
              <th className="px-4 py-3">최근 갱신</th>
              <th className="px-4 py-3">모집</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {listings.map((l) => {
              const staleDays = Math.floor((now - l.updatedAt.getTime()) / 86400000);
              return (
                <tr key={l.id} className={l.isActive ? "hover:bg-slate-50" : "bg-slate-50 text-slate-400"}>
                  <td className="px-4 py-3 font-semibold">{l.brand} <span className="font-normal text-slate-400">· {l.category}</span></td>
                  <td className="px-4 py-3">{l.region}</td>
                  <td className="px-4 py-3">{l.shift} {l.workHours}</td>
                  <td className="px-4 py-3">{l.incomeMin}~{l.incomeMax}만원</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <form action={adjustSlot.bind(null, l.id, -1)}>
                        <button className="h-6 w-6 rounded border border-slate-300 text-slate-500 hover:bg-slate-100">−</button>
                      </form>
                      <span className={`w-8 text-center font-bold ${l.slotCount === 0 ? "text-rose-500" : ""}`}>{l.slotCount}</span>
                      <form action={adjustSlot.bind(null, l.id, 1)}>
                        <button className="h-6 w-6 rounded border border-slate-300 text-slate-500 hover:bg-slate-100">＋</button>
                      </form>
                      {l.slotCount === 0 && <span className="ml-1 rounded bg-rose-100 px-1.5 py-0.5 text-xs font-bold text-rose-600">소진</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {fmtDate(l.updatedAt)}
                    {staleDays > STALE_DAYS && <span className="ml-1 rounded bg-rose-100 px-1.5 py-0.5 text-xs font-bold text-rose-600">{staleDays}일 경과</span>}
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleListing.bind(null, l.id)}>
                      <button className={`rounded-full px-3 py-1 text-xs font-bold ${l.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                        {l.isActive ? "모집중" : "중지"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/listings/${l.id}/edit`} className="font-semibold text-blue-600 hover:underline">수정</Link>
                      <form action={deleteListing.bind(null, l.id)}>
                        <ConfirmButton
                          message={`"${l.brand} ${l.category}" 물량을 휴지통으로 이동할까요?\n(휴지통에서 복구할 수 있습니다)`}
                          className="text-sm text-slate-300 hover:text-rose-500"
                        >
                          삭제
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        ※ 물량 정보가 최신이어야 AI 추천 품질이 유지됩니다. 30일 이상 미갱신 물량은 경고가 표시됩니다.<br />
        ※ 잔여 대수가 0인 물량은 AI 추천에서 자동 제외됩니다. 계약 성사 시 −, 자리가 생기면 ＋로 조절하세요.
      </p>
    </main>
  );
}
