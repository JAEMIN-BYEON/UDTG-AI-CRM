#!/usr/bin/env bash
# 운수대통로지스 상담 AI — GCP Cloud Run 배포 스크립트
# 사전 준비: gcloud CLI 설치 + `gcloud auth login` 완료 (docs/DEPLOY.md 참고)
set -euo pipefail

# ══════════ 여기만 수정하세요 ══════════
PROJECT_ID="${PROJECT_ID:?PROJECT_ID를 지정하세요 (예: PROJECT_ID=my-project ./deploy/deploy.sh)}"
REGION="asia-northeast3"          # 서울
SERVICE="udtg-ai-crm"
DB_INSTANCE="udtg-db"
DB_NAME="udtg"
DB_USER="udtg_app"
# ═════════════════════════════════════

gcloud config set project "$PROJECT_ID"

echo "▶ 1/5 필요한 API 활성화"
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

# Cloud Build 자동 배포 트리거용 이미지 저장소 (없으면 생성)
if ! gcloud artifacts repositories describe udtg --location="$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create udtg --repository-format=docker --location="$REGION"
fi

echo "▶ 2/5 Cloud SQL (PostgreSQL) 인스턴스 준비"
if ! gcloud sql instances describe "$DB_INSTANCE" >/dev/null 2>&1; then
  # edition을 명시하지 않으면 프로젝트에 따라 ENTERPRISE_PLUS가 기본이 되어
  # 공유 코어 tier(db-g1-small)와 충돌한다 → enterprise 고정
  gcloud sql instances create "$DB_INSTANCE" \
    --database-version=POSTGRES_16 --edition=enterprise --tier=db-g1-small \
    --region="$REGION" --storage-size=10GB --storage-auto-increase \
    --backup --backup-start-time=03:00
  gcloud sql databases create "$DB_NAME" --instance="$DB_INSTANCE"
  DB_PASS="$(openssl rand -base64 24 | tr -d '/+=')"
  gcloud sql users create "$DB_USER" --instance="$DB_INSTANCE" --password="$DB_PASS"
  echo "  → DB 사용자 생성 완료. 비밀번호를 안전한 곳에 보관하세요: $DB_PASS"
else
  echo "  → 인스턴스가 이미 있습니다. DB_PASS 환경 변수로 기존 비밀번호를 전달하세요."
  DB_PASS="${DB_PASS:?기존 인스턴스 사용 시 DB_PASS를 지정하세요}"
fi

CONN_NAME="$(gcloud sql instances describe "$DB_INSTANCE" --format='value(connectionName)')"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost/${DB_NAME}?host=/cloudsql/${CONN_NAME}"

echo "▶ 3/5 시크릿 등록 (이미 있으면 새 버전 추가)"
make_secret() {
  local name="$1" value="$2"
  if gcloud secrets describe "$name" >/dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=-
  else
    printf '%s' "$value" | gcloud secrets create "$name" --data-file=-
  fi
}
make_secret "udtg-database-url" "$DATABASE_URL"
make_secret "udtg-auth-secret" "${AUTH_SECRET:-$(openssl rand -hex 32)}"
make_secret "udtg-staff-passcode" "${STAFF_PASSCODE:?STAFF_PASSCODE를 지정하세요 (담당자 접속 코드)}"
make_secret "udtg-admin-passcode" "${ADMIN_PASSCODE:?ADMIN_PASSCODE를 지정하세요 (관리자 접속 코드)}"
if [ -n "${OPENAI_API_KEY:-}" ]; then
  make_secret "udtg-openai-key" "$OPENAI_API_KEY"
  OPENAI_SECRET_FLAG=",OPENAI_API_KEY=udtg-openai-key:latest"
else
  echo "  → OPENAI_API_KEY 미지정: 추천 사유는 템플릿으로 동작합니다."
  OPENAI_SECRET_FLAG=""
fi

# Cloud Run 런타임 서비스 계정에 필수 권한 부여 (시크릿 읽기 + Cloud SQL 접속)
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
for role in roles/secretmanager.secretAccessor roles/cloudsql.client; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="$role" --condition=None >/dev/null
done

echo "▶ 4/5 Cloud Run 배포 (소스에서 빌드)"
gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --add-cloudsql-instances "$CONN_NAME" \
  --set-secrets "DATABASE_URL=udtg-database-url:latest,AUTH_SECRET=udtg-auth-secret:latest,STAFF_PASSCODE=udtg-staff-passcode:latest,ADMIN_PASSCODE=udtg-admin-passcode:latest${OPENAI_SECRET_FLAG}" \
  --set-env-vars "OPENAI_MODEL=${OPENAI_MODEL:-gpt-4o-mini}" \
  --min-instances 0 --max-instances 2 --memory 1Gi

echo "▶ 5/5 완료"
URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
echo ""
echo "════════════════════════════════════════"
echo "배포 완료: $URL"
echo "  고객 키오스크:   $URL/consult"
echo "  담당자:          $URL/staff  (STAFF_PASSCODE로 로그인)"
echo "  물량 관리:       $URL/admin/listings  (ADMIN_PASSCODE로 로그인)"
echo "════════════════════════════════════════"
