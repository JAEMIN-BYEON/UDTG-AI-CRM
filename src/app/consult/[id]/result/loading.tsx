// 결과 페이지 렌더링 대기 화면 — 제출 오버레이와 자연스럽게 이어진다
export default function ResultLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600" />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">🤖</div>
      </div>
      <p className="text-xl font-bold text-slate-700">추천 결과를 불러오는 중...</p>
    </main>
  );
}
