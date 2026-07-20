"use client";

import { useFormStatus } from "react-dom";
import { LoadingOverlay } from "@/components/LoadingOverlay";

export function FinalizeButton() {
  const { pending } = useFormStatus();

  return (
    <>
      {pending && (
        <LoadingOverlay
          title="상담 신청을 접수하고 있습니다"
          steps={["신청 내용을 저장하는 중...", "담당자에게 전달하는 중..."]}
        />
      )}
      <button
        disabled={pending}
        className="w-full rounded-2xl bg-blue-600 px-8 py-6 text-2xl font-bold text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "접수 중..." : "이 내용으로 상담 신청 완료"}
      </button>
    </>
  );
}
