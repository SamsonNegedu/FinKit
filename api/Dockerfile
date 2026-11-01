# Production node_modules come from the published Dockerfile.deps image when CI passes one (main
# and tags). With no build arg, such as in a pull request or a plain `docker build`, they are
# installed right here, so a PR needs to publish nothing and never uses a stale image.
ARG PRODUCTION_DEPS_IMAGE=local-deps-production

FROM node:26-alpine AS local-deps-production
WORKDIR /app
RUN apk add --no-cache python3 make g++ git
COPY package*.json ./
COPY scripts ./scripts
RUN npm ci --omit=dev
RUN test -f node_modules/better-sqlite3/build/Release/better_sqlite3.node || \
    (echo "ERROR: better-sqlite3 binary not found" && exit 1)

FROM ${PRODUCTION_DEPS_IMAGE} AS deps-production

# ============================================
# Builder stage (devDependencies + compile; do not reuse production-only deps image)
# ============================================
FROM node:26-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY scripts ./scripts

RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN npm run build

# ============================================
# Production stage
# ============================================
FROM node:26-alpine AS production

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create data directory with correct ownership BEFORE switching user
RUN mkdir -p /data && chown nodejs:nodejs /data

# Copy built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Copy production node_modules from deps-production
COPY --from=deps-production --chown=nodejs:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER nodejs

ENV NODE_ENV=production
# Must match EXPOSE and the HEALTHCHECK below (the code's own default is 3003)
ENV PORT=3000
ENV DATA_DIR=/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
