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
  await page.goto(`${BASE}/consult`, { waitUntil: "networkidle" });
  await page.check('input[name="consent"]');
  // 하이드레이션 전 클릭이 씹힐 수 있어 재시도
  for (let i = 0; i < 10; i++) {
    if (await page.locator("text=다음 →").isEnabled()) break;
    await page.uncheck('input[name="consent"]').catch(() => {});
    await page.check('input[name="consent"]');
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: `${SHOT_DIR}/1-consent.png` });
  await page.click("text=다음 →");

  // K2-1: 기본 정보 (7.20 개편안)
  await page.fill('input[name="name"]', "김운수");
  await page.fill('input[name="phone"]', "010-1234-5678");
  await page.fill('input[name="residenceArea"]', "용인시 처인구"); // 7.27: 텍스트 입력 전환
  await page.fill('input[name="age"]', "52");
  await page.fill('input[name="cargoYears"]', "0");
  await page.click('label:has(input[name="license"][value="1종 보통"])');
  await page.click("text=다음 →");

  // K2-2: 희망 조건 (희망월순이익 선택형 + 신용상태)
  await page.click('label:has(input[name="desiredIncome"][value="400"])');
  await page.click('label:has(input[name="desiredRegion"][value="경기남부"])'); // 7.27: 선택형 전환
  await page.click('label:has(input[name="shiftAvailability"][value="주간만"])');
  await page.fill('input[name="unavailableTimes"]', "새벽 4시 이전 어려움");
  await page.click('label:has(input[name="fitnessLevel"][value="3"])');
  await page.fill('input[name="initialCapital"]', "1000");
  await page.click('label:has(input[name="creditStatus"][value="보통"])');
  await page.screenshot({ path: `${SHOT_DIR}/2-form.png` });
  await page.click("text=다음 →");

  // K2-3: 상담 내용
  await page.fill('textarea[name="questions"]', "실수령액이 얼마나 되는지 궁금합니다");
  await page.fill('input[name="sunTopSchedule"]', "화요일 오전 불가");
  await page.click("text=다음 →");

  // K2-4: 제출 — 클릭 즉시 로딩 오버레이가 떠야 한다 (멈춘 화면 오인 방지)
  await page.click("text=AI 추천 받기");
  await page.waitForSelector("text=AI가 분석하고 있습니다", { timeout: 2000 });
  await page.waitForSelector("text=초 경과", { timeout: 2000 });
  console.log("클릭 즉시 로딩 오버레이(진행 바·경과 시간) 표시 ✓");
  await page.screenshot({ path: `${SHOT_DIR}/2b-loading.png` });
  await page.waitForURL(/\/consult\/.+\/result/, { timeout: 30000 });

  // K3: 추천 결과
  const firstCard = await page.textContent("main h2");
  console.log("추천 1순위 카드:", firstCard?.trim().slice(0, 60));
  await page.screenshot({ path: `${SHOT_DIR}/3-result.png`, fullPage: true });

  // K3-2: 소개서 학습 — 모든 소개서를 넘겨봐야 신청 버튼이 나타난다
  await page.click("text=센터 소개서 확인하기");
  await page.waitForURL(/\/intro/, { timeout: 15000 });
  await page.waitForSelector("text=소개서 확인");
  for (let i = 0; i < 5; i++) {
    if (await page.locator("text=이 내용으로 상담 신청 완료").isVisible()) break;
    await page.click("text=다음 소개서 →");
    await page.waitForTimeout(400);
  }
  await page.waitForSelector("text=이 내용으로 상담 신청 완료", { timeout: 5000 });
  console.log("소개서 학습 완료 → 신청 버튼 노출 ✓");
  await page.screenshot({ path: `${SHOT_DIR}/3b-intro.png`, fullPage: true });

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
  await page.locator("text=상세 →").first().click();
  await page.waitForSelector("text=상담 요약 리포트");
  await page.screenshot({ path: `${SHOT_DIR}/5-report.png`, fullPage: true });
  console.log("담당자 리포트 확인 ✓");

  // 심층 상담 완료 → 되돌리기 → 삭제
  await page.click("text=심층 상담 완료 처리");
  await page.waitForSelector("text=완료 취소", { timeout: 15000 });
  console.log("심층 상담 완료 처리 ✓");
  await page.click("text=완료 취소");
  await page.waitForSelector("text=심층 상담 완료 처리", { timeout: 15000 });
  console.log("완료 되돌리기 ✓");
  page.once("dialog", (d) => d.accept());
  await page.locator("button:has-text('삭제')").first().click();
  await page.waitForURL(/\/staff$/, { timeout: 15000 });
  console.log("상담 삭제(휴지통 이동) ✓");

  // 휴지통 복구
  await page.goto(`${BASE}/staff/trash`);
  await page.waitForSelector("text=상담 휴지통");
  await page.locator("button:has-text('복구')").first().click();
  await page.waitForTimeout(2000);
  await page.goto(`${BASE}/staff`);
  await page.waitForSelector("text=김운수"); // 목록 이름 마스킹 해제 (7.22 요청)
  console.log("휴지통 복구 ✓ (목록 이름 표시 확인)");

  await browser.close();
  console.log("\nE2E 통과");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
