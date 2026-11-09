# DRAFT RENCANA REVISI SISTEM (REVISI.MD)
**Projek:** SIDA-JAMAAH (Sistem Informasi Database & Administrasi Sekretaris Desa)  
**Versi Rencana:** Rev 3.1 — Peningkatan UI/UX Sangat Interaktif untuk Laptop & HP (Dual View Kartu/Tabel, Quick-Filter Chips, Dark Mode, Animasi Metrik, & Aksi Cepat WhatsApp)  
**Status:** SELESAI DITERAPKAN (`v3.1 Aktif — Disinkronkan ke prd.md`)  

---

## 1. Analisis Kebutuhan & Tujuan Peningkatan UX

Pengguna meminta penambahan **tampilan dan pengalaman penggunaan (UI/UX) yang sangat interaktif baik saat dibuka di Laptop maupun di HP**.  
Sesuai standar **ZettBOT Bagian 8 (Filosofi Desain Anti-AI & Standar Interaksi UX)**, aplikasi akan ditingkatkan agar terasa hidup, responsif terhadap sentuhan jari di HP maupun kursor mouse/keyboard di Laptop, tanpa mengorbankan kecepatan dan keterbacaan data.

---

## 2. Rincian Fitur Interaktif yang Akan Diterapkan

### A. MODE TAMPILAN GANDA: TABEL LEBAR (LAPTOP) & KARTU PROFIL INTERAKTIF (HP)
1. **Sakelar Tampilan (`Tabel` vs `Kartu Interaktif`):**
   - Di halaman **Data Jamaah & KK**, disediakan tombol pengubah tampilan (**Mode Tabel** & **Mode Kartu Grid**).
   - Saat dibuka di layar HP, sistem dapat menampilkan **Kartu Jamaah Interaktif** yang sangat nyaman dijempol (tanpa perlu geser tabel ke kanan-kiri), lengkap dengan:
     - Avatar inisial berwarna sesuai kelompok.
     - Lencana Kelompok, Kode KK, Usia, dan Kategori Usia.
     - **Tombol Chat WhatsApp 1-Klik** (jika jamaah memiliki nomor HP, klik langsung membuka chat WA ke nomor tersebut).
     - Tombol **Lihat KK**, **Cetak Biodata**, dan **Edit Cepat**.
   - Saat dibuka di Laptop,Mode Kartu menampilkan *Grid 3 Kolom* yang modern, sedangkan Mode Tabel menampilkan tabel lengkap dengan efek *row-hover highlight* dan *sticky header*.

### B. CHIP FILTER 1-SENTUHAN (QUICK-FILTER PILLS) & PINTASAN KEYBOARD LAPTOP
1. **Deretan Chip Filter Instan (Horizontal Scroll di HP):**
   - Menambahkan barisan tombol kapsul (*Quick-Filter Chips*) di atas data jamaah:
     `Semua (311)` • `Al Awwabin 1` • `Al Awwabin 2` • `Kencana 1` • `Kencana 2` • `Kepala KK (95)` • `Caberawit` • `Remaja` • `Pra Nikah` • `Usia Nikah` • `Lansia` • `Mubaligh`.
   - Cukup 1 ketukan jari di HP atau 1 klik di Laptop, data langsung tersaring seketika dengan animasi halus.
2. **Pintasan Keyboard Laptop (`Ctrl + K` atau `/`):**
   - Pengguna Laptop cukup menekan `Ctrl + K` untuk langsung melompat ke kotak pencarian jamaah dari halaman mana saja.

### C. VISUALISASI DASHBOARD HIDUP (ANIMATED COUNTERS & BAR PERSENTASE)
1. **Animasi Angka Berjalan (*Smooth Number Counter*):**
   - Angka statistik utama di Dashboard (Total Jamaah, Total KK, Mubaligh, Mutasi) beranimasi menghitung naik secara mulus saat halaman dibuka.
2. **Visual Progress Bar Proporsional:**
   - Kartu Kelompok dan Matriks Kategori Usia dilengkapi *bar indikator visual* beranimasi yang menunjukkan porsi persentase masing-masing kelompok/usia secara nyata.
   - Setiap kartu di Dashboard memiliki efek *hover elevation* (mengangkat halus saat disentuh/diarahkan mouse) dan langsung memfilter data saat diklik.

### D. SAKELAR TEMA GELAP & TERANG (DARK / LIGHT MODE TOGGLE)
1. **Tombol Tema 1-Klik di Header Atas:**
   - Menambahkan tombol ikon Matahari/Bulan SVG di bilah atas untuk beralih antara **Mode Terang (Clean Emerald)** dan **Mode Gelap Elegan (Deep Slate Dark Mode)**.
   - Pilihan tema otomatis tersimpan di memori perangkat dan langsung menyesuaikan kontras seluruh kartu, tabel, dan formulir (sedangkan kertas cetak PDF tetap putih bersih).

### E. TRANSISI HALUS & BOTTOM-SHEET MODAL DI HP
1. **Animasi Perpindahan Halaman & Kartu:**
   - Setiap berpindah tab/menu atau memfilter data, elemen muncul dengan animasi *fade-slide* yang lembut (0.22 detik).
   - Semua tombol memiliki umpan balik sentuhan (*tactile press effect* `scale(0.97)`) sehingga terasa seperti aplikasi native Android/iOS.
2. **Bottom-Sheet Modal di Layar HP:**
   - Di layar HP, jendela pop-up (Modal Tambah/Edit, Detail KK, Profil) muncul meluncur halus dari bawah layar (*native bottom-sheet style*).

---

## 3. Berkas yang Akan Diperbarui

| Berkas | Tindakan | Rincian Perubahan |
| :--- | :--- | :--- |
| `index.html` | Diperbarui | Menambahkan tombol Dark Mode di header, barisan *Quick-Filter Chips*, dan sakelar *Mode Tabel / Mode Kartu* di halaman Database |
| `css/style.css` | Diperbarui | Menambahkan variabel & aturan *Dark Mode*, gaya *Kartu Jamaah Grid*, *Quick-Filter Chips*, animasi *progress bar*, transisi halaman, dan *Bottom-Sheet Modal* HP |
| `js/app.js` | Diperbarui | Menambahkan perender *Kartu Jamaah Interaktif*, logika *Quick-Filter Chips*, *Animated Counter* Dashboard, sakelar *Dark Mode*, tombol WA langsung, dan pintasan `Ctrl + K` |

---

## 4. Gerbang Persetujuan

Rencana peningkatan tampilan super interaktif untuk Laptop & HP (Rev 3.1) sudah siap di atas.  
Jika sudah pas dan siap diterapkan sekarang, silakan ketik:  
👉 **"OKE TERAPKAN"**
