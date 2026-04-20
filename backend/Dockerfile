# ============================================================
# backend/Dockerfile — صورة Docker للخادم
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY src/ ./src/

FROM node:20-alpine AS runtime
WORKDIR /app

# مستخدم غير جذري للأمان
RUN addgroup -g 1001 -S nodejs && adduser -S najah -u 1001

# نسخ الملفات من مرحلة البناء
COPY --from=builder --chown=najah:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=najah:nodejs /app/src ./src
COPY --chown=najah:nodejs package.json ./

RUN mkdir -p logs && chown -R najah:nodejs logs
USER najah

EXPOSE 3001

# فحص الصحة
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "src/server.js"]

# ============================================================
# frontend/Dockerfile — صورة Docker للواجهة
# ============================================================
# FROM node:20-alpine AS deps
# WORKDIR /app
# COPY package*.json ./
# RUN npm ci
#
# FROM node:20-alpine AS builder
# WORKDIR /app
# COPY --from=deps /app/node_modules ./node_modules
# COPY . .
# ENV NEXT_TELEMETRY_DISABLED 1
# RUN npm run build
#
# FROM node:20-alpine AS runner
# WORKDIR /app
# ENV NODE_ENV production
# ENV NEXT_TELEMETRY_DISABLED 1
# RUN addgroup --system --gid 1001 nodejs
# RUN adduser  --system --uid 1001 nextjs
# COPY --from=builder /app/public ./public
# COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# USER nextjs
# EXPOSE 3000
# ENV PORT 3000
# CMD ["node", "server.js"]
