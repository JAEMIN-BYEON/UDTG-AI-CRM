// 키오스크 한글 입력 보조 — 영타(두벌식 자판 위치)로 들어온 글자를 한글로 자동 변환.
// OS의 한/영 IME 상태를 웹에서 제어할 수 없으므로, 어떤 상태에서 타이핑해도
// 한글 항목에는 한글이 입력되도록 값 자체를 변환한다 (다른 항목으로 이동해도 유지).
import Inko from "inko/index.js";

const inko = new Inko();

export function hangulizeInput(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) {
  // 실제 한글 IME 조합 중에는 값을 건드리면 조합이 깨진다 — 조합 중이면 통과
  if ((e.nativeEvent as InputEvent).isComposing) return;
  const el = e.currentTarget;
  // 영문자 또는 미조합 자모가 있을 때만 변환 — 키 입력마다 낱자가 쌓이므로
  // 전체 값을 자판열로 되돌렸다가(ko2en) 다시 조합(en2ko)해 음절을 완성한다
  if (!/[a-zA-Zㄱ-ㅣ]/.test(el.value)) return;
  const converted = inko.en2ko(inko.ko2en(el.value));
  if (converted !== el.value) el.value = converted;
}
