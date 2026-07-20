import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await prisma.quote.findUnique({ where: { id } });
  if (!q) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(q.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
