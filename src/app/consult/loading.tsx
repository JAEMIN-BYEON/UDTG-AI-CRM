// 홈 → 신청서 진입 전환 로딩 (콜드 스타트 시 멈춘 화면 오인 방지)
export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600" />
      </div>
      <p className="text-lg font-semibold text-slate-500">상담 신청서를 준비하고 있습니다...</p>
    </main>
  );
}
