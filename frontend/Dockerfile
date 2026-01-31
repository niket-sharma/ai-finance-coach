FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production 2>/dev/null || npm install --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public 2>/dev/null || true
COPY --from=builder /app/.next/standalone ./ 2>/dev/null || true
COPY --from=builder /app/.next/static .next/static 2>/dev/null || true
COPY --from=builder /app/.next .next

# Fallback: if standalone not available, copy node_modules
COPY --from=builder /app/node_modules ./node_modules 2>/dev/null || true
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["npx", "next", "start"]
