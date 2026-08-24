import Link from "next/link";

// 키오스크 홈 — 고객이 보는 첫 화면. 행동은 하나(상담 시작)만 크게,
// 직원용 링크는 하단에 작게 분리 (오터치 방지)
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-10 p-8">
      <div className="text-center">
        <p className="text-base font-bold tracking-[0.3em] text-blue-600">운수대통로지스</p>
        <h1 className="mt-3 text-5xl font-bold leading-tight">
          화물 운송 물량<br />상담 AI 시스템
        </h1>
        <p className="mt-4 text-xl text-slate-500">
          조건을 입력하시면 <b className="text-slate-700">AI가 맞는 물량을 추천</b>해 드립니다
        </p>
      </div>

      <Link
        href="/consult"
        className="w-full rounded-2xl bg-blue-600 px-8 py-7 text-center text-3xl font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 active:scale-[0.99]"
      >
        상담 시작하기
      </Link>
      <p className="-mt-6 text-base text-slate-400">화면을 눌러 시작해 주세요 · 약 3분 소요</p>

      <div className="mt-6 flex gap-4 text-sm text-slate-300">
        <Link href="/staff" className="hover:text-slate-500">담당자 대시보드</Link>
        <span>·</span>
        <Link href="/admin/listings" className="hover:text-slate-500">물량 관리</Link>
      </div>
      <p className="text-xs text-slate-300">v0.24.0</p>
    </main>
  );
}
