# Build stage - uses cached dependencies from Dockerfile.deps
ARG BUILDER_DEPS_IMAGE=builder-deps:latest
ARG PRODUCTION_DEPS_IMAGE=production-deps:latest

FROM ${BUILDER_DEPS_IMAGE} AS deps-builder
FROM ${PRODUCTION_DEPS_IMAGE} AS deps-production

# ============================================
# Builder stage
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy cached node_modules from deps-builder
COPY --from=deps-builder /app/node_modules ./node_modules
COPY --from=deps-builder /app/package*.json ./

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# ============================================
# Production stage
# ============================================
FROM node:20-alpine AS production

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
ENV DATA_DIR=/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
