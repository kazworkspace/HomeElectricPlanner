# ── Stage 1: Build React frontend ──────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /build
COPY frontend/package*.json ./
RUN npm install && rm -rf /root/.npm
COPY frontend/ ./
RUN npm run build
# Output: /build/dist

# ── Stage 2: Production image ───────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./

# Build tools only needed to compile better-sqlite3; removed in the same layer
RUN apk add --no-cache python3 make g++ && \
    npm install --production && \
    apk del python3 make g++ && \
    rm -rf /tmp/* /root/.npm

COPY backend/server.js ./

# Copy pre-built frontend — no Node/Vite needed at runtime
COPY --from=frontend-builder /build/dist ./public

RUN mkdir -p /app/data

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_DIR=/app/data

CMD ["node", "server.js"]
