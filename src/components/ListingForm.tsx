import type { Listing } from "@prisma/client";
import { saveListing } from "@/app/actions";

// 8.10 담당자 확정 항목 구성 (2차 수정 반영):
// 브랜드/센터명/센터상세주소 → 권역/상품종류 → 출근시간/업무시간
// → 운송료/월 운행일수/휴무일 → 차종 → 상차방식 및 분류시간/하차방식
// → 장점 → 애로 및 건의사항 → 내부참고 메모
// (운송료는 원문 입력 — 금액은 자동 추출되어 추천 점수에 사용. 증차대수는 목록 ＋/− 또는 CSV로 관리)

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none";
const label = "mb-1 block text-sm font-semibold text-slate-600";

export function ListingForm({ listing }: { listing?: Listing }) {
  const feeDefault =
    listing?.fee ||
    (listing && (listing.incomeMin || listing.incomeMax)
      ? listing.incomeMin === listing.incomeMax
        ? `${listing.incomeMin}만원`
        : `${listing.incomeMin}~${listing.incomeMax}만원`
      : "");

  return (
    <form action={saveListing} className="space-y-4">
      {listing && <input type="hidden" name="id" value={listing.id} />}

      <div className="grid grid-cols-3 gap-4">
        <div><span className={label}>브랜드 *</span><input name="brand" required defaultValue={listing?.brand} className={field} placeholder="다이소" /></div>
        <div><span className={label}>센터명</span><input name="center" defaultValue={listing?.center} className={field} placeholder="용인센터" /></div>
        <div><span className={label}>센터 상세주소</span><input name="centerAddress" defaultValue={listing?.centerAddress} className={field} placeholder="경기 용인시 처인구 ..." /></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div><span className={label}>권역 (콤마 구분) *</span><input name="region" required defaultValue={listing?.region} className={field} placeholder="용인,수원,화성" /></div>
        <div>
          <span className={label}>상품종류 *</span>
          <input name="category" required defaultValue={listing?.category ?? ""} className={field} placeholder="상온" list="category-suggest" />
          <datalist id="category-suggest">
            {["상온", "저온", "식자재", "잡화", "공산품", "집배송", "간선", "가구", "유제품"].map((v) => <option key={v} value={v} />)}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className={label}>출근시간</span>
          <input name="startTime" defaultValue={listing?.startTime} className={field} placeholder="05~06시" />
          <p className="mt-1 text-xs text-slate-400">주간/야간 추천 분류는 출근시간에서 자동 판별됩니다.</p>
        </div>
        <div><span className={label}>업무시간</span><input name="workHours" defaultValue={listing?.workHours} className={field} placeholder="06시~15시" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <span className={label}>운송료 *</span>
          <input name="fee" required defaultValue={feeDefault} className={field} placeholder="완제 610만원" />
          <p className="mt-1 text-xs text-slate-400">금액은 자동 인식되어 AI 추천 수입 비교에 사용됩니다.</p>
        </div>
        <div><span className={label}>월 운행일수</span><input name="workDays" defaultValue={listing?.workDays} className={field} placeholder="26일" /></div>
        <div><span className={label}>휴무일</span><input name="holidays" defaultValue={listing?.holidays} className={field} placeholder="일요일" /></div>
      </div>

      <div><span className={label}>차종 *</span><input name="vehicleRequirement" required defaultValue={listing?.vehicleRequirement} className={field} placeholder="2.5톤 내장탑" /></div>

      <div className="grid grid-cols-2 gap-4">
        <div><span className={label}>상차방식 및 분류시간</span><input name="loadType" defaultValue={listing?.loadType} className={field} placeholder="롤테이너 / 분류 1시간 30분" /></div>
        <div><span className={label}>하차방식</span><input name="unloadMethod" defaultValue={listing?.unloadMethod} className={field} placeholder="수작업 / 파렛트" /></div>
      </div>

      <div><span className={label}>장점</span><textarea name="pros" rows={2} defaultValue={listing?.pros} className={field} /></div>
      <div><span className={label}>애로 및 건의사항</span><textarea name="cons" rows={2} defaultValue={listing?.cons} className={field} /></div>

      <div>
        <span className={label}>내부참고 메모 <span className="font-normal text-slate-400">(고객에게 노출되지 않음)</span></span>
        <textarea name="internalMemo" rows={4} defaultValue={listing?.internalMemo} className={field} placeholder="센터 담당자, 특이사항 등" />
        {listing?.reviewNote && (
          <p className="mt-1 rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-700">⚠ {listing.reviewNote} — 저장하면 확인 완료로 처리됩니다.</p>
        )}
      </div>

      <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
        📄 센터 소개서는 물량 관리 목록의 <b>&quot;PPT 업로드&quot;</b>로, 증차대수는 목록의 ＋/− 버튼이나 CSV·엑셀 가져오기로 관리합니다.
      </p>

      <button className="w-full rounded-xl bg-blue-600 py-3 text-lg font-bold text-white">저장</button>
    </form>
  );
}
