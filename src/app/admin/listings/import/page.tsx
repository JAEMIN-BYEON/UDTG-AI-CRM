// 다우 Work 물량 CSV·엑셀 가져오기 — 업로드 → AI 구조화 미리보기 → 검수 후 반영
import Link from "next/link";
import { ImportClient } from "./import-client";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">⬆ 물량 CSV·엑셀 가져오기 <span className="text-sm font-normal text-slate-400">(다우 Work 내보내기)</span></h1>
        <Link href="/admin/listings" className="text-sm text-slate-400 hover:text-slate-600">← 물량 관리</Link>
      </div>
      <div className="mt-3 rounded-xl bg-blue-50 p-4 text-sm leading-relaxed text-blue-800">
        <b>사용 순서</b><br />
        1) 다우 Work에서 물량 목록을 CSV 또는 엑셀(.xlsx)로 내보내 업로드 → AI(gpt-5.6)가 메모·시간 정보를 구조화해 미리보기를 만듭니다.<br />
        2) 내용 확인 후 &quot;반영&quot;을 누르면 — <b>신규 물량은 비활성(검수 대기)으로 등록</b>되고, 이미 연동된 물량은 <b>잔여 대수만 갱신</b>됩니다.<br />
        3) 상태 매핑: 현재고 N → 잔여 N대 · 5대이상 지속 → 5대 · 일시품절/빈칸 → 0대 (추천 제외). 판매금액 컬럼은 저장하지 않습니다.
      </div>
      <div className="mt-5">
        <ImportClient />
      </div>
    </main>
  );
}
