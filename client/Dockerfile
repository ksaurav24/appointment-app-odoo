# syntax=docker/dockerfile:1.7

# Use the official Bun image for install/build; final stage runs Next on Node.
FROM oven/bun:1-alpine AS base
WORKDIR /app

# ---------- deps: install dependencies via bun (bun.lock is source of truth) ----------
FROM base AS deps
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# ---------- dev: hot-reload Next dev server, source bind-mounted at runtime ----------
FROM base AS dev
ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["bunx", "--bun", "next", "dev", "--turbopack", "--hostname", "0.0.0.0"]

# ---------- build: produce Next standalone output ----------
FROM base AS build
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ---------- production: minimal Node runtime serving the standalone bundle ----------
FROM node:22-alpine AS production
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
