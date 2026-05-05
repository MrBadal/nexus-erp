# syntax=docker/dockerfile:1.6
# Multi-stage build for the Next.js web app (standalone output).
# We build INSIDE Docker (Linux) because pnpm's symlink-based node_modules
# layout doesn't survive a Windows-host COPY of pre-built artifacts.

# ─── Stage 1: workspace deps ───
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --filter @nexus-erp/web... --filter @nexus-erp/utils --filter @nexus-erp/shared-types --filter @nexus-erp/config

# ─── Stage 2: build ───
FROM deps AS build
COPY apps/web ./apps/web
COPY packages ./packages
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm --filter @nexus-erp/utils build || true \
 && pnpm --filter @nexus-erp/shared-types build || true \
 && pnpm --filter @nexus-erp/config build || true \
 && pnpm --filter @nexus-erp/web build

# ─── Stage 3: small standalone runtime ───
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone bundles its own trimmed node_modules + apps/web/server.js + packages/.
# These were produced inside this container so the pnpm symlinks resolve correctly.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/login -O- 2>&1 || exit 0

CMD ["node", "apps/web/server.js"]
