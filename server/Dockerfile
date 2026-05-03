# syntax=docker/dockerfile:1.7

# Base image with Node + tini for proper signal handling.
FROM node:22-alpine AS base
RUN apk add --no-cache tini openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production

# ---------- deps: install full dependency tree (prod + dev) ----------
FROM base AS deps
ENV NODE_ENV=development
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ---------- dev: hot-reload server, source bind-mounted at runtime ----------
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
EXPOSE 8000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "run", "start:dev"]

# ---------- build: compile TypeScript and generate Prisma client ----------
FROM base AS build
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate \
 && npm run build \
 && npm prune --omit=dev

# ---------- production: minimal runtime image ----------
FROM base AS production
ENV NODE_ENV=production \
    PORT=8000
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json
USER nestjs
EXPOSE 8000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/src/main.js"]
