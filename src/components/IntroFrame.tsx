"use client";

// 센터 소개서(HTML) 임베드 — 같은 출처이므로 로드 후 내용 높이에 맞춰 자동 조절
import { useRef, useState } from "react";

export function IntroFrame({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(900);

  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      className="w-full rounded-xl border border-slate-200 bg-white"
      style={{ height }}
      onLoad={() => {
        const h = ref.current?.contentDocument?.body?.scrollHeight;
        if (h) setHeight(h + 24);
      }}
    />
  );
}
