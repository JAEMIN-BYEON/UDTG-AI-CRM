export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600" />
      </div>
      <p className="text-lg font-semibold text-slate-500">센터 소개서를 불러오고 있습니다...</p>
    </main>
  );
}
