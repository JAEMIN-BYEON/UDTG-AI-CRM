import type { Listing } from "@prisma/client";
import { saveListing } from "@/app/actions";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none";
const label = "mb-1 block text-sm font-semibold text-slate-600";

export function ListingForm({ listing }: { listing?: Listing }) {
  return (
    <form action={saveListing} className="space-y-4">
      {listing && <input type="hidden" name="id" value={listing.id} />}

      <div className="grid grid-cols-2 gap-4">
        <div><span className={label}>브랜드 *</span><input name="brand" required defaultValue={listing?.brand} className={field} placeholder="다이소" /></div>
        <div>
          <span className={label}>카테고리 *</span>
          <select name="category" defaultValue={listing?.category ?? "상온배송"} className={field}>
            {["상온배송", "저온배송", "간선", "식자재"].map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <div><span className={label}>지역 (콤마 구분) *</span><input name="region" required defaultValue={listing?.region} className={field} placeholder="용인,수원,화성" /></div>

      <div className="grid grid-cols-3 gap-4">
        <div><span className={label}>근무시간 *</span><input name="workHours" required defaultValue={listing?.workHours} className={field} placeholder="06:00-15:00" /></div>
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

      <div className="grid grid-cols-3 gap-4">
        <div>
          <span className={label}>상하차 강도 (1~5) *</span>
          <select name="physicalLoad" defaultValue={listing?.physicalLoad ?? 3} className={field}>{[1, 2, 3, 4, 5].map((v) => <option key={v}>{v}</option>)}</select>
        </div>
        <div><span className={label}>상하차 방식 *</span><input name="loadType" required defaultValue={listing?.loadType} className={field} placeholder="롤테이너" /></div>
        <div><span className={label}>넘버 방식 (콤마) *</span><input name="numberPlates" required defaultValue={listing?.numberPlates} className={field} placeholder="개별,법인임대" /></div>
      </div>

      <div><span className={label}>차량 조건 *</span><input name="vehicleRequirement" required defaultValue={listing?.vehicleRequirement} className={field} placeholder="1톤 탑차" /></div>
      <div><span className={label}>장점 *</span><textarea name="pros" required rows={2} defaultValue={listing?.pros} className={field} /></div>
      <div><span className={label}>단점 *</span><textarea name="cons" required rows={2} defaultValue={listing?.cons} className={field} /></div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="sunTopAvailable" defaultChecked={listing?.sunTopAvailable ?? true} className="h-5 w-5" />
        <span className="font-semibold">선탑 가능</span>
      </label>

      <button className="w-full rounded-xl bg-blue-600 py-3 text-lg font-bold text-white">저장</button>
    </form>
  );
}
