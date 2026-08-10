// 출근시간 텍스트에서 주간/야간 자동 판별 (8.10 개편 — 폼에서 주/야간 항목 제거)
// 04~14시 시작 = 주간, 그 외 = 야간. 판별 불가 시 fallback.
export function deriveShift(startTime: string, fallback = "주간"): string {
  const m = startTime.match(/(\d{1,2})\s*[시:~]/);
  if (!m) return fallback;
  const h = parseInt(m[1], 10);
  if (h < 0 || h > 23) return fallback;
  return h >= 4 && h <= 14 ? "주간" : "야간";
}
