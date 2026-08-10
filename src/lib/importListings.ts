// 다우 Work 물량 CSV 가져오기 — 파싱(결정론) → AI 구조화(gpt-5.6) → 반영 계획 생성
// 정책(7.27 확정): 모든 신규 물량은 비활성으로 등록(관리자 확인 후 활성화),
// 상태 빈 행은 잔여 0대로 유지 등록, 판매금액 컬럼은 저장·전송하지 않는다.
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.6";

export type CsvRow = {
  externalId: string;
  status: string; // 상태
  brand: string;
  center: string; // 센터위치
  trait: string; // 특성
  tonnage: string; // 톤수
  productType: string; // 상품분류
  centerContact: string; // 센터 담당자
  loadPlace: string; // 상차지
  dropPlace: string; // 하차지
  workDays: string; // 운행일수
  entryTime: string; // 입차시간
  loadDuration: string; // 상차 평균 소요시간
  deliveryTime: string; // 평균 배송시간/종료
  storeCount: string; // 점포수
  returns: string; // 반품여부
  memo: string;
};

export type ImportPlan = {
  externalId: string;
  action: "create" | "update";
  brand: string;
  center: string;
  category: string;
  region: string;
  startTime: string;
  workHours: string;
  workDays: string;
  holidays: string;
  shift: string;
  payStructure: string;
  incomeMin: number;
  incomeMax: number;
  physicalLoad: number;
  loadType: string;
  numberPlates: string;
  vehicleRequirement: string;
  slotCount: number;
  pros: string;
  cons: string;
  internalMemo: string;
  reviewNote: string;
  enriched: boolean; // AI 구조화 적용 여부
};

// 헤더 정규화 — BOM·따옴표·공백·선행 * 제거 ("*ID", "브랜드 " 등 변형 흡수)
const header = (h: string) => h.replace(/[﻿"]/g, "").replace(/\s+/g, "").replace(/^\*/, "");

function mapRecord(r: Record<string, unknown>): CsvRow {
  const g = (k: string) => String(r[k] ?? "").trim();
  return {
    externalId: g("ID").replace(/"/g, "").trim(),
    status: g("상태"),
    brand: g("브랜드"),
    center: g("센터위치"),
    trait: g("특성"),
    tonnage: g("톤수"),
    productType: g("상품분류"),
    centerContact: g("센터담당자"),
    loadPlace: g("상차지"),
    dropPlace: g("하차지"),
    workDays: g("운행일수"),
    entryTime: g("입차시간"),
    loadDuration: g("상차평균소요시간"),
    deliveryTime: g("평균배송시간/배송종료시간"),
    storeCount: g("점포수"),
    returns: g("반품여부"),
    memo: g("메모"),
  };
}

export function parseCsv(text: string): CsvRow[] {
  const records = parse(text, { columns: (h: string[]) => h.map(header), skip_empty_lines: true, bom: true, relax_column_count: true }) as Record<string, string>[];
  return records.map(mapRecord).filter((r) => r.externalId && r.brand);
}

// 동일 양식의 엑셀(.xlsx) — 첫 시트를 CSV와 같은 규칙으로 해석
export function parseXlsx(buf: Buffer): CsvRow[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  const normalized = rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) out[header(k)] = v;
    return out;
  });
  return normalized.map(mapRecord).filter((r) => r.externalId && r.brand);
}

// 상태 → 잔여 대수 (핵심 매핑, 7.27 확정)
export function slotFromStatus(status: string): number {
  const s = status.replace(/\s+/g, "");
  if (!s) return 0; // 빈 상태 = 현재 재고 없음, 유지 등록
  if (s.includes("일시품절")) return 0;
  if (s.includes("5대이상")) return 5;
  const m = s.match(/현재고(\d+)/);
  if (m) return parseInt(m[1], 10);
  return 0;
}

type Enriched = {
  externalId: string;
  shift?: string;
  workHours?: string;
  region?: string;
  incomeMin?: number;
  incomeMax?: number;
  payStructure?: string;
  numberPlates?: string;
  physicalLoad?: number;
  loadType?: string;
  pros?: string;
  cons?: string;
  incomeFound?: boolean;
};

const ENRICH_SYSTEM = `너는 화물 운송 물량 데이터 구조화 어시스턴트다. 물량 행 배열(JSON)을 받아 각 행을 아래 필드로 구조화한다.
규칙:
- 원본에 근거 없는 값을 지어내지 않는다. 모르면 필드를 생략한다.
- shift: "주간"|"야간"|"격일" 중 하나. 입차시간 기준(대략 04시~14시 시작=주간, 15시~03시 시작=야간). 근거 없으면 생략.
- workHours: "HH:MM-HH:MM" 또는 원문 요약 (예: "05:00-14:00", "전일 15시 상차").
- region: 배송 권역을 콤마 구분 지역명으로 정규화 (예: "수원,용인"). 센터위치도 지역 판단에 참고.
- incomeMin/incomeMax: 메모에 실수령·완제·운송료 금액이 있으면 만원 단위 숫자로. (예: "373만원 완제" → 373). 발견 시 incomeFound=true. 금액 근거 없으면 생략하고 incomeFound=false.
- payStructure: "완제"|"무제"|"매출제" 중 근거가 있으면.
- numberPlates: 메모에 넘버 언급이 있으면 (예: "자사", "법인임대", "개별"). 콤마 구분.
- physicalLoad: 1(매우 수월)~5(매우 힘듦) 추정. 롤테이너/지게차=1~2, 박스 수작업 다수=3~4, 수작업 상하차+다회전=4~5.
- loadType: "롤테이너"|"박스"|"파렛트"|"수작업" 등.
- pros/cons: 원본 근거로 각각 1~3개를 ' / '로 구분. 근거 없으면 생략.
출력: {"rows":[{externalId, ...}]} JSON만.`;

export async function enrichRows(rows: CsvRow[]): Promise<Map<string, Enriched>> {
  const out = new Map<string, Enriched>();
  if (!process.env.OPENAI_API_KEY) return out;

  const client = new OpenAI();
  const BATCH = 12;
  const batches: CsvRow[][] = [];
  for (let i = 0; i < rows.length; i += BATCH) batches.push(rows.slice(i, i + BATCH));

  await Promise.all(
    batches.map(async (batch) => {
      try {
        // 판매금액·담당자 컬럼은 전달하지 않는다 (7.27 정책)
        const payload = batch.map((r) => ({
          externalId: r.externalId, 브랜드: r.brand, 센터위치: r.center, 특성: r.trait, 톤수: r.tonnage,
          상품분류: r.productType, 상차지: r.loadPlace, 하차지: r.dropPlace, 운행일수: r.workDays,
          입차시간: r.entryTime, 상차소요: r.loadDuration, 배송시간: r.deliveryTime, 점포수: r.storeCount,
          반품여부: r.returns, 메모: r.memo,
        }));
        const res = await client.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: ENRICH_SYSTEM },
            { role: "user", content: JSON.stringify(payload) },
          ],
          response_format: { type: "json_object" },
        });
        const parsed = JSON.parse(res.choices[0].message.content ?? "{}") as { rows?: Enriched[] };
        for (const e of parsed.rows ?? []) if (e.externalId) out.set(String(e.externalId), e);
      } catch (err) {
        console.error("CSV 배치 구조화 실패 (결정론 값으로 진행):", err);
      }
    })
  );
  return out;
}

export function buildPlans(rows: CsvRow[], enriched: Map<string, Enriched>, existingIds: Set<string>): ImportPlan[] {
  return rows.map((r) => {
    const e: Enriched = enriched.get(r.externalId) ?? { externalId: r.externalId };
    const missing: string[] = [];

    const incomeMin = e.incomeFound && e.incomeMin ? e.incomeMin : 0;
    const incomeMax = e.incomeFound ? (e.incomeMax ?? e.incomeMin ?? 0) : 0;
    if (!e.incomeFound) missing.push("실수령액");
    if (!e.shift) missing.push("주간/야간");
    if (!r.tonnage) missing.push("차량 조건");
    missing.push("초기 자금"); // CSV에 없음 — 항상 확인 필요

    const internalMemo = [
      r.centerContact && `센터 담당: ${r.centerContact}`,
      r.storeCount && `점포수: ${r.storeCount}`,
      r.returns && `반품: ${r.returns}`,
      r.loadDuration && `상차 소요: ${r.loadDuration}`,
      r.deliveryTime && `배송시간: ${r.deliveryTime}`,
      r.memo && `메모: ${r.memo}`,
    ].filter(Boolean).join("\n");

    return {
      externalId: r.externalId,
      action: existingIds.has(r.externalId) ? "update" : "create",
      brand: r.brand,
      center: r.center,
      category: r.trait || r.productType || "기타",
      region: e.region || r.dropPlace || r.center || "미정",
      startTime: r.entryTime, // 출근시간 = 다우 입차시간 (8.10 항목 개편)
      workHours: e.workHours || "",
      workDays: r.workDays,
      // "26일(일요일휴무)" 형태에서 휴무일 분리
      holidays: (r.workDays.match(/\(([^)]*휴[^)]*)\)/)?.[1] ?? "").replace(/휴무|휴뮤/g, "").trim(),
      shift: e.shift || "주간",
      payStructure: e.payStructure || "완제",
      incomeMin,
      incomeMax,
      physicalLoad: e.physicalLoad ?? 3,
      loadType: e.loadType || "",
      numberPlates: e.numberPlates || "협의",
      vehicleRequirement: r.tonnage || "확인필요",
      slotCount: slotFromStatus(r.status),
      pros: e.pros || "",
      cons: e.cons || "",
      internalMemo,
      reviewNote: missing.length ? `확인 필요: ${missing.join(", ")}` : "",
      enriched: enriched.has(r.externalId),
    };
  });
}
