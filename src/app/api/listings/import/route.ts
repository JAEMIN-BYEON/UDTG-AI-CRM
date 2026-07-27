// 물량 CSV 가져오기 [1/2] 미리보기 — 파싱 + AI 구조화 결과를 반영 없이 반환
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCsv, enrichRows, buildPlans } from "@/lib/importListings";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.name) {
      return NextResponse.json({ error: "CSV 파일이 필요합니다." }, { status: 400 });
    }
    const rows = parseCsv(await file.text());
    if (rows.length === 0) {
      return NextResponse.json({ error: "가져올 행이 없습니다. 다우 Work에서 내보낸 CSV인지 확인해 주세요." }, { status: 400 });
    }

    const existing = await prisma.listing.findMany({
      where: { externalId: { in: rows.map((r) => r.externalId) } },
      select: { externalId: true },
    });
    const enriched = await enrichRows(rows);
    const plans = buildPlans(rows, enriched, new Set(existing.map((l) => l.externalId!)));

    // CSV에 없는 기존 연동 물량 → 모집 중지 검토 대상으로 알림
    const csvIds = new Set(rows.map((r) => r.externalId));
    const orphans = await prisma.listing.findMany({
      where: { externalId: { not: null }, deletedAt: null },
      select: { id: true, brand: true, center: true, externalId: true },
    });
    const missing = orphans.filter((l) => !csvIds.has(l.externalId!)).map((l) => ({ id: l.id, brand: l.brand, center: l.center }));

    return NextResponse.json({ plans, aiUsed: enriched.size > 0, missing });
  } catch (e) {
    console.error("CSV 미리보기 실패:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "미리보기 실패" }, { status: 500 });
  }
}
