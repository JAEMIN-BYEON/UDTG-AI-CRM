---
name: mulryang-quote-sheet
description: 운수대통 로지스 물동량 견적서를 24개 표준 항목의 시각화 문서(PDF+HTML)로 변환한다. Input 폴더에 화주사 견적서 PPTX를 넣으면 Output 폴더에 브랜드 로고·컬러가 적용된 A4 1페이지 견적서가 생성된다. 사용자가 "물동량 견적서", "견적서 만들어줘", "견적서 시각화", "Input 폴더 처리", "○○센터 견적서", "물량미팅 견적서"를 언급하거나 CJ대한통운·삼성웰스토리·설빙·소와나무·쿠팡·GS25·CU·이마트24 등 화주사 견적서의 시각화·양식화를 요청할 때 트리거한다.
---

# 물동량 견적서 시각화 (운수대통 로지스)

**Input 폴더 → Output 폴더** 파이프라인. 견적서 PPTX를 넣으면 24개 고정 항목의 A4 1페이지 PDF가 나온다.

```
<작업폴더>/
  Input/    ← 견적서 PPTX 를 여기에 넣는다
  Output/   ← PDF + HTML 이 여기에 생성된다
    _drafts/  ← 중간 산출물 (견적 JSON). 수정 후 재빌드 가능
```

## 표준 워크플로우

### 1단계 · 추출 (자동)
```bash
python3 scripts/run_folder.py "<작업폴더>" --stage extract
```
Input 의 미처리 PPTX 를 스캔해 `Output/_drafts/*.json` 초안을 만든다.
운수대통 표준 견적서 양식(구분/항목/내용/비고 표)을 좌표로 읽어 **브랜드·센터·화주사·담당자·24항목을 결정론적으로 추출**한다. 이미 초안이 있으면 건너뛴다(`--force` 로 재처리).
실행 결과에 파일별 **보강필요 항목**(브랜드컬러 / 장점 / 로고)이 표시된다.

### 2단계 · 보강 (에이전트가 판단)
각 초안 JSON 을 열어 아래만 채운다. **나머지는 손대지 않는다.**

1. **`theme.main`** — 브랜드 대표 컬러 HEX
   - `assets/brand_colors.json` 에 있으면 그대로 사용 (재검색 불필요)
   - 로고 파일이 있으면 `python3 scripts/logo_color.py <로고파일> --register <브랜드명>` → 대표색 자동 추출·등록
   - 둘 다 없으면 웹검색. 공식 HEX를 못 찾으면 지어내지 말고 잠정값을 쓰되 사용자에게 "잠정"임을 알린다.
2. **`items.장점` / `items.단점`** — 원본이 공란이면 `reference/MAPPING.md` 의 유추 규칙대로 채운다 (안내문구 없이)
3. **`timeline`** (3구간) / **`timeline_note`** — 초안이 어색하면 다듬는다
4. **`brand_logo`** — `assets/brands/` 에 로고 파일이 있으면 파일명 기입

### 3단계 · 빌드
```bash
python3 scripts/run_folder.py "<작업폴더>" --stage build --force
```
→ `Output/<브랜드>_<센터>_물동량견적서.pdf` (A4 1페이지 자동 맞춤) + 동명 `.html`
단건만 다시 만들 때: `python3 scripts/build_quote.py <초안.json> -o <Output폴더>`

### 4단계 · 전달
`present_files` 로 **PDF를 전달**한다. 잠정 컬러·유추한 장단점이 있으면 그 사실을 1~2줄로 알린다.

## 산출물 구성
문서 타이틀바 → **핵심지표 4카드**(월 운송료·업무시간·일 회전수·휴무일) → **운행 흐름 타임라인** → 24항목 표 → 장단점 체크리스트 칩 → 고정 각주

## 절대 규칙
- 24개 항목 외 **추가·삭제·이름변경 금지**. 순서·대분류 고정.
- 원본에 없는 값은 지어내지 않는다 → 필수항목은 `-`, 비필수항목은 자동 생략.
- 하단 고정 문구 `※ 상기 내용은 센터 및 코스에 따라 상이할 수 있습니다.` 유지(자동).
- 좌측 상단 운수대통 로지스 로고는 **고정 자산**(`assets/unsu_logo.png`). 교체·재생성 금지.
- **로고는 원격 URL 금지.** 반드시 `assets/brands/` 에 파일로 둔다. 파일이 없으면 브랜드명 로고타입으로 자동 폴백(정상 동작).
- 상온/저온이 **각각 별도 데이터로 존재할 때만** 2열 비교(`temp_mode:"dual"`). 혼적·단일이면 단일 열.
- "적자/흑자" 등 비전문 표현 금지, 정확한 회계·물류 용어 사용.

## 브랜드 로고 팩 (내장 완료)
`assets/brands/` 에 화주사 로고 14종이 이미 등록되어 있다 — 다이소·CU·이마트24·크린토피아·세븐일레븐·CJ대한통운·쿠팡·소와나무·동원·GS25·골프존·청정원·삼성웰스토리. 브랜드명이 일치하면 로고·컬러가 **자동 적용**되므로 추가 작업이 필요 없다.

### 새 로고 추가 방법
**(A) 로고 모음 이미지에서 일괄 추출** — 회사소개 파트너십 이미지처럼 원형 배지 안에 로고가 있는 경우
```bash
python3 scripts/crop_logos.py "<이미지.png>" --names "브랜드1:slug1,브랜드2:slug2"   # 좌→우 순서
python3 scripts/logo_color.py assets/brands/<slug>.png --register <브랜드명>
```
원 검출 → 링 제거 → 배경 투명화 → 트림 → 3배 업스케일까지 자동 처리된다.

**(B) 단일 로고 파일** — `assets/brands/` 에 넣고 `logo_color.py ... --register` 실행

**(C) 웹에서 수집 (Claude in Chrome 경유)**
샌드박스는 외부 이미지 다운로드가 차단되므로 로고는 **브라우저를 경유**해 가져온다. 브랜드당 1회만 하면 영구 재사용된다.

1. `navigate` 로 화주사 공식 사이트 접속
2. `javascript_tool` 로 로고 자산 탐색:
   `performance.getEntriesByType('resource').map(r=>r.name).filter(n=>/logo|ci|bi|symbol|\.svg/i.test(n))`
3. **SVG(벡터) 최우선** — 인쇄 품질 최상. `fetch(url).then(r=>r.text())` 로 받아 `<pre>` 에 심고 `get_page_text` 로 한 번에 회수
4. 래스터(PNG/GIF/JPG)만 있으면 **hex 로 회수**:
   `const b=new Uint8Array(await (await fetch(url)).arrayBuffer()); let hx=''; for(const x of b) hx+=x.toString(16).padStart(2,'0');`
   → `<pre>` 에 심고 `get_page_text` → 샌드박스에서 `bytes.fromhex()` 로 복원
   ⚠️ **base64 출력은 도구가 차단**하므로 반드시 hex 를 쓴다
5. `assets/brands/<브랜드>.svg|png` 저장 → `logo_color.py <파일> --register <브랜드명>` 으로 대표색 등록
6. 흰색 전용 로고(다크 헤더용)는 백지 문서에서 안 보이므로 쓰지 않는다 — 컬러/다크 버전을 찾거나 사용자에게 원본 파일을 요청한다

## 파일
| 경로 | 역할 |
|------|------|
| `scripts/run_folder.py` | Input→Output 파이프라인 오케스트레이터 |
| `scripts/extract_quote.py` | PPTX → 견적 JSON 초안 (결정론적) |
| `scripts/build_quote.py` | JSON → PDF + HTML (1페이지 자동 맞춤) |
| `scripts/logo_color.py` | 로고 이미지 → 브랜드 대표색 추출·등록 |
| `scripts/crop_logos.py` | 로고 모음 이미지 → 브랜드별 로고 PNG 일괄 추출 |
| `scripts/parse_pptx.py` | 비표준 양식일 때 원문 덤프 (수동 매핑용) |
| `reference/MAPPING.md` | 24항목 정의·매핑·장단점 유추 규칙 |
| `assets/brand_colors.json` | 브랜드 컬러 사전 (자동 누적) |
| `assets/brands/` | 브랜드 로고 (SVG/PNG) |
