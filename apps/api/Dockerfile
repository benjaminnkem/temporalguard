# syntax=docker/dockerfile:1

# Multi-stage build for TemporalGuard NestJS API (pnpm monorepo)
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# ---------------------------------------------------------------------------
# Install workspace dependencies
# ---------------------------------------------------------------------------
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile --filter=api...

# ---------------------------------------------------------------------------
# Build the API
# ---------------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api ./apps/api
COPY packages ./packages
RUN pnpm --filter api build

# ---------------------------------------------------------------------------
# Production runtime
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime
RUN apk add --no-cache wget \
  && addgroup -S temporalguard \
  && adduser -S temporalguard -G temporalguard
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# pnpm hoist layout: keep workspace node_modules for runtime resolution
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/package.json ./package.json

WORKDIR /app/apps/api
USER temporalguard
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD wget --spider -q http://localhost:3000/api/health || exit 1

CMD ["node", "dist/main.js"]
