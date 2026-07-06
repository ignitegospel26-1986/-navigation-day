# syntax=docker/dockerfile:1

# ── deps: install node_modules from the lockfile ──────────────────────────────
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci

# ── builder: produce the standalone Next server ───────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Real secrets are injected at runtime; these dummies only satisfy build-time
# module init so the build can complete.
ENV AUTH_SECRET=build-only-not-used
ENV GOOGLE_CLIENT_ID=build-only
ENV GOOGLE_CLIENT_SECRET=build-only
RUN npm run build

# ── runner: minimal image that serves the app ────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd -g 1001 nodejs && useradd -m -u 1001 -g nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
