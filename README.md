# 📊 Telkom Regional 3 - SSGS Dashboard

[![Laravel](https://img.shields.io/badge/Laravel-13-red?logo=laravel)](https://laravel.com/)
[![PHP](https://img.shields.io/badge/PHP-8.3+-777bb4?logo=php)](https://www.php.net/)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0.0-purple?logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Status](https://img.shields.io/badge/Status-Active_Development-success)]()

Dashboard monitoring performa, koordinasi agenda, dan evaluasi operasional unit **Strategic / Shared Service & Governance Support (SSGS) Telkom Regional 3**. Aplikasi web ini dirancang untuk memantau indikator kinerja utama (KPI), progres tindak lanjut agenda lintas Witel & Unit In Charge (UIC), analisis posisi kuadran, serta tracking Evaluasi Data Kinerja (EDK) secara terintegrasi.

Proyek terdiri dari dua aplikasi:

| Folder | Isi |
|---|---|
| `telkom-api/` | **Backend** Laravel 13 (REST API, autentikasi token Sanctum, import/export Excel EDK, audit log) |
| `telkom/` | **Frontend** React 19 + Vite 6 (SPA dashboard) |

---

## 📑 Daftar Isi

- [Tentang Proyek](#-tentang-proyek)
- [Fitur Utama](#-fitur-utama)
- [Teknologi & Dependensi](#-teknologi--dependensi)
- [Struktur Direktori](#-struktur-direktori)
- [Panduan Instalasi](#-panduan-instalasi)
  - [Prasyarat Sistem](#prasyarat-sistem)
  - [1. Clone Repositori](#1-clone-repositori)
  - [2. Setup Backend (Laravel)](#2-setup-backend-laravel)
  - [3. Setup Frontend (React + Vite)](#3-setup-frontend-react--vite)
  - [4. Login Pertama Kali](#4-login-pertama-kali)
- [Panduan Penggunaan](#-panduan-penggunaan)
- [Format File Upload EDK](#-format-file-upload-edk)
- [Hak Akses (Role)](#-hak-akses-role)
- [Daftar Endpoint API](#-daftar-endpoint-api)
- [Skrip & Perintah yang Tersedia](#-skrip--perintah-yang-tersedia)
- [Menjalankan Test](#-menjalankan-test)
- [Troubleshooting](#-troubleshooting)
- [Kontribusi & Lisensi](#-kontribusi--lisensi)

---

## 🏢 Tentang Proyek

Dashboard ini dikembangkan untuk mempermudah monitoring dan pengambilan keputusan manajemen di lingkungan **Telkom Regional 3**. Dengan integrasi visualisasi data yang responsif, manajemen dan tim operasional dapat:

1. **Memantau Agenda & Isu Operasional**: Mengetahui progres follow-up agenda di setiap Witel (Bali, Yogyakarta, Suramadu, Semarang, Jatim Barat, Solo) dan Unit (RLEGS, RSMES, RSO 1, BPPLP, RSO 2, SSGS).
2. **Evaluasi Data Kinerja (EDK)**: Upload report EDK mingguan (1 file Excel), lalu seluruh tabel per Segmen, Periode EDK, Nama AM, dan Top 10 Pelanggan terisi otomatis dari database.
3. **Analisis Kuadran Portofolio**: Memetakan tren pergerakan kinerja (*Kuadran Moving*), pencapaian target, dan performa segmen secara analitis.
4. **Dukungan Kebutuhan (Support Needed)**: Mengawal eskalasi kebutuhan lintas fungsi agar setiap hambatan operasional terselesaikan tepat waktu.

> **Catatan:** Modul **EDK Monitoring** sudah terhubung penuh ke backend Laravel. Modul lain (Dashboard, Kuadran, Support Needed, Monitoring Order SJT) saat ini masih memakai data statis di `telkom/src/data/`.

---

## 🚀 Fitur Utama

### 1. 🔐 Login & Hak Akses
- Login menggunakan **email Telkom atau NIK** + kata sandi (token **Laravel Sanctum**).
- Sesi 12 jam, atau 30 hari bila mencentang *"Ingat sesi saya"*.
- Dua role: **admin** (boleh upload & rollback) dan **viewer** (hanya melihat, export, dan copy).
- Semua halaman dashboard wajib login; token kedaluwarsa otomatis diarahkan kembali ke halaman login.

### 2. 📌 Executive Overview (`/dashboard`)
- **Hierarki Eksekusi Agenda & Follow Up**: Kartu status ringkasan (Total Agenda, Pending/Not Yet, On Progress, Done).
- **Distribusi Kinerja per Witel**: Grafik perbandingan aktivitas dan beban isu pada masing-masing Witel.
- **Unit In Charge (UIC) Breakdown**: Distribusi PIC unit pelaksana tindak lanjut.
- **Log Agenda & Filter Dinamis**: Pencarian kata kunci dan filter status agenda secara langsung.
- **Ekspor Laporan**: Dukungan ekspor ringkasan laporan agenda ke format `.csv`.

### 3. 📋 EDK Monitoring (`/edk-monitoring`)
- **Upload Report Mingguan**: Upload 1 file `.xlsx` → divalidasi per baris → disimpan sebagai *snapshot* baru dan langsung aktif.
  - Validasi *all-or-nothing*: jika ada baris dengan format salah, upload ditolak dan daftar error per nomor baris ditampilkan.
  - Sel kosong tetap diterima (ditampilkan sebagai `(Kosong)`).
- **4 Tampilan Tabel**: *Segmen*, *Periode EDK* (dengan bucket `< tahun`), *Nama AM* (dengan subtotal per segmen), dan *Nama CC* (Top 10 Pelanggan per segmen).
- **Kolom Kategori**: Lanjut (Complete / In Progress), Tidak Lanjut (Complete / In Progress), Konfirmasi AM (Auto Renewal / In Progress), Bukan Witel Solo JT, dan Total EDK — masing-masing jumlah Order dan Abonemen (Rp).
- **Kartu KPI**: Total Order, Total Abonemen (dengan persentase perubahan vs upload sebelumnya), In Progress, dan Complete.
- **Filter Multi-Pilih**: Periode, Segmen, Nama AM, dan Flagging (Baru / Berubah / Tidak Berubah vs upload sebelumnya). Filter tersimpan di URL sehingga bisa dibagikan.
- **Riwayat Upload & Rollback**: Lihat snapshot lama, aktifkan kembali snapshot sebelumnya jika terjadi salah upload.
- **Log Aktivitas (Audit Log)**: Mencatat login, upload, upload gagal, rollback, dan export (admin).
- **Export & Bagikan**: Export `.xlsx` (sheet *Ringkasan* + *Detail*) atau `.csv`, Copy as Table, Copy as Picture, dan Copy Report Link (terkunci ke snapshot yang sedang dilihat).

### 4. 🧭 Analisis Kuadran (`/kuadran/:view`)
- **Multi-Perspektif Analisis**:
  - `Kuadran Moving`: Pergerakan kuadran target vs realisasi.
  - `Witel Performance`: Posisi kuadran kinerja Witel.
  - `Telda Performance`: Analisis performa unit Telda.
  - `Segment Performance`: Evaluasi kuadran per segmen pelanggan (Enterprise, Government, Business, dll.).
- **Matriks Visual 4-Kuadran**: Pemetaan posisi kinerja dengan kartu interaktif dan Grand Total summary.
- **Share & Export**: Fitur salin tautan visualisasi dan ekspor matriks.

### 5. 🤝 Support Needed Tracker (`/support-needed`)
- **Agenda Koordinasi & Dukungan**: Monitoring kebutuhan dukungan teknis dan operasional.
- **Status Metrik**: Tracking status Open, Need Discuss, On Progress, dan Done beserta persentasenya.
- **Matriks Rekapitulasi**: Pemetaan isu per unit pelaksana untuk mempercepat eskalasi keputusan.
- **Ekspor Laporan**: Unduh berkas rekapitulasi follow-up support ke format CSV.

### 6. 🎨 Desain Modern & Responsif
- Identitas warna korporat Telkom Indonesia (`#083E9E`, `#2563EB`).
- Sidebar navigasi dengan mode kolaps (expand/collapse) dan submenu bersarang (*nested accordion*).
- Indikator badge status dan tipografi modern dengan font **Inter**.

---

## 🛠 Teknologi & Dependensi

### Backend (`telkom-api/`)

| Kategori | Teknologi | Deskripsi |
|---|---|---|
| **Framework** | [Laravel 13](https://laravel.com/) | REST API |
| **Bahasa** | PHP 8.3+ | |
| **Database** | MySQL 8 / MariaDB 10.6+ | Penyimpanan snapshot & data EDK |
| **Autentikasi** | [Laravel Sanctum](https://laravel.com/docs/sanctum) | Token API (Bearer) |
| **Excel** | [PhpSpreadsheet](https://phpspreadsheet.readthedocs.io/) via [maatwebsite/excel](https://laravel-excel.com/) | Membaca file upload & membuat file export |
| **Testing** | PHPUnit + SQLite in-memory | Feature test API |

### Frontend (`telkom/`)

| Kategori | Teknologi | Deskripsi |
|---|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) | Library utama untuk UI komponen |
| **Build Tool & Bundler** | [Vite 6](https://vitejs.dev/) | Dev server super cepat dan bundler produksi |
| **Routing** | [React Router DOM v7](https://reactrouter.com/) | Manajemen rute dan navigasi SPA |
| **Data Fetching** | [TanStack Query v5](https://tanstack.com/query) | Cache & sinkronisasi data API |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Utilitas styling modern dan responsif |
| **Iconography** | [Lucide React](https://lucide.dev/) | Koleksi ikon SVG modern dan konsisten |
| **Table Engine** | [@tanstack/react-table v8](https://tanstack.com/table) | Pemrosesan tabel headless |
| **Visualisasi Data** | [Recharts v2](https://recharts.org/) | Diagram dan grafik statistik interaktif |
| **State Management** | [Zustand v5](https://zustand.docs.pmnd.rs/) | State management ringan dan efisien |
| **Dokumen & Ekspor** | `jspdf`, `html2canvas` | Pembuatan PDF dan screenshot (Copy as Picture) |

---

## 📂 Struktur Direktori

```text
telkom-ssgsdashboard/
├── README.md                          # Dokumentasi utama proyek
│
├── telkom-api/                        # ── BACKEND (Laravel 13) ──
│   ├── app/
│   │   ├── Exceptions/
│   │   │   └── EdkImportException.php # Response 422 berisi error per baris
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── AuthController.php       # Login, me, logout
│   │   │   │   ├── AuditLogController.php   # Daftar log aktivitas (admin)
│   │   │   │   └── Edk/
│   │   │   │       ├── EdkUploadController.php  # Upload, riwayat, rollback, template
│   │   │   │       ├── EdkSummaryController.php # Summary, cards, options, top-customers
│   │   │   │       └── EdkExportController.php  # Export xlsx/csv
│   │   │   ├── Middleware/
│   │   │   │   └── EnsureRole.php     # Middleware role:admin
│   │   │   └── Requests/
│   │   │       └── EdkFilterRequest.php # Filter bersama semua endpoint EDK
│   │   ├── Models/                    # User, EdkUpload, EdkRecord, AuditLog
│   │   ├── Services/Edk/
│   │   │   ├── EdkImporter.php        # Baca, validasi, simpan file Excel
│   │   │   ├── EdkSummaryService.php  # Query agregasi 4 tab + cards
│   │   │   └── EdkExporter.php        # Generate file export
│   │   └── Support/
│   │       └── Audit.php              # Helper pencatatan audit log
│   ├── bootstrap/app.php              # Registrasi middleware alias "role"
│   ├── database/
│   │   ├── migrations/                # Skema tabel users, edk_uploads, edk_records, audit_logs
│   │   └── seeders/EdkUserSeeder.php  # Membuat akun admin pertama
│   ├── resources/templates/
│   │   └── Template_Import_EDK_Monitoring.xlsx  # File template upload
│   ├── routes/api.php                 # Definisi endpoint API
│   └── tests/Feature/                 # Test API (EDK, Auth, AuditLog)
│
└── telkom/                            # ── FRONTEND (React + Vite) ──
    ├── public/                        # Aset statis publik (logo, gambar, favicon)
    ├── src/
    │   ├── components/                # Komponen UI modular
    │   │   ├── Layout.jsx             # Shell layout utama, sidebar, topbar, logout
    │   │   ├── FilterDropdown.jsx     # Dropdown filter multi-pilih
    │   │   ├── ShareDropdown.jsx      # Copy as Picture / Table / Report Link
    │   │   ├── Quadrant.jsx           # Komponen visualisasi grid 4-kuadran
    │   │   └── ui.jsx                 # UI primitives (KpiCard, PageHeader, ExportButton, dll.)
    │   ├── context/ThemeContext.jsx   # Tema aplikasi
    │   ├── data/                      # Data statis modul non-EDK
    │   ├── features/
    │   │   ├── auth/auth.js           # login, logout, getUser, isAdmin
    │   │   └── edk/
    │   │       ├── api.js             # Fungsi pemanggil endpoint EDK
    │   │       ├── queries.js         # Hook TanStack Query
    │   │       ├── useEdkFilters.js   # Filter & tab disimpan di URL
    │   │       └── UploadHistoryModal.jsx # Riwayat upload, rollback, log aktivitas
    │   ├── lib/api.js                 # Wrapper fetch (base URL, token, error 401/422)
    │   ├── pages/                     # Dashboard, Edk, Login, Quadrant, Support, MonitoringOrderSjt
    │   ├── App.jsx                    # Routing, lazy loading, proteksi login
    │   ├── index.css                  # Setup CSS global dan konfigurasi font
    │   └── main.jsx                   # Entry point (QueryClient, Theme, Router)
    ├── .env                           # VITE_API_URL (dibuat manual, lihat instalasi)
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## 💻 Panduan Instalasi

### Prasyarat Sistem

| Kebutuhan | Versi | Catatan |
|---|---|---|
| [PHP](https://www.php.net/) | **8.3** atau lebih baru | Ekstensi wajib: `pdo_mysql`, `mbstring`, `xml`, `zip`, `gd`, `fileinfo`, `openssl`. Untuk test: `pdo_sqlite` |
| [Composer](https://getcomposer.org/) | 2.x | |
| [MySQL](https://www.mysql.com/) / MariaDB | 8.x / 10.6+ | Bisa memakai Laragon, XAMPP, atau Docker |
| [Node.js](https://nodejs.org/) | **20.x LTS** atau lebih baru | |
| [npm](https://www.npmjs.com/) | 10.x | |
| [Git](https://git-scm.com/) | | |

Cek versi:

```bash
php -v
```

```bash
php -m
```

```bash
composer -V
```

```bash
node -v
```

> **Pengguna Windows:** paling mudah memakai **Laragon** (sudah termasuk PHP, MySQL, Composer). Pastikan ekstensi `zip` dan `gd` aktif di `php.ini` — keduanya dibutuhkan untuk membaca/membuat file Excel.

### 1. Clone Repositori

```bash
git clone <URL_REPOSITORY_ANDA> telkom-ssgsdashboard
```

```bash
cd telkom-ssgsdashboard
```

### 2. Setup Backend (Laravel)

**2.1. Masuk ke folder backend & instal dependensi**

```bash
cd telkom-api
```

```bash
composer install
```

**2.2. Buat file `.env`**

macOS / Linux / Git Bash:

```bash
cp .env.example .env
```

Windows PowerShell:

```bash
Copy-Item .env.example .env
```

Lalu generate application key:

```bash
php artisan key:generate
```

**2.3. Buat database**

Buat database kosong bernama `edk_monitoring` (lewat phpMyAdmin, HeidiSQL, atau terminal MySQL):

```sql
CREATE DATABASE edk_monitoring CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**2.4. Isi konfigurasi di `telkom-api/.env`**

```env
APP_NAME="SSGS Dashboard API"
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=edk_monitoring
DB_USERNAME=root
DB_PASSWORD=

# Akun admin pertama (dipakai oleh EdkUserSeeder) — GANTI nilainya
ADMIN_NAME="Admin EDK"
ADMIN_EMAIL=admin@telkom.co.id
ADMIN_NIK=123456
ADMIN_PASSWORD=GantiDenganPasswordKuat
```

**2.5. Jalankan migration & buat akun admin**

```bash
php artisan migrate
```

```bash
php artisan db:seed --class=EdkUserSeeder
```

**2.6. (Opsional) Buat akun viewer**

Contoh untuk manager yang hanya perlu melihat dashboard:

```bash
php artisan tinker --execute="App\Models\User::create(['name'=>'Manager EDK','email'=>'manager@telkom.co.id','password'=>bcrypt('PasswordManager123'),'role'=>'viewer']);"
```

**2.7. Atur CORS**

Pastikan file `config/cors.php` ada (jika belum, jalankan `php artisan config:publish cors`), lalu cek isinya:

```php
'paths' => ['api/*'],
'allowed_origins' => ['http://localhost:5173'],   // URL frontend
'exposed_headers' => ['Content-Disposition'],     // agar nama file export terbaca
```

**2.8. Jalankan server backend**

```bash
php artisan serve
```

Backend berjalan di `http://127.0.0.1:8000`. Cek daftar endpoint:

```bash
php artisan route:list --path=api
```

> Biarkan terminal ini tetap terbuka selama development.

### 3. Setup Frontend (React + Vite)

Buka **terminal baru**, dari folder root repositori:

**3.1. Masuk ke folder frontend & instal dependensi**

```bash
cd telkom
```

```bash
npm install
```

**3.2. Buat file `telkom/.env`**

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

> Setiap kali mengubah `.env` frontend, hentikan (`Ctrl+C`) lalu jalankan ulang `npm run dev`.

**3.3. Jalankan development server**

```bash
npm run dev
```

Buka di browser:

```text
http://localhost:5173
```

### 4. Login Pertama Kali

1. Buka `http://localhost:5173` → otomatis diarahkan ke halaman **Login**.
2. Masukkan **email** atau **NIK** dan **password** admin sesuai `ADMIN_*` di `telkom-api/.env`.
3. Buka menu **EDK Monitoring** → klik **Upload Report** → pilih file Excel (lihat [Format File Upload EDK](#-format-file-upload-edk)) → isi tanggal laporan → **Upload**.
4. Tabel, kartu KPI, dan filter langsung terisi.

---

## 📖 Panduan Penggunaan

### Navigasi
- **Dashboard** — rangkuman agenda tingkat regional.
- **EDK Monitoring** — pemantauan EDK per Segmen, Periode, AM, dan Top 10 Pelanggan.
- **Monitoring Order SJT** — monitoring order Witel Solo Jateng Timur.
- **Kuadran SJT** — sub-analisis *Kuadran Moving*, *Witel*, *Telda*, dan *Segment Performance*.
- **MoM & Support Needed** — daftar eskalasi isu dan bantuan antar unit.
- Tombol panah di atas sidebar untuk memperluas / menciutkan sidebar.
- Tombol **Keluar** di sidebar atau klik kartu profil di header untuk logout.

### Alur Mingguan EDK
1. Download template (**Upload Report → Download template**) atau gunakan file 9 kolom yang biasa dipakai.
2. Isi data EDK terbaru, lalu **Upload Report** dengan tanggal laporan minggu tersebut.
3. Jika ada baris yang salah format, upload ditolak beserta daftar nomor baris yang perlu diperbaiki — perbaiki di Excel lalu upload ulang.
4. Jika berhasil, snapshot baru langsung aktif dan flag **Baru / Berubah / Tidak Berubah** dihitung otomatis dibanding upload sebelumnya.
5. Salah upload? Buka **Riwayat Upload** → **Aktifkan** snapshot sebelumnya (rollback).
6. Bagikan ke manager lewat **Export** (`.xlsx`) atau **Salin & Bagikan → Copy Report Link**.

### Tabel & Filter EDK
- Pilih tab tampilan: **Segmen**, **Periode EDK**, **Nama AM**, atau **Nama CC** (Top 10 Pelanggan).
- Gunakan filter **Periode EDK**, **Segmen**, **Nama AM**, dan **Flagging Last Update** (bisa pilih lebih dari satu).
- Klik **Reset Filter** untuk kembali ke tampilan awal.
- Klik judul kolom *Nama AM* / *Nama Pelanggan* untuk mengurutkan A–Z / Z–A.
- **Riwayat Upload → Lihat** menampilkan snapshot lama tanpa mengubah data aktif (muncul banner kuning; klik **Kembali ke data aktif** untuk keluar).

---

## 📄 Format File Upload EDK

- Format: `.xlsx`, maksimal **10 MB**.
- Data di **sheet pertama**, header di **baris 1**, data mulai **baris 2**. 1 baris = 1 order.
- Kolom wajib ada (isi selnya boleh kosong):

| Kolom | Aturan isi (jika diisi) |
|---|---|
| `SID` | ID layanan |
| `NAMA_PELANGGAN` | Teks |
| `NAMA_AM` | Teks |
| `SEGMEN` | `DGS`, `DPS`, `DSS`, `RBS` |
| `PERIODE_EDK` | Teks 6 digit `YYYYMM`, contoh `202611` |
| `STATUS_UTAMA` | `LANJUT`, `TIDAK_LANJUT`, `KONFIRMASI_AM` |
| `STATUS_DETAIL` | `LANJUT`/`TIDAK_LANJUT` → `COMPLETE` / `IN_PROGRESS`; `KONFIRMASI_AM` → `AUTO_RENEWAL` / `IN_PROGRESS` |
| `ORDER` | Bilangan bulat ≥ 0 (kosong = 1) |
| `ABONEMEN` | Angka tanpa "Rp"/titik ribuan, boleh negatif (kosong = 0) |

- Kolom opsional: `NO_ORDER`, `NAMA_CC`, `WITEL` (kosong = `SOLO JT`; selain itu masuk kolom *Bukan Witel Solo JT*).
- Template lengkap dengan dropdown dan sheet README tersedia di `telkom-api/resources/templates/Template_Import_EDK_Monitoring.xlsx`.

---

## 👥 Hak Akses (Role)

| Aksi | admin | viewer |
|---|:---:|:---:|
| Melihat dashboard, filter, tab | ✅ | ✅ |
| Export, Copy Table/Picture/Link | ✅ | ✅ |
| Melihat Riwayat Upload & snapshot lama | ✅ | ✅ |
| Upload Report | ✅ | ❌ |
| Aktifkan snapshot (rollback) | ✅ | ❌ |
| Melihat Log Aktivitas | ✅ | ❌ |

Mengubah role user:

```bash
php artisan tinker --execute="App\Models\User::where('email','manager@telkom.co.id')->update(['role'=>'admin']);"
```

---

## 🔌 Daftar Endpoint API

Semua endpoint berawalan `/api`. Selain `auth/login`, semua wajib header `Authorization: Bearer <token>`.

| Method | Endpoint | Akses | Fungsi |
|---|---|---|---|
| POST | `/auth/login` | publik | Login (`login` = email/NIK, `password`, `remember`). Maks 5x/menit |
| GET | `/auth/me` | login | Data user yang sedang login |
| POST | `/auth/logout` | login | Hapus token |
| GET | `/edk/uploads` | login | Riwayat upload |
| POST | `/edk/uploads` | admin | Upload `file` (.xlsx) + `report_date` |
| POST | `/edk/uploads/{id}/activate` | admin | Aktifkan snapshot (rollback) |
| GET | `/edk/template` | login | Download template Excel |
| GET | `/edk/summary/{by}` | login | `by` = `segmen` \| `periode` \| `am` \| `cc` |
| GET | `/edk/cards` | login | Kartu KPI + persentase vs upload sebelumnya |
| GET | `/edk/options` | login | Opsi dropdown filter |
| GET | `/edk/top-customers` | login | Top N pelanggan (`limit`, `sort`) |
| GET | `/edk/export` | login | `by` + `format` (`xlsx` \| `csv`) |
| GET | `/audit-logs` | admin | Log aktivitas (paginasi) |

**Parameter filter bersama** (endpoint `/edk/*`): `upload_id`, `periode` (`old` = sebelum tahun laporan), `segmen`, `am`, `flag`, `q`. Nilai multi dipisah koma, contoh `?segmen=DGS,DPS&periode=old,202611`.

---

## 📜 Skrip & Perintah yang Tersedia

### Frontend (`telkom/`)

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan Vite development server di `http://localhost:5173` |
| `npm run build` | Build aplikasi ke folder `dist/` untuk produksi |

### Backend (`telkom-api/`)

| Perintah | Deskripsi |
|---|---|
| `php artisan serve` | Menjalankan server API di `http://127.0.0.1:8000` |
| `php artisan migrate` | Menjalankan migration database |
| `php artisan db:seed --class=EdkUserSeeder` | Membuat / memperbarui akun admin dari `.env` |
| `php artisan test` | Menjalankan seluruh test |
| `php artisan route:list --path=api` | Melihat daftar endpoint |
| `php artisan optimize:clear` | Membersihkan cache config, route, dan view |
| `php artisan cache:clear` | Membersihkan cache data dashboard |
| `php artisan sanctum:prune-expired` | Menghapus token login yang sudah kedaluwarsa |

---

## 🧪 Menjalankan Test

Test memakai **SQLite in-memory**, sehingga database MySQL tidak tersentuh. Pastikan `telkom-api/phpunit.xml` berisi:

```xml
<env name="DB_CONNECTION" value="sqlite"/>
<env name="DB_DATABASE" value=":memory:"/>
```

Lalu jalankan dari folder `telkom-api`:

```bash
php artisan test
```

Test mencakup: upload & validasi file, flag antar snapshot, rollback, konsistensi total di semua tab, filter, export, login, role, dan audit log. File fixture ada di `tests/Fixtures/edk_dummy.xlsx`.

---

## 🩺 Troubleshooting

| Gejala | Penyebab & Solusi |
|---|---|
| Halaman putih / error `No QueryClient set` | `main.jsx` harus membungkus `<App />` dengan `QueryClientProvider`, `ThemeProvider`, dan `BrowserRouter` dalam **satu** elemen di `render(...)` |
| Selalu kembali ke halaman login / `401 Unauthenticated` | Token kedaluwarsa atau belum login. Login ulang |
| `403 Anda tidak punya akses` saat upload | Akun ber-role `viewer`. Ubah ke `admin` (lihat [Hak Akses](#-hak-akses-role)) |
| Error CORS di console browser | Cek `allowed_origins` di `config/cors.php`, lalu `php artisan optimize:clear` |
| `Tidak dapat terhubung ke server` | `php artisan serve` belum berjalan, atau `VITE_API_URL` salah (restart `npm run dev` setelah ubah `.env`) |
| Upload file besar gagal / `413` | Naikkan `upload_max_filesize` dan `post_max_size` (≥ 12M) di `php.ini`, lalu restart server |
| Error `Class "ZipArchive" not found` atau gagal baca Excel | Aktifkan ekstensi `zip` (dan `gd`) di `php.ini` |
| `Belum ada data. Silakan upload report EDK.` | Belum ada upload yang berhasil — upload file pertama sebagai admin |
| Angka dashboard tidak berubah setelah `migrate:fresh` | Jalankan `php artisan cache:clear` |
| `Template belum tersedia` saat download template | Pastikan file ada di `telkom-api/resources/templates/Template_Import_EDK_Monitoring.xlsx` |

---

## 🤝 Kontribusi & Lisensi

1. Buat branch baru dari `main` untuk setiap perubahan.
2. Pastikan `php artisan test` hijau dan `npm run build` berhasil sebelum membuat pull request.
3. Jangan commit file `.env` atau kredensial apa pun.

Proyek ini dikembangkan untuk kebutuhan internal **Telkom Regional 3**. Penggunaan dan distribusi mengikuti kebijakan internal perusahaan.
