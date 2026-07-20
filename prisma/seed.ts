import "dotenv/config";
// 물량 시드 데이터 — 설계서 §7.2 검증 케이스를 커버하도록 구성
// DATABASE_URL에 따라 SQLite/PostgreSQL 자동 선택 (src/lib/db.ts)
import { prisma } from "../src/lib/db";

const listings = [
  {
    brand: "다이소", category: "상온배송", region: "용인,수원,화성", workHours: "06:00-15:00",
    shift: "주간", payStructure: "완제", incomeMin: 330, incomeMax: 400, physicalLoad: 3,
    loadType: "롤테이너", numberPlates: "개별,법인임대", vehicleRequirement: "1톤 카고/탑차",
    initialCapitalMin: 500, slotCount: 3, pros: "고정 코스로 안정적, 주간 근무, 초보 적응 용이",
    cons: "롤테이너 상하차 반복으로 일정 체력 필요", sunTopAvailable: true,
  },
  {
    brand: "다이소", category: "상온배송", region: "성남,광주,이천", workHours: "07:00-16:00",
    shift: "주간", payStructure: "완제", incomeMin: 320, incomeMax: 380, physicalLoad: 2,
    loadType: "롤테이너", numberPlates: "개별,법인임대", vehicleRequirement: "1톤 탑차",
    initialCapitalMin: 500, slotCount: 3, pros: "체력 부담 낮은 롤테이너 중심 코스, 안정적 물량",
    cons: "수입 상한이 상대적으로 낮음", sunTopAvailable: true,
  },
  {
    brand: "CU", category: "저온배송", region: "용인,안성,평택", workHours: "22:00-07:00",
    shift: "야간", payStructure: "완제", incomeMin: 380, incomeMax: 450, physicalLoad: 3,
    loadType: "박스", numberPlates: "개별,법인", vehicleRequirement: "1톤 냉탑",
    initialCapitalMin: 1000, slotCount: 3, pros: "편의점 고정 코스로 매우 안정적, 야간 수당 반영 수입",
    cons: "야간 생활 패턴 적응 필요, 냉탑 차량 필요", sunTopAvailable: true,
  },
  {
    brand: "GS25", category: "저온배송", region: "수원,오산,화성", workHours: "21:00-06:00",
    shift: "야간", payStructure: "완제", incomeMin: 370, incomeMax: 440, physicalLoad: 3,
    loadType: "박스", numberPlates: "개별,법인임대", vehicleRequirement: "1톤 냉탑",
    initialCapitalMin: 800, slotCount: 3, pros: "안정적 편의점 물량, 법인임대넘버로 초기 부담 완화 가능",
    cons: "야간 근무, 저온 상품 취급 주의", sunTopAvailable: true,
  },
  {
    brand: "쿠팡", category: "간선", region: "동탄,인천,이천", workHours: "19:00-05:00",
    shift: "야간", payStructure: "매출제", incomeMin: 450, incomeMax: 600, physicalLoad: 4,
    loadType: "파렛트", numberPlates: "개별", vehicleRequirement: "5톤 윙바디",
    initialCapitalMin: 3000, slotCount: 3, pros: "고수입 가능, 허브 간 간선으로 배송지 단순",
    cons: "대형 차량·자금 필요, 체력 소모 큼, 야간 운행", sunTopAvailable: true,
  },
  {
    brand: "웰스토리", category: "식자재", region: "용인,수원,성남", workHours: "04:00-13:00",
    shift: "주간", payStructure: "무제", incomeMin: 420, incomeMax: 520, physicalLoad: 5,
    loadType: "박스+파렛트", numberPlates: "개별,법인", vehicleRequirement: "1.4톤~2.5톤 냉탑",
    initialCapitalMin: 2000, slotCount: 3, pros: "식자재 고정 거래처, 높은 수입",
    cons: "새벽 출근, 상하차 강도 높아 체력 필수", sunTopAvailable: true,
  },
  {
    brand: "식자재 프랜차이즈", category: "식자재", region: "안양,군포,의왕", workHours: "05:00-14:00",
    shift: "주간", payStructure: "매출제", incomeMin: 400, incomeMax: 550, physicalLoad: 4,
    loadType: "박스", numberPlates: "개별,법인임대", vehicleRequirement: "1톤 냉탑",
    initialCapitalMin: 700, slotCount: 3, pros: "매출제로 성실도에 따라 고수입, 법인임대 진입 가능",
    cons: "거래처별 상하차 조건 편차, 새벽 근무", sunTopAvailable: true,
  },
  {
    brand: "쿠팡", category: "간선", region: "용인,안산", workHours: "20:00-06:00",
    shift: "야간", payStructure: "매출제", incomeMin: 500, incomeMax: 650, physicalLoad: 4,
    loadType: "파렛트", numberPlates: "개별", vehicleRequirement: "11톤 윙바디",
    initialCapitalMin: 5000, slotCount: 3, pros: "최상위 수입 구간, 운행 위주 업무",
    cons: "대형 면허·고액 자금 필요, 야간 장거리", sunTopAvailable: false,
  },
];

async function main() {
  const count = await prisma.listing.count();
  if (count > 0) {
    console.log(`listings ${count}건 존재 — 시드 생략`);
    return;
  }
  for (const l of listings) await prisma.listing.create({ data: l });
  console.log(`물량 ${listings.length}건 시드 완료`);
}

main().finally(() => prisma.$disconnect());
