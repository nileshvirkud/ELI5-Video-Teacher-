# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ffmpeg \
    libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Development stage
FROM base AS development
RUN npm ci
COPY . .
RUN npx prisma generate
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    ffmpeg \
    dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S eli5app -u 1001

WORKDIR /app

# Copy built application
COPY --from=build --chown=eli5app:nodejs /app/dist ./dist
COPY --from=build --chown=eli5app:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=eli5app:nodejs /app/package*.json ./
COPY --from=build --chown=eli5app:nodejs /app/prisma ./prisma

# Create directories for temporary files
RUN mkdir -p /app/temp /app/logs && chown -R eli5app:nodejs /app/temp /app/logs

# Switch to non-root user
USER eli5app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node dist/healthcheck.js || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]