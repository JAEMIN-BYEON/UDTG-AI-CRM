import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <p className="text-sm font-semibold tracking-widest text-blue-600">운수대통로지스</p>
        <h1 className="mt-2 text-4xl font-bold">상담 AI 시스템</h1>
        <p className="mt-3 text-slate-500">고객 조건에 맞는 물량을 AI가 추천해 드립니다</p>
      </div>

      <Link
        href="/consult"
        className="w-full rounded-2xl bg-blue-600 px-8 py-6 text-center text-2xl font-bold text-white shadow-lg transition hover:bg-blue-700"
      >
        상담 시작하기
      </Link>

      <div className="flex gap-4 text-sm text-slate-400">
        <Link href="/staff" className="hover:text-slate-600">담당자 대시보드</Link>
        <span>·</span>
        <Link href="/admin/listings" className="hover:text-slate-600">물량 관리</Link>
      </div>
      <p className="text-xs text-slate-300">v0.4.0</p>
    </main>
  );
}
