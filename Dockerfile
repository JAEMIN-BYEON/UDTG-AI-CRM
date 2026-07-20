# 운수대통로지스 상담 AI — Cloud Run 배포용
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# 운영 DB는 PostgreSQL — 스키마 provider 전환 후 클라이언트 생성 (로컬 개발은 sqlite 유지)
# 빌드 단계는 DB에 접속하지 않지만, 어댑터 선택(src/lib/db.ts)이 provider와 일치해야
# 페이지 데이터 수집이 통과하므로 더미 postgres URL을 지정한다 (실제 URL은 런타임 시크릿)
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma \
  && npx prisma generate \
  && npm run build

# ── 실행 이미지 ──────────────────────────────────────────────
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
# 시간 표시 기준: 한국 시간 (코드에서도 Asia/Seoul 명시하지만 이중 안전장치)
ENV TZ=Asia/Seoul
# Prisma CLI(db push)가 libssl을 요구
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/next.config.ts ./next.config.ts

EXPOSE 8080
# 기동 시: 스키마 동기화(db push) → 물량 0건이면 샘플 시드 → 서버 시작
# (시드는 데이터가 있으면 스스로 건너뜀 — prisma/seed.ts / 주의: Prisma 7 db push에는 --skip-generate 없음)
CMD ["sh", "-c", "npx prisma db push && npx tsx prisma/seed.ts && npx next start -p ${PORT}"]
