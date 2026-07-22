// PPTX 업로드 공통 가드 — Cloud Run 요청 크기 제한(32MB) 대응
export const MAX_UPLOAD_MB = 30;

export function checkPptxFile(f: File): string | null {
  if (!f.name.toLowerCase().endsWith(".pptx")) return "PPTX 파일만 업로드할 수 있습니다.";
  if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `파일이 ${Math.round(f.size / 1024 / 1024)}MB로 너무 큽니다 (최대 ${MAX_UPLOAD_MB}MB). PPT의 사진 용량을 압축한 뒤 다시 올려주세요. (PowerPoint: 그림 선택 → 그림 서식 → 그림 압축)`;
  }
  return null;
}

// fetch가 응답 없이 실패(Failed to fetch)하면 원인별 안내 문구로 변환
export function uploadErrorMessage(err: unknown): string {
  if (err instanceof TypeError) {
    return "업로드 중 연결이 끊겼습니다. 파일이 크면 사진 용량을 줄인 뒤 다시 시도하시고, 네트워크 상태도 확인해 주세요.";
  }
  return err instanceof Error ? err.message : "업로드 실패";
}
