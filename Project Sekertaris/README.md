# SIDA-JAMAAH (Versi 3.0 — Standalone Offline-First & PWA)
**Sistem Informasi Database & Administrasi Sekretaris Desa**  
*Arsitektur: ZettBOT Core v4.1 — 100% Mandiri, Bebas Banner Google Apps Script, Database Lokal Perangkat (IndexedDB) + Backup WhatsApp.*

---

## Fitur Utama Versi 3.0
1. **311 Data Jamaah & 95 KK Langsung Siap Pakai:**
   Saat pertama kali dibuka di HP/perangkat baru, aplikasi otomatis memuat **311 data jamaah riil** (Al Awwabin 1, Al Awwabin 2, Kencana 1, Kencana 2) beserta **26 Pengurus Desa & Kelompok**.
2. **Database di Perangkat Masing-Masing (IndexedDB Offline-First):**
   Seluruh perubahan data (Tambah/Edit Jamaah, Mutasi, Absensi Kegiatan, Laporan Pengurus, Kop Surat) langsung tersimpan permanen di memori HP/browser Anda dan **bekerja 100% tanpa kuota internet**.
3. **Sinkronisasi & Cadangan via WhatsApp (`.json`):**
   - Klik **"Kirim Cadangan ke WhatsApp"** atau **"Download File Cadangan (.json)"** untuk membagikan database terbaru ke pengurus lain.
   - Pengurus lain cukup klik **"Pulihkan dari File Cadangan (.json)"** dan memilih file tersebut untuk menyamakan data dalam 2 detik.
4. **3 Peran Akses Tanpa Ribet Google Cloud:**
   - **Sekretaris (Admin Utama):** PIN bawaan `123456` (dapat diubah di menu *Cadangan & Keamanan*).
   - **Pengurus Desa / Kelompok:** Pilih nama pengurus langsung dari daftar 26 pengurus.
   - **Jamaah / Warga:** Pilih nama dari 311 jamaah untuk melihat Kartu Keluarga & absen mandiri.

---

## Struktur Berkas Projek (Siap Upload ke GitHub)
```text
├── index.html          # Halaman utama aplikasi
├── manifest.json       # Konfigurasi Progressive Web App (PWA) & APK
├── sw.js               # Service Worker untuk mode 100% Offline
├── css/
│   └── style.css       # Desain responsif penuh (HP & Laptop, bebas bingkai)
├── js/
│   ├── db.js           # Mesin database lokal (IndexedDB + 311 data jamaah riil)
│   └── app.js          # Logika aplikasi, 3 modul utama, dan Studio Cetak PDF
└── icons/
    ├── icon-192.png    # Ikon aplikasi standar Android (192x192)
    ├── icon-512.png    # Ikon aplikasi resolusi tinggi Play Store (512x512)
    └── icon.svg        # Ikon vektor tajam
```

---

## Panduan 1: Cara Upload Gratis ke GitHub Pages (Bebas Banner Google)

1. Buka [github.com](https://github.com) dan masuk ke akun Anda.
2. Klik tombol **New Repository** (tanda `+` di pojok kanan atas):
   - **Repository name:** `sida-jamaah`
   - Pilih **Public**
   - Klik **Create repository**.
3. Klik tautan **"uploading an existing file"** di halaman repositori baru Anda.
4. Tarik dan lepaskan (*drag & drop*) berkas dan folder berikut ke dalam GitHub:
   - `index.html`
   - `manifest.json`
   - `sw.js`
   - Folder `css` (berisi `style.css`)
   - Folder `js` (berisi `db.js` dan `app.js`)
   - Folder `icons` (berisi `icon-192.png`, `icon-512.png`, `icon.svg`)
5. Klik tombol hijau **Commit changes** di bagian bawah.
6. Masuk ke tab **Settings** (di bagian atas repositori) -> klik menu **Pages** di sebelah kiri.
7. Pada bagian **Branch**, ubah `None` menjadi **`main`** (atau `master`), lalu klik **Save**.
8. Tunggu sekitar 1 menit. Aplikasi Anda akan aktif di alamat:  
   `https://username-anda.github.io/sida-jamaah/`

---

## Panduan 2: Cara Mengubah Link GitHub Menjadi File `.APK` / `.AAB` (Play Store)

Setelah link GitHub Pages Anda aktif:
1. Buka situs gratis **[PWABuilder.com](https://www.pwabuilder.com)**.
2. Masukkan link GitHub Pages Anda (`https://username-anda.github.io/sida-jamaah/`) lalu klik **Start**.
3. PWABuilder akan memindai `manifest.json`, ikon `512x512`, dan `sw.js` yang sudah kami siapkan.
4. Klik tombol **Package for stores** -> pilih **Android** -> klik **Download Package**.
5. Anda akan mendapatkan:
   - File **`.apk`**: Bisa langsung diinstal di HP Android atau dibagikan via grup WhatsApp.
   - File **`.aab`**: Siap diunggah ke **Google Play Console** agar tayang resmi di Google Play Store!

