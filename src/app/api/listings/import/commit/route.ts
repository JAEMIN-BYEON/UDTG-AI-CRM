// 물량 CSV 가져오기 [2/2] 반영 — 미리보기에서 확인한 계획을 실제 등록/갱신
// 정책: 신규는 비활성으로 생성(관리자 확인 후 활성화).
// 기존(externalId 일치)은 — 검수 전(경고 남음)이면 다우 데이터로 전체 갱신,
// 검수 완료면 관리자가 손본 내용 보존을 위해 잔여 대수·내부메모만 갱신.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ImportPlan } from "@/lib/importListings";

export const maxDuration = 120;

// 다우 파일에서 오는 데이터 필드 (검수 전 물량 전체 갱신용)
function importedFields(p: ImportPlan) {
  return {
    brand: p.brand,
    center: p.center,
    centerAddress: p.centerAddress,
    category: p.category,
    region: p.region,
    startTime: p.startTime,
    workHours: p.workHours,
    workDays: p.workDays,
    holidays: p.holidays,
    shift: p.shift,
    payStructure: p.payStructure,
    fee: p.fee,
    incomeMin: p.incomeMin,
    incomeMax: p.incomeMax,
    physicalLoad: p.physicalLoad,
    loadType: p.loadType,
    unloadMethod: p.unloadMethod,
    vehicleRequirement: p.vehicleRequirement,
    pros: p.pros,
    cons: p.cons,
    slotCount: p.slotCount,
    internalMemo: p.internalMemo,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { plans, trashMissingIds } = (await req.json()) as { plans: ImportPlan[]; trashMissingIds?: string[] };
    if (!Array.isArray(plans) || plans.length === 0) {
      return NextResponse.json({ error: "반영할 계획이 없습니다." }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    for (const p of plans) {
      const existing = await prisma.listing.findFirst({ where: { externalId: p.externalId } });
      if (existing) {
        await prisma.listing.update({
          where: { id: existing.id },
          data: existing.reviewNote
            ? // 검수 전 — 다우 최신 데이터로 전체 갱신 (경고문도 최신화)
              { ...importedFields(p), reviewNote: p.reviewNote, deletedAt: null }
            : // 검수 완료 — 관리자 수정 보존, 잔여 대수·내부메모만
              { slotCount: p.slotCount, internalMemo: p.internalMemo, deletedAt: null },
        });
        updated++;
      } else {
        await prisma.listing.create({
          data: {
            ...importedFields(p),
            numberPlates: p.numberPlates,
            initialCapitalMin: 0,
            sunTopAvailable: true,
            isActive: false, // 관리자 확인 후 활성화 (7.27 정책)
            externalId: p.externalId,
            reviewNote: p.reviewNote,
          },
        });
        created++;
      }
    }
    // 파일에 없는 기존 연동 물량 일괄 휴지통 이동 (다우 보드 재구성 시 구 데이터 정리)
    // 수기 등록 물량(externalId 없음)은 어떤 경우에도 건드리지 않는다
    let trashed = 0;
    if (Array.isArray(trashMissingIds) && trashMissingIds.length > 0) {
      const res = await prisma.listing.updateMany({
        where: { id: { in: trashMissingIds }, externalId: { not: null }, deletedAt: null },
        data: { deletedAt: new Date(), isActive: false },
      });
      trashed = res.count;
    }
    return NextResponse.json({ created, updated, trashed });
  } catch (e) {
    console.error("CSV 반영 실패:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "반영 실패" }, { status: 500 });
  }
}
