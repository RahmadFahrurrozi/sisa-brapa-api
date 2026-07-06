# ─── Stage 1: Build ───────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Salin schema prisma dan generate client agar compiler TS tidak error tipe data
COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ─── Stage 2: Production ──────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
# Hanya install production dependencies (exclude devDependencies)
RUN npm ci --only=production

# Salin hasil compile JS dari stage build
COPY --from=build /app/dist ./dist

# Salin schema prisma dan generate client untuk production runtime
COPY prisma ./prisma
RUN npx prisma generate

# Dokumentasikan port yang digunakan
EXPOSE 3000

# Jalankan server
CMD ["node", "dist/index.js"]
