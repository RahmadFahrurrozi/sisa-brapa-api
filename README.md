# Expense Tracker API

**Expense Tracker API** adalah solusi backend modern berbasis RESTful API yang dirancang khusus untuk mempermudah pencatatan, pelacakan, dan pengelolaan keuangan pribadi secara komprehensif. Dibangun menggunakan arsitektur yang tangguh, aman, dan performa tinggi, sistem ini membantu pengguna mengontrol pengeluaran harian, merencanakan anggaran bulanan, melacak tagihan berlangganan, serta memonitor target tabungan masa depan.

---

## Fitur Utama (Core Features)

Sistem ini menyediakan serangkaian fitur manajemen keuangan canggih yang saling terintegrasi:

### 1. Autentikasi & Keamanan Tingkat Tinggi (Auth & Security)
* **JWT & Refresh Token**: Sistem keamanan ganda menggunakan Access Token berdurasi pendek dan Refresh Token untuk pembaruan sesi secara aman.
* **Token Blacklisting**: Integrasi dengan Redis untuk memasukkan token yang telah *logout* ke dalam daftar hitam (*blacklist*) dengan waktu kadaluarsa otomatis (*TTL*).
* **Rate Limiting**: Perlindungan terhadap serangan *brute force* dan *DDoS* dengan membatasi jumlah request per menit secara global serta pembatasan khusus pada *endpoint* krusial (login & register).
* **Helmet & CORS**: Optimasi keamanan HTTP header dan pengaturan kebijakan akses lintas domain (*cross-origin*).

### 2. Manajemen Pengeluaran Fleksibel (Expense Management)
* Operasi CRUD (*Create, Read, Update, Delete*) transaksi pengeluaran.
* Setiap pengeluaran dicatat dengan detail judul, nominal, kategori (seperti *food*, *transport*, *utilities*, dll), tanggal transaksi, serta catatan opsional.
* Query database yang dioptimalkan dengan indeks relasional untuk performa pencarian yang cepat berdasarkan kategori dan rentang tanggal.

### 3. Anggaran Bulanan Pintar (Smart Budgeting)
* Pengaturan anggaran maksimum (*limit*) bulanan, baik untuk kategori spesifik maupun untuk seluruh pengeluaran (*all category*).
* Sistem pencegahan redudansi yang memastikan hanya ada satu budget aktif per kategori di setiap bulan dan tahun tertentu.
* Membantu membatasi pengeluaran agar pengguna tidak melampaui batas finansial yang ditentukan.

### 4. Pelacak Layanan Berlangganan (Subscription & Recurring Bills)
* Manajemen siklus pengeluaran berulang (seperti Netflix, Spotify, Gemini, dll).
* Mendukung siklus penagihan bervariasi: mingguan (*weekly*), bulanan (*monthly*), atau tahunan (*yearly*).
* Pemantauan tanggal jatuh tempo berikutnya secara presisi dan sistem status otomatis (*active*, *pending*, *cancelled*, *expired*) berdasarkan tanggal saat ini.

### 5. Target Finansial & Log Tabungan (Financial Goals & Savings Tracker)
* Pembuatan rencana target tabungan jangka panjang (contoh: "Dana Darurat" atau "Beli Laptop Baru") lengkap dengan target nominal, akumulasi saldo saat ini, dan tenggat waktu (*deadline*).
* Setiap penambahan saldo dicatat dalam **Saving Log** terperinci yang terhubung langsung ke target tabungan spesifik milik pengguna.

### 6. Mesin Ekspor Data (Data Export Engine)
* **Excel Export**: Mengunduh seluruh riwayat pengeluaran dalam format spreadsheet `.xlsx` terstruktur.
* **PDF Report**: Menghasilkan dokumen laporan keuangan `.pdf` formal yang rapi lengkap dengan kalkulasi *grand total* dan layout tabel otomatis yang mendukung halaman dinamis (*multi-page auto layout*).

### 7. Analitik Keuangan & Tren (Financial Analytics & Insights)
* **Kalkulasi Sebaran Kategori**: Menghitung persentase sebaran pengeluaran per kategori secara dinamis.
* **Tren Waktu Dinamis**: Pengelompokan tren pengeluaran secara harian atau bulanan sesuai rentang waktu pencarian (Hari Ini, 7 Hari, 30 Hari, 6 Bulan, hingga Custom Range).
* **Month-over-Month (MoM) Comparison**: Membandingkan total pengeluaran bulan ini dengan bulan lalu pada tanggal yang sama untuk menganalisis efisiensi keuangan (apakah berstatus *saving* atau *wasting*).

---

## Arsitektur & Teknologi (Tech Stack)

Aplikasi ini dikembangkan dengan teknologi modern demi performa, keamanan, dan skalabilitas terbaik:

* **Runtime & Language**: [Node.js](https://nodejs.org/) & [TypeScript](https://www.typescriptlang.org/) untuk kode yang terstruktur dan aman (*type-safe*).
* **Framework**: [Express.js](https://expressjs.com/) sebagai engine REST API yang ringan dan fleksibel.
* **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) sebagai database relasional utama, diakses melalui [Prisma ORM](https://www.prisma.io/) untuk penulisan kueri database yang efisien dan migrasi skema yang handal.
* **Caching & Security Store**: [Redis](https://redis.io/) untuk media penyimpanan cepat *blacklist token* dan *caching* kueri ringkasan pengeluaran guna meminimalkan beban database.
* **API Documentation**: [Swagger UI / OpenAPI 3.0](https://swagger.io/) untuk dokumentasi API interaktif yang mudah dipahami dan diuji coba secara langsung.
* **Validation**: [Zod](https://zod.dev/) untuk validasi skema data masukan dari client guna mencegah data kotor masuk ke sistem.
* **Deployment Friendly**: Dikonfigurasi agar mudah di-deploy ke platform *serverless* seperti [Vercel](https://vercel.com/) dengan integrasi database *cloud* [Neon (PostgreSQL)](https://neon.tech/) dan [Upstash (Redis)](https://upstash.com/).

---

## Desain Skema Database (Database Schema)

Relasi antar tabel database dirancang secara efisien dengan skema relasional berikut (dapat dilihat di [prisma/schema.prisma](prisma/schema.prisma)):

* **User**: Tabel utama yang menyimpan kredensial pengguna, profil, dan token penyegar (*refresh token*). Satu pengguna memiliki relasi *one-to-many* ke tabel-tabel berikut:
  * **Expense**: Riwayat transaksi pengeluaran.
  * **Budget**: Batasan anggaran keuangan bulanan.
  * **Subscription**: Daftar layanan berlangganan.
  * **Goal**: Rencana target tabungan keuangan.
  * **SavingLog**: Riwayat setoran untuk pencapaian target tabungan (juga berelasi ke **Goal**).

---

## Struktur Endpoint API (API Endpoints Structure)

API didesain dengan mengikuti prinsip RESTful konvensional yang bersih. Dokumentasi interaktif dapat diakses langsung melalui endpoint `/docs` saat server berjalan.

| Prefix Router | Fungsi Utama |
|---|---|
| `/api/auth` | Registrasi, Login, Refresh Token, dan Logout (Keamanan Token) |
| `/api/expenses` | Pencatatan, Pembaruan, Penghapusan, Ekspor (PDF/Excel), serta Analitik Tren Pengeluaran |
| `/api/budgets` | Pembuatan batas anggaran bulanan per kategori dan pemantauan limit anggaran |
| `/api/subscriptions` | Pengelolaan tagihan langganan berkala beserta pelacakan tanggal jatuh tempo |
| `/api/goals` | Perekaman target tabungan finansial dan log transaksi setoran |

---

