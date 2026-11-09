# PRODUCT REQUIREMENTS DOCUMENT (PRD)
**Nama Aplikasi:** Sistem Informasi & Database Sekretaris Desa (SIDA-JAMAAH)
**Versi Dokumen:** 1.0 (Blueprint Awal & Master Context)
**Arsitek Sistem:** ZettBOT by Zettbos

---

# ZONA ATAS: SPESIFIKASI KEBUTUHAN PRODUK (BLUEPRINT AWAL)

## 1. Nama Projek & Problem Statement
- **Nama Projek:** **SIDA-JAMAAH** (Sistem Informasi Database & Administrasi Jamaah Se-Desa).
- **Problem Statement:**
  Sekretaris desa membutuhkan sistem terpusat untuk mengelola data **311+ jiwa jamaah (95 KK)** lintas kelompok (**Al Awwabin 1, Al Awwabin 2, Kencana 1, Kencana 2**) yang sebelumnya tersebar di beberapa tabel spreadsheet dengan format tanggal dan rumus kategori usia yang kadang tidak sinkron. Selain itu, sekretaris membutuhkan pencatatan mutasi keluar-masuk (jamaah baru/pindah datang vs pindah keluar/wafat) serta halaman khusus untuk mencetak **Rekap Tabel Kustom** maupun **Kartu Keluarga / Biodata Perorangan** ke dalam format PDF siap print.

## 2. Peran Pengguna (User Roles)
- **Sekretaris Desa / Admin Utama:** Memiliki akses penuh ke Dashboard Analitik, Pencarian & Filter Multi-Kriteria, CRUD Database Jamaah & Keluarga (KK), Pencatatan Mutasi Masuk & Keluar, Import/Export CSV/Excel, serta Studio Cetak PDF Kustom.
- **Pengurus Desa / Kelompok (Kides, Wakides, Kipok, KU):** Dapat melihat rekapitulasi statistik, mencari data jamaah per kelompok/dapukan/kategori usia, dan mencetak laporan PDF sesuai kebutuhan musyawarah atau kegiatan desa.

## 3. Arsitektur & Lingkungan Kerja
- **Platform Utama:** **Google Apps Script (Web App)** terintegrasi langsung dengan **Google Sheets** sebagai database cloud gratis.
- **Pola Arsitektur:** **Monolith Tangguh (3 Berkas Utama: `code.gs`, `setup.gs`, `index.html`)** agar sangat mudah dipasang (copy-paste) oleh Sekretaris tanpa instalasi server rumit, namun dilengkapi fitur *Client-Side In-Memory Caching*, *Lazy Loading Pagination Backend*, dan *Safe Preview Mode*.
- **Pre-loaded Database (311 Jamaah / 95 KK):** Seluruh data riil yang dikirimkan pengguna (Al Awwabin 1: 85 jiwa, Al Awwabin 2: 63 jiwa, Kencana 1: 75 jiwa, Kencana 2: 88 jiwa) langsung ditanamkan ke dalam `setup.gs` lengkap dengan fitur **Import CSV/Excel** tambahan di dalam aplikasi.
- **Gaya Visual & Target Perangkat:**
  - **Responsif HP & PC (Mobile-Friendly First + Desktop Wide Table):** Nyaman diakses dari HP saat di lapangan maupun dari Laptop/PC saat bekerja di meja sekretariat.
  - **Estetika Desain Anti-AI (Human-Crafted Clean & Modern):** Palet warna profesional *Slate & Deep Emerald*, tipografi bersih, kartu metrik *Grid 2–4 Kolom* (anti-tumpuk vertikal), dan ikon vektor SVG tajam.

## 4. Alur Kerja Aplikasi (User Flow)
1. **Inisialisasi Otomatis (`setupDatabase`):** Saat pertama kali dijalankan, sistem membuat struktur tab Google Sheets (`DataJamaah`, `LogMutasi`, `PengaturanDesa`) dan langsung mengisi **311 data jamaah (95 KK)** yang sudah dinormalisasi.
2. **Dashboard Sekretaris:** Menampilkan kartu ringkasan populasi aktif, jumlah KK, distribusi per Kelompok (Al Awwabin 1 & 2, Kencana 1 & 2), grafik piramida Kategori Usia (Balita, Caberawit, Remaja/Muda-Mudi, Pra Nikah, Usia Nikah, Dewasa, Lansia), rekap Mubaligh (MT/MS), Kategori Ekonomi (Aghnia/Dhuafa), Golongan Darah, serta ringkasan Mutasi Masuk/Keluar.
3. **Kelola Database & Pencarian Cerdas:**
   - Sekretaris dapat mencari jamaah berdasarkan Nama, Kelompok, Kode KK, Dapukan, Pendidikan, Kategori Usia, Golongan Darah, atau Kemubalighan.
   - Tambah/Edit data jamaah otomatis menghitung usia dari Tanggal Lahir dan menentukan rekomendasi Kategori Usia secara akurat.
   - Mendukung **Import CSV/Excel** untuk menambah atau memperbarui data massal.
4. **Modul Jamaah Masuk & Keluar (Mutasi Kependudukan):**
   - **Jamaah Masuk (Kelahiran / Pindah Datang / Jamaah Baru):** Mencatat tanggal masuk, jenis masuk, asal, kelompok tujuan, dan otomatis menambahkan/mengaktifkan data di `DataJamaah` serta mencatat riwayatnya di `LogMutasi`.
   - **Jamaah Keluar (Pindah Domisili / Wafat / Non-Aktif):** Memilih jamaah aktif, mencatat tanggal keluar, alasan/tujuan, dan otomatis mengubah status jamaah menjadi `Pindah Keluar` atau `Wafat` tanpa menghapus jejak historisnya.
5. **Halaman Khusus Studio Custom PDF & Print:**
   - **Mode 1: Cetak Rekap Tabel Kustom:** Pilih data jamaah (berdasarkan filter Kelompok, Kategori Usia, Dapukan, KK, atau centang manual baris tertentu) -> Pilih kolom mana saja yang ingin ditampilkan -> Atur Judul Laporan, Kop Surat Desa, Orientasi Kertas (A4/F4, Portrait/Landscape), dan Tanda Tangan -> Cetak / Simpan PDF.
   - **Mode 2: Cetak Kartu Keluarga (KK Jamaah) & Biodata Perorangan:** Pilih satu atau beberapa Jamaah / Kepala Keluarga -> Sistem menyusun lembar Biodata Lengkap Perorangan atau Lembar Kartu Keluarga Jamaah (daftar seluruh anggota dalam 1 KK) siap print/PDF.

## 5. Desain Basis Data (Google Sheets Tanpa Karakter "_")

### A. Sheet `DataJamaah` (Master Database Jamaah)
| Indeks | Konstanta `COL_JAMAAH` | Nama Header Kolom | Tipe Data | Contoh Isi Data |
| :--- | :--- | :--- | :--- | :--- |
| 0 | `ID` | ID Jamaah | String (Auto) | `JMH-202611-001` |
| 1 | `KODE_KK` | Kode KK | String | `AA1-KK01` |
| 2 | `STATUS_KK` | Peran KK | String | `Kepala Keluarga` / `Anggota` |
| 3 | `NO_URUT` | No Urut | Number | `1` |
| 4 | `KELOMPOK` | Kelompok | String | `Al Awwabin 1` |
| 5 | `NAMA` | Nama Lengkap | String | `Bp H Andi Mulya` |
| 6 | `TEMPAT_LAHIR` | Tempat Lahir | String | `Semarang` |
| 7 | `TGL_LAHIR` | Tanggal Lahir | String (`yyyy-MM-dd`) | `1966-08-06` |
| 8 | `USIA` | Usia | Number | `60` |
| 9 | `JK` | Jenis Kelamin | String (`L`/`P`) | `L` |
| 10 | `STATUS_NIKAH` | Status Pernikahan | String | `Menikah` |
| 11 | `PENDIDIKAN` | Pendidikan | String | `S1` |
| 12 | `KELAS` | Kelas Sekolah | String | `SUDAH LULUS` / `10` |
| 13 | `LEMBAGA` | Nama Lembaga Pendidikan | String | `SEKOLAH UMUM` / `PSDI` |
| 14 | `DAPUKAN` | Dapukan | String | `Wakides` / `Kipok` |
| 15 | `KATEGORI_EKONOMI` | Kategori Ekonomi | String | `Aghnia` / `Dhuafa` |
| 16 | `KATEGORI_USIA` | Kategori Usia | String | `DEWASA` / `CABERAWIT` |
| 17 | `GOLDAR` | Golongan Darah | String | `O` |
| 18 | `KEMUBALIGHAN` | Kemubalighan | String | `MS` / `MT` |
| 19 | `NO_HP` | No HP | String | `+6281395254001` |
| 20 | `STATUS_AKTIF` | Status Jamaah | String | `Aktif` / `Pindah Keluar` / `Wafat` |
| 21 | `UPDATED_AT` | Terakhir Diperbarui | String | `2026-11-06 06:30:00` |

### B. Sheet `LogMutasi` (Riwayat Jamaah Masuk & Keluar)
| Indeks | Konstanta `COL_MUTASI` | Nama Header Kolom | Tipe Data | Contoh Isi Data |
| :--- | :--- | :--- | :--- | :--- |
| 0 | `ID_MUTASI` | ID Mutasi | String (Auto) | `MTS-202611-001` |
| 1 | `TANGGAL` | Tanggal Mutasi | String (`yyyy-MM-dd`) | `2026-11-06` |
| 2 | `JENIS` | Jenis Mutasi | String | `MASUK` / `KELUAR` |
| 3 | `KATEGORI_MUTASI` | Kategori Mutasi | String | `Pindah Datang` / `Kelahiran` / `Pindah Keluar` / `Wafat` |
| 4 | `ID_JAMAAH` | ID Jamaah | String | `JMH-202611-001` |
| 5 | `NAMA` | Nama Jamaah | String | `Bp H Andi Mulya` |
| 6 | `KELOMPOK` | Kelompok | String | `Al Awwabin 1` |
| 7 | `KETERANGAN` | Keterangan / Alamat Asal-Tujuan | String | `Pindah domisili dari luar kota` |
| 8 | `DICATAT_OLEH` | Dicatat Oleh | String | `Sekretaris Desa` |
| 9 | `CREATED_AT` | Waktu Input | String | `2026-11-06 06:30:00` |

### C. Sheet `PengaturanDesa` (Konfigurasi Kop Surat & Pejabat Tanda Tangan PDF)
| Indeks | Konstanta `COL_SETTING` | Nama Header Kolom | Tipe Data | Contoh Isi Data |
| :--- | :--- | :--- | :--- | :--- |
| 0 | `KEY` | Kunci Pengaturan | String | `NAMA_DESA`, `ALAMAT_SEKRETARIAT`, `NAMA_KIDES`, `NAMA_SEKRETARIS` |
| 1 | `VALUE` | Nilai Pengaturan | String | `Desa Al Awwabin - Kencana` |

## 6. Aturan Validasi, Normalisasi Data & Logika Khusus
1. **Penomoran Kode Unik Sekuensial Anti-Tabrakan (`LockService`):**
   - ID Jamaah: `JMH-YYYYMM-XXX` (dipindai dari nilai urut tertinggi `MAX + 1`).
   - ID Mutasi: `MTS-YYYYMM-XXX` (dipindai dari nilai urut tertinggi `MAX + 1`).
2. **Audit & Normalisasi Cerdas 311 Data Eksisting Pengguna:**
   - **Relasi Keluarga (KK) Otomatis:** Di data mentah pengguna, baris yang memiliki nilai `1` (atau `KK 1`, `KK 2`, dst.) pada kolom `KK` menandakan **Kepala Keluarga**, sedangkan baris di bawahnya yang kolom `KK`-nya kosong adalah **Anggota Keluarga** dari KK tersebut. Sistem otomatis memberikan `Kode KK` terstruktur (`AA1-KK01` s/d `AA1-KK23`, `AA2-KK01` s/d `AA2-KK18`, `KC1-KK01` s/d `KC1-KK28`, `KC2-KK01` s/d `KC2-KK26` — total **95 KK**) sehingga anggota sekeluarga terhubung sempurna.
   - **Normalisasi Tanggal Lahir:** Format campuran seperti `7-May-99`, `17-Mei-18`, `28-Oct-58`, dan `1966-08-06` diseragamkan ke format ISO `YYYY-MM-DD`.
   - **Perbaikan Anomali Kategori Usia:** Pada data mentah Al Awwabin 2 & Kencana 2, ditemukan beberapa orang tua/dewasa menikah yang tertulis `BALITA` akibat pergeseran rumus Excel lama (contoh: *Bp Puji Utomo* 49 thn, *Bp Satria* S1 Menikah). Sistem menyediakan aturan validasi otomatis berdasarkan usia & status pernikahan:
     - `BALITA`: Usia 0 – 4 tahun
     - `CABERAWIT`: Usia 5 – 12 tahun (atau SD/TK/PAUD)
     - `REMAJA / MUDA-MUDI`: Usia 13 – 18 tahun (Belum Menikah)
     - `PRA NIKAH`: Usia 19 – 22 tahun (Belum Menikah)
     - `USIA NIKAH`: Usia ≥ 23 tahun (Belum Menikah)
     - `DEWASA`: Status Menikah / Janda / Duda dengan usia < 60 tahun (atau usia 25–59 tahun)
     - `LANSIA`: Usia ≥ 60 tahun
3. **Pencarian, Filter & Pagination di Backend + In-Memory Caching:**
   - Filter multi-dimensi (Kelompok, Kategori Usia, Jenis Kelamin, Status Pernikahan, Dapukan, Kategori Ekonomi, Kemubalighan, Golongan Darah, Status Aktif) diproses cepat dengan *Client-Side In-Memory Cache* untuk perpindahan menu 0 detik dan sinkronisasi penuh ke backend Google Sheets.

## 7. Rencana Antarmuka (UI/UX Menu & Halaman)
1. **Menu 1: Dashboard Eksekutif Desa**
   - 4 Kartu Metrik Utama (Total Jamaah Aktif, Total Kepala Keluarga [95 KK], Total Mubaligh MT/MS, Mutasi Bulan Ini).
   - Kartu Perbandingan 4 Kelompok (`Al Awwabin 1`, `Al Awwabin 2`, `Kencana 1`, `Kencana 2`) lengkap dengan jumlah Jiwa & KK.
   - Tabel & Grafik Distribusi Kategori Usia (Balita, Caberawit, Remaja, Pra Nikah, Usia Nikah, Dewasa, Lansia) per Kelompok.
   - Ringkasan Dapukan Pengurus, Kategori Ekonomi (Aghnia/Dhuafa), dan Golongan Darah.
2. **Menu 2: Database Jamaah & Keluarga (CRUD + Import/Export)**
   - Bilah Pencarian Instan & Filter Lengkap (Kelompok, Kategori Usia, JK, Status Nikah, Pendidikan, Dapukan, Goldar, MT/MS, Status Aktif).
   - Tombol **+ Tambah Jamaah**, **Import CSV/Excel**, dan **Export CSV/Excel**.
   - Tabel Responsif dengan lencana (*badge*) kategori usia, tombol **Lihat/Cetak KK**, **Edit**, dan **Mutasi Keluar**.
3. **Menu 3: Jamaah Masuk & Keluar (Mutasi Kependudukan)**
   - Form & Tombol Cepat **Catat Jamaah Masuk** (Kelahiran Baru / Pindah Datang) yang langsung mendaftarkan jamaah ke database utama.
   - Form & Tombol Cepat **Catat Jamaah Keluar** (Pindah Domisili / Wafat) yang memperbarui status jamaah di database utama.
   - Tabel Riwayat Log Mutasi lengkap dengan filter periode dan jenis mutasi.
4. **Menu 4: Studio Cetak PDF Kustom (Custom Print & Biodata)**
   - **Tab A - Cetak Rekap Tabel Kustom:**
     - Filter populasi yang ingin dicetak (misal: khusus Caberawit se-Desa, khusus Usia Nikah Kelompok Kencana 1, atau pilih manual dengan *checkbox*).
     - Pilihan *Checklist Kolom* (bebas pilih kolom mana saja yang ingin dimunculkan di tabel PDF agar pas di kertas).
     - Pengaturan Judul Laporan, Subjudul, Ukuran Kertas (`A4` / `F4`), Orientasi (`Portrait` / `Landscape`), dan Baris Tanda Tangan (Ketua Desa & Sekretaris Desa).
   - **Tab B - Cetak Kartu Keluarga (KK Jamaah) & Biodata Perorangan:**
     - Pilih Kepala Keluarga (`Kode KK`) untuk mencetak **Lembar Kartu Keluarga Jamaah** berisi daftar kepala keluarga dan seluruh anggota keluarganya.
     - Pilih Jamaah tertentu untuk mencetak **Kartu / Lembar Biodata Perorangan** resmi.
   - Tombol **Preview Cetak** dan **Cetak / Download PDF**.

## 8. Kriteria Pengujian (Verification Checklist)
- [ ] Menjalankan `setupDatabase()` di `setup.gs` berhasil membuat sheet `DataJamaah`, `LogMutasi`, dan `PengaturanDesa` serta memuat **311 data jamaah (95 KK)** tanpa error.
- [ ] Dashboard menampilkan angka statistik yang akurat untuk keempat kelompok (`Al Awwabin 1`, `Al Awwabin 2`, `Kencana 1`, `Kencana 2`).
- [ ] Pencarian dan filter data berjalan responsif, termasuk tambah/edit data jamaah dan import CSV.
- [ ] Pencatatan Jamaah Masuk dan Jamaah Keluar otomatis memperbarui status di `DataJamaah` dan tercatat di `LogMutasi`.
- [ ] Halaman Studio Custom PDF berhasil mencetak **Tabel Kustom (dengan kolom terpilih)** maupun **Kartu Keluarga / Biodata Perorangan** dengan tampilan bersih siap print/save as PDF.

---

# ZONA BAWAH: MASTER CONTEXT & LOGIKA SISTEM TERKINI (LIVING CONTEXT)

- **Status Proyek:** **AKTIF / SELESAI DIEKSEKUSI (v3.0 — Standalone Offline-First & PWA)** — Aplikasi telah dimigrasikan sepenuhnya menjadi proyek web mandiri siap GitHub Pages / Vercel & PWABuilder APK ([index.html](file:///d:/Antigravity%20IDE/Project%20Sekertaris/index.html), [manifest.json](file:///d:/Antigravity%20IDE/Project%20Sekertaris/manifest.json), [sw.js](file:///d:/Antigravity%20IDE/Project%20Sekertaris/sw.js), [css/style.css](file:///d:/Antigravity%20IDE/Project%20Sekertaris/css/style.css), [js/db.js](file:///d:/Antigravity%20IDE/Project%20Sekertaris/js/db.js), [js/app.js](file:///d:/Antigravity%20IDE/Project%20Sekertaris/js/app.js), dan [README.md](file:///d:/Antigravity%20IDE/Project%20Sekertaris/README.md)).
- **Lingkungan Aktif (v3.0):**
  - **100% Bebas Google Apps Script & Google Cloud OAuth:** Menghilangkan pita abu-abu *"Aplikasi ini dibuat oleh pengguna Google Apps Script"* dan membebaskan pengguna dari blokir izin organisasi sekolah (`clientauthconfig.clients.create`).
  - **Mesin Database Lokal Perangkat (`window.SidaDB` di `js/db.js`):** Menggunakan **IndexedDB** (`sida_jamaah_idb_v3`) dengan cadangan sinkron ke **LocalStorage** (`sida_jamaah_ls_v3`). Saat pertama kali aplikasi dibuka di perangkat baru, sistem otomatis melakukan *auto-seed* **311 data jamaah riil (95 KK)** beserta **26 pengurus desa & kelompok**.
  - **Pusat Cadangan & Sinkronisasi WhatsApp (Backup & Restore `.json`):** Mendukung unduh berkas `.json`, berbagi langsung via *Web Share API* ke WhatsApp (`SidaDB.shareBackupWhatsApp`), serta pemulihan (*Restore*: mode *Replace* atau *Merge*) dari layar login maupun menu *Cadangan & Keamanan*.
  - **Autentikasi Profil Lokal & PIN Sekretaris:** Mendukung 3 peran akses (`Sekretaris / Admin` dengan proteksi PIN bawaan `123456` yang dapat diubah, `Pengurus Desa/Kelompok` memilih dari 26 pengurus, dan `Jamaah/Warga` memilih dari 311 jamaah).
- **Struktur Navigasi 3 Modul Utama:**
  1. **Database:** Menggabungkan sub-tab `Dashboard`, `Data Jamaah & KK`, `Masuk & Keluar`, `Studio PDF & Print`, serta `Cadangan & Keamanan` (Pusat Backup/Restore WhatsApp, Ubah PIN Sekretaris, Profil Akses & Audit Log).
  2. **Absensi:** Terhubung ke `DataJamaah` lewat `ID Jamaah` (Presensi per Kegiatan, Tandai Semua Hadir, Presensi Mandiri, Rekap Kehadiran & Cetak PDF).
  3. **Struktur Pengurus:** Susunan 26 pengurus desa & kelompok, Tupoksi per jabatan, serta Laporan Pelaksanaan Tugas Pengurus + Tinjauan Admin & Cetak PDF.
- **Log Pembaruan Resmi:**
  - `[2026-11-06]` Rilis perdana v1.0.
  - `[2026-11-08]` Rilis v2.0: Penambahan modul Absensi, Struktur Pengurus, RBAC 3 Peran, dan Audit Log.
  - `[2026-11-09]` Rilis Mandiri v3.0 (Standalone Web App, Offline-First IndexedDB & PWA Siap APK): Pemisahan kode menjadi arsitektur web modern (`index.html`, `css/style.css`, `js/db.js`, `js/app.js`, `manifest.json`, `sw.js`, `icons/`), penanaman 311 data jamaah riil & 26 pengurus di database lokal perangkat, fitur Backup & Restore via WhatsApp (`.json`), dan login PIN/Peran lokal bebas blokir Google Cloud.
  - `[2026-11-09]` Rilis Interaktif v3.1 (Laptop & HP): Penambahan Mode Tampilan Ganda (**Tabel Lebar** & **Kartu Profil Interaktif** yang otomatis menyesuaikan layar HP/Laptop), barisan **Chip Filter 1-Ketuk** (*Quick-Filter Pills*), **Animasi Angka & Bar Persentase Visual** di Dashboard (seluruh kotak statistik dapat diklik untuk langsung memfilter data), tombol **Chat WhatsApp 1-Klik** ke nomor jamaah, sakelar **Mode Gelap / Terang (Dark Mode)**, *Bottom-Sheet Modal* di HP, serta pintasan keyboard **`Ctrl + K`** di Laptop.


