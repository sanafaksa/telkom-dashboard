# 📊 Telkom Regional 3 - SSGS Dashboard

[![React](https://img.shields.io/badge/React-19.0.0-blue?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0.0-purple?logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![TanStack Table](https://img.shields.io/badge/TanStack_Table-v8-orange)](https://tanstack.com/table)
[![Status](https://img.shields.io/badge/Status-Active_Development-success)]()

Dashboard monitoring performa, koordinasi agenda, dan evaluasi operasional unit **Strategic / Shared Service & Governance Support (SSGS) Telkom Regional 3**. Aplikasi web ini dirancang untuk memantau indikator kinerja utama (KPI), progres tindak lanjut agenda lintas Witel & Unit In Charge (UIC), analisis posisi kuadran, serta tracking Evaluasi Data Kinerja (EDK) secara terintegrasi dan real-time.

---

## 📑 Daftar Isi

- [Tentang Proyek](#-tentang-proyek)
- [Fitur Utama](#-fitur-utama)
- [Teknologi & Dependensi](#-teknologi--dependensi)
- [Struktur Direktori](#-struktur-direktori)
- [Panduan Instalasi](#-panduan-instalasi)
- [Panduan Penggunaan](#-panduan-penggunaan)
- [Skrip yang Tersedia](#-skrip-yang-tersedia)
- [Kontribusi & Lisensi](#-kontribusi--lisensi)

---

## 🏢 Tentang Proyek

Dashboard ini dikembangkan untuk mempermudah monitoring dan pengambilan keputusan manajemen di lingkungan **Telkom Regional 3**. Dengan integrasi visualisasi data yang responsif, manajemen dan tim operasional dapat:

1. **Memantau Agenda & Isu Operasional**: Mengetahui progres follow-up agenda di setiap Witel (Bali, Yogyakarta, Suramadu, Semarang, Jatim Barat, Solo) dan Unit (RLEGS, RSMES, RSO 1, BPPLP, RSO 2, SSGS).
2. **Evaluasi Data Kinerja (EDK)**: Melacak pencapaian order, abonemen, status pekerjaan AM (Account Manager), segmen bisnis, serta status pengujian layanan (Live Call/Pax, Test Call/Pax).
3. **Analisis Kuadran Portofolio**: Memetakan tren pergerakan kinerja (*Kuadran Moving*), pencapaian target, dan performa segmen secara analitis.
4. **Dukungan Kebutuhan (Support Needed)**: Mengawal eskalasi kebutuhan lintas fungsi agar setiap hambatan operasional terselesaikan tepat waktu.

---

## 🚀 Fitur Utama

### 1. 📌 Executive Overview (`/dashboard`)
- **Hierarki Eksekusi Agenda & Follow Up**: Kartu status ringkasan (Total Agenda, Pending/Not Yet, On Progress, Done).
- **Distribusi Kinerja per Witel**: Grafik perbandingan aktivitas dan beban isu pada masing-masing Witel.
- **Unit In Charge (UIC) Breakdown**: Distribusi PIC unit pelaksana tindak lanjut.
- **Log Agenda & Filter Dinamis**: Pencarian kata kunci dan filter status agenda secara langsung.
- **Ekspor Laporan**: Dukungan ekspor ringkasan laporan agenda ke format `.csv`.

### 2. 📋 EDK Monitoring (`/edk-monitoring`)
- **Ringkasan KPI**: Menampilkan Total Order, Total Abonemen, Status In Progress, dan Completed.
- **Multi-View Grouping**: Analisis berdasarkan *Nama AM*, *Periode EDK*, *Segmen*, dan *Flagging*.
- **Tabel Data Interaktif (TanStack React Table)**:
  - Dukungan multi-kolom pengujian (Live Call/Pax, Test Call/Pax, Batal, Kembali, Total Order, dan Abonemen).
  - Sorting ascending/descending per kolom.
  - Pagination dinamis.
- **Filter Bertingkat & Reset Cepat**: Filter berdasarkan Periode, Segmen, AM, dan Flagging.
- **Download Data EDK**: Ekspor data tabel terpilih ke format CSV.

### 3. 🧭 Analisis Kuadran (`/kuadran/:view`)
- **Multi-Perspektif Analisis**:
  - `Kuadran Moving`: Pergerakan kuadran target vs realisasi.
  - `Witel Performance`: Posisi kuadran kinerja Witel.
  - `Telda Performance`: Analisis performa unit Telda.
  - `Segment Performance`: Evaluasi kuadran per segmen pelanggan (Enterprise, Government, Business, dll.).
- **Matriks Visual 4-Kuadran**: Pemetaan posisi kinerja dengan kartu interaktif dan Grand Total summary.
- **Simulasi Upload Data**: Fitur upload berkas spreadsheet (`.xlsx`, `.csv`) untuk pembaruan data kuadran.
- **Share & Export**: Fitur salin tautan visualisasi dan ekspor matriks.

### 4. 🤝 Support Needed Tracker (`/support-needed`)
- **Agenda Koordinasi & Dukungan**: Monitoring kebutuhan dukungan teknis dan operasional.
- **Status Metrik**: Tracking status Open, Need Discuss, On Progress, dan Done beserta persentasenya.
- **Matriks Rekapitulasi**: Pemetaan isu per unit pelaksana untuk mempercepat eskalasi keputusan.
- **Ekspor Laporan**: Unduh berkas rekapitulasi follow-up support ke format CSV.

### 5. 🎨 Desain Modern & Responsif
- Identitas warna korporat Telkom Indonesia (`#083E9E`, `#2563EB`).
- Sidebar navigasi dengan mode kolaps (expand/collapse) dan submenu bersarang (*nested accordion*).
- Indikator badge status dan tipografi modern dengan font **Inter**.

---

## 🛠 Teknologi & Dependensi

| Kategori | Teknologi | Deskripsi |
|---|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) | Library utama untuk UI komponen |
| **Build Tool & Bundler** | [Vite 6](https://vitejs.dev/) | Dev server super cepat dan bundler produksi |
| **Routing** | [React Router DOM v7](https://reactrouter.com/) | Manajemen rute dan navigasi SPA |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Utilitas styling modern dan responsif |
| **Iconography** | [Lucide React](https://lucide.dev/) | Koleksi ikon SVG modern dan konsisten |
| **Table Engine** | [@tanstack/react-table v8](https://tanstack.com/table) | Pemrosesan tabel headless untuk filtering, sorting, & pagination |
| **Visualisasi Data** | [Recharts v2](https://recharts.org/) | Diagram dan grafik statistik interaktif |
| **State Management** | [Zustand v5](https://zustand.docs.pmnd.rs/) | State management ringan dan efisien |
| **Dokumen & Ekspor** | `jspdf`, `html2canvas`, Custom CSV Export | Pembuatan berkas PDF dan unduhan CSV |

---

## 📂 Struktur Direktori

```text
telkom-ssgsdashboard/
├── .git/                      # Git repository metadata
├── README.md                  # Dokumentasi utama proyek
└── telkom/                    # Direktori aplikasi web Vite + React
    ├── public/                # Aset statis publik (logo, gambar, favicon)
    │   └── telkom-logo.png
    ├── src/
    │   ├── components/        # Komponen UI modular
    │   │   ├── Layout.jsx     # Shell layout utama, sidebar kolaps, dan topbar
    │   │   ├── Quadrant.jsx   # Komponen visualisasi grid 4-kuadran
    │   │   └── ui.jsx         # UI primitives (KpiCard, PageHeader, exportCSV, modal)
    │   ├── data/              # Mock data & data store operasional
    │   │   ├── dashboardData.js # Data ringkasan agenda, witel, uic, aktivitas
    │   │   ├── edkData.js       # Data evaluasi data kinerja, order & abonemen
    │   │   ├── quadrantData.js  # Data matriks kuadran kinerja
    │   │   └── supportData.js   # Data agenda koordinasi dan kebutuhan support
    │   ├── pages/             # Halaman-halaman rute
    │   │   ├── Dashboard.jsx  # Halaman Executive Overview
    │   │   ├── Edk.jsx        # Halaman Monitoring EDK
    │   │   ├── Quadrant.jsx   # Halaman Kuadran & Performance
    │   │   └── Support.jsx    # Halaman Pelacakan Support Needed
    │   ├── App.jsx            # Routing dan lazy loading halaman
    │   ├── index.css          # Setup CSS global dan konfigurasi font
    │   └── main.jsx           # Entry point aplikasi React
    ├── index.html             # Shell HTML utama
    ├── package.json           # Dependensi dan skrip proyek
    └── vite.config.js         # Konfigurasi Vite & Tailwind plugin
```

---

## 💻 Panduan Instalasi

### Prasyarat Sistem
Pastikan telah menginstal:
- [Node.js](https://nodejs.org/) (versi **18.x** atau **20.x** LTS lebih disarankan)
- [npm](https://www.npmjs.com/) (versi **9.x+**) atau package manager lain (`pnpm` / `yarn`)

### Langkah-langkah Menjalankan Proyek

1. **Clone Repositori**:
   ```bash
   git clone <URL_REPOSITORY_ANDA>
   cd "telkom ssgsdashboard"
   ```

2. **Masuk ke Direktori Frontend (`telkom`)**:
   ```bash
   cd telkom
   ```

3. **Instal Dependensi**:
   ```bash
   npm install
   ```

4. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```

5. **Buka di Browser**:
   Buka peramban web dan akses URL lokal:
   ```text
   http://localhost:5173
   ```

---

## 📖 Panduan Penggunaan

1. **Navigasi Sidebar**:
   - Klik menu **Executive Overview** untuk melihat rangkuman agenda tingkat regional.
   - Klik menu **EDK Monitoring** untuk masuk ke modul pemantauan evaluasi kinerja AM dan Segmen.
   - Buka dropdown **Kuadran** untuk memilih sub-analisis:
     - *Kuadran Moving*
     - *Witel Performance*
     - *Telda Performance*
     - *Segment Performance*
   - Klik menu **Support Needed** untuk melihat daftar eskalasi isu dan bantuan antar unit.
   - Gunakan tombol lingkaran berpanah di bagian atas sidebar untuk memperluas / menciutkan sidebar.

2. **Pengoperasian Tabel & Filter di EDK**:
   - Pilih tab view (*Nama AM*, *Periode EDK*, *Segmen*, atau *Flagging*).
   - Gunakan dropdown filter di kanan atas tabel untuk mempersempit data.
   - Klik **Reset Filter** jika ingin kembali ke data awal.
   - Klik judul kolom tabel untuk melakukan sorting data.
   - Klik tombol **Ekspor CSV** untuk mengunduh data hasil filter.

3. **Pengoperasian Kuadran & Support**:
   - Klik **Share Link** untuk menyalin tautan halaman langsung ke clipboard.
   - Klik **Download Data** untuk mengekspor data agenda atau matriks ke format CSV.
   - Klik **Update Data** untuk membuka dialog upload berkas pembaruan data.

---

## 📜 Skrip yang Tersedia

Di dalam folder `telkom/`, Anda dapat menjalankan:

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan Vite development server lokal di `http://localhost:5173` |
| `npm run build` | Melakukan build aplikasi ke dalam folder `dist/` untuk produksi |

---

#
