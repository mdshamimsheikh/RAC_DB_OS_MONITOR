# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm install

# Copy source code and config files
COPY . .

# Build application (Vite frontend bundle + esbuild server bundle)
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3030

# Copy package descriptors and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/nodes.json ./nodes.json
COPY --from=builder /app/databases.json ./databases.json

# Expose server port 3030
EXPOSE 3030

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3030/api/health || exit 1

# Start server
CMD ["node", "dist/server.cjs"]
