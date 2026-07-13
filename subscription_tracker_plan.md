# Rencana Implementasi: Task 2 - API Subscription Tracker (Backend)

Berikut adalah langkah-langkah detail untuk menyelesaikan **Task 2: API Subscription Tracker** secara backend-first.

---

## 📋 Checklist Langkah Implementasi

- [ ] **Langkah 1: Modifikasi Skema Database (Prisma)**
  - Menambahkan model `Subscription` di [prisma/schema.prisma](file:///C:/Users/Acer/Desktop/expense-tracker-api/prisma/schema.prisma).
  - Menambahkan relasi `subscriptions` pada model `User`.
  - Menjalankan migrasi database (`npx prisma migrate dev`).
- [ ] **Langkah 2: Buat Skema Validasi Zod**
  - Membuat file `src/schemas/subscription.schema.ts` untuk memvalidasi request body saat menambahkan/mengubah data subscription.
- [ ] **Langkah 3: Buat Controller Subscription**
  - Membuat file `src/controllers/subscription.controller.ts` dengan method CRUD (`createSubscription`, `getSubscriptions`, `deleteSubscription`).
- [ ] **Langkah 4: Buat Routes & Dokumentasi Swagger**
  - Membuat file `src/routes/subscription.routes.ts` untuk memetakan endpoint HTTP ke controller.
  - Melindungi routes menggunakan `authMiddleware`.
  - Menambahkan anotasi Swagger JSDoc.
- [ ] **Langkah 5: Daftarkan Route ke Express App**
  - Mendaftarkan endpoint `/api/subscriptions` di [src/app.ts](file:///C:/Users/Acer/Desktop/expense-tracker-api/src/app.ts).
- [ ] **Langkah 6: Verifikasi & Pengujian**
  - Menjalankan server (`npm run dev`) dan memeriksa Swagger UI di `/docs`.
  - Membuat unit/integration test di folder `tests/` untuk memastikan API berjalan dengan benar.

---

## 🛠️ Detail Teknis & Desain Kode

### 1. Skema Database (Prisma)
Kita akan menambahkan model `Subscription` dengan relasi cascade ke `User`:

```prisma
model Subscription {
  id              String   @id @default(cuid())
  name            String   // Contoh: Netflix, Spotify
  amount          Float    // Jumlah tagihan
  billingCycle    String   // "monthly", "yearly", "weekly"
  nextBillingDate DateTime // Tanggal jatuh tempo berikutnya
  status          String   @default("active") // "active", "cancelled"
  note            String?
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 2. Endpoint API yang Akan Dibuat

Semua endpoint ini memerlukan header `Authorization: Bearer <TOKEN>`:

| Method | Endpoint | Deskripsi | Input Body / Params |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/subscriptions` | Membuat subscription baru | `{ name, amount, billingCycle, nextBillingDate, note? }` |
| **GET** | `/api/subscriptions` | Mengambil semua subscription aktif milik user | - |
| **DELETE** | `/api/subscriptions/:id` | Menghapus/membatalkan subscription berdasarkan ID | `params: { id }` |

---

## 🚀 Perintah yang Akan Dijalankan

Setelah skema didefinisikan, kita perlu menjalankan:
```bash
# Migrasi skema database
npx prisma migrate dev --name add_subscription_model

# Generate prisma client yang baru (biasanya otomatis dipanggil saat migrate)
npx prisma generate
```
