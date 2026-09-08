# PRD — LMS Lemdiklat Polri Presisi
## Prototype HTML/CSS v1

**Product Name:** LMS Lemdiklat Polri Presisi  
**Positioning:** Platform Induk Pendidikan Polri  
**Tagline:** Satu Sistem • Satu Data • Satu Ekosistem Pendidikan  
**Document Type:** Product Requirements Document  
**Scope:** Prototype HTML/CSS/JavaScript  
**Version:** 1.0

---

# 1. Executive Summary

LMS Lemdiklat Polri Presisi adalah platform induk pendidikan Polri yang menghubungkan seluruh LMS unit/lembaga pendidikan, proses pembelajaran, assessment, collaboration, master library, logistic & asset management, sertifikasi kompetensi melalui LSP, serta monitoring nasional dalam satu ekosistem yang terintegrasi.

Prototype tahap awal difokuskan pada validasi konsep, alur pengguna, informasi, navigasi, dan pengalaman visual. Prototype belum membutuhkan backend production, database, API production, maupun autentikasi nyata.

Target utama prototype adalah menghasilkan demonstrasi end-to-end yang dapat digunakan dalam rapat pimpinan dan validasi bersama stakeholder sebelum masuk ke fase full-stack development.

---

# 2. Goals

## 2.1 Primary Goals

1. Menampilkan gambaran nasional aktivitas pendidikan Lemdiklat Polri.
2. Menyatukan berbagai LMS unit dalam satu platform induk.
3. Menyediakan pengalaman berbeda sesuai role pengguna.
4. Menampilkan proses pendidikan dari level nasional hingga peserta.
5. Menyediakan pengalaman pembelajaran yang sederhana untuk Gadik dan Peserta.
6. Menampilkan shared services lintas unit.
7. Menampilkan integrasi LSP sebagai layanan sertifikasi dan kompetensi.
8. Menyediakan Command Center untuk pimpinan.
9. Menyiapkan fondasi UI/UX yang dapat dikembangkan menjadi aplikasi full-stack.

## 2.2 Non-Goals Prototype v1

Prototype v1 belum mencakup:

- Backend production
- Database production
- Real SSO
- Integrasi API nyata
- Real Zoom API
- Real video streaming
- Real assessment engine
- Real certificate signing
- Real integration dengan sistem Polri lainnya
- Infrastructure deployment production
- Advanced security implementation
- Multi-tenant backend

---

# 3. Product Concept

## 3.1 Platform Structure

Platform terdiri dari tiga lapisan utama:

### Layer 1 — LMS Unit / Lembaga

- LMS STIK
- LMS Sespim Polri
  - Sespimti
  - Sespimmen
  - Sespimma
  - SPPK
- LMS AKPOL
- LMS Sepolwan
- LMS Sekolah Polisi / SPN
- LMS Pusdik
- LMS Unit lainnya

### Layer 2 — Shared Platform Services

- Collaboration
- Master Library
- Logistic & Asset Management
- LSP Sertifikasi & Kompetensi

### Layer 3 — National Layer

- National Dashboard
- Command Center
- Single Data
- Master Data
- Integration
- Reporting
- Monitoring

---

# 4. User Roles

## 4.1 Pimpinan Lemdiklat

### Objectives
- Melihat kondisi pendidikan nasional
- Melihat program aktif
- Melihat lembaga pendidikan
- Melihat peserta dan Gadik
- Melihat learning progress
- Melihat assessment dan sertifikasi
- Melihat indikator performa
- Drill-down ke unit

### Main Navigation
- Dashboard Nasional
- Lembaga Pendidikan
- Program Nasional
- Monitoring
- LSP & Kompetensi
- Master Library
- Logistic & Asset
- Command Center
- Reporting

---

## 4.2 Admin Pusat

### Objectives
- Mengelola master nasional
- Mengelola unit
- Mengelola program nasional
- Monitoring sinkronisasi
- Governance

### Main Navigation
- Dashboard
- Master Data
- LMS Unit
- Program Pendidikan
- Master Library
- Integration
- User & Role
- Audit Log
- Reporting

---

## 4.3 Admin LMS Unit

### Objectives
- Mengelola kegiatan pendidikan unit
- Mengelola program
- Mengelola kurikulum
- Mengelola kelas
- Mengelola peserta dan Gadik
- Mengelola jadwal

### Main Navigation
- Dashboard
- Education Management
- Learning
- Assessment
- Collaboration
- Master Library
- Logistic & Asset
- Reports

---

## 4.4 Gadik

### Objectives
- Melihat kelas yang diajar
- Mengelola materi
- Membuat tugas
- Membuat quiz
- Menjalankan virtual class
- Melihat attendance
- Memberikan penilaian

### Main Navigation
- Dashboard
- My Teaching
- Courses
- Materi
- Assignment
- Quiz/Ujian
- Attendance
- Discussion
- Virtual Class
- Assessment
- Nilai
- Peserta

---

## 4.5 Peserta Didik

### Objectives
- Mengikuti pembelajaran
- Membaca materi
- Mengikuti virtual class
- Mengerjakan tugas
- Mengerjakan quiz
- Melihat progress
- Melihat nilai
- Melihat Digital Passport

### Main Navigation
- Dashboard
- My Learning
- My Courses
- Materi Pembelajaran
- Assignment
- Quiz/Ujian
- Attendance
- Discussion Forum
- Virtual Class
- Learning Progress
- Announcement
- Digital Passport

---

## 4.6 Asesor LSP

### Objectives
- Mengelola asesmen kompetensi
- Menilai asesi
- Melihat skema sertifikasi
- Mengelola hasil uji
- Menerbitkan status kompeten

### Main Navigation
- Dashboard LSP
- Skema Sertifikasi
- Unit Kompetensi
- Asesi
- Asesor
- Jadwal Asesmen
- Hasil Asesmen
- Sertifikasi
- Digital Passport

---

# 5. Information Architecture

## 5.1 Global Navigation

### Main Sidebar
- Dashboard
- Education Management
- Learning
- Assessment
- Collaboration
- Master Library
- Logistic & Asset
- LSP & Kompetensi
- Command Center

Menu disesuaikan berdasarkan role.

---

# 6. Module Requirements

# 6.1 National Dashboard

## Purpose
Memberikan gambaran kondisi pendidikan nasional.

## Main Components

### KPI Cards
- Total Lemdik / Satdik
- Program Aktif
- Peserta Aktif
- Gadik Aktif
- Kelas Aktif

### National Map
Menggunakan Leaflet.

### Filters
- Wilayah
- Jenis Lembaga
- Program
- Status

### Marker Popup
Menampilkan:
- Nama lembaga
- Lokasi
- Program aktif
- Peserta
- Gadik
- Tombol Lihat Detail

### Program Pendidikan Berjalan
Kolom:
- Program
- Lembaga
- Peserta
- Kelas
- Periode
- Progress
- Status

### Aktivitas Hari Ini
- Kelas berjalan
- Assessment
- Program mulai
- Program selesai
- Virtual class

### Monitoring
- Attendance
- Kelas sesuai jadwal
- Program on-track

---

# 6.2 Education Management

## Purpose
Mengelola penyelenggaraan pendidikan.

## Submenu
- Dashboard Education Management
- Lembaga Pendidikan
- Program Pendidikan
- Kurikulum
- Kelas
- Jadwal
- Gadik
- Peserta Didik

## Flow

Lembaga  
→ Program  
→ Kurikulum  
→ Kelas  
→ Jadwal  
→ Gadik  
→ Peserta

---

## 6.2.1 Lembaga Pendidikan

### Page Components
- Search
- Filter wilayah
- Filter jenis
- Filter status
- Grid/List toggle
- Map/List toggle
- Cards
- Pagination

### Card Data
- Nama lembaga
- Wilayah
- Jumlah program aktif
- Peserta
- Gadik
- Status

---

## 6.2.2 Detail Lembaga

### Summary Cards
- Program Aktif
- Peserta
- Gadik
- Kelas

### Tabs
- Overview
- Program
- Kelas
- Jadwal
- Gadik
- Peserta

---

## 6.2.3 Program Pendidikan

### Data Fields
- Nama Program
- Jenis Program
- Lembaga
- Tahun
- Periode
- Peserta
- Kelas
- Progress
- Status

---

## 6.2.4 Detail Program

### Tabs
- Overview
- Kurikulum
- Kelas
- Jadwal
- Peserta
- Gadik
- Progress

---

## 6.2.5 Kurikulum

### Data
- Nama kurikulum
- Versi
- Tahun berlaku
- Mata pelajaran
- Jam pelajaran
- Kompetensi

---

## 6.2.6 Kelas

### Data
- Nama kelas
- Program
- Peserta
- Gadik
- Jadwal
- Progress

### Action
- Masuk Ruang Pembelajaran

---

## 6.2.7 Jadwal

### Views
- Calendar View
- Schedule View

### Data
- Waktu
- Mata pelajaran
- Gadik
- Ruang
- Tipe kelas
- Status

---

## 6.2.8 Gadik

### Data
- Foto
- Nama
- Pangkat
- Kompetensi
- Course
- Kelas aktif
- Status

---

## 6.2.9 Peserta Didik

### Data
- Nama
- NRP
- Program
- Kelas
- Progress
- Attendance
- Status

### Action
- Lihat Digital Passport

---

# 6.3 Learning Management System

## Purpose
Menjadi area kerja pembelajaran untuk Peserta dan Gadik.

## Submenu Peserta
- Dashboard Learning
- My Courses
- Materi Pembelajaran
- Assignment
- Quiz/Ujian
- Attendance
- Discussion Forum
- Virtual Class
- Learning Progress
- Announcement

---

## 6.3.1 Dashboard Learning — Peserta

### KPI
- Progress Belajar
- Kehadiran
- Tugas Selesai
- Quiz/Ujian

### Main Components
- Continue Learning
- Jadwal Hari Ini
- My Courses
- Upcoming Assignment
- Announcement
- Learning Progress

---

## 6.3.2 My Courses

### Course Card
- Nama course
- Gadik
- Progress
- Next session
- Status
- Open Course

---

## 6.3.3 Course Detail

### Tabs
- Overview
- Materi
- Tugas
- Quiz
- Diskusi
- Jadwal
- Nilai

### Overview
- Course information
- Gadik
- Progress
- Next class
- Learning outcome
- Materi terakhir
- Upcoming task
- Join Virtual Class

---

## 6.3.4 Materi Pembelajaran

### Content Types
- Document
- PDF
- Video
- Presentation
- Link
- Master Library
- Recording

### Status
- Belum Dibuka
- Sedang Dipelajari
- Selesai

---

## 6.3.5 Assignment

### Data
- Judul
- Course
- Deadline
- Status
- Submission
- Nilai

### Actions
- View Detail
- Submit
- Resubmit

---

## 6.3.6 Quiz/Ujian

### Data
- Judul
- Course
- Durasi
- Attempt
- Status
- Nilai

---

## 6.3.7 Attendance

### Data
- Course
- Tanggal
- Jam
- Kehadiran
- Tipe
- Status

---

## 6.3.8 Discussion Forum

### Features
- Forum per course
- Thread
- Reply
- Mention
- Attachment simulation

---

## 6.3.9 Virtual Class

### Features
- Meeting schedule
- Join class
- Recording
- Attendance status

Prototype menggunakan dummy button tanpa Zoom API nyata.

---

## 6.3.10 Learning Progress

### Components
- Overall progress
- Progress per course
- Completed module
- Pending assignment
- Assessment summary

---

# 6.4 Gadik Workspace

## Dashboard Components
- Kelas Aktif
- Peserta
- Jadwal Mengajar
- Assignment Belum Dinilai
- Quiz
- Submission Terbaru
- Peserta Perlu Perhatian

## Course Management
- Materi
- Assignment
- Quiz
- Attendance
- Discussion
- Virtual Class
- Gradebook

---

# 6.5 Assessment

## Purpose
Menyediakan proses evaluasi pembelajaran dan kompetensi.

## Submenu
- Dashboard Assessment
- Assessment Plan
- Quiz/Ujian
- Assignment Assessment
- Gradebook
- Rubric
- Results
- Remedial

## Prototype Scope
- List assessment
- Detail
- Status
- Score
- Basic rubric
- Result summary

---

# 6.6 Collaboration

## Purpose
Shared communication layer.

## Submenu
- Chat
- Forum
- Announcement
- Virtual Class
- Meeting Schedule

## Prototype Features
- Dummy chat
- Discussion list
- Announcement cards
- Join meeting button
- Meeting schedule

---

# 6.7 Master Library

## Purpose
Repository pengetahuan terpusat.

## Categories
- Kurikulum
- Modul
- Video
- Buku
- Referensi
- Bank Soal
- Pedoman
- Research
- Case Study

## Page Features
- Search
- Category
- Filter
- Cards/List
- Preview
- Add to Course
- Download simulation

---

# 6.8 Logistic & Asset Management

## Purpose
Mengelola kebutuhan pendukung operasional pendidikan.

## Submenu
- Dashboard
- Sarpras
- Ruang
- Perangkat
- Peralatan Pendidikan
- Logistic
- Booking / Allocation
- Maintenance
- Reports

## Dashboard Summary
- Total Asset
- Available
- In Use
- Maintenance
- Room Availability

---

# 6.9 LSP Sertifikasi & Kompetensi

## Purpose
Cross-platform service untuk asesmen dan sertifikasi kompetensi.

## Submenu
- Dashboard LSP
- Skema Sertifikasi
- Unit Kompetensi
- Asesi
- Asesor
- Jadwal
- Assessment
- Hasil
- Sertifikat

## Dashboard KPI
- Skema Aktif
- Asesi Aktif
- Assessment Berjalan
- Kompeten
- Belum Kompeten
- Sertifikat Terbit

## Main Flow

Program Pendidikan  
→ Eligibility  
→ Assessment LSP  
→ Hasil  
→ Kompeten / Belum Kompeten  
→ Sertifikat  
→ Digital Passport

---

# 6.10 Digital Passport

## Purpose
Menampilkan riwayat pendidikan dan kompetensi personel.

## Content
- Identitas
- Riwayat pendidikan
- Program aktif
- Course
- Kompetensi
- Nilai
- Sertifikasi
- Achievement
- Digital Certificate

---

# 6.11 Command Center

## Purpose
Executive monitoring nasional.

## Components
- National Map
- Education Activity
- Performance
- Learning Progress
- Assessment
- Certification
- Attendance
- Problem Indicators
- Status Program
- Trend Chart

## Drill-down
Nasional  
→ Wilayah  
→ Lembaga  
→ Program  
→ Kelas  
→ Peserta

---

# 7. Prototype Page List

## Core Pages
1. Login
2. National Dashboard
3. Lembaga Pendidikan
4. Detail Lembaga
5. Program Pendidikan
6. Detail Program
7. Kurikulum
8. Kelas
9. Jadwal
10. Gadik
11. Peserta
12. LMS Dashboard Peserta
13. My Courses
14. Course Detail
15. Materi
16. Assignment
17. Quiz/Ujian
18. Attendance
19. Discussion
20. Virtual Class
21. Learning Progress
22. Dashboard Gadik
23. My Teaching
24. Assessment
25. Master Library
26. Logistic & Asset
27. LSP Dashboard
28. Sertifikasi
29. Digital Passport
30. Command Center

---

# 8. Demo Scenario

## Scenario 1 — Pimpinan

Login sebagai Pimpinan  
→ Dashboard Nasional  
→ melihat peta Indonesia  
→ klik LMS Sespim  
→ lihat program SPPK  
→ lihat progress  
→ lihat peserta  
→ lihat assessment  
→ lihat sertifikasi

## Scenario 2 — Peserta

Login sebagai Peserta  
→ Dashboard Learning  
→ lihat kelas hari ini  
→ buka Leadership Strategy  
→ lihat materi  
→ Join Virtual Class  
→ buka Assignment  
→ lihat progress  
→ Digital Passport

## Scenario 3 — Gadik

Login sebagai Gadik  
→ Dashboard  
→ My Teaching  
→ Course  
→ tambah materi  
→ buat assignment  
→ lihat attendance  
→ nilai submission

## Scenario 4 — LSP

Login sebagai Asesor  
→ Dashboard LSP  
→ pilih skema  
→ lihat asesi  
→ assessment  
→ hasil kompeten  
→ sertifikat  
→ masuk Digital Passport

---

# 9. Prototype Technical Requirements

## Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Optional Bootstrap utility / custom CSS
- Leaflet
- Chart.js
- Lucide / Bootstrap Icons / inline SVG

## Data
Gunakan static JSON.

Contoh struktur:
- users.json
- institutions.json
- programs.json
- courses.json
- participants.json
- instructors.json
- schedules.json
- assets.json
- certifications.json

## Routing
Prototype dapat menggunakan:
- multiple HTML pages, atau
- SPA-style sederhana menggunakan JavaScript

Untuk tahap pertama direkomendasikan multiple HTML pages agar mudah dipahami dan cepat dikembangkan.

---

# 10. UI/UX Requirements

## Visual Identity
- Navy sebagai warna utama
- White sebagai background utama
- Red sebagai accent
- Neutral grey
- Corporate government look
- Clean
- Modern
- Tidak terlalu futuristik

## Layout
- Fixed sidebar desktop
- Header
- Breadcrumb
- Main content
- Cards
- Tables
- Charts
- Map
- Tabs
- Status badges
- Progress bars

## UX Principles
- Maksimal 2–3 klik untuk akses informasi utama
- Role-based navigation
- Consistent layout
- Clear visual hierarchy
- Executive-friendly
- Tidak terlalu padat
- Dummy data harus realistis

---

# 11. Leaflet Map Requirements

## Map Provider
- Leaflet
- OpenStreetMap

## Features
- Marker
- Popup
- Zoom
- Filter
- Fit bounds
- Optional marker clustering

## Marker Data
- Institution name
- Lat
- Long
- Region
- Program count
- Participant count
- Instructor count
- Status

---

# 12. Dummy Data Guidelines

Dummy data harus terasa realistis dan relevan.

Contoh lembaga:
- Sespim Lemdiklat Polri
- Akademi Kepolisian
- STIK Lemdiklat Polri
- Sepolwan
- SPN Polda Jawa Barat
- SPN Polda Jawa Tengah
- Pusdik Reskrim
- Pusdik Lantas

Contoh program:
- SPPK
- Sespimmen
- Sespimma
- Diktuk Bintara
- Dikbangspes Reskrim
- Leadership Strategy
- Investigation Technique
- Tactical Training

---

# 13. Prototype Acceptance Criteria

Prototype dianggap berhasil apabila:

1. Semua role dapat disimulasikan.
2. Sidebar berubah sesuai role.
3. National Dashboard dapat diklik hingga detail lembaga.
4. Leaflet map tampil dan marker dapat dibuka.
5. LMS flow peserta dapat didemokan.
6. LMS flow Gadik dapat didemokan.
7. LSP flow dapat didemokan.
8. Digital Passport tersedia.
9. Command Center tersedia.
10. Semua halaman konsisten secara visual.
11. Tidak ada broken navigation.
12. Dummy data konsisten antarhalaman.
13. Layout usable pada desktop 1440px ke atas.

---

# 14. Suggested Folder Structure

```text
lms-lemdiklat-polri-presisi/
│
├── index.html
├── login.html
│
├── pages/
│   ├── national-dashboard.html
│   ├── institutions.html
│   ├── institution-detail.html
│   ├── programs.html
│   ├── program-detail.html
│   ├── curriculum.html
│   ├── classes.html
│   ├── schedule.html
│   ├── instructors.html
│   ├── participants.html
│   ├── learning-dashboard.html
│   ├── courses.html
│   ├── course-detail.html
│   ├── materials.html
│   ├── assignments.html
│   ├── quizzes.html
│   ├── attendance.html
│   ├── discussion.html
│   ├── virtual-class.html
│   ├── progress.html
│   ├── instructor-dashboard.html
│   ├── assessment.html
│   ├── master-library.html
│   ├── assets.html
│   ├── lsp-dashboard.html
│   ├── certification.html
│   ├── digital-passport.html
│   └── command-center.html
│
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   ├── components.css
│   │   └── responsive.css
│   ├── js/
│   │   ├── app.js
│   │   ├── map.js
│   │   ├── charts.js
│   │   └── mock-data.js
│   ├── images/
│   ├── icons/
│   └── logos/
│
└── data/
    ├── institutions.json
    ├── programs.json
    ├── courses.json
    ├── participants.json
    ├── instructors.json
    ├── schedules.json
    ├── assets.json
    └── certifications.json
```

---

# 15. Development Sequence

## Sprint Prototype 01
- Design system
- Layout shell
- Sidebar
- Header
- Login
- National Dashboard
- Leaflet

## Sprint Prototype 02
- Education Management
- Institution
- Program
- Curriculum
- Class
- Schedule

## Sprint Prototype 03
- LMS Peserta
- Course
- Materials
- Assignment
- Quiz
- Attendance

## Sprint Prototype 04
- Gadik
- Assessment
- Collaboration
- Master Library

## Sprint Prototype 05
- Logistic & Asset
- LSP
- Digital Passport
- Command Center

## Sprint Prototype 06
- Final navigation
- Dummy data consistency
- Responsive cleanup
- Demo scenario
- Final review

---

# 16. Future Full-Stack Direction

Setelah prototype disetujui, PRD ini dapat diturunkan ke:

- Functional Specification
- Database Design
- API Specification
- IAM & RBAC
- Multi-tenant Architecture
- Integration Architecture
- Audit & Security
- Deployment Architecture
- CI/CD
- Observability
- Production Roadmap

---

# 17. Final Product Statement

> **LMS Lemdiklat Polri Presisi adalah platform induk pendidikan Polri yang menyatukan pengelolaan pendidikan, proses pembelajaran, assessment, collaboration, knowledge, sarana pendukung, sertifikasi kompetensi, dan monitoring nasional dalam satu sistem, satu data, dan satu ekosistem pendidikan Polri.**

---

**Document Status:** Draft for Prototype Development  
**Next Artifact:** UI/UX Page Specification & Prototype Asset Package
