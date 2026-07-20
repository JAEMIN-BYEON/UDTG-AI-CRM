#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
브랜드 로고 이미지 → 대표 컬러(HEX) 자동 추출
  · 투명/흰색/검정/회색 픽셀을 배제하고, 채도·빈도 가중으로 대표색 선정
사용법: python3 logo_color.py assets/brands/cj.png [--register CJ대한통운]
"""
import argparse, colorsys, json, os, subprocess, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), "assets")


def ensure_pil():
    try:
        from PIL import Image  # noqa
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "pillow",
                        "--break-system-packages", "-q"], check=False)


def dominant(path):
    ensure_pil()
    from PIL import Image
    im = Image.open(path).convert("RGBA").resize((160, 160))
    c = Counter()
    for r, g, b, a in im.getdata():
        if a < 160:
            continue
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if s < 0.22 or l > 0.93 or l < 0.10:      # 무채색·흰색·검정 제외
            continue
        key = (r // 16 * 16, g // 16 * 16, b // 16 * 16)
        c[key] += 1 + s * 2                        # 채도 가중
    if not c:
        return None
    r, g, b = c.most_common(1)[0][0]
    # 버킷 중심 보정
    return "#%02X%02X%02X" % (min(r + 8, 255), min(g + 8, 255), min(b + 8, 255))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--register", default="", help="brand_colors.json 에 등록할 브랜드명")
    a = ap.parse_args()
    hexv = dominant(a.image)
    if not hexv:
        sys.exit("[!] 유채색을 찾지 못했습니다 (무채색 로고). 컬러를 직접 지정하세요.")
    print(hexv)
    if a.register:
        p = os.path.join(ASSETS, "brand_colors.json")
        d = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}
        e = d.get(a.register, {})
        e["main"] = hexv
        e["logo"] = os.path.basename(a.image)
        e["verified"] = True
        d[a.register] = e
        json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print("registered: %s → %s" % (a.register, hexv))
