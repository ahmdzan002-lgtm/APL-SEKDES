(function() {
      'use strict';

      // DATA CONTOH FIKTIF (hanya untuk uji tampilan lokal tanpa server).
      // Data jamaah asli TIDAK pernah ada di frontend; hanya dikirim server setelah login.
      var PREVIEW_SAMPLE_LINES = [
        '1,1,Al Awwabin 1,Contoh Satu (Fiktif),Bandung,1975-03-10,51,L,Menikah,SMA,,,Kipok,Aghnia,DEWASA,O,MS,081200000001',
        ',2,Al Awwabin 1,Contoh Dua (Fiktif),Bandung,1980-06-21,46,P,Menikah,SMA,,,,,DEWASA,A,,',
        ',3,Al Awwabin 1,Contoh Tiga (Fiktif),Bandung,2008-09-14,18,L,Belum,SMA,,,,,REMAJA / MUDA-MUDI,,,',
        ',4,Al Awwabin 1,Contoh Empat (Fiktif),Bandung,2016-01-05,10,P,Belum,SD,4,SEKOLAH UMUM,,,CABERAWIT,,,',
        '1,5,Kencana 1,Contoh Lima (Fiktif),Garut,1958-11-02,68,L,Menikah,SMP,,,Wakides,,LANSIA,B,MT,081200000005',
        ',6,Kencana 1,Contoh Enam (Fiktif),Garut,1962-04-18,64,P,Menikah,SMP,,,,,LANSIA,B,,',
        '1,7,Kencana 2,Contoh Tujuh (Fiktif),Cilacap,1995-07-30,31,L,Belum,S1,,,,,USIA NIKAH,AB,,081200000007',
        '1,8,Al Awwabin 2,Contoh Delapan (Fiktif),Klaten,1990-02-12,36,P,Menikah,D3,,,,,DEWASA,O,,',
        ',9,Al Awwabin 2,Contoh Sembilan (Fiktif),Klaten,2023-05-20,3,L,Belum,,,,,,BALITA,,,'
      ];

      function escHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function parseCsvLine(line) {
        var res = [];
        var cur = '';
        var inQ = false;
        for (var i = 0; i < line.length; i++) {
          var c = line.charAt(i);
          if (c === '"') {
            inQ = !inQ;
          } else if (c === ',' && !inQ) {
            res.push(cur.trim());
            cur = '';
          } else {
            cur += c;
          }
        }
        res.push(cur.trim());
        return res;
      }

      function normalizeDateStr(raw) {
        if (!raw) return '';
        var s = String(raw).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        var monthMap = {
          jan: '01', feb: '02', mar: '03', apr: '04', may: '05', mei: '05',
          jun: '06', jul: '07', aug: '08', agu: '08', sep: '09', oct: '10', okt: '10',
          nov: '11', dec: '12', des: '12'
        };
        var m = s.match(/^(\d{1,2})-([A-Za-z]+)-(\d{2,4})$/);
        if (m) {
          var day = m[1].length < 2 ? '0' + m[1] : m[1];
          var monKey = m[2].toLowerCase().substring(0, 3);
          var mon = monthMap[monKey] || '01';
          var yr = m[3];
          if (yr.length === 2) {
            var yNum = parseInt(yr, 10);
            yr = (yNum > 30 ? '19' : '20') + yr;
          }
          return yr + '-' + mon + '-' + day;
        }
        return s;
      }

      function computeKategoriUsia(rawKat, usiaNum, statusNikah, pendidikan, nama) {
        var sn = String(statusNikah || '').toUpperCase();
        var isMarriedOrEver = sn === 'MENIKAH' || sn === 'JANDA' || sn === 'DUDA';
        var u = isNaN(usiaNum) ? null : usiaNum;
        if (u !== null) {
          if (u >= 60) return 'LANSIA';
          if (isMarriedOrEver && u < 60) return 'DEWASA';
          if (u <= 4) return 'BALITA';
          if (u >= 5 && u <= 12) return 'CABERAWIT';
          if (u >= 13 && u <= 18) return 'REMAJA / MUDA-MUDI';
          if (u >= 19 && u <= 22) return 'PRA NIKAH';
          if (u >= 23) return 'USIA NIKAH';
        } else {
          if (isMarriedOrEver || /^Bp\b|^Ibu\b/i.test(nama)) return 'DEWASA';
          if (/S1|S2|S3|D3|D4|KULIAH/i.test(pendidikan)) return 'USIA NIKAH';
          if (/SMA|SMK|SLTA/i.test(pendidikan)) return 'REMAJA / MUDA-MUDI';
        }
        return rawKat || 'DEWASA';
      }

      function buildInitial311Dataset() {
        if (window.SidaDB && window.SidaDB.buildInitial311Dataset) {
          return window.SidaDB.buildInitial311Dataset();
        }
        return [];
      }

      function computeNextId(arr, idKey, prefix) {
        var maxNum = 0;
        var list = arr || [];
        for (var i = 0; i < list.length; i++) {
          var raw = String((list[i] && list[i][idKey]) || '');
          var m = raw.match(/(\d+)$/);
          if (m) {
            var n = parseInt(m[1], 10);
            if (n > maxNum) maxNum = n;
          }
        }
        return prefix + String(maxNum + 1).padStart(3, '0');
      }

      function persistLocalDb() {
        AppState.nextJamaahId = computeNextId(AppState.jamaah, 'id', 'JMH-202611-');
        AppState.nextMutasiId = computeNextId(AppState.mutasi, 'idMutasi', 'MTS-202611-');
        if (window.SidaDB && window.SidaDB.saveDatabase) {
          window.SidaDB.saveDatabase(AppState);
        }
      }

      /* ======================================================================
         IN-MEMORY CACHE & STATE MANAGEMENT
         ====================================================================== */
      var AppState = {
        isGasEnv: false,
        adminPin: '123456',
        selectedLoginRole: 'admin',
        dbLoaded: false,
        activeMenu: 'dashboard',
        activeModule: 'database',
        token: '',
        csrf: '',
        user: null,
        isPreview: false,
        idleTimeoutSec: 1200,
        idleTimer: null,
        _idleBound: false,
        kegiatan: [],
        activeKegiatanId: '',
        absensi: [],
        absDraft: {},
        pengurus: [],
        laporan: [],
        users: [],
        audit: [],
        activeViewLaporanId: '',
        jamaah: [],
        mutasi: [],
        settings: {
          NAMA_DESA: 'Desa Al Awwabin - Kencana',
          SUBJUDUL_KOP: 'Sekretariat Pengurus Jamaah Desa — Sistem Informasi Database Terpadu',
          ALAMAT_SEKRETARIAT: 'Bandung, Jawa Barat',
          KOTA_TTD: 'Bandung',
          NAMA_KIDES: 'Bp. H. Wahyu',
          NAMA_SEKRETARIS: 'Sekretaris Desa'
        },
        nextJamaahId: 'JMH-202611-312',
        nextMutasiId: 'MTS-202611-003',
        viewMode: (typeof window !== 'undefined' && window.innerWidth <= 680) ? 'cards' : 'table',
        currentPage: 1,
        pageSize: 50,
        filteredJamaah: [],
        activeDetailKKCode: '',
        pdfMode: 'table',
        pdfColumns: [
          { key: 'no', label: 'No', checked: true },
          { key: 'kodeKK', label: 'Kode KK', checked: true },
          { key: 'statusKK', label: 'Peran KK', checked: false },
          { key: 'kelompok', label: 'Kelompok', checked: true },
          { key: 'nama', label: 'Nama Lengkap', checked: true },
          { key: 'jk', label: 'L/P', checked: true },
          { key: 'ttl', label: 'Tempat, Tgl Lahir', checked: true },
          { key: 'usia', label: 'Usia', checked: true },
          { key: 'kategoriUsia', label: 'Kategori Usia', checked: true },
          { key: 'statusNikah', label: 'Status Nikah', checked: true },
          { key: 'pendidikan', label: 'Pendidikan', checked: true },
          { key: 'kelas', label: 'Kelas', checked: false },
          { key: 'lembaga', label: 'Lembaga Sekolah', checked: false },
          { key: 'dapukan', label: 'Dapukan', checked: true },
          { key: 'kategoriEkonomi', label: 'Ekonomi', checked: false },
          { key: 'goldar', label: 'Gol. Darah', checked: true },
          { key: 'kemubalighan', label: 'MT/MS', checked: true },
          { key: 'noHp', label: 'No. HP', checked: true },
          { key: 'statusAktif', label: 'Status', checked: false },
          { key: 'paraf', label: 'Kolom TTD / Paraf', checked: false }
        ],
        manualSelectedIds: {}
      };

      function showToast(msg, type) {
        var container = document.getElementById('toastContainer');
        if (!container) return;
        var el = document.createElement('div');
        el.className = 'toast-item ' + (type || 'info');
        el.textContent = msg;
        container.appendChild(el);
        setTimeout(function() {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 3800);
      }

      function openModal(id) {
        var m = document.getElementById(id);
        if (m) m.classList.add('open');
      }

      function closeModal(id) {
        var m = document.getElementById(id);
        if (m) m.classList.remove('open');
      }
      /* ======================================================================
         NAVIGATION & INITIALIZATION
         ====================================================================== */
      function switchMenu(targetMenu, fromModuleSwitch) {
        if (!fromModuleSwitch && AppState.activeModule !== 'database') {
          AppState.activeMenu = targetMenu;
          switchModule('database');
          return;
        }
        AppState.activeMenu = targetMenu;
        var sections = ['dashboard', 'database', 'mutasi', 'pdf', 'keamanan'];
        for (var i = 0; i < sections.length; i++) {
          var secEl = document.getElementById('sec-' + sections[i]);
          if (secEl) {
            if (sections[i] === targetMenu) secEl.classList.add('active');
            else secEl.classList.remove('active');
          }
        }
        var navBtns = document.querySelectorAll('#subTabBar [data-nav]');
        for (var j = 0; j < navBtns.length; j++) {
          if (navBtns[j].getAttribute('data-nav') === targetMenu) {
            navBtns[j].classList.add('active');
          } else {
            navBtns[j].classList.remove('active');
          }
        }

        if (targetMenu === 'dashboard') renderDashboard();
        if (targetMenu === 'database') applyDatabaseFilterAndRender();
        if (targetMenu === 'mutasi') renderMutasiPage();
        if (targetMenu === 'pdf') {
          renderPdfColumnsChecklist();
          populatePdfSelectors();
          renderManualSelectorList();
          renderPdfPreview();
        }
        if (targetMenu === 'keamanan') renderKeamananPage();
      }

      function loadInitialData(forceRefresh, onDone) {
        var btnRef = document.getElementById('btnRefreshData');
        if (btnRef) btnRef.disabled = true;

        apiCall('bootstrap', {}, function(res) {
          if (btnRef) btnRef.disabled = false;
          if (res.user) {
            AppState.user = res.user;
            saveSessionToStorage();
            updateProfileUi();
            applyRbac();
          }
          AppState.jamaah = res.jamaah || [];
          AppState.mutasi = res.mutasi || [];
          if (res.settings) AppState.settings = res.settings;
          AppState.kegiatan = res.kegiatan || [];
          AppState.absensi = res.absensi || [];
          AppState.pengurus = res.pengurus || [];
          AppState.laporan = res.laporan || [];
          if (res.nextJamaahId) AppState.nextJamaahId = res.nextJamaahId;
          if (res.nextMutasiId) AppState.nextMutasiId = res.nextMutasiId;
          buildAbsDraftForActiveKegiatan();
          syncHeaderBranding();
          refreshAllViews();
          if (forceRefresh) showToast('Database berhasil disinkronkan.', 'success');
          if (onDone) onDone();
        }, function() {
          if (btnRef) btnRef.disabled = false;
        });
      }

      function syncHeaderBranding() {
        var s = AppState.settings;
        var hTitle = document.getElementById('headerTitleDesa');
        var hSub = document.getElementById('headerSubDesa');
        if (hTitle) hTitle.textContent = s.NAMA_DESA || 'SIDA-JAMAAH DESA';
        if (hSub) hSub.textContent = s.SUBJUDUL_KOP || 'Sistem Database & Administrasi Sekretaris Desa';
        var connTxt = document.getElementById('connectionText');
        if (connTxt) {
          var activeCount = 0;
          for (var i = 0; i < AppState.jamaah.length; i++) {
            if (AppState.jamaah[i].statusAktif === 'Aktif') activeCount++;
          }
          connTxt.textContent = activeCount + ' Jamaah Aktif';
        }
        populateDatalistKodeKK();
      }

      function populateDatalistKodeKK() {
        var dl = document.getElementById('listKodeKK');
        if (!dl) return;
        var kkMap = {};
        for (var i = 0; i < AppState.jamaah.length; i++) {
          var item = AppState.jamaah[i];
          if (item.kodeKK && (!kkMap[item.kodeKK] || item.statusKK === 'Kepala Keluarga')) {
            kkMap[item.kodeKK] = item.nama + ' (' + item.kelompok + ')';
          }
        }
        var codes = Object.keys(kkMap).sort();
        var html = '';
        for (var j = 0; j < codes.length; j++) {
          var c = codes[j];
          html += '<option value="' + escHtml(c) + '">' + escHtml(kkMap[c]) + '</option>';
        }
        dl.innerHTML = html;
      }

      function refreshAllViews() {
        syncHeaderBranding();
        populateDatalistIdJamaah();
        renderDashboard();
        applyDatabaseFilterAndRender();
        renderMutasiPage();
        populatePdfSelectors();
        renderPdfPreview();
        renderAbsensiPage();
        renderPengurusPage();
        applyRbac();
      }

      /* ======================================================================
         MENU 1: RENDER DASHBOARD ANALYTICS
         ====================================================================== */
      function renderDashboard() {
        var list = AppState.jamaah;
        var activeList = [];
        var kkSet = {};
        var countL = 0;
        var countP = 0;
        var countMT = 0;
        var countMS = 0;
        var countPengurus = 0;

        var kelompokNames = ['Al Awwabin 1', 'Al Awwabin 2', 'Kencana 1', 'Kencana 2'];
        var kelStats = {};
        for (var k = 0; k < kelompokNames.length; k++) {
          kelStats[kelompokNames[k]] = { jiwa: 0, kkSet: {}, l: 0, p: 0, mubaligh: 0 };
        }

        var usiaCats = ['BALITA', 'CABERAWIT', 'REMAJA / MUDA-MUDI', 'PRA NIKAH', 'USIA NIKAH', 'DEWASA', 'LANSIA'];
        var matrixUsia = {};
        for (var u = 0; u < usiaCats.length; u++) {
          matrixUsia[usiaCats[u]] = {
            'Al Awwabin 1': 0,
            'Al Awwabin 2': 0,
            'Kencana 1': 0,
            'Kencana 2': 0,
            total: 0
          };
        }

        var ekoStats = { Aghnia: 0, Dhuafa: 0 };
        var goldarStats = { O: 0, A: 0, B: 0, AB: 0 };
        var statusNikahStats = { Menikah: 0, Belum: 0, Janda: 0, Duda: 0 };

        for (var i = 0; i < list.length; i++) {
          var r = list[i];
          if (r.statusAktif !== 'Aktif') continue;
          activeList.push(r);
          if (r.kodeKK) kkSet[r.kodeKK] = true;
          if (r.jk === 'L') countL++;
          else if (r.jk === 'P') countP++;

          if (r.kemubalighan === 'MT') countMT++;
          if (r.kemubalighan === 'MS') countMS++;
          if (r.dapukan) countPengurus++;

          if (!kelStats[r.kelompok]) {
            kelStats[r.kelompok] = { jiwa: 0, kkSet: {}, l: 0, p: 0, mubaligh: 0 };
          }
          kelStats[r.kelompok].jiwa++;
          if (r.kodeKK) kelStats[r.kelompok].kkSet[r.kodeKK] = true;
          if (r.jk === 'L') kelStats[r.kelompok].l++;
          else if (r.jk === 'P') kelStats[r.kelompok].p++;
          if (r.kemubalighan === 'MT' || r.kemubalighan === 'MS') kelStats[r.kelompok].mubaligh++;

          var kat = r.kategoriUsia || 'DEWASA';
          if (!matrixUsia[kat]) {
            matrixUsia[kat] = { 'Al Awwabin 1': 0, 'Al Awwabin 2': 0, 'Kencana 1': 0, 'Kencana 2': 0, total: 0 };
          }
          if (matrixUsia[kat][r.kelompok] !== undefined) {
            matrixUsia[kat][r.kelompok]++;
          }
          matrixUsia[kat].total++;

          if (r.kategoriEkonomi === 'Aghnia') ekoStats.Aghnia++;
          if (r.kategoriEkonomi === 'Dhuafa') ekoStats.Dhuafa++;

          var gd = r.goldar.replace('+', '');
          if (goldarStats[gd] !== undefined) goldarStats[gd]++;

          if (statusNikahStats[r.statusNikah] !== undefined) statusNikahStats[r.statusNikah]++;
        }

        var totalKKCount = Object.keys(kkSet).length;
        var avgKK = totalKKCount > 0 ? (activeList.length / totalKKCount).toFixed(1) : '0';

        var mutMasuk = 0;
        var mutKeluar = 0;
        for (var m = 0; m < AppState.mutasi.length; m++) {
          if (AppState.mutasi[m].jenis === 'MASUK') mutMasuk++;
          else mutKeluar++;
        }

        animateNumberCounter('statTotalJamaah', activeList.length);
        document.getElementById('statGenderBreakdown').textContent = 'Laki-laki: ' + countL + ' • Perempuan: ' + countP;
        animateNumberCounter('statTotalKK', totalKKCount);
        document.getElementById('statAvgKK').textContent = 'Rata-rata ' + avgKK + ' jiwa per keluarga';
        animateNumberCounter('statTotalMubaligh', countMT + countMS);
        document.getElementById('statSubMubaligh').textContent = 'MT: ' + countMT + ' • MS: ' + countMS + ' • Dapukan: ' + countPengurus;
        animateNumberCounter('statTotalMutasi', AppState.mutasi.length);
        document.getElementById('statSubMutasi').textContent = 'Masuk: ' + mutMasuk + ' • Keluar/Wafat: ' + mutKeluar;

        var totalPop = Math.max(1, activeList.length);

        // Render 4 Kelompok Cards with Interactive Progress Bar
        var kelHtml = '';
        for (var idx = 0; idx < kelompokNames.length; idx++) {
          var kName = kelompokNames[idx];
          var ks = kelStats[kName];
          var kkNum = Object.keys(ks.kkSet).length;
          var pctKel = Math.round((ks.jiwa / totalPop) * 100);
          kelHtml += '<div class="kelompok-card" data-jumpkelompok="' + escHtml(kName) + '" title="Klik untuk memfilter jamaah ' + escHtml(kName) + '">' +
            '<div class="kelompok-head">' +
              '<span class="kelompok-name">' + escHtml(kName) + '</span>' +
              '<span class="badge badge-dewasa">' + kkNum + ' KK (' + pctKel + '%)</span>' +
            '</div>' +
            '<div class="kelompok-stats">' +
              '<div class="k-stat-box"><div class="k-stat-num">' + ks.jiwa + '</div><div class="k-stat-lbl">Jiwa</div></div>' +
              '<div class="k-stat-box"><div class="k-stat-num">' + ks.l + ' / ' + ks.p + '</div><div class="k-stat-lbl">L / P</div></div>' +
              '<div class="k-stat-box"><div class="k-stat-num">' + ks.mubaligh + '</div><div class="k-stat-lbl">MT/MS</div></div>' +
            '</div>' +
            '<div class="stat-progress-track"><div class="stat-progress-fill" style="width:' + pctKel + '%;"></div></div>' +
          '</div>';
        }
        document.getElementById('dashboardKelompokGrid').innerHTML = kelHtml;

        // Render Matrix Kategori Usia with Visual Share Bar
        var matHtml = '';
        for (var cIdx = 0; cIdx < usiaCats.length; cIdx++) {
          var catName = usiaCats[cIdx];
          var rowM = matrixUsia[catName];
          var pctUsia = Math.round((rowM.total / totalPop) * 100);
          matHtml += '<tr style="cursor:pointer;" data-jumpusia="' + escHtml(catName) + '" title="Klik untuk filter kategori ' + escHtml(catName) + '">' +
            '<td>' + renderKategoriUsiaBadge(catName) + '</td>' +
            '<td><strong>' + rowM['Al Awwabin 1'] + '</strong></td>' +
            '<td><strong>' + rowM['Al Awwabin 2'] + '</strong></td>' +
            '<td><strong>' + rowM['Kencana 1'] + '</strong></td>' +
            '<td><strong>' + rowM['Kencana 2'] + '</strong></td>' +
            '<td>' +
              '<div style="display:flex;align-items:center;gap:6px;">' +
                '<span class="badge badge-kk-head">' + rowM.total + ' Jiwa</span>' +
                '<span style="font-size:0.7rem;color:var(--text-muted);font-weight:700;">' + pctUsia + '%</span>' +
              '</div>' +
              '<div class="stat-progress-track" style="height:4px;margin-top:4px;"><div class="stat-progress-fill" style="width:' + pctUsia + '%;"></div></div>' +
            '</td>' +
          '</tr>';
        }
        document.getElementById('tbodyMatrixUsia').innerHTML = matHtml;

        // Render Interactive Side Stats (Click to Jump & Filter)
        var sideHtml = '<div style="display:flex;flex-direction:column;gap:14px;">' +
          '<div>' +
            '<div class="form-label" style="margin-bottom:6px;">Status Pernikahan (Klik untuk Filter)</div>' +
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">' +
              '<div class="k-stat-box clickable-stat" data-jumpnikah="Menikah"><div class="k-stat-num">' + statusNikahStats.Menikah + '</div><div class="k-stat-lbl">Menikah</div></div>' +
              '<div class="k-stat-box clickable-stat" data-jumpnikah="Belum"><div class="k-stat-num">' + statusNikahStats.Belum + '</div><div class="k-stat-lbl">Belum Nikah</div></div>' +
              '<div class="k-stat-box clickable-stat" data-jumpnikah="Janda"><div class="k-stat-num">' + statusNikahStats.Janda + '</div><div class="k-stat-lbl">Janda</div></div>' +
              '<div class="k-stat-box clickable-stat" data-jumpnikah="Duda"><div class="k-stat-num">' + statusNikahStats.Duda + '</div><div class="k-stat-lbl">Duda</div></div>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div class="form-label" style="margin-bottom:6px;">Golongan Darah Terdata (Klik untuk Filter)</div>' +
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">' +
              '<div class="k-stat-box clickable-stat" data-jumpgoldar="O"><div class="k-stat-num">' + goldarStats.O + '</div><div class="k-stat-lbl">Goldar O</div></div>' +
              '<div class="k-stat-box clickable-stat" data-jumpgoldar="A"><div class="k-stat-num">' + goldarStats.A + '</div><div class="k-stat-lbl">Goldar A</div></div>' +
              '<div class="k-stat-box clickable-stat" data-jumpgoldar="B"><div class="k-stat-num">' + goldarStats.B + '</div><div class="k-stat-lbl">Goldar B</div></div>' +
              '<div class="k-stat-box clickable-stat" data-jumpgoldar="AB"><div class="k-stat-num">' + goldarStats.AB + '</div><div class="k-stat-lbl">Goldar AB</div></div>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div class="form-label" style="margin-bottom:6px;">Kategori Ekonomi &amp; Mubaligh (Klik untuk Filter)</div>' +
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">' +
              '<div class="k-stat-box clickable-stat" data-jumpeko="Aghnia"><div class="k-stat-num">' + ekoStats.Aghnia + '</div><div class="k-stat-lbl">Aghnia</div></div>' +
              '<div class="k-stat-box clickable-stat" data-jumpeko="Dhuafa"><div class="k-stat-num">' + ekoStats.Dhuafa + '</div><div class="k-stat-lbl">Dhuafa</div></div>' +
              '<div class="k-stat-box clickable-stat" data-jumpmub="ADA_MUBALIGH"><div class="k-stat-num">' + (countMT + countMS) + '</div><div class="k-stat-lbl">Mubaligh</div></div>' +
            '</div>' +
          '</div>' +
        '</div>';
        document.getElementById('dashboardSideStats').innerHTML = sideHtml;
      }

      function renderKategoriUsiaBadge(kat) {
        var k = String(kat || '').toUpperCase();
        var cls = 'badge-dewasa';
        if (k === 'BALITA') cls = 'badge-balita';
        else if (k === 'CABERAWIT') cls = 'badge-caberawit';
        else if (k.indexOf('REMAJA') !== -1) cls = 'badge-remaja';
        else if (k === 'PRA NIKAH') cls = 'badge-pranikah';
        else if (k === 'USIA NIKAH') cls = 'badge-usianikah';
        else if (k === 'LANSIA') cls = 'badge-lansia';
        return '<span class="badge ' + cls + '">' + escHtml(kat || '-') + '</span>';
      }

      /* ======================================================================
         MENU 2: DATABASE FILTERING, PAGINATION & CRUD
         ====================================================================== */
      function getFilteredJamaahFromControls() {
        var q = String(document.getElementById('fSearch').value || '').toLowerCase().trim();
        var fKel = document.getElementById('fKelompok').value;
        var fKat = document.getElementById('fKategoriUsia').value;
        var fJK = document.getElementById('fJK').value;
        var fSKK = document.getElementById('fStatusKK').value;
        var fAktif = document.getElementById('fStatusAktif').value;
        var fNikah = document.getElementById('fStatusNikah').value;
        var fMub = document.getElementById('fMubaligh').value;
        var fEko = document.getElementById('fEkonomi').value;
        var fGol = document.getElementById('fGoldar').value;

        var res = [];
        for (var i = 0; i < AppState.jamaah.length; i++) {
          var item = AppState.jamaah[i];
          if (fAktif && fAktif !== 'SEMUA' && item.statusAktif !== fAktif) continue;
          if (fKel && item.kelompok !== fKel) continue;
          if (fKat && item.kategoriUsia !== fKat) continue;
          if (fJK && item.jk !== fJK) continue;
          if (fSKK && item.statusKK !== fSKK) continue;
          if (fNikah && item.statusNikah.toLowerCase() !== fNikah.toLowerCase()) continue;
          if (fEko && item.kategoriEkonomi.toLowerCase() !== fEko.toLowerCase()) continue;
          if (fGol && item.goldar.replace('+', '') !== fGol) continue;
          if (fMub) {
            if (fMub === 'ADA_MUBALIGH' && !item.kemubalighan) continue;
            if (fMub !== 'ADA_MUBALIGH' && item.kemubalighan !== fMub) continue;
          }
          if (q) {
            var hay = [
              item.id, item.kodeKK, item.nama, item.tempatLahir, item.kelompok,
              item.dapukan, item.pendidikan, item.lembaga, item.noHp, item.kategoriUsia
            ].join(' ').toLowerCase();
            if (hay.indexOf(q) === -1) continue;
          }
          res.push(item);
        }
        return res;
      }

      function animateNumberCounter(elId, targetNum) {
        var el = document.getElementById(elId);
        if (!el) return;
        var target = parseInt(targetNum, 10) || 0;
        var start = 0;
        var duration = 380;
        var startTime = null;
        function step(ts) {
          if (!startTime) startTime = ts;
          var progress = Math.min((ts - startTime) / duration, 1);
          var ease = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(start + (target - start) * ease);
          if (progress < 1) window.requestAnimationFrame(step);
          else el.textContent = target;
        }
        if (window.requestAnimationFrame) window.requestAnimationFrame(step);
        else el.textContent = target;
      }

      function formatWaHref(noHp, nama) {
        if (!noHp) return '';
        var clean = String(noHp).replace(/[^0-9]/g, '');
        if (!clean) return '';
        if (clean.indexOf('0') === 0) clean = '62' + clean.substring(1);
        else if (clean.indexOf('8') === 0) clean = '62' + clean;
        var greet = 'Assalamu\'alaikum ' + (nama || '') + ', ';
        return 'https://wa.me/' + clean + '?text=' + encodeURIComponent(greet);
      }

      function renderJamaahInteractiveCards(pageItems, startIdx) {
        var grid = document.getElementById('jamaahCardsGrid');
        if (!grid) return;
        if (pageItems.length === 0) {
          grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text-muted);">Tidak ada data jamaah yang cocok dengan filter pencarian.</div>';
          return;
        }
        var html = '';
        for (var i = 0; i < pageItems.length; i++) {
          var r = pageItems[i];
          var initials = String(r.nama || 'J').replace(/^(Bp|Ibu|H|Hj|Ananda)\.?\s+/gi, '').trim().split(/\s+/).slice(0, 2).map(function(s) { return s.charAt(0).toUpperCase(); }).join('') || 'JM';
          var kelCls = 'kel-aa1';
          if (r.kelompok === 'Al Awwabin 2') kelCls = 'kel-aa2';
          else if (r.kelompok === 'Kencana 1') kelCls = 'kel-kc1';
          else if (r.kelompok === 'Kencana 2') kelCls = 'kel-kc2';

          var kkBadgeCls = r.statusKK === 'Kepala Keluarga' ? 'badge-kk-head' : 'badge-kk-member';
          var ttlText = (r.tempatLahir ? escHtml(r.tempatLahir) : '-') + (r.tglLahir ? ', ' + escHtml(r.tglLahir) : '');
          var waHref = formatWaHref(r.noHp, r.nama);
          var tags = [];
          if (r.dapukan) tags.push('<span class="badge badge-kk-head">' + escHtml(r.dapukan) + '</span>');
          if (r.kemubalighan) tags.push('<span class="badge badge-caberawit">' + escHtml(r.kemubalighan) + '</span>');
          if (r.kategoriEkonomi) tags.push('<span class="badge badge-remaja">' + escHtml(r.kategoriEkonomi) + '</span>');

          html += '<div class="jm-card">' +
            '<div>' +
              '<div class="jm-card-top">' +
                '<div class="jm-avatar ' + kelCls + '">' + escHtml(initials) + '</div>' +
                '<div class="jm-head-info">' +
                  '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">' +
                    '<div class="jm-name">' + (startIdx + i + 1) + '. ' + escHtml(r.nama) + '</div>' +
                    renderKategoriUsiaBadge(r.kategoriUsia) +
                  '</div>' +
                  '<div class="jm-sub">' +
                    '<span class="badge ' + kkBadgeCls + '">' + escHtml(r.statusKK) + '</span>' +
                    '<span>• ' + escHtml(r.kelompok) + '</span>' +
                    '<span>• ' + (r.jk === 'L' ? 'Laki-laki' : 'Perempuan') + '</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div class="jm-meta-grid" style="margin-top:10px;">' +
                '<div class="jm-meta-item"><span class="jm-meta-lbl">Kode KK &amp; Nikah</span><span class="jm-meta-val">' + escHtml(r.kodeKK) + ' (' + escHtml(r.statusNikah) + ')</span></div>' +
                '<div class="jm-meta-item"><span class="jm-meta-lbl">Usia &amp; Goldar</span><span class="jm-meta-val">' + (r.usia !== '' ? escHtml(r.usia) + ' Thn' : '-') + ' • Goldar: ' + (r.goldar ? escHtml(r.goldar) : '-') + '</span></div>' +
                '<div class="jm-meta-item"><span class="jm-meta-lbl">Tempat, Tgl Lahir</span><span class="jm-meta-val">' + ttlText + '</span></div>' +
                '<div class="jm-meta-item"><span class="jm-meta-lbl">Pendidikan</span><span class="jm-meta-val">' + (r.pendidikan ? escHtml(r.pendidikan) : '-') + (r.lembaga ? ' (' + escHtml(r.lembaga) + ')' : '') + '</span></div>' +
              '</div>' +
              (tags.length ? '<div style="margin-top:8px;display:flex;gap:5px;flex-wrap:wrap;">' + tags.join('') + '</div>' : '') +
            '</div>' +
            '<div class="jm-card-actions">' +
              '<div style="display:flex;gap:5px;flex-wrap:wrap;">' +
                '<button type="button" class="btn btn-outline btn-sm" data-action="view-kk" data-kk="' + escHtml(r.kodeKK) + '">KK (' + escHtml(r.kodeKK) + ')</button>' +
                (waHref ? '<a href="' + escHtml(waHref) + '" target="_blank" rel="noopener" class="btn btn-wa btn-sm" style="text-decoration:none;">WA</a>' : '') +
              '</div>' +
              '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +
                '<button type="button" class="btn btn-soft btn-sm" data-roles="admin,pengurus" data-action="print-biodata" data-id="' + escHtml(r.id) + '">PDF</button>' +
                '<button type="button" class="btn btn-outline btn-sm" data-roles="admin" data-action="edit-jamaah" data-id="' + escHtml(r.id) + '">Edit</button>' +
                '<button type="button" class="btn btn-danger-soft btn-sm" data-roles="admin" data-action="mutasi-keluar" data-id="' + escHtml(r.id) + '">Keluar</button>' +
              '</div>' +
            '</div>' +
          '</div>';
        }
        grid.innerHTML = html;
      }

      function setDatabaseViewMode(mode) {
        AppState.viewMode = mode === 'cards' ? 'cards' : 'table';
        var tblScroll = document.getElementById('jamaahTableScroll');
        var cardsGrid = document.getElementById('jamaahCardsGrid');
        var btnTbl = document.getElementById('btnViewTable');
        var btnCrd = document.getElementById('btnViewCards');
        if (tblScroll) tblScroll.style.display = AppState.viewMode === 'table' ? 'block' : 'none';
        if (cardsGrid) cardsGrid.style.display = AppState.viewMode === 'cards' ? 'grid' : 'none';
        if (btnTbl) btnTbl.classList.toggle('active', AppState.viewMode === 'table');
        if (btnCrd) btnCrd.classList.toggle('active', AppState.viewMode === 'cards');
      }

      function applyDatabaseFilterAndRender() {
        AppState.filteredJamaah = getFilteredJamaahFromControls();
        var total = AppState.filteredJamaah.length;
        var pSize = parseInt(document.getElementById('pageSizeSelect').value, 10) || 50;
        AppState.pageSize = pSize;
        var totalPages = Math.max(1, Math.ceil(total / pSize));
        if (AppState.currentPage > totalPages) AppState.currentPage = totalPages;
        if (AppState.currentPage < 1) AppState.currentPage = 1;

        var startIdx = (AppState.currentPage - 1) * pSize;
        var endIdx = Math.min(startIdx + pSize, total);
        var pageItems = AppState.filteredJamaah.slice(startIdx, endIdx);

        var tbody = document.getElementById('tbodyJamaah');
        if (pageItems.length === 0) {
          tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:28px;color:var(--text-muted);">Tidak ada data jamaah yang cocok dengan filter pencarian.</td></tr>';
        } else {
          var html = '';
          for (var i = 0; i < pageItems.length; i++) {
            var r = pageItems[i];
            var kkBadgeCls = r.statusKK === 'Kepala Keluarga' ? 'badge-kk-head' : 'badge-kk-member';
            var stBadgeCls = r.statusAktif === 'Aktif' ? 'badge-aktif' : (r.statusAktif === 'Wafat' ? 'badge-wafat' : 'badge-keluar');
            var ttlText = (r.tempatLahir ? escHtml(r.tempatLahir) : '-') + (r.tglLahir ? ', ' + escHtml(r.tglLahir) : '');
            var pendText = r.pendidikan ? escHtml(r.pendidikan) : '-';
            if (r.kelas) pendText += ' (Kls: ' + escHtml(r.kelas) + ')';
            var dapukanParts = [];
            if (r.dapukan) dapukanParts.push('<span class="badge badge-kk-head">' + escHtml(r.dapukan) + '</span>');
            if (r.kemubalighan) dapukanParts.push('<span class="badge badge-caberawit">' + escHtml(r.kemubalighan) + '</span>');
            if (r.kategoriEkonomi) dapukanParts.push('<span class="badge badge-remaja">' + escHtml(r.kategoriEkonomi) + '</span>');

            html += '<tr>' +
              '<td><strong>' + (startIdx + i + 1) + '</strong></td>' +
              '<td>' +
                '<button type="button" class="btn btn-outline btn-sm" data-action="view-kk" data-kk="' + escHtml(r.kodeKK) + '" title="Lihat Anggota Keluarga ' + escHtml(r.kodeKK) + '">' +
                  escHtml(r.kodeKK) +
                '</button>' +
                '<div class="cell-sub">' + escHtml(r.kelompok) + '</div>' +
              '</td>' +
              '<td>' +
                '<div class="cell-title">' + escHtml(r.nama) + '</div>' +
                '<div class="cell-sub"><span class="badge ' + kkBadgeCls + '">' + escHtml(r.statusKK) + '</span> • ' + escHtml(r.statusNikah) + '</div>' +
              '</td>' +
              '<td>' +
                '<div class="cell-title">' + (r.jk === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)') + '</div>' +
                '<div class="cell-sub">' + ttlText + '</div>' +
              '</td>' +
              '<td>' +
                '<div class="cell-title">' + (r.usia !== '' ? escHtml(r.usia) + ' Thn' : '-') + '</div>' +
                '<div style="margin-top:3px;">' + renderKategoriUsiaBadge(r.kategoriUsia) + '</div>' +
              '</td>' +
              '<td>' +
                '<div class="cell-title">' + pendText + '</div>' +
                '<div class="cell-sub">' + (r.lembaga ? escHtml(r.lembaga) : '-') + '</div>' +
              '</td>' +
              '<td>' + (dapukanParts.length > 0 ? dapukanParts.join(' ') : '<span class="cell-sub">-</span>') + '</td>' +
              '<td>' +
                '<div class="cell-title">Goldar: ' + (r.goldar ? escHtml(r.goldar) : '-') + '</div>' +
                '<div class="cell-sub">' + (r.noHp ? ('<a href="' + escHtml(formatWaHref(r.noHp, r.nama)) + '" target="_blank" rel="noopener" style="color:var(--primary);font-weight:700;text-decoration:none;" title="Chat WhatsApp">' + escHtml(r.noHp) + ' ↗</a>') : '-') + '</div>' +
              '</td>' +
              '<td><span class="badge ' + stBadgeCls + '">' + escHtml(r.statusAktif) + '</span></td>' +
              '<td style="text-align:right;white-space:nowrap;">' +
                '<div style="display:inline-flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;">' +
                  '<button type="button" class="btn btn-soft btn-sm" data-roles="admin,pengurus" data-action="print-biodata" data-id="' + escHtml(r.id) + '" title="Cetak Biodata / KK">PDF</button>' +
                  '<button type="button" class="btn btn-outline btn-sm" data-roles="admin" data-action="edit-jamaah" data-id="' + escHtml(r.id) + '">Edit</button>' +
                  '<button type="button" class="btn btn-danger-soft btn-sm" data-roles="admin" data-action="mutasi-keluar" data-id="' + escHtml(r.id) + '" title="Catat Pindah / Wafat">Keluar</button>' +
                  '<button type="button" class="btn btn-danger-soft btn-sm" data-roles="admin" data-action="delete-jamaah" data-id="' + escHtml(r.id) + '" title="Hapus Baris">Hapus</button>' +
                '</div>' +
              '</td>' +
            '</tr>';
          }
          tbody.innerHTML = html;
        }
        renderJamaahInteractiveCards(pageItems, startIdx);
        setDatabaseViewMode(AppState.viewMode);
        applyRbac();

        document.getElementById('tablePaginationInfo').textContent =
          'Menampilkan ' + (total === 0 ? 0 : startIdx + 1) + ' - ' + endIdx + ' dari ' + total + ' jamaah (Total Database: ' + AppState.jamaah.length + ')';
        document.getElementById('pageIndicator').textContent = 'Hal ' + AppState.currentPage + ' / ' + totalPages;
        document.getElementById('btnPrevPage').disabled = AppState.currentPage <= 1;
        document.getElementById('btnNextPage').disabled = AppState.currentPage >= totalPages;
      }

      function findJamaahById(id) {
        for (var i = 0; i < AppState.jamaah.length; i++) {
          if (AppState.jamaah[i].id === id) return AppState.jamaah[i];
        }
        return null;
      }

      function openAddJamaahModal(prefillKK, prefillKelompok) {
        document.getElementById('modalJamaahTitle').textContent = 'Tambah Data Jamaah Baru';
        document.getElementById('inpIsEdit').value = '';
        document.getElementById('inpIdJamaah').value = AppState.nextJamaahId;
        document.getElementById('inpKelompok').value = prefillKelompok || 'Al Awwabin 1';
        document.getElementById('inpKodeKK').value = prefillKK || 'AA1-KK24';
        document.getElementById('inpStatusKK').value = prefillKK ? 'Anggota' : 'Kepala Keluarga';
        document.getElementById('inpNama').value = '';
        document.getElementById('inpJK').value = 'L';
        document.getElementById('inpTempatLahir').value = '';
        document.getElementById('inpTglLahir').value = '';
        document.getElementById('inpUsia').value = '';
        document.getElementById('inpStatusNikah').value = 'Belum';
        document.getElementById('inpKategoriUsia').value = 'AUTO';
        document.getElementById('inpPendidikan').value = '';
        document.getElementById('inpKelas').value = '';
        document.getElementById('inpLembaga').value = '';
        document.getElementById('inpDapukan').value = '';
        document.getElementById('inpEkonomi').value = '';
        document.getElementById('inpMubaligh').value = '';
        document.getElementById('inpGoldar').value = '';
        document.getElementById('inpNoHp').value = '';
        document.getElementById('inpStatusAktif').value = 'Aktif';
        openModal('modalJamaah');
      }

      function openEditJamaahModal(id) {
        var r = findJamaahById(id);
        if (!r) return;
        document.getElementById('modalJamaahTitle').textContent = 'Edit Data Jamaah — ' + r.nama;
        document.getElementById('inpIsEdit').value = '1';
        document.getElementById('inpIdJamaah').value = r.id;
        document.getElementById('inpKelompok').value = r.kelompok || 'Al Awwabin 1';
        document.getElementById('inpKodeKK').value = r.kodeKK || '';
        document.getElementById('inpStatusKK').value = r.statusKK || 'Anggota';
        document.getElementById('inpNama').value = r.nama || '';
        document.getElementById('inpJK').value = r.jk || 'L';
        document.getElementById('inpTempatLahir').value = r.tempatLahir || '';
        document.getElementById('inpTglLahir').value = r.tglLahir || '';
        document.getElementById('inpUsia').value = r.usia !== '' ? r.usia : '';
        document.getElementById('inpStatusNikah').value = r.statusNikah || 'Belum';
        document.getElementById('inpKategoriUsia').value = r.kategoriUsia || 'DEWASA';
        document.getElementById('inpPendidikan').value = r.pendidikan || '';
        document.getElementById('inpKelas').value = r.kelas || '';
        document.getElementById('inpLembaga').value = r.lembaga || '';
        document.getElementById('inpDapukan').value = r.dapukan || '';
        document.getElementById('inpEkonomi').value = r.kategoriEkonomi || '';
        document.getElementById('inpMubaligh').value = r.kemubalighan || '';
        document.getElementById('inpGoldar').value = r.goldar || '';
        document.getElementById('inpNoHp').value = r.noHp || '';
        document.getElementById('inpStatusAktif').value = r.statusAktif || 'Aktif';
        openModal('modalJamaah');
      }

      function handleSaveJamaahSubmit(e) {
        if (e) e.preventDefault();
        var btn = document.getElementById('btnSubmitJamaah');
        btn.disabled = true;

        var isEdit = document.getElementById('inpIsEdit').value === '1';
        var tglLahir = String(document.getElementById('inpTglLahir').value || '').trim();
        var usiaRaw = String(document.getElementById('inpUsia').value || '').trim();
        var usiaNum = usiaRaw !== '' ? parseInt(usiaRaw, 10) : '';
        if (tglLahir && usiaNum === '') {
          var parts = tglLahir.split('-');
          if (parts.length === 3) {
            var now = new Date();
            var age = now.getFullYear() - parseInt(parts[0], 10);
            var mDiff = now.getMonth() - (parseInt(parts[1], 10) - 1);
            if (mDiff < 0 || (mDiff === 0 && now.getDate() < parseInt(parts[2], 10))) age--;
            if (age >= 0) usiaNum = age;
          }
        }
        var statusNikah = String(document.getElementById('inpStatusNikah').value || 'Belum').trim();
        var pendidikan = String(document.getElementById('inpPendidikan').value || '').trim();
        var nama = String(document.getElementById('inpNama').value || '').trim();
        var katInput = String(document.getElementById('inpKategoriUsia').value || 'AUTO').trim();
        var finalKat = katInput === 'AUTO'
          ? computeKategoriUsia('', usiaNum === '' ? NaN : usiaNum, statusNikah, pendidikan, nama)
          : katInput;

        var payload = {
          isEdit: isEdit,
          id: String(document.getElementById('inpIdJamaah').value || '').trim(),
          kelompok: String(document.getElementById('inpKelompok').value || 'Al Awwabin 1').trim(),
          kodeKK: String(document.getElementById('inpKodeKK').value || '').trim(),
          statusKK: String(document.getElementById('inpStatusKK').value || 'Anggota').trim(),
          nama: nama,
          jk: String(document.getElementById('inpJK').value || 'L').trim(),
          tempatLahir: String(document.getElementById('inpTempatLahir').value || '').trim(),
          tglLahir: tglLahir,
          usia: usiaNum,
          statusNikah: statusNikah,
          kategoriUsia: finalKat,
          pendidikan: pendidikan,
          kelas: String(document.getElementById('inpKelas').value || '').trim(),
          lembaga: String(document.getElementById('inpLembaga').value || '').trim(),
          dapukan: String(document.getElementById('inpDapukan').value || '').trim(),
          kategoriEkonomi: String(document.getElementById('inpEkonomi').value || '').trim(),
          kemubalighan: String(document.getElementById('inpMubaligh').value || '').trim(),
          goldar: String(document.getElementById('inpGoldar').value || '').trim(),
          noHp: String(document.getElementById('inpNoHp').value || '').trim(),
          statusAktif: String(document.getElementById('inpStatusAktif').value || 'Aktif').trim()
        };

        apiCall('saveJamaah', payload, function(res) {
          btn.disabled = false;
          if (res.record) upsertJamaahInCache(res.record);
          if (res.nextJamaahId) AppState.nextJamaahId = res.nextJamaahId;
          closeModal('modalJamaah');
          refreshAllViews();
          showToast(res.message || 'Data jamaah berhasil disimpan.', 'success');
        }, function() {
          btn.disabled = false;
        });
      }

      function upsertJamaahInCache(record) {
        var found = false;
        for (var i = 0; i < AppState.jamaah.length; i++) {
          if (AppState.jamaah[i].id === record.id) {
            AppState.jamaah[i] = record;
            found = true;
            break;
          }
        }
        if (!found) {
          AppState.jamaah.push(record);
        }
      }

      function openDetailKKModal(kodeKK) {
        AppState.activeDetailKKCode = kodeKK;
        var members = [];
        var headName = '-';
        var kelompokName = '-';
        for (var i = 0; i < AppState.jamaah.length; i++) {
          var r = AppState.jamaah[i];
          if (r.kodeKK === kodeKK) {
            members.push(r);
            kelompokName = r.kelompok;
            if (r.statusKK === 'Kepala Keluarga') headName = r.nama;
          }
        }
        if (headName === '-' && members.length > 0) headName = members[0].nama;

        document.getElementById('modalDetailKKTitle').textContent = 'Kartu Keluarga ' + kodeKK + ' — ' + headName;
        var html = '<div style="margin-bottom:12px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid var(--border-color);">' +
          '<div><strong>Kode KK:</strong> ' + escHtml(kodeKK) + '</div>' +
          '<div><strong>Kepala Keluarga:</strong> ' + escHtml(headName) + '</div>' +
          '<div><strong>Kelompok:</strong> ' + escHtml(kelompokName) + '</div>' +
          '<div><strong>Jumlah Anggota:</strong> ' + members.length + ' Jiwa</div>' +
        '</div>' +
        '<div class="table-scroll"><table class="data-table"><thead><tr>' +
          '<th>No</th><th>Nama Lengkap</th><th>Peran</th><th>L/P</th><th>Tgl Lahir &amp; Usia</th><th>Kategori Usia</th><th>Pendidikan</th><th>Status</th><th>Aksi</th>' +
        '</tr></thead><tbody>';

        for (var j = 0; j < members.length; j++) {
          var m = members[j];
          html += '<tr>' +
            '<td>' + (j + 1) + '</td>' +
            '<td><strong>' + escHtml(m.nama) + '</strong></td>' +
            '<td>' + escHtml(m.statusKK) + '</td>' +
            '<td>' + escHtml(m.jk) + '</td>' +
            '<td>' + (m.tglLahir ? escHtml(m.tglLahir) : '-') + ' (' + (m.usia !== '' ? escHtml(m.usia) + ' Thn' : '-') + ')</td>' +
            '<td>' + renderKategoriUsiaBadge(m.kategoriUsia) + '</td>' +
            '<td>' + escHtml(m.pendidikan || '-') + '</td>' +
            '<td>' + escHtml(m.statusAktif) + '</td>' +
            '<td><button type="button" class="btn btn-outline btn-sm" data-action="edit-from-kk" data-id="' + escHtml(m.id) + '">Edit</button></td>' +
          '</tr>';
        }
        html += '</tbody></table></div>';
        document.getElementById('modalDetailKKBody').innerHTML = html;
        openModal('modalDetailKK');
      }

      /* ======================================================================
         MENU 3: JAMAAH MASUK & KELUAR (MUTASI)
         ====================================================================== */
      function renderMutasiPage() {
        var list = AppState.mutasi;
        var countMasuk = 0;
        var countKeluar = 0;
        var countWafat = 0;
        for (var i = 0; i < list.length; i++) {
          if (list[i].jenis === 'MASUK') countMasuk++;
          else if (list[i].kategoriMutasi === 'Wafat') countWafat++;
          else countKeluar++;
        }
        document.getElementById('mutStatTotal').textContent = list.length;
        document.getElementById('mutStatMasuk').textContent = countMasuk;
        document.getElementById('mutStatKeluar').textContent = countKeluar;
        document.getElementById('mutStatWafat').textContent = countWafat;

        var q = String(document.getElementById('fMutasiSearch').value || '').toLowerCase().trim();
        var fJenis = document.getElementById('fMutasiJenis').value;
        var fKel = document.getElementById('fMutasiKelompok').value;

        var filtered = [];
        for (var j = 0; j < list.length; j++) {
          var m = list[j];
          if (fJenis && m.jenis !== fJenis) continue;
          if (fKel && m.kelompok !== fKel) continue;
          if (q) {
            var hay = [m.idMutasi, m.nama, m.idJamaah, m.kelompok, m.kategoriMutasi, m.keterangan].join(' ').toLowerCase();
            if (hay.indexOf(q) === -1) continue;
          }
          filtered.push(m);
        }

        var tbody = document.getElementById('tbodyMutasi');
        if (filtered.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">Belum ada riwayat mutasi yang sesuai filter.</td></tr>';
          return;
        }
        var html = '';
        for (var k = 0; k < filtered.length; k++) {
          var r = filtered[k];
          var bCls = r.jenis === 'MASUK' ? 'badge-aktif' : (r.kategoriMutasi === 'Wafat' ? 'badge-wafat' : 'badge-keluar');
          html += '<tr>' +
            '<td><strong>' + escHtml(r.idMutasi) + '</strong></td>' +
            '<td>' + escHtml(r.tanggal) + '</td>' +
            '<td><span class="badge ' + bCls + '">' + escHtml(r.jenis) + ' • ' + escHtml(r.kategoriMutasi) + '</span></td>' +
            '<td><div class="cell-title">' + escHtml(r.nama) + '</div><div class="cell-sub">' + escHtml(r.idJamaah) + '</div></td>' +
            '<td>' + escHtml(r.kelompok) + '</td>' +
            '<td>' + escHtml(r.keterangan || '-') + '</td>' +
            '<td>' + escHtml(r.dicatatOleh || 'Sekretaris Desa') + '</td>' +
          '</tr>';
        }
        tbody.innerHTML = html;
      }

      function openMutasiModal(jenisDefault, preselectedJamaahId) {
        var today = new Date().toISOString().slice(0, 10);
        document.getElementById('mutTanggal').value = today;
        document.getElementById('mutJenis').value = jenisDefault || 'MASUK';
        document.getElementById('mutKeterangan').value = '';
        document.getElementById('mutNamaBaru').value = '';

        // Populate active jamaah dropdown for KELUAR
        var sel = document.getElementById('mutSelectJamaah');
        var optHtml = '';
        for (var i = 0; i < AppState.jamaah.length; i++) {
          var j = AppState.jamaah[i];
          if (j.statusAktif === 'Aktif' || j.id === preselectedJamaahId) {
            optHtml += '<option value="' + escHtml(j.id) + '">' + escHtml(j.nama) + ' — ' + escHtml(j.kelompok) + ' (' + escHtml(j.kodeKK) + ')</option>';
          }
        }
        sel.innerHTML = optHtml;
        if (preselectedJamaahId) sel.value = preselectedJamaahId;

        syncMutasiModalVisibility();
        openModal('modalMutasi');
      }

      function syncMutasiModalVisibility() {
        var jenis = document.getElementById('mutJenis').value;
        var boxEx = document.getElementById('mutBoxExisting');
        var boxNew = document.getElementById('mutBoxNewJamaah');
        var katSel = document.getElementById('mutKategori');

        if (jenis === 'MASUK') {
          boxEx.style.display = 'none';
          boxNew.style.display = 'block';
          katSel.innerHTML = '<option value="Pindah Datang">Pindah Datang / Jamaah Baru</option><option value="Kelahiran">Kelahiran Baru</option>';
          document.getElementById('modalMutasiTitle').textContent = 'Catat Jamaah Masuk (Lahir / Pindah Datang)';
        } else {
          boxEx.style.display = 'block';
          boxNew.style.display = 'none';
          katSel.innerHTML = '<option value="Pindah Keluar">Pindah Domisili Keluar</option><option value="Wafat">Meninggal Dunia (Wafat)</option>';
          document.getElementById('modalMutasiTitle').textContent = 'Catat Jamaah Keluar / Wafat';
        }
      }

      function handleSaveMutasiSubmit(e) {
        if (e) e.preventDefault();
        var btn = document.getElementById('btnSubmitMutasi');
        btn.disabled = true;

        var jenis = document.getElementById('mutJenis').value;
        var kategoriMutasi = document.getElementById('mutKategori').value;
        var tanggal = document.getElementById('mutTanggal').value;
        var dicatatOleh = document.getElementById('mutDicatatOleh').value;
        var keterangan = document.getElementById('mutKeterangan').value;

        var payload = {
          jenis: jenis,
          kategoriMutasi: kategoriMutasi,
          tanggal: tanggal,
          dicatatOleh: dicatatOleh,
          keterangan: keterangan
        };

        if (jenis === 'MASUK') {
          payload.nama = String(document.getElementById('mutNamaBaru').value || '').trim();
          if (!payload.nama) {
            btn.disabled = false;
            showToast('Nama Jamaah Masuk wajib diisi.', 'error');
            return;
          }
          payload.kelompok = document.getElementById('mutKelompokBaru').value;
          payload.kodeKK = String(document.getElementById('mutKodeKKBaru').value || 'AA1-KK24').trim();
          payload.jk = document.getElementById('mutJKBaru').value;
          payload.tglLahir = document.getElementById('mutTglLahirBaru').value;
          payload.statusKK = kategoriMutasi === 'Kelahiran' ? 'Anggota' : 'Kepala Keluarga';
        } else {
          payload.idJamaah = document.getElementById('mutSelectJamaah').value;
        }

        if (AppState.isGasEnv && !AppState.isPreview) {
          apiCall('catatMutasi', payload, function(res) {
            btn.disabled = false;
            if (res.jamaahRecord) upsertJamaahInCache(res.jamaahRecord);
            if (res.mutasiRecord) AppState.mutasi.unshift(res.mutasiRecord);
            if (res.nextJamaahId) AppState.nextJamaahId = res.nextJamaahId;
            if (res.nextMutasiId) AppState.nextMutasiId = res.nextMutasiId;
            closeModal('modalMutasi');
            refreshAllViews();
            showToast(res.message || 'Catatan mutasi berhasil disimpan.', 'success');
          }, function() {
            btn.disabled = false;
          });
        } else {
          btn.disabled = false;
          var newMutId = computeNextId(AppState.mutasi, 'idMutasi', 'MTS-202611-');
          if (jenis === 'MASUK') {
            var newJId = computeNextId(AppState.jamaah, 'id', 'JMH-202611-');
            var newRec = {
              id: newJId,
              kodeKK: payload.kodeKK || 'AA1-KK24',
              statusKK: payload.statusKK,
              noUrut: AppState.jamaah.length + 1,
              kelompok: payload.kelompok,
              nama: payload.nama,
              tempatLahir: 'Bandung',
              tglLahir: payload.tglLahir || '',
              usia: kategoriMutasi === 'Kelahiran' ? 0 : '',
              jk: payload.jk,
              statusNikah: kategoriMutasi === 'Kelahiran' ? 'Belum' : 'Menikah',
              pendidikan: '',
              kelas: '',
              lembaga: '',
              dapukan: '',
              kategoriEkonomi: '',
              kategoriUsia: kategoriMutasi === 'Kelahiran' ? 'BALITA' : 'USIA PRODUKTIF',
              goldar: '',
              kemubalighan: '',
              noHp: '',
              statusAktif: 'Aktif',
              updatedAt: tanggal
            };
            upsertJamaahInCache(newRec);
            AppState.mutasi.unshift({
              idMutasi: newMutId,
              tanggal: tanggal,
              jenis: 'MASUK',
              kategoriMutasi: kategoriMutasi,
              idJamaah: newJId,
              nama: payload.nama,
              kelompok: payload.kelompok,
              keterangan: keterangan,
              dicatatOleh: dicatatOleh
            });
          } else {
            var targetJ = findJamaahById(payload.idJamaah);
            if (targetJ) {
              targetJ.statusAktif = kategoriMutasi === 'Wafat' ? 'Wafat' : 'Pindah Keluar';
              AppState.mutasi.unshift({
                idMutasi: newMutId,
                tanggal: tanggal,
                jenis: 'KELUAR',
                kategoriMutasi: kategoriMutasi,
                idJamaah: targetJ.id,
                nama: targetJ.nama,
                kelompok: targetJ.kelompok,
                keterangan: keterangan,
                dicatatOleh: dicatatOleh
              });
            }
          }
          recordPreviewAudit('MUTASI_' + jenis, 'RiwayatMutasi', kategoriMutasi + ': ' + (payload.nama || payload.idJamaah));
          persistLocalDb();
          closeModal('modalMutasi');
          refreshAllViews();
          showToast('Catatan mutasi ' + jenis + ' berhasil disimpan ke perangkat.', 'success');
        }
      }

            /* ======================================================================
         MENU 4: STUDIO CUSTOM PDF & PRINT ENGINE (REKAP TABEL + KK & BIODATA)
         ====================================================================== */
      function renderPdfColumnsChecklist() {
        var container = document.getElementById('pdfColumnsChecklist');
        if (!container) return;
        var html = '';
        for (var i = 0; i < AppState.pdfColumns.length; i++) {
          var c = AppState.pdfColumns[i];
          html += '<label class="col-check-item">' +
            '<input type="checkbox" data-pdfcol="' + escHtml(c.key) + '" ' + (c.checked ? 'checked' : '') + '> ' +
            escHtml(c.label) +
          '</label>';
        }
        container.innerHTML = html;
      }

      function populatePdfSelectors() {
        renderPdfColumnsChecklist();

        // Populate KK selector (95 KK)
        var kkSelect = document.getElementById('pdfSelectKK');
        var kkMap = {};
        var kkOrder = [];
        for (var i = 0; i < AppState.jamaah.length; i++) {
          var r = AppState.jamaah[i];
          if (!r.kodeKK) continue;
          if (!kkMap[r.kodeKK]) {
            kkMap[r.kodeKK] = { kodeKK: r.kodeKK, head: r.nama, kelompok: r.kelompok, count: 0 };
            kkOrder.push(r.kodeKK);
          }
          kkMap[r.kodeKK].count++;
          if (r.statusKK === 'Kepala Keluarga') {
            kkMap[r.kodeKK].head = r.nama;
          }
        }
        var curKKVal = kkSelect.value;
        var kkHtml = '';
        for (var k = 0; k < kkOrder.length; k++) {
          var code = kkOrder[k];
          var info = kkMap[code];
          kkHtml += '<option value="' + escHtml(code) + '">' +
            escHtml(code) + ' — ' + escHtml(info.head) + ' (' + escHtml(info.kelompok) + ' • ' + info.count + ' Jiwa)' +
          '</option>';
        }
        kkSelect.innerHTML = kkHtml;
        if (curKKVal && kkMap[curKKVal]) kkSelect.value = curKKVal;

        // Populate Person selector (311 Jiwa)
        var personSelect = document.getElementById('pdfSelectPerson');
        var curPVal = personSelect.value;
        var pHtml = '';
        for (var p = 0; p < AppState.jamaah.length; p++) {
          var jm = AppState.jamaah[p];
          pHtml += '<option value="' + escHtml(jm.id) + '">' +
            escHtml(jm.nama) + ' (' + escHtml(jm.kelompok) + ' • ' + escHtml(jm.kodeKK) + ')' +
          '</option>';
        }
        personSelect.innerHTML = pHtml;
        if (curPVal) personSelect.value = curPVal;

        renderManualSelectorList();
      }

      function renderManualSelectorList() {
        var container = document.getElementById('pdfManualListContainer');
        if (!container) return;
        var q = String(document.getElementById('pdfManualSearch').value || '').toLowerCase().trim();
        var html = '';
        var selectedCount = 0;
        for (var i = 0; i < AppState.jamaah.length; i++) {
          var r = AppState.jamaah[i];
          var isChecked = Boolean(AppState.manualSelectedIds[r.id]);
          if (isChecked) selectedCount++;
          if (q) {
            var hay = (r.nama + ' ' + r.kelompok + ' ' + r.kodeKK + ' ' + r.kategoriUsia).toLowerCase();
            if (hay.indexOf(q) === -1) continue;
          }
          html += '<label class="col-check-item">' +
            '<input type="checkbox" data-manualid="' + escHtml(r.id) + '" ' + (isChecked ? 'checked' : '') + '> ' +
            '<span><strong>' + escHtml(r.nama) + '</strong> (' + escHtml(r.kelompok) + ' • ' + escHtml(r.kategoriUsia) + ')</span>' +
          '</label>';
        }
        container.innerHTML = html;
        document.getElementById('manualSelectedCount').textContent = selectedCount;
      }

      function getPdfTargetRows() {
        var srcMode = document.getElementById('pdfSourceMode').value;
        if (srcMode === 'manual') {
          var manualRows = [];
          for (var i = 0; i < AppState.jamaah.length; i++) {
            if (AppState.manualSelectedIds[AppState.jamaah[i].id]) {
              manualRows.push(AppState.jamaah[i]);
            }
          }
          return manualRows;
        }

        var fKel = document.getElementById('pdfKelompok').value;
        var fKat = document.getElementById('pdfKatUsia').value;
        var fJK = document.getElementById('pdfJK').value;
        var fSKK = document.getElementById('pdfStatusKK').value;
        var fMub = document.getElementById('pdfMubaligh').value;
        var fEko = document.getElementById('pdfEkonomi').value;

        var rows = [];
        for (var j = 0; j < AppState.jamaah.length; j++) {
          var r = AppState.jamaah[j];
          if (r.statusAktif !== 'Aktif') continue;
          if (fKel && r.kelompok !== fKel) continue;
          if (fKat && r.kategoriUsia !== fKat) continue;
          if (fJK && r.jk !== fJK) continue;
          if (fSKK && r.statusKK !== fSKK) continue;
          if (fEko && r.kategoriEkonomi !== fEko) continue;
          if (fMub) {
            if (fMub === 'ADA_MUBALIGH' && !r.kemubalighan) continue;
            if (fMub !== 'ADA_MUBALIGH' && r.kemubalighan !== fMub) continue;
          }
          rows.push(r);
        }
        return rows;
      }

      function buildKopSuratHtml() {
        var showKop = document.getElementById('chkShowKop').checked;
        if (!showKop) return '';
        var s = AppState.settings;
        return '<div class="kop-surat">' +
          '<h2>' + escHtml(s.NAMA_DESA || 'DESA AL AWWABIN - KENCANA') + '</h2>' +
          '<h4>' + escHtml(s.SUBJUDUL_KOP || 'Sekretariat Pengurus Jamaah Desa') + '</h4>' +
          '<p>' + escHtml(s.ALAMAT_SEKRETARIAT || 'Bandung, Jawa Barat') + '</p>' +
        '</div>';
      }

      function buildTtdHtml() {
        var showTTD = document.getElementById('chkShowTTD').checked;
        if (!showTTD) return '';
        var s = AppState.settings;
        var todayFmt = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        return '<div class="ttd-grid">' +
          '<div>' +
            '<p>Mengetahui,</p>' +
            '<p><strong>Ketua Desa (Kides)</strong></p>' +
            '<div class="ttd-space"></div>' +
            '<p><strong><u>' + escHtml(s.NAMA_KIDES || 'Bp. H. Wahyu') + '</u></strong></p>' +
          '</div>' +
          '<div>' +
            '<p>' + escHtml(s.KOTA_TTD || 'Bandung') + ', ' + escHtml(todayFmt) + '</p>' +
            '<p><strong>Sekretaris Desa</strong></p>' +
            '<div class="ttd-space"></div>' +
            '<p><strong><u>' + escHtml(s.NAMA_SEKRETARIS || 'Sekretaris Desa') + '</u></strong></p>' +
          '</div>' +
        '</div>';
      }

      function renderPdfPreview() {
        var paper = document.getElementById('printPaperCanvas');
        var orient = document.getElementById('pdfOrientation').value;
        if (orient === 'landscape') paper.classList.add('landscape');
        else paper.classList.remove('landscape');

        var title = document.getElementById('pdfTitle').value || 'LAPORAN DATA JAMAAH DESA';
        var subtitle = document.getElementById('pdfSubtitle').value || '';
        var showSummary = document.getElementById('chkShowSummary').checked;

        if (AppState.pdfMode === 'table') {
          var rows = getPdfTargetRows();
          var activeCols = [];
          for (var c = 0; c < AppState.pdfColumns.length; c++) {
            if (AppState.pdfColumns[c].checked) activeCols.push(AppState.pdfColumns[c]);
          }

          var countL = 0;
          var countP = 0;
          var kkMap = {};
          for (var i = 0; i < rows.length; i++) {
            if (rows[i].jk === 'L') countL++;
            else if (rows[i].jk === 'P') countP++;
            if (rows[i].kodeKK) kkMap[rows[i].kodeKK] = true;
          }

          var html = buildKopSuratHtml() +
            '<div class="doc-judul">' +
              '<h3>' + escHtml(title) + '</h3>' +
              (subtitle ? '<p>' + escHtml(subtitle) + '</p>' : '') +
            '</div>';

          if (showSummary) {
            html += '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:8px 12px;background:#f8fafc;border:1px solid #334155;margin-bottom:12px;font-size:0.78rem;">' +
              '<span><strong>Total Data Tercetak:</strong> ' + rows.length + ' Jiwa</span>' +
              '<span><strong>Jumlah KK:</strong> ' + Object.keys(kkMap).length + ' KK</span>' +
              '<span><strong>Laki-laki:</strong> ' + countL + ' • <strong>Perempuan:</strong> ' + countP + '</span>' +
            '</div>';
          }

          html += '<table class="pdf-table"><thead><tr>';
          for (var h = 0; h < activeCols.length; h++) {
            html += '<th>' + escHtml(activeCols[h].label) + '</th>';
          }
          html += '</tr></thead><tbody>';

          if (rows.length === 0) {
            html += '<tr><td colspan="' + Math.max(1, activeCols.length) + '" style="text-align:center;padding:20px;">Tidak ada baris data yang dipilih untuk dicetak.</td></tr>';
          } else {
            for (var rIdx = 0; rIdx < rows.length; rIdx++) {
              var item = rows[rIdx];
              html += '<tr>';
              for (var colIdx = 0; colIdx < activeCols.length; colIdx++) {
                var key = activeCols[colIdx].key;
                var val = '';
                if (key === 'no') val = String(rIdx + 1);
                else if (key === 'ttl') val = (item.tempatLahir || '-') + (item.tglLahir ? ', ' + item.tglLahir : '');
                else if (key === 'paraf') val = (rIdx + 1) + '. ...................';
                else val = item[key] !== undefined && item[key] !== '' ? String(item[key]) : '-';
                html += '<td>' + escHtml(val) + '</td>';
              }
              html += '</tr>';
            }
          }
          html += '</tbody></table>' + buildTtdHtml();
          paper.innerHTML = html;
        } else {
          // MODE 2: KARTU KELUARGA (KK) & BIODATA PERORANGAN
          var submode = document.getElementById('pdfCardSubmode').value;
          if (submode === 'kk') {
            var targetKK = document.getElementById('pdfSelectKK').value;
            paper.innerHTML = buildSingleKKSheetHtml(targetKK, true);
          } else if (submode === 'kk_kelompok') {
            var targetGroup = document.getElementById('pdfSelectKKGroup').value;
            var kkCodesInGroup = [];
            var seenKK = {};
            for (var g = 0; g < AppState.jamaah.length; g++) {
              var jg = AppState.jamaah[g];
              if (jg.kelompok === targetGroup && jg.kodeKK && !seenKK[jg.kodeKK]) {
                seenKK[jg.kodeKK] = true;
                kkCodesInGroup.push(jg.kodeKK);
              }
            }
            var groupHtml = buildKopSuratHtml() +
              '<div class="doc-judul"><h3>DOKUMEN KARTU KELUARGA JAMAAH — KELOMPOK ' + escHtml(targetGroup.toUpperCase()) + '</h3>' +
              '<p>Total: ' + kkCodesInGroup.length + ' Kepala Keluarga (KK)</p></div>';
            for (var kc = 0; kc < kkCodesInGroup.length; kc++) {
              groupHtml += buildSingleKKSheetHtml(kkCodesInGroup[kc], false);
            }
            groupHtml += buildTtdHtml();
            paper.innerHTML = groupHtml;
          } else {
            // Lembar Biodata Perorangan
            var personId = document.getElementById('pdfSelectPerson').value;
            var person = findJamaahById(personId) || AppState.jamaah[0];
            paper.innerHTML = buildPersonBiodataHtml(person);
          }
        }
      }

      function buildSingleKKSheetHtml(kodeKK, includeKopAndTtd) {
        var members = [];
        var head = null;
        for (var i = 0; i < AppState.jamaah.length; i++) {
          var r = AppState.jamaah[i];
          if (r.kodeKK === kodeKK) {
            members.push(r);
            if (r.statusKK === 'Kepala Keluarga') head = r;
          }
        }
        if (!head && members.length > 0) head = members[0];
        var html = '';
        if (includeKopAndTtd) {
          html += buildKopSuratHtml() +
            '<div class="doc-judul">' +
              '<h3>LEMBAR KARTU KELUARGA (KK) JAMAAH DESA</h3>' +
              '<p>Nomor Kode KK: <strong>' + escHtml(kodeKK) + '</strong></p>' +
            '</div>';
        }
        html += '<div class="kk-sheet-card">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;font-size:0.82rem;background:#f8fafc;padding:10px;border:1px solid #cbd5e1;">' +
            '<div><strong>Nomor KK Desa:</strong> ' + escHtml(kodeKK) + '</div>' +
            '<div><strong>Kelompok:</strong> ' + escHtml(head ? head.kelompok : '-') + '</div>' +
            '<div><strong>Kepala Keluarga:</strong> ' + escHtml(head ? head.nama : '-') + '</div>' +
            '<div><strong>Kontak / No. HP:</strong> ' + escHtml(head && head.noHp ? head.noHp : '-') + '</div>' +
          '</div>' +
          '<table class="pdf-table" style="margin-bottom:4px;">' +
            '<thead><tr>' +
              '<th>No</th><th>Nama Lengkap</th><th>Peran KK</th><th>L/P</th><th>Tempat, Tgl Lahir</th><th>Usia</th><th>Status Nikah</th><th>Pendidikan &amp; Lembaga</th><th>Kategori Usia</th><th>Goldar</th><th>MT/MS &amp; Dapukan</th>' +
            '</tr></thead><tbody>';

        for (var m = 0; m < members.length; m++) {
          var item = members[m];
          var ttl = (item.tempatLahir || '-') + (item.tglLahir ? ', ' + item.tglLahir : '');
          var pend = (item.pendidikan || '-') + (item.lembaga ? ' (' + item.lembaga + ')' : '');
          var dap = [item.kemubalighan, item.dapukan].filter(Boolean).join(' • ') || '-';
          html += '<tr>' +
            '<td>' + (m + 1) + '</td>' +
            '<td><strong>' + escHtml(item.nama) + '</strong></td>' +
            '<td>' + escHtml(item.statusKK) + '</td>' +
            '<td>' + escHtml(item.jk) + '</td>' +
            '<td>' + escHtml(ttl) + '</td>' +
            '<td>' + (item.usia !== '' ? escHtml(item.usia) + ' Thn' : '-') + '</td>' +
            '<td>' + escHtml(item.statusNikah) + '</td>' +
            '<td>' + escHtml(pend) + '</td>' +
            '<td>' + escHtml(item.kategoriUsia) + '</td>' +
            '<td>' + escHtml(item.goldar || '-') + '</td>' +
            '<td>' + escHtml(dap) + '</td>' +
          '</tr>';
        }
        html += '</tbody></table></div>';
        if (includeKopAndTtd) html += buildTtdHtml();
        return html;
      }

      function buildPersonBiodataHtml(person) {
        if (!person) return '<p>Pilih data jamaah terlebih dahulu.</p>';
        var familyMembers = [];
        for (var i = 0; i < AppState.jamaah.length; i++) {
          if (AppState.jamaah[i].kodeKK === person.kodeKK) {
            familyMembers.push(AppState.jamaah[i]);
          }
        }
        var html = buildKopSuratHtml() +
          '<div class="doc-judul">' +
            '<h3>LEMBAR BIODATA PERSONAL JAMAAH DESA</h3>' +
            '<p>ID Registrasi: <strong>' + escHtml(person.id) + '</strong> • Kode KK: <strong>' + escHtml(person.kodeKK) + '</strong></p>' +
          '</div>' +
          '<div class="kk-sheet-card">' +
            '<h4 style="margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #cbd5e1;font-size:0.9rem;">A. DATA IDENTITAS DIRI</h4>' +
            '<div class="biodata-grid">' +
              '<div class="biodata-label">Nama Lengkap</div><div>: <strong>' + escHtml(person.nama) + '</strong></div>' +
              '<div class="biodata-label">ID Jamaah / No. Urut</div><div>: ' + escHtml(person.id) + ' (No. ' + escHtml(person.noUrut) + ')</div>' +
              '<div class="biodata-label">Kelompok</div><div>: ' + escHtml(person.kelompok) + '</div>' +
              '<div class="biodata-label">Kode KK &amp; Peran</div><div>: ' + escHtml(person.kodeKK) + ' (' + escHtml(person.statusKK) + ')</div>' +
              '<div class="biodata-label">Jenis Kelamin</div><div>: ' + (person.jk === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)') + '</div>' +
              '<div class="biodata-label">Tempat, Tanggal Lahir</div><div>: ' + escHtml(person.tempatLahir || '-') + ', ' + escHtml(person.tglLahir || '-') + '</div>' +
              '<div class="biodata-label">Usia &amp; Kategori Usia</div><div>: ' + (person.usia !== '' ? escHtml(person.usia) + ' Tahun' : '-') + ' (' + escHtml(person.kategoriUsia) + ')</div>' +
              '<div class="biodata-label">Status Pernikahan</div><div>: ' + escHtml(person.statusNikah || '-') + '</div>' +
              '<div class="biodata-label">Pendidikan &amp; Kelas</div><div>: ' + escHtml(person.pendidikan || '-') + (person.kelas ? ' (Kelas: ' + escHtml(person.kelas) + ')' : '') + '</div>' +
              '<div class="biodata-label">Lembaga Pendidikan</div><div>: ' + escHtml(person.lembaga || '-') + '</div>' +
              '<div class="biodata-label">Dapukan Pengurus</div><div>: ' + escHtml(person.dapukan || '-') + '</div>' +
              '<div class="biodata-label">Kemubalighan (MT/MS)</div><div>: ' + escHtml(person.kemubalighan || '-') + '</div>' +
              '<div class="biodata-label">Kategori Ekonomi</div><div>: ' + escHtml(person.kategoriEkonomi || 'Umum') + '</div>' +
              '<div class="biodata-label">Golongan Darah</div><div>: ' + escHtml(person.goldar || '-') + '</div>' +
              '<div class="biodata-label">Nomor HP / WhatsApp</div><div>: ' + escHtml(person.noHp || '-') + '</div>' +
              '<div class="biodata-label">Status Keaktifan</div><div>: <strong>' + escHtml(person.statusAktif) + '</strong></div>' +
            '</div>' +
            '<h4 style="margin:16px 0 10px;padding-bottom:6px;border-bottom:1px solid #cbd5e1;font-size:0.9rem;">B. DAFTAR ANGGOTA KELUARGA SERUMAH (' + escHtml(person.kodeKK) + ')</h4>' +
            '<table class="pdf-table" style="margin-bottom:0;">' +
              '<thead><tr><th>No</th><th>Nama Anggota Keluarga</th><th>Peran KK</th><th>L/P</th><th>Tgl Lahir</th><th>Usia</th><th>Kategori Usia</th><th>Pendidikan</th></tr></thead><tbody>';

        for (var f = 0; f < familyMembers.length; f++) {
          var fm = familyMembers[f];
          html += '<tr>' +
            '<td>' + (f + 1) + '</td>' +
            '<td><strong>' + escHtml(fm.nama) + '</strong></td>' +
            '<td>' + escHtml(fm.statusKK) + '</td>' +
            '<td>' + escHtml(fm.jk) + '</td>' +
            '<td>' + escHtml(fm.tglLahir || '-') + '</td>' +
            '<td>' + (fm.usia !== '' ? escHtml(fm.usia) + ' Thn' : '-') + '</td>' +
            '<td>' + escHtml(fm.kategoriUsia) + '</td>' +
            '<td>' + escHtml(fm.pendidikan || '-') + '</td>' +
          '</tr>';
        }
        html += '</tbody></table></div>' + buildTtdHtml();
        return html;
      }

      /* ======================================================================
         CSV EXPORT & IMPORT HANDLERS
         ====================================================================== */
      function exportJamaahToCsv(rowsToExport) {
        var rows = rowsToExport || AppState.jamaah;
        var headers = [
          'ID Jamaah', 'Kode KK', 'Peran KK', 'No Urut', 'Kelompok', 'Nama Lengkap',
          'Tempat Lahir', 'Tanggal Lahir', 'Usia', 'JK', 'Status Pernikahan',
          'Pendidikan', 'Kelas Sekolah', 'Nama Lembaga Pendidikan', 'Dapukan',
          'Kategori Ekonomi', 'Kategori Usia', 'Golongan Darah', 'Kemubalighan', 'No HP', 'Status Jamaah'
        ];
        var lines = [headers.join(',')];
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          var vals = [
            r.id, r.kodeKK, r.statusKK, r.noUrut, r.kelompok, r.nama,
            r.tempatLahir, r.tglLahir, r.usia, r.jk, r.statusNikah,
            r.pendidikan, r.kelas, r.lembaga, r.dapukan,
            r.kategoriEkonomi, r.kategoriUsia, r.goldar, r.kemubalighan, r.noHp, r.statusAktif
          ];
          var escaped = [];
          for (var j = 0; j < vals.length; j++) {
            var s = String(vals[j] === undefined || vals[j] === null ? '' : vals[j]).replace(/"/g, '""');
            if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1) s = '"' + s + '"';
            escaped.push(s);
          }
          lines.push(escaped.join(','));
        }
        var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Database_Jamaah_Desa_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('File CSV berhasil diunduh (' + rows.length + ' baris).', 'success');
      }

      function handleImportCsvSubmit(e) {
        if (e) e.preventDefault();
        var rawText = String(document.getElementById('inpCsvText').value || '').trim();
        if (!rawText) {
          showToast('Silakan pilih file CSV atau tempelkan teks CSV terlebih dahulu.', 'error');
          return;
        }
        var lines = rawText.split(/\r?\n/);
        var parsedPayload = [];
        var curKK = 'AA1-KK99';

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line) continue;
          var cols = parseCsvLine(line);
          if (cols.length < 4) continue;
          // Skip header row
          if (cols[0].toUpperCase() === 'KK' || cols[2].toUpperCase() === 'KELOMPOK' || cols[0].toUpperCase() === 'ID JAMAAH') continue;

          var isNewKK = cols[0] === '1' || /^KK\s*\d+/i.test(cols[0]);
          var kelompok = String(cols[2] || 'Al Awwabin 1').trim();
          var nama = String(cols[3] || '').trim();
          if (!nama) continue;

          if (isNewKK) {
            curKK = (kelompok === 'Al Awwabin 1' ? 'AA1' : kelompok === 'Al Awwabin 2' ? 'AA2' : kelompok === 'Kencana 1' ? 'KC1' : 'KC2') + '-KK' + String(AppState.jamaah.length + parsedPayload.length + 1).padStart(2, '0');
          }
          var tgl = normalizeDateStr(cols[5] || '');
          var usiaVal = cols[6] ? parseInt(cols[6], 10) : '';
          var snRaw = String(cols[8] || 'Belum').trim();
          var statusNikah = snRaw ? snRaw.charAt(0).toUpperCase() + snRaw.substring(1).toLowerCase() : 'Belum';
          var pend = String(cols[9] || '').trim();
          var katUsia = computeKategoriUsia(cols[14] || '', usiaVal === '' ? NaN : usiaVal, statusNikah, pend, nama);

          parsedPayload.push({
            kodeKK: curKK,
            statusKK: isNewKK ? 'Kepala Keluarga' : 'Anggota',
            kelompok: kelompok,
            nama: nama,
            tempatLahir: String(cols[4] || '').trim(),
            tglLahir: tgl,
            usia: usiaVal === '' || isNaN(usiaVal) ? '' : usiaVal,
            jk: String(cols[7] || 'L').trim().toUpperCase(),
            statusNikah: statusNikah,
            pendidikan: pend,
            kelas: String(cols[10] || '').trim(),
            lembaga: String(cols[11] || '').trim(),
            dapukan: String(cols[12] || '').trim(),
            kategoriEkonomi: String(cols[13] || '').trim(),
            kategoriUsia: katUsia,
            goldar: String(cols[15] || '').trim().toUpperCase(),
            kemubalighan: String(cols[16] || '').trim().toUpperCase(),
            noHp: String(cols[17] || '').trim(),
            statusAktif: 'Aktif'
          });
        }

        if (parsedPayload.length === 0) {
          showToast('Tidak ditemukan baris data valid untuk diimport.', 'error');
          return;
        }

        var btn = document.getElementById('btnSubmitImportCsv');
        btn.disabled = true;

        if (AppState.isGasEnv && !AppState.isPreview) {
          apiCall('importCsv', { records: parsedPayload }, function(res) {
            btn.disabled = false;
            if (res.addedRecords) {
              for (var a = 0; a < res.addedRecords.length; a++) {
                AppState.jamaah.push(res.addedRecords[a]);
              }
            }
            closeModal('modalImportCsv');
            refreshAllViews();
            showToast(res.message || 'Import CSV berhasil.', 'success');
          }, function() {
            btn.disabled = false;
          });
        } else {
          btn.disabled = false;
          for (var p = 0; p < parsedPayload.length; p++) {
            var item = parsedPayload[p];
            var seq = AppState.jamaah.length + 1;
            item.id = computeNextId(AppState.jamaah, 'id', 'JMH-202611-');
            item.noUrut = seq;
            AppState.jamaah.push(item);
          }
          recordPreviewAudit('IMPORT_CSV', 'DataJamaah', parsedPayload.length + ' baris');
          persistLocalDb();
          closeModal('modalImportCsv');
          refreshAllViews();
          showToast('Berhasil mengimport ' + parsedPayload.length + ' data jamaah baru ke perangkat.', 'success');
        }
      }

      function bindEvents() {
        // Navigation Buttons
        var navBtns = document.querySelectorAll('[data-nav]');
        for (var i = 0; i < navBtns.length; i++) {
          navBtns[i].addEventListener('click', function() {
            switchMenu(this.getAttribute('data-nav'));
          });
        }

        // Overflow Menu Toggle
        var btnOverflow = document.getElementById('btnToggleOverflow');
        var mobBtnMore = document.getElementById('mobBtnMore');
        var overflowMenu = document.getElementById('overflowMenu');
        function toggleOverflow(e) {
          e.stopPropagation();
          overflowMenu.classList.toggle('open');
        }
        if (btnOverflow) btnOverflow.addEventListener('click', toggleOverflow);
        if (mobBtnMore) mobBtnMore.addEventListener('click', toggleOverflow);
        document.addEventListener('click', function() {
          if (overflowMenu) overflowMenu.classList.remove('open');
        });

        // Close Modal Buttons
        var closeBtns = document.querySelectorAll('[data-closemodal]');
        for (var c = 0; c < closeBtns.length; c++) {
          closeBtns[c].addEventListener('click', function() {
            closeModal(this.getAttribute('data-closemodal'));
          });
        }

        // Header & Quick Actions
        document.getElementById('btnRefreshData').addEventListener('click', function() { loadInitialData(true); });
        document.getElementById('btnDashAddJamaah').addEventListener('click', function() { openAddJamaahModal(); });
        document.getElementById('btnDashGoPdf').addEventListener('click', function() { switchMenu('pdf'); });
        document.getElementById('btnOpenAddModal').addEventListener('click', function() { openAddJamaahModal(); });
        document.getElementById('btnOpenImportModal').addEventListener('click', function() { openModal('modalImportCsv'); });
        document.getElementById('menuOpenImport').addEventListener('click', function() { openModal('modalImportCsv'); });
        document.getElementById('menuExportCsv').addEventListener('click', function() { exportJamaahToCsv(AppState.jamaah); });
        document.getElementById('btnExportFilteredCsv').addEventListener('click', function() { exportJamaahToCsv(AppState.filteredJamaah); });

        document.getElementById('btnPrintFilteredToPdf').addEventListener('click', function() {
          document.getElementById('pdfKelompok').value = document.getElementById('fKelompok').value;
          document.getElementById('pdfKatUsia').value = document.getElementById('fKategoriUsia').value;
          document.getElementById('pdfJK').value = document.getElementById('fJK').value;
          document.getElementById('pdfStatusKK').value = document.getElementById('fStatusKK').value;
          document.getElementById('pdfMubaligh').value = document.getElementById('fMubaligh').value;
          document.getElementById('pdfEkonomi').value = document.getElementById('fEkonomi').value;
          document.getElementById('pdfSourceMode').value = 'filter';
          document.getElementById('pdfFilterCriteriaBox').style.display = 'block';
          document.getElementById('pdfManualSelectBox').style.display = 'none';
          setPdfMode('table');
          switchMenu('pdf');
        });

        // Dashboard Interactive Delegation (Click Kelompok or Matrix Usia to Filter)
        document.getElementById('sec-dashboard').addEventListener('click', function(e) {
          var kelCard = e.target.closest('[data-jumpkelompok]');
          if (kelCard) {
            var kName = kelCard.getAttribute('data-jumpkelompok');
            resetDatabaseFilters();
            document.getElementById('fKelompok').value = kName;
            switchMenu('database');
            return;
          }
          var usiaRow = e.target.closest('[data-jumpusia]');
          if (usiaRow) {
            var uName = usiaRow.getAttribute('data-jumpusia');
            resetDatabaseFilters();
            document.getElementById('fKategoriUsia').value = uName;
            switchMenu('database');
            return;
          }
          var nikahBox = e.target.closest('[data-jumpnikah]');
          if (nikahBox) {
            resetDatabaseFilters();
            document.getElementById('fStatusNikah').value = nikahBox.getAttribute('data-jumpnikah');
            switchMenu('database');
            return;
          }
          var goldarBox = e.target.closest('[data-jumpgoldar]');
          if (goldarBox) {
            resetDatabaseFilters();
            document.getElementById('fGoldar').value = goldarBox.getAttribute('data-jumpgoldar');
            switchMenu('database');
            return;
          }
          var ekoBox = e.target.closest('[data-jumpeko]');
          if (ekoBox) {
            resetDatabaseFilters();
            document.getElementById('fEkonomi').value = ekoBox.getAttribute('data-jumpeko');
            switchMenu('database');
            return;
          }
          var mubBox = e.target.closest('[data-jumpmub]');
          if (mubBox) {
            resetDatabaseFilters();
            document.getElementById('fMubaligh').value = mubBox.getAttribute('data-jumpmub');
            switchMenu('database');
          }
        });

        // Database Filter Listeners
        var filterIds = ['fSearch', 'fKelompok', 'fKategoriUsia', 'fJK', 'fStatusKK', 'fStatusAktif', 'fStatusNikah', 'fMubaligh', 'fEkonomi', 'fGoldar'];
        for (var f = 0; f < filterIds.length; f++) {
          var el = document.getElementById(filterIds[f]);
          if (el) {
            el.addEventListener('input', function() {
              AppState.currentPage = 1;
              applyDatabaseFilterAndRender();
            });
            el.addEventListener('change', function() {
              AppState.currentPage = 1;
              applyDatabaseFilterAndRender();
            });
          }
        }

        document.getElementById('btnResetFilter').addEventListener('click', function() {
          resetDatabaseFilters();
          applyDatabaseFilterAndRender();
        });

        document.getElementById('pageSizeSelect').addEventListener('change', function() {
          AppState.currentPage = 1;
          applyDatabaseFilterAndRender();
        });
        document.getElementById('btnPrevPage').addEventListener('click', function() {
          if (AppState.currentPage > 1) {
            AppState.currentPage--;
            applyDatabaseFilterAndRender();
          }
        });
        document.getElementById('btnNextPage').addEventListener('click', function() {
          AppState.currentPage++;
          applyDatabaseFilterAndRender();
        });

        // Safe Event Delegation on tbodyJamaah
        document.getElementById('tbodyJamaah').addEventListener('click', function(e) {
          var btn = e.target.closest('[data-action]');
          if (!btn) return;
          var action = btn.getAttribute('data-action');
          var id = btn.getAttribute('data-id');
          var kk = btn.getAttribute('data-kk');

          if (action === 'view-kk' && kk) {
            openDetailKKModal(kk);
          } else if (action === 'edit-jamaah' && id) {
            openEditJamaahModal(id);
          } else if (action === 'mutasi-keluar' && id) {
            openMutasiModal('KELUAR', id);
          } else if (action === 'delete-jamaah' && id) {
            handleDeleteJamaah(id);
          } else if (action === 'print-biodata' && id) {
            setPdfMode('card');
            document.getElementById('pdfCardSubmode').value = 'biodata';
            syncCardSubmodeVisibility();
            switchMenu('pdf');
            document.getElementById('pdfSelectPerson').value = id;
            renderPdfPreview();
          }
        });

        // Modal Detail KK Delegation
        document.getElementById('modalDetailKKBody').addEventListener('click', function(e) {
          var btn = e.target.closest('[data-action="edit-from-kk"]');
          if (btn) {
            closeModal('modalDetailKK');
            openEditJamaahModal(btn.getAttribute('data-id'));
          }
        });
        document.getElementById('btnAddMemberToThisKK').addEventListener('click', function() {
          var kk = AppState.activeDetailKKCode;
          var kel = 'Al Awwabin 1';
          for (var i = 0; i < AppState.jamaah.length; i++) {
            if (AppState.jamaah[i].kodeKK === kk) {
              kel = AppState.jamaah[i].kelompok;
              break;
            }
          }
          closeModal('modalDetailKK');
          openAddJamaahModal(kk, kel);
        });
        document.getElementById('btnPrintThisKK').addEventListener('click', function() {
          var kk = AppState.activeDetailKKCode;
          closeModal('modalDetailKK');
          setPdfMode('card');
          document.getElementById('pdfCardSubmode').value = 'kk';
          syncCardSubmodeVisibility();
          switchMenu('pdf');
          document.getElementById('pdfSelectKK').value = kk;
          renderPdfPreview();
        });

        // Auto-compute Usia when Tanggal Lahir changes in Form Jamaah
        document.getElementById('inpTglLahir').addEventListener('change', function() {
          var val = this.value;
          if (!val) return;
          var parts = val.split('-');
          if (parts.length === 3) {
            var now = new Date();
            var age = now.getFullYear() - parseInt(parts[0], 10);
            var mDiff = now.getMonth() - (parseInt(parts[1], 10) - 1);
            if (mDiff < 0 || (mDiff === 0 && now.getDate() < parseInt(parts[2], 10))) age--;
            if (age >= 0) document.getElementById('inpUsia').value = age;
          }
        });

        // Form Submissions
        document.getElementById('formJamaah').addEventListener('submit', handleSaveJamaahSubmit);
        document.getElementById('formMutasi').addEventListener('submit', handleSaveMutasiSubmit);
        document.getElementById('formImportCsv').addEventListener('submit', handleImportCsvSubmit);

        // File Reader for CSV Upload
        document.getElementById('inpCsvFile').addEventListener('change', function(e) {
          var file = e.target.files && e.target.files[0];
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function(evt) {
            document.getElementById('inpCsvText').value = evt.target.result || '';
          };
          reader.readAsText(file);
        });

        // Mutasi Page Controls
        document.getElementById('btnOpenMutasiMasuk').addEventListener('click', function() { openMutasiModal('MASUK'); });
        document.getElementById('btnOpenMutasiKeluar').addEventListener('click', function() { openMutasiModal('KELUAR'); });
        document.getElementById('mutJenis').addEventListener('change', syncMutasiModalVisibility);
        document.getElementById('fMutasiSearch').addEventListener('input', renderMutasiPage);
        document.getElementById('fMutasiJenis').addEventListener('change', renderMutasiPage);
        document.getElementById('fMutasiKelompok').addEventListener('change', renderMutasiPage);
        document.getElementById('btnPrintMutasiPdf').addEventListener('click', function() {
          window.print();
        });

        // Settings Modal
        function openSettingsModal() {
          var s = AppState.settings;
          document.getElementById('setNamaDesa').value = s.NAMA_DESA || '';
          document.getElementById('setSubjudulKop').value = s.SUBJUDUL_KOP || '';
          document.getElementById('setAlamat').value = s.ALAMAT_SEKRETARIAT || '';
          document.getElementById('setKotaTtd').value = s.KOTA_TTD || '';
          document.getElementById('setNamaKides').value = s.NAMA_KIDES || '';
          document.getElementById('setNamaSekretaris').value = s.NAMA_SEKRETARIS || '';
          openModal('modalSettings');
        }
        document.getElementById('menuOpenSettings').addEventListener('click', openSettingsModal);
        document.getElementById('btnPdfOpenSettings').addEventListener('click', openSettingsModal);
        document.getElementById('formSettings').addEventListener('submit', function(e) {
          e.preventDefault();
          var newSet = {
            NAMA_DESA: String(document.getElementById('setNamaDesa').value || '').trim(),
            SUBJUDUL_KOP: String(document.getElementById('setSubjudulKop').value || '').trim(),
            ALAMAT_SEKRETARIAT: String(document.getElementById('setAlamat').value || '').trim(),
            KOTA_TTD: String(document.getElementById('setKotaTtd').value || '').trim(),
            NAMA_KIDES: String(document.getElementById('setNamaKides').value || '').trim(),
            NAMA_SEKRETARIS: String(document.getElementById('setNamaSekretaris').value || '').trim()
          };
          AppState.settings = newSet;
          syncHeaderBranding();
          renderPdfPreview();
          closeModal('modalSettings');
          apiCall('saveSettings', newSet, function(res) {
            if (res.settings) AppState.settings = res.settings;
            syncHeaderBranding();
            renderPdfPreview();
            showToast(res.message || 'Pengaturan kop surat & pejabat desa berhasil disimpan.', 'success');
          });
        });

        // Studio PDF Controls
        document.getElementById('tabModeTable').addEventListener('click', function() { setPdfMode('table'); });
        document.getElementById('tabModeCard').addEventListener('click', function() { setPdfMode('card'); });

        document.getElementById('pdfSourceMode').addEventListener('change', function() {
          var isManual = this.value === 'manual';
          document.getElementById('pdfFilterCriteriaBox').style.display = isManual ? 'none' : 'block';
          document.getElementById('pdfManualSelectBox').style.display = isManual ? 'block' : 'none';
          renderPdfPreview();
        });

        document.getElementById('pdfManualSearch').addEventListener('input', renderManualSelectorList);
        document.getElementById('pdfManualListContainer').addEventListener('change', function(e) {
          var cb = e.target.closest('[data-manualid]');
          if (!cb) return;
          var id = cb.getAttribute('data-manualid');
          if (cb.checked) AppState.manualSelectedIds[id] = true;
          else delete AppState.manualSelectedIds[id];
          document.getElementById('manualSelectedCount').textContent = Object.keys(AppState.manualSelectedIds).length;
          renderPdfPreview();
        });

        document.getElementById('btnSelectAllManual').addEventListener('click', function() {
          for (var i = 0; i < AppState.jamaah.length; i++) {
            AppState.manualSelectedIds[AppState.jamaah[i].id] = true;
          }
          renderManualSelectorList();
          renderPdfPreview();
        });
        document.getElementById('btnClearAllManual').addEventListener('click', function() {
          AppState.manualSelectedIds = {};
          renderManualSelectorList();
          renderPdfPreview();
        });

        document.getElementById('pdfColumnsChecklist').addEventListener('change', function(e) {
          var cb = e.target.closest('[data-pdfcol]');
          if (!cb) return;
          var key = cb.getAttribute('data-pdfcol');
          for (var i = 0; i < AppState.pdfColumns.length; i++) {
            if (AppState.pdfColumns[i].key === key) {
              AppState.pdfColumns[i].checked = cb.checked;
              break;
            }
          }
          renderPdfPreview();
        });

        document.getElementById('btnPresetRingkas').addEventListener('click', function() {
          var ringkasKeys = { no: true, kodeKK: true, kelompok: true, nama: true, jk: true, usia: true, kategoriUsia: true, noHp: true };
          for (var i = 0; i < AppState.pdfColumns.length; i++) {
            AppState.pdfColumns[i].checked = Boolean(ringkasKeys[AppState.pdfColumns[i].key]);
          }
          renderPdfColumnsChecklist();
          renderPdfPreview();
        });

        document.getElementById('btnPresetAbsensi').addEventListener('click', function() {
          var absenKeys = { no: true, kelompok: true, nama: true, jk: true, kategoriUsia: true, dapukan: true, paraf: true };
          for (var i = 0; i < AppState.pdfColumns.length; i++) {
            AppState.pdfColumns[i].checked = Boolean(absenKeys[AppState.pdfColumns[i].key]);
          }
          document.getElementById('pdfTitle').value = 'DAFTAR HADIR MUSYAWARAH / PENGAJIAN JAMAAH DESA';
          renderPdfColumnsChecklist();
          renderPdfPreview();
        });

        document.getElementById('btnPresetLengkap').addEventListener('click', function() {
          for (var i = 0; i < AppState.pdfColumns.length; i++) {
            AppState.pdfColumns[i].checked = AppState.pdfColumns[i].key !== 'paraf';
          }
          renderPdfColumnsChecklist();
          renderPdfPreview();
        });

        document.getElementById('pdfCardSubmode').addEventListener('change', function() {
          syncCardSubmodeVisibility();
          renderPdfPreview();
        });

        var pdfInputs = ['pdfTitle', 'pdfSubtitle', 'pdfOrientation', 'pdfPaperSize', 'pdfKelompok', 'pdfKatUsia', 'pdfJK', 'pdfStatusKK', 'pdfMubaligh', 'pdfEkonomi', 'pdfSelectKK', 'pdfSelectPerson', 'pdfSelectKKGroup', 'chkShowKop', 'chkShowSummary', 'chkShowTTD'];
        for (var p = 0; p < pdfInputs.length; p++) {
          var pEl = document.getElementById(pdfInputs[p]);
          if (pEl) {
            pEl.addEventListener('input', renderPdfPreview);
            pEl.addEventListener('change', renderPdfPreview);
          }
        }

        function triggerStudioPdfPrint() {
          var lbl = String((document.getElementById('pdfTitle') && document.getElementById('pdfTitle').value) || 'Dokumen Studio PDF');
          apiCall('logPrint', { label: lbl });
          window.print();
        }
        document.getElementById('btnTriggerPrint').addEventListener('click', triggerStudioPdfPrint);
        document.getElementById('btnTriggerPrintBottom').addEventListener('click', triggerStudioPdfPrint);
      }

      function setPdfMode(mode) {
        AppState.pdfMode = mode;
        var btnT = document.getElementById('tabModeTable');
        var btnC = document.getElementById('tabModeCard');
        var panT = document.getElementById('pdfConfigTablePanel');
        var panC = document.getElementById('pdfConfigCardPanel');
        if (mode === 'table') {
          btnT.classList.add('active');
          btnC.classList.remove('active');
          panT.style.display = 'block';
          panC.style.display = 'none';
        } else {
          btnT.classList.remove('active');
          btnC.classList.add('active');
          panT.style.display = 'none';
          panC.style.display = 'block';
          syncCardSubmodeVisibility();
        }
        renderPdfPreview();
      }

      function syncCardSubmodeVisibility() {
        var sub = document.getElementById('pdfCardSubmode').value;
        document.getElementById('boxSelectSingleKK').style.display = sub === 'kk' ? 'block' : 'none';
        document.getElementById('boxSelectSinglePerson').style.display = sub === 'biodata' ? 'block' : 'none';
        document.getElementById('boxSelectGroupKK').style.display = sub === 'kk_kelompok' ? 'block' : 'none';
      }

      function resetDatabaseFilters() {
        document.getElementById('fSearch').value = '';
        document.getElementById('fKelompok').value = '';
        document.getElementById('fKategoriUsia').value = '';
        document.getElementById('fJK').value = '';
        document.getElementById('fStatusKK').value = '';
        document.getElementById('fStatusAktif').value = 'Aktif';
        document.getElementById('fStatusNikah').value = '';
        document.getElementById('fMubaligh').value = '';
        document.getElementById('fEkonomi').value = '';
        document.getElementById('fGoldar').value = '';
        AppState.currentPage = 1;
      }

      /* ======================================================================
         v2.0 — KEAMANAN, AUTENTIKASI GOOGLE GIS, SESI, RBAC, ABSENSI,
         STRUKTUR PENGURUS & LAPORAN, LOG AUDIT
         ====================================================================== */

      var SESSION_STORAGE_KEY = 'sida_jamaah_sess_v2';

      function saveSessionToStorage() {
        try {
          if (!AppState.token || !AppState.user) return;
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
            token: AppState.token,
            csrf: AppState.csrf,
            user: AppState.user,
            idleTimeoutSec: AppState.idleTimeoutSec || 1200,
            isPreview: Boolean(AppState.isPreview),
            savedAt: Date.now()
          }));
        } catch (e) {}
      }

      function clearSessionFromStorage() {
        try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch (e) {}
      }

      function apiCall(action, payload, onSuccess, onError) {
        if (AppState.isGasEnv && !AppState.isPreview) {
          var reqObj = {
            action: action,
            token: AppState.token || '',
            csrf: AppState.csrf || '',
            payload: payload || {}
          };
          if (action === 'login' && payload && payload.idToken) {
            reqObj.idToken = payload.idToken;
          }
          google.script.run
            .withSuccessHandler(function(res) {
              if (res && res.success) {
                resetIdleTimer();
                if (onSuccess) onSuccess(res);
              } else {
                var code = res && res.code ? res.code : 'ERROR';
                var msg = (res && res.message) ? res.message : 'Permintaan ditolak oleh server.';
                if (code === 'UNAUTHENTICATED' && action !== 'login') {
                  showToast(msg, 'error');
                  doLogout(true);
                  return;
                }
                if (onError) onError(res || { success: false, message: msg });
                else showToast(msg, 'error');
              }
            })
            .withFailureHandler(function(err) {
              var msg = 'Gagal menghubungi server: ' + (err && err.message ? err.message : err);
              if (onError) onError({ success: false, message: msg });
              else showToast(msg, 'error');
            })
            .apiHandle(JSON.stringify(reqObj));
        } else {
          handlePreviewApiCall(action, payload || {}, onSuccess, onError);
        }
      }

      function recordPreviewAudit(aksi, modul, detail) {
        var u = AppState.user || { email: 'preview@lokal', name: 'Admin Preview', role: 'admin' };
        AppState.audit.unshift({
          id: 'LOG-' + Date.now(),
          waktu: new Date().toISOString().replace('T', ' ').substring(0, 19),
          email: u.email,
          nama: u.name,
          peran: u.role,
          aksi: aksi,
          modul: modul,
          detail: detail
        });
      }

      function seedPreviewDataIfNeeded() {
        if (AppState.jamaah.length === 0 && window.SidaDB) {
          var def = window.SidaDB.buildDefaultDatabase();
          AppState.adminPin = def.adminPin || '123456';
          AppState.jamaah = def.jamaah || [];
          AppState.mutasi = def.mutasi || [];
          AppState.kegiatan = def.kegiatan || [];
          AppState.absensi = def.absensi || [];
          AppState.pengurus = def.pengurus || [];
          AppState.laporan = def.laporan || [];
          AppState.settings = def.settings || AppState.settings;
          AppState.users = def.users || [];
          AppState.audit = def.audit || [];
          AppState.nextJamaahId = computeNextId(AppState.jamaah, 'id', 'JMH-202611-');
          AppState.nextMutasiId = computeNextId(AppState.mutasi, 'idMutasi', 'MTS-202611-');
        }
      }

      function handlePreviewApiCall(action, p, onSuccess, onError) {
        seedPreviewDataIfNeeded();
        setTimeout(function() {
          if (action === 'bootstrap') {
            AppState.nextJamaahId = computeNextId(AppState.jamaah, 'id', 'JMH-202611-');
            AppState.nextMutasiId = computeNextId(AppState.mutasi, 'idMutasi', 'MTS-202611-');
            onSuccess({
              success: true,
              user: AppState.user,
              jamaah: AppState.jamaah,
              mutasi: AppState.mutasi,
              settings: AppState.settings,
              kegiatan: AppState.kegiatan,
              absensi: AppState.absensi,
              pengurus: AppState.pengurus,
              laporan: AppState.laporan,
              nextJamaahId: AppState.nextJamaahId,
              nextMutasiId: AppState.nextMutasiId
            });
          } else if (action === 'logout') {
            if (onSuccess) onSuccess({ success: true });
          } else if (action === 'saveJamaah') {
            var isEdit = Boolean(p.id && findJamaahById(p.id));
            var rec = Object.assign({}, p);
            if (!isEdit) {
              rec.id = computeNextId(AppState.jamaah, 'id', 'JMH-202611-');
              rec.noUrut = AppState.jamaah.length + 1;
            } else {
              rec.noUrut = findJamaahById(p.id).noUrut;
            }
            rec.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
            upsertJamaahInCache(rec);
            recordPreviewAudit(isEdit ? 'UBAH' : 'TAMBAH', 'DataJamaah', rec.id + ' (' + rec.nama + ')');
            persistLocalDb();
            onSuccess({ success: true, record: rec, nextJamaahId: AppState.nextJamaahId, message: 'Data jamaah berhasil disimpan ke perangkat.' });
          } else if (action === 'deleteJamaah') {
            AppState.jamaah = AppState.jamaah.filter(function(j) { return j.id !== p.id; });
            recordPreviewAudit('HAPUS', 'DataJamaah', p.id);
            persistLocalDb();
            onSuccess({ success: true, deletedId: p.id, message: 'Data jamaah berhasil dihapus.' });
          } else if (action === 'saveSettings') {
            AppState.settings = Object.assign({}, AppState.settings, p);
            recordPreviewAudit('UBAH', 'PengaturanDesa', AppState.settings.NAMA_DESA || 'Kop & Pejabat');
            persistLocalDb();
            onSuccess({ success: true, settings: AppState.settings, message: 'Pengaturan kop surat & pejabat desa berhasil disimpan.' });
          } else if (action === 'saveKegiatan') {
            var kgId = p.id || computeNextId(AppState.kegiatan, 'id', 'KGT-202611-');
            var kgObj = { id: kgId, tanggal: p.tanggal, nama: p.nama, jenis: p.jenis, sasaran: p.sasaran || 'Semua', status: p.status || 'Buka', dicatatOleh: AppState.user ? AppState.user.name : 'Sekretaris Desa' };
            var kIdx = AppState.kegiatan.findIndex(function(k) { return k.id === kgId; });
            if (kIdx >= 0) AppState.kegiatan[kIdx] = kgObj;
            else AppState.kegiatan.unshift(kgObj);
            recordPreviewAudit(p.id ? 'UBAH' : 'TAMBAH', 'MasterKegiatan', kgId + ' (' + p.nama + ')');
            persistLocalDb();
            onSuccess({ success: true, kegiatan: AppState.kegiatan, savedId: kgId, message: 'Kegiatan berhasil disimpan.' });
          } else if (action === 'deleteKegiatan') {
            AppState.kegiatan = AppState.kegiatan.filter(function(k) { return k.id !== p.id; });
            AppState.absensi = AppState.absensi.filter(function(a) { return a.idKegiatan !== p.id; });
            recordPreviewAudit('HAPUS', 'MasterKegiatan', p.id);
            persistLocalDb();
            onSuccess({ success: true, deletedId: p.id, message: 'Kegiatan dihapus.' });
          } else if (action === 'saveAbsensi') {
            var recs = p.records || [];
            var nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
            for (var i = 0; i < recs.length; i++) {
              var r = recs[i];
              var aIdx = AppState.absensi.findIndex(function(a) { return a.idKegiatan === p.idKegiatan && a.idJamaah === r.idJamaah; });
              var item = {
                id: aIdx >= 0 ? AppState.absensi[aIdx].id : computeNextId(AppState.absensi, 'id', 'ABS-202611-'),
                idKegiatan: p.idKegiatan,
                idJamaah: r.idJamaah,
                status: r.status,
                catatan: r.catatan || '',
                dicatatOleh: AppState.user ? AppState.user.name : 'Sekretaris Desa',
                waktu: nowStr
              };
              if (aIdx >= 0) AppState.absensi[aIdx] = item;
              else AppState.absensi.push(item);
            }
            recordPreviewAudit('ABSENSI', 'DataAbsensi', p.idKegiatan + ' (' + recs.length + ' baris)');
            persistLocalDb();
            onSuccess({ success: true, absensi: AppState.absensi, message: recs.length + ' data kehadiran tersimpan di perangkat.' });
          } else if (action === 'selfCheckin') {
            var myId = (AppState.user && AppState.user.idJamaah) || (AppState.jamaah[0] && AppState.jamaah[0].id) || 'JMH-202611-001';
            var nowS = new Date().toISOString().replace('T', ' ').substring(0, 19);
            var exIdx = AppState.absensi.findIndex(function(a) { return a.idKegiatan === p.idKegiatan && a.idJamaah === myId; });
            var scItem = { id: exIdx >= 0 ? AppState.absensi[exIdx].id : computeNextId(AppState.absensi, 'id', 'ABS-202611-'), idKegiatan: p.idKegiatan, idJamaah: myId, status: 'Hadir', catatan: 'Presensi mandiri', dicatatOleh: AppState.user ? AppState.user.name : 'Anggota', waktu: nowS };
            if (exIdx >= 0) AppState.absensi[exIdx] = scItem;
            else AppState.absensi.push(scItem);
            recordPreviewAudit('ABSENSI', 'DataAbsensi', 'Presensi mandiri ' + p.idKegiatan);
            persistLocalDb();
            onSuccess({ success: true, absensi: AppState.absensi, message: 'Kehadiran Anda berhasil tercatat.' });
          } else if (action === 'savePengurus') {
            var pgId = p.id || computeNextId(AppState.pengurus, 'id', 'PGR-202611-');
            var jm = p.idJamaah ? findJamaahById(p.idJamaah) : null;
            var pgObj = {
              id: pgId,
              jabatan: p.jabatan,
              urutan: parseInt(p.urutan, 10) || 100,
              idJamaah: p.idJamaah || '',
              nama: jm ? jm.nama : p.nama,
              kelompok: jm ? jm.kelompok : (p.kelompok || ''),
              tupoksi: p.tupoksi || '',
              email: p.email || '',
              status: p.status || 'Aktif'
            };
            var pIdx = AppState.pengurus.findIndex(function(x) { return x.id === pgId; });
            if (pIdx >= 0) AppState.pengurus[pIdx] = pgObj;
            else AppState.pengurus.push(pgObj);
            AppState.pengurus.sort(function(a, b) { return (a.urutan || 999) - (b.urutan || 999); });
            recordPreviewAudit(p.id ? 'UBAH' : 'TAMBAH', 'StrukturPengurus', pgId + ' (' + pgObj.jabatan + ')');
            persistLocalDb();
            onSuccess({ success: true, pengurus: AppState.pengurus, message: 'Data pengurus berhasil disimpan.' });
          } else if (action === 'deletePengurus') {
            AppState.pengurus = AppState.pengurus.filter(function(x) { return x.id !== p.id; });
            recordPreviewAudit('HAPUS', 'StrukturPengurus', p.id);
            persistLocalDb();
            onSuccess({ success: true, pengurus: AppState.pengurus, message: 'Data pengurus dihapus.' });
          } else if (action === 'saveLaporan') {
            var lpId = p.id || computeNextId(AppState.laporan, 'id', 'LAP-202611-');
            var pg = AppState.pengurus.find(function(x) { return x.id === p.idPengurus; }) || AppState.pengurus[0] || { id: 'PGR-001', nama: AppState.user ? AppState.user.name : 'Pengurus', jabatan: 'Pengurus Desa' };
            var lpObj = {
              id: lpId,
              tanggal: new Date().toISOString().substring(0, 10),
              idPengurus: pg.id,
              nama: pg.nama,
              jabatan: pg.jabatan,
              periode: p.periode || '',
              judul: p.judul,
              isi: p.isi,
              status: p.status || 'Draft',
              catatanAdmin: '',
              dibuatOleh: AppState.user ? AppState.user.email : 'pengurus@lokal',
              updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            };
            var lIdx = AppState.laporan.findIndex(function(x) { return x.id === lpId; });
            if (lIdx >= 0) {
              lpObj.catatanAdmin = AppState.laporan[lIdx].catatanAdmin || '';
              AppState.laporan[lIdx] = lpObj;
            } else {
              AppState.laporan.unshift(lpObj);
            }
            recordPreviewAudit(p.id ? 'UBAH' : 'TAMBAH', 'LaporanPengurus', lpId + ' (' + p.judul + ')');
            persistLocalDb();
            onSuccess({ success: true, laporan: AppState.laporan, message: p.status === 'Terkirim' ? 'Laporan berhasil dikirim.' : 'Draft laporan disimpan.' });
          } else if (action === 'reviewLaporan') {
            var rvIdx = AppState.laporan.findIndex(function(x) { return x.id === p.id; });
            if (rvIdx >= 0) {
              AppState.laporan[rvIdx].status = p.status;
              AppState.laporan[rvIdx].catatanAdmin = p.catatan || '';
            }
            recordPreviewAudit('TINJAU', 'LaporanPengurus', p.id + ' -> ' + p.status);
            persistLocalDb();
            onSuccess({ success: true, laporan: AppState.laporan, message: 'Tinjauan laporan disimpan.' });
          } else if (action === 'deleteLaporan') {
            AppState.laporan = AppState.laporan.filter(function(x) { return x.id !== p.id; });
            recordPreviewAudit('HAPUS', 'LaporanPengurus', p.id);
            persistLocalDb();
            onSuccess({ success: true, laporan: AppState.laporan, message: 'Laporan dihapus.' });
          } else if (action === 'listUsers') {
            onSuccess({ success: true, users: AppState.users });
          } else if (action === 'saveUser') {
            var uEmail = String(p.email || '').toLowerCase();
            var uIdx = AppState.users.findIndex(function(x) { return x.email.toLowerCase() === uEmail; });
            var uObj = {
              email: uEmail,
              nama: p.nama || '',
              peran: p.peran || 'anggota',
              idJamaah: p.idJamaah || '',
              status: p.status || 'Aktif',
              dibuat: uIdx >= 0 ? AppState.users[uIdx].dibuat : new Date().toISOString().substring(0, 10),
              loginTerakhir: uIdx >= 0 ? AppState.users[uIdx].loginTerakhir : '-'
            };
            if (uIdx >= 0) AppState.users[uIdx] = uObj;
            else AppState.users.push(uObj);
            recordPreviewAudit(uIdx >= 0 ? 'UBAH' : 'TAMBAH', 'HakAkses', uEmail + ' -> ' + uObj.peran);
            persistLocalDb();
            onSuccess({ success: true, users: AppState.users, message: 'Profil pengguna disimpan.' });
          } else if (action === 'listAudit') {
            onSuccess({ success: true, audit: AppState.audit });
          } else if (action === 'logPrint') {
            recordPreviewAudit('CETAK', 'StudioPDF', p.label || 'Cetak dokumen');
            persistLocalDb();
            if (onSuccess) onSuccess({ success: true });
          } else {
            if (onSuccess) onSuccess({ success: true });
          }
        }, 20);
      }

      /* ---------- AUTENTIKASI PROFIL LOKAL & PIN SEKRETARIS (REV 3.0) ---------- */

      function setLoginStatus(msg, isError) {
        var el = document.getElementById('loginStatus');
        if (!el) return;
        el.textContent = msg || '';
        el.className = 'login-status' + (isError ? ' error' : '');
      }

      function populateLoginDropdowns() {
        var badgeEl = document.getElementById('loginDataBadgeText');
        if (badgeEl) {
          badgeEl.textContent = AppState.jamaah.length + ' Data Jamaah Tersimpan di Perangkat (100% Offline)';
        }

        var selPeng = document.getElementById('loginSelectPengurus');
        if (selPeng) {
          var pHtml = '';
          var pList = AppState.pengurus || [];
          for (var i = 0; i < pList.length; i++) {
            var pg = pList[i];
            pHtml += '<option value="' + escHtml(pg.id) + '">' + escHtml(pg.jabatan) + ' — ' + escHtml(pg.nama) + ' (' + escHtml(pg.kelompok || 'Desa') + ')</option>';
          }
          selPeng.innerHTML = pHtml;
        }

        var selAng = document.getElementById('loginSelectAnggota');
        if (selAng) {
          var aHtml = '';
          var jList = AppState.jamaah || [];
          for (var j = 0; j < jList.length; j++) {
            var jm = jList[j];
            aHtml += '<option value="' + escHtml(jm.id) + '">' + escHtml(jm.nama) + ' — ' + escHtml(jm.kelompok) + ' (' + escHtml(jm.kodeKK) + ')</option>';
          }
          selAng.innerHTML = aHtml;
        }
      }

      function selectLoginRoleCard(role) {
        AppState.selectedLoginRole = role;
        var cards = document.querySelectorAll('[data-loginrole]');
        for (var i = 0; i < cards.length; i++) {
          if (cards[i].getAttribute('data-loginrole') === role) cards[i].classList.add('active');
          else cards[i].classList.remove('active');
        }
        var boxAdmin = document.getElementById('loginBoxAdmin');
        var boxPeng = document.getElementById('loginBoxPengurus');
        var boxAng = document.getElementById('loginBoxAnggota');
        if (boxAdmin) boxAdmin.style.display = role === 'admin' ? 'block' : 'none';
        if (boxPeng) boxPeng.style.display = role === 'pengurus' ? 'block' : 'none';
        if (boxAng) boxAng.style.display = role === 'anggota' ? 'block' : 'none';
        setLoginStatus('', false);
      }

      function applyLoadedDbState(dbData) {
        AppState.adminPin = dbData.adminPin || '123456';
        AppState.jamaah = dbData.jamaah || [];
        AppState.mutasi = dbData.mutasi || [];
        AppState.kegiatan = dbData.kegiatan || [];
        AppState.absensi = dbData.absensi || [];
        AppState.pengurus = dbData.pengurus || [];
        AppState.laporan = dbData.laporan || [];
        AppState.settings = Object.assign({}, AppState.settings, dbData.settings || {});
        AppState.users = dbData.users || [];
        AppState.audit = dbData.audit || [];
        AppState.nextJamaahId = computeNextId(AppState.jamaah, 'id', 'JMH-202611-');
        AppState.nextMutasiId = computeNextId(AppState.mutasi, 'idMutasi', 'MTS-202611-');
        AppState.dbLoaded = true;
        populateLoginDropdowns();
      }

      function initAuth() {
        window.SidaDB.loadDatabase(function(dbData) {
          applyLoadedDbState(dbData);

          try {
            var raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (raw) {
              var saved = JSON.parse(raw);
              var maxAge = (saved.idleTimeoutSec || 1200) * 1000;
              if (saved && saved.token && saved.user && (Date.now() - (saved.savedAt || 0) < maxAge)) {
                AppState.token = saved.token;
                AppState.csrf = saved.csrf;
                AppState.user = saved.user;
                AppState.idleTimeoutSec = saved.idleTimeoutSec || 1200;
                AppState.isPreview = false;
                finishLogin(false);
                return;
              }
            }
          } catch (e) {}

          document.body.classList.add('locked');
          selectLoginRoleCard('admin');
        });
      }

      function handleLocalLoginSubmit(e) {
        if (e) e.preventDefault();
        var role = AppState.selectedLoginRole || 'admin';

        if (role === 'admin') {
          var pinInput = document.getElementById('loginAdminPin');
          var enteredPin = String((pinInput && pinInput.value) || '').trim();
          var validPin = String(AppState.adminPin || '123456').trim();
          if (enteredPin !== validPin) {
            setLoginStatus('PIN Sekretaris tidak sesuai. (PIN bawaan: 123456)', true);
            return;
          }
          var secName = (AppState.settings && AppState.settings.NAMA_SEKRETARIS) || 'Sekretaris Desa';
          AppState.user = {
            email: 'sekretaris@desa.lokal',
            name: secName + ' (Admin)',
            picture: '',
            role: 'admin',
            idJamaah: AppState.jamaah[0] ? AppState.jamaah[0].id : 'JMH-202611-001'
          };
        } else if (role === 'pengurus') {
          var selPeng = document.getElementById('loginSelectPengurus');
          var pgId = selPeng ? selPeng.value : '';
          var pgObj = (AppState.pengurus || []).find(function(x) { return x.id === pgId; }) || AppState.pengurus[0];
          AppState.user = {
            email: 'pengurus@desa.lokal',
            name: pgObj ? (pgObj.nama + ' (' + pgObj.jabatan + ')') : 'Pengurus Desa',
            picture: '',
            role: 'pengurus',
            idJamaah: pgObj && pgObj.idJamaah ? pgObj.idJamaah : (AppState.jamaah[0] ? AppState.jamaah[0].id : 'JMH-202611-001')
          };
        } else {
          var selAng = document.getElementById('loginSelectAnggota');
          var jmId = selAng ? selAng.value : '';
          var jmObj = findJamaahById(jmId) || AppState.jamaah[0];
          AppState.user = {
            email: 'jamaah@desa.lokal',
            name: jmObj ? jmObj.nama : 'Jamaah Desa',
            picture: '',
            role: 'anggota',
            idJamaah: jmObj ? jmObj.id : 'JMH-202611-001'
          };
        }

        AppState.isPreview = false;
        AppState.token = 'local-token-' + Date.now();
        AppState.csrf = 'local-csrf-' + Date.now();
        recordPreviewAudit('LOGIN', 'AutentikasiLokal', AppState.user.name + ' masuk sebagai ' + roleLabel(AppState.user.role));
        persistLocalDb();
        saveSessionToStorage();
        setLoginStatus('', false);
        finishLogin(true);
      }

      function finishLogin(isNewLogin) {
        document.body.classList.remove('locked');
        document.body.classList.remove('preview-mode');
        updateProfileUi();
        applyRbac();
        startIdleWatcher();
        loadInitialData(false, function() {
          if (isNewLogin && AppState.user) {
            showToast('Selamat datang, ' + AppState.user.name + '!', 'success');
          }
        });
      }

      function doLogout(isAutoTimeout) {
        if (AppState.idleTimer) clearTimeout(AppState.idleTimer);
        clearSessionFromStorage();
        AppState.token = '';
        AppState.csrf = '';
        AppState.user = null;

        closeModal('modalProfile');
        var pMenu = document.getElementById('profileMenu');
        if (pMenu) pMenu.classList.remove('open');
        document.body.classList.remove('preview-mode');
        document.body.classList.add('locked');
        populateLoginDropdowns();

        if (isAutoTimeout) {
          setLoginStatus('Sesi otomatis berakhir karena tidak ada aktivitas selama 20 menit. Silakan masuk kembali.', true);
        } else {
          setLoginStatus('Anda telah keluar (logout). Data tetap tersimpan aman di perangkat.', false);
        }
      }

      function startIdleWatcher() {
        resetIdleTimer();
        if (AppState._idleBound) return;
        AppState._idleBound = true;
        var lastReset = 0;
        var events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        for (var i = 0; i < events.length; i++) {
          document.addEventListener(events[i], function() {
            var now = Date.now();
            if (now - lastReset > 10000 && AppState.user) {
              lastReset = now;
              resetIdleTimer();
              saveSessionToStorage();
            }
          }, { passive: true });
        }
      }

      function resetIdleTimer() {
        if (AppState.idleTimer) clearTimeout(AppState.idleTimer);
        if (!AppState.user) return;
        var ms = (AppState.idleTimeoutSec || 1200) * 1000;
        AppState.idleTimer = setTimeout(function() {
          showToast('Sesi berakhir karena tidak aktif selama 20 menit.', 'error');
          doLogout(true);
        }, ms);
      }

      function renderAvatarInto(el, user) {
        if (!el) return;
        var name = (user && (user.name || user.email)) || '?';
        var initials = name.trim().split(/\s+/).slice(0, 2).map(function(s) { return s.charAt(0).toUpperCase(); }).join('') || 'U';
        if (user && user.picture) {
          el.innerHTML = '<img src="' + escHtml(user.picture) + '" alt="Foto Profil" referrerpolicy="no-referrer">';
        } else {
          el.textContent = initials;
        }
      }

      function roleLabel(role) {
        var r = String(role || 'anggota').toLowerCase();
        if (r === 'admin') return 'Admin';
        if (r === 'pengurus') return 'Pengurus';
        return 'Anggota';
      }

      function updateProfileUi() {
        var u = AppState.user || { email: '-', name: '-', role: 'anggota', picture: '' };
        var r = String(u.role || 'anggota').toLowerCase();
        renderAvatarInto(document.getElementById('navAvatar'), u);
        renderAvatarInto(document.getElementById('menuAvatar'), u);
        renderAvatarInto(document.getElementById('profAvatar'), u);

        var navName = document.getElementById('navUserName');
        if (navName) navName.textContent = u.name || u.email;
        var navRole = document.getElementById('navUserRole');
        if (navRole) {
          navRole.textContent = roleLabel(r);
          navRole.className = 'role-badge role-' + r;
        }

        var menuName = document.getElementById('menuUserName');
        if (menuName) menuName.textContent = u.name || '-';
        var menuEmail = document.getElementById('menuUserEmail');
        if (menuEmail) menuEmail.textContent = 'Database Lokal Perangkat (IndexedDB)';
        var menuRole = document.getElementById('menuUserRole');
        if (menuRole) {
          menuRole.textContent = roleLabel(r);
          menuRole.className = 'role-badge role-' + r;
        }
        var menuMeta = document.getElementById('menuSessionInfo');
        if (menuMeta) {
          menuMeta.textContent = '100% Offline-First • ' + AppState.jamaah.length + ' Data Jamaah Aktif';
        }
      }

      function openProfileModal() {
        var u = AppState.user;
        if (!u) return;
        updateProfileUi();
        var r = String(u.role || 'anggota').toLowerCase();
        document.getElementById('profName').textContent = u.name || '-';
        document.getElementById('profEmail').textContent = 'Tersimpan di Memori Perangkat Ini (IndexedDB)';
        var pr = document.getElementById('profRole');
        pr.textContent = 'Peran: ' + roleLabel(r);
        pr.className = 'role-badge role-' + r;

        var hakDesc = 'Melihat data keluarga sendiri & presensi mandiri.';
        if (r === 'admin') hakDesc = 'Akses penuh: Database, Mutasi, Studio PDF, Absensi, Struktur Pengurus, Cadangan WhatsApp & Log Audit.';
        else if (r === 'pengurus') hakDesc = 'Melihat Database, Studio PDF, mengelola Absensi, serta membuat Laporan Pengurus.';

        var linkedJ = u.idJamaah ? findJamaahById(u.idJamaah) : null;
        var detailsEl = document.getElementById('profDetails');
        if (detailsEl) {
          detailsEl.innerHTML =
            '<div class="biodata-item"><div class="lbl">Nama Pengguna</div><div class="val">' + escHtml(u.name || '-') + '</div></div>' +
            '<div class="biodata-item"><div class="lbl">Penyimpanan Data</div><div class="val">Memori Perangkat (Offline-First)</div></div>' +
            '<div class="biodata-item"><div class="lbl">Peran Otorisasi</div><div class="val">' + escHtml(roleLabel(r)) + '</div></div>' +
            '<div class="biodata-item"><div class="lbl">Tertaut ID Jamaah</div><div class="val">' + escHtml(u.idJamaah ? (u.idJamaah + (linkedJ ? ' — ' + linkedJ.nama : '')) : 'Belum ditautkan') + '</div></div>' +
            '<div class="biodata-item" style="grid-column:1 / -1;"><div class="lbl">Cakupan Hak Akses</div><div class="val">' + escHtml(hakDesc) + '</div></div>';
        }
        openModal('modalProfile');
      }

      function applyRbac() {
        var role = (AppState.user && AppState.user.role) ? String(AppState.user.role).toLowerCase() : 'anggota';
        var nodes = document.querySelectorAll('[data-roles]');
        for (var i = 0; i < nodes.length; i++) {
          var allowed = String(nodes[i].getAttribute('data-roles') || '')
            .toLowerCase()
            .split(',')
            .map(function(s) { return s.trim(); });
          if (allowed.indexOf(role) !== -1) {
            nodes[i].classList.remove('role-hidden');
          } else {
            nodes[i].classList.add('role-hidden');
          }
        }
      }

      /* ---------- NAVIGASI 3 TOMBOL UTAMA & SUB-TAB DATABASE ---------- */

      function switchModule(targetMod) {
        AppState.activeModule = targetMod;
        var modBtns = document.querySelectorAll('[data-module]');
        for (var i = 0; i < modBtns.length; i++) {
          modBtns[i].classList.toggle('active', modBtns[i].getAttribute('data-module') === targetMod);
        }

        var subBar = document.getElementById('subTabBar');
        var allSecs = ['dashboard', 'database', 'mutasi', 'pdf', 'keamanan', 'absensi', 'pengurus'];
        for (var s = 0; s < allSecs.length; s++) {
          var el = document.getElementById('sec-' + allSecs[s]);
          if (el) el.classList.remove('active');
        }

        if (targetMod === 'database') {
          if (subBar) subBar.classList.remove('hidden');
          switchMenu(AppState.activeMenu || 'dashboard', true);
        } else if (targetMod === 'absensi') {
          if (subBar) subBar.classList.add('hidden');
          var secA = document.getElementById('sec-absensi');
          if (secA) secA.classList.add('active');
          renderAbsensiPage();
        } else if (targetMod === 'pengurus') {
          if (subBar) subBar.classList.add('hidden');
          var secP = document.getElementById('sec-pengurus');
          if (secP) secP.classList.add('active');
          renderPengurusPage();
        }
      }

      function populateDatalistIdJamaah() {
        var dl = document.getElementById('listIdJamaah');
        if (!dl) return;
        var html = '';
        for (var i = 0; i < AppState.jamaah.length; i++) {
          var j = AppState.jamaah[i];
          html += '<option value="' + escHtml(j.id) + '">' + escHtml(j.nama + ' — ' + j.kelompok + ' (' + j.kodeKK + ')') + '</option>';
        }
        dl.innerHTML = html;
      }

      function handleDeleteJamaah(id) {
        var j = findJamaahById(id);
        if (!j) return;
        if (!confirm('Hapus data jamaah "' + j.nama + '" (' + j.id + ') dari Database? Tindakan ini dicatat di Log Aktivitas.')) return;
        apiCall('deleteJamaah', { id: id }, function(res) {
          AppState.jamaah = AppState.jamaah.filter(function(item) { return item.id !== id; });
          refreshAllViews();
          showToast(res.message || 'Data jamaah dihapus.', 'success');
        });
      }

      /* ---------- MODUL 2: ABSENSI JAMAAH ---------- */

      function switchAbsTab(tab) {
        var btns = document.querySelectorAll('[data-abstab]');
        for (var i = 0; i < btns.length; i++) {
          btns[i].classList.toggle('active', btns[i].getAttribute('data-abstab') === tab);
        }
        document.getElementById('absPanePresensi').style.display = tab === 'presensi' ? 'block' : 'none';
        document.getElementById('absPaneRekap').style.display = tab === 'rekap' ? 'block' : 'none';
        if (tab === 'rekap') renderRekapAbsensi();
      }

      function renderAbsensiPage() {
        renderKegiatanList();
        renderAbsensiSheet();
        renderRekapAbsensi();
        applyRbac();
      }

      function renderKegiatanList() {
        var box = document.getElementById('kgList');
        if (!box) return;
        var list = AppState.kegiatan || [];
        if (list.length === 0) {
          box.innerHTML = '<div class="surface-card" style="grid-column:1/-1;text-align:center;color:var(--text-muted);">Belum ada kegiatan absensi. Klik <strong>Kegiatan Baru</strong> untuk membuat daftar hadir.</div>';
          return;
        }
        if (!AppState.activeKegiatanId || !list.some(function(k) { return k.id === AppState.activeKegiatanId; })) {
          AppState.activeKegiatanId = list[0].id;
          buildAbsDraftForActiveKegiatan();
        }
        var html = '';
        for (var i = 0; i < list.length; i++) {
          var k = list[i];
          var isAct = k.id === AppState.activeKegiatanId;
          var countH = 0;
          for (var a = 0; a < AppState.absensi.length; a++) {
            if (AppState.absensi[a].idKegiatan === k.id && AppState.absensi[a].status === 'Hadir') countH++;
          }
          var stBadge = k.status === 'Buka' ? '<span class="badge badge-emerald">Buka</span>' : '<span class="badge badge-slate">Tutup</span>';
          html +=
            '<button type="button" class="kg-card' + (isAct ? ' active' : '') + '" data-selectkg="' + escHtml(k.id) + '">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px;">' +
                '<span class="kg-meta">' + escHtml(k.tanggal) + ' • ' + escHtml(k.jenis) + '</span>' +
                stBadge +
              '</div>' +
              '<div class="kg-title">' + escHtml(k.nama) + '</div>' +
              '<div class="kg-meta">Sasaran: ' + escHtml(k.sasaran || 'Semua') + ' • Hadir: <strong>' + countH + '</strong></div>' +
            '</button>';
        }
        box.innerHTML = html;
      }

      function buildAbsDraftForActiveKegiatan() {
        AppState.absDraft = {};
        var kid = AppState.activeKegiatanId;
        if (!kid) return;
        for (var i = 0; i < AppState.absensi.length; i++) {
          var a = AppState.absensi[i];
          if (a.idKegiatan === kid) {
            AppState.absDraft[a.idJamaah] = { status: a.status, catatan: a.catatan || '' };
          }
        }
      }

      function selectKegiatan(id) {
        AppState.activeKegiatanId = id;
        buildAbsDraftForActiveKegiatan();
        renderKegiatanList();
        renderAbsensiSheet();
      }

      function getTargetJamaahForKegiatan(kg) {
        var q = String((document.getElementById('absSearch') && document.getElementById('absSearch').value) || '').toLowerCase().trim();
        var kel = String((document.getElementById('absKelompokFilter') && document.getElementById('absKelompokFilter').value) || '');
        var sasaran = (kg && kg.sasaran && kg.sasaran !== 'Semua') ? kg.sasaran : '';

        return AppState.jamaah.filter(function(j) {
          if (j.statusAktif !== 'Aktif') return false;
          if (sasaran && j.kelompok !== sasaran) return false;
          if (kel && j.kelompok !== kel) return false;
          if (q) {
            var hay = (j.nama + ' ' + j.kodeKK + ' ' + j.id).toLowerCase();
            if (hay.indexOf(q) === -1) return false;
          }
          return true;
        });
      }

      function renderAbsensiSheet() {
        var card = document.getElementById('absSheetCard');
        if (!card) return;
        var kg = (AppState.kegiatan || []).find(function(k) { return k.id === AppState.activeKegiatanId; });
        if (!kg) {
          card.style.display = 'none';
          return;
        }
        card.style.display = 'block';
        document.getElementById('absSheetTitle').textContent = kg.nama + ' (' + kg.tanggal + ' • Sasaran: ' + (kg.sasaran || 'Semua') + ')';

        var role = (AppState.user && AppState.user.role) || 'anggota';
        var canEdit = (role === 'admin' || role === 'pengurus');
        var btnAllHadir = document.getElementById('btnAbsAllHadir');
        if (btnAllHadir) btnAllHadir.style.display = canEdit ? '' : 'none';

        // Kotak presensi mandiri (Self Check-in)
        var selfBox = document.getElementById('absSelfBox');
        if (selfBox) {
          var myId = AppState.user && AppState.user.idJamaah;
          if (myId && kg.status === 'Buka') {
            var myEntry = AppState.absDraft[myId];
            var alreadyHadir = myEntry && myEntry.status === 'Hadir';
            selfBox.style.display = 'block';
            selfBox.innerHTML =
              '<div class="surface-card" style="background:var(--primary-soft);border-color:#99f6e4;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
                '<div><strong>Presensi Mandiri:</strong> Status kehadiran Anda (' + escHtml(myId) + '): ' +
                  '<span class="badge ' + (alreadyHadir ? 'badge-emerald' : 'badge-amber') + '">' + escHtml(myEntry ? myEntry.status : 'Belum Presensi') + '</span>' +
                '</div>' +
                (alreadyHadir ? '' : '<button type="button" class="btn btn-primary btn-sm" id="btnDoSelfCheckin">Saya Hadir Sekarang</button>') +
              '</div>';
            var btnSc = document.getElementById('btnDoSelfCheckin');
            if (btnSc) {
              btnSc.onclick = function() {
                btnSc.disabled = true;
                apiCall('selfCheckin', { idKegiatan: kg.id }, function(res) {
                  btnSc.disabled = false;
                  if (res.absensi) AppState.absensi = res.absensi;
                  buildAbsDraftForActiveKegiatan();
                  renderKegiatanList();
                  renderAbsensiSheet();
                  showToast(res.message || 'Kehadiran Anda tercatat.', 'success');
                }, function() { btnSc.disabled = false; });
              };
            }
          } else {
            selfBox.style.display = 'none';
          }
        }

        var rows = getTargetJamaahForKegiatan(kg);
        var cH = 0, cI = 0, cS = 0, cA = 0, cB = 0;
        for (var i = 0; i < rows.length; i++) {
          var st = AppState.absDraft[rows[i].id] ? AppState.absDraft[rows[i].id].status : '';
          if (st === 'Hadir') cH++;
          else if (st === 'Izin') cI++;
          else if (st === 'Sakit') cS++;
          else if (st === 'Alpa') cA++;
          else cB++;
        }
        var sumEl = document.getElementById('absSummary');
        if (sumEl) {
          sumEl.innerHTML =
            '<span class="pill-stat">Peserta: ' + rows.length + '</span>' +
            '<span class="pill-stat" style="color:#166534;">Hadir: ' + cH + '</span>' +
            '<span class="pill-stat" style="color:#1e40af;">Izin: ' + cI + '</span>' +
            '<span class="pill-stat" style="color:#92400e;">Sakit: ' + cS + '</span>' +
            '<span class="pill-stat" style="color:#991b1b;">Alpa: ' + cA + '</span>' +
            '<span class="pill-stat">Belum: ' + cB + '</span>';
        }

        var tbody = document.getElementById('tbodyAbsensi');
        if (!tbody) return;
        if (rows.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted);">Tidak ada jamaah yang sesuai filter.</td></tr>';
          return;
        }
        var html = '';
        var opts = [
          { val: 'Hadir', cls: 'att-H', lbl: 'Hadir' },
          { val: 'Izin', cls: 'att-I', lbl: 'Izin' },
          { val: 'Sakit', cls: 'att-S', lbl: 'Sakit' },
          { val: 'Alpa', cls: 'att-A', lbl: 'Alpa' }
        ];
        for (var r = 0; r < rows.length; r++) {
          var j = rows[r];
          var d = AppState.absDraft[j.id] || { status: '', catatan: '' };
          var radios = '';
          for (var o = 0; o < opts.length; o++) {
            var op = opts[o];
            var checked = d.status === op.val ? ' checked' : '';
            var dis = canEdit ? '' : ' disabled';
            radios +=
              '<label class="att-opt ' + op.cls + '">' +
                '<input type="radio" name="att_' + escHtml(j.id) + '" data-absid="' + escHtml(j.id) + '" value="' + op.val + '"' + checked + dis + '>' +
                '<span>' + op.lbl + '</span>' +
              '</label>';
          }
          html +=
            '<tr>' +
              '<td>' + (r + 1) + '</td>' +
              '<td><div class="cell-title">' + escHtml(j.nama) + '</div><div class="cell-sub">' + escHtml(j.kategoriUsia) + (j.dapukan ? ' • ' + escHtml(j.dapukan) : '') + '</div></td>' +
              '<td><div class="cell-title">' + escHtml(j.kelompok) + '</div><div class="cell-sub">' + escHtml(j.kodeKK) + '</div></td>' +
              '<td><div class="att-opts">' + radios + '</div></td>' +
              '<td><input type="text" class="form-control" style="min-width:140px;padding:5px 8px;font-size:0.78rem;" maxlength="100" data-abscat="' + escHtml(j.id) + '" value="' + escHtml(d.catatan || '') + '" placeholder="Keterangan..."' + (canEdit ? '' : ' disabled') + '></td>' +
            '</tr>';
        }
        tbody.innerHTML = html;
      }

      function handleMarkAllHadir() {
        var kg = (AppState.kegiatan || []).find(function(k) { return k.id === AppState.activeKegiatanId; });
        if (!kg) return;
        var rows = getTargetJamaahForKegiatan(kg);
        for (var i = 0; i < rows.length; i++) {
          var cur = AppState.absDraft[rows[i].id] || { status: '', catatan: '' };
          cur.status = 'Hadir';
          AppState.absDraft[rows[i].id] = cur;
        }
        renderAbsensiSheet();
        showToast(rows.length + ' jamaah ditandai Hadir. Klik Simpan Kehadiran untuk menyimpan ke Spreadsheet.', 'info');
      }

      function handleSaveAbsensi() {
        var kid = AppState.activeKegiatanId;
        if (!kid) return;
        var records = [];
        var ids = Object.keys(AppState.absDraft);
        for (var i = 0; i < ids.length; i++) {
          var idj = ids[i];
          var d = AppState.absDraft[idj];
          if (d && d.status) {
            records.push({ idJamaah: idj, status: d.status, catatan: d.catatan || '' });
          }
        }
        if (records.length === 0) {
          showToast('Pilih status kehadiran minimal satu jamaah sebelum menyimpan.', 'error');
          return;
        }
        var btn = document.getElementById('btnSaveAbsensi');
        if (btn) btn.disabled = true;
        apiCall('saveAbsensi', { idKegiatan: kid, records: records }, function(res) {
          if (btn) btn.disabled = false;
          if (res.absensi) AppState.absensi = res.absensi;
          buildAbsDraftForActiveKegiatan();
          renderKegiatanList();
          renderAbsensiSheet();
          renderRekapAbsensi();
          showToast(res.message || 'Data kehadiran berhasil disimpan.', 'success');
        }, function() {
          if (btn) btn.disabled = false;
        });
      }

      function openKegiatanModal(editId) {
        var f = document.getElementById('formKegiatan');
        if (f) f.reset();
        if (editId) {
          var kg = (AppState.kegiatan || []).find(function(k) { return k.id === editId; });
          if (!kg) return;
          document.getElementById('modalKegiatanTitle').textContent = 'Ubah Kegiatan — ' + kg.nama;
          document.getElementById('kgId').value = kg.id;
          document.getElementById('kgNama').value = kg.nama;
          document.getElementById('kgTanggal').value = kg.tanggal;
          document.getElementById('kgJenis').value = kg.jenis || 'Pengajian Rutin';
          document.getElementById('kgSasaran').value = kg.sasaran || 'Semua';
          document.getElementById('kgStatus').value = kg.status || 'Buka';
        } else {
          document.getElementById('modalKegiatanTitle').textContent = 'Buat Kegiatan Absensi Baru';
          document.getElementById('kgId').value = '';
          document.getElementById('kgTanggal').value = new Date().toISOString().substring(0, 10);
          document.getElementById('kgJenis').value = 'Pengajian Rutin';
          document.getElementById('kgSasaran').value = 'Semua';
          document.getElementById('kgStatus').value = 'Buka';
        }
        openModal('modalKegiatan');
      }

      function handleSaveKegiatanSubmit(e) {
        e.preventDefault();
        var payload = {
          id: String(document.getElementById('kgId').value || '').trim(),
          nama: String(document.getElementById('kgNama').value || '').trim(),
          tanggal: String(document.getElementById('kgTanggal').value || '').trim(),
          jenis: String(document.getElementById('kgJenis').value || 'Pengajian Rutin').trim(),
          sasaran: String(document.getElementById('kgSasaran').value || 'Semua').trim(),
          status: String(document.getElementById('kgStatus').value || 'Buka').trim()
        };
        if (!payload.nama || !payload.tanggal) {
          showToast('Nama dan tanggal kegiatan wajib diisi.', 'error');
          return;
        }
        var btn = document.getElementById('btnSubmitKegiatan');
        if (btn) btn.disabled = true;
        apiCall('saveKegiatan', payload, function(res) {
          if (btn) btn.disabled = false;
          if (res.kegiatan) AppState.kegiatan = res.kegiatan;
          if (res.savedId) AppState.activeKegiatanId = res.savedId;
          buildAbsDraftForActiveKegiatan();
          closeModal('modalKegiatan');
          renderAbsensiPage();
          showToast(res.message || 'Kegiatan disimpan.', 'success');
        }, function() {
          if (btn) btn.disabled = false;
        });
      }

      function handleDeleteActiveKegiatan() {
        var kg = (AppState.kegiatan || []).find(function(k) { return k.id === AppState.activeKegiatanId; });
        if (!kg) return;
        if (!confirm('Hapus kegiatan "' + kg.nama + '" beserta seluruh catatan kehadirannya?')) return;
        apiCall('deleteKegiatan', { id: kg.id }, function(res) {
          AppState.kegiatan = AppState.kegiatan.filter(function(k) { return k.id !== kg.id; });
          AppState.absensi = AppState.absensi.filter(function(a) { return a.idKegiatan !== kg.id; });
          AppState.activeKegiatanId = AppState.kegiatan[0] ? AppState.kegiatan[0].id : '';
          buildAbsDraftForActiveKegiatan();
          renderAbsensiPage();
          showToast(res.message || 'Kegiatan dihapus.', 'success');
        });
      }

      function computeRekapRows() {
        var q = String((document.getElementById('rekapSearch') && document.getElementById('rekapSearch').value) || '').toLowerCase().trim();
        var kel = String((document.getElementById('rekapKelompok') && document.getElementById('rekapKelompok').value) || '');
        var kgs = AppState.kegiatan || [];

        var idx = {};
        for (var a = 0; a < AppState.absensi.length; a++) {
          var ab = AppState.absensi[a];
          idx[ab.idKegiatan + '|' + ab.idJamaah] = ab.status;
        }

        var out = [];
        for (var i = 0; i < AppState.jamaah.length; i++) {
          var j = AppState.jamaah[i];
          if (j.statusAktif !== 'Aktif') continue;
          if (kel && j.kelompok !== kel) continue;
          if (q && (j.nama + ' ' + j.kodeKK).toLowerCase().indexOf(q) === -1) continue;

          var h = 0, iz = 0, s = 0, al = 0, bl = 0, wajib = 0;
          for (var k = 0; k < kgs.length; k++) {
            var kg = kgs[k];
            if (kg.sasaran && kg.sasaran !== 'Semua' && kg.sasaran !== j.kelompok) continue;
            wajib++;
            var st = idx[kg.id + '|' + j.id] || '';
            if (st === 'Hadir') h++;
            else if (st === 'Izin') iz++;
            else if (st === 'Sakit') s++;
            else if (st === 'Alpa') al++;
            else bl++;
          }
          var pct = wajib > 0 ? Math.round((h / wajib) * 100) : 0;
          out.push({ jamaah: j, hadir: h, izin: iz, sakit: s, alpa: al, belum: bl, wajib: wajib, pct: pct });
        }
        return out;
      }

      function renderRekapAbsensi() {
        var tbody = document.getElementById('tbodyRekapAbsensi');
        if (!tbody) return;
        var rows = computeRekapRows();
        var sumEl = document.getElementById('rekapSummary');
        var totalPct = 0;
        for (var i = 0; i < rows.length; i++) totalPct += rows[i].pct;
        var avgPct = rows.length > 0 ? Math.round(totalPct / rows.length) : 0;
        if (sumEl) {
          sumEl.innerHTML =
            '<span class="pill-stat">Total Kegiatan: ' + (AppState.kegiatan ? AppState.kegiatan.length : 0) + '</span>' +
            '<span class="pill-stat">Jamaah Direkap: ' + rows.length + '</span>' +
            '<span class="pill-stat" style="color:var(--primary);">Rata-rata Kehadiran: ' + avgPct + '%</span>';
        }
        if (rows.length === 0) {
          tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted);">Belum ada data untuk direkap.</td></tr>';
          return;
        }
        var html = '';
        for (var r = 0; r < rows.length; r++) {
          var it = rows[r];
          var badgeCls = it.pct >= 75 ? 'badge-emerald' : (it.pct >= 50 ? 'badge-amber' : 'badge-rose');
          html +=
            '<tr>' +
              '<td>' + (r + 1) + '</td>' +
              '<td><div class="cell-title">' + escHtml(it.jamaah.nama) + '</div><div class="cell-sub">' + escHtml(it.jamaah.kodeKK) + '</div></td>' +
              '<td>' + escHtml(it.jamaah.kelompok) + '</td>' +
              '<td><strong>' + it.hadir + '</strong></td>' +
              '<td>' + it.izin + '</td>' +
              '<td>' + it.sakit + '</td>' +
              '<td>' + it.alpa + '</td>' +
              '<td>' + it.belum + '</td>' +
              '<td><span class="badge ' + badgeCls + '">' + it.pct + '%</span></td>' +
            '</tr>';
        }
        tbody.innerHTML = html;
      }

      function printGenericHtml(innerHtml, labelForAudit) {
        var box = document.getElementById('genericPrint');
        if (!box) return;
        box.innerHTML = '<div class="print-paper">' + innerHtml + '</div>';
        document.body.classList.add('print-generic');
        apiCall('logPrint', { label: labelForAudit || 'Cetak Dokumen' });
        window.print();
        setTimeout(function() {
          document.body.classList.remove('print-generic');
        }, 600);
      }

      function printRekapAbsensi() {
        var rows = computeRekapRows();
        var trs = '';
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          trs +=
            '<tr>' +
              '<td style="text-align:center;">' + (i + 1) + '</td>' +
              '<td>' + escHtml(r.jamaah.nama) + '</td>' +
              '<td>' + escHtml(r.jamaah.kelompok) + '</td>' +
              '<td style="text-align:center;">' + r.hadir + '</td>' +
              '<td style="text-align:center;">' + r.izin + '</td>' +
              '<td style="text-align:center;">' + r.sakit + '</td>' +
              '<td style="text-align:center;">' + r.alpa + '</td>' +
              '<td style="text-align:center;">' + r.pct + '%</td>' +
            '</tr>';
        }
        var html =
          buildKopSuratHtml() +
          '<div class="doc-title-banner"><h4>REKAPITULASI KEHADIRAN JAMAAH DESA</h4><p>Total Kegiatan: ' + (AppState.kegiatan ? AppState.kegiatan.length : 0) + ' Kegiatan</p></div>' +
          '<table class="print-table"><thead><tr><th>No</th><th>Nama Lengkap</th><th>Kelompok</th><th>Hadir</th><th>Izin</th><th>Sakit</th><th>Alpa</th><th>% Hadir</th></tr></thead><tbody>' + trs + '</tbody></table>' +
          buildTtdHtml();
        printGenericHtml(html, 'Rekap Kehadiran Jamaah');
      }

      /* ---------- MODUL 3: STRUKTUR PENGURUS, TUPOKSI & LAPORAN ---------- */

      function switchPengTab(tab) {
        var btns = document.querySelectorAll('[data-pengtab]');
        for (var i = 0; i < btns.length; i++) {
          btns[i].classList.toggle('active', btns[i].getAttribute('data-pengtab') === tab);
        }
        document.getElementById('pengPaneStruktur').style.display = tab === 'struktur' ? 'block' : 'none';
        document.getElementById('pengPaneLaporan').style.display = tab === 'laporan' ? 'block' : 'none';
        if (tab === 'laporan') renderLaporanTable();
      }

      function renderPengurusPage() {
        renderPengurusTable();
        renderLaporanTable();
        applyRbac();
      }

      function getFilteredPengurus() {
        var q = String((document.getElementById('pengSearch') && document.getElementById('pengSearch').value) || '').toLowerCase().trim();
        var kel = String((document.getElementById('pengKelompok') && document.getElementById('pengKelompok').value) || '');
        return (AppState.pengurus || []).filter(function(p) {
          if (kel && p.kelompok !== kel) return false;
          if (q && (p.jabatan + ' ' + p.nama + ' ' + p.tupoksi).toLowerCase().indexOf(q) === -1) return false;
          return true;
        });
      }

      function renderPengurusTable() {
        var tbody = document.getElementById('tbodyPengurus');
        if (!tbody) return;
        var list = getFilteredPengurus();
        var isAdmin = AppState.user && AppState.user.role === 'admin';
        if (list.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">Belum ada susunan pengurus yang sesuai filter.</td></tr>';
          return;
        }
        var html = '';
        for (var i = 0; i < list.length; i++) {
          var p = list[i];
          var stBadge = p.status === 'Aktif' ? '<span class="badge badge-emerald">Aktif</span>' : '<span class="badge badge-slate">Nonaktif</span>';
          var aksi = isAdmin
            ? '<div style="display:inline-flex;gap:4px;"><button type="button" class="btn btn-outline btn-sm" data-pengaction="edit" data-id="' + escHtml(p.id) + '">Ubah</button><button type="button" class="btn btn-danger-soft btn-sm" data-pengaction="delete" data-id="' + escHtml(p.id) + '">Hapus</button></div>'
            : '<span class="cell-sub">-</span>';
          html +=
            '<tr>' +
              '<td><strong>' + (i + 1) + '</strong></td>' +
              '<td><div class="cell-title">' + escHtml(p.jabatan) + '</div><div class="cell-sub">Urutan #' + escHtml(p.urutan || (i + 1)) + '</div></td>' +
              '<td><div class="cell-title">' + escHtml(p.nama) + '</div><div class="cell-sub">' + escHtml(p.kelompok || '-') + (p.idJamaah ? ' • ' + escHtml(p.idJamaah) : '') + (p.email ? ' • ' + escHtml(p.email) : '') + '</div></td>' +
              '<td><div class="tupoksi-text">' + escHtml(p.tupoksi || '-') + '</div></td>' +
              '<td>' + stBadge + '</td>' +
              '<td style="text-align:right;white-space:nowrap;">' + aksi + '</td>' +
            '</tr>';
        }
        tbody.innerHTML = html;
      }

      function openPengurusModal(editId) {
        var f = document.getElementById('formPengurus');
        if (f) f.reset();
        populateDatalistIdJamaah();
        if (editId) {
          var p = (AppState.pengurus || []).find(function(x) { return x.id === editId; });
          if (!p) return;
          document.getElementById('modalPengurusTitle').textContent = 'Ubah Pengurus — ' + p.jabatan;
          document.getElementById('pgId').value = p.id;
          document.getElementById('pgJabatan').value = p.jabatan;
          document.getElementById('pgUrutan').value = p.urutan || 100;
          document.getElementById('pgIdJamaah').value = p.idJamaah || '';
          document.getElementById('pgNama').value = p.nama || '';
          document.getElementById('pgEmail').value = p.email || '';
          document.getElementById('pgTupoksi').value = p.tupoksi || '';
          document.getElementById('pgStatus').value = p.status || 'Aktif';
        } else {
          document.getElementById('modalPengurusTitle').textContent = 'Tambah Pengurus Desa';
          document.getElementById('pgId').value = '';
          document.getElementById('pgUrutan').value = (AppState.pengurus ? AppState.pengurus.length + 1 : 1);
          document.getElementById('pgStatus').value = 'Aktif';
        }
        openModal('modalPengurus');
      }

      function handleSavePengurusSubmit(e) {
        e.preventDefault();
        var idJ = String(document.getElementById('pgIdJamaah').value || '').trim();
        var jm = idJ ? findJamaahById(idJ) : null;
        var payload = {
          id: String(document.getElementById('pgId').value || '').trim(),
          jabatan: String(document.getElementById('pgJabatan').value || '').trim(),
          urutan: parseInt(document.getElementById('pgUrutan').value, 10) || 100,
          idJamaah: idJ,
          nama: jm ? jm.nama : String(document.getElementById('pgNama').value || '').trim(),
          kelompok: jm ? jm.kelompok : '',
          email: String(document.getElementById('pgEmail').value || '').trim().toLowerCase(),
          tupoksi: String(document.getElementById('pgTupoksi').value || '').trim(),
          status: String(document.getElementById('pgStatus').value || 'Aktif').trim()
        };
        if (!payload.jabatan || !payload.nama) {
          showToast('Jabatan dan Nama pengurus wajib diisi.', 'error');
          return;
        }
        var btn = document.getElementById('btnSubmitPengurus');
        if (btn) btn.disabled = true;
        apiCall('savePengurus', payload, function(res) {
          if (btn) btn.disabled = false;
          if (res.pengurus) AppState.pengurus = res.pengurus;
          closeModal('modalPengurus');
          renderPengurusTable();
          showToast(res.message || 'Data pengurus berhasil disimpan.', 'success');
        }, function() {
          if (btn) btn.disabled = false;
        });
      }

      function handleDeletePengurus(id) {
        var p = (AppState.pengurus || []).find(function(x) { return x.id === id; });
        if (!p) return;
        if (!confirm('Hapus jabatan pengurus "' + p.jabatan + ' — ' + p.nama + '"?')) return;
        apiCall('deletePengurus', { id: id }, function(res) {
          if (res.pengurus) AppState.pengurus = res.pengurus;
          renderPengurusTable();
          showToast(res.message || 'Data pengurus dihapus.', 'success');
        });
      }

      function renderLaporanTable() {
        var tbody = document.getElementById('tbodyLaporan');
        if (!tbody) return;
        var list = AppState.laporan || [];
        if (list.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">Belum ada laporan pengurus. Klik <strong>Buat Laporan</strong> untuk menyampaikan laporan pelaksanaan tugas.</td></tr>';
          return;
        }
        var isAdmin = AppState.user && AppState.user.role === 'admin';
        var myEmail = AppState.user ? String(AppState.user.email).toLowerCase() : '';
        var html = '';
        for (var i = 0; i < list.length; i++) {
          var l = list[i];
          var stCls = 'badge-slate';
          if (l.status === 'Ditinjau') stCls = 'badge-emerald';
          else if (l.status === 'Terkirim') stCls = 'badge-blue';
          else if (l.status === 'Perlu Revisi') stCls = 'badge-rose';
          else if (l.status === 'Draft') stCls = 'badge-amber';

          var canModify = isAdmin || (String(l.dibuatOleh || '').toLowerCase() === myEmail && (l.status === 'Draft' || l.status === 'Perlu Revisi'));
          var canDelete = isAdmin || (String(l.dibuatOleh || '').toLowerCase() === myEmail && l.status === 'Draft');

          html +=
            '<tr>' +
              '<td>' + escHtml(l.tanggal || '-') + '</td>' +
              '<td><div class="cell-title">' + escHtml(l.nama || '-') + '</div><div class="cell-sub">' + escHtml(l.jabatan || '-') + '</div></td>' +
              '<td>' + escHtml(l.periode || '-') + '</td>' +
              '<td><div class="cell-title">' + escHtml(l.judul) + '</div>' + (l.catatanAdmin ? '<div class="cell-sub">Catatan Admin: ' + escHtml(l.catatanAdmin) + '</div>' : '') + '</td>' +
              '<td><span class="badge ' + stCls + '">' + escHtml(l.status) + '</span></td>' +
              '<td style="text-align:right;white-space:nowrap;">' +
                '<div style="display:inline-flex;gap:4px;">' +
                  '<button type="button" class="btn btn-soft btn-sm" data-lapaction="view" data-id="' + escHtml(l.id) + '">Lihat</button>' +
                  (canModify ? '<button type="button" class="btn btn-outline btn-sm" data-lapaction="edit" data-id="' + escHtml(l.id) + '">Ubah</button>' : '') +
                  (canDelete ? '<button type="button" class="btn btn-danger-soft btn-sm" data-lapaction="delete" data-id="' + escHtml(l.id) + '">Hapus</button>' : '') +
                '</div>' +
              '</td>' +
            '</tr>';
        }
        tbody.innerHTML = html;
      }

      function openLaporanModal(editId) {
        var f = document.getElementById('formLaporan');
        if (f) f.reset();
        var isAdmin = AppState.user && AppState.user.role === 'admin';
        var pBox = document.getElementById('lpPengurusBox');
        var pSel = document.getElementById('lpPengurus');
        if (pBox && pSel) {
          pBox.style.display = isAdmin ? 'block' : 'none';
          var opts = '';
          for (var i = 0; i < AppState.pengurus.length; i++) {
            var pg = AppState.pengurus[i];
            opts += '<option value="' + escHtml(pg.id) + '">' + escHtml(pg.jabatan + ' — ' + pg.nama) + '</option>';
          }
          pSel.innerHTML = opts;
        }
        if (editId) {
          var l = (AppState.laporan || []).find(function(x) { return x.id === editId; });
          if (!l) return;
          document.getElementById('modalLaporanTitle').textContent = 'Ubah Laporan — ' + l.judul;
          document.getElementById('lpId').value = l.id;
          if (pSel && l.idPengurus) pSel.value = l.idPengurus;
          document.getElementById('lpPeriode').value = l.periode || '';
          document.getElementById('lpJudul').value = l.judul || '';
          document.getElementById('lpIsi').value = l.isi || '';
        } else {
          document.getElementById('modalLaporanTitle').textContent = 'Buat Laporan Pengurus';
          document.getElementById('lpId').value = '';
          document.getElementById('lpPeriode').value = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        }
        openModal('modalLaporan');
      }

      function submitLaporanWithStatus(statusVal) {
        var payload = {
          id: String(document.getElementById('lpId').value || '').trim(),
          idPengurus: String((document.getElementById('lpPengurus') && document.getElementById('lpPengurus').value) || '').trim(),
          periode: String(document.getElementById('lpPeriode').value || '').trim(),
          judul: String(document.getElementById('lpJudul').value || '').trim(),
          isi: String(document.getElementById('lpIsi').value || '').trim(),
          status: statusVal
        };
        if (!payload.judul || !payload.isi) {
          showToast('Judul dan isi laporan wajib diisi.', 'error');
          return;
        }
        var btn = document.getElementById('btnSubmitLaporan');
        if (btn) btn.disabled = true;
        apiCall('saveLaporan', payload, function(res) {
          if (btn) btn.disabled = false;
          if (res.laporan) AppState.laporan = res.laporan;
          closeModal('modalLaporan');
          renderLaporanTable();
          showToast(res.message || 'Laporan disimpan.', 'success');
        }, function() {
          if (btn) btn.disabled = false;
        });
      }

      function openViewLaporanModal(id) {
        var l = (AppState.laporan || []).find(function(x) { return x.id === id; });
        if (!l) return;
        AppState.activeViewLaporanId = l.id;
        document.getElementById('lvTitle').textContent = l.judul;
        document.getElementById('lvMeta').innerHTML =
          '<div class="biodata-item"><div class="lbl">Nama Pengurus</div><div class="val">' + escHtml(l.nama) + '</div></div>' +
          '<div class="biodata-item"><div class="lbl">Jabatan</div><div class="val">' + escHtml(l.jabatan) + '</div></div>' +
          '<div class="biodata-item"><div class="lbl">Periode</div><div class="val">' + escHtml(l.periode || '-') + '</div></div>' +
          '<div class="biodata-item"><div class="lbl">Tanggal &amp; Status</div><div class="val">' + escHtml(l.tanggal) + ' • ' + escHtml(l.status) + '</div></div>';
        document.getElementById('lvIsi').textContent = l.isi || '';
        document.getElementById('lvCatatan').value = l.catatanAdmin || '';

        var isAdmin = AppState.user && AppState.user.role === 'admin';
        document.getElementById('lvReviewBox').style.display = (isAdmin || l.catatanAdmin) ? 'block' : 'none';
        document.getElementById('lvCatatan').readOnly = !isAdmin;
        document.getElementById('btnLvRevisi').style.display = isAdmin ? '' : 'none';
        document.getElementById('btnLvTinjau').style.display = isAdmin ? '' : 'none';
        openModal('modalLaporanView');
      }

      function handleReviewLaporan(statusVal) {
        var id = AppState.activeViewLaporanId;
        if (!id) return;
        var catatan = String(document.getElementById('lvCatatan').value || '').trim();
        apiCall('reviewLaporan', { id: id, status: statusVal, catatan: catatan }, function(res) {
          if (res.laporan) AppState.laporan = res.laporan;
          closeModal('modalLaporanView');
          renderLaporanTable();
          showToast(res.message || 'Status tinjauan disimpan.', 'success');
        });
      }

      function handleDeleteLaporan(id) {
        var l = (AppState.laporan || []).find(function(x) { return x.id === id; });
        if (!l) return;
        if (!confirm('Hapus laporan "' + l.judul + '"?')) return;
        apiCall('deleteLaporan', { id: id }, function(res) {
          if (res.laporan) AppState.laporan = res.laporan;
          renderLaporanTable();
          showToast(res.message || 'Laporan dihapus.', 'success');
        });
      }

      function printStrukturPengurus() {
        var list = getFilteredPengurus();
        var trs = '';
        for (var i = 0; i < list.length; i++) {
          var p = list[i];
          trs +=
            '<tr>' +
              '<td style="text-align:center;">' + (i + 1) + '</td>' +
              '<td><strong>' + escHtml(p.jabatan) + '</strong></td>' +
              '<td>' + escHtml(p.nama) + '<br><span style="font-size:7.5pt;color:#475569;">' + escHtml(p.kelompok || '-') + '</span></td>' +
              '<td style="white-space:pre-wrap;">' + escHtml(p.tupoksi || '-') + '</td>' +
              '<td style="text-align:center;">' + escHtml(p.status) + '</td>' +
            '</tr>';
        }
        var html =
          buildKopSuratHtml() +
          '<div class="doc-title-banner"><h4>SUSUNAN STRUKTUR PENGURUS &amp; TUPOKSI JAMAAH DESA</h4><p>' + escHtml(AppState.settings.NAMA_DESA || '') + '</p></div>' +
          '<table class="print-table"><thead><tr><th style="width:36px;">No</th><th style="width:160px;">Jabatan / Dapukan</th><th style="width:160px;">Nama Pengurus</th><th>Tugas Pokok &amp; Fungsi (Tupoksi)</th><th style="width:70px;">Status</th></tr></thead><tbody>' + trs + '</tbody></table>' +
          buildTtdHtml();
        printGenericHtml(html, 'Struktur Pengurus & Tupoksi');
      }

      function printActiveLaporan() {
        var l = (AppState.laporan || []).find(function(x) { return x.id === AppState.activeViewLaporanId; });
        if (!l) return;
        var html =
          buildKopSuratHtml() +
          '<div class="doc-title-banner"><h4>LAPORAN PELAKSANAAN TUGAS PENGURUS DESA</h4><p>Periode: ' + escHtml(l.periode || '-') + '</p></div>' +
          '<div class="biodata-sheet">' +
            '<div class="biodata-grid">' +
              '<div class="biodata-item"><div class="lbl">Nama Pengurus</div><div class="val">' + escHtml(l.nama) + '</div></div>' +
              '<div class="biodata-item"><div class="lbl">Jabatan / Dapukan</div><div class="val">' + escHtml(l.jabatan) + '</div></div>' +
              '<div class="biodata-item"><div class="lbl">Tanggal Laporan</div><div class="val">' + escHtml(l.tanggal) + '</div></div>' +
              '<div class="biodata-item"><div class="lbl">Status Verifikasi</div><div class="val">' + escHtml(l.status) + '</div></div>' +
              '<div class="biodata-item" style="grid-column:1/-1;"><div class="lbl">Judul Laporan</div><div class="val">' + escHtml(l.judul) + '</div></div>' +
            '</div>' +
            '<div style="margin-top:14px;"><div style="font-size:8pt;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Uraian Laporan:</div>' +
              '<div style="border:1px solid #cbd5e1;border-radius:6px;padding:12px;white-space:pre-wrap;font-size:9.5pt;line-height:1.55;">' + escHtml(l.isi) + '</div>' +
            '</div>' +
            (l.catatanAdmin ? '<div style="margin-top:10px;font-size:8.5pt;"><strong>Catatan Tinjauan Admin:</strong> ' + escHtml(l.catatanAdmin) + '</div>' : '') +
          '</div>' +
          buildTtdHtml();
        printGenericHtml(html, 'Laporan Pengurus: ' + l.judul);
      }

      /* ---------- SUB-TAB KEAMANAN, HAK AKSES & LOG AUDIT (ADMIN) ---------- */

      function renderKeamananPage() {
        if (!AppState.user || AppState.user.role !== 'admin') return;
        apiCall('listUsers', {}, function(res) {
          AppState.users = res.users || [];
          renderUsersTable();
        });
        apiCall('listAudit', {}, function(res) {
          AppState.audit = res.audit || [];
          renderAuditTable();
        });
      }

      function renderUsersTable() {
        var tbody = document.getElementById('tbodyUsers');
        if (!tbody) return;
        var list = AppState.users || [];
        if (list.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">Belum ada akun terdaftar.</td></tr>';
          return;
        }
        var html = '';
        for (var i = 0; i < list.length; i++) {
          var u = list[i];
          var r = String(u.peran || 'anggota').toLowerCase();
          var stBadge = u.status === 'Aktif' ? '<span class="badge badge-emerald">Aktif</span>' : '<span class="badge badge-rose">Nonaktif</span>';
          html +=
            '<tr>' +
              '<td><strong>' + escHtml(u.email) + '</strong></td>' +
              '<td>' + escHtml(u.nama || '-') + '</td>' +
              '<td><span class="role-badge role-' + escHtml(r) + '">' + escHtml(roleLabel(r)) + '</span></td>' +
              '<td>' + escHtml(u.idJamaah || '-') + '</td>' +
              '<td>' + stBadge + '</td>' +
              '<td><span class="cell-sub">' + escHtml(u.loginTerakhir || '-') + '</span></td>' +
              '<td style="text-align:right;"><button type="button" class="btn btn-outline btn-sm" data-useraction="edit" data-email="' + escHtml(u.email) + '">Ubah</button></td>' +
            '</tr>';
        }
        tbody.innerHTML = html;
      }

      function openUserModal(editEmail) {
        var f = document.getElementById('formUser');
        if (f) f.reset();
        populateDatalistIdJamaah();
        var emInput = document.getElementById('usrEmail');
        if (editEmail) {
          var u = (AppState.users || []).find(function(x) { return x.email.toLowerCase() === editEmail.toLowerCase(); });
          if (!u) return;
          document.getElementById('modalUserTitle').textContent = 'Ubah Hak Akses — ' + u.email;
          emInput.value = u.email;
          emInput.readOnly = true;
          document.getElementById('usrNama').value = u.nama || '';
          document.getElementById('usrPeran').value = String(u.peran || 'anggota').toLowerCase();
          document.getElementById('usrStatus').value = u.status || 'Aktif';
          document.getElementById('usrIdJamaah').value = u.idJamaah || '';
        } else {
          document.getElementById('modalUserTitle').textContent = 'Daftarkan Akun Google Baru';
          emInput.value = '';
          emInput.readOnly = false;
          document.getElementById('usrPeran').value = 'anggota';
          document.getElementById('usrStatus').value = 'Aktif';
          document.getElementById('usrIdJamaah').value = '';
        }
        openModal('modalUser');
      }

      function handleSaveUserSubmit(e) {
        e.preventDefault();
        var payload = {
          email: String(document.getElementById('usrEmail').value || '').trim().toLowerCase(),
          nama: String(document.getElementById('usrNama').value || '').trim(),
          peran: String(document.getElementById('usrPeran').value || 'anggota').trim(),
          status: String(document.getElementById('usrStatus').value || 'Aktif').trim(),
          idJamaah: String(document.getElementById('usrIdJamaah').value || '').trim()
        };
        if (!payload.email) {
          showToast('Email akun Google wajib diisi.', 'error');
          return;
        }
        var btn = document.getElementById('btnSubmitUser');
        if (btn) btn.disabled = true;
        apiCall('saveUser', payload, function(res) {
          if (btn) btn.disabled = false;
          if (res.users) AppState.users = res.users;
          closeModal('modalUser');
          renderUsersTable();
          showToast(res.message || 'Hak akses pengguna disimpan.', 'success');
        }, function() {
          if (btn) btn.disabled = false;
        });
      }

      function renderAuditTable() {
        var tbody = document.getElementById('tbodyAudit');
        if (!tbody) return;
        var q = String((document.getElementById('auditSearch') && document.getElementById('auditSearch').value) || '').toLowerCase().trim();
        var list = (AppState.audit || []).filter(function(a) {
          if (!q) return true;
          var hay = (a.waktu + ' ' + a.email + ' ' + a.nama + ' ' + a.aksi + ' ' + a.modul + ' ' + a.detail).toLowerCase();
          return hay.indexOf(q) !== -1;
        });
        if (list.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted);">Tidak ada catatan aktivitas yang cocok.</td></tr>';
          return;
        }
        var html = '';
        for (var i = 0; i < list.length; i++) {
          var a = list[i];
          html +=
            '<tr>' +
              '<td style="white-space:nowrap;"><div class="cell-title">' + escHtml(a.waktu) + '</div><div class="cell-sub">' + escHtml(a.id || '') + '</div></td>' +
              '<td><div class="cell-title">' + escHtml(a.nama || '-') + '</div><div class="cell-sub">' + escHtml(a.email || '-') + ' (' + escHtml(a.peran || '-') + ')</div></td>' +
              '<td><span class="badge badge-blue">' + escHtml(a.aksi) + '</span><div class="cell-sub" style="margin-top:3px;">' + escHtml(a.modul) + '</div></td>' +
              '<td style="word-break:break-word;">' + escHtml(a.detail || '-') + '</td>' +
            '</tr>';
        }
        tbody.innerHTML = html;
      }

      /* ---------- EVENT BINDINGS v2.0 ---------- */

      function bindV2Events() {
        // Pilihan Peran Login & Form Masuk Lokal
        var roleCards = document.querySelectorAll('[data-loginrole]');
        for (var rc = 0; rc < roleCards.length; rc++) {
          roleCards[rc].addEventListener('click', function() {
            selectLoginRoleCard(this.getAttribute('data-loginrole'));
          });
        }
        var formLogin = document.getElementById('formLocalLogin');
        if (formLogin) formLogin.addEventListener('submit', handleLocalLoginSubmit);

        // Tombol Backup & Restore WhatsApp / File JSON
        function triggerShareWa() {
          window.SidaDB.shareBackupWhatsApp(AppState, function(res) {
            recordPreviewAudit('BACKUP_WA', 'DatabaseLokal', res.fileName);
            persistLocalDb();
            showToast('File cadangan (' + res.fileName + ') siap dikirim ke WhatsApp!', 'success');
          });
        }
        function triggerDownloadBackup() {
          var bk = window.SidaDB.downloadBackupFile(AppState);
          recordPreviewAudit('BACKUP_FILE', 'DatabaseLokal', bk.fileName);
          persistLocalDb();
          showToast('File cadangan ' + bk.fileName + ' berhasil diunduh ke HP/perangkat.', 'success');
        }
        function triggerOpenRestorePicker() {
          var inp = document.getElementById('inpRestoreJsonFile');
          if (inp) {
            inp.value = '';
            inp.click();
          }
        }

        var btnShareWa = document.getElementById('btnBackupShareWa');
        if (btnShareWa) btnShareWa.addEventListener('click', triggerShareWa);
        var menuBackupWa = document.getElementById('menuBackupWa');
        if (menuBackupWa) menuBackupWa.addEventListener('click', triggerShareWa);

        var btnDlBk = document.getElementById('btnBackupDownload');
        if (btnDlBk) btnDlBk.addEventListener('click', triggerDownloadBackup);
        var menuDlBk = document.getElementById('menuDownloadBackup');
        if (menuDlBk) menuDlBk.addEventListener('click', triggerDownloadBackup);

        var btnRest = document.getElementById('btnBackupRestore');
        if (btnRest) btnRest.addEventListener('click', triggerOpenRestorePicker);
        var menuRest = document.getElementById('menuRestoreBackup');
        if (menuRest) menuRest.addEventListener('click', triggerOpenRestorePicker);
        var btnRestLogin = document.getElementById('btnRestoreOnLogin');
        if (btnRestLogin) btnRestLogin.addEventListener('click', triggerOpenRestorePicker);

        var inpRestoreFile = document.getElementById('inpRestoreJsonFile');
        if (inpRestoreFile) {
          inpRestoreFile.addEventListener('change', function(e) {
            var file = e.target.files && e.target.files[0];
            if (!file) return;
            var modeSel = document.getElementById('selRestoreMode');
            var mode = modeSel ? modeSel.value : 'replace';
            var reader = new FileReader();
            reader.onload = function(evt) {
              var content = evt.target.result || '';
              window.SidaDB.restoreFromBackupJson(content, mode, AppState, function(res) {
                if (!res.success) {
                  showToast(res.message, 'error');
                  setLoginStatus(res.message, true);
                  return;
                }
                applyLoadedDbState(res.state);
                recordPreviewAudit('RESTORE_DB', 'DatabaseLokal', file.name + ' (' + mode + ')');
                persistLocalDb();
                if (AppState.user) {
                  refreshAllViews();
                  renderKeamananPage();
                }
                showToast(res.message, 'success');
                setLoginStatus(res.message, false);
              });
            };
            reader.readAsText(file);
          });
        }

        var btnResetDef = document.getElementById('btnResetDefaultDb');
        if (btnResetDef) {
          btnResetDef.addEventListener('click', function() {
            window.SidaDB.resetToDefault311(function(freshState) {
              applyLoadedDbState(freshState);
              refreshAllViews();
              renderKeamananPage();
              showToast('Database berhasil dikembalikan ke 311 data jamaah awal.', 'success');
            });
          });
        }

        var formPin = document.getElementById('formChangePin');
        if (formPin) {
          formPin.addEventListener('submit', function(e) {
            e.preventDefault();
            var newPin = String(document.getElementById('inpNewAdminPin').value || '').trim();
            if (newPin.length < 4) {
              showToast('PIN Sekretaris minimal 4 karakter/angka.', 'error');
              return;
            }
            AppState.adminPin = newPin;
            recordPreviewAudit('UBAH_PIN', 'Keamanan', 'PIN Sekretaris diperbarui');
            persistLocalDb();
            document.getElementById('inpNewAdminPin').value = '';
            showToast('PIN Sekretaris berhasil diperbarui menjadi: ' + newPin, 'success');
          });
        }

        // Tombol Modul Utama (Database, Absensi, Struktur Pengurus)
        var modBtns = document.querySelectorAll('[data-module]');
        for (var i = 0; i < modBtns.length; i++) {
          modBtns[i].addEventListener('click', function() {
            switchModule(this.getAttribute('data-module'));
          });
        }

        // Menu Profil Header & Mobile
        var btnProf = document.getElementById('btnProfile');
        var profMenu = document.getElementById('profileMenu');
        if (btnProf && profMenu) {
          btnProf.addEventListener('click', function(e) {
            e.stopPropagation();
            profMenu.classList.toggle('open');
          });
          document.addEventListener('click', function() {
            profMenu.classList.remove('open');
          });
        }
        var btnOpenProf = document.getElementById('btnOpenProfile');
        if (btnOpenProf) btnOpenProf.addEventListener('click', openProfileModal);
        var mobBtnProf = document.getElementById('mobBtnProfile');
        if (mobBtnProf) mobBtnProf.addEventListener('click', openProfileModal);

        var btnLogout = document.getElementById('btnLogout');
        if (btnLogout) btnLogout.addEventListener('click', function() { doLogout(false); });
        var btnLogoutProf = document.getElementById('btnLogoutFromProfile');
        if (btnLogoutProf) btnLogoutProf.addEventListener('click', function() { doLogout(false); });

        // Absensi Events
        var absTabBtns = document.querySelectorAll('[data-abstab]');
        for (var a = 0; a < absTabBtns.length; a++) {
          absTabBtns[a].addEventListener('click', function() {
            switchAbsTab(this.getAttribute('data-abstab'));
          });
        }
        document.getElementById('btnNewKegiatan').addEventListener('click', function() { openKegiatanModal(''); });
        document.getElementById('btnEditKegiatan').addEventListener('click', function() { openKegiatanModal(AppState.activeKegiatanId); });
        document.getElementById('btnDeleteKegiatan').addEventListener('click', handleDeleteActiveKegiatan);
        document.getElementById('btnAbsAllHadir').addEventListener('click', handleMarkAllHadir);
        document.getElementById('btnSaveAbsensi').addEventListener('click', handleSaveAbsensi);
        document.getElementById('formKegiatan').addEventListener('submit', handleSaveKegiatanSubmit);

        document.getElementById('kgList').addEventListener('click', function(e) {
          var card = e.target.closest('[data-selectkg]');
          if (card) selectKegiatan(card.getAttribute('data-selectkg'));
        });

        document.getElementById('absSearch').addEventListener('input', renderAbsensiSheet);
        document.getElementById('absKelompokFilter').addEventListener('change', renderAbsensiSheet);

        document.getElementById('tbodyAbsensi').addEventListener('change', function(e) {
          var r = e.target.closest('[data-absid]');
          if (r) {
            var idj = r.getAttribute('data-absid');
            var cur = AppState.absDraft[idj] || { status: '', catatan: '' };
            cur.status = r.value;
            AppState.absDraft[idj] = cur;
            renderAbsensiSheet();
          }
        });
        document.getElementById('tbodyAbsensi').addEventListener('input', function(e) {
          var inp = e.target.closest('[data-abscat]');
          if (inp) {
            var idj = inp.getAttribute('data-abscat');
            var cur = AppState.absDraft[idj] || { status: '', catatan: '' };
            cur.catatan = inp.value;
            AppState.absDraft[idj] = cur;
          }
        });

        document.getElementById('rekapSearch').addEventListener('input', renderRekapAbsensi);
        document.getElementById('rekapKelompok').addEventListener('change', renderRekapAbsensi);
        document.getElementById('btnPrintRekapAbsensi').addEventListener('click', printRekapAbsensi);

        // Struktur Pengurus & Laporan Events
        var pengTabBtns = document.querySelectorAll('[data-pengtab]');
        for (var p = 0; p < pengTabBtns.length; p++) {
          pengTabBtns[p].addEventListener('click', function() {
            switchPengTab(this.getAttribute('data-pengtab'));
          });
        }
        document.getElementById('btnAddPengurus').addEventListener('click', function() { openPengurusModal(''); });
        document.getElementById('btnPrintStruktur').addEventListener('click', printStrukturPengurus);
        document.getElementById('pengSearch').addEventListener('input', renderPengurusTable);
        document.getElementById('pengKelompok').addEventListener('change', renderPengurusTable);
        document.getElementById('formPengurus').addEventListener('submit', handleSavePengurusSubmit);

        document.getElementById('pgIdJamaah').addEventListener('change', function() {
          var jm = findJamaahById(String(this.value || '').trim());
          if (jm) document.getElementById('pgNama').value = jm.nama;
        });

        document.getElementById('tbodyPengurus').addEventListener('click', function(e) {
          var btn = e.target.closest('[data-pengaction]');
          if (!btn) return;
          var act = btn.getAttribute('data-pengaction');
          var id = btn.getAttribute('data-id');
          if (act === 'edit') openPengurusModal(id);
          else if (act === 'delete') handleDeletePengurus(id);
        });

        document.getElementById('btnNewLaporan').addEventListener('click', function() { openLaporanModal(''); });
        document.getElementById('btnSaveLaporanDraft').addEventListener('click', function() { submitLaporanWithStatus('Draft'); });
        document.getElementById('formLaporan').addEventListener('submit', function(e) {
          e.preventDefault();
          submitLaporanWithStatus('Terkirim');
        });

        document.getElementById('tbodyLaporan').addEventListener('click', function(e) {
          var btn = e.target.closest('[data-lapaction]');
          if (!btn) return;
          var act = btn.getAttribute('data-lapaction');
          var id = btn.getAttribute('data-id');
          if (act === 'view') openViewLaporanModal(id);
          else if (act === 'edit') openLaporanModal(id);
          else if (act === 'delete') handleDeleteLaporan(id);
        });

        document.getElementById('btnLvRevisi').addEventListener('click', function() { handleReviewLaporan('Perlu Revisi'); });
        document.getElementById('btnLvTinjau').addEventListener('click', function() { handleReviewLaporan('Ditinjau'); });
        document.getElementById('btnPrintLaporan').addEventListener('click', printActiveLaporan);

        // Keamanan & Audit Events
        document.getElementById('btnAddUser').addEventListener('click', function() { openUserModal(''); });
        document.getElementById('btnReloadSecurity').addEventListener('click', renderKeamananPage);
        document.getElementById('formUser').addEventListener('submit', handleSaveUserSubmit);
        document.getElementById('auditSearch').addEventListener('input', renderAuditTable);

        document.getElementById('tbodyUsers').addEventListener('click', function(e) {
          var btn = e.target.closest('[data-useraction="edit"]');
          if (btn) openUserModal(btn.getAttribute('data-email'));
        });
      }


      // Initialize Application on DOM Ready
      document.addEventListener('DOMContentLoaded', function() {
        bindEvents();
        bindV2Events();
        initAuth();

      // Progressive Web App (PWA) Install Logic
      var deferredPwaPrompt = null;
      window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPwaPrompt = e;
        var box = document.getElementById('pwaNativeInstallBox');
        if (box) box.style.display = 'block';
      });

      function openPwaInstallModal() {
        if (deferredPwaPrompt) {
          var box = document.getElementById('pwaNativeInstallBox');
          if (box) box.style.display = 'block';
        }
        openModal('modalPwaInstall');
      }

      var btnPwaLogin = document.getElementById('btnInstallPwaLogin');
      if (btnPwaLogin) btnPwaLogin.addEventListener('click', openPwaInstallModal);

      var menuPwa = document.getElementById('menuInstallPwa');
      if (menuPwa) menuPwa.addEventListener('click', openPwaInstallModal);

      var btnDoNative = document.getElementById('btnDoNativeInstall');
      if (btnDoNative) {
        btnDoNative.addEventListener('click', function() {
          if (deferredPwaPrompt) {
            deferredPwaPrompt.prompt();
            deferredPwaPrompt.userChoice.then(function(choiceResult) {
              if (choiceResult.outcome === 'accepted') {
                showToast('Aplikasi berhasil dipasang di HP Anda!', 'success');
              }
              deferredPwaPrompt = null;
              closeModal('modalPwaInstall');
            });
          } else {
            showToast('Gunakan petunjuk di bawah untuk menambahkan ke layar utama.', 'info');
          }
        });
      }

      });
    })();