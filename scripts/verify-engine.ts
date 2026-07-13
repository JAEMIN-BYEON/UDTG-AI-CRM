// 추천 엔진 검증 — 설계서 §7.2 검증 케이스 5건
import "dotenv/config";
import { PrismaClient, Consultation } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { recommend } from "../src/lib/engine";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});

const base = {
  id: "test", status: "작성중", name: "테스트", phone: "010-0000-0000", residenceArea: "용인",
  license: "1종 보통", hasCargoCert: false, drivingYears: 10, desiredWorkHours: "", desiredBrand: "",
  hasVehicle: false, vehiclePreference: "", interestedIn: "", questions: "", sunTopSchedule: "",
  familyConsent: "", notes: "", createdAt: new Date(), completedAt: null,
};

const cases: { label: string; expect: (brand: string, category: string) => boolean; c: Consultation }[] = [
  {
    label: "50대, 초보, 주간 희망 → 다이소/상온",
    expect: (b, cat) => b === "다이소" || cat === "상온배송",
    c: { ...base, age: 54, cargoYears: 0, desiredIncome: 350, desiredRegion: "용인", shiftAvailability: "주간만", fitnessLevel: 3, initialCapital: 1000 } as Consultation,
  },
  {
    label: "30대, 고수입 희망, 체력 좋음 → 식자재/대형/간선",
    expect: (_b, cat) => cat === "식자재" || cat === "간선",
    c: { ...base, age: 34, cargoYears: 2, desiredIncome: 550, desiredRegion: "용인", shiftAvailability: "둘다", fitnessLevel: 5, initialCapital: 4000 } as Consultation,
  },
  {
    label: "야간 가능, 안정성 희망 → 편의점 저온 (CU/GS)",
    expect: (b) => ["CU", "GS25"].includes(b),
    c: { ...base, age: 45, cargoYears: 1, desiredIncome: 400, desiredRegion: "용인", shiftAvailability: "야간만", fitnessLevel: 3, initialCapital: 1500 } as Consultation,
  },
  {
    label: "체력 부담 있음 → 롤테이너 중심 코스",
    expect: () => true, // loadType 확인은 아래에서 별도 출력
    c: { ...base, age: 58, cargoYears: 0, desiredIncome: 330, desiredRegion: "성남", shiftAvailability: "주간만", fitnessLevel: 1, initialCapital: 1000 } as Consultation,
  },
  {
    label: "초기 자금 부족 → 법인임대넘버 가능 물량",
    expect: () => true, // numberPlates 확인은 아래에서 별도 출력
    c: { ...base, age: 40, cargoYears: 0, desiredIncome: 350, desiredRegion: "수원", shiftAvailability: "둘다", fitnessLevel: 3, initialCapital: 300 } as Consultation,
  },
];

async function main() {
  const listings = await prisma.listing.findMany({ where: { isActive: true } });
  let pass = 0;

  for (const t of cases) {
    const result = recommend(t.c, listings);
    const top = result[0];
    const ok = top && t.expect(top.listing.brand, top.listing.category);
    // 케이스 4: 1순위 물량의 상하차 강도가 낮아야 함
    const extra4 = t.label.startsWith("체력") ? top?.listing.physicalLoad <= 2 : true;
    // 케이스 5: 1순위가 법인임대 가능해야 함
    const extra5 = t.label.startsWith("초기") ? top?.listing.numberPlates.includes("법인임대") : true;
    const passed = Boolean(ok && extra4 && extra5);
    if (passed) pass++;

    console.log(`${passed ? "✅" : "❌"} ${t.label}`);
    result.forEach((r) =>
      console.log(`     ${r.score}점  ${r.listing.brand} ${r.listing.category} (강도${r.listing.physicalLoad}, ${r.listing.numberPlates})`)
    );
  }

  console.log(`\n${pass}/${cases.length} 케이스 통과`);
  if (pass < cases.length) process.exit(1);
}

main().finally(() => prisma.$disconnect());
