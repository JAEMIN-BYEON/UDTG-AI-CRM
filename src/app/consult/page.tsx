// 키오스크 상담신청서 진입점 — 희망 브랜드 선택지를 등록 물량에서 자동 구성 (7.20 회의)
import { prisma } from "@/lib/db";
import { ConsultForm } from "./consult-form";

export const dynamic = "force-dynamic";

export default async function ConsultPage() {
  const listings = await prisma.listing.findMany({
    where: { isActive: true, deletedAt: null },
    select: { brand: true },
  });
  const brands = [...new Set(listings.map((l) => l.brand.trim()))].sort();

  return <ConsultForm brands={brands} />;
}
