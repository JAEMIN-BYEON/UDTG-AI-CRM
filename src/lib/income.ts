// 운송료 원문에서 금액(만원) 범위 자동 추출 — 추천 엔진 수입 점수용 (8.10 개편)
// 예: "완제 610만원" → 610~610 / "330~400만원" → 330~400 / "3,900,000원" → 390~390
export function deriveIncomeRange(fee: string): { min: number; max: number } {
  const vals: number[] = [];
  const num = (s: string) => parseInt(s.replace(/,/g, ""), 10);

  // "330~400만원" 형태의 범위
  for (const m of fee.matchAll(/(\d[\d,]*)\s*[~\-]\s*(\d[\d,]*)\s*만\s*원?/g)) {
    vals.push(num(m[1]), num(m[2]));
  }
  // "610만원" 단일 표기
  for (const m of fee.matchAll(/(\d[\d,]*)\s*만\s*원?/g)) {
    vals.push(num(m[1]));
  }
  // "3,900,000원" 원 단위 표기 (6자리 이상)
  for (const m of fee.matchAll(/(\d{1,3}(?:,\d{3}){2,}|\d{6,})\s*원/g)) {
    vals.push(Math.round(num(m[1]) / 10000));
  }

  const plausible = vals.filter((v) => v >= 100 && v <= 3000); // 월 운송료 상식 범위(만원)
  if (plausible.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...plausible), max: Math.max(...plausible) };
}
