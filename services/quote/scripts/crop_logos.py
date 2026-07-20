#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
로고 모음 이미지 → 브랜드별 로고 PNG 자동 추출
  · 원형 배지 안에 로고가 배치된 이미지(회사소개 파트너십 이미지 등)에서
    원을 검출 → 링(테두리) 제거 → 배경 투명화 → 여백 트림 → 3배 업스케일 저장

사용법:
  python3 crop_logos.py <이미지> --names 다이소:daiso,CU:cu,이마트24:emart24 ...   (좌→우 순서)
  python3 crop_logos.py <이미지> --preview        (검출만 하고 컨택트시트 생성)

저장 위치: assets/brands/<slug>.png  →  이후 logo_color.py 로 대표색 등록
"""
import argparse, math, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), "assets")
BRANDS = os.path.join(ASSETS, "brands")


def ensure():
    for mod, pkg in (("cv2", "opencv-python-headless"), ("PIL", "pillow")):
        try:
            __import__(mod)
        except ImportError:
            subprocess.run([sys.executable, "-m", "pip", "install", pkg,
                            "--break-system-packages", "-q"], check=False)


def is_white(px, x, y):
    r, g, b, _ = px[x, y]
    mn, mx = min(r, g, b), max(r, g, b)
    return mn >= 228 and (mx - mn) <= 14


def extract(path, names, upscale=3):
    ensure()
    import cv2, numpy as np
    from PIL import Image, ImageDraw

    img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    bgr = img[:, :, :3].copy()
    if img.shape[2] == 4:
        bgr[img[:, :, 3] < 10] = 255
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    cs = cv2.HoughCircles(gray, cv2.HOUGH_GRADIENT, dp=1, minDist=90,
                          param1=100, param2=45, minRadius=45, maxRadius=90)
    if cs is None:
        sys.exit("[!] 원형 배지를 찾지 못했습니다. minRadius/maxRadius 를 조정하세요.")
    cs = sorted(np.round(cs[0]).astype(int), key=lambda c: c[0])   # 좌→우
    print("[i] 원 %d개 검출" % len(cs))
    if names and len(names) != len(cs):
        sys.exit("[!] 검출된 원 %d개 ≠ 지정한 이름 %d개" % (len(cs), len(names)))

    pil = Image.open(path).convert("RGBA")
    base = Image.new("RGBA", pil.size, (255, 255, 255, 255))
    base.alpha_composite(pil)
    pil = base
    px = pil.load()
    W, H = pil.size
    os.makedirs(BRANDS, exist_ok=True)
    out = []

    for i, (x, y, r) in enumerate(cs):
        # 링 안쪽 경계 탐색 (바깥→안, 거의 흰색이 되는 첫 반지름)
        Rm = None
        for rad in range(r + 3, int(r * 0.45), -1):
            tot = n = 0
            for k in range(120):
                th = 2 * math.pi * k / 120
                xi, yi = int(x + rad * math.cos(th)), int(y + rad * math.sin(th))
                if 0 <= xi < W and 0 <= yi < H:
                    tot += 1
                    n += 0 if is_white(px, xi, yi) else 1
            if tot and n / tot < 0.08:
                Rm = rad - 2
                break
        if Rm is None:
            Rm = int(r * 0.8)

        crop = pil.crop((x - Rm, y - Rm, x + Rm, y + Rm)).convert("RGBA")
        mask = Image.new("L", crop.size, 0)
        ImageDraw.Draw(mask).ellipse((0, 0, crop.size[0] - 1, crop.size[1] - 1), fill=255)
        cell = Image.new("RGBA", crop.size, (255, 255, 255, 255))
        cell.paste(crop, (0, 0), mask)
        cp = cell.load()
        for j in range(cell.height):
            for k in range(cell.width):
                rr, gg, bb, _ = cp[k, j]
                mn, mx = min(rr, gg, bb), max(rr, gg, bb)
                if mn >= 228 and (mx - mn) <= 14:
                    cp[k, j] = (255, 255, 255, 0)
        bb = cell.getbbox()
        if bb:
            cell = cell.crop(bb)
        cell = cell.resize((cell.width * upscale, cell.height * upscale), Image.LANCZOS)
        slug = names[i][1] if names else "logo%d" % (i + 1)
        p = os.path.join(BRANDS, slug + ".png")
        cell.save(p)
        out.append((names[i][0] if names else slug, p, cell.size))
        print("  → %-12s %s  %dx%d" % (out[-1][0], p, cell.width, cell.height))
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--names", default="", help="좌→우 순서. 예: 다이소:daiso,CU:cu")
    a = ap.parse_args()
    names = [tuple(n.split(":")) for n in a.names.split(",") if ":" in n] if a.names else []
    extract(a.image, names)
    print("\n다음: python3 logo_color.py assets/brands/<slug>.png --register <브랜드명>")
