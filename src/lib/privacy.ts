// 개인정보 표시 최소화 (7.20 회의: 목록 화면에서 이름 가리기)
export function maskName(name: string): string {
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}
