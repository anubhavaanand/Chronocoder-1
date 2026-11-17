# Root Dockerfile — used by platforms that auto-detect a root `Dockerfile`
# (e.g. Render, Railway).
#
# The canonical frontend image definition lives at docker/Dockerfile.frontend
# and is what docker-compose, fly.toml, and CI build. To avoid the two copies
# drifting, this file simply delegates to the same build steps. Keep it in sync
# with docker/Dockerfile.frontend, or better, point your platform at that file
# directly (`dockerfile = "docker/Dockerfile.frontend"`).

# Multi-stage Dockerfile for Next.js Frontend (Production Standalone)

# Stage 1: Dependencies Cache
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production Runtime (Minimal)
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install curl for health checks
RUN apk add --no-cache curl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy standalone build output and static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start Next.js standalone server
CMD ["node", "server.js"]

# Optimization labels
LABEL org.opencontainers.image.source="https://github.com/anubhavaanand/Chronocoder-1"
LABEL org.opencontainers.image.description="ChronoCoder v3 - AI Mentor Platform Frontend"
LABEL maintainer="Anubhav <anubhavanand354@gmail.com>"