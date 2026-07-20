// 견적서 생성 API — PPTX 업로드 또는 spec JSON 직접 입력 (핸드오프 §6 generate)
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { prisma } from "@/lib/db";
import { extractDraft, enrichSpec, renderQuote, QuoteSpec } from "@/lib/quote";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    let draft: QuoteSpec;

    const file = form.get("file");
    const specStr = form.get("spec");

    if (file instanceof File && file.name) {
      // [1] 표준 PPTX → 결정론 추출
      const dir = await mkdtemp(path.join(tmpdir(), "pptx-"));
      const pptxPath = path.join(dir, "input.pptx");
      await writeFile(pptxPath, Buffer.from(await file.arrayBuffer()));
      draft = await extractDraft(pptxPath);
    } else if (typeof specStr === "string" && specStr.trim()) {
      // 물량 연동/수동 입력 경로 — 견적 JSON 직접 제공
      draft = JSON.parse(specStr);
    } else {
      return NextResponse.json({ error: "PPTX 파일 또는 spec JSON이 필요합니다." }, { status: 400 });
    }

    // [2] AI 보강 (실패 시 초안 폴백) → [3] 렌더
    const { spec, enriched, model } = await enrichSpec(draft);
    const { pdf, html, filename } = await renderQuote(spec);

    const quote = await prisma.quote.create({
      data: {
        brand: String(spec.brand ?? "미상"),
        center: String(spec.center ?? ""),
        filename,
        specJson: JSON.stringify(spec),
        html,
        pdf: new Uint8Array(pdf),
        enriched,
        modelId: model,
      },
    });

    return NextResponse.json({ id: quote.id, brand: quote.brand, center: quote.center, enriched });
  } catch (e) {
    console.error("견적서 생성 실패:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "생성 실패" }, { status: 500 });
  }
}
