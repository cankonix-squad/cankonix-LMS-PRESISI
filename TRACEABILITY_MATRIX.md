# Traceability Matrix — LMS PRESISI LEMDIKLAT POLRI

Matriks ini menghubungkan kebutuhan sumber dengan modul, halaman prototype, role, dan langkah demonstrasi. Tujuannya adalah memperlihatkan cakupan yang sudah dapat diuji serta gap menuju aplikasi production.

## Sumber acuan

- `Konsep KAK.docx`: kebutuhan platform LPDL, modul aplikasi Satdik, master data, keamanan, integrasi, mutu, reporting, dan non-fungsional.
- `PRD_LMS_Lemdiklat_Polri_Presisi_Prototype_v1.md`: bagian 4–13, terutama module requirements 6.1–6.11 dan acceptance criteria.
- `LMS_Lemdiklat_Polri_Presisi_Master_Blueprint_v1.md`: layer LMS Unit, shared platform services, national layer, role, dan user flow.
- `UI_UX_Page_Specification_LMS_Lemdiklat_Polri_Presisi_v1.md`: global shell, shared components, halaman 4.1–4.31, role sidebar, responsive, dan demo journey.
- `DEMO_SCRIPT_PER_ROLE.md`: demonstrasi operasional untuk 11 role.

## Status

- **Terpenuhi:** halaman dan interaksi utama tersedia dalam prototype.
- **Parsial:** representasi/alur inti tersedia, tetapi beberapa subfitur belum lengkap.
- **Placeholder:** target menu tersedia, tetapi belum menjadi modul interaktif khusus.
- **Production:** sengaja di luar prototype HTML dan wajib ditegakkan pada backend/infrastruktur.

## A. Platform, akses, dan workspace Satdik

| ID | Kebutuhan sumber | Modul/fitur | Halaman prototype | Role/journey | Status |
|---|---|---|---|---|---|
| TR-CORE-01 | KAK: User Experience Layer; PRD 5.1; UI/UX 4.1 | Login dan pemilihan role simulasi | `login.html` | Semua role — Persiapan | Terpenuhi |
| TR-CORE-02 | KAK: Dynamic Launcher | Launcher berbasis role dan unit access | `launcher.html` | Semua role — setelah login | Terpenuhi |
| TR-CORE-03 | KAK: Dynamic Navigation; PRD 4 | Menu dan home berbeda per role | Seluruh halaman melalui `assets/js/app.js` | 11 role | Terpenuhi |
| TR-CORE-04 | KAK: platform configurable dan registry-driven | Workspace/tenant Satdik dan state terpisah | `launcher.html`, `pages/institutions.html` | Admin Pusat langkah 3–4 | Terpenuhi untuk simulasi lokal |
| TR-CORE-05 | KAK: registry unit/system/capability | Registry Satdik, konfigurasi dan aktivasi | `pages/admin-central.html`, `pages/institutions.html`, `pages/institution-manage.html` | Admin Pusat | Terpenuhi |
| TR-CORE-06 | KAK: penambahan unit tanpa source code terpisah | Wizard pembuatan LMS Satdik | `pages/lms-unit-create.html` | Admin Pusat langkah 1–4 | Terpenuhi |
| TR-CORE-07 | KAK: role, permission, policy, data scope | User dan Hak Akses | `pages/access-control.html` | Admin Pusat | Terpenuhi |
| TR-CORE-08 | KAK: OTP, MFA, secure session | Authentication production | Login simulasi | Semua role | Production |

## B. Dashboard, organisasi, dan personel

| ID | Kebutuhan sumber | Modul/fitur | Halaman prototype | Role/journey | Status |
|---|---|---|---|---|---|
| TR-DASH-01 | KAK: Dashboard Sekolah; PRD 6.2.2 | Dashboard/profil Satdik dan KPI unit | `pages/institution-detail.html` | Pimpinan Satdik langkah 2 | Terpenuhi |
| TR-DASH-02 | KAK: dashboard lintas unit; PRD 6.1 | Dashboard nasional dan peta | `index.html` | Pimpinan Lemdiklat langkah 2–3 | Terpenuhi |
| TR-DASH-03 | KAK: monitoring pimpinan; PRD 6.11 | Command Center dan drill-down | `pages/command-center.html` | Pimpinan Lemdiklat langkah 4 | Terpenuhi |
| TR-ORG-01 | KAK: struktur organisasi, unit, jabatan, pejabat | Profil dan struktur Satdik | `pages/organization.html`, `pages/institution-manage.html` | Pimpinan/Admin Satdik | Terpenuhi; journey produk PASS |
| TR-SDM-01 | KAK: data/profil personel | Registry personel | `pages/personnel.html` | Admin Pusat/Admin Satdik | Terpenuhi; journey produk PASS |
| TR-SDM-02 | KAK: biodata, pendidikan, jabatan, kompetensi, prestasi, penghargaan, penugasan, lampiran | Profil personel lengkap | `pages/personnel-detail.html` | Admin Pusat/Admin Satdik | Terpenuhi; journey produk PASS |
| TR-MDM-01 | KAK: sekolah, satker, satwil, pangkat, golongan, personel | Master Data Nasional | `pages/master-data.html` | Admin Pusat | Terpenuhi |

## C. Penyelenggaraan pendidikan dan learning

| ID | Kebutuhan sumber | Modul/fitur | Halaman prototype | Role/journey | Status |
|---|---|---|---|---|---|
| TR-EDU-01 | KAK: program dan kurikulum; PRD 6.2.3–6.2.5 | Program, kurikulum, JP, outcome, prerequisite, Silabus/Hanjar, dan Kalender Akademik | `pages/programs.html`, `pages/program-detail.html`, `pages/curriculum.html`, `pages/academic-calendar.html` | Admin Satdik/Pengelola Akademik | Terpenuhi |
| TR-EDU-02 | KAK: master kelas dan jadwal; PRD 6.2.6–6.2.7 | Kelas, ruang, Gadik, calendar/list schedule, bentrok, reschedule, dan approval | `pages/classes.html`, `pages/schedule.html` | Admin Satdik langkah 3–4 | Terpenuhi |
| TR-EDU-03 | KAK: peserta didik; PRD 6.2.9 | Registry peserta dan enrollment | `pages/participants.html` | Admin Satdik langkah 5 | Terpenuhi |
| TR-LRN-01 | KAK: pembelajaran; PRD 6.3.1–6.3.3 | Learning dashboard, course list/detail | `pages/learning-dashboard.html`, `pages/courses.html`, `pages/course-detail.html` | Gadik/Peserta | Terpenuhi |
| TR-LRN-02 | KAK: materi/Hanjar dan aktivitas; PRD 6.3.4 | Materi, tipe resource, prerequisite, completion | `pages/materials.html`, `pages/course-detail.html` | Gadik langkah 2–3; Peserta langkah 2 | Terpenuhi |
| TR-LRN-03 | KAK: tugas/pengumpulan; PRD 6.3.5 | Assignment, submission, rubric, review, nilai | `pages/assignments.html` | Gadik/Peserta | Terpenuhi |
| TR-LRN-04 | KAK: kuis; PRD 6.3.6 | Bank soal, attempt, hasil, remedial | `pages/quizzes.html` | Gadik/Peserta | Terpenuhi |
| TR-LRN-05 | KAK: forum; PRD 6.3.8 | Thread, reply, unread, pin, moderasi | `pages/discussion.html` | Gadik/Peserta | Terpenuhi |
| TR-LRN-06 | KAK: pertemuan/PJJ; PRD 6.3.9 | Virtual class, join, attendance, recording/resource | `pages/virtual-class.html`, `pages/my-teaching.html` | Gadik/Peserta | Terpenuhi sebagai simulasi |
| TR-LRN-07 | KAK: progress dan evaluasi; PRD 6.3.10, 6.5 | Progress, gradebook, assessment, publish nilai | `pages/progress.html`, `pages/assessment.html` | Gadik/Peserta/Pengelola Akademik | Terpenuhi |
| TR-COM-01 | PRD 6.6 | Collaboration, channel, chat, forum, announcement, meeting | `pages/collaboration.html`, `pages/announcements.html` | Gadik/Peserta/Admin Satdik | Terpenuhi; shared operations PASS |
| TR-LIB-01 | PRD 6.7; Blueprint Layer 2 | Master Library, version, approval, sharing, copy/link ke course | `pages/master-library.html` | Pimpinan/Admin/Gadik/Peserta | Terpenuhi; shared operations PASS |

## D. Kehadiran, pengasuhan, CCTV, dan aset

| ID | Kebutuhan sumber | Modul/fitur | Halaman prototype | Role/journey | Status |
|---|---|---|---|---|---|
| TR-ATT-01 | KAK: dashboard, peserta, pengajar, rekap absensi | Attendance per sesi, rekap, koreksi/approval | `pages/attendance.html` | Pimpinan Satdik/Admin/Gadik/Pengasuh/Peserta | Terpenuhi |
| TR-ATT-02 | KAK: integrasi absensi | QR/face device, sync, retry, discrepancy | `pages/attendance.html` | Admin Satdik/Gadik | Terpenuhi sebagai simulasi |
| TR-CARE-01 | KAK: pembinaan, sikap, kedisiplinan, catatan | Dashboard dan catatan pengasuhan | `pages/care-dashboard.html` | Pengasuh langkah 2–5 | Terpenuhi |
| TR-CCTV-01 | KAK: dashboard, monitoring, master kamera, rekaman | CCTV, registry, recording, incident, maintenance, audit akses | `pages/cctv.html` | Pimpinan Satdik/Admin TI | Terpenuhi sebagai simulasi; shared operations PASS |
| TR-ASSET-01 | KAK: dashboard dan inventaris aset/ruangan | Inventaris, kondisi, lokasi, nilai, history | `pages/assets.html` | Pimpinan/Admin Satdik | Terpenuhi; shared operations PASS |
| TR-ASSET-02 | KAK: peminjaman, perawatan, penghapusan | Request/approval/check-out/return, maintenance, disposal | `pages/assets.html` | Admin Satdik | Terpenuhi; shared operations PASS |
| TR-ASSET-03 | PRD 6.8: logistic | Stok, issue, return, transaction, minimum stock | `pages/assets.html` | Admin Satdik | Terpenuhi; shared operations PASS |

## E. Kompetensi, mutu, dan akreditasi

| ID | Kebutuhan sumber | Modul/fitur | Halaman prototype | Role/journey | Status |
|---|---|---|---|---|---|
| TR-LSP-01 | KAK: sertifikasi; PRD 6.9 | Skema dan unit kompetensi | `pages/lsp-dashboard.html`, `pages/lsp-schemes.html` | Asesor langkah 2 | Terpenuhi |
| TR-LSP-02 | KAK/PRD: asesmen sampai keputusan | Asesi, asesor, jadwal, evidence, review, keputusan | `pages/lsp-assessments.html` | Asesor langkah 3–4 | Terpenuhi |
| TR-LSP-03 | KAK/PRD: sertifikat | Penerbitan dan verification view | `pages/certification.html` | Asesor langkah 5 | Terpenuhi sebagai simulasi |
| TR-PASS-01 | PRD 6.10 | Digital Passport pendidikan dan kompetensi | `pages/digital-passport.html` | Peserta/Asesor | Terpenuhi |
| TR-STD-01 | KAK: digitalisasi 8 Standar Pendidikan Polri | Dashboard, heatmap, indikator, bobot, periode | `pages/quality-dashboard.html`, `pages/quality-standards.html` | Auditor langkah 2–3 | Terpenuhi; indikator final perlu validasi |
| TR-QA-01 | KAK: evidence, QA, gap, tindak lanjut | Evidence version/reviewer/validity, gap, CAPA | `pages/quality-standards.html`, `pages/quality-dashboard.html` | Auditor langkah 3–5 | Terpenuhi |
| TR-QA-02 | KAK: audit/pengawasan | Assignment, sampling, finding, response, verification, closure | `pages/quality-audit.html` | Auditor langkah 4 | Terpenuhi |
| TR-ACC-01 | KAK: akreditasi | Self-assessment, submission, document review, visitasi, hasil | `pages/accreditation.html` | Auditor langkah 6 | Terpenuhi |

## F. Integrasi, data, reporting, dan operasi

| ID | Kebutuhan sumber | Modul/fitur | Halaman prototype | Role/journey | Status |
|---|---|---|---|---|---|
| TR-INT-01 | KAK: Integration Hub dan connector framework | Health, connector catalog, konfigurasi, schedule, auth | `pages/integration-dashboard.html`, `pages/connector-catalog.html` | Admin TI langkah 1–3 | Terpenuhi sebagai simulasi |
| TR-INT-02 | KAK: mapping, validation, logging, retry, error handling | Mapping version, sync log, rejected record, retry | `pages/data-mapping.html`, `pages/integration-dashboard.html` | Admin TI langkah 4–5 | Terpenuhi sebagai simulasi |
| TR-DATA-01 | KAK: Education Data Hub dan standardisasi data | Completeness, duplicate, freshness, validity | `pages/data-quality.html` | Admin TI langkah 6 | Terpenuhi sebagai simulasi |
| TR-DATA-02 | KAK: auditability dan keterlacakan data | Record lineage, conflict resolution, manual merge | `pages/data-quality.html` | Admin TI langkah 6 | Terpenuhi sebagai simulasi |
| TR-RPT-01 | KAK: dashboard/laporan, filter, drill-down, export/print | Reporting lintas role | `pages/reports.html` | Pimpinan/Admin | Terpenuhi sebagai simulasi; journey produk PASS 26/26 |
| TR-AUD-01 | KAK: immutable audit trail dan detail event | Audit Log | `pages/audit-log.html` | Admin Pusat/Admin TI | Terpenuhi sebagai simulasi |
| TR-OPS-01 | KAK: health, observability, alert, backup/recovery | Dashboard Operasional/System Health | `pages/operations-dashboard.html`, `pages/system-health.html` | Admin TI | Terpenuhi sebagai simulasi |

## G. Non-fungsional dan batas production

| ID | Kebutuhan sumber | Representasi prototype | Status/gap menuju production |
|---|---|---|---|
| TR-NFR-01 | Web responsive dan UI konsisten | Shared CSS, shell, komponen, breakpoint | Parsial; audit statis 133/133 PASS, sign-off visual belum selesai |
| TR-NFR-02 | Loading, empty, error, validation, confirmation, feedback | Tersedia pada beberapa form/journey | Parsial; belum diaudit pada setiap CTA |
| TR-NFR-03 | Accessibility-aware dan cross-browser | Semantic HTML dasar dan responsive styles | Parsial; Attendance memiliki label/semantik dasar, shell memiliki navigasi mobile/focus/reduced-motion, audit keyboard/contrast/cross-browser belum selesai |
| TR-NFR-04 | Backend authorization, RBAC/ABAC, MFA, encryption | Role/menu simulasi frontend | Production |
| TR-NFR-05 | Database, API, audit immutable, backup/recovery | State `localStorage` per workspace | Production |
| TR-NFR-06 | Integrasi live, CCTV stream, meeting, notification | Dummy connector dan action simulasi | Production |
| TR-NFR-07 | Observability, SIEM, log/metric/trace, failover | Placeholder | Production |

## Ringkasan gap prioritas

1. **P0 handoff:** smoke test seluruh CTA, konsistensi state lintas halaman, dan responsive QA.
2. **P0 produk:** journey Reporting, Organisasi, dan Personel telah lulus 26/26; validasi bisnis dan implementasi layanan production tetap diperlukan.
3. **P1 governance:** simulasi audit log, IAM/hak akses, system health, backup/recovery, dan security event telah lulus journey otomatis 25/25; implementasi layanan production tetap diperlukan.
4. **Validasi bisnis:** daftar resmi indikator 8 Standar Pendidikan Polri, struktur tenant/subunit, source system, matriks kewenangan, serta domain/branding Satdik.
5. **Implementasi production:** backend, database, IAM/MFA, isolasi tenant, API/connector nyata, object storage, audit immutable, encryption, observability, deployment, backup, dan disaster recovery.

## Acceptance trace

Traceability prototype dinyatakan lengkap ketika:

- setiap halaman yang disebut pada matriks tersedia dan dapat dibuka;
- setiap status “Terpenuhi” memiliki langkah demo pada `DEMO_SCRIPT_PER_ROLE.md`;
- setiap status “Parsial/Placeholder/Production” tercatat sebagai gap, bukan dianggap selesai;
- perubahan cakupan berikutnya menambahkan atau memperbarui baris ID terkait; dan
- seluruh QA-01 sampai QA-08 selesai sebelum handoff final.
