export default function DoneLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
      <p className="text-xl font-bold text-slate-700">접수를 마무리하는 중...</p>
    </main>
  );
}
