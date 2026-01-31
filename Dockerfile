# MeshBeat All-in-One Dockerfile
# Runs Next.js app + PeerJS signaling server in a single container

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY server/package.json ./server/

# Install dependencies for both app and server
RUN npm ci
RUN cd server && npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image, copy all the files and run
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/server ./server
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=builder /app/router.js ./
COPY --from=builder /app/start.sh ./
COPY --from=builder /app/debug-start.sh ./

# Install http-proxy for the router
RUN npm install http-proxy

# Make start scripts executable
RUN chmod +x start.sh debug-start.sh

# Change ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose the main port (proxy will listen here)
EXPOSE 3000

# Start both Next.js and PeerJS via the startup script
CMD ["./start.sh"]
