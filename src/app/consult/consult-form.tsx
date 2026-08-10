"use client";

// 키오스크 상담신청서 — 7.20 회의 개편안 반영
// 고령 고객 배려: 큰 글씨, 한 화면 한 주제, 선택형 위주
import { useState } from "react";
import { submitConsultation } from "@/app/actions";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { hangulizeInput } from "@/lib/hangul";
import { REGIONS } from "@/lib/regions";

const STEPS = ["동의", "기본 정보", "희망 조건", "상담 내용", "확인"] as const;

const INCOME_OPTIONS = ["300", "400", "500", "600", "700"]; // 희망월순이익 (만원, 700은 이상)
const TONNAGE_OPTIONS = ["1톤", "1.4톤", "2.5톤", "3.5톤", "5톤", "8톤", "11톤 이상", "기타"];
const BODY_OPTIONS = ["카고", "탑차(내장탑)", "냉탑", "윙바디", "기타"];

const field =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg focus:border-blue-500 focus:outline-none";
const label = "mb-1 block text-base font-semibold text-slate-700";

function Radio({ name, options, defaultValue, required = true, suffix }: { name: string; options: string[]; defaultValue?: string; required?: boolean; suffix?: (o: string) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o} className="cursor-pointer">
          <input type="radio" name={name} value={o} defaultChecked={o === defaultValue} className="peer sr-only" required={required} />
          <span className="inline-block rounded-xl border-2 border-slate-300 px-5 py-3 text-lg peer-checked:border-blue-600 peer-checked:bg-blue-50 peer-checked:font-bold peer-checked:text-blue-700">
            {suffix ? suffix(o) : o}
          </span>
        </label>
      ))}
    </div>
  );
}

// 숫자만 입력되도록 정리 (한글/문자 자동 제거 — 연령 입력 개선, 7.20 회의)
function numericOnly(e: React.FormEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  el.value = el.value.replace(/[^0-9]/g, "");
}

export function ConsultForm({ brands }: { brands: string[] }) {
  const [step, setStep] = useState(0);
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasVehicle, setHasVehicle] = useState(false);

  const show = (i: number) => (step === i ? "" : "hidden");

  return (
    <main className="mx-auto max-w-2xl p-6 pb-24">
      {submitting && (
        <LoadingOverlay
          title="AI가 분석하고 있습니다"
          steps={[
            "입력하신 조건을 확인하는 중...",
            "보유 물량과 대조하는 중...",
            "적합도를 계산하는 중...",
            "추천 사유를 작성하는 중...",
          ]}
        />
      )}

      {/* 진행 표시 */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${i <= step ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
              {i + 1}
            </div>
            <span className={`text-sm ${i === step ? "font-bold text-blue-700" : "text-slate-400"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="h-px w-4 bg-slate-300" />}
          </div>
        ))}
      </div>

      <form
        action={async (fd) => {
          // 주의: 여기서 setSubmitting을 켜면 React가 action(transition) 종료까지
          // 화면 갱신을 미뤄 오버레이가 안 보인다 — 버튼 onClick에서 미리 켠다
          try {
            await submitConsultation(fd);
            // 성공(리다이렉트) 시 오버레이 유지 — 결과 페이지 전환까지 공백 없음
          } catch (e) {
            const digest = (e as { digest?: string })?.digest ?? "";
            if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
            alert("접수 처리 중 오류가 발생했습니다. 직원에게 문의해 주세요.\n\n" + (e instanceof Error ? e.message : String(e)));
            setSubmitting(false);
          }
        }}
      >
        {/* ── Step 0: 동의 (K1) ── */}
        <section className={show(0)}>
          <h2 className="mb-4 text-2xl font-bold">개인정보 수집·이용 동의</h2>
          <div className="mb-6 h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600">
            <p className="font-bold">개인정보 수집·이용 동의서 (v1.0-2026-07)</p>
            <p className="mt-2">운수대통로지스(이하 &quot;회사&quot;)는 화물 운송 물량 상담을 위해 아래와 같이 개인정보를 수집·이용합니다.</p>
            <ul className="mt-2 list-disc pl-5">
              <li>수집 항목: 성명, 연락처, 거주지역, 연령, 화물 경력, 보유 면허, 자격증 보유 여부, 희망 근무 조건, 신용 상태, 초기 자금 규모, 차량 정보</li>
              <li>수집 목적: 맞춤 물량 추천, 상담 진행, 선탑·계약 안내</li>
              <li>보유 기간: 상담일로부터 1년 (계약 체결 시 계약 관리 기간)</li>
              <li>동의를 거부할 수 있으나, 거부 시 맞춤 상담 서비스 이용이 제한됩니다.</li>
            </ul>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-300 bg-white p-5 has-checked:border-blue-600 has-checked:bg-blue-50">
            <input type="checkbox" name="consent" className="h-6 w-6" checked={consented} onChange={(e) => setConsented(e.target.checked)} />
            <span className="text-lg font-semibold">위 내용을 확인했으며, 개인정보 수집·이용에 동의합니다.</span>
          </label>
        </section>

        {/* ── Step 1: 기본 정보 ── */}
        <section className={`space-y-5 ${show(1)}`}>
          <h2 className="text-2xl font-bold">기본 정보를 입력해 주세요</h2>
          <div><span className={label}>성명 *</span><input name="name" required onInput={hangulizeInput} className={field} placeholder="홍길동" /></div>
          <div><span className={label}>연락처 *</span><input name="phone" required type="tel" inputMode="tel" className={field} placeholder="010-0000-0000" /></div>
          {/* 7.27: 거주지역은 텍스트 입력 (시·군·구 단위로 자세히) */}
          <div>
            <span className={label}>거주지역 *</span>
            <input name="residenceArea" required onInput={hangulizeInput} className={field} placeholder="예: 용인시 처인구" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><span className={label}>연령 *</span><input name="age" required inputMode="numeric" onInput={numericOnly} maxLength={2} className={field} placeholder="52" /></div>
            <div><span className={label}>화물 경력 (년)</span><input name="cargoYears" inputMode="numeric" onInput={numericOnly} defaultValue={0} className={field} /></div>
          </div>
          {/* 7.27: 2종 보통은 수동/자동 분류 */}
          <div><span className={label}>보유 면허 *</span><Radio name="license" options={["1종 보통", "1종 대형", "2종 보통(수동)", "2종 보통(자동)"]} /></div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white p-4">
            <input type="checkbox" name="hasCargoCert" className="h-5 w-5" />
            <span className="text-lg">화물운송종사자격증이 있습니다 <span className="text-sm text-slate-400">(없어도 상담 가능합니다)</span></span>
          </label>
        </section>

        {/* ── Step 2: 희망 조건 ── */}
        <section className={`space-y-5 ${show(2)}`}>
          <h2 className="text-2xl font-bold">희망하시는 조건을 알려주세요</h2>
          <div>
            <span className={label}>희망 월순이익 *</span>
            <Radio name="desiredIncome" options={INCOME_OPTIONS} suffix={(o) => (o === "700" ? "700만원 이상" : `${o}만원`)} />
          </div>
          {/* 7.27: 희망 근무지역은 광역 선택형 (경기도는 남부/북부 분리) */}
          <div>
            <span className={label}>희망 근무지역 *</span>
            <Radio name="desiredRegion" options={[...REGIONS]} />
          </div>
          <div><span className={label}>주간 / 야간 가능 여부 *</span><Radio name="shiftAvailability" options={["주간만", "야간만", "둘다"]} /></div>
          <div>
            <span className={label}>근무가 어려운 시간 (선택)</span>
            <input name="unavailableTimes" onInput={hangulizeInput} className={field} placeholder="예: 새벽 4시 이전 출근 어려움" />
          </div>
          <div>
            <span className={label}>희망 브랜드 (복수 선택 가능)</span>
            <div className="flex flex-wrap gap-2">
              {brands.map((b) => (
                <label key={b} className="cursor-pointer">
                  <input type="checkbox" name="desiredBrand" value={b} className="peer sr-only" />
                  <span className="inline-block rounded-xl border-2 border-slate-300 px-5 py-3 text-lg peer-checked:border-blue-600 peer-checked:bg-blue-50 peer-checked:font-bold peer-checked:text-blue-700">{b}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-sm text-slate-400">선택하지 않으면 전체 물량에서 추천해 드립니다.</p>
          </div>
          <div>
            <span className={label}>체력 수준 *</span>
            <Radio name="fitnessLevel" options={["1", "2", "3", "4", "5"]} />
            <p className="mt-1 text-sm text-slate-400">1: 체력 부담이 큰 편 ~ 5: 매우 좋음</p>
          </div>
          <div><span className={label}>초기 자금 (만원) *</span><input name="initialCapital" required inputMode="numeric" onInput={numericOnly} className={field} placeholder="1000" /></div>
          <div><span className={label}>신용 상태 *</span><Radio name="creditStatus" options={["좋음", "보통", "나쁨", "회생", "파산"]} /></div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white p-4">
            <input type="checkbox" name="hasVehicle" className="h-5 w-5" checked={hasVehicle} onChange={(e) => setHasVehicle(e.target.checked)} />
            <span className="text-lg">차량을 보유하고 있습니다</span>
          </label>
          {hasVehicle && (
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <div>
                <span className={label}>차량 톤수 *</span>
                <select name="vehicleTonnage" className={field} required>
                  {TONNAGE_OPTIONS.map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <span className={label}>탑 종류 *</span>
                <select name="vehicleBodyType" className={field} required>
                  {BODY_OPTIONS.map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
          )}
          <div><span className={label}>신차 / 중고차 희망</span><Radio name="vehiclePreference" options={["신차", "중고차", "해당없음"]} defaultValue="해당없음" /></div>
        </section>

        {/* ── Step 3: 상담 내용 ── */}
        <section className={`space-y-5 ${show(3)}`}>
          <h2 className="text-2xl font-bold">상담받고 싶은 내용을 알려주세요</h2>
          <div><span className={label}>궁금한 부분</span><textarea name="questions" rows={3} onInput={hangulizeInput} className={field} placeholder="예: 실수령액이 얼마나 되는지 궁금합니다" /></div>
          <div>
            <span className={label}>선탑(동승 체험)이 불가능한 일정</span>
            <input name="sunTopSchedule" onInput={hangulizeInput} className={field} placeholder="예: 화요일 오전, 주말 불가" />
          </div>
        </section>

        {/* ── Step 4: 확인 ── */}
        <section className={show(4)}>
          <h2 className="mb-4 text-2xl font-bold">입력을 완료하셨습니다</h2>
          <p className="mb-6 text-lg text-slate-600">
            아래 버튼을 누르면 입력하신 조건으로 <b>AI가 맞춤 물량을 추천</b>해 드립니다.
          </p>
          <button
            type="button"
            disabled={submitting}
            onClick={(e) => {
              // 숨겨진 단계에 미입력 필드가 있으면 브라우저가 제출을 소리 없이 막는다
              // → 전체 단계를 직접 검사해 문제 단계로 이동시키고 안내 말풍선을 띄운다
              const form = (e.target as HTMLElement).closest("form")!;
              const sections = Array.from(form.querySelectorAll("section"));
              for (let i = 0; i < sections.length; i++) {
                const controls = sections[i].querySelectorAll<HTMLInputElement>("input, textarea, select");
                for (const el of controls) {
                  if (!el.checkValidity()) {
                    setStep(i);
                    setTimeout(() => el.reportValidity(), 100);
                    return;
                  }
                }
              }
              // 클릭 즉시(액션 시작 전) 오버레이를 띄운다 — 일반 이벤트라 바로 렌더됨
              setSubmitting(true);
              form.requestSubmit();
            }}
            className="w-full rounded-2xl bg-blue-600 px-8 py-6 text-2xl font-bold text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "AI가 물량을 분석하고 있습니다..." : "AI 추천 받기"}
          </button>
        </section>

        {/* 이동 버튼 */}
        <div className="mt-10 flex justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={`rounded-xl border border-slate-300 px-8 py-4 text-lg font-semibold ${step === 0 ? "invisible" : ""}`}
          >
            ← 이전
          </button>
          {step < STEPS.length - 1 && (
            <button
              type="button"
              disabled={step === 0 && !consented}
              onClick={(e) => {
                const form = (e.target as HTMLElement).closest("form")!;
                const current = form.querySelectorAll(`section:not(.hidden) input, section:not(.hidden) textarea, section:not(.hidden) select`);
                for (const el of current) if (!(el as HTMLInputElement).reportValidity()) return;
                setStep((s) => s + 1);
              }}
              className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-bold text-white disabled:opacity-40"
            >
              다음 →
            </button>
          )}
        </div>
      </form>
      <p className="mt-12 text-center text-xs text-slate-300">v0.20.0</p>
    </main>
  );
}
