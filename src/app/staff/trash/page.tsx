// 상담 휴지통 — 복구 / 영구 삭제
import Link from "next/link";
import { prisma } from "@/lib/db";
import { restoreConsultation, purgeConsultation } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { fmtDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function StaffTrashPage() {
  const trashed = await prisma.consultation.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🗑 상담 휴지통</h1>
        <Link href="/staff" className="text-sm text-slate-400 hover:text-slate-600">← 대시보드</Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">고객</th>
              <th className="px-4 py-3">접수 시각</th>
              <th className="px-4 py-3">삭제 시각</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trashed.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-semibold">{c.name} <span className="font-normal text-slate-400">({c.age}세 · {c.phone})</span></td>
                <td className="px-4 py-3 text-slate-500">{fmtDateTime(c.createdAt)}</td>
                <td className="px-4 py-3 text-slate-500">{c.deletedAt ? fmtDateTime(c.deletedAt) : "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <form action={restoreConsultation.bind(null, c.id)}>
                      <button className="font-semibold text-blue-600 hover:underline">복구</button>
                    </form>
                    <form action={purgeConsultation.bind(null, c.id)}>
                      <ConfirmButton
                        message={`${c.name}님의 상담 기록을 영구 삭제할까요?\n추천 결과·동의 이력이 함께 삭제되며 절대 되돌릴 수 없습니다.`}
                        className="text-rose-500 hover:underline"
                      >
                        영구 삭제
                      </ConfirmButton>
                    </form>
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
