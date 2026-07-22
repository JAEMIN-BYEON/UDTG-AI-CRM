// 키오스크 상담신청서 진입점 — 희망 브랜드 선택지를 등록 물량에서 자동 구성 (7.20 회의)
import { prisma } from "@/lib/db";
import { ConsultForm } from "./consult-form";

export const dynamic = "force-dynamic";

export default async function ConsultPage() {
  // 추천 엔진의 노출 조건과 동일하게: 모집중 + 잔여 대수 있음 + 휴지통 제외
  // (소진된 물량의 브랜드는 선택해도 추천될 수 없으므로 선택지에서 제외)
  const listings = await prisma.listing.findMany({
    where: { isActive: true, deletedAt: null, slotCount: { gt: 0 } },
    select: { brand: true },
  });
  const brands = [...new Set(listings.map((l) => l.brand.trim()))].sort();

  return <ConsultForm brands={brands} />;
}
