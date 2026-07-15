# Panduan Deploy & Migrasi: Neon + Vercel + Upstash

Dokumen ini berisi panduan lengkap langkah-demi-langkah (*step-by-step*) untuk mendeploy backend **Expense Tracker API** secara gratis menggunakan database **Neon (PostgreSQL)**, **Upstash (Redis)**, dan **Vercel (Express Serverless)**.

---

## 1. Migrasi Database PostgreSQL ke Neon (Gratis & Tanpa Kartu)

### Langkah A: Buat Database di Neon.tech
1.  Buka **[Neon.tech](https://neon.tech/)** dan daftar/masuk menggunakan akun **GitHub** Anda.
2.  Klik tombol **Create a Project**.
3.  Konfigurasikan database:
    *   **Project Name:** `expense-tracker-db`
    *   **Region:** Pilih **Singapore (ap-southeast-1)** agar dekat dengan server aplikasi Vercel.
    *   **Postgres Version:** Gunakan versi default (misal: 16).
4.  Klik **Create Project**.
5.  Setelah selesai, salin URL koneksi database yang bertipe **`postgresql://...`** (biasanya diakhiri dengan `sslmode=require`).

### Langkah B: Sinkronisasi Skema Database Lokal ke Neon
Agar database awan Neon Anda memiliki tabel-tabel yang dibutuhkan (`User`, `Expense`, `Budget`, `Goal`, `SavingLog`, `Subscription`), jalankan perintah ini dari komputer Anda:

1.  Buka file `.env` di komputer lokal Anda.
2.  Ubah sementara nilai `DATABASE_URL` menggunakan URL koneksi dari **Neon** yang baru saja Anda salin:
    ```env
    DATABASE_URL="postgresql://neondb_owner:password@ep-host.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    ```
3.  Jalankan perintah migrasi ini di terminal komputer lokal Anda:
    ```bash
    npx prisma migrate deploy
    ```
4.  **Penting:** Setelah proses migrasi selesai, kembalikan kembali nilai `DATABASE_URL` lokal Anda ke database localhost/dev agar tidak mengganggu database production saat melakukan coding dev di komputer.

---

## 2. Setup Redis Database di Upstash (Gratis & Tanpa Kartu)

1.  Masuk ke **[Upstash Console](https://console.upstash.com/)** menggunakan akun **GitHub** Anda.
2.  Di tab **Redis**, klik **Create Database**.
3.  Isi konfigurasi:
    *   **Name:** `expense-tracker-redis`
    *   **Type:** `Single`
    *   **Region:** Pilih **ap-southeast-1 (Singapore)**.
4.  Klik **Create**.
5.  Setelah database aktif, scroll ke bawah ke bagian **Connect to your database**.
6.  Klik tab **Node.js** atau cari variabel **`REDIS_URL`** yang berformat **`rediss://...`** (dua huruf 's' menandakan SSL/TLS aktif).
7.  Salin seluruh URL tersebut (Format: `rediss://default:password@host:port`).

---

## 3. Deploy Express Server ke Vercel (Gratis & Tanpa Kartu)

### Langkah A: Konfigurasi Project
Semua berkas konfigurasi Vercel (`vercel.json` dan script `vercel-build` di `package.json`) telah disediakan di dalam repositori ini.

### Langkah B: Jalankan Deployment di Vercel Dashboard
1.  Buka **[Vercel Dashboard](https://vercel.com/)** dan masuk menggunakan akun **GitHub** Anda.
2.  Klik tombol **Add New > Project**.
3.  Pilih repositori **`expense-tracker-api`** dan klik **Import**.
4.  Konfigurasikan setingan proyek:
    *   **Framework Preset:** Pilih **Other** (Vercel otomatis mengenali konfigurasi project Node.js Express).
    *   **Build Command:** Vercel otomatis menjalankan `npm run vercel-build` (membuat Prisma client dan melakukan compile TypeScript).
5.  Buka tab **Environment Variables** dan tambahkan 5 kunci rahasia ini:
    *   `NODE_ENV` = `production`
    *   `DATABASE_URL` = (Isi dengan URL database PostgreSQL dari **Neon** di Langkah 1)
    *   `REDIS_URL` = (Isi dengan URL Redis dari **Upstash** di Langkah 2)
    *   `JWT_SECRET` = (Buat string acak yang panjang & kuat sebagai pengaman Access Token)
    *   `JWT_REFRESH_SECRET` = (Buat string acak panjang lainnya sebagai pengaman Refresh Token)
6.  Klik tombol **Deploy**.

---

## 4. Cara Uji Coba Deployment Lu
Setelah Vercel selesai men-deploy (biasanya memakan waktu 1–2 menit), Vercel akan memberikan domain publik gratis (misal: `https://expense-tracker-api.vercel.app`). 

Anda dapat menguji apakah API online Anda sudah bekerja dengan mengakses:
1.  **Welcome Page:** `https://your-app-domain.vercel.app/`
2.  **Health Status:** `https://your-app-domain.vercel.app/health`
3.  **Dokumentasi Swagger:** `https://your-app-domain.vercel.app/docs` (Dokumentasi API lengkap untuk dicoba langsung via web).
