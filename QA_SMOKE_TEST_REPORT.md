# QA-01 Smoke Test Report

**Prototype:** LMS PRESISI LEMDIKLAT POLRI  
**Tanggal:** 8 September 2026  
**Status QA-01:** Parsial — seluruh automated smoke dan journey CLI PASS; browser interaction pending

## Hasil otomatis

Perintah uji:

```bash
node scripts/prototype-smoke.mjs http://127.0.0.1:8080
```

| Area uji | Hasil |
|---|---:|
| Halaman HTML ditemukan | 58 |
| Halaman merespons HTTP 200 | 58/58 |
| Role terdaftar | 11/11 |
| Item menu role diperiksa | 119 |
| Target menu hilang | 0 |
| Referensi aset/halaman lokal hilang | 0 |
| Syntax error JavaScript inline | 0 |
| ID HTML duplikat | 0 |
| Selector ID tanpa target | 0 |
| Link kosong `href="#"` | 0 |
| Error/warning otomatis | 0/0 |
| Reset Data Demo | PASS — data prototype terhapus, sesi/role/data lain tetap aman |
| Regression Attendance | PASS — 24/24 pemeriksaan |
| Audit responsive statis | PASS — 133/133 pemeriksaan |
| Journey lintas-role | PASS — 31/31 pemeriksaan |
| Journey Pengasuhan | PASS — 13/13 pemeriksaan |
| Journey LSP/Sertifikasi | PASS — 13/13 pemeriksaan |
| Journey Mutu/Akreditasi | PASS — 18/18 pemeriksaan |
| Journey Integrasi Data | PASS — 25/25 pemeriksaan |
| Journey Provisioning Satdik | PASS — 27/27 pemeriksaan |
| Journey Akses & Launcher | PASS — 71/71 pemeriksaan |
| Audit kontrak UI & aksesibilitas | PASS — 178/178 pemeriksaan |
| Journey Governance & Operations | PASS — 25/25 pemeriksaan |
| Journey Reporting, Organisasi & Personel | PASS — 26/26 pemeriksaan |
| Journey Library, Collaboration, CCTV & Aset | PASS — 29/29 pemeriksaan |

**Kesimpulan otomatis:** PASS.

## Regression test Attendance

Perintah uji:

```bash
node scripts/attendance-smoke.mjs
```

| Skenario | Hasil |
|---|---:|
| Migrasi data kehadiran Gadik dari state lama | PASS |
| Render KPI dan tabel Gadik per sesi | PASS |
| Simpan status, catatan, serta evidence Gadik | PASS |
| Rekap program mengikuti filter kelas | PASS |
| Tren per sesi dalam satu bulan | PASS |
| Tren bulanan untuk rentang lintas bulan | PASS |
| Pembatasan panel manager dari role Peserta | PASS |

**Kesimpulan Attendance otomatis:** PASS, 24 pemeriksaan tanpa kegagalan. Cakupan tambahan meliputi nama aksesibel untuk filter, tabel, kontrol status, progress, dan grafik tren.

## Audit responsive statis

Perintah uji:

```bash
node scripts/responsive-audit.mjs
```

Audit memeriksa viewport dan pemuatan stylesheet pada 58 halaman, breakpoint desktop/tablet/mobile, perubahan shell ke lebar penuh, collapse grid, padding mobile, overflow tabel, analytics Attendance, navigasi sidebar mobile, focus state, dan reduced motion.

**Kesimpulan responsive statis:** PASS, 133 pemeriksaan tanpa kegagalan. Sign-off visual pada browser dan perangkat nyata tetap mengikuti checklist di bawah.

## Regression journey lintas-role

Perintah uji:

```bash
node scripts/cross-role-journey.mjs
```

| Tahap | Checkpoint otomatis | Hasil |
|---|---|---:|
| Admin Satdik | Program, kurikulum, kelas, Gadik, dan enrollment tersimpan | PASS |
| Gadik | Course, materi, assignment, quiz, diskusi, dan virtual class terpublikasi | PASS |
| Peserta | Materi selesai, tugas terkirim, quiz selesai, diskusi dibalas, dan virtual class diikuti | PASS |
| Sinkronisasi | Join virtual class membuat evidence Attendance | PASS |
| Approval | Koreksi peserta disetujui dan record diperbarui | PASS |
| Penilaian | Tugas dinilai, feedback tersimpan, dan gradebook dipublikasi | PASS |
| Progress | Nilai tampil untuk peserta dan progress course mencapai 100% | PASS |
| Guardrail quiz | Percobaan kedua ditolak sesuai batas maksimum | PASS |
| Isolasi workspace | Data SPN-JBR tidak muncul pada SPN-BLI | PASS |

**Kesimpulan journey otomatis:** PASS, 31 pemeriksaan tanpa kegagalan. Klik dan tampilan browser tetap pending.

## Regression journey Pengasuhan

Perintah uji:

```bash
node scripts/care-journey.mjs
```

| Checkpoint | Hasil |
|---|---:|
| Dashboard tersedia untuk role Pengasuh | PASS |
| Catatan, evidence, dan flag rahasia tersimpan | PASS |
| Severity tinggi menaikkan risiko peserta | PASS |
| Penyelesaian tindak lanjut menurunkan risiko | PASS |
| Role Peserta menerima state akses dibatasi | PASS |
| Catatan rahasia tidak tampil kepada Peserta | PASS |
| Data SPN-JBR tidak bocor ke SPN-BLI | PASS |

**Kesimpulan Pengasuhan otomatis:** PASS, 13 pemeriksaan tanpa kegagalan. Validasi browser tetap pending.

## Regression journey LSP/Sertifikasi

Perintah uji:

```bash
node scripts/lsp-journey.mjs
```

| Checkpoint | Hasil |
|---|---:|
| Penjadwalan asesmen untuk skema dan asesi aktif | PASS |
| Guardrail menolak submit sebelum seluruh unit lengkap | PASS |
| Evidence dan checklist seluruh unit tersimpan | PASS |
| Submit asesmen mengubah status menjadi Review | PASS |
| Approval menetapkan keputusan Kompeten | PASS |
| Approval ulang tidak menduplikasi sertifikat | PASS |
| Verifikasi sertifikat menampilkan nomor dan masa berlaku | PASS |
| Digital Passport peserta memuat sertifikat dan identitas | PASS |
| Data SPN-JBR tidak bocor ke SPN-BLI | PASS |

**Kesimpulan LSP/Sertifikasi otomatis:** PASS, 13 pemeriksaan tanpa kegagalan. Validasi browser tetap pending.

## Regression journey Mutu/Akreditasi

Perintah uji:

```bash
node scripts/quality-journey.mjs
```

| Checkpoint | Hasil |
|---|---:|
| Delapan standar dan dashboard mutu tersedia | PASS |
| Update indikator menghitung ulang score dan status standar | PASS |
| Evidence tersimpan dan terhubung ke indikator | PASS |
| Corrective Action mencapai 100% dan status Selesai | PASS |
| Audit berjalan dari Plan sampai Closed | PASS |
| Temuan ditutup saat audit selesai | PASS |
| Akreditasi berjalan sampai Result Published | PASS |
| Hasil dan masa berlaku mengikuti self-score | PASS |
| Role Peserta dibatasi ke mode baca-saja | PASS |
| Data SPN-JBR tidak bocor ke SPN-BLI | PASS |

**Kesimpulan Mutu/Akreditasi otomatis:** PASS, 18 pemeriksaan tanpa kegagalan. Validasi browser tetap pending.

## Regression journey Integrasi Data

Perintah uji:

```bash
node scripts/integration-journey.mjs
```

| Checkpoint | Hasil |
|---|---:|
| Connector baru tersimpan lalu tervalidasi melalui konfigurasi | PASS |
| Pause menolak sync dan resume mengaktifkan kembali connector | PASS |
| Run Now memperbarui status, metrik, dan waktu sinkronisasi | PASS |
| Rejected record berhasil di-retry dengan counter konsisten | PASS |
| Mapping field tersimpan dan versi baru dipublikasikan | PASS |
| Data quality dan record lineage tersedia | PASS |
| Conflict resolution menyimpan sumber terpilih | PASS |
| Role Peserta dibatasi ke mode baca-saja | PASS |
| State integrasi konsisten sebagai layanan tingkat platform | PASS |

**Kesimpulan Integrasi Data otomatis:** PASS, 25 pemeriksaan tanpa kegagalan. Validasi browser tetap pending.

## Regression journey Provisioning Satdik

Perintah uji:

```bash
node scripts/provisioning-journey.mjs
```

| Checkpoint | Hasil |
|---|---:|
| Wizard provisioning dan konfigurasi awal tersedia | PASS |
| Profil, capability, struktur, pimpinan/admin, serta mapping tersimpan | PASS |
| Kode Satdik duplikat ditolak pada seluruh jalur persist | PASS |
| Lifecycle registry Draft → Review → Aktif tervalidasi | PASS |
| Aktivasi langsung dari tahap review wizard tetap tersedia | PASS |
| Workspace aktif muncul bagi Admin Pusat | PASS |
| Progress onboarding tersimpan | PASS |
| Workspace master tidak dapat dimutasi | PASS |
| Role Peserta dibatasi ke mode baca-saja | PASS |

**Kesimpulan Provisioning Satdik otomatis:** PASS, 27 pemeriksaan tanpa kegagalan. Validasi browser tetap pending.

## Regression journey Akses & Launcher

Perintah uji:

```bash
node scripts/access-journey.mjs
```

| Checkpoint | Hasil |
|---|---:|
| Credential demo valid diterima dan password salah ditolak | PASS |
| Sesi dan home route seluruh 11 role valid | PASS |
| Sesi rusak serta akses Launcher tanpa sesi ditolak | PASS |
| Workspace awal selalu berada dalam scope role | PASS |
| Shared service mengikuti menu dan otorisasi role | PASS |
| Peserta hanya melihat workspace SPN Polda Jawa Barat | PASS |
| Reset menghapus data transaksi tanpa menghapus role/sesi | PASS |
| Logout hanya mengakhiri sesi | PASS |

**Kesimpulan Akses & Launcher otomatis:** PASS, 71 pemeriksaan tanpa kegagalan. Cakupan meliputi session guard, fokus eksklusif SPN Polda Jawa Barat untuk role Satdik, pembersihan label Satdik lama pada surface aktif, dan penolakan pemilihan workspace di luar scope; validasi klik dan visual browser tetap pending.

## Audit kontrak UI & aksesibilitas

Perintah uji:

```bash
node scripts/ui-contract-audit.mjs
```

Audit CLI memeriksa 58 halaman untuk landmark utama, title, alternative text gambar, accessible name pada tombol dan tautan, label input/select/textarea, title iframe, focus-visible, reduced motion, landmark navigasi, session guard, error credential, serta pembatasan shared service.

**Kesimpulan kontrak UI:** PASS, 178 pemeriksaan tanpa kegagalan. Sepuluh kontrol filter yang semula tidak memiliki nama aksesibel sudah diperbaiki.

## Regression journey Governance & Operations

Perintah uji:

```bash
node scripts/platform-governance-journey.mjs
```

| Checkpoint | Hasil |
|---|---:|
| Master Data berjalan dari Review ke Berlaku | PASS |
| IAM menyimpan pengguna, MFA, dan data scope | PASS |
| Policy RBAC/ABAC tersedia | PASS |
| Health check memperbarui status seluruh service | PASS |
| Registry backup dan status keberhasilan tersedia | PASS |
| Restore drill membuat audit event baru | PASS |
| Audit event memiliki correlation ID | PASS |
| Role Peserta dibatasi ke mode baca-saja | PASS |
| State governance terisolasi antar-workspace | PASS |

**Kesimpulan Governance & Operations otomatis:** PASS, 25 pemeriksaan tanpa kegagalan. Audit immutable, SIEM, backup, dan recovery nyata tetap merupakan cakupan production.

## Regression journey Reporting, Organisasi & Personel

Perintah uji:

```bash
node scripts/platform-product-journey.mjs
```

| Checkpoint | Hasil |
|---|---:|
| Unit organisasi tersimpan dengan validasi induk, jumlah jabatan, dan nama duplikat | PASS |
| Personel tersimpan dengan identitas unik dan data wajib | PASS |
| Assignment personel tersimpan tanpa duplikasi | PASS |
| Profil personel dapat diperbarui tanpa konflik NRP/NIP | PASS |
| Report Center menyediakan katalog, filter aksesibel, export, print, dan pilihan kolom | PASS |
| Jadwal laporan tersimpan aktif tanpa duplikasi | PASS |
| Role baca-saja tidak dapat memutasi profil personel | PASS |
| Data personel dan jadwal laporan terisolasi antar-workspace | PASS |

**Kesimpulan Reporting, Organisasi & Personel otomatis:** PASS, 26 pemeriksaan tanpa kegagalan. Export/print tetap merupakan simulasi prototype; validasi klik dan visual browser tetap pending.

## Regression journey Library, Collaboration, CCTV & Aset

Perintah uji:

```bash
node scripts/shared-operations-journey.mjs
```

Journey memeriksa lifecycle resource dan versi Library, channel/chat dan unread state, registrasi kamera, audit live view, incident CCTV, registrasi aset, peminjaman sampai kembali, maintenance sampai selesai, transaksi stok, pembatasan mutasi berdasarkan role, serta isolasi antar-workspace.

**Kesimpulan shared operations otomatis:** PASS, 29 pemeriksaan tanpa kegagalan. Stream, download, dan perangkat fisik tetap merupakan simulasi prototype.

## Cakupan yang diuji

- Struktur dasar seluruh halaman: doctype, bahasa, viewport, dan title.
- Semua `href`/`src` lokal pada HTML.
- Parsing seluruh JavaScript inline.
- Kesesuaian selector ID terhadap elemen halaman.
- Keunikan ID HTML.
- Seluruh konfigurasi menu untuk 11 role.
- Keberadaan target halaman untuk 119 item menu role.
- Respons HTTP seluruh 58 halaman.
- Batas penghapusan aman untuk fungsi Reset Data Demo.

## Pengujian browser yang masih harus dilakukan

Browser interaktif tidak tersedia pada sesi pengujian ini. Karena itu, bagian berikut belum dinyatakan lulus:

1. Klik nyata seluruh CTA dan navigasi pada setiap role.
2. Buka/tutup modal atau drawer serta pengujian tombol batal/konfirmasi.
3. Isi, validasi, submit, edit, dan reset form.
4. Verifikasi toast, loading, empty, error, success, dan disabled state secara visual.
5. Journey lintas-role menggunakan state yang sama pada workspace SPN-JBR.
6. Validasi hasil Reset Data Demo dari antarmuka Launcher.
7. Pemeriksaan console error selama interaksi.

## Checklist browser per journey

| Journey | Role | Checkpoint utama | Status |
|---|---|---|---|
| Login → Launcher → home role | Semua role | Login, role label, workspace access, menu | Automated journey PASS; pending browser |
| Provisioning Satdik | Admin Pusat | Draft, review, activation, registry | Automated journey PASS; pending browser |
| Operasi pendidikan | Admin Satdik/Akademik | Program, kurikulum, kelas, jadwal, enrollment | Automated journey PASS; pending browser |
| Siklus learning | Gadik/Peserta | Materi, tugas, quiz, diskusi, virtual class, progress | Automated journey PASS; pending browser |
| Pengasuhan | Pengasuh | Risiko, catatan terbatas, tindak lanjut | Automated journey PASS; pending browser |
| Sertifikasi | Asesor | Skema, asesmen, keputusan, sertifikat, passport | Automated journey PASS; pending browser |
| Mutu dan akreditasi | Auditor | Standar, evidence, finding, CAPA, akreditasi | Automated journey PASS; pending browser |
| Integrasi data | Admin TI | Connector, mapping, sync, retry, quality, lineage | Automated journey PASS; pending browser |
| Reporting, organisasi, personel | Admin Pusat/Admin Satdik | Unit, profil, assignment, viewer, jadwal laporan | Automated journey PASS; pending browser |
| Shared operations | Admin Satdik/Admin TI/Gadik/Peserta/Pimpinan | Library, channel/chat, CCTV, aset, loan, maintenance, stok | Automated journey PASS; pending browser |
| Reset data | Semua role | Data kembali awal, sesi tetap aktif | Automated journey PASS; pending browser |

## Exit criteria QA-01

QA-01 dapat diubah menjadi **selesai** setelah seluruh checklist browser di atas lulus tanpa error blocking. Temuan minor harus dicatat; temuan blocking harus diperbaiki dan diuji ulang sebelum status ditutup.
