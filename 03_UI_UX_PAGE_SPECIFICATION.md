# UI/UX PAGE SPECIFICATION
## LMS Lemdiklat Polri Presisi — Prototype HTML/CSS v1

**Dokumen:** UI/UX Page Specification  
**Basis:** Master Blueprint v1 + PRD Prototype v1  
**Target:** Prototype HTML/CSS/JavaScript  
**Fokus:** Layout, komponen, state, navigasi, interaksi, dan konsistensi antarmuka

---

# 1. Design Direction

## 1.1 Visual Character
Antarmuka menggunakan gaya:
- Government enterprise
- Clean dan modern
- Executive-friendly
- Tidak terlalu futuristik
- Informasi padat tetapi tetap mudah dipindai
- Konsisten di seluruh role dan LMS unit

## 1.2 Color Direction
- Primary Navy: untuk sidebar, heading, anchor, active state
- Red Accent: untuk identitas Presisi, highlight, critical indicator
- White: background utama
- Soft Grey: panel/background sekunder
- Green: positive/on-track/completed
- Orange: warning/in-progress
- Red: alert/off-track
- Blue: information/action

## 1.3 Typography
Gunakan font web modern:
- Inter / system sans-serif
- Heading kuat tetapi tidak terlalu besar
- Body 14–16 px
- Table 13–14 px
- KPI 28–40 px

---

# 2. Global Application Shell

## 2.1 Sidebar
Posisi fixed di kiri.

### Struktur Umum
- Logo Lemdiklat Polri
- Nama platform
- Main Menu
- Menu role-based
- Footer logo/Presisi

### Behavior
- Active menu state menggunakan navy/blue highlight
- Menu dengan submenu dapat expand/collapse
- Icon di setiap menu
- Sidebar tetap konsisten di semua halaman

## 2.2 Header
Isi:
- Breadcrumb
- Page title
- Notification
- Fullscreen icon
- Current date/time
- User avatar
- User name
- User role

## 2.3 Main Content
Struktur:
- Page title
- Optional action button
- Optional filter bar
- Main content cards
- Table / Map / Chart / Tabs

---

# 3. Shared Components

## 3.1 KPI Card
Isi:
- Icon
- Label
- Main value
- Subtitle
- Optional trend
- Optional click action

## 3.2 Data Table
Komponen:
- Search
- Filter
- Sort
- Pagination
- Status badge
- Action menu
- Row click

## 3.3 Filter Bar
Komponen:
- Search
- Wilayah
- Unit
- Program
- Status
- Date range
- Reset

## 3.4 Status Badge
State:
- Aktif
- Berjalan
- Selesai
- On Track
- Warning
- Critical
- Pending
- Draft
- Kompeten
- Belum Kompeten

## 3.5 Tabs
Gunakan untuk:
- Detail lembaga
- Detail program
- Course
- LSP
- Asset
- Digital Passport

## 3.6 Empty State
Harus tersedia untuk:
- belum ada data
- filter tanpa hasil
- jadwal kosong
- assignment kosong
- sertifikasi belum ada

## 3.7 Modal / Drawer
Digunakan untuk:
- quick detail
- create/edit dummy flow
- confirmation
- preview material
- asset detail
- participant profile

---

# 4. Page Specification

# 4.1 Login

## Objective
Memberikan entry point prototype dan simulasi role.

## Layout
Split screen:
- Left: visual branding Lemdiklat Polri Presisi
- Right: login card

## Components
- Logo
- Product name
- Username
- Password
- Role selector prototype
- Login button
- Small environment label: Prototype

## Prototype Interaction
Role selector:
- Pimpinan
- Admin Pusat
- Admin LMS Unit
- Gadik
- Peserta
- Asesor LSP

Setelah login, redirect sesuai role.

---

# 4.2 National Dashboard

## Objective
Ringkasan pendidikan nasional untuk pimpinan.

## Top KPI
- Total Lemdik/Satdik
- Program Aktif
- Peserta Aktif
- Gadik Aktif
- Kelas Aktif

## Main Layout
### Left 70%
Leaflet Map
- Marker unit
- Cluster optional
- Popup detail
- Filter region/type/status

### Right 30%
Aktivitas Hari Ini
- Kelas berjalan
- Assessment
- Virtual class
- Program selesai
- Alert

## Lower Section
### Left
Program Pendidikan Berjalan table

### Right
Monitoring ringkas:
- Attendance
- Class compliance
- Program on-track

## Interaction
Klik marker:
→ popup
→ klik Lihat Detail
→ Detail Lembaga

Klik program:
→ Detail Program

---

# 4.3 Lembaga Pendidikan

## Objective
Menampilkan seluruh LMS Unit/Lembaga.

## Header Action
- Search
- Filter wilayah
- Filter jenis
- Status
- Map/List toggle

## Views
### Card View
Card berisi:
- Nama lembaga
- Jenis
- Wilayah
- Program aktif
- Peserta
- Gadik
- Status
- Button Detail

### Map View
Leaflet dengan marker seluruh lembaga.

---

# 4.4 Detail Lembaga

## Header
Nama lembaga  
Lokasi  
Jenis unit  
Status

## KPI
- Program Aktif
- Peserta
- Gadik
- Kelas

## Tabs
- Overview
- Program
- Kelas
- Jadwal
- Gadik
- Peserta

## Overview
- Program berjalan
- Aktivitas hari ini
- Progress program
- Mini map lokasi
- Recent activity

---

# 4.5 Program Pendidikan

## Header
Program Pendidikan

## Filter
- Lembaga
- Jenis
- Tahun
- Status

## Table
- Program
- Lembaga
- Periode
- Peserta
- Kelas
- Progress
- Status
- Action

---

# 4.6 Detail Program

## Header
Nama program  
Lembaga  
Periode  
Status

## KPI
- Peserta
- Kelas
- Gadik
- Progress

## Tabs
- Overview
- Kurikulum
- Kelas
- Jadwal
- Peserta
- Gadik
- Progress

## Overview
- Timeline program
- Progress
- Next agenda
- Completion indicators
- Basic alert panel

---

# 4.7 Kurikulum

## Layout
Top filter + list

## Components
- Curriculum card
- Version
- Tahun berlaku
- Total mata pelajaran
- Total JP
- Kompetensi

## Detail Drawer
- Mata pelajaran
- JP
- Learning outcome
- Status

---

# 4.8 Kelas

## Grid/Table
Data:
- Nama kelas
- Program
- Peserta
- Gadik
- Ruang
- Progress
- Status

## Main CTA
**Masuk Ruang Pembelajaran**

CTA mengarahkan ke Course/room.

---

# 4.9 Jadwal

## View Switch
- Calendar
- Agenda
- Daily Schedule

## Data
- Jam
- Mata pelajaran
- Gadik
- Kelas
- Ruang
- Mode
- Status

## Mode Badge
- Tatap Muka
- Virtual
- Hybrid

---

# 4.10 Gadik

## View
Card + Table toggle

## Card
- Foto
- Nama
- Pangkat
- Kompetensi
- Course aktif
- Kelas
- Status

## Detail
- Profile
- Teaching load
- Courses
- Schedule
- Assessment summary

---

# 4.11 Peserta Didik

## Table
- Nama
- NRP
- Program
- Kelas
- Progress
- Attendance
- Status

## Actions
- Detail
- Digital Passport
- Learning Progress

---

# 4.12 LMS Dashboard — Peserta

## Objective
Halaman kerja utama Peserta.

## KPI
- Progress Belajar
- Kehadiran
- Tugas Selesai
- Quiz/Ujian

## Main Content
### Continue Learning
- Course
- Module terakhir
- Progress
- Button Lanjut Belajar

### Jadwal Hari Ini
- Jam
- Course
- Gadik
- Mode
- Join Virtual Class

### My Courses
Card 3–4 kolom

### Bottom
- Upcoming Assignment
- Announcement
- Learning Progress

---

# 4.13 My Courses

## Filter
- Semua
- In Progress
- Completed
- Upcoming

## Course Card
- Course title
- Gadik
- Program
- Progress
- Next session
- Status
- CTA Buka Course

---

# 4.14 Course Detail

## Header
Course title  
Program  
Kelas  
Gadik

## Summary
- Progress
- Attendance
- Assignment
- Quiz

## Tabs
- Overview
- Materi
- Tugas
- Quiz
- Diskusi
- Jadwal
- Nilai

## Overview
- Course description
- Learning outcomes
- Next class
- Latest material
- Upcoming assignment
- Join Virtual Class

---

# 4.15 Materi Pembelajaran

## Layout
Module accordion

## Module
- Title
- Description
- Progress

## Content Item
Icon by type:
- PDF
- Video
- Slide
- Link
- Recording
- Master Library

State:
- Belum Dibuka
- In Progress
- Selesai

---

# 4.16 Assignment

## Table/List
- Assignment
- Course
- Deadline
- Status
- Submission
- Score

## Detail
- Brief
- Attachment
- Due date
- Submission panel
- Feedback panel

---

# 4.17 Quiz/Ujian

## List
- Quiz
- Course
- Start
- End
- Duration
- Attempt
- Status
- Score

## Detail Prototype
- Instruction
- Duration
- Start button
- Dummy questions
- Submit confirmation
- Result summary

---

# 4.18 Attendance

## Summary
- Attendance %
- Hadir
- Izin
- Alpa

## Table
- Date
- Course
- Session
- Mode
- Status

---

# 4.19 Discussion Forum

## Layout
Two column

### Left
Thread list

### Right
Thread detail
- Author
- Time
- Content
- Reply
- Attachment simulation

---

# 4.20 Virtual Class

## Components
- Today meeting
- Upcoming meeting
- Past meeting
- Recording

## Meeting Card
- Course
- Gadik
- Time
- Platform
- Join button
- Attendance status

---

# 4.21 Learning Progress

## Top
Overall progress donut

## Breakdown
- Course progress bars
- Completed modules
- Pending task
- Quiz performance
- Attendance

---

# 4.22 Dashboard Gadik

## KPI
- Kelas Aktif
- Peserta
- Jadwal Hari Ini
- Submission Belum Dinilai

## Main
- My Teaching
- Today's Schedule
- Recent Submission
- Participant Attention
- Quick Actions

## Quick Actions
- Add Material
- Create Assignment
- Create Quiz
- Start Virtual Class

---

# 4.23 My Teaching

## Course Card
- Course
- Program
- Class
- Participant count
- Progress
- Pending review
- CTA Manage

---

# 4.24 Assessment

## Dashboard
- Assessment aktif
- Pending
- Completed
- Average score
- Remedial

## Table
- Assessment
- Program
- Course
- Date
- Participants
- Status
- Result

---

# 4.25 Collaboration

## Landing Page
4 cards:
- Chat
- Forum
- Announcement
- Virtual Class

## Summary
- Unread chat
- Active discussions
- New announcements
- Upcoming meetings

---

# 4.26 Master Library

## Header
Search prominent

## Category Chips
- Kurikulum
- Modul
- Video
- Buku
- Bank Soal
- Pedoman
- Research

## Card
- Thumbnail
- Title
- Type
- Source
- Unit
- Updated
- Add to Course
- Preview

---

# 4.27 Logistic & Asset Dashboard

## KPI
- Total Asset
- Available
- In Use
- Maintenance
- Rooms Available

## Main
- Asset category chart
- Room availability
- Recent allocation
- Maintenance alert

## Submenu
- Sarpras
- Ruang
- Perangkat
- Logistic
- Booking/Allocation
- Maintenance

---

# 4.28 LSP Dashboard

## KPI
- Skema Aktif
- Asesi
- Asesor
- Assessment Berjalan
- Kompeten
- Sertifikat Terbit

## Main
- Assessment Schedule
- Recent Results
- Certification Status
- Competency Distribution

## Submenu
- Skema Sertifikasi
- Unit Kompetensi
- Asesi
- Asesor
- Jadwal
- Assessment
- Hasil
- Sertifikat

---

# 4.29 Sertifikasi

## Table
- Peserta
- NRP
- Skema
- Assessment
- Hasil
- Certificate No.
- Issue Date
- Status

## Action
- View
- Print Simulation
- Open Digital Passport

---

# 4.30 Digital Passport

## Hero Profile
- Photo
- Nama
- NRP
- Unit
- Current program

## Summary
- Pendidikan selesai
- Course
- Kompetensi
- Sertifikasi

## Tabs
- Profile
- Riwayat Pendidikan
- Learning
- Kompetensi
- Sertifikasi
- Achievement

## Timeline
Riwayat pendidikan dan sertifikasi dalam chronological timeline.

---

# 4.31 Command Center

## Objective
Satu halaman monitoring eksekutif nasional.

## Layout
### Top Row
KPI nasional

### Main Left
Leaflet national map

### Main Right
Alert & priority issues

### Middle
- Education Performance
- Learning Progress
- Assessment Performance
- Certification Performance

### Bottom
- Unit ranking
- Program off-track
- Attendance issue
- Trend chart

## Drill Down
National  
→ Region  
→ Institution  
→ Program  
→ Class  
→ Participant

---

# 5. Role-Based Sidebar Specification

# 5.1 Pimpinan

- Dashboard Nasional
- Lembaga Pendidikan
- Program Nasional
- Monitoring
- Master Library
- Logistic & Asset
- LSP & Kompetensi
- Command Center
- Reporting

# 5.2 Admin LMS Unit

- Dashboard
- Education Management
  - Lembaga Pendidikan
  - Program Pendidikan
  - Kurikulum
  - Kelas
  - Jadwal
  - Gadik
  - Peserta Didik
- Learning
  - Dashboard Learning
  - Courses
  - Materi
  - Assignment
  - Quiz/Ujian
  - Attendance
  - Discussion
  - Virtual Class
- Assessment
- Collaboration
- Master Library
- Logistic & Asset
- Reports

# 5.3 Peserta

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

# 5.4 Gadik

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

# 5.5 Asesor LSP

- Dashboard LSP
- Skema Sertifikasi
- Unit Kompetensi
- Asesi
- Asesor
- Jadwal
- Assessment
- Hasil
- Sertifikat
- Digital Passport

---

# 6. Prototype Interaction Rules

1. Semua menu harus clickable.
2. Semua CTA utama harus memiliki tujuan.
3. Filter harus memberikan efek dummy pada data.
4. Sidebar expand/collapse harus berjalan.
5. Tabs harus berpindah state.
6. Table action menu harus dapat dibuka.
7. Modal preview harus berfungsi.
8. Leaflet marker harus clickable.
9. Course progress harus konsisten antarhalaman.
10. Role switch boleh disediakan di header khusus mode prototype.

---

# 7. Responsive Behavior

## Desktop
Target utama:
- 1440 × 900
- 1600 × 900
- Full HD

## Tablet
- Sidebar collapse
- Cards 2 column
- Table horizontal scroll

## Mobile
Bukan prioritas utama prototype v1, namun:
- Sidebar menjadi drawer
- KPI stack
- Table tetap usable dengan scroll

---

# 8. Dummy Data Consistency

Nama unit, program, peserta, course, Gadik, progress, attendance, nilai, dan sertifikasi harus konsisten lintas halaman.

Contoh:
Jika `SPPK Angkatan XXX` memiliki 180 peserta di National Dashboard, jumlah yang sama harus tampil di:
- Detail Lembaga
- Program Detail
- Peserta
- Command Center

---

# 9. Prototype Demo Journey

## Demo A — Pimpinan
Login  
→ National Dashboard  
→ Leaflet marker Sespim  
→ Detail Lembaga  
→ SPPK  
→ Program Detail  
→ Peserta  
→ Assessment  
→ LSP  
→ Command Center

## Demo B — Peserta
Login  
→ Learning Dashboard  
→ Leadership Strategy  
→ Materi  
→ Virtual Class  
→ Assignment  
→ Quiz  
→ Progress  
→ Digital Passport

## Demo C — Gadik
Login  
→ Dashboard Gadik  
→ My Teaching  
→ Course  
→ Materi  
→ Assignment  
→ Attendance  
→ Penilaian

---

# 10. Handoff to Codex

Codex harus membangun prototype dengan prinsip:

- gunakan HTML/CSS/JS sederhana
- jangan membuat backend
- gunakan dummy JSON
- gunakan Leaflet untuk map
- gunakan Chart.js untuk chart
- gunakan shared component CSS
- gunakan page shell yang konsisten
- gunakan routing antarhalaman
- jangan hardcode styling per halaman
- seluruh halaman harus memakai design token yang sama
- seluruh dummy data harus konsisten

---

# 11. Recommended Build Order

1. Design tokens
2. Global shell
3. Sidebar
4. Header
5. KPI component
6. Table component
7. Leaflet component
8. National Dashboard
9. Education Management pages
10. Learning pages
11. Gadik pages
12. Assessment
13. Collaboration
14. Master Library
15. Logistic & Asset
16. LSP
17. Digital Passport
18. Command Center
19. Cross-page dummy data validation
20. Final demo polish

---

**Status:** UI/UX Specification v1  
**Next Artifact:** Prototype Asset Package + starter HTML/CSS structure
