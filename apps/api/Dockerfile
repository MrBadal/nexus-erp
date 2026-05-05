# syntax=docker/dockerfile:1.6
# Multi-stage build for the NestJS API.

# ─── Stage 1: install workspace deps (uses pnpm via corepack) ───
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --shamefully-hoist --filter @nexus-erp/api... --filter @nexus-erp/utils --filter @nexus-erp/shared-types --filter @nexus-erp/config

# ─── Stage 2: build the API ───
FROM deps AS build
COPY apps/api ./apps/api
COPY packages ./packages
RUN pnpm --filter @nexus-erp/utils build || true \
 && pnpm --filter @nexus-erp/shared-types build || true \
 && pnpm --filter @nexus-erp/config build || true \
 && pnpm --filter @nexus-erp/api build

# ─── Stage 3: minimal runtime ───
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
ENV NODE_ENV=production

# Copy production files
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
# Source needed at runtime for drizzle-kit push (reads schema TS) and `tsx` seed runner.
COPY --from=build /repo/apps/api/src ./src
COPY --from=build /repo/apps/api/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /repo/apps/api/tsconfig.json ./tsconfig.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4000/api/v1/auth/login -O- 2>&1 || exit 0

CMD ["node", "dist/main.js"]
