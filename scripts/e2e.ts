// E2E: 키오스크 접수 → AI 추천 → 접수 완료 → 담당자 대시보드/리포트 확인
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const SHOT_DIR = process.env.SHOT_DIR ?? "/tmp";

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage({ viewport: { width: 1024, height: 1400 } });

  // K1: 동의
  await page.goto(`${BASE}/consult`);
  await page.check('input[name="consent"]');
  await page.screenshot({ path: `${SHOT_DIR}/1-consent.png` });
  await page.click("text=다음 →");

  // K2-1: 개인정보
  await page.fill('input[name="name"]', "김운수");
  await page.fill('input[name="phone"]', "010-1234-5678");
  await page.fill('input[name="residenceArea"]', "용인");
  await page.fill('input[name="age"]', "52");
  await page.fill('input[name="drivingYears"]', "20");
  await page.fill('input[name="cargoYears"]', "0");
  await page.click('label:has(input[name="license"][value="1종 보통"])');
  await page.click("text=다음 →");

  // K2-2: 희망 조건
  await page.fill('input[name="desiredIncome"]', "380");
  await page.fill('input[name="desiredRegion"]', "용인");
  await page.click('label:has(input[name="shiftAvailability"][value="주간만"])');
  await page.click('label:has(input[name="fitnessLevel"][value="3"])');
  await page.fill('input[name="initialCapital"]', "1000");
  await page.screenshot({ path: `${SHOT_DIR}/2-form.png` });
  await page.click("text=다음 →");

  // K2-3: 상담 내용
  await page.fill('input[name="interestedIn"]', "다이소 배송");
  await page.fill('textarea[name="questions"]', "실수령액이 얼마나 되는지 궁금합니다");
  await page.fill('input[name="sunTopSchedule"]', "다음 주 화~목 가능");
  await page.click("text=다음 →");

  // K2-4: 제출
  await page.click("text=AI 추천 받기");
  await page.waitForURL(/\/consult\/.+\/result/, { timeout: 30000 });

  // K3: 추천 결과
  const firstCard = await page.textContent("main h2");
  console.log("추천 1순위 카드:", firstCard?.trim().slice(0, 60));
  await page.screenshot({ path: `${SHOT_DIR}/3-result.png`, fullPage: true });

  // 접수 완료
  await page.click("text=이 내용으로 상담 신청 완료");
  await page.waitForURL(/\/done/, { timeout: 15000 });
  console.log("접수 완료 페이지 도달 ✓");

  // S1: 담당자 대시보드 (로그인 필요 — 미들웨어가 /login으로 보내는지 확인)
  await page.goto(`${BASE}/staff`);
  await page.waitForURL(/\/login/, { timeout: 15000 });
  console.log("미인증 접근 → 로그인 리다이렉트 ✓");
  await page.fill('input[name="passcode"]', process.env.STAFF_PASSCODE ?? "staff123");
  await page.click("form button");
  await page.waitForURL(/\/staff/, { timeout: 15000 });
  const row = await page.textContent("tbody tr");
  console.log("대시보드 첫 행:", row?.replace(/\s+/g, " ").trim().slice(0, 80));
  await page.screenshot({ path: `${SHOT_DIR}/4-staff.png` });

  // S2: 상세 리포트
  await page.click("text=상세 →");
  await page.waitForSelector("text=상담 요약 리포트");
  await page.screenshot({ path: `${SHOT_DIR}/5-report.png`, fullPage: true });
  console.log("담당자 리포트 확인 ✓");

  await browser.close();
  console.log("\nE2E 통과");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
