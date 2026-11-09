/**
 * ============================================================================
 * SIDA-JAMAAH v2.0 — Backend Aman (code.gs)
 * Autentikasi Google (ID Token diverifikasi server), RBAC, sesi server,
 * enkripsi data sensitif, sanitasi input, rate limit, audit log.
 *
 * ATURAN KEAMANAN ARSITEKTUR:
 *  - Hanya 4 fungsi PUBLIK yang boleh dipanggil dari luar: doGet, doPost,
 *    apiHandle, getPublicConfig. SEMUA fungsi lain berakhiran "_" (privat)
 *    sehingga tidak bisa dipanggil langsung lewat google.script.run.
 *  - Semua aksi data wajib lewat handleApi_() -> authorize_() (sesi + peran).
 *  - Rahasia (GOOGLE_CLIENT_ID, ADMIN_EMAILS, ENC_KEY, MAC_KEY) hanya di
 *    Script Properties, tidak pernah dikirim ke frontend (kecuali Client ID
 *    yang memang publik by-design pada OAuth).
 * ============================================================================
 */

const APP_VERSION = '2.0';

const SHEET_NAMES = {
  JAMAAH: 'DataJamaah',
  MUTASI: 'LogMutasi',
  SETTING: 'PengaturanDesa',
  AKSES: 'HakAksesPengguna',
  KEGIATAN: 'MasterKegiatan',
  ABSENSI: 'DataAbsensi',
  PENGURUS: 'StrukturPengurus',
  LAPORAN: 'LaporanPengurus',
  LOG: 'LogAktivitas'
};

/* ---------- Konstanta Pemetaan Indeks Kolom (0-based) ---------- */
const COL_JAMAAH = {
  ID: 0, KODE_KK: 1, STATUS_KK: 2, NO_URUT: 3, KELOMPOK: 4, NAMA: 5,
  TEMPAT_LAHIR: 6, TGL_LAHIR: 7, USIA: 8, JK: 9, STATUS_NIKAH: 10,
  PENDIDIKAN: 11, KELAS: 12, LEMBAGA: 13, DAPUKAN: 14, KATEGORI_EKONOMI: 15,
  KATEGORI_USIA: 16, GOLDAR: 17, KEMUBALIGHAN: 18, NO_HP: 19,
  STATUS_AKTIF: 20, UPDATED_AT: 21
};
const JAMAAH_LABELS = [
  'ID', 'Kode KK', 'Peran KK', 'No Urut', 'Kelompok', 'Nama', 'Tempat Lahir',
  'Tgl Lahir', 'Usia', 'JK', 'Status Nikah', 'Pendidikan', 'Kelas', 'Lembaga',
  'Dapukan', 'Ekonomi', 'Kategori Usia', 'Goldar', 'MT/MS', 'No HP',
  'Status', 'Diperbarui'
];
const COL_MUTASI = {
  ID_MUTASI: 0, TANGGAL: 1, JENIS: 2, KATEGORI_MUTASI: 3, ID_JAMAAH: 4,
  NAMA: 5, KELOMPOK: 6, KETERANGAN: 7, DICATAT_OLEH: 8, CREATED_AT: 9
};
const COL_SETTING = { KEY: 0, VALUE: 1 };
const COL_AKSES = {
  EMAIL: 0, NAMA: 1, PERAN: 2, ID_JAMAAH: 3, STATUS: 4, DIBUAT: 5, LOGIN_TERAKHIR: 6
};
const COL_KEGIATAN = {
  ID: 0, TANGGAL: 1, NAMA: 2, JENIS: 3, SASARAN: 4, STATUS: 5,
  DICATAT_OLEH: 6, CREATED_AT: 7
};
const COL_ABSENSI = {
  ID: 0, ID_KEGIATAN: 1, ID_JAMAAH: 2, STATUS: 3, CATATAN: 4,
  DICATAT_OLEH: 5, WAKTU: 6
};
const COL_PENGURUS = {
  ID: 0, JABATAN: 1, URUTAN: 2, ID_JAMAAH: 3, NAMA: 4, KELOMPOK: 5,
  TUPOKSI: 6, EMAIL: 7, STATUS: 8, UPDATED_AT: 9
};
const COL_LAPORAN = {
  ID: 0, TANGGAL: 1, ID_PENGURUS: 2, NAMA: 3, JABATAN: 4, PERIODE: 5,
  JUDUL: 6, ISI: 7, STATUS: 8, CATATAN_ADMIN: 9, DIBUAT_OLEH: 10, UPDATED_AT: 11
};
const COL_LOG = {
  ID: 0, WAKTU: 1, EMAIL: 2, NAMA: 3, PERAN: 4, AKSI: 5, MODUL: 6, DETAIL: 7
};

/* ---------- Enumerasi & Batas ---------- */
const KELOMPOK_LIST = ['Al Awwabin 1', 'Al Awwabin 2', 'Kencana 1', 'Kencana 2'];
const PREFIX_KK = { 'Al Awwabin 1': 'AA1', 'Al Awwabin 2': 'AA2', 'Kencana 1': 'KC1', 'Kencana 2': 'KC2' };
const ROLES = ['admin', 'pengurus', 'anggota'];
const STATUS_NIKAH_LIST = ['Belum', 'Menikah', 'Janda', 'Duda'];
const STATUS_AKTIF_LIST = ['Aktif', 'Pindah Keluar', 'Wafat'];
const KATEGORI_USIA_LIST = ['BALITA', 'CABERAWIT', 'REMAJA / MUDA-MUDI', 'PRA NIKAH', 'USIA NIKAH', 'DEWASA', 'LANSIA'];
const STATUS_ABSEN_LIST = ['Hadir', 'Izin', 'Sakit', 'Alpa'];
const JENIS_KEGIATAN_LIST = ['Pengajian Rutin', 'Musyawarah Desa', 'Rapat Pengurus', 'Kerja Bakti', 'Lainnya'];

const SESSION_IDLE_SEC = 20 * 60;          // timeout tidak aktif: 20 menit
const SESSION_MAX_MS = 6 * 60 * 60 * 1000; // masa hidup mutlak sesi: 6 jam
const MAX_REQUEST_BYTES = 2000000;         // batas ukuran request
const ENC_PREFIX = 'enc:v1:';

/* ============================================================================
 * ENTRY POINT PUBLIK (satu-satunya yang boleh dipanggil dari luar)
 * ========================================================================== */

function doGet(e) {
  ensureDatabaseInitialized_();
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('SIDA-JAMAAH | Sistem Database & Administrasi Sekretaris Desa')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL) // Kompatibel penuh dengan WebView Android & PWA
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
}

/** Endpoint JSON untuk frontend yang di-hosting terpisah (fetch POST text/plain). */
function doPost(e) {
  var out;
  try {
    var raw = e && e.postData ? String(e.postData.contents || '') : '';
    if (!raw || raw.length > MAX_REQUEST_BYTES) {
      out = { success: false, code: 'BAD_REQUEST', message: 'Permintaan tidak valid.' };
    } else {
      out = handleApi_(JSON.parse(raw));
    }
  } catch (err) {
    out = { success: false, code: 'BAD_REQUEST', message: 'Permintaan tidak valid.' };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** Pintu masuk untuk google.script.run: menerima string JSON, mengembalikan objek. */
function apiHandle(requestJson) {
  try {
    var raw = String(requestJson || '');
    if (!raw || raw.length > MAX_REQUEST_BYTES) {
      return { success: false, code: 'BAD_REQUEST', message: 'Permintaan tidak valid.' };
    }
    return handleApi_(JSON.parse(raw));
  } catch (err) {
    return { success: false, code: 'BAD_REQUEST', message: 'Permintaan tidak valid.' };
  }
}

/** Konfigurasi publik pra-login. Client ID OAuth memang publik by-design. */
function getPublicConfig() {
  return {
    success: true,
    appVersion: APP_VERSION,
    clientId: getProp_('GOOGLE_CLIENT_ID') || '',
    idleTimeoutSec: SESSION_IDLE_SEC
  };
}

/* ============================================================================
 * ROUTER + OTORISASI
 * ========================================================================== */

function getRoutes_() {
  return {
    bootstrap:      { roles: ['admin', 'pengurus', 'anggota'], mut: false, fn: actBootstrap_ },
    saveJamaah:     { roles: ['admin'], mut: true, fn: actSaveJamaah_ },
    deleteJamaah:   { roles: ['admin'], mut: true, fn: actDeleteJamaah_ },
    catatMutasi:    { roles: ['admin'], mut: true, fn: actCatatMutasi_ },
    importCsv:      { roles: ['admin'], mut: true, fn: actImportCsv_ },
    saveSettings:   { roles: ['admin'], mut: true, fn: actSaveSettings_ },
    saveKegiatan:   { roles: ['admin', 'pengurus'], mut: true, fn: actSaveKegiatan_ },
    deleteKegiatan: { roles: ['admin'], mut: true, fn: actDeleteKegiatan_ },
    saveAbsensi:    { roles: ['admin', 'pengurus'], mut: true, fn: actSaveAbsensi_ },
    selfCheckin:    { roles: ['admin', 'pengurus', 'anggota'], mut: true, fn: actSelfCheckin_ },
    savePengurus:   { roles: ['admin'], mut: true, fn: actSavePengurus_ },
    deletePengurus: { roles: ['admin'], mut: true, fn: actDeletePengurus_ },
    saveLaporan:    { roles: ['admin', 'pengurus'], mut: true, fn: actSaveLaporan_ },
    reviewLaporan:  { roles: ['admin'], mut: true, fn: actReviewLaporan_ },
    deleteLaporan:  { roles: ['admin', 'pengurus'], mut: true, fn: actDeleteLaporan_ },
    listUsers:      { roles: ['admin'], mut: false, fn: actListUsers_ },
    saveUser:       { roles: ['admin'], mut: true, fn: actSaveUser_ },
    listAudit:      { roles: ['admin'], mut: false, fn: actListAudit_ },
    logPrint:       { roles: ['admin', 'pengurus'], mut: true, fn: actLogPrint_ }
  };
}

function handleApi_(req) {
  var action = '';
  try {
    if (!req || typeof req !== 'object') fail_('Permintaan tidak valid.', 'BAD_REQUEST');
    action = String(req.action || '');

    if (action === 'login') return actLogin_(req);
    if (action === 'logout') return actLogout_(req);

    var routes = getRoutes_();
    var route = routes[action];
    if (!route) fail_('Aksi tidak dikenal.', 'BAD_REQUEST');

    var ctx = authorize_(req, route);
    var result = route.fn(ctx, req.payload || {});
    result = result || {};
    result.success = true;
    return result;
  } catch (err) {
    if (err && err.isApp) {
      return { success: false, code: err.code || 'ERROR', message: err.message };
    }
    console.error('Galat internal pada aksi ' + action + ': ' + (err && err.stack ? err.stack : err));
    return { success: false, code: 'INTERNAL', message: 'Terjadi kesalahan pada server. Coba lagi atau hubungi admin.' };
  }
}

function fail_(message, code) {
  var e = new Error(message);
  e.isApp = true;
  e.code = code || 'ERROR';
  throw e;
}

function authorize_(req, route) {
  var token = String(req.token || '');
  if (!token || token.length > 200) fail_('Sesi berakhir. Silakan login kembali.', 'UNAUTHENTICATED');

  var cache = CacheService.getScriptCache();
  var key = 'sess:' + sha256Hex_(token);
  var raw = cache.get(key);
  if (!raw) fail_('Sesi berakhir. Silakan login kembali.', 'UNAUTHENTICATED');

  var sess = JSON.parse(raw);
  if (Date.now() - sess.createdAt > SESSION_MAX_MS) {
    cache.remove(key);
    fail_('Sesi telah mencapai batas waktu. Silakan login kembali.', 'UNAUTHENTICATED');
  }

  // Peran & status SELALU dicek ulang dari sheet (pencabutan akses langsung berlaku).
  var access = getUserAccess_(sess.email);
  if (!access || access.status !== 'Aktif') {
    cache.remove(key);
    fail_('Akses akun ini telah dinonaktifkan.', 'FORBIDDEN');
  }

  // Batasi laju permintaan per pengguna: 180 permintaan / menit.
  if (hitCounter_('rl:' + sess.email, 180, 60)) {
    fail_('Terlalu banyak permintaan. Mohon tunggu sebentar.', 'RATE_LIMIT');
  }

  // Sliding idle timeout
  sess.lastSeen = Date.now();
  cache.put(key, JSON.stringify(sess), SESSION_IDLE_SEC);

  var ctx = {
    email: access.email,
    name: access.nama || sess.name,
    picture: sess.picture,
    role: access.peran,
    idJamaah: access.idJamaah,
    sessKey: key
  };

  if (route.mut) {
    if (!constTimeEq_(String(req.csrf || ''), String(sess.csrf || ''))) {
      audit_(ctx, 'CSRF_DITOLAK', 'Keamanan', 'Token CSRF tidak cocok.');
      fail_('Permintaan ditolak (verifikasi keamanan gagal).', 'FORBIDDEN');
    }
  }
  if (route.roles.indexOf(ctx.role) === -1) {
    audit_(ctx, 'AKSES_DITOLAK', 'Keamanan', 'Aksi ' + String(req.action) + ' tidak diizinkan untuk peran ' + ctx.role);
    fail_('Anda tidak memiliki hak untuk aksi ini.', 'FORBIDDEN');
  }
  return ctx;
}

/* ============================================================================
 * LOGIN / LOGOUT (Google Identity Services -> verifikasi ID Token di server)
 * ========================================================================== */

function actLogin_(req) {
  var idToken = String(req.idToken || '');
  if (!idToken || idToken.length > 4096) fail_('Token login tidak valid.', 'UNAUTHENTICATED');

  if (isCounterOver_('login:global', 20)) {
    fail_('Terlalu banyak percobaan login gagal. Coba lagi dalam beberapa menit.', 'RATE_LIMIT');
  }

  var info = verifyGoogleIdToken_(idToken);
  if (!info) {
    hitCounter_('login:global', 20, 600);
    audit_({ email: '-', name: '-', role: '-' }, 'LOGIN_GAGAL', 'Autentikasi', 'Token Google tidak valid / kedaluwarsa.');
    fail_('Verifikasi akun Google gagal. Silakan coba lagi.', 'UNAUTHENTICATED');
  }

  var email = String(info.email).toLowerCase();
  if (isCounterOver_('login:' + email, 5)) {
    fail_('Terlalu banyak percobaan untuk akun ini. Coba lagi dalam 15 menit.', 'RATE_LIMIT');
  }

  var access = getUserAccess_(email);
  if (!access || access.status !== 'Aktif') {
    hitCounter_('login:' + email, 5, 900);
    audit_({ email: email, name: info.name, role: '-' }, 'LOGIN_DITOLAK', 'Autentikasi', 'Akun Google belum terdaftar / nonaktif.');
    fail_('Akun Google ' + email + ' belum terdaftar. Hubungi Sekretaris/Admin untuk didaftarkan.', 'FORBIDDEN');
  }

  var token = randomToken_();
  var csrf = randomToken_();
  var sess = {
    email: email,
    name: info.name,
    picture: info.picture,
    csrf: csrf,
    createdAt: Date.now(),
    lastSeen: Date.now()
  };
  CacheService.getScriptCache().put('sess:' + sha256Hex_(token), JSON.stringify(sess), SESSION_IDLE_SEC);

  touchLastLogin_(email);
  var ctx = { email: email, name: access.nama || info.name, role: access.peran };
  audit_(ctx, 'LOGIN', 'Autentikasi', 'Login berhasil.');

  return {
    success: true,
    token: token,
    csrf: csrf,
    idleTimeoutSec: SESSION_IDLE_SEC,
    user: {
      email: email,
      name: access.nama || info.name,
      picture: safePictureUrl_(info.picture),
      role: access.peran,
      idJamaah: access.idJamaah
    }
  };
}

function actLogout_(req) {
  var token = String(req.token || '');
  if (token && token.length <= 200) {
    var cache = CacheService.getScriptCache();
    var key = 'sess:' + sha256Hex_(token);
    var raw = cache.get(key);
    if (raw) {
      try {
        var s = JSON.parse(raw);
        audit_({ email: s.email, name: s.name, role: '-' }, 'LOGOUT', 'Autentikasi', 'Sesi dihapus dari server.');
      } catch (e) { /* abaikan */ }
      cache.remove(key);
    }
  }
  return { success: true };
}

function verifyGoogleIdToken_(idToken) {
  var clientId = getProp_('GOOGLE_CLIENT_ID');
  if (!clientId) {
    console.error('GOOGLE_CLIENT_ID belum diatur di Script Properties.');
    return null;
  }
  try {
    var resp = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
      { muteHttpExceptions: true }
    );
    if (resp.getResponseCode() !== 200) return null;
    var d = JSON.parse(resp.getContentText());
    if (d.aud !== clientId) return null;
    if (d.iss !== 'accounts.google.com' && d.iss !== 'https://accounts.google.com') return null;
    if (Number(d.exp) * 1000 < Date.now()) return null;
    if (String(d.email_verified) !== 'true') return null;
    if (!d.email) return null;
    return { email: String(d.email), name: String(d.name || d.email), picture: String(d.picture || '') };
  } catch (err) {
    console.error('verifyGoogleIdToken_: ' + err);
    return null;
  }
}

function safePictureUrl_(url) {
  var u = String(url || '');
  return /^https:\/\/[a-z0-9\-]+\.googleusercontent\.com\//i.test(u) ? u : '';
}

/* ============================================================================
 * HAK AKSES PENGGUNA (RBAC)
 * ========================================================================== */

function getUserAccess_(email) {
  email = String(email || '').toLowerCase();
  if (!email) return null;
  var sheet = sheet_(SHEET_NAMES.AKSES);
  if (!sheet) return null;
  var last = sheet.getLastRow();
  if (last > 1) {
    var vals = sheet.getRange(2, 1, last - 1, 7).getDisplayValues();
    for (var i = 0; i < vals.length; i++) {
      if (String(vals[i][COL_AKSES.EMAIL]).toLowerCase() === email) {
        var peran = String(vals[i][COL_AKSES.PERAN]).toLowerCase();
        if (ROLES.indexOf(peran) === -1) peran = 'anggota';
        return {
          row: i + 2,
          email: email,
          nama: String(vals[i][COL_AKSES.NAMA]),
          peran: peran,
          idJamaah: String(vals[i][COL_AKSES.ID_JAMAAH]),
          status: String(vals[i][COL_AKSES.STATUS]) || 'Aktif'
        };
      }
    }
  }
  // Bootstrap admin pertama dari Script Properties (ADMIN_EMAILS).
  var boot = String(getProp_('ADMIN_EMAILS') || '').toLowerCase().split(',');
  for (var b = 0; b < boot.length; b++) {
    if (boot[b].trim() === email) {
      var now = getNowTimestamp_();
      sheet.appendRow([email, '', 'admin', '', 'Aktif', now, '']);
      SpreadsheetApp.flush();
      return { row: sheet.getLastRow(), email: email, nama: '', peran: 'admin', idJamaah: '', status: 'Aktif' };
    }
  }
  return null;
}

function touchLastLogin_(email) {
  var a = getUserAccess_(email);
  if (!a) return;
  sheet_(SHEET_NAMES.AKSES).getRange(a.row, COL_AKSES.LOGIN_TERAKHIR + 1).setValue(getNowTimestamp_());
}

/* ============================================================================
 * UTILITAS UMUM
 * ========================================================================== */

function getProp_(name) {
  return PropertiesService.getScriptProperties().getProperty(name);
}

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name) {
  return ss_().getSheetByName(name);
}

function getNowTimestamp_() {
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
}

function getTodayStr_() {
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
}

function getPeriodYYYYMM_() {
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMM');
}

function ensureDatabaseInitialized_() {
  var ss = ss_();
  if (!ss) return;
  if (!ss.getSheetByName(SHEET_NAMES.JAMAAH) || !ss.getSheetByName(SHEET_NAMES.LOG) ||
      !ss.getSheetByName(SHEET_NAMES.AKSES)) {
    if (typeof setupDatabaseInternal_ === 'function') setupDatabaseInternal_();
  }
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Kriptografi ringan (HMAC-SHA256) ---------- */

function toSigned_(v) {
  v = v & 255;
  return v > 127 ? v - 256 : v;
}

function sha256Hex_(s) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8);
  var out = '';
  for (var i = 0; i < d.length; i++) {
    var h = (d[i] & 255).toString(16);
    out += h.length < 2 ? '0' + h : h;
  }
  return out;
}

function randomToken_() {
  return sha256Hex_(Utilities.getUuid() + Utilities.getUuid() + String(Date.now()) + Utilities.getUuid());
}

function randomBytes_(n) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    Utilities.getUuid() + Utilities.getUuid() + String(Date.now()), Utilities.Charset.UTF_8);
  return d.slice(0, n);
}

function constTimeEq_(a, b) {
  a = String(a);
  b = String(b);
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function keystream_(encKey, iv, len) {
  var out = [];
  var counter = 0;
  while (out.length < len) {
    var ctr = [(counter >>> 24) & 255, (counter >>> 16) & 255, (counter >>> 8) & 255, counter & 255].map(toSigned_);
    var block = Utilities.computeHmacSha256Signature(iv.concat(ctr), encKey);
    for (var i = 0; i < block.length && out.length < len; i++) out.push(block[i]);
    counter++;
  }
  return out;
}

/** Enkripsi field sensitif at-rest: HMAC-CTR + HMAC tag (encrypt-then-MAC). */
function encryptField_(plain) {
  var s = String(plain === undefined || plain === null ? '' : plain);
  if (!s) return '';
  if (s.indexOf(ENC_PREFIX) === 0) return s;
  var encKeyB64 = getProp_('ENC_KEY');
  var macKeyB64 = getProp_('MAC_KEY');
  if (!encKeyB64 || !macKeyB64) fail_('Kunci enkripsi belum disiapkan. Jalankan setupDatabase dari editor Apps Script.', 'CONFIG');
  var encKey = Utilities.base64Decode(encKeyB64);
  var macKey = Utilities.base64Decode(macKeyB64);
  var iv = randomBytes_(16);
  var data = Utilities.newBlob(s).getBytes();
  var ks = keystream_(encKey, iv, data.length);
  var ct = [];
  for (var i = 0; i < data.length; i++) ct.push(toSigned_(data[i] ^ ks[i]));
  var mac = Utilities.computeHmacSha256Signature(iv.concat(ct), macKey);
  return ENC_PREFIX + Utilities.base64Encode(iv) + '.' + Utilities.base64Encode(ct) + '.' + Utilities.base64Encode(mac);
}

function decryptField_(stored) {
  var s = String(stored === undefined || stored === null ? '' : stored);
  if (!s) return '';
  if (s.indexOf(ENC_PREFIX) !== 0) return s; // data lama (belum dimigrasi)
  try {
    var parts = s.substring(ENC_PREFIX.length).split('.');
    if (parts.length !== 3) return '';
    var encKey = Utilities.base64Decode(getProp_('ENC_KEY'));
    var macKey = Utilities.base64Decode(getProp_('MAC_KEY'));
    var iv = Utilities.base64Decode(parts[0]);
    var ct = Utilities.base64Decode(parts[1]);
    var mac = Utilities.base64Encode(Utilities.computeHmacSha256Signature(iv.concat(ct), macKey));
    if (!constTimeEq_(mac, parts[2])) return '';
    var ks = keystream_(encKey, iv, ct.length);
    var pt = [];
    for (var i = 0; i < ct.length; i++) pt.push(toSigned_(ct[i] ^ ks[i]));
    return Utilities.newBlob(pt).getDataAsString('UTF-8');
  } catch (err) {
    return '';
  }
}

/* ---------- Rate limit berbasis CacheService ---------- */

/** Menambah hitungan; true bila SUDAH melewati batas. */
function hitCounter_(key, limit, windowSec) {
  var cache = CacheService.getScriptCache();
  var k = 'ctr:' + key;
  var n = parseInt(cache.get(k) || '0', 10) + 1;
  cache.put(k, String(n), windowSec);
  return n > limit;
}

function isCounterOver_(key, limit) {
  var n = parseInt(CacheService.getScriptCache().get('ctr:' + key) || '0', 10);
  return n >= limit;
}

/* ---------- Sanitasi & Validasi Input ---------- */

function cleanText_(v, max) {
  var s = String(v === undefined || v === null ? '' : v)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s.length > max ? s.substring(0, max) : s;
}

function cleanMultiline_(v, max) {
  var s = String(v === undefined || v === null ? '' : v)
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ')
    .trim();
  return s.length > max ? s.substring(0, max) : s;
}

/** Cegah Spreadsheet Formula Injection: awalan = + - @ diberi apostrof. */
function cellSafe_(v) {
  var s = String(v === undefined || v === null ? '' : v);
  if (s && /^[=+\-@\t\r]/.test(s)) return "'" + s;
  return s;
}

function pick_(v, list, def) {
  var s = String(v === undefined || v === null ? '' : v).trim();
  for (var i = 0; i < list.length; i++) {
    if (list[i].toLowerCase() === s.toLowerCase()) return list[i];
  }
  return def;
}

function isValidDateStr_(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  var p = s.split('-');
  var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  return d.getFullYear() === parseInt(p[0], 10) &&
         d.getMonth() === parseInt(p[1], 10) - 1 &&
         d.getDate() === parseInt(p[2], 10);
}

function isValidEmail_(s) {
  return /^[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9.\-]{1,190}\.[A-Za-z]{2,}$/.test(String(s || ''));
}

function isValidId_(s, prefix) {
  return new RegExp('^' + prefix + '-\\d{6}-\\d{3,}$').test(String(s || ''));
}

function calculateAgeFromDate_(tgl) {
  if (!isValidDateStr_(tgl)) return null;
  var p = tgl.split('-');
  var now = new Date();
  var age = now.getFullYear() - parseInt(p[0], 10);
  var m = now.getMonth() - (parseInt(p[1], 10) - 1);
  if (m < 0 || (m === 0 && now.getDate() < parseInt(p[2], 10))) age--;
  return age >= 0 ? age : 0;
}

function determineKategoriUsia_(usia, statusNikah, pendidikan) {
  var sn = String(statusNikah || '').toUpperCase();
  var married = sn === 'MENIKAH' || sn === 'JANDA' || sn === 'DUDA';
  var u = (usia !== '' && usia !== null && !isNaN(parseInt(usia, 10))) ? parseInt(usia, 10) : null;
  if (u !== null) {
    if (u >= 60) return 'LANSIA';
    if (married) return 'DEWASA';
    if (u <= 4) return 'BALITA';
    if (u <= 12) return 'CABERAWIT';
    if (u <= 18) return 'REMAJA / MUDA-MUDI';
    if (u <= 22) return 'PRA NIKAH';
    return 'USIA NIKAH';
  }
  if (married) return 'DEWASA';
  if (/S1|S2|S3|D3|D4|KULIAH/i.test(String(pendidikan || ''))) return 'USIA NIKAH';
  return 'DEWASA';
}

function validateJamaah_(p) {
  var nama = cleanText_(p.nama, 100);
  if (!nama) fail_('Nama lengkap wajib diisi.', 'VALIDATION');
  var kelompok = pick_(p.kelompok, KELOMPOK_LIST, null);
  if (!kelompok) fail_('Kelompok tidak valid.', 'VALIDATION');

  var kodeKK = cleanText_(p.kodeKK, 12).toUpperCase();
  if (kodeKK && !/^[A-Z0-9]{2,4}-KK\d{2,3}$/.test(kodeKK)) fail_('Format Kode KK tidak valid (contoh: AA1-KK01).', 'VALIDATION');
  if (!kodeKK) kodeKK = PREFIX_KK[kelompok] + '-KK99';

  var tgl = cleanText_(p.tglLahir, 10);
  if (tgl && !isValidDateStr_(tgl)) fail_('Format tanggal lahir tidak valid.', 'VALIDATION');
  if (tgl && tgl > getTodayStr_()) fail_('Tanggal lahir tidak boleh di masa depan.', 'VALIDATION');

  var usia = '';
  var usiaRaw = String(p.usia === undefined || p.usia === null ? '' : p.usia).trim();
  if (usiaRaw !== '') {
    var un = parseInt(usiaRaw, 10);
    if (isNaN(un) || un < 0 || un > 120) fail_('Usia harus 0 sampai 120.', 'VALIDATION');
    usia = un;
  } else if (tgl) {
    var calc = calculateAgeFromDate_(tgl);
    if (calc !== null) usia = calc;
  }

  var statusNikah = pick_(p.statusNikah, STATUS_NIKAH_LIST, 'Belum');
  var pendidikan = cleanText_(p.pendidikan, 30);
  var katRaw = String(p.kategoriUsia || '').trim();
  var kategoriUsia = pick_(katRaw, KATEGORI_USIA_LIST, null) || determineKategoriUsia_(usia, statusNikah, pendidikan);

  var noHp = cleanText_(p.noHp, 20);
  if (noHp && !/^[+0-9][0-9 \-]{5,19}$/.test(noHp)) fail_('Format nomor HP tidak valid.', 'VALIDATION');

  var goldar = cleanText_(p.goldar, 3).toUpperCase();
  if (goldar && !/^(A|B|AB|O)[+\-]?$/.test(goldar)) goldar = '';

  return {
    kodeKK: kodeKK,
    statusKK: pick_(p.statusKK, ['Kepala Keluarga', 'Anggota'], 'Anggota'),
    kelompok: kelompok,
    nama: nama,
    tempatLahir: cleanText_(p.tempatLahir, 60),
    tglLahir: tgl,
    usia: usia,
    jk: pick_(p.jk, ['L', 'P'], 'L'),
    statusNikah: statusNikah,
    pendidikan: pendidikan,
    kelas: cleanText_(p.kelas, 20),
    lembaga: cleanText_(p.lembaga, 50),
    dapukan: cleanText_(p.dapukan, 60),
    kategoriEkonomi: pick_(p.kategoriEkonomi, ['Aghnia', 'Dhuafa'], ''),
    kategoriUsia: kategoriUsia,
    goldar: goldar,
    kemubalighan: pick_(p.kemubalighan, ['MT', 'MS'], ''),
    noHp: noHp,
    statusAktif: pick_(p.statusAktif, STATUS_AKTIF_LIST, 'Aktif')
  };
}

function jamaahToRow_(v, id, noUrut, nowStr) {
  return [
    id, v.kodeKK, v.statusKK, noUrut, v.kelompok,
    cellSafe_(v.nama), cellSafe_(v.tempatLahir), v.tglLahir, v.usia, v.jk, v.statusNikah,
    cellSafe_(v.pendidikan), cellSafe_(v.kelas), cellSafe_(v.lembaga), cellSafe_(v.dapukan),
    v.kategoriEkonomi, v.kategoriUsia, v.goldar, v.kemubalighan,
    encryptField_(v.noHp), v.statusAktif, nowStr
  ];
}

/* ---------- Generator ID Unik Sekuensial (MAX + 1 periode berjalan) ---------- */

function getMaxSeq_(sheet, colIndex, prefix) {
  var period = getPeriodYYYYMM_();
  var head = prefix + '-' + period + '-';
  var last = sheet.getLastRow();
  var maxSeq = 0;
  if (last > 1) {
    var vals = sheet.getRange(2, colIndex + 1, last - 1, 1).getDisplayValues();
    for (var i = 0; i < vals.length; i++) {
      var c = String(vals[i][0] || '').trim();
      if (c.indexOf(head) === 0) {
        var n = parseInt(c.substring(head.length), 10);
        if (!isNaN(n) && n > maxSeq) maxSeq = n;
      }
    }
  }
  return maxSeq;
}

function formatId_(prefix, seq) {
  var s = String(seq);
  while (s.length < 3) s = '0' + s;
  return prefix + '-' + getPeriodYYYYMM_() + '-' + s;
}

function nextId_(sheet, colIndex, prefix) {
  return formatId_(prefix, getMaxSeq_(sheet, colIndex, prefix) + 1);
}

/* ============================================================================
 * JEJAK AKTIVITAS (AUDIT LOG)
 * ========================================================================== */

function audit_(ctx, aksi, modul, detail) {
  try {
    var sheet = sheet_(SHEET_NAMES.LOG);
    if (!sheet) return;
    var stamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMddHHmmss');
    var id = 'LOG-' + stamp + '-' + sha256Hex_(Utilities.getUuid()).substring(0, 5).toUpperCase();
    sheet.appendRow([
      id,
      getNowTimestamp_(),
      cellSafe_(cleanText_(ctx && ctx.email, 120)),
      cellSafe_(cleanText_(ctx && ctx.name, 80)),
      cellSafe_(cleanText_(ctx && ctx.role, 20)),
      cellSafe_(cleanText_(aksi, 30)),
      cellSafe_(cleanText_(modul, 40)),
      cellSafe_(cleanText_(detail, 500))
    ]);
  } catch (err) {
    console.error('audit_ gagal: ' + err);
  }
}

function diffJamaah_(oldRow, newRow) {
  var changes = [];
  for (var i = 0; i < JAMAAH_LABELS.length; i++) {
    if (i === COL_JAMAAH.UPDATED_AT || i === COL_JAMAAH.ID) continue;
    var a = String(oldRow[i] === undefined ? '' : oldRow[i]);
    var b = String(newRow[i] === undefined ? '' : newRow[i]);
    if (a !== b) {
      if (i === COL_JAMAAH.NO_HP) {
        // Nilai sensitif tidak dicatat di log.
        if (decryptField_(a) !== decryptField_(b)) changes.push('No HP diubah');
      } else {
        changes.push(JAMAAH_LABELS[i] + ': "' + a.substring(0, 40) + '" -> "' + b.substring(0, 40) + '"');
      }
    }
  }
  return changes.join('; ');
}

/* ============================================================================
 * PEMBACA DATA (getDisplayValues, Index-Based)
 * ========================================================================== */

function readRange_(sheetName, ncols) {
  var sheet = sheet_(sheetName);
  if (!sheet) return [];
  var last = sheet.getLastRow();
  if (last <= 1) return [];
  return sheet.getRange(2, 1, last - 1, ncols).getDisplayValues();
}

function rowToJamaah_(row, rowNumber) {
  var usiaN = parseInt(row[COL_JAMAAH.USIA], 10);
  return {
    rowNumber: rowNumber,
    id: String(row[COL_JAMAAH.ID]).trim(),
    kodeKK: String(row[COL_JAMAAH.KODE_KK]).trim(),
    statusKK: String(row[COL_JAMAAH.STATUS_KK]).trim() || 'Anggota',
    noUrut: parseInt(row[COL_JAMAAH.NO_URUT], 10) || 0,
    kelompok: String(row[COL_JAMAAH.KELOMPOK]).trim(),
    nama: String(row[COL_JAMAAH.NAMA]).trim(),
    tempatLahir: String(row[COL_JAMAAH.TEMPAT_LAHIR]).trim(),
    tglLahir: String(row[COL_JAMAAH.TGL_LAHIR]).trim(),
    usia: isNaN(usiaN) ? '' : usiaN,
    jk: String(row[COL_JAMAAH.JK]).trim().toUpperCase(),
    statusNikah: String(row[COL_JAMAAH.STATUS_NIKAH]).trim(),
    pendidikan: String(row[COL_JAMAAH.PENDIDIKAN]).trim(),
    kelas: String(row[COL_JAMAAH.KELAS]).trim(),
    lembaga: String(row[COL_JAMAAH.LEMBAGA]).trim(),
    dapukan: String(row[COL_JAMAAH.DAPUKAN]).trim(),
    kategoriEkonomi: String(row[COL_JAMAAH.KATEGORI_EKONOMI]).trim(),
    kategoriUsia: String(row[COL_JAMAAH.KATEGORI_USIA]).trim(),
    goldar: String(row[COL_JAMAAH.GOLDAR]).trim().toUpperCase(),
    kemubalighan: String(row[COL_JAMAAH.KEMUBALIGHAN]).trim().toUpperCase(),
    noHp: decryptField_(row[COL_JAMAAH.NO_HP]),
    statusAktif: String(row[COL_JAMAAH.STATUS_AKTIF]).trim() || 'Aktif',
    updatedAt: String(row[COL_JAMAAH.UPDATED_AT]).trim()
  };
}

function readJamaahForCtx_(ctx) {
  var vals = readRange_(SHEET_NAMES.JAMAAH, 22);
  var all = [];
  for (var i = 0; i < vals.length; i++) {
    if (!vals[i][COL_JAMAAH.ID] && !vals[i][COL_JAMAAH.NAMA]) continue;
    all.push(rowToJamaah_(vals[i], i + 2));
  }
  if (ctx.role !== 'anggota') return all;
  // Anggota hanya boleh melihat keluarganya sendiri (satu Kode KK).
  var myKK = '';
  for (var j = 0; j < all.length; j++) {
    if (all[j].id === ctx.idJamaah) { myKK = all[j].kodeKK; break; }
  }
  if (!myKK) return [];
  return all.filter(function (r) { return r.kodeKK === myKK; });
}

function readMutasi_() {
  var vals = readRange_(SHEET_NAMES.MUTASI, 10);
  var res = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (!r[COL_MUTASI.ID_MUTASI] && !r[COL_MUTASI.NAMA]) continue;
    res.push({
      idMutasi: String(r[COL_MUTASI.ID_MUTASI]), tanggal: String(r[COL_MUTASI.TANGGAL]),
      jenis: String(r[COL_MUTASI.JENIS]).toUpperCase(), kategoriMutasi: String(r[COL_MUTASI.KATEGORI_MUTASI]),
      idJamaah: String(r[COL_MUTASI.ID_JAMAAH]), nama: String(r[COL_MUTASI.NAMA]),
      kelompok: String(r[COL_MUTASI.KELOMPOK]), keterangan: String(r[COL_MUTASI.KETERANGAN]),
      dicatatOleh: String(r[COL_MUTASI.DICATAT_OLEH]), createdAt: String(r[COL_MUTASI.CREATED_AT])
    });
  }
  res.reverse();
  return res;
}

function readSettings_() {
  var defaults = {
    NAMA_DESA: 'Desa Al Awwabin - Kencana',
    SUBJUDUL_KOP: 'Sekretariat Pengurus Jamaah Desa — Sistem Informasi Database Terpadu',
    ALAMAT_SEKRETARIAT: 'Bandung, Jawa Barat',
    KOTA_TTD: 'Bandung',
    NAMA_KIDES: 'Bp. H. Wahyu',
    NAMA_SEKRETARIS: 'Sekretaris Desa'
  };
  var vals = readRange_(SHEET_NAMES.SETTING, 2);
  for (var i = 0; i < vals.length; i++) {
    var k = String(vals[i][COL_SETTING.KEY]).trim();
    if (k && defaults.hasOwnProperty(k)) defaults[k] = String(vals[i][COL_SETTING.VALUE]).trim();
  }
  return defaults;
}

function readKegiatan_() {
  var vals = readRange_(SHEET_NAMES.KEGIATAN, 8);
  var res = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (!r[COL_KEGIATAN.ID]) continue;
    res.push({
      id: String(r[COL_KEGIATAN.ID]), tanggal: String(r[COL_KEGIATAN.TANGGAL]),
      nama: String(r[COL_KEGIATAN.NAMA]), jenis: String(r[COL_KEGIATAN.JENIS]),
      sasaran: String(r[COL_KEGIATAN.SASARAN]) || 'Semua', status: String(r[COL_KEGIATAN.STATUS]) || 'Buka',
      dicatatOleh: String(r[COL_KEGIATAN.DICATAT_OLEH])
    });
  }
  res.sort(function (a, b) { return a.tanggal < b.tanggal ? 1 : (a.tanggal > b.tanggal ? -1 : 0); });
  return res;
}

function readAbsensiForCtx_(ctx) {
  var vals = readRange_(SHEET_NAMES.ABSENSI, 7);
  var res = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (!r[COL_ABSENSI.ID]) continue;
    if (ctx.role === 'anggota' && String(r[COL_ABSENSI.ID_JAMAAH]) !== ctx.idJamaah) continue;
    res.push({
      id: String(r[COL_ABSENSI.ID]), idKegiatan: String(r[COL_ABSENSI.ID_KEGIATAN]),
      idJamaah: String(r[COL_ABSENSI.ID_JAMAAH]), status: String(r[COL_ABSENSI.STATUS]),
      catatan: String(r[COL_ABSENSI.CATATAN]), dicatatOleh: String(r[COL_ABSENSI.DICATAT_OLEH]),
      waktu: String(r[COL_ABSENSI.WAKTU])
    });
  }
  return res;
}

function readPengurusForCtx_(ctx) {
  var vals = readRange_(SHEET_NAMES.PENGURUS, 10);
  var res = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (!r[COL_PENGURUS.ID]) continue;
    res.push({
      id: String(r[COL_PENGURUS.ID]), jabatan: String(r[COL_PENGURUS.JABATAN]),
      urutan: parseInt(r[COL_PENGURUS.URUTAN], 10) || 999, idJamaah: String(r[COL_PENGURUS.ID_JAMAAH]),
      nama: String(r[COL_PENGURUS.NAMA]), kelompok: String(r[COL_PENGURUS.KELOMPOK]),
      tupoksi: String(r[COL_PENGURUS.TUPOKSI]),
      email: ctx.role === 'anggota' ? '' : String(r[COL_PENGURUS.EMAIL]),
      status: String(r[COL_PENGURUS.STATUS]) || 'Aktif'
    });
  }
  res.sort(function (a, b) { return a.urutan - b.urutan; });
  return res;
}

function readLaporanForCtx_(ctx) {
  if (ctx.role === 'anggota') return [];
  var vals = readRange_(SHEET_NAMES.LAPORAN, 12);
  var res = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (!r[COL_LAPORAN.ID]) continue;
    var owner = String(r[COL_LAPORAN.DIBUAT_OLEH]).toLowerCase();
    if (ctx.role === 'pengurus' && owner !== ctx.email) continue;
    res.push({
      id: String(r[COL_LAPORAN.ID]), tanggal: String(r[COL_LAPORAN.TANGGAL]),
      idPengurus: String(r[COL_LAPORAN.ID_PENGURUS]), nama: String(r[COL_LAPORAN.NAMA]),
      jabatan: String(r[COL_LAPORAN.JABATAN]), periode: String(r[COL_LAPORAN.PERIODE]),
      judul: String(r[COL_LAPORAN.JUDUL]), isi: String(r[COL_LAPORAN.ISI]),
      status: String(r[COL_LAPORAN.STATUS]), catatanAdmin: String(r[COL_LAPORAN.CATATAN_ADMIN]),
      dibuatOleh: owner, updatedAt: String(r[COL_LAPORAN.UPDATED_AT])
    });
  }
  res.reverse();
  return res;
}

/* ============================================================================
 * AKSI: BOOTSTRAP
 * ========================================================================== */

function actBootstrap_(ctx) {
  var out = {
    user: { email: ctx.email, name: ctx.name, picture: safePictureUrl_(ctx.picture), role: ctx.role, idJamaah: ctx.idJamaah },
    jamaah: readJamaahForCtx_(ctx),
    settings: readSettings_(),
    kegiatan: readKegiatan_(),
    absensi: readAbsensiForCtx_(ctx),
    pengurus: readPengurusForCtx_(ctx),
    laporan: readLaporanForCtx_(ctx),
    mutasi: (ctx.role === 'anggota') ? [] : readMutasi_(),
    serverTime: getNowTimestamp_()
  };
  if (ctx.role === 'admin') {
    out.nextJamaahId = nextId_(sheet_(SHEET_NAMES.JAMAAH), COL_JAMAAH.ID, 'JMH');
    out.nextMutasiId = nextId_(sheet_(SHEET_NAMES.MUTASI), COL_MUTASI.ID_MUTASI, 'MTS');
  }
  return out;
}

/* ============================================================================
 * AKSI: DATABASE JAMAAH
 * ========================================================================== */

function findRowById_(sheet, colIndex, id, ncols) {
  var last = sheet.getLastRow();
  if (last <= 1) return null;
  var vals = sheet.getRange(2, 1, last - 1, ncols).getDisplayValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][colIndex]).trim() === id) return { row: i + 2, values: vals[i] };
  }
  return null;
}

function actSaveJamaah_(ctx, p) {
  return withLock_(function () {
    var sheet = sheet_(SHEET_NAMES.JAMAAH);
    var v = validateJamaah_(p);
    var isEdit = Boolean(p.isEdit);
    var nowStr = getNowTimestamp_();
    var rowData;
    var rowNumber;

    if (isEdit) {
      var id = String(p.id || '').trim();
      if (!isValidId_(id, 'JMH')) fail_('ID jamaah tidak valid.', 'VALIDATION');
      var found = findRowById_(sheet, COL_JAMAAH.ID, id, 22);
      if (!found) fail_('Data jamaah tidak ditemukan.', 'NOT_FOUND');
      rowData = jamaahToRow_(v, id, parseInt(found.values[COL_JAMAAH.NO_URUT], 10) || 0, nowStr);
      var diff = diffJamaah_(found.values, rowData);
      sheet.getRange(found.row, 1, 1, 22).setValues([rowData]);
      rowNumber = found.row;
      audit_(ctx, 'UBAH', 'DataJamaah', id + ' (' + v.nama + '): ' + (diff || 'tanpa perubahan nilai'));
    } else {
      var newId = nextId_(sheet, COL_JAMAAH.ID, 'JMH');
      var maxNo = 0;
      var last = sheet.getLastRow();
      if (last > 1) {
        var nos = sheet.getRange(2, COL_JAMAAH.NO_URUT + 1, last - 1, 1).getDisplayValues();
        for (var i = 0; i < nos.length; i++) {
          var n = parseInt(nos[i][0], 10);
          if (!isNaN(n) && n > maxNo) maxNo = n;
        }
      }
      rowData = jamaahToRow_(v, newId, maxNo + 1, nowStr);
      sheet.appendRow(rowData);
      rowNumber = sheet.getLastRow();
      audit_(ctx, 'TAMBAH', 'DataJamaah', newId + ' (' + v.nama + ', ' + v.kelompok + ', ' + v.kodeKK + ')');
    }
    SpreadsheetApp.flush();
    return {
      record: rowToJamaah_(rowData, rowNumber),
      nextJamaahId: nextId_(sheet, COL_JAMAAH.ID, 'JMH'),
      message: isEdit ? 'Data jamaah berhasil diperbarui.' : 'Jamaah baru berhasil ditambahkan.'
    };
  });
}

function actDeleteJamaah_(ctx, p) {
  return withLock_(function () {
    var id = String(p.id || '').trim();
    if (!isValidId_(id, 'JMH')) fail_('ID jamaah tidak valid.', 'VALIDATION');
    var sheet = sheet_(SHEET_NAMES.JAMAAH);
    var found = findRowById_(sheet, COL_JAMAAH.ID, id, 22);
    if (!found) fail_('Data jamaah tidak ditemukan.', 'NOT_FOUND');
    var nama = String(found.values[COL_JAMAAH.NAMA]);
    sheet.deleteRow(found.row);
    SpreadsheetApp.flush();
    audit_(ctx, 'HAPUS', 'DataJamaah', id + ' (' + nama + ') dihapus dari database.');
    return { deletedId: id, nextJamaahId: nextId_(sheet, COL_JAMAAH.ID, 'JMH'), message: 'Data jamaah berhasil dihapus.' };
  });
}

function actCatatMutasi_(ctx, p) {
  return withLock_(function () {
    var sheetJ = sheet_(SHEET_NAMES.JAMAAH);
    var sheetM = sheet_(SHEET_NAMES.MUTASI);
    var jenis = pick_(p.jenis, ['MASUK', 'KELUAR'], null);
    if (!jenis) fail_('Jenis mutasi tidak valid.', 'VALIDATION');
    var allowedKat = jenis === 'MASUK' ? ['Pindah Datang', 'Kelahiran'] : ['Pindah Keluar', 'Wafat'];
    var kategori = pick_(p.kategoriMutasi, allowedKat, null);
    if (!kategori) fail_('Kategori mutasi tidak sesuai jenis mutasi.', 'VALIDATION');
    var tanggal = cleanText_(p.tanggal, 10) || getTodayStr_();
    if (!isValidDateStr_(tanggal)) fail_('Format tanggal mutasi tidak valid.', 'VALIDATION');
    var keterangan = cleanText_(p.keterangan, 200);
    var nowStr = getNowTimestamp_();

    var idMutasi = nextId_(sheetM, COL_MUTASI.ID_MUTASI, 'MTS');
    var jamaahRecord = null;
    var idJamaah = '';
    var nama = '';
    var kelompok = '';

    if (jenis === 'MASUK') {
      var v = validateJamaah_({
        nama: p.nama, kelompok: p.kelompok, kodeKK: p.kodeKK, jk: p.jk, tglLahir: p.tglLahir,
        statusKK: kategori === 'Kelahiran' ? 'Anggota' : 'Kepala Keluarga',
        statusNikah: kategori === 'Kelahiran' ? 'Belum' : 'Menikah',
        statusAktif: 'Aktif'
      });
      if (kategori === 'Kelahiran' && !p.tglLahir) {
        v.usia = 0;
        v.kategoriUsia = 'BALITA';
      }
      idJamaah = nextId_(sheetJ, COL_JAMAAH.ID, 'JMH');
      var maxNo = Math.max(0, sheetJ.getLastRow() - 1);
      var rowData = jamaahToRow_(v, idJamaah, maxNo + 1, nowStr);
      sheetJ.appendRow(rowData);
      jamaahRecord = rowToJamaah_(rowData, sheetJ.getLastRow());
      nama = v.nama;
      kelompok = v.kelompok;
    } else {
      idJamaah = String(p.idJamaah || '').trim();
      if (!isValidId_(idJamaah, 'JMH')) fail_('Pilih jamaah yang valid.', 'VALIDATION');
      var found = findRowById_(sheetJ, COL_JAMAAH.ID, idJamaah, 22);
      if (!found) fail_('Data jamaah tidak ditemukan.', 'NOT_FOUND');
      var row = found.values.slice();
      row[COL_JAMAAH.STATUS_AKTIF] = kategori === 'Wafat' ? 'Wafat' : 'Pindah Keluar';
      row[COL_JAMAAH.UPDATED_AT] = nowStr;
      sheetJ.getRange(found.row, 1, 1, 22).setValues([row]);
      nama = String(row[COL_JAMAAH.NAMA]);
      kelompok = String(row[COL_JAMAAH.KELOMPOK]);
      jamaahRecord = rowToJamaah_(row, found.row);
    }

    var mutasiRow = [
      idMutasi, tanggal, jenis, kategori, idJamaah,
      cellSafe_(nama), kelompok, cellSafe_(keterangan), cellSafe_(ctx.name || ctx.email), nowStr
    ];
    sheetM.appendRow(mutasiRow);
    SpreadsheetApp.flush();
    audit_(ctx, 'MUTASI', 'LogMutasi', jenis + ' ' + kategori + ': ' + idJamaah + ' (' + nama + ')');

    return {
      message: 'Mutasi ' + jenis + ' (' + nama + ') berhasil dicatat.',
      jamaahRecord: jamaahRecord,
      mutasiRecord: {
        idMutasi: idMutasi, tanggal: tanggal, jenis: jenis, kategoriMutasi: kategori,
        idJamaah: idJamaah, nama: nama, kelompok: kelompok, keterangan: keterangan,
        dicatatOleh: ctx.name || ctx.email, createdAt: nowStr
      },
      nextJamaahId: nextId_(sheetJ, COL_JAMAAH.ID, 'JMH'),
      nextMutasiId: nextId_(sheetM, COL_MUTASI.ID_MUTASI, 'MTS')
    };
  });
}

function actImportCsv_(ctx, p) {
  return withLock_(function () {
    var rows = p.rows;
    if (!rows || !rows.length) fail_('Tidak ada baris data untuk diimport.', 'VALIDATION');
    if (rows.length > 1000) fail_('Maksimal 1000 baris per sekali import.', 'VALIDATION');
    var sheet = sheet_(SHEET_NAMES.JAMAAH);
    var maxSeq = getMaxSeq_(sheet, COL_JAMAAH.ID, 'JMH');
    var last = sheet.getLastRow();
    var maxNo = 0;
    if (last > 1) {
      var nos = sheet.getRange(2, COL_JAMAAH.NO_URUT + 1, last - 1, 1).getDisplayValues();
      for (var i = 0; i < nos.length; i++) {
        var n = parseInt(nos[i][0], 10);
        if (!isNaN(n) && n > maxNo) maxNo = n;
      }
    }
    var nowStr = getNowTimestamp_();
    var newRows = [];
    var skipped = 0;
    for (var r = 0; r < rows.length; r++) {
      try {
        var v = validateJamaah_(rows[r]);
        maxSeq++;
        maxNo++;
        newRows.push(jamaahToRow_(v, formatId_('JMH', maxSeq), maxNo, nowStr));
      } catch (e) {
        if (e && e.isApp) { skipped++; } else { throw e; }
      }
    }
    var added = [];
    if (newRows.length > 0) {
      sheet.getRange(last + 1, 1, newRows.length, 22).setValues(newRows);
      SpreadsheetApp.flush();
      for (var a = 0; a < newRows.length; a++) added.push(rowToJamaah_(newRows[a], last + 1 + a));
    }
    audit_(ctx, 'IMPORT', 'DataJamaah', newRows.length + ' baris diimport, ' + skipped + ' dilewati (tidak valid).');
    return {
      importedCount: newRows.length,
      skippedCount: skipped,
      addedRecords: added,
      nextJamaahId: nextId_(sheet, COL_JAMAAH.ID, 'JMH'),
      message: 'Berhasil mengimport ' + newRows.length + ' data' + (skipped ? ' (' + skipped + ' baris tidak valid dilewati)' : '') + '.'
    };
  });
}

function actSaveSettings_(ctx, p) {
  return withLock_(function () {
    var sheet = sheet_(SHEET_NAMES.SETTING);
    var s = p.settings || {};
    var rows = [
      ['NAMA_DESA', cellSafe_(cleanText_(s.NAMA_DESA, 100) || 'Desa Al Awwabin - Kencana')],
      ['SUBJUDUL_KOP', cellSafe_(cleanText_(s.SUBJUDUL_KOP, 150))],
      ['ALAMAT_SEKRETARIAT', cellSafe_(cleanText_(s.ALAMAT_SEKRETARIAT, 150))],
      ['KOTA_TTD', cellSafe_(cleanText_(s.KOTA_TTD, 50))],
      ['NAMA_KIDES', cellSafe_(cleanText_(s.NAMA_KIDES, 80))],
      ['NAMA_SEKRETARIS', cellSafe_(cleanText_(s.NAMA_SEKRETARIS, 80))]
    ];
    if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).clearContent();
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
    SpreadsheetApp.flush();
    audit_(ctx, 'UBAH', 'PengaturanDesa', 'Kop surat & pejabat penandatangan diperbarui.');
    return { settings: readSettings_(), message: 'Pengaturan berhasil disimpan.' };
  });
}

/* ============================================================================
 * AKSI: ABSENSI (terhubung ke DataJamaah lewat ID Jamaah)
 * ========================================================================== */

function actSaveKegiatan_(ctx, p) {
  return withLock_(function () {
    var sheet = sheet_(SHEET_NAMES.KEGIATAN);
    var nama = cleanText_(p.nama, 100);
    if (!nama) fail_('Nama kegiatan wajib diisi.', 'VALIDATION');
    var tanggal = cleanText_(p.tanggal, 10);
    if (!isValidDateStr_(tanggal)) fail_('Tanggal kegiatan tidak valid.', 'VALIDATION');
    var jenis = pick_(p.jenis, JENIS_KEGIATAN_LIST, 'Lainnya');
    var sasaran = pick_(p.sasaran, ['Semua'].concat(KELOMPOK_LIST), 'Semua');
    var status = pick_(p.status, ['Buka', 'Tutup'], 'Buka');
    var nowStr = getNowTimestamp_();
    var id = String(p.id || '').trim();

    if (id) {
      if (!isValidId_(id, 'KGT')) fail_('ID kegiatan tidak valid.', 'VALIDATION');
      var found = findRowById_(sheet, COL_KEGIATAN.ID, id, 8);
      if (!found) fail_('Kegiatan tidak ditemukan.', 'NOT_FOUND');
      var row = [id, tanggal, cellSafe_(nama), jenis, sasaran, status, found.values[COL_KEGIATAN.DICATAT_OLEH], found.values[COL_KEGIATAN.CREATED_AT]];
      sheet.getRange(found.row, 1, 1, 8).setValues([row]);
      audit_(ctx, 'UBAH', 'MasterKegiatan', id + ' (' + nama + ') status ' + status);
    } else {
      id = nextId_(sheet, COL_KEGIATAN.ID, 'KGT');
      sheet.appendRow([id, tanggal, cellSafe_(nama), jenis, sasaran, status, cellSafe_(ctx.name || ctx.email), nowStr]);
      audit_(ctx, 'TAMBAH', 'MasterKegiatan', id + ' (' + nama + ', ' + tanggal + ')');
    }
    SpreadsheetApp.flush();
    return { kegiatan: readKegiatan_(), savedId: id, message: 'Kegiatan berhasil disimpan.' };
  });
}

function actDeleteKegiatan_(ctx, p) {
  return withLock_(function () {
    var id = String(p.id || '').trim();
    if (!isValidId_(id, 'KGT')) fail_('ID kegiatan tidak valid.', 'VALIDATION');
    var sheet = sheet_(SHEET_NAMES.KEGIATAN);
    var found = findRowById_(sheet, COL_KEGIATAN.ID, id, 8);
    if (!found) fail_('Kegiatan tidak ditemukan.', 'NOT_FOUND');

    // Hapus data absensi turunannya (dari bawah ke atas agar indeks tidak bergeser).
    var sheetA = sheet_(SHEET_NAMES.ABSENSI);
    var lastA = sheetA.getLastRow();
    var removed = 0;
    if (lastA > 1) {
      var vals = sheetA.getRange(2, 1, lastA - 1, 7).getDisplayValues();
      for (var i = vals.length - 1; i >= 0; i--) {
        if (String(vals[i][COL_ABSENSI.ID_KEGIATAN]) === id) {
          sheetA.deleteRow(i + 2);
          removed++;
        }
      }
    }
    sheet.deleteRow(found.row);
    SpreadsheetApp.flush();
    audit_(ctx, 'HAPUS', 'MasterKegiatan', id + ' (' + found.values[COL_KEGIATAN.NAMA] + ') beserta ' + removed + ' baris absensi.');
    return { deletedId: id, message: 'Kegiatan dan data absensinya dihapus.' };
  });
}

function upsertAbsensiRows_(records, idKegiatan, dicatatOleh) {
  var sheet = sheet_(SHEET_NAMES.ABSENSI);
  var last = sheet.getLastRow();
  var existing = last > 1 ? sheet.getRange(2, 1, last - 1, 7).getDisplayValues() : [];
  var index = {};
  for (var i = 0; i < existing.length; i++) {
    if (String(existing[i][COL_ABSENSI.ID_KEGIATAN]) === idKegiatan) {
      index[String(existing[i][COL_ABSENSI.ID_JAMAAH])] = i;
    }
  }
  var maxSeq = getMaxSeq_(sheet, COL_ABSENSI.ID, 'ABS');
  var nowStr = getNowTimestamp_();
  var toAppend = [];
  var touched = false;
  for (var r = 0; r < records.length; r++) {
    var rec = records[r];
    if (index.hasOwnProperty(rec.idJamaah)) {
      var row = existing[index[rec.idJamaah]];
      row[COL_ABSENSI.STATUS] = rec.status;
      row[COL_ABSENSI.CATATAN] = cellSafe_(rec.catatan);
      row[COL_ABSENSI.DICATAT_OLEH] = cellSafe_(dicatatOleh);
      row[COL_ABSENSI.WAKTU] = nowStr;
      touched = true;
    } else {
      maxSeq++;
      toAppend.push([formatId_('ABS', maxSeq), idKegiatan, rec.idJamaah, rec.status,
        cellSafe_(rec.catatan), cellSafe_(dicatatOleh), nowStr]);
    }
  }
  if (touched) sheet.getRange(2, 1, existing.length, 7).setValues(existing);
  if (toAppend.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, 7).setValues(toAppend);
  }
  SpreadsheetApp.flush();
}

function getJamaahIdSet_() {
  var vals = readRange_(SHEET_NAMES.JAMAAH, 1);
  var set = {};
  for (var i = 0; i < vals.length; i++) set[String(vals[i][0]).trim()] = true;
  return set;
}

function actSaveAbsensi_(ctx, p) {
  return withLock_(function () {
    var idKegiatan = String(p.idKegiatan || '').trim();
    if (!isValidId_(idKegiatan, 'KGT')) fail_('ID kegiatan tidak valid.', 'VALIDATION');
    var kg = findRowById_(sheet_(SHEET_NAMES.KEGIATAN), COL_KEGIATAN.ID, idKegiatan, 8);
    if (!kg) fail_('Kegiatan tidak ditemukan.', 'NOT_FOUND');
    var recs = p.records;
    if (!recs || !recs.length) fail_('Tidak ada data kehadiran untuk disimpan.', 'VALIDATION');
    if (recs.length > 1000) fail_('Terlalu banyak baris sekaligus.', 'VALIDATION');

    var valid = getJamaahIdSet_();
    var clean = [];
    for (var i = 0; i < recs.length; i++) {
      var idj = String(recs[i].idJamaah || '').trim();
      var st = pick_(recs[i].status, STATUS_ABSEN_LIST, null);
      if (!valid[idj] || !st) continue;
      clean.push({ idJamaah: idj, status: st, catatan: cleanText_(recs[i].catatan, 100) });
    }
    if (!clean.length) fail_('Tidak ada baris kehadiran yang valid.', 'VALIDATION');
    upsertAbsensiRows_(clean, idKegiatan, ctx.name || ctx.email);
    audit_(ctx, 'ABSENSI', 'DataAbsensi', 'Kegiatan ' + idKegiatan + ' (' + kg.values[COL_KEGIATAN.NAMA] + '): ' + clean.length + ' baris kehadiran disimpan.');
    return { absensi: readAbsensiForCtx_(ctx), message: clean.length + ' data kehadiran tersimpan.' };
  });
}

function actSelfCheckin_(ctx, p) {
  return withLock_(function () {
    if (!ctx.idJamaah) fail_('Akun Anda belum ditautkan ke data jamaah. Hubungi admin.', 'FORBIDDEN');
    var idKegiatan = String(p.idKegiatan || '').trim();
    if (!isValidId_(idKegiatan, 'KGT')) fail_('ID kegiatan tidak valid.', 'VALIDATION');
    var kg = findRowById_(sheet_(SHEET_NAMES.KEGIATAN), COL_KEGIATAN.ID, idKegiatan, 8);
    if (!kg) fail_('Kegiatan tidak ditemukan.', 'NOT_FOUND');
    if (String(kg.values[COL_KEGIATAN.STATUS]) !== 'Buka') fail_('Presensi kegiatan ini sudah ditutup.', 'FORBIDDEN');
    var me = findRowById_(sheet_(SHEET_NAMES.JAMAAH), COL_JAMAAH.ID, ctx.idJamaah, 22);
    if (!me) fail_('Data jamaah Anda tidak ditemukan.', 'NOT_FOUND');
    var sasaran = String(kg.values[COL_KEGIATAN.SASARAN]) || 'Semua';
    if (sasaran !== 'Semua' && sasaran !== String(me.values[COL_JAMAAH.KELOMPOK])) {
      fail_('Kegiatan ini bukan untuk kelompok Anda.', 'FORBIDDEN');
    }
    upsertAbsensiRows_([{ idJamaah: ctx.idJamaah, status: 'Hadir', catatan: 'Presensi mandiri' }], idKegiatan, ctx.name || ctx.email);
    audit_(ctx, 'ABSENSI', 'DataAbsensi', 'Presensi mandiri ' + idKegiatan + ' oleh ' + ctx.idJamaah);
    return { absensi: readAbsensiForCtx_(ctx), message: 'Kehadiran Anda tercatat.' };
  });
}

/* ============================================================================
 * AKSI: STRUKTUR PENGURUS & LAPORAN
 * ========================================================================== */

function actSavePengurus_(ctx, p) {
  return withLock_(function () {
    var sheet = sheet_(SHEET_NAMES.PENGURUS);
    var jabatan = cleanText_(p.jabatan, 80);
    if (!jabatan) fail_('Jabatan wajib diisi.', 'VALIDATION');
    var urutan = parseInt(p.urutan, 10);
    if (isNaN(urutan) || urutan < 1 || urutan > 999) urutan = 999;
    var tupoksi = cleanMultiline_(p.tupoksi, 1500);
    var email = cleanText_(p.email, 120).toLowerCase();
    if (email && !isValidEmail_(email)) fail_('Format email tidak valid.', 'VALIDATION');
    var status = pick_(p.status, ['Aktif', 'Nonaktif'], 'Aktif');

    var idJamaah = cleanText_(p.idJamaah, 20);
    var nama = cleanText_(p.nama, 100);
    var kelompok = pick_(p.kelompok, KELOMPOK_LIST, '');
    if (idJamaah) {
      if (!isValidId_(idJamaah, 'JMH')) fail_('ID jamaah tidak valid.', 'VALIDATION');
      var j = findRowById_(sheet_(SHEET_NAMES.JAMAAH), COL_JAMAAH.ID, idJamaah, 22);
      if (!j) fail_('Jamaah dengan ID tersebut tidak ditemukan di Database.', 'NOT_FOUND');
      nama = String(j.values[COL_JAMAAH.NAMA]);
      kelompok = String(j.values[COL_JAMAAH.KELOMPOK]);
    }
    if (!nama) fail_('Nama pengurus wajib diisi (atau pilih dari Database).', 'VALIDATION');

    var nowStr = getNowTimestamp_();
    var id = String(p.id || '').trim();
    var row;
    if (id) {
      if (!isValidId_(id, 'PGR')) fail_('ID pengurus tidak valid.', 'VALIDATION');
      var found = findRowById_(sheet, COL_PENGURUS.ID, id, 10);
      if (!found) fail_('Data pengurus tidak ditemukan.', 'NOT_FOUND');
      row = [id, cellSafe_(jabatan), urutan, idJamaah, cellSafe_(nama), kelompok, cellSafe_(tupoksi), email, status, nowStr];
      sheet.getRange(found.row, 1, 1, 10).setValues([row]);
      audit_(ctx, 'UBAH', 'StrukturPengurus', id + ' (' + jabatan + ' - ' + nama + ')');
    } else {
      id = nextId_(sheet, COL_PENGURUS.ID, 'PGR');
      row = [id, cellSafe_(jabatan), urutan, idJamaah, cellSafe_(nama), kelompok, cellSafe_(tupoksi), email, status, nowStr];
      sheet.appendRow(row);
      audit_(ctx, 'TAMBAH', 'StrukturPengurus', id + ' (' + jabatan + ' - ' + nama + ')');
    }
    SpreadsheetApp.flush();
    return { pengurus: readPengurusForCtx_(ctx), message: 'Data pengurus berhasil disimpan.' };
  });
}

function actDeletePengurus_(ctx, p) {
  return withLock_(function () {
    var id = String(p.id || '').trim();
    if (!isValidId_(id, 'PGR')) fail_('ID pengurus tidak valid.', 'VALIDATION');
    var sheet = sheet_(SHEET_NAMES.PENGURUS);
    var found = findRowById_(sheet, COL_PENGURUS.ID, id, 10);
    if (!found) fail_('Data pengurus tidak ditemukan.', 'NOT_FOUND');
    sheet.deleteRow(found.row);
    SpreadsheetApp.flush();
    audit_(ctx, 'HAPUS', 'StrukturPengurus', id + ' (' + found.values[COL_PENGURUS.JABATAN] + ' - ' + found.values[COL_PENGURUS.NAMA] + ')');
    return { pengurus: readPengurusForCtx_(ctx), message: 'Data pengurus dihapus.' };
  });
}

function findPengurusByEmail_(email) {
  var vals = readRange_(SHEET_NAMES.PENGURUS, 10);
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][COL_PENGURUS.EMAIL]).toLowerCase() === email && String(vals[i][COL_PENGURUS.STATUS]) !== 'Nonaktif') {
      return { id: String(vals[i][COL_PENGURUS.ID]), nama: String(vals[i][COL_PENGURUS.NAMA]), jabatan: String(vals[i][COL_PENGURUS.JABATAN]) };
    }
  }
  return null;
}

function actSaveLaporan_(ctx, p) {
  return withLock_(function () {
    var sheet = sheet_(SHEET_NAMES.LAPORAN);
    var judul = cleanText_(p.judul, 120);
    var isi = cleanMultiline_(p.isi, 4000);
    var periode = cleanText_(p.periode, 40);
    if (!judul || !isi) fail_('Judul dan isi laporan wajib diisi.', 'VALIDATION');
    var status = pick_(p.status, ['Draft', 'Terkirim'], 'Draft');
    var nowStr = getNowTimestamp_();

    var peng;
    if (ctx.role === 'admin' && p.idPengurus) {
      var pf = findRowById_(sheet_(SHEET_NAMES.PENGURUS), COL_PENGURUS.ID, String(p.idPengurus), 10);
      if (!pf) fail_('Pengurus tidak ditemukan.', 'NOT_FOUND');
      peng = { id: String(pf.values[COL_PENGURUS.ID]), nama: String(pf.values[COL_PENGURUS.NAMA]), jabatan: String(pf.values[COL_PENGURUS.JABATAN]) };
    } else {
      peng = findPengurusByEmail_(ctx.email);
    }
    if (!peng) fail_('Akun Anda belum ditautkan ke jabatan pada Struktur Pengurus. Hubungi admin.', 'FORBIDDEN');

    var id = String(p.id || '').trim();
    if (id) {
      if (!isValidId_(id, 'LAP')) fail_('ID laporan tidak valid.', 'VALIDATION');
      var found = findRowById_(sheet, COL_LAPORAN.ID, id, 12);
      if (!found) fail_('Laporan tidak ditemukan.', 'NOT_FOUND');
      var owner = String(found.values[COL_LAPORAN.DIBUAT_OLEH]).toLowerCase();
      var curStatus = String(found.values[COL_LAPORAN.STATUS]);
      if (ctx.role !== 'admin') {
        if (owner !== ctx.email) fail_('Anda hanya dapat mengubah laporan milik sendiri.', 'FORBIDDEN');
        if (curStatus !== 'Draft' && curStatus !== 'Perlu Revisi') fail_('Laporan yang sudah dikirim tidak dapat diubah.', 'FORBIDDEN');
      }
      var row = [id, found.values[COL_LAPORAN.TANGGAL], peng.id, cellSafe_(peng.nama), cellSafe_(peng.jabatan),
        cellSafe_(periode), cellSafe_(judul), cellSafe_(isi), status, found.values[COL_LAPORAN.CATATAN_ADMIN], owner, nowStr];
      sheet.getRange(found.row, 1, 1, 12).setValues([row]);
      audit_(ctx, 'UBAH', 'LaporanPengurus', id + ' (' + judul + ') status ' + status);
    } else {
      id = nextId_(sheet, COL_LAPORAN.ID, 'LAP');
      sheet.appendRow([id, getTodayStr_(), peng.id, cellSafe_(peng.nama), cellSafe_(peng.jabatan),
        cellSafe_(periode), cellSafe_(judul), cellSafe_(isi), status, '', ctx.email, nowStr]);
      audit_(ctx, 'TAMBAH', 'LaporanPengurus', id + ' (' + judul + ') status ' + status);
    }
    SpreadsheetApp.flush();
    return { laporan: readLaporanForCtx_(ctx), message: status === 'Terkirim' ? 'Laporan berhasil dikirim.' : 'Draft laporan tersimpan.' };
  });
}

function actReviewLaporan_(ctx, p) {
  return withLock_(function () {
    var id = String(p.id || '').trim();
    if (!isValidId_(id, 'LAP')) fail_('ID laporan tidak valid.', 'VALIDATION');
    var status = pick_(p.status, ['Ditinjau', 'Perlu Revisi'], null);
    if (!status) fail_('Status tinjauan tidak valid.', 'VALIDATION');
    var sheet = sheet_(SHEET_NAMES.LAPORAN);
    var found = findRowById_(sheet, COL_LAPORAN.ID, id, 12);
    if (!found) fail_('Laporan tidak ditemukan.', 'NOT_FOUND');
    var row = found.values.slice();
    row[COL_LAPORAN.STATUS] = status;
    row[COL_LAPORAN.CATATAN_ADMIN] = cellSafe_(cleanMultiline_(p.catatan, 500));
    row[COL_LAPORAN.UPDATED_AT] = getNowTimestamp_();
    sheet.getRange(found.row, 1, 1, 12).setValues([row]);
    SpreadsheetApp.flush();
    audit_(ctx, 'TINJAU', 'LaporanPengurus', id + ' -> ' + status);
    return { laporan: readLaporanForCtx_(ctx), message: 'Tinjauan laporan disimpan.' };
  });
}

function actDeleteLaporan_(ctx, p) {
  return withLock_(function () {
    var id = String(p.id || '').trim();
    if (!isValidId_(id, 'LAP')) fail_('ID laporan tidak valid.', 'VALIDATION');
    var sheet = sheet_(SHEET_NAMES.LAPORAN);
    var found = findRowById_(sheet, COL_LAPORAN.ID, id, 12);
    if (!found) fail_('Laporan tidak ditemukan.', 'NOT_FOUND');
    var owner = String(found.values[COL_LAPORAN.DIBUAT_OLEH]).toLowerCase();
    if (ctx.role !== 'admin') {
      if (owner !== ctx.email || String(found.values[COL_LAPORAN.STATUS]) !== 'Draft') {
        fail_('Hanya draft milik sendiri yang dapat dihapus.', 'FORBIDDEN');
      }
    }
    sheet.deleteRow(found.row);
    SpreadsheetApp.flush();
    audit_(ctx, 'HAPUS', 'LaporanPengurus', id + ' (' + found.values[COL_LAPORAN.JUDUL] + ')');
    return { laporan: readLaporanForCtx_(ctx), message: 'Laporan dihapus.' };
  });
}

/* ============================================================================
 * AKSI: PENGGUNA, AUDIT, CETAK
 * ========================================================================== */

function actListUsers_() {
  var vals = readRange_(SHEET_NAMES.AKSES, 7);
  var res = [];
  for (var i = 0; i < vals.length; i++) {
    if (!vals[i][COL_AKSES.EMAIL]) continue;
    res.push({
      email: String(vals[i][COL_AKSES.EMAIL]), nama: String(vals[i][COL_AKSES.NAMA]),
      peran: String(vals[i][COL_AKSES.PERAN]), idJamaah: String(vals[i][COL_AKSES.ID_JAMAAH]),
      status: String(vals[i][COL_AKSES.STATUS]), dibuat: String(vals[i][COL_AKSES.DIBUAT]),
      loginTerakhir: String(vals[i][COL_AKSES.LOGIN_TERAKHIR])
    });
  }
  return { users: res };
}

function actSaveUser_(ctx, p) {
  return withLock_(function () {
    var email = cleanText_(p.email, 120).toLowerCase();
    if (!isValidEmail_(email)) fail_('Format email tidak valid.', 'VALIDATION');
    var peran = pick_(p.peran, ROLES, null);
    if (!peran) fail_('Peran tidak valid.', 'VALIDATION');
    var status = pick_(p.status, ['Aktif', 'Nonaktif'], 'Aktif');
    var nama = cleanText_(p.nama, 80);
    var idJamaah = cleanText_(p.idJamaah, 20);
    if (idJamaah && !isValidId_(idJamaah, 'JMH')) fail_('ID jamaah tidak valid.', 'VALIDATION');
    if (peran === 'anggota' && idJamaah) {
      if (!findRowById_(sheet_(SHEET_NAMES.JAMAAH), COL_JAMAAH.ID, idJamaah, 22)) fail_('ID jamaah tidak ditemukan.', 'NOT_FOUND');
    }

    var sheet = sheet_(SHEET_NAMES.AKSES);
    var vals = readRange_(SHEET_NAMES.AKSES, 7);
    var targetRow = -1;
    var activeAdmins = 0;
    for (var i = 0; i < vals.length; i++) {
      var em = String(vals[i][COL_AKSES.EMAIL]).toLowerCase();
      if (em === email) targetRow = i + 2;
      else if (String(vals[i][COL_AKSES.PERAN]).toLowerCase() === 'admin' && String(vals[i][COL_AKSES.STATUS]) === 'Aktif') activeAdmins++;
    }
    // Pastikan minimal 1 admin aktif tetap ada.
    if ((peran !== 'admin' || status !== 'Aktif') && activeAdmins === 0) {
      fail_('Harus tersisa minimal satu Admin aktif.', 'VALIDATION');
    }
    var nowStr = getNowTimestamp_();
    if (targetRow > 0) {
      var cur = sheet.getRange(targetRow, 1, 1, 7).getDisplayValues()[0];
      sheet.getRange(targetRow, 1, 1, 7).setValues([[email, cellSafe_(nama), peran, idJamaah, status, cur[COL_AKSES.DIBUAT], cur[COL_AKSES.LOGIN_TERAKHIR]]]);
      audit_(ctx, 'UBAH', 'HakAkses', email + ' -> peran ' + peran + ', status ' + status);
    } else {
      sheet.appendRow([email, cellSafe_(nama), peran, idJamaah, status, nowStr, '']);
      audit_(ctx, 'TAMBAH', 'HakAkses', email + ' didaftarkan sebagai ' + peran);
    }
    SpreadsheetApp.flush();
    return { users: actListUsers_().users, message: 'Hak akses pengguna disimpan.' };
  });
}

function actListAudit_() {
  var vals = readRange_(SHEET_NAMES.LOG, 8);
  var res = [];
  var start = Math.max(0, vals.length - 500);
  for (var i = vals.length - 1; i >= start; i--) {
    res.push({
      id: String(vals[i][COL_LOG.ID]), waktu: String(vals[i][COL_LOG.WAKTU]),
      email: String(vals[i][COL_LOG.EMAIL]), nama: String(vals[i][COL_LOG.NAMA]),
      peran: String(vals[i][COL_LOG.PERAN]), aksi: String(vals[i][COL_LOG.AKSI]),
      modul: String(vals[i][COL_LOG.MODUL]), detail: String(vals[i][COL_LOG.DETAIL])
    });
  }
  return { audit: res };
}

function actLogPrint_(ctx, p) {
  audit_(ctx, 'CETAK', 'StudioPDF', cleanText_(p.label, 200) || 'Cetak dokumen');
  return {};
}
