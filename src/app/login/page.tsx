import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-8">
      <p className="text-sm font-semibold tracking-widest text-blue-600">운수대통로지스</p>
      <h1 className="mt-1 text-2xl font-bold">직원 로그인</h1>
      <p className="mt-2 text-sm text-slate-500">담당자/관리자 접속 코드를 입력하세요.</p>

      {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-600">접속 코드가 올바르지 않습니다.</p>}

      <form action={login} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next ?? "/staff"} />
        <input
          name="passcode"
          type="password"
          required
          autoFocus
          placeholder="접속 코드"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
        />
        <button className="w-full rounded-xl bg-blue-600 py-3 text-lg font-bold text-white hover:bg-blue-700">로그인</button>
      </form>
    </main>
  );
}
