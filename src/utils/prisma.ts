import { PrismaClient } from "../generated/prisma";

// Singleton pattern — satu koneksi database untuk semua
// Kenapa singleton? Kalau buat PrismaClient baru setiap request,
// akan terlalu banyak koneksi terbuka ke database (connection pool overflow)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query"], // Log semua query ke console saat development
  });

// Simpan instance ke global agar tidak buat baru saat hot reload (dev mode)
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
