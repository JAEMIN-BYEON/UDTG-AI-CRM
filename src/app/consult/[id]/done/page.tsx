// K4: 접수 완료
import Link from "next/link";
import { AutoReturn } from "@/components/AutoReturn";

export default function DonePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="animate-bounce text-7xl">✅</div>
      <h1 className="text-3xl font-bold">상담 신청이 완료되었습니다</h1>
      <p className="rounded-full bg-emerald-50 px-5 py-2 font-semibold text-emerald-700">담당자에게 전달되었습니다</p>
      <p className="text-xl text-slate-500">
        담당자가 추천 내용을 확인한 뒤<br />곧 심층 상담을 도와드리겠습니다.
      </p>
      <Link href="/" className="mt-6 rounded-xl border border-slate-300 px-8 py-4 text-lg font-semibold text-slate-600">
        처음 화면으로
      </Link>
      <AutoReturn seconds={30} />
    </main>
  );
}
