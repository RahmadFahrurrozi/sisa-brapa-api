# Rencana Implementasi: Pengembangan Expense Tracker App

Dokumen ini berisi analisis perbandingan platform (Web vs Mobile), usulan fitur API baru untuk memperkaya UI, serta peta jalan (roadmap) langkah-demi-langkah pengembangan proyek.

---

## 1. Analisis Platform: Mobile (Expo) vs Web (Next.js/React)

Berikut adalah tabel perbandingan untuk membantu menentukan mana yang sebaiknya dikerjakan terlebih dahulu:

| Parameter                 | Web (Next.js/React)                                                                                                                                                 | Mobile (Expo/React Native)                                                                                                                                  |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kelebihan Utama**       | - Proses debug dan styling sangat cepat.<br>- Visualisasi chart (Recharts/Tremor) lebih bervariasi dan responsif.<br>- SEO friendly (jika diperlukan landing page). | - Penggunaan "on-the-go" (catat langsung setelah jajan) jauh lebih praktis.<br>- Akses ke fitur native (kamera untuk scan struk, notifikasi lokal, FaceID). |
| **Kelemahan**             | - Kurang praktis dibuka lewat HP jika tidak di-bookmark/dibuat PWA.                                                                                                 | - Setup emulator/testing di device nyata butuh waktu tambahan.<br>- Pembuatan grafik interaktif di mobile sedikit lebih menantang.                          |
| **Rekomendasi Kecepatan** | **Sangat Cepat** (Siklus iterasi layout & CSS instan)                                                                                                               | **Sedang** (Perlu kompilasi & testing di Expo Go)                                                                                                           |

> [!TIP]
> **Rekomendasi Gua:**
> Mulailah dengan **Web (Next.js)** terlebih dahulu untuk mematangkan desain dashboard, visualisasi data, dan alur integrasi API. Setelah alur data stabil, porting logika React tersebut ke **Mobile (Expo)** akan jauh lebih mudah karena konsep state management dan hook-nya hampir 100% mirip.

---

## 2. Rincian Fitur API Baru untuk Backend

Agar frontend terlihat premium dan kaya data, kita akan mengimplementasikan 4 fitur backend berikut sebelum masuk ke frontend:

### A. Analytics Comparison (Perbandingan Tren Bulanan)

- **Deskripsi:** Membandingkan total pengeluaran bulan ini (s.d hari ini) dengan bulan lalu pada rentang tanggal yang sama.
- **Database Schema:** Tidak memerlukan perubahan skema database.
- **Endpoint:** `GET /api/analytics/comparison`

### B. Budget Alerts (Peringatan Batas Anggaran)

- **Deskripsi:** Mengembalikan daftar kategori anggaran (budget) yang pengeluarannya sudah mencapai atau melebihi batas tertentu (misalnya >= 80% atau >= 100%).
- **Database Schema:** Tidak memerlukan perubahan skema database (menggunakan tabel `Budget` dan `Expense` yang sudah ada).
- **Endpoint:** `GET /api/budgets/alerts`
- **Response Contoh:**
  ```json
  {
    "status": 200,
    "data": [
      {
        "category": "food",
        "budgetAmount": 1000000,
        "spent": 850000,
        "percentage": 85.0,
        "remaining": 150000,
        "message": "Pengeluaran untuk kategori 'food' sudah mencapai 85% dari anggaran bulanan Anda!",
        "level": "warning" // "warning" jika >= 80%, "danger" jika >= 100%
      }
    ]
  }
  ```

### C. Subscription Tracker (Tagihan Berulang)

- **Deskripsi:** Melacak tagihan berkala (Netflix, Spotify, Gym, dll) beserta tanggal jatuh temponya.
- **Database Schema:**
  - Membuat model `Subscription` baru di Prisma.
- **Endpoint:**
  - `POST /api/subscriptions` (Create subscription)
  - `GET /api/subscriptions` (List active subscriptions)
  - `DELETE /api/subscriptions/:id` (Cancel/delete subscription)

### D. Goal & Saving Heatmap (GitHub Contribution Style)

- **Deskripsi:** Menetapkan tujuan finansial (nabung) dan melacak histori setoran menabung secara konsisten untuk dijadikan grafik heatmap di frontend.
- **Database Schema:**
  - Membuat model `Goal` (Tujuan tabungan).
  - Membuat model `SavingLog` (Catatan riwayat menabung / kontribusi harian).
- **Endpoint:**
  - `POST /api/goals` (Buat target baru)
  - `POST /api/goals/:id/savings` (Setor tabungan)
  - `GET /api/goals/contributions` (Ambil data kontribusi menabung harian untuk grafik ala GitHub)

---

## 3. Peta Jalan Pengembangan Backend (Roadmap Backend First)

Kita akan fokus menyelesaikan seluruh fungsionalitas backend terlebih dahulu agar API kita siap dikonsumsi oleh frontend apa pun.

### Fase 1: Pembuatan Fitur API (Berurutan)

1. **Langkah 1: Analytics Comparison & Budget Alerts** (Tanpa ubah skema db, murni logika API & query database)
2. **Langkah 2: Subscription Tracker** (Membuat skema baru `Subscription`)
3. **Langkah 3: Goals & Savings Heatmap** (Membuat skema `Goal` & `SavingLog` + logika agregasi heatmap harian)

### Fase 2: Integrasi & Deploy Backend

- [ ] Pastikan seluruh endpoint terdokumentasi di Swagger.
- [ ] Jalankan unit & integration test untuk seluruh fitur baru untuk menjamin bebas bug.

---

> [!IMPORTANT]
> **Mari kita mulai dengan Langkah 1: Analytics Comparison & Budget Alerts!**
