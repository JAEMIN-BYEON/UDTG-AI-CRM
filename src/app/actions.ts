"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { recommend } from "@/lib/engine";
import { generateReasons } from "@/lib/reason";

const CONSENT_POLICY_VERSION = "v1.0-2026-07";

const consultationSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(9),
  residenceArea: z.string().min(1),
  age: z.coerce.number().int().min(18).max(80),
  drivingYears: z.coerce.number().int().min(0).default(0),
  cargoYears: z.coerce.number().int().min(0).default(0),
  license: z.string().min(1),
  hasCargoCert: z.coerce.boolean().default(false),
  desiredIncome: z.coerce.number().int().min(100), // 희망월순이익 (300~700 선택형)
  desiredRegion: z.string().min(1),
  desiredWorkHours: z.string().default(""),
  shiftAvailability: z.enum(["주간만", "야간만", "둘다"]),
  desiredBrand: z.string().default(""), // 복수 선택 → 콤마 결합
  fitnessLevel: z.coerce.number().int().min(1).max(5),
  initialCapital: z.coerce.number().int().min(0),
  creditStatus: z.enum(["좋음", "보통", "나쁨", "회생", "파산"]),
  unavailableTimes: z.string().default(""),
  hasVehicle: z.coerce.boolean().default(false),
  vehicleTonnage: z.string().default(""),
  vehicleBodyType: z.string().default(""),
  vehiclePreference: z.string().default(""),
  interestedIn: z.string().default(""),
  questions: z.string().default(""),
  sunTopSchedule: z.string().default(""),
  familyConsent: z.string().default(""),
  notes: z.string().default(""),
});

// 상담 접수: 동의 저장 → 상담 생성 → 추천 실행 → 사유 생성 → 저장
export async function submitConsultation(formData: FormData) {
  if (formData.get("consent") !== "on") throw new Error("개인정보 수집·이용 동의가 필요합니다.");

  // 희망 브랜드는 복수 선택 → 콤마로 결합 (Object.fromEntries는 마지막 값만 남기므로 별도 처리)
  const raw = Object.fromEntries(formData.entries());
  raw.desiredBrand = formData.getAll("desiredBrand").map(String).join(",");
  const data = consultationSchema.parse(raw);

  const consultation = await prisma.consultation.create({
    data: { ...data, status: "작성중", consents: { create: { consentType: "수집이용", policyVersion: CONSENT_POLICY_VERSION } } },
  });

  const listings = await prisma.listing.findMany({
    where: { isActive: true, deletedAt: null, slotCount: { gt: 0 } },
  });
  const scored = recommend(consultation, listings);
  const reasons = await generateReasons(consultation, scored);

  await prisma.$transaction([
    ...scored.map((s, i) => {
      const r = reasons.find((x) => x.listingId === s.listing.id)!;
      return prisma.recommendation.create({
        data: {
          consultationId: consultation.id,
          listingId: s.listing.id,
          rank: i + 1,
          score: s.score,
          scoreBreakdown: JSON.stringify(s.breakdown),
          reasonText: r.reason,
          reasonSource: r.source,
          modelId: r.modelId,
        },
      });
    }),
    prisma.consultation.update({ where: { id: consultation.id }, data: { status: "추천완료" } }),
  ]);

  redirect(`/consult/${consultation.id}/result`);
}

// 최종 상담신청 완료 → 담당자 전달
export async function finalizeConsultation(consultationId: string) {
  await prisma.consultation.update({
    where: { id: consultationId },
    data: { status: "접수완료", completedAt: new Date() },
  });
  revalidatePath("/staff");
  redirect(`/consult/${consultationId}/done`);
}

export async function markCounseled(consultationId: string) {
  await prisma.consultation.update({ where: { id: consultationId }, data: { status: "심층상담완료" } });
  revalidatePath(`/staff/${consultationId}`);
  revalidatePath("/staff");
}

// 심층상담 완료 되돌리기 (잘못 눌렀을 때)
export async function revertCounseled(consultationId: string) {
  await prisma.consultation.update({ where: { id: consultationId }, data: { status: "접수완료" } });
  revalidatePath(`/staff/${consultationId}`);
  revalidatePath("/staff");
}

// 상담 삭제 — 휴지통으로 이동 (소프트 삭제, /staff/trash 에서 복구 가능)
export async function deleteConsultation(consultationId: string) {
  await prisma.consultation.update({ where: { id: consultationId }, data: { deletedAt: new Date() } });
  revalidatePath("/staff");
  redirect("/staff");
}

export async function restoreConsultation(consultationId: string) {
  await prisma.consultation.update({ where: { id: consultationId }, data: { deletedAt: null } });
  revalidatePath("/staff");
  revalidatePath("/staff/trash");
}

// 영구 삭제 — 연결된 추천/동의/시청 이력까지 완전 제거 (복구 불가)
export async function purgeConsultation(consultationId: string) {
  await prisma.$transaction([
    prisma.recommendation.deleteMany({ where: { consultationId } }),
    prisma.consent.deleteMany({ where: { consultationId } }),
    prisma.videoView.deleteMany({ where: { consultationId } }),
    prisma.consultation.delete({ where: { id: consultationId } }),
  ]);
  revalidatePath("/staff/trash");
}

// ── 물량 관리 (운영본부, S3) ──────────────────────────────────
const listingSchema = z.object({
  brand: z.string().min(1),
  category: z.enum(["상온배송", "저온배송", "간선", "식자재"]),
  region: z.string().min(1),
  workHours: z.string().min(1),
  shift: z.enum(["주간", "야간", "격일"]),
  payStructure: z.enum(["완제", "무제", "매출제"]),
  incomeMin: z.coerce.number().int(),
  incomeMax: z.coerce.number().int(),
  physicalLoad: z.coerce.number().int().min(1).max(5),
  loadType: z.string().min(1),
  numberPlates: z.string().min(1),
  vehicleRequirement: z.string().min(1),
  initialCapitalMin: z.coerce.number().int(),
  slotCount: z.coerce.number().int().min(0),
  pros: z.string().min(1),
  cons: z.string().min(1),
  introMd: z.string().default(""),
  sunTopAvailable: z.coerce.boolean().default(false),
});

export async function saveListing(formData: FormData) {
  const id = formData.get("id") as string | null;
  const data = listingSchema.parse(Object.fromEntries(formData.entries()));
  if (id) await prisma.listing.update({ where: { id }, data });
  else await prisma.listing.create({ data });
  revalidatePath("/admin/listings");
  redirect("/admin/listings");
}

export async function toggleListing(id: string) {
  const l = await prisma.listing.findUniqueOrThrow({ where: { id } });
  await prisma.listing.update({ where: { id }, data: { isActive: !l.isActive } });
  revalidatePath("/admin/listings");
}

// 물량 삭제 — 휴지통으로 이동 (소프트 삭제, /admin/listings/trash 에서 복구 가능)
export async function deleteListing(id: string) {
  await prisma.listing.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/admin/listings");
}

export async function restoreListing(id: string) {
  await prisma.listing.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/admin/listings");
  revalidatePath("/admin/listings/trash");
}

// 영구 삭제 — 추천 이력이 참조하는 물량은 상담 기록 보존을 위해 영구 삭제 불가
export async function purgeListing(id: string) {
  const refs = await prisma.recommendation.count({ where: { listingId: id } });
  if (refs === 0) await prisma.listing.delete({ where: { id } });
  revalidatePath("/admin/listings/trash");
}

// 모집 대수 조절 (센터별 잔여 대수 관리 — 0이 되면 추천에서 자동 제외)
export async function adjustSlot(id: string, delta: number) {
  const l = await prisma.listing.findUniqueOrThrow({ where: { id } });
  await prisma.listing.update({ where: { id }, data: { slotCount: Math.max(0, l.slotCount + delta) } });
  revalidatePath("/admin/listings");
}
