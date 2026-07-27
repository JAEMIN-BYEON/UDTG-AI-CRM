import type { Listing } from "@prisma/client";
import { saveListing } from "@/app/actions";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none";
const label = "mb-1 block text-sm font-semibold text-slate-600";

export function ListingForm({ listing }: { listing?: Listing }) {
  return (
    <form action={saveListing} className="space-y-4">
      {listing && <input type="hidden" name="id" value={listing.id} />}

      <div className="grid grid-cols-3 gap-4">
        <div><span className={label}>브랜드 *</span><input name="brand" required defaultValue={listing?.brand} className={field} placeholder="다이소" /></div>
        <div><span className={label}>센터</span><input name="center" defaultValue={listing?.center} className={field} placeholder="남사" /></div>
        <div>
          <span className={label}>카테고리 *</span>
          <input name="category" required defaultValue={listing?.category ?? ""} className={field} placeholder="상온" list="category-suggest" />
          <datalist id="category-suggest">
            {["상온", "저온", "식자재", "잡화", "공산품", "집배송", "간선", "가구", "유제품"].map((v) => <option key={v} value={v} />)}
          </datalist>
        </div>
      </div>

      <div><span className={label}>지역 (콤마 구분) *</span><input name="region" required defaultValue={listing?.region} className={field} placeholder="용인,수원,화성" /></div>

      <div className="grid grid-cols-3 gap-4">
        <div><span className={label}>근무시간</span><input name="workHours" defaultValue={listing?.workHours} className={field} placeholder="06:00-15:00" /></div>
        <div>
          <span className={label}>주/야간 *</span>
          <select name="shift" defaultValue={listing?.shift ?? "주간"} className={field}>{["주간", "야간", "격일"].map((v) => <option key={v}>{v}</option>)}</select>
        </div>
        <div>
          <span className={label}>운송료 구조 *</span>
          <select name="payStructure" defaultValue={listing?.payStructure ?? "완제"} className={field}>{["완제", "무제", "매출제"].map((v) => <option key={v}>{v}</option>)}</select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div><span className={label}>실수령 최소 (만원) *</span><input name="incomeMin" required type="number" defaultValue={listing?.incomeMin} className={field} /></div>
        <div><span className={label}>실수령 최대 (만원) *</span><input name="incomeMax" required type="number" defaultValue={listing?.incomeMax} className={field} /></div>
        <div><span className={label}>최소 초기자금 (만원) *</span><input name="initialCapitalMin" required type="number" defaultValue={listing?.initialCapitalMin} className={field} /></div>
      </div>

      <div>
        <span className={label}>모집 대수 (센터별 잔여 자리) *</span>
        <input name="slotCount" required type="number" min={0} defaultValue={listing?.slotCount ?? 1} className={field} />
        <p className="mt-1 text-xs text-slate-400">0이면 AI 추천에서 제외됩니다. 목록 화면에서 ＋/− 로도 조절할 수 있습니다.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <span className={label}>상하차 강도 (1~5) *</span>
          <select name="physicalLoad" defaultValue={listing?.physicalLoad ?? 3} className={field}>{[1, 2, 3, 4, 5].map((v) => <option key={v}>{v}</option>)}</select>
        </div>
        <div><span className={label}>상하차 방식</span><input name="loadType" defaultValue={listing?.loadType} className={field} placeholder="롤테이너" /></div>
        <div><span className={label}>넘버 방식 (콤마) *</span><input name="numberPlates" required defaultValue={listing?.numberPlates} className={field} placeholder="개별,법인임대" /></div>
      </div>

      <div><span className={label}>차량 조건 *</span><input name="vehicleRequirement" required defaultValue={listing?.vehicleRequirement} className={field} placeholder="1톤 탑차" /></div>

      <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
        📄 센터 소개서는 물량 관리 목록의 <b>&quot;PPT 업로드&quot;</b>로 등록하세요 — PPT를 올리면 디자인된 양식으로 변환되어 고객 추천 화면에 표시됩니다.
      </p>
      <div><span className={label}>장점</span><textarea name="pros" rows={2} defaultValue={listing?.pros} className={field} /></div>
      <div><span className={label}>단점</span><textarea name="cons" rows={2} defaultValue={listing?.cons} className={field} /></div>

      <div>
        <span className={label}>내부 참고 메모 <span className="font-normal text-slate-400">(고객에게 노출되지 않음)</span></span>
        <textarea name="internalMemo" rows={4} defaultValue={listing?.internalMemo} className={field} placeholder="센터 담당자, 특이사항 등" />
        {listing?.reviewNote && (
          <p className="mt-1 rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-700">⚠ {listing.reviewNote} — 저장하면 확인 완료로 처리됩니다.</p>
        )}
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="sunTopAvailable" defaultChecked={listing?.sunTopAvailable ?? true} className="h-5 w-5" />
        <span className="font-semibold">선탑 가능</span>
      </label>

      <button className="w-full rounded-xl bg-blue-600 py-3 text-lg font-bold text-white">저장</button>
    </form>
  );
}
