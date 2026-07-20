#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
폴더 파이프라인 : <root>/Input/*.pptx  →  <root>/Output/*.pdf

  1단계  python3 run_folder.py <root> --stage extract
         Input 의 미처리 PPTX 를 스캔해 Output/_drafts/<파일>.json 초안 생성
         (에이전트가 초안을 열어 브랜드 컬러·장단점·타임라인을 보강한다)

  2단계  python3 run_folder.py <root> --stage build
         Output/_drafts/*.json 을 모두 PDF+HTML 로 렌더링해 Output/ 에 저장

  전체    python3 run_folder.py <root>            (extract → build 연속 실행)

이미 Output 에 PDF 가 있는 견적서는 건너뛴다 (--force 로 재생성).
"""
import argparse, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_EXT = (".pptx", ".ppt")


def find_root(root):
    inp = next((os.path.join(root, d) for d in os.listdir(root)
                if d.lower() == "input" and os.path.isdir(os.path.join(root, d))), None)
    out = next((os.path.join(root, d) for d in os.listdir(root)
                if d.lower() == "output" and os.path.isdir(os.path.join(root, d))), None)
    if not inp:
        sys.exit("[!] Input 폴더를 찾을 수 없습니다: %s" % root)
    if not out:
        out = os.path.join(root, "Output")
        os.makedirs(out, exist_ok=True)
    return inp, out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root", help="Input/Output 을 포함한 상위 폴더")
    ap.add_argument("--stage", choices=["extract", "build", "all"], default="all")
    ap.add_argument("--force", action="store_true", help="이미 PDF가 있어도 재처리")
    a = ap.parse_args()

    inp, out = find_root(a.root)
    drafts = os.path.join(out, "_drafts")
    os.makedirs(drafts, exist_ok=True)
    done = {f.rsplit("_물동량견적서", 1)[0] for f in os.listdir(out) if f.endswith(".pdf")}

    if a.stage in ("extract", "all"):
        pend = []
        for f in sorted(os.listdir(inp)):
            if not f.lower().endswith(SRC_EXT) or f.startswith("~$"):
                continue
            dj = os.path.join(drafts, os.path.splitext(f)[0] + ".json")
            if os.path.exists(dj) and not a.force:
                print("[skip] 초안 있음 : %s" % f)
                continue
            r = subprocess.run([sys.executable, os.path.join(HERE, "extract_quote.py"),
                                os.path.join(inp, f), "-o", dj],
                               capture_output=True, text=True)
            if r.returncode:
                print("[FAIL] %s\n%s" % (f, r.stderr[-400:]))
                continue
            with open(dj, encoding="utf-8") as fh:
                d = json.load(fh)
            # 브랜드 사전에 이미 등록된 브랜드면 컬러·로고는 자동 적용되므로 보강 불필요
            try:
                bp = os.path.join(os.path.dirname(HERE), "assets", "brand_colors.json")
                with open(bp, encoding="utf-8") as bf:
                    known = json.load(bf).get(d.get("brand", ""), {})
            except Exception:
                known = {}
            gaps = []
            if not (d.get("theme") or {}).get("main") and not known.get("main"):
                gaps.append("브랜드컬러")
            if not (d.get("items") or {}).get("장점"):
                gaps.append("장점(유추필요)")
            if not d.get("brand_logo") and not known.get("logo"):
                gaps.append("로고(폴백)")
            pend.append((f, d.get("brand", "?"), d.get("center", "?"), len(d.get("items", {})), gaps))
            print("[초안] %s → %s | 브랜드=%s 센터=%s 항목=%d | 보강필요: %s"
                  % (f, os.path.basename(dj), d.get("brand"), d.get("center"),
                     len(d.get("items", {})), ", ".join(gaps) or "없음"))
        if not pend:
            print("[i] 신규 초안 없음")
        print("\n>>> 초안 위치: %s" % drafts)
        print(">>> 에이전트: 각 초안의 theme.main(브랜드 공식 컬러), items.장점(유추), timeline 을 검수·보강한 뒤 --stage build 실행")

    if a.stage in ("build", "all"):
        n = 0
        for f in sorted(os.listdir(drafts)):
            if not f.endswith(".json"):
                continue
            dj = os.path.join(drafts, f)
            with open(dj, encoding="utf-8") as fh:
                d = json.load(fh)
            stem = "%s_%s" % (d.get("brand", "브랜드"), d.get("center", "센터"))
            if stem in done and not a.force:
                print("[skip] PDF 있음 : %s" % stem)
                continue
            r = subprocess.run([sys.executable, os.path.join(HERE, "build_quote.py"), dj, "-o", out],
                               capture_output=True, text=True)
            print(r.stdout.strip() or r.stderr.strip()[-400:])
            n += r.returncode == 0
        print("\n[완료] %d건 생성 → %s" % (n, out))


if __name__ == "__main__":
    main()
