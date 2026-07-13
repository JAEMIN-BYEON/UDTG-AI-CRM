// S1: 담당자 접수 대시보드
import Link from "next/link";
import { prisma } from "@/lib/db";
import { logout } from "@/app/login/actions";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  작성중: "bg-slate-100 text-slate-500",
  추천완료: "bg-amber-100 text-amber-700",
  접수완료: "bg-blue-100 text-blue-700",
  심층상담완료: "bg-emerald-100 text-emerald-700",
};

export default async function StaffPage() {
  const consultations = await prisma.consultation.findMany({
    orderBy: { createdAt: "desc" },
    include: { recommendations: { include: { listing: true }, orderBy: { rank: "asc" }, take: 1 } },
  });

  const today = consultations.filter(
    (c) => c.createdAt.toDateString() === new Date().toDateString()
  ).length;
  const pending = consultations.filter((c) => c.status === "접수완료").length;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">담당자 대시보드</h1>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">← 홈</Link>
          <form action={logout}>
            <button className="text-sm text-slate-400 hover:text-slate-600">로그아웃</button>
          </form>
        </div>
      </div>

      <div className="mt-4 flex gap-4">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3"><span className="text-sm text-slate-400">오늘 접수</span> <b className="ml-2 text-xl">{today}건</b></div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3"><span className="text-sm text-slate-400">심층 상담 대기</span> <b className="ml-2 text-xl text-blue-600">{pending}건</b></div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-sm text-slate-500">
            <tr>
              <th className="px-4 py-3">접수 시각</th>
              <th className="px-4 py-3">고객</th>
              <th className="px-4 py-3">희망 조건</th>
              <th className="px-4 py-3">1순위 추천</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {consultations.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-500">
                  {c.createdAt.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 font-semibold">{c.name} <span className="text-sm font-normal text-slate-400">({c.age}세)</span></td>
                <td className="px-4 py-3 text-sm">{c.desiredRegion} · {c.shiftAvailability} · 월 {c.desiredIncome}만원</td>
                <td className="px-4 py-3 text-sm">{c.recommendations[0] ? `${c.recommendations[0].listing.brand} ${c.recommendations[0].listing.category}` : "-"}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusColor[c.status] ?? ""}`}>{c.status}</span></td>
                <td className="px-4 py-3"><Link href={`/staff/${c.id}`} className="font-semibold text-blue-600 hover:underline">상세 →</Link></td>
              </tr>
            ))}
            {consultations.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">아직 접수된 상담이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
