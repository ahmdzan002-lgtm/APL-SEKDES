/**
 * ============================================================================
 * SIDA-JAMAAH: MESIN DATABASE LOKAL PERANGKAT (INDEXEDDB + LOCALSTORAGE)
 * File: js/db.js (Pre-loaded 311 Data Jamaah Riil, Offline-First & Backup WA)
 * Standar Arsitektur: ZettBOT Core v4.1
 * ============================================================================
 */
(function(window) {
  'use strict';

  var IDB_NAME = 'sida_jamaah_idb_v3';
  var IDB_VERSION = 1;
  var IDB_STORE = 'sida_store';
  var IDB_KEY = 'master_db_v3';
  var LS_KEY = 'sida_jamaah_ls_v3';

  function getRaw311CsvLines() {
  return [
    '1,1,Al Awwabin 1,Bp H Andi Mulya,Semarang,1966-08-06,60,L,Menikah,S1,,,,,DEWASA,O,,+6281395254001',
    ',2,Al Awwabin 1,Ibu Hj Hanung Catur Rini,Yogyakarta,1968-09-14,58,P,Menikah,SMA,,,,,DEWASA,A,,',
    ',3,Al Awwabin 1,Rafiq Jamil Aziz,Bandung,1998-12-12,27,P,Belum,S1,,,,,USIA NIKAH,O,,',
    ',4,Al Awwabin 1,Syafira Aulia Aziz,Bandung,2003-12-21,22,P,Belum,SMA,,,,,PRA NIKAH,A,,',
    ',5,Al Awwabin 1,Dhimas Faqih Aziz,Bandung,2008-05-07,18,L,Belum,SMK,,,,,REMAJA / MUDA-MUDI,,,',
    '1,6,Al Awwabin 1,Bp H Romli Nafiah,Palembang,1960-03-23,66,L,Menikah,SLTA,,,Wakides,,LANSIA,,MS,',
    ',7,Al Awwabin 1,Sri Wigati,Purbalingga,1971-05-22,55,P,Menikah,SLTA,,,,,DEWASA,,,',
    ',8,Al Awwabin 1,Royan Maulana Ahyar,Bandung,2003-07-19,23,L,Belum,SLTA,,,,,USIA NIKAH,,,',
    '1,9,Al Awwabin 1,Bp Sutoyo,Purworejo,1976-10-13,50,L,Menikah,SMP,,,Kipok,,DEWASA,A,,+6289697008553',
    ',10,Al Awwabin 1,Ibu Kalimah,Indramayu,1982-05-18,44,P,Menikah,SMP,,,,,DEWASA,O,,',
    ',11,Al Awwabin 1,Ayu Juniati,Sumedang,2008-06-12,18,P,Belum,SMA,,,,,REMAJA / MUDA-MUDI,,,',
    '1,12,Al Awwabin 1,Bp Iryasin M Supu,moutong,1971-07-23,55,L,Menikah,SMA,,,Wakipok,Aghnia,DEWASA,B,,+628128278580',
    ',13,Al Awwabin 1,Ibu Murni Sagita,Jakarta,1974-11-30,51,P,Menikah,SMA,,,,,DEWASA,B,,',
    ',14,Al Awwabin 1,Novii Sinta,Jakarta,1996-01-02,30,P,Belum,SMA,,,,,USIA NIKAH,B,,',
    ',15,Al Awwabin 1,Amarullah,Jakarta,2000-03-25,26,L,Belum,KULIAH,,,,,USIA NIKAH,B,,',
    '1,16,Al Awwabin 1,Bp Marsono,klaten,1977-11-07,48,L,Menikah,SMA,,,KU Kelpk,Aghnia,DEWASA,-,,+6285221961421',
    ',17,Al Awwabin 1,Ibu Maryani,Bandung,1987-04-01,39,P,Menikah,SMA,,,,,DEWASA,A+,,',
    ',18,Al Awwabin 1,Maghfira Zahra Sabilani,Bandung,2008-07-19,18,P,Belum,SMA,,,,,REMAJA / MUDA-MUDI,,,',
    ',19,Al Awwabin 1,Marva Rasyada Sabilani,Bandung,2011-02-16,15,P,Belum,SMP,,,,,REMAJA / MUDA-MUDI,-,,',
    ',20,Al Awwabin 1,Malik Arafah Sabilarosad,Bandung,2016-02-10,10,L,Belum,SD,,,,,CABERAWIT,-,,',
    ',21,Al Awwabin 1,Mahira Rachel Sabilani,Bandung,2019-01-08,7,P,Belum,TK,,,,,CABERAWIT,-,,',
    '1,22,Al Awwabin 1,Bp H Eri Haryadi,Magelang,1964-12-19,61,L,Menikah,SMA,,,Tim,,LANSIA,-,,+6281224007045',
    ',23,Al Awwabin 1,Ibu Rifa Sophia,Bandung,1975-02-19,51,P,Menikah,SMA,,,,,DEWASA,-,,',
    ',24,Al Awwabin 1,Fahri Aulia Rahman,Bandung,2008-10-24,18,L,Belum,SMA,,,,,REMAJA / MUDA-MUDI,,,',
    ',25,Al Awwabin 1,Ardini Uzma Nabila,Bandung,2012-06-29,14,P,Belum,SMP,,,,,REMAJA / MUDA-MUDI,-,,',
    '1,26,Al Awwabin 1,Bp Bambang Subiyanto,Bandung,1965-05-14,61,L,Menikah,S1,,,,,LANSIA,B,,+6282116915252',
    ',27,Al Awwabin 1,Ibu Yulya Fitriani,Aceh,1974-08-06,52,P,Menikah,SMA,,,,,DEWASA,AB,,',
    '1,28,Al Awwabin 1,Bp Dadang Sunarya,Bandung,1962-02-04,64,L,Menikah,SMP,,,,,LANSIA,AB,,+6285315411343',
    ',29,Al Awwabin 1,Ibu Yati Hayati,Bandung,1968-09-03,58,P,Menikah,SMP,,,,,DEWASA,AB,,+6289515610763',
    ',30,Al Awwabin 1,Wanda Nuraini,Bandung,1999-05-12,27,P,Belum,SMP,,,,,USIA NIKAH,AB,,',
    ',31,Al Awwabin 1,Ibu Qomariah,Bandung,1947-01-01,79,P,Janda,,,,,Dhuafa,LANSIA,,,',
    '1,32,Al Awwabin 1,Muhamad Rusdi Fadila,Bandung,2000-01-20,26,L,Belum,Diploma IV,,,,,USIA NIKAH,,,+6289630355973',
    ',33,Al Awwabin 1,Ibu Nunung Yulianingsih,Padasuka,1958-09-16,68,P,Menikah,SMP,,,,,LANSIA,-,,',
    '1,34,Al Awwabin 1,Bp Tubagus (Teguh),Sumedang,1989-11-25,36,L,Menikah,SMA,,,,,DEWASA,-,,',
    ',35,Al Awwabin 1,Ibu Ilma Andini,Tegal,1994-04-13,32,P,Menikah,SMA,,,,,DEWASA,-,,+62895708150501',
    ',36,Al Awwabin 1,Aldinar Ayunda ,Bandung,2016-10-25,9,P,Belum,SD,,,,,CABERAWIT,-,,',
    ',37,Al Awwabin 1,Ayra Shyrly Alnaira,Bandung,2021-11-19,4,P,Belum,-,,,,,BALITA,-,,',
    ',38,Al Awwabin 1,Arjuna Yudistira Hakim,Bandung,2024-08-03,2,L,Belum,-,,,,,BALITA,-,,',
    '1,39,Al Awwabin 1,Bp H Kayat Sukayat,Sumedang,1965-04-29,61,L,Menikah,S1,,,Wakipok,Aghnia,LANSIA,,,+6281320031301',
    ',40,Al Awwabin 1,Ibu Hj Sri Suarsih,Bandung,1965-12-08,60,P,Menikah,SMA,,,,,DEWASA,,,',
    ',41,Al Awwabin 1,M Zaki Asaduloh,Sumedang,2000-12-28,25,L,Belum,KULIAH,,,,,USIA NIKAH,,MS,',
    ',42,Al Awwabin 1,Fatan Ramadhan Mansyurin,Sumedang,2002-10-31,23,L,Belum,s,,,,,USIA NIKAH,,MS,',
    ',43,Al Awwabin 1,Zulfa Fahmi Dzikri,Sumedang,2004-05-08,22,L,Belum,SMA,,,,,PRA NIKAH,,MS,',
    ',44,Al Awwabin 1,Azka Nurul Aini,Sumedang,2007-11-14,18,P,Belum,KULIAH,,,,,REMAJA / MUDA-MUDI,O,MS,',
    ',45,Al Awwabin 1,Adna,Sumedang,2009-11-15,16,P,Belum,SMA,,,,,REMAJA / MUDA-MUDI,,,',
    '1,46,Al Awwabin 1,Ibu Lilis Sumiati,Bandung,1969-09-10,57,P,Menikah,SPG,,,,,DEWASA,AB,,+6285220325003',
    ',47,Al Awwabin 1,M. Naufal Fauzi,Bandung,2006-05-11,20,L,Belum,SMP,,,,,PRA NIKAH,-,,',
    '1,48,Al Awwabin 1,Ibu Purwanti,Yogyakarta,1979-09-10,47,P,Menikah,SMA,,,,,DEWASA,,,+628978841233',
    ',49,Al Awwabin 1,Aghniz Aulia Nurrahman,Bandung,2009-04-02,17,P,Belum,SMA,,,,,REMAJA / MUDA-MUDI,,,',
    ',50,Al Awwabin 1,Azkiya Aulia Nurrahman,Bandung,2012-03-28,14,P,Belum,SMP,,,,,REMAJA / MUDA-MUDI,,,',
    ',51,Al Awwabin 1,Abghan Aulia Nurrahman,Bandung,2017-08-12,9,L,Belum,TK,,,,,CABERAWIT,,,',
    '1,52,Al Awwabin 1,Bp Andre Achmad Yusuf,Bandung,1979-06-23,47,L,Menikah,SMA,,,,,DEWASA,,,+6288218187000',
    ',53,Al Awwabin 1,Ibu Ratna Maisari Sawitri,Jakarta,1981-05-16,45,P,Menikah,SMA,,,,,DEWASA,,,',
    ',54,Al Awwabin 1,Andara Aulia Yusuf,Tangerang,2020-10-22,5,P,Belum,Paud,,,,,CABERAWIT,,,',
    '1,55,Al Awwabin 1,Bp Amir Hambiyah,Sukoharjo,1994-05-15,32,L,Belum,S1,,,,,USIA NIKAH,O,,+6287736010991',
    ',56,Al Awwabin 1,Ibu Nur Sholehah,Sukoharjo,1993-06-21,33,P,Belum,D3,,,,,USIA NIKAH,O,,',
    ',57,Al Awwabin 1,Bramayanto abiandra hambiyah,Bandung,2020-06-05,6,L,Belum,-,,,,,CABERAWIT,O,,',
    ',58,Al Awwabin 1,Bethari Aruna Komalia,Bandung,2023-10-15,3,P,Belum,,,,,,BALITA,,,',
    '1,59,Al Awwabin 1,Bp Gani Priyanto,Bandung,1963-09-25,63,L,Menikah,SMA,,,,,LANSIA,-,,+6285324757234',
    ',60,Al Awwabin 1,Ibu Rosidah,Bandung,1969-06-05,57,P,Menikah,SMP,,,,,DEWASA,-,,',
    ',61,Al Awwabin 1,Dafa Gilang R,Bandung,2002-11-21,23,L,Belum,SMA,,,,,USIA NIKAH,-,,',
    ',62,Al Awwabin 1,M Sayid Fadel,Bandung,2004-11-09,21,L,Belum,SMA,,,,,PRA NIKAH,-,,',
    '1,63,Al Awwabin 1,Bp Irvan Fauzi,Cilacap,1992-04-26,34,P,Menikah,SMA,,,,,DEWASA,,,',
    ',64,Al Awwabin 1,Ibu Restu Wulan Andini,Sumedang,1996-12-29,24,L,Menikah,S1,,,,,DEWASA,,,',
    ',65,Al Awwabin 1,Genandra Fauzi Alfatih,Sumedang,2024-09-07,2,L,Belum,,,,,,BALITA,,,',
    '1,66,Al Awwabin 1,M Alimun Dinnan,Bandung,2002-10-03,24,L,Belum,SMA,,,MT Kelpk,,USIA NIKAH,-,MT,+6288222056156',
    ',67,Al Awwabin 1,Dendi Firmansyah,Bandung,2006-08-04,20,L,Belum,SMA,,,,,PRA NIKAH,,,',
    '1,68,Al Awwabin 1,Tanwir Faried Junaedi,Nganjuk,1975-03-23,51,L,Menikah,SLTA,,,,,DEWASA,,,+6281316099944',
    ',69,Al Awwabin 1,Syifa Nurul Afiah,Bandung,1985-07-16,41,P,Menikah,SLTA,,,,,DEWASA,,,',
    ',70,Al Awwabin 1,Fabian Haikal Bihar Ilmi,Karawang,2003-12-26,22,L,Belum,SMA,,,,,PRA NIKAH,O,,',
    ',71,Al Awwabin 1,Vanya Maula Zalfadhyla,Bandung,2005-06-19,21,P,Belum,SMA,,,,,PRA NIKAH,O,,',
    ',72,Al Awwabin 1,Fayzan Arsakha Rezqian,Bandung,2016-10-30,9,L,Belum,SD,,,,,CABERAWIT,,,',
    ',73,Al Awwabin 1,Faizara Qiana Saira,Bandung,2020-12-02,5,P,Belum,,,,,,CABERAWIT,,,',
    '1,74,Al Awwabin 1,Fenti Rahmawati,Bandung,1978-02-25,48,P,Janda,SMU,,,,,BALITA,-,,+6289635563308',
    '1,75,Al Awwabin 1,Abdul Aziz,Bandung,1997-09-05,29,L,Menikah,S1,,,,,DEWASA,B,,',
    ',76,Al Awwabin 1,Fitri Khoirun Nissa,Sumedang,1998-08-22,28,P,Menikah,Sarjana,,,,,DEWASA,,,+628886060136',
    ',77,Al Awwabin 1,Gemma Kaivan Putra,Bandung,2024-01-12,2,L,Belum,-,,,,,BALITA,,,',
    '1,78,Al Awwabin 1,Eka Suci Pratiwi,Bandung,1991-03-26,35,P,Menikah,SMA,,,,,DEWASA,A,,+62881022239733',
    ',79,Al Awwabin 1,Maryam Khaira Lubna,Bandung,2015-08-20,11,P,Belum,SD,,,,,CABERAWIT,,,',
    ',80,Al Awwabin 1,Fachri Choairul Huda,Cimahi,2017-02-17,9,L,Belum,SD,,,,,CABERAWIT,,,',
    ',81,Al Awwabin 1,Malika Sakeena Zhafira,Bandung,2019-11-14,6,P,Belum,SD,,,,,CABERAWIT,,,',
    '1,82,Al Awwabin 1,Dessy Primawanti Firdausy,Bandung,1991-12-30,34,P,Menikah,D3/D4,,,,,DEWASA,O,,+6281214720690',
    ',83,Al Awwabin 1,Fabian Halim Alfatih Firdaus,Bandung,2015-02-06,11,L,Belum,SD,,,,,CABERAWIT,O,,',
    ',84,Al Awwabin 1,Nadhif Halim Arshaka Adhyastha,Bandung,2016-05-24,10,L,Belum,SD,,, ,,CABERAWIT,O,,',
    ',85,Al Awwabin 1,Aidil Yasir Halim Prawira,Kota Bandung,2023-04-21,3,L,Belum,-,,,,,BALITA,O,,',
    '1,86,Al Awwabin 2,H. Wahyu ,Sumedang ,1953-06-09,73,L ,Menikah ,S1,,,Kides,Aghnia ,LANSIA,,,',
    ',87,Al Awwabin 2,Hj. Susdiyanti ,Jombang ,1953-06-01,73,P,Menikah ,S1,,,,,LANSIA,,,',
    '1,88,Al Awwabin 2,H. Budi Margono ,Magelang ,1964-07-17,62,L ,Menikah ,S2,,,Wakipok ,Aghnia,LANSIA,O,,',
    ',89,Al Awwabin 2,Firmansyah ,Bandung ,2007-02-06,19,L,Belum,SMA,,,,,PRA NIKAH,O,,',
    '1,90,Al Awwabin 2,Ujang Sulaeman ,Subang,1967-06-23,59,L,Menikah,SMP,,,Kipok,,DEWASA,O,,',
    ',91,Al Awwabin 2,Azizah,Tegal,1975-07-12,51,P,Menikah,SD,,,,,DEWASA,,,',
    ',92,Al Awwabin 2,Baharisqi Dermawan ,Bandung,7-May-99,27,L,Belum,SMA,,,,,USIA NIKAH,,MS,',
    ',93,Al Awwabin 2,Alya Suci Lestari ,Bandung,2006-03-16,20,P,Belum,SMA,,,,,PRA NIKAH,,,',
    ',94,Al Awwabin 2,Azmi Nursifa,Bandung ,2008-09-17,17,P,Belum ,SMA,,,,,REMAJA / MUDA-MUDI,,,',
    '1,95,Al Awwabin 2,M. Bisri ,Bandung ,1976-02-27,50,L,Menikah ,SMA,,,Ku Pok,Aghnia ,REMAJA / MUDA-MUDI,,,',
    ',96,Al Awwabin 2,Nurhidayati,Klaten ,14-Dec-76,49,P,Menikah ,SMA,,,,,REMAJA / MUDA-MUDI,,,',
    ',97,Al Awwabin 2,Wiyanda Qori W. B ,Bandung ,5-Oct-10,15,P,Belum ,SMA ,,,,,REMAJA / MUDA-MUDI,,,',
    '1,98,Al Awwabin 2,Sunaryo ,Banjar Negara,1978-04-04,48,L,Menikah,SMA,,,Bospok ,,DEWASA,,,',
    ',99,Al Awwabin 2,Siti Nuriyah,Banyumas,26-Oct-82,43,P,Menikah ,SMP,,,,,REMAJA / MUDA-MUDI,O,,',
    ',100,Al Awwabin 2,Nathan Rofqi A,Banyumas,2002-04-08,24,L,Belum,Kuliah,,,,,USIA NIKAH,O,,',
    ',101,Al Awwabin 2,Nafil Muhana ,Bandung,2007-11-20,18,L,Belum,SMA,,,,,REMAJA / MUDA-MUDI,O,,',
    ',102,Al Awwabin 2,Athar Nadiv Abqori ,Bandung,10-Dec-18,7,L,Belum,SD,,,,,CABERAWIT,,,',
    ',103,Al Awwabin 2,Naura Embun Melati ,Bandung,13-May-20,6,P,Belum ,SD ,,,,,CABERAWIT,,,',
    '1,104,Al Awwabin 2,Rahmat Hidayat ,Bandung,25-Dec-76,49,L,Menikah,SMA,,,Bospok,,DEWASA,,,',
    ',105,Al Awwabin 2,Andik Wartini ,Blora,1987-03-05,39,P,Menikah ,SMP,,,,,REMAJA / MUDA-MUDI,,,',
    ',106,Al Awwabin 2,Almira Qurrata A,Bandung,2016-01-28,10,P,Belum,SD,,,,,CABERAWIT,,,',
    ',107,Al Awwabin 2,Beryl Haziman Rabbani ,Bandung ,8-May-22,3,L,Belum , -,,,,,BALITA,,,',
    '1,108,Al Awwabin 2,Maman Suparman ,Bandung,6-Aug-65,61,L,Menikah,SMA,,,PAC Rck Wetan,Aghnia ,LANSIA,,,',
    ',109,Al Awwabin 2,Siti Aisyah ,Bandung ,27-Dec-68,57,P,Menikah ,SMA ,,,,,BALITA,,,',
    '1,110,Al Awwabin 2,Didin Juardi,Majalengka,1978-09-01,48,L,Menikah,SMA,,,,,DEWASA,A,,',
    ',111,Al Awwabin 2,Lina Marlina,Bandung,1977-04-10,49,P,Menikah ,SMA,,,,,REMAJA / MUDA-MUDI,A,,',
    ',112,Al Awwabin 2,Raihana Rihil Miski,Bandung,28-May-99,27,P,Belum,Kuliah,,,,,USIA NIKAH,A,,',
    ',113,Al Awwabin 2,M. Luthfi N,Majalengka ,5-Oct-00,25,L,Belum,Kuliah,,,Penulis KU,,USIA NIKAH,A,,',
    ',114,Al Awwabin 2,M. Bintang L,Bandung,2007-09-03,18,L,Belum,SMA,,,,,REMAJA / MUDA-MUDI,A,,',
    ',115,Al Awwabin 2,M. Ilyas Khoirula,Bandung,31-Aug-10,16,L,Belum,SMA,,,,,REMAJA / MUDA-MUDI,A,,',
    ',116,Al Awwabin 2,Sarah Adila R,Bandung ,12-Aug-13,13,P,Belum,SD,,,,,REMAJA / MUDA-MUDI,A,,',
    ',117,Al Awwabin 2,M. Hafidz Al Kayyis,Bandung,9-Aug-17,9,L,Belum,SD,,,,,CABERAWIT,A,,',
    ',118,Al Awwabin 2,Humaira Azzahra ,Bandung ,2019-04-26,7,P,Belum,SD,,,,,CABERAWIT,A,,',
    '1,119,Al Awwabin 2,Puji Utomo ,Bandung ,1976-09-02,49,L,Menikah ,STM,,,Bospok,,BALITA,O,,',
    ',120,Al Awwabin 2,Maemunah ,Bandung ,12-Dec-77,48,P,Menikah ,,,,,,BALITA,O,,',
    ',121,Al Awwabin 2,Irsyad Maulana P,Bandung ,2009-06-07,17,L,Belum ,SMA,,,,,REMAJA / MUDA-MUDI,,,',
    ',122,Al Awwabin 2,Irham Saiful Izza,Bandung ,2011-04-18,15,L,Belum ,SMP ,,,,,REMAJA / MUDA-MUDI,,,',
    ',123,Al Awwabin 2,Iqbal Dzul Fahmi,Bandung ,12-Aug-15,11,L,Belum ,SD ,,,,,CABERAWIT,,,',
    '1,124,Al Awwabin 2,M Jazari ,Yogyakarta ,28-Oct-58,67,L,Menikah,SMA,,,,,LANSIA,,,',
    ',125,Al Awwabin 2,Panji Perdana,Bandung ,2001-09-14,24,L,Belum ,SMA,,,,,REMAJA / MUDA-MUDI,,,',
    ',126,Al Awwabin 2,Sofi A,Bandung ,2003-09-09,22,P,Belum ,SMK,,,,,BALITA,,,',
    ',127,Al Awwabin 2,Melani Angkasa P,Bandung ,8-May-08,18,P,Belum ,SMK,,,,,REMAJA / MUDA-MUDI,,,',
    ',128,Al Awwabin 2,Jaka Ramadani ,Bandung ,9-Aug-11,14,L,Belum ,SMP ,,,,,REMAJA / MUDA-MUDI,,,',
    '1,129,Al Awwabin 2,Aay Puji Rahayu,Bandung ,1972-11-22,53,L,Menikah,SMA ,,,,,DEWASA,A,,',
    ',130,Al Awwabin 2,Partini,Grobogan,20-Dec-82,43,P,Menikah,SMA,,,,,DEWASA,O,,',
    ',131,Al Awwabin 2,Alimandita,Bandung,2009-06-05,17,L,Belum,SMA,,,,,REMAJA / MUDA-MUDI,,,',
    ',132,Al Awwabin 2,Ayunda Nurmala P,Bandung ,2024-06-22,2,P,Belum ,-,,,,,BALITA,,,',
    '1,133,Al Awwabin 2,Suparno,Banjar Negara ,8-Aug-71,55,L,Menikah,SMA,,,,,DEWASA,B,,',
    ',134,Al Awwabin 2,Indiyah ,Wonosobo ,1976-06-21,50,P,Menikah,SMA ,,,,,DEWASA,B,,',
    '1,135,Al Awwabin 2,Sugeng Riyadi ,Bandung ,1971-11-22,54,L,Duda,SMA,,,,,REMAJA / MUDA-MUDI,O,,',
    ',136,Al Awwabin 2,Silviana Qori Nurul Aini,Bandung ,2002-01-10,24,P,Belum ,Kuliah ,,,,,BALITA,,,',
    ',137,Al Awwabin 2,Silviana Nisa Aristianti,Bandung ,2003-03-24,23,P,Belum ,SMA,,,,,REMAJA / MUDA-MUDI,,,',
    ',138,Al Awwabin 2,Adrian Fitriansyah R,Bandung ,10-Oct-07,18,L,Belum ,SMA ,,,,,REMAJA / MUDA-MUDI,,,',
    '1,139,Al Awwabin 2,Ratna Sari Dewi,Sukabumi ,1966-09-11,60,P,Janda ,D3,,,,,BALITA,O,,',
    ',140,Al Awwabin 2,Fadhillah Shidiq ,Sukabumi ,2004-07-31,22,L,Belum,SMK,,,,,PRA NIKAH,,,',
    '1,141,Al Awwabin 2,Rahayuni ,Temanggung ,1976-11-23,49,P,Menikah ,SMA,,,,,REMAJA / MUDA-MUDI,,,',
    '1,142,Al Awwabin 2,Herni Hermawati,Bandung ,1988-09-24,37,P,Menikah ,SMA ,,,,,BALITA,,,',
    ',143,Al Awwabin 2,Febrio Putra Rambagi,Bandung ,2015-01-06,10,L,Belum ,SD,,,,,CABERAWIT,,,',
    '1,144,Al Awwabin 2,Fiqhi Hidayatullah ,Jakarta ,1995-03-18,31,L,Menikah ,SMK,,,,,BALITA,,,',
    ',145,Al Awwabin 2,Dinda Pri Pratiwi ,Bandung ,1996-06-06,30,P,Menikah ,S1,,,,,BALITA,,,',
    ',146,Al Awwabin 2,Alesha Nayla Alfiqhi,Tangerang ,,5,P,Belum ,,,,,,CABERAWIT,,,',
    ',147,Al Awwabin 2,Aisha Shazfa Alfiqhi ,Tangerang ,,,P,Belum ,,,,,,BALITA,,,',
    '1,148,Al Awwabin 2,Salsabila Rahmadhani Sudrajat ,Klaten ,8-Oct-05,21,P,Belum ,SMK,,,,,BALITA,,,',
    '1,149,Kencana 1,Abduloh Syukur,Blitar,1979-08-11,47,L,MENIKAH,,,,,,DEWASA,,MS,',
    ',150,Kencana 1,Bima Ubaidulah,Cilacap,2016-12-03,9,L,BELUM,SD,6,SEKOLAH UMUM,,,CABERAWIT,,,',
    ',151,Kencana 1,Rama Ubaidulah,Bandung,2018-12-13,7,L,BELUM,SD,2,SEKOLAH UMUM,,,CABERAWIT,,,',
    ',152,Kencana 1,Cantika Putri Azzahra,Bandung,2022-02-26,4,P,BELUM,,,,,,BALITA,,,',
    '1,153,Kencana 1,Adhy Widya Setiawan,Kulon Progo,1992-02-01,34,L,MENIKAH,S2,,,,,DEWASA,,,',
    ',154,Kencana 1,Rifki Anugerah,Karanganyar,1995-01-22,31,P,MENIKAH,S1,,,,,DEWASA,,MS,',
    ',155,Kencana 1,Banafsha Nivalis Buitenzorgia,Bandung,2018-08-23,8,P,BELUM,SD,2,SEKOLAH UMUM,,,CABERAWIT,,,',
    ',156,Kencana 1,Cleosa Ereshva Meirinjani,Bandung,2023-05-27,3,P,BELUM,,,,,,BALITA,,,',
    '1,157,Kencana 1,Agustianto,Bandung,1955-12-15,70,L,MENIKAH,,,,,,LANSIA,,,',
    ',158,Kencana 1,Tisngatun Sangati,Purbalingga,1958-10-10,68,P,MENIKAH,,,,,,LANSIA,,,',
    '1,159,Kencana 1,Agustommy,Tegal,1965-05-04,61,L,MENIKAH,,,,,,LANSIA,,,',
    ',160,Kencana 1,Epon Robiah,Tasikmalaya,1966-08-07,60,P,MENIKAH,,,,,,DEWASA,,,',
    ',161,Kencana 1,Nabil DM Dhohir,Bandung,2006-09-13,20,L,BELUM,,,,,,PRA NIKAH,,,',
    '1,162,Kencana 1,Elan Hermawan,Bandung,1986-09-15,40,L,MENIKAH,S1,,,,,DEWASA,,,',
    ',163,Kencana 1,Silfi Puspa Rini,Bandung,1990-12-31,35,P,MENIKAH,,,,,,DEWASA,,MS,',
    ',164,Kencana 1,Balqissa Aretha Zanjabila,Bandung,2014-06-12,12,P,BELUM,SD,6,SEKOLAH UMUM,,,CABERAWIT,,,',
    ',165,Kencana 1,Bellvania Elshanum Hermawan,Bandung,2017-03-09,9,P,BELUM,SD,3,SEKOLAH UMUM,,,CABERAWIT,,,',
    '1,166,Kencana 1,Engkos Koswara,Bandung,1955-03-05,71,L,MENIKAH,,,,,,LANSIA,,,',
    ',167,Kencana 1,Tuti Herawati,Bandung,1959-05-30,67,P,MENIKAH,,,,,,LANSIA,,,',
    '1,168,Kencana 1,Fauzi Salim,Bandung,1989-02-26,37,L,MENIKAH,,,,,,DEWASA,,,',
    ',169,Kencana 1,Vera Rahmawati Dewi,Bandung,1988-11-26,37,P,MENIKAH,,,,,,DEWASA,,,',
    ',170,Kencana 1,Zira Emran Salim,Bandung,2016-01-22,10,L,BELUM,SD,4,SEKOLAH UMUM,,,CABERAWIT,,,',
    ',171,Kencana 1,Faranisa Ramadhani Salim,Bandung,17-Mei-18,8,P,BELUM,SD,3,SEKOLAH UMUM,,,CABERAWIT,,,',
    ',172,Kencana 1,Alesha Hanifah Salim,Bandung,2024-01-23,2,P,BELUM,TK,,SEKOLAH UMUM,,,BALITA,,,',
    ',173,Kencana 1,Aqila Humaira Salim,Bandung,2024-09-27,2,P,BELUM,,,,,,BALITA,,,',
    '1,174,Kencana 1,Ghani Muhammad Fauzi,Bandung,1993-10-06,33,L,MENIKAH,S2,,,,,DEWASA,,,',
    ',175,Kencana 1,Janiska Mediana,Garut,1995-01-29,31,P,MENIKAH,S1,,,,,DEWASA,,,',
    ',176,Kencana 1,M. Atharizz Ghaisan Fauzi,Bandung,2019-03-06,7,L,BELUM,SD,2,SEKOLAH UMUM,,,CABERAWIT,,,',
    ',177,Kencana 1,Muhammad Khalif Alsyazani Fauzi,Bandung,2023-06-02,3,L,BELUM,,,,,,BALITA,,,',
    '1,178,Kencana 1,Mahmudi,Kediri,1965-12-17,60,L,MENIKAH,,,,,,DEWASA,,,',
    ',179,Kencana 1,Tatat R,Bandung,1959-12-14,66,P,MENIKAH,S1,,,,,LANSIA,,,',
    ',180,Kencana 1,Laila R,Bandung,1995-07-06,31,P,BELUM,S1,,,,,USIA NIKAH,,,',
    '1,181,Kencana 1,Achmad Muchsin,Sumedang,1962-08-04,64,L,MENIKAH,,,,,,LANSIA,,,',
    ',182,Kencana 1,Ade Darkiah,Bandung,1968-09-09,58,P,MENIKAH,,,,,,DEWASA,,MS,',
    ',183,Kencana 1,Wildan N,Bandung,1990-08-26,36,L,BELUM,,,,,,USIA NIKAH,,,',
    ',184,Kencana 1,Riska A,Bandung,1995-07-29,31,P,BELUM,S1,,,,,USIA NIKAH,,,',
    '1,185,Kencana 1,Nasrul Malik,Bandung,1986-10-11,40,L,MENIKAH,,,,,,DEWASA,,,',
    ',186,Kencana 1,Umi Nur Azizah Fitria K,Lamongan,1989-07-14,37,P,MENIKAH,,,,,,DEWASA,,MS,',
    ',187,Kencana 1,Isna Nur Hamidah Malik,Bandung,2016-07-30,10,P,BELUM,SD,4,SEKOLAH UMUM,,,CABERAWIT,,,',
    ',188,Kencana 1,Hakim Haidar Malik,Bandung,2020-07-05,6,L,BELUM,SD,1,SEKOLAH UMUM,,,CABERAWIT,,,',
    '1,189,Kencana 1,Ovan Nurrohman,Bandung,1975-08-04,51,L,MENIKAH,,,,,,DEWASA,,,',
    ',190,Kencana 1,Hasni Fatmawati,Bandung,1982-08-24,44,P,MENIKAH,,,,,,DEWASA,,,',
    ',191,Kencana 1,Ayu Nafitsya Divaniani,Bandung,2002-09-13,24,P,BELUM,S1,8,SEKOLAH UMUM,,,USIA NIKAH,,,',
    ',192,Kencana 1,Keyvin Muzdalifah,Bandung,2008-03-13,18,L,BELUM,SMA,3,SEKOLAH UMUM,,,REMAJA / MUDA-MUDI,,,',
    ',193,Kencana 1,Bayhaqi Mustaffa,Bandung,2012-01-11,14,L,BELUM,SMP,2,SEKOLAH UMUM,,,REMAJA / MUDA-MUDI,,,',
    '1,194,Kencana 1,Rahman Tamim,Palembang,1968-05-12,58,L,MENIKAH,,,,,,DEWASA,,MS,',
    ',195,Kencana 1,Ai Setiani,Garut,1969-10-10,57,P,MENIKAH,,,,,,DEWASA,,,',
    '1,196,Kencana 1,H. Robandi Roni M Arifin,Bandung,1955-01-15,71,L,MENIKAH,S3,,,,,LANSIA,,,',
    ',197,Kencana 1,Hj. Ida Farida,Cianjur,1960-02-03,66,P,BELUM,S2,,,,,LANSIA,,,',
    '1,198,Kencana 1,Sutarman,Kebumen,1970-12-07,55,L,MENIKAH,,,,,,DEWASA,,,',
    ',199,Kencana 1,Nailah,Palembang,1976-01-05,50,P,MENIKAH,,,,,,DEWASA,,MS,',
    ',200,Kencana 1,Rifa\'i Nur Aziz,Bandung,1996-09-21,30,L,BELUM,,,,,,USIA NIKAH,,,',
    ',201,Kencana 1,Muhammad Ichwan,Bandung,2001-08-03,25,L,BELUM,,,,,,USIA NIKAH,,,',
    ',202,Kencana 1,Ibnu Maulana Malik,Bandung,2009-03-31,17,L,BELUM,SMA,2,SEKOLAH UMUM,,,REMAJA / MUDA-MUDI,,,',
    '1,203,Kencana 1,Tedi Kusjadi,Tasikmalaya,1956-05-08,70,L,DUDA,,,,,,LANSIA,,,',
    ',204,Kencana 1,Regina Riyadhini,Bandung,1985-11-28,40,P,BELUM,,,,,,USIA NIKAH,,,',
    '1,205,Kencana 1,Renni Adistiarini,Bandung,1981-07-09,45,P,MENIKAH,,,,,,DEWASA,,,',
    '1,206,Kencana 1,Zulkarnain,Padang,1954-08-12,72,L,MENIKAH,,,,,,LANSIA,,,',
    ',207,Kencana 1,Hasniah Harahap,Medan,1964-06-09,62,P,MENIKAH,,,,,,LANSIA,,MS,',
    '1,208,Kencana 1,Engkom Ihi,Sukabumi,1948-08-14,78,P,JANDA,,,,,,LANSIA,,,',
    '1,209,Kencana 1,Septianisa Ramaniar,Bandung,1992-09-22,34,P,MENIKAH,,,,,,DEWASA,,,',
    ',210,Kencana 1,Aprilliya Viana Putri,Bandung,2013-04-28,13,P,BELUM,SMP,7,SMP UBM,,,REMAJA / MUDA-MUDI,,,',
    ',211,Kencana 1,Ananda Dwi Putra,Bandung,2018-11-29,7,L,BELUM,SD,3,SD UBM,,,CABERAWIT,,,',
    '1,212,Kencana 1,Solihah,Bandung,1958-01-01,68,P,JANDA,,,,,,LANSIA,,,',
    '1,213,Kencana 1,Sukinem,Kulon Progo,1966-06-10,60,P,MENIKAH,,,,,,DEWASA,,,',
    '1,214,Kencana 1,Supriati,Sumedang,1965-02-02,61,P,MENIKAH,,,,,,LANSIA,,,',
    '1,215,Kencana 1,Tuti Farida,Medan,1962-11-26,63,P,MENIKAH,,,,,,LANSIA,,,',
    '1,216,Kencana 1,Sdr. Ahmad Fauzan,Bandung,2003-05-05,23,L,BELUM,S1,5,SEKOLAH UMUM,,,USIA NIKAH,,MT,',
    '1,217,Kencana 1,Deddy Yusuf Moehadjir,Jakarta,1958-07-30,68,L,MENIKAH,,,,,,LANSIA,,,',
    ',218,Kencana 1,Fatma Nurhasanah,Lampung,1970-05-25,56,P,MENIKAH,,,,,,DEWASA,,,',
    ',219,Kencana 1,Faaza Aulia,Kuwait,2009-09-13,17,P,BELUM,SMA,2,SEKOLAH UMUM,,,REMAJA / MUDA-MUDI,,,',
    '1,220,Kencana 1,Sdr. Kamia Luthfiyyah Sumantri,Bandung,2010-10-01,16,P,BELUM,SMK,2,SEKOLAH UMUM,,,REMAJA / MUDA-MUDI,,,',
    '1,221,Kencana 1,Fauzia Astuti Handayani,Bandung ,1992-12-06,33,P,MENIKAH,SMK,,,,,DEWASA,,,',
    ',222,Kencana 1,Adrian Muahmmad Dzikra ,Bandung ,2015-08-09,11,L,BELUM,SD,5,SEKOLAH UMUM,,,CABERAWIT,,,',
    ',223,Kencana 1,Devano Syaqil Afandi,Bandung,2023-07-09,3,L,BELUM,,,,,,BALITA,,,',
    '1,224,Kencana 2,Bp Achmad Sumbani ,Cilacap,1967-06-09,59,L,Menikah,D3,,,Kipok,Aghnia,DEWASA,O,,081394306754',
    ',225,Kencana 2,Ibu Tati Setiawati,Bandung,1974-02-18,52,P,Menikah,SLTA,SUDAH LULUS,,,,DEWASA,AB,,081222832271',
    ',226,Kencana 2,Tiara Wulandari,Bandung,1998-08-14,28,P,Belum,S1,,,,,USIA NIKAH,A,,08112349512',
    ',227,Kencana 2,Sofia Damayanti,Bandung,2000-11-18,25,P,Belum,SMA,SUDAH LULUS,,,,USIA NIKAH,A,,0895365267003',
    ',228,Kencana 2,Sdr Latif ,,,,L,Belum,SMA,SUDAH LULUS,,,,REMAJA / MUDA-MUDI,,,',
    ',229,Kencana 2,Sdri Syifa,,,,P,Belum,SMA,12,,,,REMAJA / MUDA-MUDI,,,',
    '1,230,Kencana 2,Bp H Abdullah Fauzi,Sidoarjo,1973-10-09,53,L,Menikah,SLTA,SUDAH LULUS,,Wakides,,DEWASA,O,MS,085322269636',
    ',231,Kencana 2,Ibu Hj Nunung Nurjannah,Jakarta,1980-10-08,46,P,Menikah,SLTP,SUDAH LULUS,,,,DEWASA,AB,MS,0895707249300',
    ',232,Kencana 2,M.Nurhasan Al Mujahidin,Bandung,1999-07-23,27,L,Belum,S1,,,KU Kelpk,,USIA NIKAH,O,MS,08997157883',
    ',233,Kencana 2,Ratih Nuraulia Abdulloh,Bandung,2007-05-20,19,P,Belum,S1,,,,,PRA NIKAH,,,',
    ',234,Kencana 2,Tresna Ayu F,Bandung,2005-08-25,21,P,Belum,SMA,SUDAH LULUS,,,,PRA NIKAH,,,',
    ',235,Kencana 2,Mutiah Rachel K,Bandung,2016-10-09,10,P,Belum,SD,4,,,,CABERAWIT,O,,',
    '1,236,Kencana 2,Bp Teguh,Piji - Kudus,1958-11-16,67,L,Menikah,SMA,SUDAH LULUS,,Agniya,,LANSIA,,,085220064043',
    ',237,Kencana 2,Ibu Istinganah,Solo,1969-11-10,56,P,Menikah,SMP,SUDAH LULUS,,,,DEWASA,,,',
    ',238,Kencana 2,Putra Nuralfi R,Bandung,2009-11-28,16,L,Belum,SMA,11,,,,REMAJA / MUDA-MUDI,,,',
    '1,239,Kencana 2,Bp Dani Priyatna,Bandung,1969-06-03,57,L,Menikah,S1,,,,Aghnia,DEWASA,A,,085316178818',
    ',240,Kencana 2,Ibu Kumala Santi,Bandung,1973-04-11,53,P,Menikah,SMA,SUDAH LULUS,,,,DEWASA,A,,081573736963',
    ',241,Kencana 2,Mutiarsa Silvyana,Bandung,1999-02-08,27,P,Belum,SMA,SUDAH LULUS,,,,USIA NIKAH,A,MS,085320392508',
    ',242,Kencana 2,Muhamad Fathir Shadiq,Bandung,2016-05-24,10,L,Belum,SD,4,,,,CABERAWIT,,,',
    '1,243,Kencana 2,Bp Ainur Rofiq,Malang,1980-01-01,46,L,Menikah,STM,SUDAH LULUS,,"KU Desa, Ketua PAC",Aghnia,DEWASA,,MS,081222270354',
    ',244,Kencana 2,Ibu Sugihartatik,Malang,1979-11-19,46,P,Menikah,D3,,,,,DEWASA,,,085324207242',
    ',245,Kencana 2,Tristan Leandra Ananta,Bandung,2007-10-19,19,L,Belum,SMA,12,,,,PRA NIKAH,,,',
    ',246,Kencana 2,Radja Daniswara Ananta,Bandung,2013-01-31,13,L,Belum,SMP,8,,,,REMAJA / MUDA-MUDI,,,',
    ',247,Kencana 2,Elshavira Queensha Ananta,Bandung,2019-08-03,7,P,Belum,BLM SEKOLAH,,,,,CABERAWIT,,,',
    '1,248,Kencana 2,Ibu Suci Fitriana,Bogor,1989-04-27,37,P,Menikah,SMA,SUDAH LULUS,,,,DEWASA,O,MS,08567161492',
    ',249,Kencana 2,Syakira Kafiya Azzahra,Bandung,2015-05-11,11,P,Belum,SD,6,,,,CABERAWIT,,,',
    ',250,Kencana 2,Falisha Hafizah Azzahra,Bandung,2017-11-04,8,P,Belum,SD,3,,,,CABERAWIT,,,',
    ',251,Kencana 2,Athaya Dzamar Asadillah,Bandung,2021-03-04,5,L,Belum,BLM SEKOLAH,,,,,CABERAWIT,,,',
    '1,252,Kencana 2,Bp Cecep Sanusi,Bandung,1967-01-10,59,L,Menikah,D1,,,Penerobos Klp,,DEWASA,O,,089609883405',
    ',253,Kencana 2,Ibu Rita Beynahati ARS,Bandung,1971-11-12,54,P,Menikah,SMA,SUDAH LULUS,,,,DEWASA,B,,089517795671',
    ',254,Kencana 2,Putri Nur Annisa,Bandung,1992-11-14,33,P,Belum,SMA,SUDAH LULUS,,,,USIA NIKAH,B,,088222984579',
    ',255,Kencana 2,Citra Khoirum Baynannisa ,Bandung,1997-07-28,29,P,Belum,SMA,SUDAH LULUS,,,,USIA NIKAH,B,,081319429128',
    ',256,Kencana 2,Fariel Agustian Firdaus,Bandung,2006-08-02,20,L,Belum,SMK,SUDAH LULUS,,,,PRA NIKAH,,,89512318500',
    '1,257,Kencana 2,Fina Mentari ,,,,P,Belum,S1,,,,,BALITA,,,',
    ',258,Kencana 2,Annisa Adila,Bandung,2001-03-21,25,P,Belum,S1,,,,,USIA NIKAH,O,MS,089509143373',
    '1,259,Kencana 2,Bp Eka Jana Rutjita Amin,Bandung,1961-11-11,64,L,Menikah,S1,,,Tim Aghnia Desa,Aghnia,LANSIA,O,,08112030354',
    ',260,Kencana 2,Ibu Dede Yulianti,Bandung,1969-07-08,57,P,Menikah,SMA,SUDAH LULUS,,,,DEWASA,B,,081572008769',
    ',261,Kencana 2,Annisa Utami Eka,Bandung,1991-04-18,35,P,Belum,D4/S1,,,,,USIA NIKAH,B,,081223831235',
    ',262,Kencana 2,Amira Lavina Salsabila Eka,Bandung,2015-12-28,10,P,Belum,SD,5,,,,CABERAWIT,B,,',
    ',263,Kencana 2,Wina Azka,Bandung,1994-04-24,32,P,Menikah,D3,,,,,DEWASA,,,8562073754',
    ',264,Kencana 2,Arkha Ahmad Arifin,Bandung,2021-12-29,4,L,Belum,BLM SEKOLAH,,,,,BALITA,,,',
    ',265,Kencana 2,Arsy Naura Arifin,Bandung,2023-05-13,3,P,Belum,BLM SEKOLAH,,,,,BALITA,,,',
    '1,266,Kencana 2,Ibu Hj. Eni Rohaeni,Bandung,1962-09-05,64,P,Janda,S1,,,,,LANSIA,AB,,082376946765',
    '1,267,Kencana 2,Bp Mudian Ramdani,Bandung,1985-06-17,41,L,Menikah,SMA,SUDAH LULUS,,,,DEWASA,AB,,089510110473',
    ',268,Kencana 2,Ibu Nur Afni Devi Yanti,Bandung,1991-03-23,35,P,Menikah,SMA,SUDAH LULUS,,,,DEWASA,B,MS,085758526560',
    ',269,Kencana 2,Hasbi Hamizan Ramdani,Bandung,2018-08-27,8,L,Belum,BLM SEKOLAH,,,,,CABERAWIT,,,',
    ',270,Kencana 2,Rafanza Abizar Ramdani,Bandung,2022-10-22,3,L,Belum,BLM SEKOLAH,,,,,BALITA,,,',
    '1,271,Kencana 2,Ibu Sahriani ,Tapanuli Selt,1959-08-20,67,P,Menikah,SMA,SUDAH LULUS,,,,LANSIA,O,,085749840982',
    ',272,Kencana 2,Leni Saripah,Bandung,1989-01-11,37,P,Belum,D3,,,,,USIA NIKAH,O,,082116418561',
    ',273,Kencana 2,Ida Laili Hasanah,Bandung,1995-02-26,31,P,Belum,S1,,,,,USIA NIKAH,O,,085793910656',
    '1,274,Kencana 2,Ibu Andre Ceria,Bandung,1982-04-05,44,P,Menikah,SMA,SUDAH LULUS,,,,DEWASA,B,,085603344732',
    ',275,Kencana 2,Aghna Putria Aripin,Bandung,2014-12-29,11,P,Belum,SD,6,,,,CABERAWIT,,,',
    ',276,Kencana 2,Achyara Firdaus Aripin,Bandung,2019-08-27,7,P,Belum,BLM SEKOLAH,,,,,CABERAWIT,,,',
    '1,277,Kencana 2,Ibu Indrawati,Kebumen,1957-12-08,68,P,Menikah,SMA,SUDAH LULUS,,,,LANSIA,,,081322654817',
    '1,278,Kencana 2,Ibu Nani Rusmini,Ciamis,1948-11-11,77,P,Menikah,SMA,SUDAH LULUS,,,,LANSIA,O,,081322354606',
    '1,279,Kencana 2,Bp H Dodo Djoeherman,Bandung,1950-06-15,76,L,Menikah,SMA,SUDAH LULUS,,"pKoord Lansia Desa, wk kyai klp",Aghnia,LANSIA,O,,08112261951',
    ',280,Kencana 2,Ibu Hj Nan Djumarni,Bandung,1951-04-06,75,P,Menikah,SMA,SUDAH LULUS,,,,LANSIA,B,,08112341951',
    '1,281,Kencana 2,Bp Rasim Achmad Sobari,Cilacap,1965-06-20,61,L,Menikah,SMP,SUDAH LULUS,,Tim PnKb Kelpk,,LANSIA,,,085222394354',
    ',282,Kencana 2,Ibu Syamsiyah,Cilacap,1970-09-01,56,P,Menikah,SMP,SUDAH LULUS,,,,DEWASA,,,082321152354',
    ',283,Kencana 2,Ghifari Juliansyah,Bandung,2000-07-19,26,L,Belum,S1,,,,,USIA NIKAH,B,,085794281068',
    '1,284,Kencana 2,Ibu Lia Devisari,Surabaya,1970-12-28,55,P,Menikah,SMK,SUDAH LULUS,,,,DEWASA,AB,,082333822989',
    ',285,Kencana 2,R.Muh Rivaldi Fadillah,Bandung,1999-02-14,27,L,Belum,D3,,,,,USIA NIKAH,AB,,0895339805283',
    '1,286,Kencana 2,Bp Yoed Agung Kedoya,Bandung,1983-10-19,43,L,Menikah,D3,,,Tim PNKB Desa,,DEWASA,,,082119900801',
    ',287,Kencana 2,Abdurrahman Hasan Yudistira,Bandung,2005-12-03,20,L,Belum,S1,,,Penulis KU desa,,PRA NIKAH,,,85183098610',
    ',288,Kencana 2,Sdr Bima,,,,L,Belum,SMA,SUDAH LULUS,,,,REMAJA / MUDA-MUDI,,,',
    ',289,Kencana 2,Najla Zahira,Bandung,2008-04-23,18,P,Belum,SMA,12,,,,REMAJA / MUDA-MUDI,,,81395000966',
    ',290,Kencana 2,Zahra Nahwah Naazira,Bandung,2012-02-24,14,P,Belum,SMP,7,,,,REMAJA / MUDA-MUDI,,,',
    '1,291,Kencana 2,Ibu Lia Shinta Nuraeni,Bandung,1986-05-27,40,P,Menikah,SMA,SUDAH LULUS,,,,DEWASA,,,',
    ',292,Kencana 2,Alsyifa Vitria Nur\'anjani,Bandung,2010-08-02,16,P,Belum,SMA,10,,,,REMAJA / MUDA-MUDI,,,',
    ',293,Kencana 2,Alpanji Syahrul Abdulatif,Bandung,2008-11-21,17,L,Belum,SMA,12,,,,REMAJA / MUDA-MUDI,,,089526673456',
    ',294,Kencana 2,Alsyila Zahra Kirana,Bandung,2017-05-23,9,P,Belum,BLM SEKOLAH,,,,,CABERAWIT,,,',
    ',295,Kencana 2,Arya Bima Hadinata Prawira,Bandung,2019-12-09,6,L,Belum,BLM SEKOLAH,,,,,CABERAWIT,,,',
    '1,296,Kencana 2,Ibu Sumarmi,Yogyakarta,1968-05-18,58,P,Menikah,SMA,SUDAH LULUS,,,,DEWASA,,,081221450129',
    '1,297,Kencana 2,Vadil Hamdan Mardian,Tasikmalaya,2000-08-13,26,L,Menikah,SMA,SUDAH LULUS,,,,DEWASA,,,81212827403',
    ',298,Kencana 2,Dwi arum Khoirunnisa,Bandung,2001-06-06,25,P,Menikah,SMA,SUDAH LULUS,,,,DEWASA,,,8992799417',
    ',299,Kencana 2,Prabu Firendra Al Fayyadh,Bandung,2022-10-28,3,L,Belum,BLM SEKOLAH,,,,,BALITA,,,',
    ',300,Kencana 2,Adhiya Prameswari Diajeng,Bandung,2023-10-20,3,P,Belum,BLM SEKOLAH,,,,,BALITA,,,',
    '1,301,Kencana 2,Bp Satria,,,,L,Menikah,S1,,,,,BALITA,,,',
    ',302,Kencana 2,Ibu Satria,,,,P,Menikah,S1,,,,,BALITA,,,',
    '1,303,Kencana 2,Bp Otri,,,,L,Menikah,,,,,,BALITA,,,',
    '1,304,Kencana 2,Yusron Abdillah,,,,L,Belum,,,,,,BALITA,,,',
    '1,305,Kencana 2,Tri Haryanto,Pemalang,1980-09-25,46,L,Menikah,SMA,SUDAH LULUS,,,,DEWASA,,,',
    ',306,Kencana 2,Yeni Maryani,Bandung,1981-12-30,44,P,Menikah,SMA,SUDAH LULUS,,,,DEWASA,,,',
    ',307,Kencana 2,Marsha Ayu Choirunnisa,Bandung,2009-03-15,17,P,Belum,SMA,SUDAH LULUS,,,,REMAJA / MUDA-MUDI,,,',
    ',308,Kencana 2,Hijaz Achmad Fathurahman,Bandung,2010-09-22,16,L,Belum,SMA,10,PSDI,,,REMAJA / MUDA-MUDI,,,',
    ',309,Kencana 2,Choirunnisa Fulla Al-Kaytsu,Bandung,2014-04-13,12,P,Belum,SMP,7,MAZAYA,,,REMAJA / MUDA-MUDI,,,',
    ',310,Kencana 2,Mihammad Yusuf Al-Fath,Bandung,2020-01-03,6,L,Belum,SD,1,SEKOLAH UMUM,,,CABERAWIT,,,',
    ',311,Kencana 2,Ananda Alesha Algayatri,Sumedang,2022-11-26,3,P,Belum,,,,,,BALITA,,,'
  ];
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
    var lines = getRaw311CsvLines();
    var kkCounters = { 'Al Awwabin 1': 0, 'Al Awwabin 2': 0, 'Kencana 1': 0, 'Kencana 2': 0 };
    var pfxMap = { 'Al Awwabin 1': 'AA1', 'Al Awwabin 2': 'AA2', 'Kencana 1': 'KC1', 'Kencana 2': 'KC2' };
    var curKK = 'AA1-KK01';
    var list = [];

    for (var i = 0; i < lines.length; i++) {
      var cols = parseCsvLine(lines[i]);
      var isNewKK = cols[0] === '1' || /^KK\s*\d+/i.test(cols[0]);
      var noUrut = parseInt(cols[1], 10) || (i + 1);
      var kelompok = String(cols[2] || 'Al Awwabin 1').trim();
      if (isNewKK) {
        kkCounters[kelompok] = (kkCounters[kelompok] || 0) + 1;
        var pfx = pfxMap[kelompok] || 'KK';
        var kkSeq = String(kkCounters[kelompok]);
        if (kkSeq.length < 2) kkSeq = '0' + kkSeq;
        curKK = pfx + '-KK' + kkSeq;
      }
      var statusKK = isNewKK ? 'Kepala Keluarga' : 'Anggota';
      var nama = String(cols[3] || '').replace(/\s+/g, ' ').trim();
      var tempatLahir = String(cols[4] || '').trim();
      var tglLahir = normalizeDateStr(cols[5] || '');
      var usiaVal = cols[6] ? parseInt(cols[6], 10) : '';
      var jk = String(cols[7] || '').trim().toUpperCase();
      var snRaw = String(cols[8] || '').trim();
      var statusNikah = snRaw ? snRaw.charAt(0).toUpperCase() + snRaw.substring(1).toLowerCase() : 'Belum';
      var pendidikan = String(cols[9] || '').trim();
      if (pendidikan === 's') pendidikan = 'S1';
      if (pendidikan === '-') pendidikan = '';
      var kelas = String(cols[10] || '').trim();
      var lembaga = String(cols[11] || '').trim();
      var dapukan = String(cols[12] || '').trim();
      var kategoriEkonomi = String(cols[13] || '').trim();
      if (dapukan.toLowerCase() === 'agniya') {
        kategoriEkonomi = 'Aghnia';
        dapukan = '';
      }
      if (kategoriEkonomi.toLowerCase() === 'aghnia' || kategoriEkonomi.toLowerCase() === 'agniya') {
        kategoriEkonomi = 'Aghnia';
      } else if (kategoriEkonomi.toLowerCase() === 'dhuafa') {
        kategoriEkonomi = 'Dhuafa';
      }
      var rawKat = String(cols[14] || '').trim();
      var kategoriUsia = computeKategoriUsia(rawKat, usiaVal === '' ? NaN : usiaVal, statusNikah, pendidikan, nama);
      var goldar = String(cols[15] || '').trim().toUpperCase();
      if (goldar === '-') goldar = '';
      var kemubalighan = String(cols[16] || '').trim().toUpperCase();
      var noHp = String(cols[17] || '').trim();
      if (noHp && /^8\d+$/.test(noHp)) noHp = '0' + noHp;

      var padId = String(noUrut);
      while (padId.length < 3) padId = '0' + padId;

      list.push({
        id: 'JMH-202611-' + padId,
        kodeKK: curKK,
        statusKK: statusKK,
        noUrut: noUrut,
        kelompok: kelompok,
        nama: nama,
        tempatLahir: tempatLahir,
        tglLahir: tglLahir,
        usia: usiaVal === '' || isNaN(usiaVal) ? '' : usiaVal,
        jk: jk,
        statusNikah: statusNikah,
        pendidikan: pendidikan,
        kelas: kelas,
        lembaga: lembaga,
        dapukan: dapukan,
        kategoriEkonomi: kategoriEkonomi,
        kategoriUsia: kategoriUsia,
        goldar: goldar,
        kemubalighan: kemubalighan,
        noHp: noHp,
        statusAktif: 'Aktif',
        updatedAt: '2026-11-09 08:00:00'
      });
    }
    return list;
  }

  function buildInitialPengurus(jamaahList) {
    var plan = [
      ['Kides', 1, 'JMH-202611-086', '1. Memimpin pembinaan jamaah se-desa.\n2. Memimpin musyawarah pengurus desa.\n3. Mengawasi jalannya program kerja seluruh kelompok.'],
      ['Wakides', 2, 'JMH-202611-006', '1. Membantu Kides dalam koordinasi lintas kelompok.\n2. Menggantikan pimpinan musyawarah apabila Kides berhalangan.'],
      ['Wakides', 3, 'JMH-202611-230', '1. Membantu Kides dalam pengawasan program pembinaan jamaah.\n2. Koordinasi kegiatan dakwah dan sosial desa.'],
      ['Koord Lansia Desa', 10, 'JMH-202611-279', '1. Mengkoordinir kegiatan pengajian dan pembinaan jamaah lansia.\n2. Memantau kesehatan dan kesejahteraan lansia desa.'],
      ['KU Desa / Ketua PAC', 11, 'JMH-202611-243', '1. Mengelola keuangan dan kas jamaah tingkat desa.\n2. Menjalankan koordinasi kelembagaan PAC.'],
      ['Tim Aghnia Desa', 12, 'JMH-202611-259', '1. Mengkoordinir potensi ekonomi dan kedermawanan jamaah aghnia.\n2. Mendukung pembiayaan program sosial dan dakwah.'],
      ['Tim PNKB Desa', 13, 'JMH-202611-286', '1. Mengurus pembinaan pernikahan dan keluarga bahagia (PNKB).\n2. Pendampingan pra-nikah dan konseling keluarga jamaah.'],
      ['Penulis KU Desa', 14, 'JMH-202611-287', '1. Mencatat pembukuan keluar-masuk kas desa.\n2. Menyusun laporan keuangan berkala bersama KU Desa.'],
      ['PAC Rck Wetan', 15, 'JMH-202611-108', '1. Menghubungkan kegiatan warga jamaah dengan pemerintahan setempat.\n2. Mengurus administrasi kemasyarakatan PAC.'],
      ['Kipok', 20, 'JMH-202611-009', '1. Memimpin pembinaan jamaah di tingkat kelompok.\n2. Memantau kehadiran dan kerukunan warga kelompok.'],
      ['Kipok', 21, 'JMH-202611-090', '1. Memimpin pembinaan jamaah di tingkat kelompok.\n2. Memantau kehadiran dan kerukunan warga kelompok.'],
      ['Kipok', 22, 'JMH-202611-224', '1. Memimpin pembinaan jamaah di tingkat kelompok.\n2. Memantau kehadiran dan kerukunan warga kelompok.'],
      ['Wakipok', 30, 'JMH-202611-012', '1. Membantu Kipok dalam pengorganisasian kegiatan kelompok.\n2. Mendampingi musyawarah kelompok.'],
      ['Wakipok', 31, 'JMH-202611-039', '1. Membantu Kipok dalam pengorganisasian kegiatan kelompok.\n2. Mendampingi musyawarah kelompok.'],
      ['Wakipok', 32, 'JMH-202611-088', '1. Membantu Kipok dalam pengorganisasian kegiatan kelompok.\n2. Mendampingi musyawarah kelompok.'],
      ['KU Kelpk', 40, 'JMH-202611-016', '1. Mengelola kas dan keuangan tingkat kelompok.\n2. Melaporkan rekapitulasi keuangan ke desa.'],
      ['KU Pok', 41, 'JMH-202611-095', '1. Mengelola kas dan keuangan tingkat kelompok.\n2. Melaporkan rekapitulasi keuangan ke desa.'],
      ['KU Kelpk', 42, 'JMH-202611-232', '1. Mengelola kas dan keuangan tingkat kelompok.\n2. Melaporkan rekapitulasi keuangan ke desa.'],
      ['Penulis KU', 43, 'JMH-202611-113', '1. Mencatat administrasi pembukuan keuangan kelompok.'],
      ['Bospok', 50, 'JMH-202611-098', '1. Menggerakkan kegiatan kepemudaan dan remaja kelompok.'],
      ['Bospok', 51, 'JMH-202611-104', '1. Menggerakkan kegiatan kepemudaan dan remaja kelompok.'],
      ['Bospok', 52, 'JMH-202611-119', '1. Menggerakkan kegiatan kepemudaan dan remaja kelompok.'],
      ['MT Kelpk', 60, 'JMH-202611-066', '1. Melaksanakan pengajaran Al-Quran dan Al-Hadits di kelompok.\n2. Membina kurikulum caberawit, remaja, dan jamaah.'],
      ['Penerobos Klp', 61, 'JMH-202611-252', '1. Mengunjungi dan menyemangati jamaah dalam kegiatan pengajian.\n2. Menjaga silaturahmi antar-keluarga jamaah.'],
      ['Tim PnKb Kelpk', 62, 'JMH-202611-281', '1. Membantu pendataan pemuda usia nikah dan pembinaan keluarga di kelompok.'],
      ['Tim', 63, 'JMH-202611-022', '1. Membantu pelaksanaan teknis kegiatan dan kepanitiaan kelompok/desa.']
    ];
    var byId = {};
    for (var i = 0; i < jamaahList.length; i++) {
      byId[jamaahList[i].id] = jamaahList[i];
    }
    var result = [];
    for (var p = 0; p < plan.length; p++) {
      var jm = byId[plan[p][2]];
      var seq = String(result.length + 1).padStart(3, '0');
      result.push({
        id: 'PGR-202611-' + seq,
        jabatan: plan[p][0],
        urutan: plan[p][1],
        idJamaah: plan[p][2],
        nama: jm ? jm.nama : plan[p][0],
        kelompok: jm ? jm.kelompok : 'Al Awwabin 1',
        tupoksi: plan[p][3],
        email: '',
        status: 'Aktif'
      });
    }
    return result;
  }

  function buildDefaultDatabase() {
    var jamaah = buildInitial311Dataset();
    var pengurus = buildInitialPengurus(jamaah);
    return {
      version: 3,
      adminPin: '123456',
      updatedAt: new Date().toISOString(),
      jamaah: jamaah,
      mutasi: [
        {
          idMutasi: 'MTS-202611-001',
          tanggal: '2026-11-01',
          jenis: 'MASUK',
          kategoriMutasi: 'Kelahiran',
          idJamaah: 'JMH-202611-085',
          nama: 'Chayra Fathina Adzkiya',
          kelompok: 'Al Awwabin 1',
          keterangan: 'Kelahiran putri dari keluarga Bp. H. Andi / Al Awwabin 1',
          dicatatOleh: 'Sekretaris Desa'
        },
        {
          idMutasi: 'MTS-202611-002',
          tanggal: '2026-11-04',
          jenis: 'MASUK',
          kategoriMutasi: 'Pindah Datang',
          idJamaah: 'JMH-202611-223',
          nama: 'Bp. M. Yusuf',
          kelompok: 'Kencana 1',
          keterangan: 'Pindah datang masuk ke kelompok Kencana 1',
          dicatatOleh: 'Sekretaris Desa'
        }
      ],
      kegiatan: [
        { id: 'KGT-202611-001', tanggal: '2026-11-08', nama: 'Pengajian Rutin Gabungan Desa', jenis: 'Pengajian Rutin', sasaran: 'Semua', status: 'Buka', dicatatOleh: 'Sekretaris Desa' },
        { id: 'KGT-202611-002', tanggal: '2026-11-01', nama: 'Musyawarah Pengurus Desa dan Kelompok', jenis: 'Musyawarah Desa', sasaran: 'Semua', status: 'Tutup', dicatatOleh: 'Sekretaris Desa' }
      ],
      absensi: [
        { id: 'ABS-202611-001', idKegiatan: 'KGT-202611-001', idJamaah: 'JMH-202611-001', status: 'Hadir', catatan: '', dicatatOleh: 'Sekretaris Desa', waktu: '2026-11-08 19:30:00' },
        { id: 'ABS-202611-002', idKegiatan: 'KGT-202611-001', idJamaah: 'JMH-202611-006', status: 'Hadir', catatan: '', dicatatOleh: 'Sekretaris Desa', waktu: '2026-11-08 19:31:00' },
        { id: 'ABS-202611-003', idKegiatan: 'KGT-202611-001', idJamaah: 'JMH-202611-086', status: 'Hadir', catatan: '', dicatatOleh: 'Sekretaris Desa', waktu: '2026-11-08 19:32:00' }
      ],
      pengurus: pengurus,
      laporan: [
        {
          id: 'LAP-202611-001',
          tanggal: '2026-11-08',
          idPengurus: 'PGR-202611-001',
          nama: pengurus[0] ? pengurus[0].nama : 'Bp. H. Wahyu',
          jabatan: 'Kides',
          periode: 'November 2026',
          judul: 'Evaluasi Pembinaan dan Sensus 311 Jamaah Se-Desa',
          isi: 'Alhamdulillah pendataan 311 jiwa jamaah (95 KK) dari kelompok Al Awwabin 1, Al Awwabin 2, Kencana 1, dan Kencana 2 telah terintegrasi di aplikasi SIDA-JAMAAH.',
          status: 'Ditinjau',
          catatanAdmin: 'Laporan diterima dan diarsipkan oleh Sekretariat Desa.',
          dibuatOleh: 'Pengurus Desa',
          updatedAt: '2026-11-08 20:30:00'
        }
      ],
      settings: {
        NAMA_DESA: 'Desa Al Awwabin - Kencana',
        SUBJUDUL_KOP: 'Sekretariat Pengurus Jamaah Desa — Sistem Informasi Database Terpadu',
        ALAMAT_SEKRETARIAT: 'Bandung, Jawa Barat',
        KOTA_TTD: 'Bandung',
        NAMA_KIDES: 'Bp. H. Wahyu',
        NAMA_SEKRETARIS: 'Sekretaris Desa'
      },
      users: [
        { email: 'sekretaris@desa.lokal', nama: 'Sekretaris Desa (Admin)', peran: 'admin', idJamaah: 'JMH-202611-001', status: 'Aktif', dibuat: '2026-11-01', loginTerakhir: '2026-11-09' },
        { email: 'pengurus@desa.lokal', nama: 'Pengurus Desa / Kelompok', peran: 'pengurus', idJamaah: 'JMH-202611-086', status: 'Aktif', dibuat: '2026-11-01', loginTerakhir: '-' },
        { email: 'jamaah@desa.lokal', nama: 'Jamaah / Warga Desa', peran: 'anggota', idJamaah: 'JMH-202611-001', status: 'Aktif', dibuat: '2026-11-01', loginTerakhir: '-' }
      ],
      audit: [
        {
          id: 'LOG-INIT-001',
          waktu: '2026-11-09 08:00:00',
          email: 'sistem@lokal',
          nama: 'Sistem SIDA-JAMAAH',
          peran: 'admin',
          aksi: 'INIT_DB',
          modul: 'DatabaseLokal',
          detail: 'Inisialisasi 311 data jamaah (95 KK) dan 26 pengurus di memori perangkat.'
        }
      ]
    };
  }

  /* ==========================================================================
     INDEXEDDB + LOCALSTORAGE ENGINE
     ========================================================================== */
  function openIdb(cb) {
    if (!window.indexedDB) {
      cb(null);
      return;
    }
    try {
      var req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = function(e) {
        cb(e.target.result);
      };
      req.onerror = function() {
        cb(null);
      };
    } catch (err) {
      cb(null);
    }
  }

  function loadDatabase(callback) {
    openIdb(function(db) {
      if (db) {
        try {
          var tx = db.transaction([IDB_STORE], 'readonly');
          var store = tx.objectStore(IDB_STORE);
          var getReq = store.get(IDB_KEY);
          getReq.onsuccess = function() {
            var data = getReq.result;
            if (data && Array.isArray(data.jamaah) && data.jamaah.length > 0) {
              callback(data);
            } else {
              loadFromLocalStorageOrSeed(db, callback);
            }
          };
          getReq.onerror = function() {
            loadFromLocalStorageOrSeed(db, callback);
          };
          return;
        } catch (e) {}
      }
      loadFromLocalStorageOrSeed(null, callback);
    });
  }

  function loadFromLocalStorageOrSeed(db, callback) {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.jamaah) && parsed.jamaah.length > 0) {
          saveDatabase(parsed);
          callback(parsed);
          return;
        }
      }
    } catch (e) {}
    var initial = buildDefaultDatabase();
    saveDatabase(initial, function() {
      callback(initial);
    });
  }

  function saveDatabase(stateObj, callback) {
    var snapshot = {
      version: 3,
      adminPin: stateObj.adminPin || '123456',
      updatedAt: new Date().toISOString(),
      jamaah: stateObj.jamaah || [],
      mutasi: stateObj.mutasi || [],
      kegiatan: stateObj.kegiatan || [],
      absensi: stateObj.absensi || [],
      pengurus: stateObj.pengurus || [],
      laporan: stateObj.laporan || [],
      settings: stateObj.settings || {},
      users: stateObj.users || [],
      audit: (stateObj.audit || []).slice(0, 500)
    };

    try {
      localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
    } catch (e) {}

    openIdb(function(db) {
      if (!db) {
        if (callback) callback(true);
        return;
      }
      try {
        var tx = db.transaction([IDB_STORE], 'readwrite');
        var store = tx.objectStore(IDB_STORE);
        store.put(snapshot, IDB_KEY);
        tx.oncomplete = function() {
          if (callback) callback(true);
        };
        tx.onerror = function() {
          if (callback) callback(false);
        };
      } catch (err) {
        if (callback) callback(false);
      }
    });
  }

  function createBackupPayload(stateObj) {
    var now = new Date();
    var pad = function(n) { return String(n).padStart(2, '0'); };
    var stamp = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '_' + pad(now.getHours()) + pad(now.getMinutes());
    var fileName = 'SIDA_JAMAAH_BACKUP_' + stamp + '.json';
    var payload = {
      app: 'SIDA-JAMAAH',
      schemaVersion: '3.0',
      exportedAt: now.toISOString(),
      exportedBy: (stateObj.user && stateObj.user.name) || 'Sekretaris Desa',
      desa: (stateObj.settings && stateObj.settings.NAMA_DESA) || 'Desa Al Awwabin - Kencana',
      summary: {
        totalJamaah: (stateObj.jamaah || []).length,
        totalMutasi: (stateObj.mutasi || []).length,
        totalKegiatan: (stateObj.kegiatan || []).length,
        totalAbsensi: (stateObj.absensi || []).length,
        totalPengurus: (stateObj.pengurus || []).length,
        totalLaporan: (stateObj.laporan || []).length
      },
      data: {
        adminPin: stateObj.adminPin || '123456',
        jamaah: stateObj.jamaah || [],
        mutasi: stateObj.mutasi || [],
        kegiatan: stateObj.kegiatan || [],
        absensi: stateObj.absensi || [],
        pengurus: stateObj.pengurus || [],
        laporan: stateObj.laporan || [],
        settings: stateObj.settings || {},
        users: stateObj.users || [],
        audit: (stateObj.audit || []).slice(0, 200)
      }
    };
    return {
      fileName: fileName,
      jsonString: JSON.stringify(payload, null, 2),
      payload: payload
    };
  }

  function downloadBackupFile(stateObj) {
    var bk = createBackupPayload(stateObj);
    var blob = new Blob([bk.jsonString], { type: 'application/json;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = bk.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
    return bk;
  }

  function shareBackupWhatsApp(stateObj, onDone) {
    var bk = createBackupPayload(stateObj);
    var shareText = '*CADANGAN DATABASE SIDA-JAMAAH*\n' +
      'Desa: ' + bk.payload.desa + '\n' +
      'Tanggal Backup: ' + new Date().toLocaleString('id-ID') + '\n' +
      'Total Data: ' + bk.payload.summary.totalJamaah + ' Jamaah, ' + bk.payload.summary.totalPengurus + ' Pengurus.\n\n' +
      '_Cara Buka di HP Lain: Buka aplikasi SIDA-JAMAAH -> Menu Cadangan & Keamanan -> Klik Pulihkan Database (Restore) dan pilih file ini._';

    try {
      var file = new File([bk.jsonString], bk.fileName, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          title: 'Backup Database SIDA-JAMAAH',
          text: shareText,
          files: [file]
        }).then(function() {
          if (onDone) onDone({ shared: true, fileName: bk.fileName });
        }).catch(function(err) {
          if (err && err.name !== 'AbortError') {
            downloadBackupFile(stateObj);
            if (onDone) onDone({ shared: false, downloaded: true, fileName: bk.fileName });
          }
        });
        return;
      }
    } catch (e) {}

    downloadBackupFile(stateObj);
    var waUrl = 'https://wa.me/?text=' + encodeURIComponent(shareText + '\n\n(Silakan lampirkan file ' + bk.fileName + ' yang baru saja terunduh)');
    window.open(waUrl, '_blank', 'noopener');
    if (onDone) onDone({ shared: false, downloaded: true, fileName: bk.fileName });
  }

  function mergeArrayById(existingArr, incomingArr, idKey) {
    var map = {};
    var order = [];
    var ex = existingArr || [];
    var inc = incomingArr || [];
    for (var i = 0; i < ex.length; i++) {
      var k1 = ex[i][idKey];
      if (k1) {
        map[k1] = ex[i];
        order.push(k1);
      }
    }
    for (var j = 0; j < inc.length; j++) {
      var k2 = inc[j][idKey];
      if (k2) {
        if (!map[k2]) order.push(k2);
        map[k2] = inc[j];
      }
    }
    return order.map(function(k) { return map[k]; });
  }

  function restoreFromBackupJson(jsonString, mode, currentState, callback) {
    try {
      var parsed = JSON.parse(jsonString);
      var src = (parsed && parsed.data && Array.isArray(parsed.data.jamaah)) ? parsed.data : parsed;
      if (!src || !Array.isArray(src.jamaah)) {
        callback({ success: false, message: 'Format file cadangan (.json) tidak valid atau bukan file backup SIDA-JAMAAH.' });
        return;
      }

      var nextState;
      if (mode === 'merge' && currentState) {
        nextState = {
          version: 3,
          adminPin: src.adminPin || currentState.adminPin || '123456',
          jamaah: mergeArrayById(currentState.jamaah, src.jamaah, 'id'),
          mutasi: mergeArrayById(currentState.mutasi, src.mutasi, 'idMutasi'),
          kegiatan: mergeArrayById(currentState.kegiatan, src.kegiatan, 'id'),
          absensi: mergeArrayById(currentState.absensi, src.absensi, 'id'),
          pengurus: mergeArrayById(currentState.pengurus, src.pengurus, 'id'),
          laporan: mergeArrayById(currentState.laporan, src.laporan, 'id'),
          settings: Object.assign({}, currentState.settings || {}, src.settings || {}),
          users: src.users || currentState.users || [],
          audit: currentState.audit || []
        };
      } else {
        nextState = {
          version: 3,
          adminPin: src.adminPin || (currentState && currentState.adminPin) || '123456',
          jamaah: src.jamaah || [],
          mutasi: src.mutasi || [],
          kegiatan: src.kegiatan || [],
          absensi: src.absensi || [],
          pengurus: src.pengurus || [],
          laporan: src.laporan || [],
          settings: src.settings || (currentState && currentState.settings) || {},
          users: src.users || (currentState && currentState.users) || [],
          audit: src.audit || []
        };
      }

      saveDatabase(nextState, function() {
        callback({
          success: true,
          state: nextState,
          message: 'Database berhasil dipulihkan (' + nextState.jamaah.length + ' data jamaah aktif).'
        });
      });
    } catch (err) {
      callback({
        success: false,
        message: 'Gagal membaca file cadangan: ' + (err && err.message ? err.message : 'File rusak')
      });
    }
  }

  function resetToDefault311(callback) {
    var fresh = buildDefaultDatabase();
    saveDatabase(fresh, function() {
      if (callback) callback(fresh);
    });
  }

  window.SidaDB = {
    loadDatabase: loadDatabase,
    saveDatabase: saveDatabase,
    buildDefaultDatabase: buildDefaultDatabase,
    buildInitial311Dataset: buildInitial311Dataset,
    downloadBackupFile: downloadBackupFile,
    shareBackupWhatsApp: shareBackupWhatsApp,
    restoreFromBackupJson: restoreFromBackupJson,
    resetToDefault311: resetToDefault311,
    parseCsvLine: parseCsvLine,
    normalizeDateStr: normalizeDateStr,
    computeKategoriUsia: computeKategoriUsia
  };

})(window);
