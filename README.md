# Panduan Setup & Menjalankan Project (Expense Tracker API)

Dokumen ini berisi panduan langkah demi langkah untuk meng-clone dan menjalankan project ini di PC atau laptop baru Anda dari awal.

---

## 🛠️ Prasyarat (Prerequisites)

Sebelum memulai, pastikan PC/Laptop baru Anda sudah menginstal tiga tools utama berikut:

1. **Node.js** (Rekomendasi versi 18 ke atas / LTS)
   * Digunakan untuk menjalankan runtime Javascript & backend Express.
2. **Git**
   * Digunakan untuk melakukan clone repository dari GitHub.
3. **Docker Desktop**
   * **Penting:** Digunakan untuk menjalankan database **PostgreSQL** dan server cache **Redis** secara instan di dalam container terisolasi tanpa perlu menginstalnya secara manual di sistem operasi utama Anda.
   * Pastikan aplikasi Docker Desktop sudah dibuka dan berstatus **Running** sebelum melangkah ke tahap selanjutnya.

---

## 🚀 Langkah-Langkah Menjalankan Project

Ikuti langkah-langkah di bawah ini secara berurutan di terminal (Git Bash, Command Prompt, atau PowerShell):

### Langkah 1: Clone Repository
Clone project ini dari GitHub ke direktori lokal PC Anda:
```bash
git clone <URL_REPOSITORY_GITHUB_ANDA>
```
*Catatan: Ganti `<URL_REPOSITORY_GITHUB_ANDA>` dengan link repository GitHub Anda.*

Masuk ke dalam folder project:
```bash
cd expense-tracker-api
```

### Langkah 2: Install Dependencies
Unduh semua library/package Node.js yang tertulis di dalam `package.json`:
```bash
npm install
```

### Langkah 3: Konfigurasi Environment (`.env`)
Salin file template `.env.example` menjadi `.env` baru:
```bash
cp .env.example .env
```
*(Untuk Windows CMD jika perintah di atas tidak berjalan: `copy .env.example .env`)*

Buka file `.env` baru tersebut menggunakan editor (seperti VS Code) dan sesuaikan nilainya. Jika Anda menggunakan Docker bawaan project ini, gunakan konfigurasi berikut:
```env
PORT=3000
NODE_ENV=development

# Database URL PostgreSQL (sesuai konfigurasi docker-compose.yml)
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/expense_tracker?schema=public"

# Kunci JWT untuk Autentikasi (Silakan ubah/sesuaikan)
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_EXPIRES_IN="7d"

# Konfigurasi Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Langkah 4: Jalankan Service Database & Redis (Docker)
Pastikan Docker Desktop sudah menyala di background PC Anda, lalu jalankan perintah:
```bash
docker compose up -d
```
*Perintah ini akan secara otomatis mengunduh (jika belum ada) dan menjalankan image **PostgreSQL** dan **Redis** di background PC Anda pada port default masing-masing (5432 & 6379).*

### Langkah 5: Setup Skema Database (Prisma Migrate & Seed)
Setelah database di dalam Docker menyala, kita perlu membuat tabel-tabel sesuai skema Prisma serta mengisi data awal (seperti data dummy user bawaan):
```bash
# Jalankan migrasi untuk membuat struktur tabel
npx prisma migrate dev

# (Opsional) Jika data dummy tidak otomatis masuk, jalankan perintah seed berikut:
npx prisma db seed
```

### Langkah 6: Jalankan Server Development
Setelah database siap, Anda bisa langsung menjalankan server backend Express:
```bash
npm run dev
```
Server Anda sekarang aktif dan berjalan di `http://localhost:3000`.

---

## 🔄 Mekanisme Alur Kerja (Laptop ⇄ PC)

* **Kode Program (Sinkronisasi via GitHub):**
  * Di **Laptop**: Edit kode ➔ `git add` ➔ `git commit` ➔ `git push` ke GitHub.
  * Di **PC**: Buka terminal project ➔ `git pull origin <nama-branch>` untuk memperbarui kode ke versi terbaru.
* **Isi Database (Lokal Masing-Masing):**
  * Database yang berjalan di Docker Laptop Anda dan Docker PC Anda berdiri sendiri-sendiri secara offline.
  * Data transaksi baru yang Anda buat di laptop tidak akan otomatis muncul di PC. Jika ingin menyamakan isi data, Anda harus melakukan backup/eksport database secara manual atau melakukan input ulang.
