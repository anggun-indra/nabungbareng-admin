# 🛡️ NabungBareng Admin Portal

[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg)](https://supabase.com/)

> **Portal Administrasi Multi-Grup NabungBareng — Verifikasi Setoran AI OCR, Buku Induk Member & Saldo, Kartu Iuran Digital, Alokasi Pengeluaran Kas, dan Rekonsiliasi Bank.**

---

## 🔗 Akses & Hubungan Repositori (Quick Links)

| Aplikasi | Tautan Live | Repositori GitHub |
|---|---|---|
| 🛡️ **Admin Portal** | [👉 Buka Portal Admin (Live)](https://nabungbareng-admin.web.app) | [GitHub: `nabungbareng-admin`](https://github.com/anggun-indra/nabungbareng-admin) |
| 📱 **Member PWA** | [👉 Buka Aplikasi Member (Live)](https://nabungbareng.web.app) | [GitHub: `nabungbareng-member`](https://github.com/anggun-indra/nabungbareng-member) |

---

## 🌟 Fitur Utama Portal Admin

- 🤖 **Verifikasi Setoran Berbantuan AI OCR**:
  - Ekstraksi otomatis nominal transfer, tanggal transaksi, nama bank/e-wallet, dan nomor referensi dari foto bukti transfer.
  - Verifikasi atomik: update saldo simpanan member dan kas grup dalam satu transaksi aman PostgreSQL.
  - Fitur koreksi nominal manual dan pembatalan (void) setoran aman.
- 👥 **Buku Induk Member & Saldo**:
  - Daftar lengkap status iuran (Lunas, Aktif, Menunggak), saldo tabungan, dan setoran bulan berjalan.
  - **Dua Tombol Aksi per Member**:
    - **`Detail`**: Menampilkan mutasi transaksi lengkap dan riwayat alokasi pengeluaran.
    - **`Kartu Iuran`**: Modal **Kartu Iuran Digital** per anggota dengan navigasi tahun, stempel digital, cetak PDF, dan bagikan WhatsApp.
  - Ekspor Buku Induk ke format CSV.
- 🧾 **Pencatatan & Alokasi Pengeluaran Kas**:
  - Pembagian biaya kegiatan secara adil (rata bagi anggota aktif).
  - Validasi kecukupan saldo sebelum pemotongan saldo atomik.
- ⚖️ **Rekonsiliasi Kas Bank**:
  - Pencocokan saldo rekening bank riil dengan saldo kas di sistem secara berkala.
- 📊 **Pusat Laporan & Audit Trail**:
  - Laporan saldo simpanan member, rekap setoran periode, rekap pengeluaran kas, dan log audit mutasi.
  - Pengaturan link transparansi publik untuk grup.
- 🏢 **Multi-Role & Manajemen Grup (Super Admin)**:
  - Dukungan multi-role (`super_admin`, `group_admin`, `treasurer`).
  - Pembuatan grup baru, logo kustom, dan pengelolaan hak akses bendahara.

---

## 🏗️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite 6
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Backend & Auth**: Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS), Supabase RPC
- **Hosting**: Firebase Hosting

---

## 🚀 Panduan Memulai (Local Development)

### 1. Prasyarat
- Node.js >= 18.x
- Package Manager: `npm`, `pnpm`, atau `yarn`

### 2. Clone Repositori
```bash
git clone https://github.com/anggun-indra/nabungbareng-admin.git
cd nabungbareng-admin
```

### 3. Install Dependensi
```bash
npm install
# atau
pnpm install
```

### 4. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Isi variabel pada `.env.local`:
```env
# Supabase Backend Configuration
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

### 5. Jalankan Server Pengembangan
```bash
npm run dev
# atau
pnpm dev
```
Buka browser di `http://localhost:5174` (atau port yang ditunjuk Vite).

---

## 📦 Panduan Build & Deploy ke Firebase Hosting

### Build untuk Produksi
```bash
npm run build
```

### Deploy ke Firebase Hosting
```bash
npx -y firebase-tools deploy --only hosting:nabungbareng-admin
```

---

## 📖 Panduan Penggunaan Administrator

1. **Masuk ke Portal Admin**:
   - Masukkan email dan password admin yang terdaftar di database Supabase Auth.
   - Sistem akan memvalidasi role admin dan menampilkan grup yang dikelola.
2. **Memverifikasi Setoran Masuk**:
   - Buka menu **Verifikasi Setoran**.
   - Klik baris setoran yang berstatus *Menunggu*.
   - Periksa foto bukti asli di sisi kiri dan saran data AI di sisi kanan.
   - Klik **Setujui & Verifikasi** untuk menambah saldo member dan kas grup secara otomatis.
3. **Melihat & Membagikan Kartu Iuran Member**:
   - Buka menu **Member & Saldo**.
   - Klik tombol **Kartu Iuran** pada anggota yang dituju.
   - Anda dapat melihat kelancaran pembayaran tiap bulan dalam mode list tabel atau kartu, mencetaknya, atau membagikannya ke WhatsApp anggota.
4. **Mencatat Pengeluaran Bersama**:
   - Buka menu **Pengeluaran** ➔ **+ Catat Pengeluaran**.
   - Masukkan deskripsi, nominal, dan pilih anggota yang menanggung biaya.
   - Preview alokasi potongan saldo sebelum mem-posting transaksi.
5. **Mengunduh Laporan Keuangan**:
   - Buka menu **Laporan & Ekspor** untuk mengunduh rekap mutasi dalam format CSV.

---

## 🤝 Kontribusi & Lisensi

Proyek ini bersifat open-source di bawah lisensi [MIT](LICENSE). Kontribusi berupa Pull Request, perbaikan bug, dan masukan fitur baru sangat diterima.

Dibuat dengan ❤️ untuk transparansi keuangan komunitas di Indonesia.
