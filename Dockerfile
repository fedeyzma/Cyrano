# syntax=docker/dockerfile:1

# ---- deps: install node_modules from the lockfile ----
FROM node:25-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder: produce the standalone Next.js output ----
FROM node:25-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: minimal image that serves the app ----
FROM node:25-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# node:sqlite is experimental; the flag is accepted on 24/25 and required on 24.
ENV NODE_OPTIONS=--experimental-sqlite
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PATH=/data/cyrano.db

# Writable directory for the SQLite database (mounted as a volume).
RUN mkdir -p /data && chown -R node:node /data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Personal context. The glob always matches the committed example, and also
# picks up fred_context.md when present — so the build never fails either way.
COPY --chown=node:node fred_context*.md ./

USER node
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "server.js"]
