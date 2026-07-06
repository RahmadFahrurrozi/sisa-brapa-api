import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";
import process from "process";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Mulai seeding database...");

  // 1. Bersihkan database terlebih dahulu
  await prisma.expense.deleteMany();
  await prisma.user.deleteMany();

  // 2. Buat User dummy (ambil dari env agar tidak hardcoded di git)
  const seedName = process.env.SEED_USER_NAME;
  const seedEmail = process.env.SEED_USER_EMAIL;
  const seedPassword = process.env.SEED_USER_PASSWORD;

  if (!seedName || !seedEmail || !seedPassword) {
    throw new Error("Missing seeding environment variables");
  }

  const hashedPassword = await bcrypt.hash(seedPassword, 12);
  const user = await prisma.user.create({
    data: {
      name: seedName,
      email: seedEmail,
      password: hashedPassword,
    },
  });

  console.log(`👤 User dummy berhasil dibuat: ${user.email} (Password: ${seedPassword})`);

  // 3. Buat beberapa data pengeluaran (Expenses) dummy
  const expenses = [
    {
      title: "Makan Siang Nasi Padang",
      amount: 25000,
      category: "food",
      date: new Date("2026-06-01T12:00:00Z"),
      note: "Makan bersama teman kantor",
    },
    {
      title: "Isi Bensin Motor",
      amount: 50000,
      category: "transport",
      date: new Date("2026-06-03T08:30:00Z"),
      note: "Pertamax full tank",
    },
    {
      title: "Nonton Bioskop",
      amount: 45000,
      category: "entertainment",
      date: new Date("2026-06-05T19:00:00Z"),
      note: "Film action terbaru",
    },
    {
      title: "Beli Obat Flu",
      amount: 15000,
      category: "health",
      date: new Date("2026-06-10T15:00:00Z"),
      note: "Apotek Sehat",
    },
    {
      title: "Belanja Bulanan Supermarket",
      amount: 350000,
      category: "other",
      date: new Date("2026-06-12T10:00:00Z"),
      note: "Sabun, mie instan, susu, dll",
    },
    {
      title: "Makan Malam Steak",
      amount: 120000,
      category: "food",
      date: new Date("2026-07-02T20:00:00Z"),
      note: "Rayakan gajian",
    },
  ];

  for (const exp of expenses) {
    const created = await prisma.expense.create({
      data: {
        ...exp,
        userId: user.id,
      },
    });
    console.log(`Pengeluaran berhasil dibuat: ${created.title} (${created.category})`);
  }

  console.log("Seeding selesai dengan sukses!");
}

main()
  .catch((e) => {
    console.error("Terjadi error saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
