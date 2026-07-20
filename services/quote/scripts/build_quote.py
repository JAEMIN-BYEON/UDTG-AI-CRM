#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
물동량 견적서 시각화 빌더 v2
  입력 : 견적 JSON   출력 : PDF(A4 1p 자동맞춤) + HTML(편집용 소스)
사용법: python3 build_quote.py quote.json -o <출력폴더> [--html-only] [--no-fit]
"""
import argparse, base64, datetime, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(HERE)
ASSETS = os.path.join(SKILL, "assets")

# 24개 고정 항목 (순서·대분류 고정 / ●=필수)
SCHEMA = [
    ("기본정보", "차종", True),
    ("운행조건", "출근시간", True),
    ("운행조건", "월 운행일수", True),
    ("운행조건", "휴무일", True),
    ("운행조건", "일 운행 회전 수", True),
    ("운행조건", "일 평균 착지 수", False),
    ("운행조건", "상차 준비 방식", False),
    ("운행조건", "분류시간", False),
    ("운행조건", "하차/납품 방식", False),
    ("상품정보", "상품종류", False),
    ("상품정보", "상품 적재수단", False),
    ("운임정보", "업무시간 (평균)", True),
    ("운임정보", "운송료 (평균)", True),
    ("기타", "적재함 타입", False),
    ("기타", "냉동기 타입", False),
    ("기타", "부속장비", False),
    ("추가사항", "진행방법", False),
    ("추가사항", "반품 및 회수 여부", False),
    ("추가사항", "추가배송 여부", False),
    ("추가사항", "투잡배송 여부", False),
    ("추가사항", "장거리수당", False),
    ("추가사항", "기타수당", False),
    ("장단점", "장점", False),
    ("장단점", "단점", False),
]
CAT_ORDER = ["기본정보", "운행조건", "상품정보", "운임정보", "기타", "추가사항", "장단점"]
CAT_ICON = {"기본정보": "🚚", "운행조건": "🕘", "상품정보": "📦", "운임정보": "💳",
            "기타": "🔧", "추가사항": "📌", "장단점": "⚖"}
MERGE_GROUPS = [("기타", ["적재함 타입", "냉동기 타입", "부속장비"])]
KPI = [("운송료 (평균)", "월 운송료"), ("업무시간 (평균)", "업무시간"),
       ("일 운행 회전 수", "일 회전수"), ("휴무일", "휴무일")]
DEFAULT_THEME = {"main": "#33608F", "dark": "#22415F", "soft": "#EBF1F7"}
FOOTER_FIXED = "※ 상기 내용은 센터 및 코스에 따라 상이할 수 있습니다."


def ensure_weasyprint():
    try:
        import weasyprint  # noqa
        return True
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "weasyprint",
                        "--break-system-packages", "-q"], check=False)
        try:
            import weasyprint  # noqa
            return True
        except ImportError:
            return False


def b64img(p):
    ext = os.path.splitext(p)[1].lstrip(".").lower()
    mime = {"png": "png", "jpg": "jpeg", "jpeg": "jpeg", "svg": "svg+xml",
            "webp": "webp", "gif": "gif"}.get(ext, "png")
    with open(p, "rb") as f:
        return "data:image/%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(h, t, r):
    a = hex2rgb(h)
    return "#%02X%02X%02X" % tuple(int(round(a[i] + (t[i] - a[i]) * r)) for i in range(3))


def derive(main):
    return {"main": main, "dark": mix(main, (0, 0, 0), 0.30),
            "soft": mix(main, (255, 255, 255), 0.90),
            "line": mix(main, (255, 255, 255), 0.72)}


PERSON = re.compile(r"[·,/]?\s*[가-힣]{2,4}\s*(?:이사|부장|차장|과장|대리|주임|팀장|사원|실장|본부장|대표|담당)\s*"
                    r"(?:0?1[016-9][-\s]?\d{3,4}[-\s]?\d{4})?")
PHONE = re.compile(r"[·,/]?\s*0?1[016-9][-\s]?\d{3,4}[-\s]?\d{4}")


def strip_person(t):
    """센터 담당자 이름·연락처 제거 (사외 배포 문서이므로 개인정보 노출 방지)"""
    t = PERSON.sub("", t or "")
    t = PHONE.sub("", t)
    return re.sub(r"\s*·\s*$|^\s*·\s*", "", re.sub(r"\s{2,}", " ", t)).strip()


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")) if s is not None else ""


def load_brands():
    try:
        with open(os.path.join(ASSETS, "brand_colors.json"), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_brand(b, e):
    d = load_brands()
    d[b] = e
    try:
        with open(os.path.join(ASSETS, "brand_colors.json"), "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def norm(v):
    if v is None or v == "":
        return None
    if isinstance(v, str):
        return {"ambient": {"v": v, "note": ""}}
    if isinstance(v, dict):
        if "ambient" in v or "cold" in v:
            o = {}
            for k in ("ambient", "cold"):
                if v.get(k):
                    o[k] = norm(v[k])["ambient"]
            return o or None
        if v.get("v"):
            return {"ambient": {"v": v["v"], "note": v.get("note", "")}}
    return None


def chips(text, kind):
    """'A / B / C' → 체크리스트 칩"""
    parts = [p.strip() for p in re.split(r"\s*/\s*|\s*·\s*(?=[가-힣A-Za-z])", text) if p.strip()]
    if len(parts) < 2:
        return '<span class="chip %s">%s</span>' % (kind, esc(text))
    return "".join('<span class="chip %s">%s</span>' % (kind, esc(p)) for p in parts)


def cell(d, key, label=""):
    if not d or not d.get(key) or not d[key].get("v"):
        return '<span class="na">-</span>'
    c = d[key]
    if label == "장점":
        h = '<div class="chips">%s</div>' % chips(c["v"], "pos")
    elif label == "단점":
        h = '<div class="chips">%s</div>' % chips(c["v"], "neg")
    else:
        h = esc(c["v"]).replace("\n", "<br>")
    if c.get("note"):
        h += "<small>%s</small>" % esc(c["note"])
    return h


def build_rows(spec):
    items = {k: norm(v) for k, v in (spec.get("items") or {}).items()}
    rows, merged = [], set()
    for cat, group in MERGE_GROUPS:
        present = [k for k in group if items.get(k)]
        if len(present) >= 2:
            m = dict(items[present[0]])
            for k in present[1:]:
                for side in ("ambient", "cold"):
                    if side in items[k] and side in m:
                        n = m[side].get("note", "")
                        m[side] = {"v": m[side]["v"],
                                   "note": (n + " · " if n else "") + "%s: %s" % (
                                       k.replace(" 타입", ""), items[k][side]["v"])}
            short = {"적재함 타입": "적재함", "냉동기 타입": "냉동기", "부속장비": "부속장비"}
            rows.append((cat, " / ".join(short.get(k, k) for k in present), m))
            merged.update(group)
    for cat, label, ess in SCHEMA:
        if label in merged:
            continue
        v = items.get(label)
        if not v and not ess and not spec.get("keep_empty_items"):
            continue
        rows.append((cat, label, v))
    rows.sort(key=lambda r: CAT_ORDER.index(r[0]) if r[0] in CAT_ORDER else 99)
    return rows, items


def render_html(spec, S=1.0):
    brands = load_brands()
    bm = brands.get(spec.get("brand", ""), {})
    main = (spec.get("theme") or {}).get("main") or bm.get("main")
    t = derive(main) if main else dict(DEFAULT_THEME, line="#C9D6E4")
    if main is None:
        t["line"] = "#C9D6E4"

    lf = spec.get("brand_logo") or bm.get("logo") or ""
    lp = lf if os.path.isabs(lf) else os.path.join(ASSETS, "brands", lf)
    if lf and os.path.exists(lp):
        brand_block = '<img class="brand-img" src="%s" alt="%s">' % (b64img(lp), esc(spec.get("brand", "")))
    else:
        brand_block = '<div class="brand-type">%s</div>' % esc(spec.get("brand", ""))

    rows, items = build_rows(spec)
    dual = spec.get("temp_mode") == "dual"

    # KPI 카드
    cards = []
    for key, label in KPI:
        v = items.get(key)
        if v:
            side = v.get("ambient") or v.get("cold")
            val = side["v"]
            if len(val) > 22:
                val = val[:21] + "…"
            vh = esc(val)
        else:
            vh = '<span class="na">-</span>'
        cards.append('<div class="kpi"><div class="kpi-l">%s</div><div class="kpi-v">%s</div></div>'
                     % (esc(label), vh))
    kpi_html = '<div class="kpi-band">%s</div>' % "".join(cards)

    # 타임라인
    tl = spec.get("timeline") or []
    segs = "".join('<div class="tl-seg"><span class="tl-dot"></span><div class="tl-txt">%s</div></div>'
                   % esc(s) for s in tl)
    tl_html = ('<div class="tl"><div class="tl-cap">운행 흐름</div><div class="tl-track">%s</div>'
               '<div class="tl-note">%s</div></div>' % (segs, spec.get("timeline_note", ""))) if tl else ""

    # 표
    counts = {}
    for c, _, _ in rows:
        counts[c] = counts.get(c, 0) + 1
    body, seen, i = [], set(), 0
    for cat, label, val in rows:
        body.append('<tr>')
        if cat not in seen:
            seen.add(cat)
            i += 1
            rs = ' rowspan="%d"' % counts[cat] if counts[cat] > 1 else ""
            body.append('<td class="cat"%s><span class="cat-no">%d</span><span class="cat-nm">%s</span></td>'
                        % (rs, i, esc(cat)))
        body.append('<td class="item">%s</td>' % esc(label))
        if dual:
            body.append('<td class="val">%s</td><td class="val">%s</td>'
                        % (cell(val, "ambient", label), cell(val, "cold", label)))
        else:
            body.append('<td class="val">%s</td>' % cell(val, "ambient", label))
        body.append('</tr>')

    if dual:
        colgroup = ('<col style="width:13%"><col style="width:21%">'
                    '<col style="width:33%"><col style="width:33%">')
        thead = '<tr><th class="th-l" colspan="2">항목</th><th>%s</th><th>%s</th></tr>' % (
            esc(spec.get("temp_label_ambient", "상온")), esc(spec.get("temp_label_cold", "저온")))
    else:
        colgroup = '<col style="width:14%"><col style="width:24%"><col style="width:62%">'
        thead = '<tr><th class="th-l" colspan="2">항목</th><th>%s</th></tr>' % esc(spec.get("temp_label", "상온"))

    footer = FOOTER_FIXED + (("<br>" + esc(spec["footer_extra"])) if spec.get("footer_extra") else "")
    today = spec.get("doc_date") or datetime.date.today().strftime("%Y.%m.%d")

    return TPL.format(
        title="물동량 견적서 - %s (%s)" % (esc(spec.get("brand", "")), esc(spec.get("center", ""))),
        main=t["main"], dark=t["dark"], soft=t["soft"], line=t["line"],
        unsu=b64img(os.path.join(ASSETS, "unsu_logo.png")), brand_block=brand_block,
        brand_sub=esc(strip_person(spec.get("brand_sub", ""))), meta_line=esc(strip_person(spec.get("meta_line", ""))),
        doc_center=esc(spec.get("center", "")), doc_date=esc(today),
        kpi=kpi_html, tl=tl_html, colgroup=colgroup, thead=thead,
        tbody="".join(body), footer=footer,
        f_base=round(12.6 * S, 2), f_head=round(13.4 * S, 2), f_small=round(10.4 * S, 2),
        f_kpiv=round(15.5 * S, 2), f_kpil=round(9.8 * S, 2), f_tl=round(11.4 * S, 2),
        f_title=round(20 * S, 2), f_brand=round(18 * S, 2), f_chip=round(11 * S, 2),
        f_bsub=round(13.5 * S, 2), f_meta=round(11.5 * S, 2), brand_h2=round(54 * S, 1),
        pad=round(7.6 * S, 2), logo_h=round(50 * S, 1), brand_h=round(46 * S, 1),
        gap=round(10 * S, 1),
    )


TPL = """<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>{title}</title>
<style>
  @page {{ size:A4 portrait; margin:8mm 7mm; }}
  :root {{
    --m:{main}; --d:{dark}; --s:{soft}; --ln:{line};
    --ink:#22262B; --sub:#7A828B; --bd:#E6E9ED;
  }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:#fff; color:var(--ink);
    font-family:"Noto Sans CJK KR","Pretendard","Malgun Gothic",sans-serif; font-size:{f_base}px; }}
  .sheet {{ border:1px solid var(--bd); border-top:5px solid var(--m); border-radius:10px; padding:14px 16px 10px; }}

  /* Header */
  .hd {{ display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }}
  .hd-l {{ flex:0 0 27%; }}
  .hd-l img {{ height:{logo_h}px; display:block; }}
  .hd-c {{ flex:1; text-align:center; display:flex; justify-content:center; align-items:flex-start; padding-top:2px; }}
  .doc-title {{ font-size:{f_title}px; font-weight:900; letter-spacing:2.5px; color:var(--d); }}
  .doc-sub {{ font-size:{f_bsub}px; color:var(--sub); font-weight:700; letter-spacing:0.5px; }}
  .hd-r {{ flex:0 0 27%; text-align:right; padding-top:4px; }}
  .brand-img {{ max-height:{brand_h2}px; max-width:230px; width:auto; height:auto; object-fit:contain; display:block; margin:0 auto; }}
  .brand-type {{ font-size:{f_brand}px; font-weight:900; color:var(--m); white-space:nowrap;
    letter-spacing:-0.5px; border-bottom:3px solid var(--m); padding:0 1px 2px; }}
  .brand-sub {{ font-size:{f_bsub}px; color:var(--d); font-weight:800; }}
  .meta {{ font-size:{f_meta}px; color:var(--sub); font-weight:600; line-height:1.45; }}
  .rule {{ height:2px; background:linear-gradient(90deg,var(--m),var(--ln)); margin:{gap}px 0; border-radius:2px; }}

  /* KPI */
  .kpi-band {{ display:flex; gap:6px; margin-bottom:{gap}px; }}
  .kpi {{ flex:1; background:var(--s); border:1px solid var(--ln); border-radius:8px;
    padding:7px 8px; text-align:center; }}
  .kpi-l {{ font-size:{f_kpil}px; font-weight:800; color:var(--d); letter-spacing:0.5px; opacity:.85; }}
  .kpi-v {{ font-size:{f_kpiv}px; font-weight:900; color:var(--ink); margin-top:2px; line-height:1.25; }}

  /* Timeline */
  .tl {{ display:flex; align-items:center; gap:10px; border:1px solid var(--bd); border-left:4px solid var(--m);
    border-radius:8px; padding:7px 12px; margin-bottom:{gap}px; }}
  .tl-cap {{ font-size:{f_kpil}px; font-weight:900; color:var(--m); flex:none; letter-spacing:1px; }}
  .tl-track {{ flex:1; display:flex; align-items:center; position:relative; }}
  .tl-track::before {{ content:""; position:absolute; left:4%; right:4%; top:5px; height:2px; background:var(--ln); }}
  .tl-seg {{ flex:1; text-align:center; position:relative; }}
  .tl-dot {{ display:block; width:9px; height:9px; border-radius:50%; background:var(--m);
    margin:0 auto 4px; border:2px solid #fff; box-shadow:0 0 0 1.5px var(--m); }}
  .tl-txt {{ font-size:{f_tl}px; font-weight:700; color:var(--ink); }}
  .tl-note {{ flex:none; text-align:right; font-size:{f_small}px; color:var(--sub); font-weight:700; line-height:1.35; }}

  /* Table */
  table {{ width:100%; border-collapse:collapse; border:1px solid var(--ln); border-radius:8px; overflow:hidden; }}
  thead {{ display:table-header-group; }}
  th {{ background:var(--m); color:#fff; font-size:{f_head}px; font-weight:800; padding:8px; letter-spacing:.5px; }}
  th.th-l {{ background:var(--d); }}
  tr {{ break-inside:avoid; page-break-inside:avoid; }}
  td {{ border:1px solid var(--bd); padding:{pad}px 10px; text-align:center; vertical-align:middle; }}
  td.cat {{ background:var(--s); font-weight:900; color:var(--d); border-color:var(--ln); width:14%; }}
  .cat-no {{ display:inline-flex; align-items:center; justify-content:center; width:17px; height:17px;
    border-radius:5px; background:var(--m); color:#fff; font-size:{f_small}px; margin-right:4px; vertical-align:-3px; }}
  .cat-nm {{ white-space:nowrap; }}
  td.item {{ background:#FAFBFC; font-weight:700; color:#3D444C; }}
  td.val {{ text-align:left; line-height:1.5; }}
  tbody tr:nth-child(even) td.val, tbody tr:nth-child(even) td.item {{ background:#FCFCFD; }}
  td.val small {{ color:var(--sub); display:block; font-size:{f_small}px; margin-top:2px; }}
  .na {{ color:#B9BFC6; }}
  .chips {{ display:flex; flex-wrap:wrap; gap:3px; }}
  .chip {{ font-size:{f_chip}px; font-weight:700; padding:2px 7px 2px 6px; border-radius:20px; line-height:1.45; }}
  .chip.pos {{ background:var(--s); color:var(--d); border:1px solid var(--ln); }}
  .chip.pos::before {{ content:"✓ "; font-weight:900; }}
  .chip.neg {{ background:#F4F5F7; color:#5C636B; border:1px solid #E1E4E8; }}
  .chip.neg::before {{ content:"! "; font-weight:900; color:#98A0A8; }}

  .ft {{ display:flex; justify-content:space-between; align-items:flex-end; margin-top:8px; }}
  .ft-note {{ font-size:{f_small}px; color:var(--sub); line-height:1.5; }}
  .ft-brand {{ font-size:{f_small}px; color:var(--m); font-weight:900; white-space:nowrap; }}
</style></head><body>
<div class="sheet">
  <div class="hd">
    <div class="hd-l"><img src="{unsu}" alt="운수대통 로지스"></div>
    <div class="hd-c">{brand_block}</div>
    <div class="hd-r"><div class="meta">{meta_line}</div></div>
  </div>
  <div class="rule"></div>
  {kpi}
  {tl}
  <table>
    <colgroup>{colgroup}</colgroup>
    <thead>{thead}</thead>
    <tbody>{tbody}</tbody>
  </table>
  <div class="ft">
    <div class="ft-note">{footer}</div>
    <div class="ft-brand">UNSUDAETONG LOGIS</div>
  </div>
</div></body></html>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("-o", "--outdir", default=".")
    ap.add_argument("--html-only", action="store_true")
    ap.add_argument("--no-fit", action="store_true")
    a = ap.parse_args()

    with open(a.spec, encoding="utf-8") as f:
        spec = json.load(f)
    os.makedirs(a.outdir, exist_ok=True)
    stem = re.sub(r'[\\/:*?"<>|]', "_", "%s_%s_물동량견적서" % (spec.get("brand", "브랜드"), spec.get("center", "센터")))
    hp = os.path.join(a.outdir, stem + ".html")
    pp = os.path.join(a.outdir, stem + ".pdf")

    if spec.get("brand") and (spec.get("theme") or {}).get("main") and spec["brand"] not in load_brands():
        e = derive(spec["theme"]["main"])
        e.pop("line", None)
        e.update({"en": spec.get("brand_en", ""), "logo": spec.get("brand_logo", ""), "verified": False})
        save_brand(spec["brand"], e)

    if a.html_only:
        with open(hp, "w", encoding="utf-8") as f:
            f.write(render_html(spec))
        print(hp)
        return
    if not ensure_weasyprint():
        with open(hp, "w", encoding="utf-8") as f:
            f.write(render_html(spec))
        sys.exit("[!] weasyprint 설치 실패 — HTML만 생성: %s" % hp)

    from weasyprint import HTML
    scale, pages = 1.0, 1
    while True:
        doc = HTML(string=render_html(spec, scale)).render()
        pages = len(doc.pages)
        if pages <= 1 or a.no_fit or scale <= 0.70:
            doc.write_pdf(pp)
            break
        scale = round(scale - 0.04, 2)
    with open(hp, "w", encoding="utf-8") as f:
        f.write(render_html(spec, scale))
    print("PDF  : %s  (%dp, scale %.2f)" % (pp, pages, scale))
    print("HTML : %s" % hp)


if __name__ == "__main__":
    main()
