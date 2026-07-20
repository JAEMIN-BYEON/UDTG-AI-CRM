// 추천 사유 생성 (설계서 §7.3) — OpenAI Structured Outputs
// OPENAI_API_KEY 미설정 또는 호출 실패 시 템플릿 사유로 폴백 (추천 자체는 LLM 없이 동작)
import OpenAI from "openai";
import type { Consultation } from "@prisma/client";
import { Scored, templateReason } from "./engine";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export type ReasonResult = { listingId: string; reason: string; source: "openai" | "template"; modelId: string };

export async function generateReasons(c: Consultation, scored: Scored[]): Promise<ReasonResult[]> {
  const fallback = (): ReasonResult[] =>
    scored.map((s) => ({ listingId: s.listing.id, reason: templateReason(c, s), source: "template", modelId: "" }));

  if (!process.env.OPENAI_API_KEY) return fallback();

  try {
    const client = new OpenAI();
    // 개인 식별 정보(성명·연락처)는 컨텍스트에서 제외 (설계서 §11)
    const customer = {
      연령: c.age,
      운전경력_년: c.drivingYears,
      화물경력_년: c.cargoYears,
      희망월수입_만원: c.desiredIncome,
      희망지역: c.desiredRegion,
      주야간: c.shiftAvailability,
      체력수준_1_5: c.fitnessLevel,
      초기자금_만원: c.initialCapital,
      차량보유: c.hasVehicle,
      희망브랜드: c.desiredBrand || "무관",
    };
    const items = scored.map((s) => ({
      listingId: s.listing.id,
      브랜드: s.listing.brand,
      카테고리: s.listing.category,
      근무시간: `${s.listing.shift} ${s.listing.workHours}`,
      운송료구조: s.listing.payStructure,
      예상실수령_만원: `${s.listing.incomeMin}~${s.listing.incomeMax}`,
      상하차강도_1_5: s.listing.physicalLoad,
      상하차방식: s.listing.loadType,
      넘버방식: s.listing.numberPlates,
      차량조건: s.listing.vehicleRequirement,
      장점: s.listing.pros,
      단점: s.listing.cons,
      매칭근거: s.breakdown.map((b) => `${b.label}: ${b.note}`).join(" / "),
      자금기준미달_상담시협의필요: s.capitalRelaxed,
    }));

    const res = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "당신은 화물 운송 물량 상담 도우미입니다. 제공된 물량 데이터와 매칭 근거에 있는 정보만 사용해 고객에게 보여줄 추천 사유를 작성하세요. " +
            "데이터에 없는 수치·조건을 절대 만들지 마세요. 각 사유는 존댓말 2~3문장, 고객 조건과 물량 특성의 연결을 중심으로 작성하고 단점도 솔직하게 한 가지 언급하세요.",
        },
        { role: "user", content: JSON.stringify({ 고객조건: customer, 추천물량: items }) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "recommendation_reasons",
          strict: true,
          schema: {
            type: "object",
            properties: {
              reasons: {
                type: "array",
                items: {
                  type: "object",
                  properties: { listingId: { type: "string" }, reason: { type: "string" } },
                  required: ["listingId", "reason"],
                  additionalProperties: false,
                },
              },
            },
            required: ["reasons"],
            additionalProperties: false,
          },
        },
      },
    });

    const parsed = JSON.parse(res.choices[0].message.content ?? "{}") as {
      reasons?: { listingId: string; reason: string }[];
    };
    const byId = new Map((parsed.reasons ?? []).map((r) => [r.listingId, r.reason]));

    return scored.map((s) => {
      const reason = byId.get(s.listing.id);
      return reason
        ? { listingId: s.listing.id, reason, source: "openai" as const, modelId: MODEL }
        : { listingId: s.listing.id, reason: templateReason(c, s), source: "template" as const, modelId: "" };
    });
  } catch (e) {
    console.error("OpenAI 사유 생성 실패, 템플릿 폴백:", e);
    return fallback();
  }
}
