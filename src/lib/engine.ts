// 추천 엔진 (설계서 §7)
// 원칙: 후보 선정은 규칙이, 설명은 LLM이. LLM은 새로운 물량을 만들지 않는다.
import type { Listing, Consultation } from "@prisma/client";

export type ScoreItem = { label: string; points: number; max: number; note: string };
export type Scored = {
  listing: Listing;
  score: number;
  breakdown: ScoreItem[];
  regionRelaxed: boolean;
  capitalRelaxed: boolean;
};

const csv = (s: string) => s.split(",").map((v) => v.trim()).filter(Boolean);

// 넘버 방식이 유연한 물량 — 자금 부족 고객도 진입 방안 협의 가능
// (운영 입력이 자유 텍스트라 "상관없음"/"무관"/"협의" 표현도 인정)
function rentalPossible(numberPlates: string): boolean {
  return ["법인임대", "상관없음", "무관", "협의"].some((k) => numberPlates.includes(k));
}

// ── 1단계: 하드 필터 (설계서 §7.1) ─────────────────────────────
function hardFilter(
  c: Consultation,
  listings: Listing[],
  opts: { relaxRegion: boolean; relaxCapital: boolean }
): { listing: Listing; regionRelaxed: boolean; capitalRelaxed: boolean }[] {
  return listings
    // 모집중 + 남은 대수 있음 + 휴지통 아님만 추천 대상
    .filter((l) => l.isActive && l.slotCount > 0 && !l.deletedAt)
    .filter((l) => {
      // 주/야간 가능 여부 (자금과 달리 상담으로 풀 수 없는 조건 → 항상 하드)
      if (c.shiftAvailability === "주간만" && l.shift === "야간") return false;
      if (c.shiftAvailability === "야간만" && l.shift === "주간") return false;
      return true;
    })
    .map((l) => {
      const capitalOk = c.initialCapital >= l.initialCapitalMin || rentalPossible(l.numberPlates);
      const regionMatch = csv(l.region).some(
        (r) => r.includes(c.desiredRegion) || c.desiredRegion.includes(r)
      );
      return { listing: l, capitalOk, regionMatch };
    })
    .filter((x) => opts.relaxCapital || x.capitalOk)
    .filter((x) => opts.relaxRegion || x.regionMatch)
    .map((x) => ({
      listing: x.listing,
      regionRelaxed: !x.regionMatch,
      capitalRelaxed: !x.capitalOk || (rentalPossible(x.listing.numberPlates) && c.initialCapital < x.listing.initialCapitalMin),
    }));
}

// ── 2단계: 규칙 스코어링 (설계서 §7.2 가중치) ──────────────────
function scoreOne(c: Consultation, l: Listing): ScoreItem[] {
  const items: ScoreItem[] = [];

  // 희망 수입 부합 (25)
  let income: number;
  let incomeNote: string;
  if (c.desiredIncome <= l.incomeMax) {
    income = 25;
    incomeNote = `희망 ${c.desiredIncome}만원이 예상 실수령(${l.incomeMin}~${l.incomeMax}만원) 범위 내`;
  } else {
    const gap = c.desiredIncome - l.incomeMax;
    income = Math.max(0, 25 - Math.ceil(gap / 20) * 5);
    incomeNote = `희망 수입이 예상 상한보다 ${gap}만원 높음`;
  }
  items.push({ label: "희망 수입", points: income, max: 25, note: incomeNote });

  // 체력 부합 (20)
  const fitGap = l.physicalLoad - c.fitnessLevel;
  const fitness = fitGap <= 0 ? 20 : Math.max(0, 20 - fitGap * 7);
  items.push({
    label: "체력 부합",
    points: fitness,
    max: 20,
    note: fitGap <= 0 ? `체력(${c.fitnessLevel}) 대비 상하차 강도(${l.physicalLoad}) 여유` : `상하차 강도(${l.physicalLoad})가 체력(${c.fitnessLevel})보다 높음`,
  });

  // 근무시간/주야간 (20)
  const shiftOk = c.shiftAvailability === "둘다" || (c.shiftAvailability === "주간만" && l.shift !== "야간") || (c.shiftAvailability === "야간만" && l.shift !== "주간");
  items.push({ label: "근무시간", points: shiftOk ? 20 : 0, max: 20, note: `${l.shift} 근무 (${l.workHours})` });

  // 경력 적합 (15) — 초보자에게 고강도/간선은 감점
  const novice = c.cargoYears === 0;
  const hardCourse = l.physicalLoad >= 4 || l.category === "간선";
  const exp = novice && hardCourse ? 5 : 15;
  items.push({
    label: "경력 적합",
    points: exp,
    max: 15,
    note: novice ? (hardCourse ? "화물 초보에게 난이도 높은 코스" : "화물 초보도 적응하기 쉬운 코스") : `화물 경력 ${c.cargoYears}년`,
  });

  // 희망 브랜드 일치 (10)
  const brandHit = c.desiredBrand !== "" && l.brand.includes(c.desiredBrand);
  items.push({ label: "희망 브랜드", points: brandHit ? 10 : c.desiredBrand === "" ? 5 : 0, max: 10, note: brandHit ? `희망 브랜드(${c.desiredBrand}) 일치` : c.desiredBrand === "" ? "브랜드 무관" : "희망 브랜드와 다름" });

  // 초기 자금 여유 (10)
  const rental = csv(l.numberPlates).includes("법인임대");
  let capital: number;
  let capNote: string;
  if (c.initialCapital >= l.initialCapitalMin * 1.5) {
    capital = 10;
    capNote = "초기 자금 여유 충분";
  } else if (c.initialCapital >= l.initialCapitalMin) {
    capital = 5;
    capNote = "초기 자금 충족";
  } else {
    capital = rental ? 3 : 0;
    capNote = rental ? "자금 부족하나 법인임대넘버로 진입 가능" : "초기 자금 부족";
  }
  items.push({ label: "초기 자금", points: capital, max: 10, note: capNote });

  return items;
}

// ── 추천 실행: 상위 3건 ─────────────────────────────────────────
// 결과 0건을 최소화하기 위해 단계적으로 필터를 완화한다:
// 정상 → 지역 완화 → 자금 완화 → 지역+자금 완화 (주/야간만은 끝까지 하드)
export function recommend(c: Consultation, listings: Listing[]): Scored[] {
  let candidates = hardFilter(c, listings, { relaxRegion: false, relaxCapital: false });
  if (candidates.length === 0) candidates = hardFilter(c, listings, { relaxRegion: true, relaxCapital: false });
  if (candidates.length === 0) candidates = hardFilter(c, listings, { relaxRegion: false, relaxCapital: true });
  if (candidates.length === 0) candidates = hardFilter(c, listings, { relaxRegion: true, relaxCapital: true });

  return candidates
    .map(({ listing, regionRelaxed, capitalRelaxed }) => {
      const breakdown = scoreOne(c, listing);
      let score = breakdown.reduce((s, i) => s + i.points, 0);
      if (regionRelaxed) score -= 10; // 인접/타 지역 감점
      if (capitalRelaxed) score -= 10; // 자금 기준 미달 감점 (상담 시 협의 전제)
      return { listing, score, breakdown, regionRelaxed, capitalRelaxed };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// ── 템플릿 사유 (P1 기본 + OpenAI 장애 시 폴백, 설계서 §7.3) ───
export function templateReason(c: Consultation, s: Scored): string {
  const top = [...s.breakdown].sort((a, b) => b.points / b.max - a.points / a.max).slice(0, 3);
  const grounds = top.map((i) => i.note).join(", ");
  const region = s.regionRelaxed ? " (희망 지역과 정확히 일치하지 않아 인접 물량으로 안내)" : "";
  const capital = s.capitalRelaxed
    ? " 초기 자금 기준에는 다소 미달하나, 넘버 방식·차량 준비 방안은 상담 시 협의 가능합니다."
    : "";
  return `${c.name}님의 조건과 비교한 결과, ${grounds} 등의 이유로 ${s.listing.brand} ${s.listing.category} 물량을 추천드립니다${region}. 장점: ${s.listing.pros}. 유의점: ${s.listing.cons}.${capital}`;
}
