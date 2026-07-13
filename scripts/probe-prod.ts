// 운영 사이트 진단 — 키오스크 플로우를 실제로 눌러보며 콘솔/네트워크 오류 수집
import { chromium } from "playwright";

const BASE = process.env.BASE!;
const SHOT = process.env.SHOT_DIR ?? "/tmp";

async function main() {
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
    args: ["--ignore-certificate-errors", "--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1400 },
    ignoreHTTPSErrors: true, // 샌드박스 프록시의 MITM 인증서 허용
  });

  page.on("console", (m) => {
    if (m.type() === "error") console.log("[콘솔 오류]", m.text().slice(0, 300));
  });
  page.on("requestfailed", (r) => console.log("[요청 실패]", r.url().slice(0, 120), r.failure()?.errorText));
  page.on("response", (r) => {
    if (r.status() >= 400) console.log("[HTTP", r.status() + "]", r.url().slice(0, 120));
  });

  await page.goto(`${BASE}/consult`, { waitUntil: "networkidle" });
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
  await page.click("text=다음 →"); // 상담내용 스킵

  await page.screenshot({ path: `${SHOT}/prod-before-submit.png` });
  console.log("제출 직전 URL:", page.url());

  const btn = page.locator("text=AI 추천 받기");
  console.log("버튼 disabled 상태:", await btn.isDisabled().catch(() => "확인불가"));
  await btn.click();
  console.log("클릭됨 — 결과 대기...");

  try {
    await page.waitForURL(/\/result/, { timeout: 60000 });
    console.log("✅ 추천 결과 도달:", page.url());
    const reason = await page.textContent("main .rounded-2xl p");
    console.log("1순위 사유:", reason?.slice(0, 120));
  } catch {
    console.log("❌ 60초 내 결과 페이지 미도달. 현재 URL:", page.url());
    console.log("본문 일부:", (await page.textContent("body"))?.replace(/\s+/g, " ").slice(0, 300));
  }
  await page.screenshot({ path: `${SHOT}/prod-after-submit.png`, fullPage: true });

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
