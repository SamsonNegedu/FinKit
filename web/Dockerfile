# ============================================
# Dependencies stage
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# ============================================
# Build stage
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy source code
COPY . .

# Build the application
RUN npm run build
# Fail the image build if either page is missing from the output
RUN test -f dist/index.html && test -f dist/app/index.html

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

# Install the static file server at build time, pinned, so starting the container needs no
# network access (it used to run `npx -y serve`, which downloaded the package on every start).
RUN npm install --prefix /opt/serve --omit=dev --no-audit --no-fund --no-update-notifier serve@14.2.6 \
    && npm cache clean --force

# Copy built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

ENV NODE_ENV=production
# serve checks the npm registry for a newer version on start unless told not to
ENV NO_UPDATE_CHECK=1

# Switch to non-root user
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Routing, security headers and "no directory listings" live in dist/serve.json (from
# public/serve.json). Don't add -s: it puts a catch-all rewrite first, which would send /app/
# to the landing page.
CMD ["/opt/serve/node_modules/.bin/serve", "dist", "-l", "3000", "--no-clipboard"]
