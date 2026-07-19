// Set environment variable DATABASE_URL untuk test database secara otomatis
const testDbUrl = process.env.DATABASE_URL_TEST;
if (!testDbUrl) {
  throw new Error(
    "DATABASE_URL_TEST tidak ditemukan di environment variables! Harap tambahkan di file .env lokal Anda.",
  );
}
process.env.DATABASE_URL = testDbUrl;

import { PrismaClient } from "../src/generated/prisma";
import { afterAll, beforeEach } from "vitest";

const prisma = new PrismaClient();

// Bersihkan database test sebelum setiap test dijalankan
beforeEach(async () => {
  try {
    await prisma.budget.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.savingLog.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.income.deleteMany();
    await prisma.incomeTarget.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
  } catch (err) {
    console.error("Gagal membersihkan database test:", err);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
