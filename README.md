# 운수대통로지스 상담 AI (UDTG-AI-CRM)

내방 고객 상담 접수 → AI 물량 추천 → 담당자 심층 상담 리포트까지 담당하는 상담 표준화 시스템.
설계 문서: [docs/DESIGN.md](docs/DESIGN.md)

## 현재 구현 범위 (P1 MVP + P2 일부)

- **키오스크 상담신청서** (`/consult`) — 개인정보 동의 → 단계별 위저드 입력
- **AI 물량 추천** — 하드 필터 + 규칙 스코어링(설계서 §7) 상위 3건, OpenAI로 추천 사유 생성 (`OPENAI_API_KEY` 미설정/장애 시 템플릿 사유 폴백)
- **담당자 대시보드** (`/staff`) — 접수 목록, 상담 상세, 인쇄용 요약 리포트
- **물량 관리** (`/admin/listings`) — 운영본부용 CRUD, 모집 on/off, 30일 미갱신 경고
- **기록 보존** — 동의 이력(문안 버전), 추천 사유 원문, 점수 근거, 사용 모델 ID 저장

- **직원 로그인** — `/staff`, `/admin`은 접속 코드 로그인(서명 쿠키)으로 보호. 키오스크는 무인증
- **GCP 배포 구성** — Dockerfile + Cloud Run/Cloud SQL 배포 스크립트 + Cloud Build 자동 배포. [docs/DEPLOY.md](docs/DEPLOY.md)

미구현(후속): 교육영상(P3), 다우오피스 연계(P4), 개인정보 컬럼 암호화·파기 배치. 선탑 일정 확정은 다우오피스 캘린더에서 진행(범위 외).

## 실행

```bash
npm install
npm run db:migrate   # SQLite (prisma/dev.db) 마이그레이션
npm run db:seed      # 샘플 물량 8건 시드
npm run dev          # http://localhost:3000
```

환경 변수 (`.env`):

```
DATABASE_URL="file:./prisma/dev.db"   # 운영은 postgresql://... (어댑터 자동 선택)
AUTH_SECRET=아무-긴-랜덤-문자열        # 로그인 쿠키 서명 키
STAFF_PASSCODE=담당자접속코드          # /staff 로그인
ADMIN_PASSCODE=관리자접속코드          # /admin 로그인 (staff 권한 포함)
OPENAI_API_KEY=sk-...                 # 선택 — 없으면 템플릿 사유로 동작
OPENAI_MODEL=gpt-4o-mini              # 선택 — 기본값 gpt-4o-mini
```

## 검증

```bash
npx tsx scripts/verify-engine.ts   # 설계서 §7.2 검증 케이스 5건 (5/5 통과 기준)
npx tsx scripts/e2e.ts             # 접수→추천→완료→담당자 리포트 E2E (서버 기동 필요)
```

## 구조

```
prisma/schema.prisma   데이터 모델 (Listing/Consultation/Recommendation/Consent/Video)
src/lib/engine.ts      추천 엔진 — 하드 필터 + 가중치 스코어링 + 템플릿 사유
src/lib/reason.ts      OpenAI 추천 사유 생성 (Structured Outputs, 실패 시 폴백)
src/app/actions.ts     서버 액션 (접수/추천 저장/물량 CRUD)
src/app/consult/       고객 키오스크 (K1~K4)
src/app/staff/         담당자 대시보드·리포트 (S1~S2)
src/app/admin/         물량 관리 (S3)
```

운영 전환 시: SQLite → PostgreSQL(GCP Cloud SQL)로 `prisma/schema.prisma`의 provider 변경 + 어댑터 교체.
