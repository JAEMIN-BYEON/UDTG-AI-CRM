# GCP 배포 가이드 — 전 과정 구글 클라우드에서 진행

구성: **Cloud Run**(앱) + **Cloud SQL PostgreSQL**(데이터, 매일 자동 백업) + **Cloud Build**(push 자동 배포) — 서울 리전.
로컬 PC에 설치할 것은 **없습니다.** 모든 작업은 브라우저의 GCP 콘솔 + Cloud Shell에서 합니다.
예상 비용: Cloud SQL db-g1-small 월 3~4만 원 + Cloud Run 사용량(사내 트래픽 기준 월 1만 원 미만).

---

## ✅ 해야 할 일 체크리스트

### 준비 (5분)

- [ ] **GCP 콘솔 로그인** — https://console.cloud.google.com (기존 회사 구글클라우드 계정)
- [ ] **프로젝트 ID 확인** — 콘솔 상단 프로젝트 선택기에서 확인 (예: `udtg-logis-123456`). 결제 계정 연결 필수
- [ ] **접속 코드 2개 결정** — 담당자용 / 관리자용, 서로 다르게 8자 이상
- [ ] (선택) **OpenAI API 키** — 없으면 추천 사유가 규칙 기반 문장으로 나감

### 최초 배포 (Cloud Shell에서 10~15분)

- [ ] GCP 콘솔 우측 상단의 **Cloud Shell 아이콘(>_)** 클릭 → 브라우저 안에 터미널이 열림
- [ ] 아래 명령을 순서대로 입력:

```bash
git clone https://github.com/JAEMIN-BYEON/UDTG-AI-CRM.git
cd UDTG-AI-CRM
git checkout claude/representative-disagreement-yejspa

PROJECT_ID=프로젝트ID \
STAFF_PASSCODE=담당자코드 \
ADMIN_PASSCODE=관리자코드 \
OPENAI_API_KEY=sk-... \
./deploy/deploy.sh
```

- [ ] 중간에 권한 승인 팝업이 나오면 **승인(Authorize)** 클릭
- [ ] **출력되는 DB 비밀번호를 복사해 안전한 곳에 보관** (재배포 시 `DB_PASS=...`로 필요)
- [ ] 마지막에 출력되는 배포 URL 3개(`/consult`, `/staff`, `/admin/listings`) 접속 확인

### 자동 배포 연결 (선택, 콘솔에서 5분 — 이후 git push만으로 재배포)

- [ ] 콘솔 → **Cloud Build → 트리거 → 저장소 연결** → GitHub 선택 → `JAEMIN-BYEON/UDTG-AI-CRM` 연결 (GitHub 로그인 승인)
- [ ] **트리거 만들기**: 이벤트 = "브랜치에 푸시", 브랜치 = 배포용 브랜치, 구성 = "Cloud Build 구성 파일(`cloudbuild.yaml`)"
- [ ] 콘솔 → IAM에서 Cloud Build 서비스 계정(`...@cloudbuild.gserviceaccount.com`)에 **Cloud Run 관리자**, **서비스 계정 사용자** 역할 부여
- [ ] 이후에는 코드 수정 → push → 자동 재배포 (Cloud Shell 다시 열 필요 없음)

### 배포 후 운영 준비

- [ ] `/admin/listings`에서 **실제 물량 데이터 입력** (샘플 8건은 수정/모집중지 처리)
- [ ] **키오스크 PC 설정** — 매장 PC 크롬 바로가기 대상: `chrome --kiosk https://배포URL/consult`
- [ ] **개인정보 동의 문안 확정** — 동의서(보유 기간 1년)를 회사 방침에 맞게 법무 확인
- [ ] (선택) 회사 도메인 연결: Cloud Shell에서
      `gcloud run domain-mappings create --service udtg-ai-crm --domain 원하는도메인 --region asia-northeast3`
      실행 후 안내되는 DNS 레코드를 도메인 업체에 등록

---

## 운영 팁

| 상황 | 방법 |
|---|---|
| 코드 수정 후 재배포 | 트리거 연결 시: git push만. 미연결 시: Cloud Shell에서 `DB_PASS=보관한비번` 포함해 `./deploy/deploy.sh` 재실행 |
| 접속 코드 변경 | 콘솔 → Secret Manager → `udtg-staff-passcode` 새 버전 추가 → Cloud Run 새 리비전 배포 |
| DB 백업 확인 | 콘솔 → Cloud SQL → 백업 탭 (매일 03:00 자동) |
| 앱 로그 확인 | 콘솔 → Cloud Run → 로그 탭 (OpenAI 폴백 발생 여부 등) |

## 구조 메모

- 로컬 개발은 SQLite, 운영은 PostgreSQL. Docker 빌드 시 `schema.prisma`의 provider를 postgresql로 치환해 클라이언트를 생성하고, 런타임은 `DATABASE_URL` 프리픽스로 어댑터를 자동 선택한다 (`src/lib/db.ts`).
- 컨테이너 기동 시 `prisma db push`로 스키마를 동기화한다. 데이터가 쌓인 뒤 컬럼 삭제형 스키마 변경은 주의 (필요 시 마이그레이션 체계로 전환).
- Cloud Run ↔ Cloud SQL은 유닉스 소켓(`/cloudsql/...`)으로 연결되며 DB는 공인 IP를 열지 않는다.
- `/staff`, `/admin`은 접속 코드 로그인(서명 쿠키, 12시간 유효)으로 보호된다. 키오스크(`/consult`)는 무인증.
