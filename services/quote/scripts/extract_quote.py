#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
견적서 PPTX → 견적 JSON 초안 (결정론적 추출)

운수대통 로지스 표준 물량미팅 견적서 양식 전용.
  · 슬라이드1 : 브랜드 / 센터명 / 차종 / 운행조건·운임정보·기타
  · 슬라이드2 : 화주사 / 담당자 / 추가사항 · 세일즈포인트 · 애로사항
표 구조: [2]=구분  [3]=항목  [4]=세부항목  [5]=내용  [6]=비고

사용법: python3 extract_quote.py "견적서.pptx" -o draft.json
"""
import argparse, json, os, re, subprocess, sys


def ensure_pptx():
    try:
        import pptx  # noqa
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "python-pptx",
                        "--break-system-packages", "-q"], check=False)


# 원본 항목명 → 24항목 표준명
FIELD_MAP = {
    "출근시간": "출근시간",
    "월 운행일수": "월 운행일수",
    "휴무일": "휴무일",
    "일 운행 회전 수": "일 운행 회전 수",
    "일평균 착지 수": "일 평균 착지 수",
    "일 평균 착지 수": "일 평균 착지 수",
    "상차준비 방식": "상차 준비 방식",
    "상차방식": "상차 준비 방식",
    "분류시간": "분류시간",
    "하차방식": "하차/납품 방식",
    "납품방식": "하차/납품 방식",
    "상품종류": "상품종류",
    "상품 적재수단": "상품 적재수단",
    "업무시간": "업무시간 (평균)",
    "적재함 타입": "적재함 타입",
    "냉동기 타입": "냉동기 타입",
    "부속장비": "부속장비",
    "진행방법": "진행방법",
    "반품 및 회수 여부": "반품 및 회수 여부",
    "추가배송 여부": "추가배송 여부",
    "투잡배송 여부": "투잡배송 여부",
    "장거리수당": "장거리수당",
    "기타수당": "기타수당",
    "세일즈 포인트(장점)": "장점",
    "세일즈포인트(장점)": "장점",
    "애로 및 건의사항": "단점",
}
# 표준 항목에 부기(note)로 붙일 원본 항목
NOTE_MAP = {
    "동승자": ("상차 준비 방식", "동승자"),
    "유류비": ("운송료 (평균)", "유류비"),
    "도로비": ("운송료 (평균)", "도로비"),
    "유가보조금": ("운송료 (평균)", "유가보조금"),
}
EMPTY = {"", "-", "–", "—", "없음.", "n/a", "N/A"}


def clean(t):
    t = (t or "").replace("\r", "\n")
    t = " / ".join(x.strip() for x in t.split("\n") if x.strip())   # 줄바꿈 → 구분자 보존
    t = re.sub(r"[ \t]+", " ", t).strip()
    return "" if t in EMPTY else t


def rows_of(slide):
    out = []
    for shape in slide.shapes:
        if getattr(shape, "has_table", False):
            for r in shape.table.rows:
                out.append([clean(c.text) for c in r.cells])
    return out


def extract(path):
    ensure_pptx()
    from pptx import Presentation
    prs = Presentation(path)
    slides = list(prs.slides)

    data = {"items": {}, "extras": {}, "_source": os.path.basename(path)}
    raw = []
    for s in slides:
        raw += rows_of(s)

    # ── 헤더 (브랜드 / 센터 / 차종 / 화주사 / 담당자)
    for r in raw:
        joined = " ".join(r)
        for c in r:
            if c.startswith("센터명"):
                data["center_full"] = c.split(":", 1)[-1].strip()
            elif c.startswith("차종"):
                data["items"]["차종"] = c.split(":", 1)[-1].strip()
            elif c.startswith("화주사"):
                v = c.split(":", 1)[-1].strip() if ":" in c else ""
                v = v.split(" / ")[0].strip()
                if v and v != "화주사":
                    data["shipper"] = v
                # 같은 셀에 담당자가 함께 들어간 경우
                if " / " in c:
                    tail = c.split(" / ", 1)[1].strip()
                    if tail and "contact" not in data:
                        data["contact"] = tail
        # 브랜드: '추가사항' 이 아닌 구분열의 최상단 텍스트
        if len(r) > 2 and r[2] and r[2] not in ("구분", "추가사항", "운행조건", "운임정보", "기타") \
                and "brand" not in data and not r[3:6][0]:
            data["brand"] = r[2]
    # 담당자: 연락처 패턴 또는 직급 패턴
    if "contact" not in data:
        for r in raw:
            for c in r:
                if re.search(r"01[016-9][-\s]?\d{3,4}[-\s]?\d{4}", c):
                    data["contact"] = c
                    break
            if "contact" in data:
                break
    if "contact" not in data:
        for r in raw:
            for c in r:
                if re.fullmatch(r"[가-힣]{2,4}\s*(이사|부장|차장|과장|대리|주임|팀장|사원|실장|본부장|대표)", c):
                    data["contact"] = c
                    break
            if "contact" in data:
                break

    # ── 항목
    seen_dup = {}
    for r in raw:
        if len(r) < 6:
            continue
        item, sub, val, note = r[3], r[4], r[5], (r[6] if len(r) > 6 else "")
        if "?" in note or "？" in note:      # 내부 검토 메모는 산출물에서 제외
            note = ""
        key = sub if (sub and sub not in ("", item)) else item
        if not key or not val:
            continue
        # 개인정보(담당자·연락처·소속)는 어떤 형태로도 산출물에 넣지 않는다 (§9)
        if any(w in key or w in val for w in ("담당자", "연락처")):
            continue
        if key in ("운송료",):
            std = "운송료 (평균)"
        elif "애로" in key:          # "애로 및 건의사항" 등 표기 변형 → 단점 (8.10 확정)
            std = "단점"
        elif "세일즈" in key:        # "세일즈 포인트(장점)" 표기 변형 → 장점
            std = "장점"
        else:
            std = FIELD_MAP.get(key) or FIELD_MAP.get(key.replace(" ", ""))
        if std:
            prev = data["items"].get(std)
            if prev and isinstance(prev, dict):
                # 같은 표준항목에 두 값 (예: 상차준비/상차방식, 하차/납품) → 병합
                if val not in prev["v"]:
                    prev["v"] = prev["v"] + " / " + val
            else:
                data["items"][std] = {"v": val, "note": note}
            seen_dup[std] = True
        elif key in NOTE_MAP:
            tgt, label = NOTE_MAP[key]
            data.setdefault("_notes", []).append((tgt, "%s: %s" % (label, val)))
        else:
            data["extras"][key] = val + ((" (%s)" % note) if note else "")

    # 부기 붙이기
    for tgt, txt in data.pop("_notes", []):
        it = data["items"].setdefault(tgt, {"v": "", "note": ""})
        it["note"] = (it["note"] + " · " if it["note"] else "") + txt

    # ── 파생 필드
    ex = data["extras"]
    data["center"] = re.sub(r"\s*\(.*?\)\s*", "", data.get("center_full", "")).split()[-1] \
        if data.get("center_full") else "센터"
    data["meta_line"] = "%s%s" % (
        data.get("center_full", ""),
        " (%s)" % ex["센터 상세주소"] if ex.get("센터 상세주소") else "")
    # 담당자 이름·연락처는 산출물에 넣지 않는다 (개인정보)
    data["brand_sub"] = ("화주사 " + data["shipper"]) if data.get("shipper") else ""

    # 타임라인 초안
    tl = []
    if data["items"].get("출근시간"):
        tl.append("출근 " + data["items"]["출근시간"]["v"])
    for k in ("분류시간", "상차 준비 방식"):
        if data["items"].get(k):
            tl.append("상차·분류 " + data["items"][k]["v"])
            break
    if data["items"].get("업무시간 (평균)"):
        tl.append("업무시간 " + data["items"]["업무시간 (평균)"]["v"])
    data["timeline"] = tl
    note = []
    if data["items"].get("일 운행 회전 수"):
        note.append("일 %s" % data["items"]["일 운행 회전 수"]["v"].replace("회전", "회전").strip())
    if ex.get("권역"):
        areas = [a.strip() for a in ex["권역"].split(",") if a.strip()]
        if len(", ".join(areas)) <= 24:
            note.append("(%s)" % ", ".join(areas))
        else:
            note.append("(%s 외 %d개 권역)" % (areas[0], len(areas) - 1))
    data["timeline_note"] = "<br>".join(note)

    data["temp_mode"] = "single"
    prod = (data["items"].get("상품종류") or {}).get("v", "")
    if "냉동" in prod and "상온" in prod:
        data["temp_label"] = "냉동 · 냉장 · 상온 혼적"
        data["footer_extra"] = "※ 본 건은 냉동·냉장·상온이 한 코스에 혼적되는 물량으로, 온도구간을 구분하지 않고 단일 항목으로 표기하였습니다."
    elif "냉동" in prod or "냉장" in prod:
        data["temp_label"] = "저온 (냉동·냉장)"
    else:
        data["temp_label"] = "상온"

    data["theme"] = {"main": ""}   # 에이전트가 브랜드 컬러 채움
    data["brand_logo"] = ""
    return data


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("pptx")
    ap.add_argument("-o", "--out", default="")
    a = ap.parse_args()
    d = extract(a.pptx)
    js = json.dumps(d, ensure_ascii=False, indent=2)
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(js)
        print("draft: %s" % a.out)
    print(js)
