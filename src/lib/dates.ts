// 시간 표시는 항상 한국 시간(Asia/Seoul) 기준
// (Cloud Run 컨테이너는 UTC라서 서버 렌더링 시 명시하지 않으면 9시간 차이가 남)
const TZ = "Asia/Seoul";

export const fmtDateTime = (d: Date) =>
  d.toLocaleString("ko-KR", { timeZone: TZ, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export const fmtFull = (d: Date) => d.toLocaleString("ko-KR", { timeZone: TZ });

export const fmtDate = (d: Date) => d.toLocaleDateString("ko-KR", { timeZone: TZ });

// 같은 '한국 날짜'인지 비교 (오늘 접수 집계용)
export const isSameSeoulDay = (a: Date, b: Date) => fmtDate(a) === fmtDate(b);
