# LMS PRESISI LEMDIKLAT POLRI — Prototype

Starter package untuk prototype HTML/CSS/JavaScript berdasarkan:
- Master Blueprint v1
- PRD Prototype v1
- UI/UX Page Specification v1

## Jalankan
Buka `login.html`. Setelah login, pengguna diarahkan ke Dynamic Launcher untuk memilih workspace yang sesuai dengan role-nya. Untuk pengalaman terbaik, gunakan local server sederhana:

```bash
python3 -m http.server 8080
```

Jalankan pemeriksaan otomatis dari terminal lain:

```bash
node scripts/prototype-smoke.mjs http://127.0.0.1:8080
node scripts/attendance-smoke.mjs
node scripts/responsive-audit.mjs
node scripts/indonesian-ui-audit.mjs
node scripts/cross-role-journey.mjs
node scripts/care-journey.mjs
node scripts/lsp-journey.mjs
node scripts/quality-journey.mjs
node scripts/integration-journey.mjs
node scripts/provisioning-journey.mjs
node scripts/access-journey.mjs
node scripts/ui-contract-audit.mjs
node scripts/platform-governance-journey.mjs
node scripts/platform-product-journey.mjs
node scripts/shared-operations-journey.mjs
```

Lalu buka `http://localhost:8080`.

### Akses demo

- Pengguna: `demo.presisi`
- Password: `prototype`
- Role: pilih salah satu dari 11 role simulasi pada halaman login
- Workspace lintas-role yang direkomendasikan: `SPN-JBR`
- Fokus Satdik prototype saat ini: **SPN Polda Jawa Barat**; workspace Satdik lain disembunyikan dari launcher dan scope role.
- Panduan presentasi lengkap: [DEMO_SCRIPT_PER_ROLE.md](DEMO_SCRIPT_PER_ROLE.md)
- Pemetaan kebutuhan ke halaman: [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md)
- Hasil smoke test prototype: [QA_SMOKE_TEST_REPORT.md](QA_SMOKE_TEST_REPORT.md)
- Regression lintas-role: `node scripts/cross-role-journey.mjs`
- Regression Pengasuhan: `node scripts/care-journey.mjs`
- Regression LSP/Sertifikasi: `node scripts/lsp-journey.mjs`
- Regression Mutu/Akreditasi: `node scripts/quality-journey.mjs`
- Regression Integrasi Data: `node scripts/integration-journey.mjs`
- Regression Provisioning Satdik: `node scripts/provisioning-journey.mjs`
- Regression Akses & Launcher: `node scripts/access-journey.mjs`
- Audit kontrak UI & aksesibilitas: `node scripts/ui-contract-audit.mjs`
- Regression Governance & Operations: `node scripts/platform-governance-journey.mjs`
- Regression Reporting, Organisasi & Personel: `node scripts/platform-product-journey.mjs`
- Regression Library, Collaboration, CCTV & Aset: `node scripts/shared-operations-journey.mjs`
- Audit responsive statis: `node scripts/responsive-audit.mjs`

Data transaksi tersimpan di browser. Gunakan **Reset Data Demo** pada Dynamic Launcher untuk mengembalikan seluruh data prototype ke kondisi awal tanpa menghapus role dan sesi login.

## Teknologi
- HTML5
- CSS3
- Vanilla JavaScript
- Leaflet via CDN
- Chart.js via CDN
- Dummy JSON/static data

## Page inventory

Prototype berisi **58 halaman HTML valid**: 3 entry page dan 55 halaman modul.

- Entry: login, Dynamic Launcher, dan Dashboard Nasional.
- Platform/pusat: Admin Pusat, registry/detail/pengelolaan Satdik, provisioning LMS Satdik, dan Command Center.
- Pendidikan: program, kurikulum, kelas, jadwal, Gadik, peserta, enrollment, dan assessment.
- Learning: course, materi, assignment, quiz, diskusi, virtual class, attendance, announcement, gradebook/progress, dan pengasuhan.
- Shared services: LSP/sertifikasi, Digital Passport, Master Library, Collaboration, CCTV, aset/logistik, dan mutu/akreditasi.
- Data/integrasi: Integration Dashboard, Connector Catalog, Data Mapping, Data Quality, sync/retry, dan record lineage.
- Governance dan operasi: Master Data, Hak Akses, Struktur Organisasi, Personel, Reporting, Audit Log, Dashboard Operasional, serta System Health & Recovery.

## Catatan Logo
Folder `assets/logos/` disiapkan untuk logo resmi Lemdiklat Polri.
Gunakan file resmi dengan nama:
`logo-lemdiklat-polri.png`

Prototype tetap berjalan apabila logo belum dipasang karena terdapat fallback initial mark.

## Role Demo

Di halaman login tersedia 11 role simulasi:

- Pimpinan Lemdiklat
- Admin Pusat
- Pimpinan Satdik
- Admin Satdik
- Pengelola Akademik
- Gadik / Instruktur
- Pengasuh
- Peserta Didik
- Asesor LSP
- Auditor / Pengawas Mutu
- Admin TI

## Demo Provisioning LMS Satdik

Pilih role **Admin Pusat**, lalu ikuti alur:

1. Login dan pilih workspace pada Dynamic Launcher.
2. Buka **Buat LMS Satdik**.
3. Lengkapi profil, branding, modul, struktur, pimpinan/admin, serta sumber data.
4. Simpan sebagai Draft atau aktifkan workspace.
5. Kelola status dan checklist onboarding melalui **Registry Satdik**.

## Demo Operasi Pendidikan

Pilih role **Admin Satdik** atau **Pengelola Akademik**, lalu ikuti alur:

1. Buat program, ajukan review sebagai Maker, lalu setujui dan aktifkan sebagai Checker.
2. Susun mata pelajaran, Jam Pelajaran, outcome, dan persetujuan kurikulum.
3. Buat kelas, tentukan ruang, kapasitas, dan Gadik utama.
4. Tambahkan jadwal; prototype akan memeriksa bentrok Gadik atau ruang.
5. Tugaskan Gadik; indikator beban memberi warning saat mendekati atau melewati maksimum.
6. Tambahkan peserta manual atau bulk berdasarkan cohort; peserta di atas kapasitas masuk waiting list.
7. Pindahkan peserta antar kelas, promosikan antrean ketika kursi tersedia, atau tandai peserta keluar.

Seluruh perubahan operasional pada tahap prototype disimpan di `localStorage` dengan key per workspace Satdik. Belum ada autentikasi, database, integrasi, atau kontrol keamanan produksi.

## Demo Digital Learning

- Detail course memiliki tab overview, silabus, peserta, gradebook, dan activity feed.
- Gadik dapat menambah serta mengubah urutan modul, kemudian publish/unpublish course.
- Materi mendukung prerequisite, preview, download file dummy, dan completion peserta.
- Quiz mendukung batas attempt, countdown timer, remedial, hasil, dan aturan review jawaban.
6. Periksa ringkasan program untuk melihat hubungan kurikulum, kelas, Gadik, dan peserta.

Data demo pendidikan disimpan secara lokal per workspace sehingga satdik memiliki data operasional terpisah.

## Demo Siklus Pembelajaran

Gunakan role **Gadik / Instruktur** untuk membuat course, modul, materi, assignment, quiz, thread diskusi, dan jadwal virtual class. Setelah itu masuk kembali sebagai **Peserta Didik** pada workspace yang sama untuk:

1. Membuka dan menyelesaikan materi.
2. Mengirim atau memperbarui submission tugas.
3. Mengerjakan quiz dan mendapatkan hasil.
4. Membalas diskusi.
5. Bergabung ke virtual class dan mencatat kehadiran simulasi.
6. Melihat gradebook serta progress yang diperbarui dari seluruh aktivitas.

Fitur lanjutan yang sudah dapat didemokan:

- Dashboard Nasional dengan filter wilayah/Satdik, peta fallback tanpa CDN, alert center, saved filter, export, dan drill-down.
- Dashboard Satdik dengan KPI personel, peserta, Gadik, kelas, kehadiran, CCTV, aset, mutu, serta executive insight.
- Struktur organisasi dengan validasi induk/duplikasi, registry dan profil personel, assignment, serta pembatasan mutasi berdasarkan role.
- Report Center dengan filter aksesibel, viewer, export/print simulasi, dan jadwal laporan yang tersimpan per workspace.
- Command Center dengan mode layar besar, filter bertingkat, performance table, alert lintas domain, dan executive summary.
- Dashboard Gadik dengan jadwal, quick actions, submission terbaru, dan intervensi peserta.
- Kurikulum dengan prerequisite, Silabus/Hanjar, version, attachment, dan workflow draft–review–berlaku.
- Jadwal dalam calendar/list view, pemeriksaan bentrok, reschedule, serta approval perubahan.
- Kalender Akademik untuk agenda program, pembelajaran, ujian, libur, audiens, dan approval.
- Materi dengan prerequisite berantai dan completion rule.
- Assignment dengan rubric, bobot, late state, review, feedback, dan nilai.
- Quiz dari bank soal dengan nilai lulus, batas percobaan, dan remedial.
- Monitoring progress cohort serta penanda peserta yang perlu intervensi.
- Attendance per sesi, catatan status, permintaan koreksi, dan approval.
- Announcement, status belum dibaca, mark-all-read, dan preferensi notifikasi.
- Rekap attendance per kelas/periode dengan evidence sumber pencatatan.
- Kehadiran Gadik per sesi, rekap program, dan tren periode adaptif.
- Navigasi sidebar mobile yang dapat dibuka melalui topbar, ditutup dengan Escape, dan mendukung focus state serta reduced motion.
- Forum berkategori dengan unread state, pin, dan moderasi konten.
- Virtual class dengan publikasi rekaman dan resource pascasesi.
- Gradebook dengan status Draft/Published serta kontrol publish/unpublish.
- Join virtual class yang otomatis membuat/memperbarui attendance peserta.
- Simulasi scan QR, perangkat face recognition, sync/retry, dan discrepancy.
- Dashboard Pengasuhan dengan peserta binaan, risiko, pelanggaran, prestasi, konseling, serta tindak lanjut.
- Catatan pengasuhan terbatas dengan simulasi pembatasan role dan data scope.
- Registry skema sertifikasi dan unit kompetensi LSP.
- Penjadwalan asesi/asesor serta asesmen per unit dengan evidence dan checklist.
- Review, approval, keputusan kompeten/belum kompeten, dan penerbitan sertifikat otomatis.
- Verification view sertifikat dengan nomor dan masa berlaku.
- Digital Passport berisi pendidikan, learning progress, kompetensi, timeline, share, print, dan renewal reminder.
- Dashboard mutu dan heatmap 8 Standar Pendidikan Polri.
- Registry indikator, parameter, bobot, periode, owner, status, dan score.
- Evidence repository dengan versi, reviewer, serta masa berlaku.
- Gap analysis, corrective action plan, progress, dan target penyelesaian.
- Audit mutu dari assignment/sampling sampai temuan, response, verification, dan closure.
- Akreditasi dari self-assessment, submission, review dokumen, visitasi, hingga hasil dan validity.
- Master Library dengan pencarian, filter, kategori, preview, dan download simulasi.
- Versioning resource, approval, archive, ownership, metadata, dan sharing scope.
- Copy/link resource nasional ke course pada workspace Satdik aktif.
- Collaboration Hub yang menyatukan forum, announcement, meeting, channel, dan chat.
- Channel berdasarkan Satdik, program, kelas, atau role beserta unread state.
- Announcement dengan mark-read, mark-all-read, dan deep-link ke modul tujuan.
- CCTV dashboard, live-feed placeholder, registry kamera, recording, dan retention.
- Incident/offline alert, maintenance ticket, watermark, dan audit akses CCTV.
- Inventaris aset beserta lokasi, kondisi, nilai, status, dan asset history.
- Inventaris ruangan dengan capacity, occupancy, dan resource view.
- Peminjaman dari request/approval/check-out sampai return dan condition check.
- Maintenance, vendor, cost, downtime, disposal, evidence, dan approval.
- Stok logistik dengan issue, return, transaction log, dan minimum-stock alert.
- Integration dashboard dengan health, sync time, records, error, dan latency.
- Connector catalog untuk REST API, database, batch, webhook, event, SSO, dan CCTV.
- Konfigurasi connector, schedule, authentication, pause/resume, dan run-now.
- Data mapping source-to-canonical dengan transform, required field, sample, dan version publish.
- Sync log, rejected record, retry, dan status proses.
- Education Data Hub untuk completeness, duplication, freshness, dan validity.
- Record lineage serta conflict-resolution/manual merge simulation.

## Known limitations

- Belum menggunakan backend, database, API, atau autentikasi production.
- Data disimpan pada `localStorage` browser; data tidak tersinkron antarperangkat atau antarbrowser.
- Kredensial dan role hanya simulasi, bukan kontrol akses keamanan.
- Upload file, download, print, notifikasi, QR/face recognition, meeting, CCTV, connector, dan sinkronisasi data bersifat simulasi UI.
- Semua menu role sudah memiliki halaman prototype khusus; tidak ada lagi menu yang diarahkan ke placeholder umum.
- Leaflet dan Chart.js memakai CDN; visual terkait dapat tidak tampil ketika koneksi internet tidak tersedia.
- Belum dilakukan sign-off resmi untuk responsive, accessibility, cross-browser, dan integrasi production.
