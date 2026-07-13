// 로컬 브라우저의 서버 액션 POST 요청을 캡처 → 운영 서버로 그대로 재전송해 응답 비교
import { chromium } from "playwright";
import fs from "fs";

const LOCAL = "http://localhost:3000";
const PROD = process.env.PROD!;
const OUT = process.env.SHOT_DIR ?? "/tmp";

async function main() {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage();

  let captured: { headers: Record<string, string>; body: Buffer } | null = null;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/consult")) {
      captured = { headers: r.headers(), body: r.postDataBuffer()! };
    }
  });

  await page.goto(`${LOCAL}/consult`);
  await page.check('input[name="consent"]');
  await page.click("text=다음 →");
  await page.fill('input[name="name"]', "테스트-삭제요망");
  await page.fill('input[name="phone"]', "010-0000-0000");
  await page.fill('input[name="residenceArea"]', "용인");
  await page.fill('input[name="age"]', "52");
  await page.click('label:has(input[name="license"][value="1종 보통"])');
  await page.click("text=다음 →");
  await page.fill('input[name="desiredIncome"]', "380");
  await page.fill('input[name="desiredRegion"]', "용인");
  await page.click('label:has(input[name="shiftAvailability"][value="주간만"])');
  await page.click('label:has(input[name="fitnessLevel"][value="3"])');
  await page.fill('input[name="initialCapital"]', "1000");
  await page.click("text=다음 →");
  await page.click("text=다음 →");
  await page.click("text=AI 추천 받기");
  await page.waitForURL(/\/result/, { timeout: 30000 });
  console.log("로컬 브라우저 플로우 정상 ✓ (요청 캡처됨)");
  await browser.close();

  if (!captured) throw new Error("POST 요청 캡처 실패");
  const c = captured as { headers: Record<string, string>; body: Buffer };
  fs.writeFileSync(`${OUT}/action-body.bin`, c.body);

  // 운영 액션 ID로 교체 (빌드마다 다름)
  const prodActionId = process.env.PROD_ACTION_ID!;
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(c.headers)) {
    if (["content-type", "accept"].includes(k)) headers[k] = v;
  }
  headers["next-action"] = prodActionId;
  headers["origin"] = PROD;
  headers["referer"] = `${PROD}/consult`;

  const res = await fetch(`${PROD}/consult`, { method: "POST", headers, body: new Uint8Array(c.body), redirect: "manual" });
  console.log("운영 응답:", res.status, res.headers.get("x-action-redirect") ?? "");
  const text = await res.text();
  console.log("운영 본문 끝부분:", text.slice(-400));
}

main().catch((e) => { console.error(e); process.exit(1); });
