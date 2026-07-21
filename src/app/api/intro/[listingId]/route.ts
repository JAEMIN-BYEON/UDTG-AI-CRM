// 센터 소개서 공개 열람 — 고객 추천 화면(iframe)에서 사용하므로 로그인 불필요.
// 소개서에는 담당자 이름·연락처 등 개인정보가 포함되지 않는다 (파이프라인 규칙 §9).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const listing = await prisma.listing.findFirst({ where: { id: listingId, deletedAt: null } });
  if (!listing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const quote = await prisma.quote.findFirst({
    where: { listingId },
    orderBy: { createdAt: "desc" },
  });
  if (!quote) return NextResponse.json({ error: "no intro" }, { status: 404 });

  if (req.nextUrl.searchParams.get("format") === "pdf") {
    return new NextResponse(new Uint8Array(quote.pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(quote.filename)}`,
      },
    });
  }
  return new NextResponse(quote.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
