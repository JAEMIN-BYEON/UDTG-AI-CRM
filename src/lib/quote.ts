// 물동량 견적서(소개서) 파이프라인 — services/quote 핸드오프 이식
// 추출(결정론, python) → 보강(OpenAI) → 렌더(weasyprint, python)
import { spawn } from "child_process";
import { mkdtemp, readFile, readdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import OpenAI from "openai";

const QUOTE_DIR = path.join(process.cwd(), "services", "quote");
const SCRIPTS = path.join(QUOTE_DIR, "scripts");
// 사용 모델: gpt-5.6 (2026-07 결정)
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.6";

function runPython(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn("python3", args, { cwd });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.on("close", (code) =>
      code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`python 종료 코드 ${code}: ${stderr.slice(0, 500)}`))
    );
  });
}

export type QuoteSpec = Record<string, unknown> & {
  brand?: string;
  center?: string;
  items?: Record<string, unknown>;
};

// [1] 추출 — 표준 PPTX 표 좌표 기반 (extract_quote.py, LLM 불필요)
export async function extractDraft(pptxPath: string): Promise<QuoteSpec> {
  const { stdout } = await runPython([path.join(SCRIPTS, "extract_quote.py"), pptxPath], QUOTE_DIR);
  const jsonStart = stdout.indexOf("{");
  return JSON.parse(stdout.slice(jsonStart));
}

// item 값 3형태({v,note}/{ambient,cold}/string)를 문자열로 평탄화 — 스키마 단순화 (핸드오프 §5 권장)
function flattenItems(spec: QuoteSpec): QuoteSpec {
  const items = (spec.items ?? {}) as Record<string, unknown>;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(items)) {
    if (v == null) flat[k] = "";
    else if (typeof v === "string") flat[k] = v;
    else if (typeof v === "object" && "v" in (v as object)) {
      const o = v as { v?: string; note?: string };
      flat[k] = o.note ? `${o.v ?? ""} (${o.note})` : (o.v ?? "");
    } else if (typeof v === "object" && "ambient" in (v as object)) {
      const o = v as { ambient?: { v?: string }; cold?: { v?: string } };
      flat[k] = `상온: ${o.ambient?.v ?? "-"} / 저온: ${o.cold?.v ?? "-"}`;
    } else flat[k] = String(v);
  }
  return { ...spec, items: flat };
}

const ENRICH_SYSTEM = `너는 운수대통로지스의 물동량 견적서 데이터 보강 어시스턴트다.
입력으로 24항목 견적 JSON 초안을 받는다. 아래 규칙에 따라 부족한 필드만 채우고, 나머지는 그대로 둔다.

[절대 규칙]
- items의 24개 key를 추가/삭제/개명하지 않는다.
- 원본에 없는 사실을 지어내지 않는다. 필수항목(차종·출근시간·월 운행일수·휴무일·일 운행 회전 수·업무시간·운송료)이 비면 "-".
- "적자/흑자" 등 비전문 표현 금지. 정확한 물류·회계 용어 사용.
- 센터 담당자 이름·연락처는 어떤 필드에도 넣지 않는다(개인정보).

[장점/단점 — items.장점, items.단점이 비었을 때만]
운행조건·수당·근무조건 데이터를 근거로 3~5개를 ' / '로 구분해 채운다. 근거 없는 항목은 넣지 않는다.
- 장점 후보: 짧은 업무시간, 적은 회전수, 투잡 가능, 추가배송 없음, 각종 수당, 보조기사 지원, 고정급 안정성, 휴가 제공, 유류비 회사 부담
- 단점 후보: 심야/새벽 출근, 주 6일 근무, 긴 업무시간, 다회전, 유류비 본인 부담, 연령 제한·보건증, 반품 회수 부담, 투잡 불가, 수당 없음, 수작업 상하차

[timeline] 출근→상차/분류→배송 3구간 배열로 요약. timeline_note는 회전수+권역(24자 이내).
[theme] theme.main이 비어 있으면 브랜드에 어울리는 대표 색상 hex 1개를 지정한다.

출력은 입력과 동일한 구조의 완성된 JSON 하나만. 다른 텍스트 금지.`;

// [2] 보강 — OpenAI (키 없음/실패 시 초안 그대로 폴백)
export async function enrichSpec(draft: QuoteSpec): Promise<{ spec: QuoteSpec; enriched: boolean; model: string }> {
  const flat = flattenItems(draft);
  if (!process.env.OPENAI_API_KEY) return { spec: flat, enriched: false, model: "" };

  try {
    const client = new OpenAI();
    const r = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: ENRICH_SYSTEM },
        { role: "user", content: JSON.stringify(flat, null, 1) },
      ],
      response_format: { type: "json_object" },
    });
    const out = JSON.parse(r.choices[0].message.content ?? "{}") as QuoteSpec;
    // key 검증: 초안의 항목 키를 보존, LLM이 누락한 키는 초안 값으로 복원
    const draftItems = (flat.items ?? {}) as Record<string, string>;
    const outItems = (out.items ?? {}) as Record<string, string>;
    const merged: Record<string, string> = {};
    for (const k of Object.keys(draftItems)) merged[k] = typeof outItems[k] === "string" ? outItems[k] : draftItems[k];
    return { spec: { ...flat, ...out, items: merged }, enriched: true, model: MODEL };
  } catch (e) {
    console.error("견적 보강 실패, 초안 사용:", e);
    return { spec: flat, enriched: false, model: "" };
  }
}

// [3] 렌더 — build_quote.py (weasyprint, A4 1p 자동 맞춤)
export async function renderQuote(spec: QuoteSpec): Promise<{ pdf: Buffer; html: string; filename: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), "quote-"));
  const specPath = path.join(dir, "spec.json");
  await writeFile(specPath, JSON.stringify(spec, null, 1), "utf-8");
  await runPython([path.join(SCRIPTS, "build_quote.py"), specPath, "-o", dir], QUOTE_DIR);

  const files = await readdir(dir);
  const pdfName = files.find((f) => f.endsWith(".pdf"));
  const htmlName = files.find((f) => f.endsWith(".html"));
  if (!pdfName || !htmlName) throw new Error("렌더 산출물을 찾지 못했습니다");

  return {
    pdf: await readFile(path.join(dir, pdfName)),
    html: await readFile(path.join(dir, htmlName), "utf-8"),
    filename: pdfName,
  };
}
