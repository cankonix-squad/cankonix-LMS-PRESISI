# Demo Script per Role — LMS PRESISI LEMDIKLAT POLRI

Dokumen ini adalah panduan presentasi prototype. Semua perubahan disimpan di browser (`localStorage`) dan bukan data produksi.

## Persiapan

1. Jalankan folder prototype melalui local server dan buka `http://localhost:8080/login.html`.
2. Gunakan pengguna `demo.presisi` dan password `prototype`.
3. Pilih role yang akan didemokan, login, lalu pilih workspace pada Dynamic Launcher.
4. Gunakan workspace **SPN-JBR** untuk alur lintas-role agar perubahan data terlihat konsisten.
5. Untuk kembali ke kondisi awal, buka **Launcher → Reset Data Demo**. Reset hanya menghapus data transaksi prototype; role dan sesi login dipertahankan.

## Golden path lintas-role

Urutan utama yang direkomendasikan untuk presentasi end-to-end:

1. **Admin Pusat:** buat dan aktifkan LMS Satdik.
2. **Admin Satdik/Pengelola Akademik:** siapkan program, kurikulum, kelas, jadwal, Gadik, dan peserta.
3. **Gadik:** susun course, materi, tugas, kuis, forum, dan virtual class.
4. **Peserta Didik:** belajar, mengirim tugas, mengerjakan kuis, hadir, dan melihat progress.
5. **Asesor LSP:** lakukan asesmen, tetapkan keputusan, dan terbitkan sertifikat/passport.
6. **Auditor Mutu:** tinjau standar, evidence, gap, audit, CAPA, dan akreditasi.
7. **Admin TI:** pantau connector, mapping, sync, retry, kualitas data, dan lineage.

## 1. Pimpinan Lemdiklat

**Tujuan:** menunjukkan kendali nasional dan perbandingan kinerja Satdik.

1. Login sebagai **Pimpinan Lemdiklat** dan buka workspace **PUSAT**.
2. Buka **Dashboard Nasional**; jelaskan KPI, peta/sebaran, dan ringkasan lembaga.
3. Buka **Lembaga Pendidikan** dan masuk ke detail salah satu Satdik.
4. Buka **Command Center** untuk monitoring lintas lembaga.
5. Tunjukkan **LSP & Kompetensi**, **Master Library**, dan **Logistic & Asset** sebagai layanan bersama.

**Hasil yang ditunjukkan:** pimpinan memperoleh ringkasan nasional dan dapat drill-down ke Satdik serta layanan lintas unit.

## 2. Admin Pusat

**Tujuan:** menunjukkan bagaimana LMS masing-masing Satdik dibuat dari platform induk.

1. Login sebagai **Admin Pusat**, lalu buka **Buat LMS Satdik**.
2. Isi profil Satdik, branding, modul, struktur organisasi, admin/pimpinan, dan sumber data.
3. Simpan sebagai draft, tinjau halaman review, lalu aktifkan workspace.
4. Buka **Registry Satdik**; cari workspace baru dan periksa status/onboarding.
5. Buka **Integration Hub** untuk menunjukkan sumber data yang kelak terhubung.

**Hasil yang ditunjukkan:** satu platform induk membuat workspace Satdik yang terisolasi datanya, memiliki modul, pengelola, dan status aktivasi sendiri.

## 3. Pimpinan Satdik

**Tujuan:** menunjukkan monitoring operasional satu Satdik.

1. Login sebagai **Pimpinan Satdik** dan pilih **SPN-JBR**.
2. Buka **Dashboard Satdik**; tinjau profil, KPI, program aktif, dan ringkasan organisasi.
3. Buka **Monitoring Learning**, **Kehadiran**, lalu **Pengasuhan**.
4. Buka **Mutu Pendidikan** untuk melihat skor 8 standar dan area gap.
5. Tunjukkan **CCTV** dan **Aset** sebagai monitoring pendukung operasional.

**Hasil yang ditunjukkan:** pimpinan melihat kondisi akademik, peserta, mutu, keamanan, dan aset dalam konteks Satdik aktif.

## 4. Admin Satdik

**Tujuan:** menunjukkan pengelolaan operasional pendidikan lengkap.

1. Login sebagai **Admin Satdik**, pilih **SPN-JBR**, dan buka **Program Pendidikan**.
2. Buat/ubah program, kemudian susun **Kurikulum** dan status persetujuannya.
3. Buat **Kelas**, pilih ruang dan kapasitas, lalu tentukan Gadik.
4. Tambahkan **Jadwal** dan tunjukkan pemeriksaan bentrok ruang/Gadik.
5. Kelola **Peserta Didik**, enrollment, dan perpindahan kelas.
6. Tinjau **Learning**, **Monitoring Progress**, **Assessment**, **Kehadiran**, dan **Aset**.

**Hasil yang ditunjukkan:** data pendidikan terhubung dari program hingga peserta dan tersimpan khusus untuk workspace Satdik.

## 5. Pengelola Akademik

**Tujuan:** menunjukkan fokus akademik tanpa kewenangan administrasi pusat.

1. Login sebagai **Pengelola Akademik** pada **SPN-JBR**.
2. Buka **Program Pendidikan** dan **Kurikulum**; periksa mata pelajaran, JP, outcome, dan approval.
3. Buka **Kelas** dan **Jadwal**; periksa alokasi Gadik/ruang.
4. Buka **Assessment** dan **Monitoring Progress** untuk memantau hasil belajar.
5. Buka **Announcement** dan **Kehadiran** untuk tindak lanjut akademik.

**Hasil yang ditunjukkan:** pengelola mengendalikan struktur dan pelaksanaan akademik dari kurikulum sampai evaluasi.

## 6. Gadik / Instruktur

**Tujuan:** menunjukkan proses authoring dan pelaksanaan pembelajaran.

1. Login sebagai **Gadik / Instruktur** pada **SPN-JBR**.
2. Buka **Courses**, pilih course, lalu kelola modul dan aturan prerequisite.
3. Tambah/ubah **Materi**, **Assignment**, dan **Quiz/Ujian**.
4. Buka **Discussion**; buat thread, balas, pin, atau moderasi.
5. Buka **My Teaching**/virtual class dan publikasikan resource atau rekaman simulasi.
6. Catat **Attendance**, nilai di **Assessment & Nilai**, lalu cek **Monitoring Progress**.

**Hasil yang ditunjukkan:** satu alur Gadik mencakup persiapan, interaksi, asesmen, kehadiran, dan monitoring peserta.

## 7. Pengasuh

**Tujuan:** menunjukkan pembinaan peserta dengan pembatasan informasi sensitif.

1. Login sebagai **Pengasuh** pada **SPN-JBR**.
2. Buka **Dashboard Pengasuhan** dan tinjau peserta berisiko.
3. Pilih **Peserta Binaan**; periksa indikator kehadiran, pelanggaran, prestasi, dan konseling.
4. Tambahkan **Catatan Pengasuhan** dengan klasifikasi terbatas.
5. Buat **Disiplin & Tindak Lanjut** dan perbarui status penyelesaian.

**Hasil yang ditunjukkan:** pengasuh memiliki tampilan terfokus dan catatan terbatas sesuai role/data scope.

## 8. Peserta Didik

**Tujuan:** menunjukkan pengalaman belajar harian peserta.

1. Login sebagai **Peserta Didik** pada **SPN-JBR**.
2. Buka **My Courses**, masuk ke course, lalu selesaikan **Materi Pembelajaran**.
3. Kirim **Assignment** dan kerjakan **Quiz/Ujian** sampai hasil tampil.
4. Balas **Discussion Forum** dan bergabung ke **Virtual Class**.
5. Periksa **Attendance**, **Announcement**, dan **Learning Progress**.
6. Buka **Digital Passport** untuk melihat riwayat pendidikan dan kompetensi.

**Hasil yang ditunjukkan:** aktivitas peserta memperbarui progress, nilai, serta kehadiran dalam workspace yang sama.

## 9. Asesor LSP

**Tujuan:** menunjukkan siklus sertifikasi kompetensi.

1. Login sebagai **Asesor LSP** dan pilih workspace Satdik aktif.
2. Buka **Skema Sertifikasi** dan periksa unit kompetensinya.
3. Buka **Asesi & Asesor/Jadwal Asesmen** dan pilih sesi asesmen.
4. Isi hasil per unit, evidence, checklist, review, dan keputusan kompetensi.
5. Buka **Sertifikasi** untuk menerbitkan serta memverifikasi sertifikat.
6. Buka **Digital Passport** untuk memastikan kompetensi tercatat.

**Hasil yang ditunjukkan:** asesmen menghasilkan keputusan, sertifikat, masa berlaku, dan rekam kompetensi digital.

## 10. Auditor Mutu

**Tujuan:** menunjukkan penjaminan mutu dan akreditasi end-to-end.

1. Login sebagai **Auditor Mutu** dan pilih **SPN-JBR**.
2. Buka **Dashboard Mutu** dan tinjau heatmap 8 standar.
3. Buka **8 Standar Pendidikan**; periksa indikator, bobot, evidence, reviewer, dan validity.
4. Buka **Audit & Temuan**; ikuti assignment, sampling, temuan, respons, verifikasi, dan closure.
5. Periksa gap/CAPA dan status tindak lanjut.
6. Buka **Akreditasi** untuk self-assessment, review, visitasi, hasil, dan validity.

**Hasil yang ditunjukkan:** evidence dapat ditelusuri ke skor, temuan, tindakan korektif, dan hasil akreditasi.

## 11. Admin TI

**Tujuan:** menunjukkan operasi integrasi dan kualitas data.

1. Login sebagai **Admin TI** dan buka **Integration Hub**.
2. Tinjau status connector, waktu sync, record, error, dan latency.
3. Buka **Source System**; konfigurasi connector, schedule, authentication, pause/resume, dan run-now.
4. Buka **Data Mapping**; periksa field source-to-canonical, transform, required field, sample, dan versi mapping.
5. Kembali ke dashboard untuk melihat sync log, rejected record, dan menjalankan retry.
6. Buka **Data Quality**; periksa completeness, duplication, freshness, validity, lineage, dan manual merge.

**Hasil yang ditunjukkan:** Admin TI dapat memantau jalur data dari sumber, mapping, proses sync, error/retry, kualitas, hingga record lineage.

## Definisi selesai untuk sesi demo

Sesi prototype dianggap berhasil apabila presenter dapat memperlihatkan:

- login dan launcher berbasis role;
- pemisahan state antar-workspace Satdik;
- satu alur provisioning Satdik;
- satu siklus pembelajaran Gadik–Peserta;
- satu siklus sertifikasi LSP;
- satu siklus mutu/audit;
- satu alur Integration Hub sampai lineage; dan
- reset data kembali ke kondisi awal tanpa menghapus sesi login.

